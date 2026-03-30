import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { EnvironmentService } from '../config/environment.service';
import {
  CreateMigrationSourceData,
  ExportResponse,
  ExportStatusResponse,
  GraphQLResponse,
  Migration,
  MigrationNode,
  OwnerInfoData,
  ScannedRepository,
  StartRepositoryMigrationData,
} from './github.types';
import {
  ScanSourceOrgDto,
  StartExportDto,
  StartMigrationDto,
  UnlockSourceRepoDto,
} from './github.dto';

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const GITHUB_REST_API_BASE = 'https://api.github.com';

@Injectable()
export class GitHubService {
  constructor(private readonly environment: EnvironmentService) {}

  async getOwnerId() {
    const organization = this.requireTargetOrganization();
    const targetToken = this.requireTargetAdminToken();
    const ownerId = await this.getOwnerIdForOrg(organization, targetToken);

    return {
      success: true,
      ownerId,
      organization,
    };
  }

  async startMigration(payload: StartMigrationDto) {
    const targetToken = this.requireTargetAdminToken();
    const sourceToken = this.requireSourceAdminToken();
    const organization = this.requireTargetOrganization();

    if (this.environment.mode === 'GHES') {
      if (!payload.gitSourceArchiveUrl || !payload.metadataArchiveUrl) {
        throw new BadRequestException(
          'gitSourceArchiveUrl and metadataArchiveUrl are required when MODE is GHES',
        );
      }
    }

    const ownerId = payload.destinationOwnerId
      ? payload.destinationOwnerId
      : await this.getOwnerIdForOrg(organization, targetToken);

    const migrationSourceId = await this.createMigrationSource(
      `Migration Source - ${new Date().toISOString()}`,
      ownerId,
      targetToken,
    );

    const migration = await this.startRepositoryMigration(
      migrationSourceId,
      ownerId,
      payload,
      sourceToken,
      targetToken,
    );

    return {
      success: true,
      message: 'Repository migration started successfully',
      migrationId: migration.startRepositoryMigration.repositoryMigration.id,
      sourceUrl: migration.startRepositoryMigration.repositoryMigration.sourceUrl,
      migrationSourceId:
        migration.startRepositoryMigration.repositoryMigration.migrationSource.id,
      ownerId,
      repositoryName: payload.repositoryName,
      sourceRepositoryUrl: payload.sourceRepositoryUrl,
    };
  }

  async getMigrationStatus(migrationId: string) {
    const targetToken = this.requireTargetAdminToken();
    const query = `
      query($id: ID!) {
        node(id: $id) {
          ... on Migration {
            id
            sourceUrl
            migrationSource {
              name
            }
            state
            failureReason
          }
        }
      }
    `;

    const response = await this.makeGraphQLRequest<{ node: MigrationNode }>(
      query,
      { id: migrationId },
      targetToken,
    );

    if (response.errors) {
      throw new InternalServerErrorException(
        `Failed to get migration status: ${response.errors.map((error) => error.message).join(', ')}`,
      );
    }

    if (!response.data?.node) {
      throw new BadRequestException(`Migration ${migrationId} not found`);
    }

    return {
      success: true,
      migrationId: response.data.node.id,
      sourceUrl: response.data.node.sourceUrl,
      state: response.data.node.state,
      failureReason: response.data.node.failureReason,
      migrationSource: response.data.node.migrationSource,
    };
  }

  async deleteTargetRepository(repositoryName: string) {
    const organization = this.requireTargetOrganization();
    const targetToken = this.requireTargetAdminToken();
    const url = `${GITHUB_REST_API_BASE}/repos/${organization}/${repositoryName}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.buildRestHeaders(targetToken),
    });

    if (response.status !== 204) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `Failed to delete repository: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return {
      success: true,
      message: 'Repository deleted successfully',
      repositoryName,
      organization,
    };
  }

  async unlockSourceRepository(payload: UnlockSourceRepoDto) {
    const sourceToken = this.requireSourceAdminToken();
    const { owner } = this.parseRepoUrl(payload.sourceRepositoryUrl);
    const migrationId = await this.getSourceMigrationId(owner, payload.repositoryName, sourceToken);

    const url = `${this.getGitHubApiBase()}/orgs/${owner}/migrations/${migrationId}/repos/${payload.repositoryName}/lock`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.buildRestHeaders(sourceToken),
    });

    if (response.status !== 204) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `Failed to unlock repository: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return {
      success: true,
      message: 'Repository unlocked successfully',
      sourceRepositoryUrl: payload.sourceRepositoryUrl,
      organization: owner,
      repositoryName: payload.repositoryName,
      migrationId,
      migrationSourceId: payload.migrationSourceId,
    };
  }

  async scanSourceOrganization(payload: ScanSourceOrgDto) {
    const sourceToken = this.requireSourceAdminToken();
    const octokit = new Octokit({
      auth: sourceToken,
      ...(this.environment.mode === 'GHES' && this.environment.ghesApiUrl
        ? { baseUrl: this.environment.ghesApiUrl }
        : {}),
    });

    const repositories: ScannedRepository[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await octokit.rest.repos.listForOrg({
        org: payload.organizationName,
        per_page: perPage,
        page,
        type: 'all',
      });

      if (response.data.length === 0) {
        break;
      }

      repositories.push(
        ...response.data.map((repo) => ({
          name: repo.name,
          full_name: repo.full_name,
          html_url: repo.html_url,
          private: repo.private,
          description: repo.description,
        })),
      );

      if (response.data.length < perPage) {
        break;
      }

      page += 1;
    }

    return {
      success: true,
      organization: payload.organizationName,
      repositoryCount: repositories.length,
      repositories,
    };
  }

  async startExport(payload: StartExportDto) {
    if (this.environment.mode !== 'GHES') {
      throw new BadRequestException('startExport is only available when MODE is GHES');
    }

    const sourceToken = this.requireSourceAdminToken();

    const [gitSourceExport, metadataExport] = await Promise.all([
      this.makeGhesRequest<ExportResponse>('POST', `/orgs/${payload.organizationName}/migrations`, sourceToken, {
        repositories: payload.repositoryNames,
        exclude_metadata: false,
        exclude_git_data: false,
        exclude_attachments: true,
        exclude_releases: true,
        exclude_owner_projects: true,
      }),
      this.makeGhesRequest<ExportResponse>('POST', `/orgs/${payload.organizationName}/migrations`, sourceToken, {
        repositories: payload.repositoryNames,
        lock_repositories: payload.lockSource ?? false,
        exclude_metadata: false,
        exclude_git_data: true,
        exclude_attachments: true,
        exclude_releases: true,
        exclude_owner_projects: true,
      }),
    ]);

    return {
      success: true,
      message: 'GHES exports started successfully',
      gitSourceExportId: gitSourceExport.id,
      metadataExportId: metadataExport.id,
      gitSourceExportState: gitSourceExport.state,
      metadataExportState: metadataExport.state,
    };
  }

  async getExportStatus(organizationName: string, exportId: string) {
    if (this.environment.mode !== 'GHES') {
      throw new BadRequestException('checkExportStatus is only available when MODE is GHES');
    }

    const sourceToken = this.requireSourceAdminToken();
    const status = await this.makeGhesRequest<ExportStatusResponse>(
      'GET',
      `/orgs/${organizationName}/migrations/${exportId}`,
      sourceToken,
    );

    let archiveUrl: string | undefined;
    if (status.state === 'exported') {
      const archiveResponse = await fetch(
        `${this.requireGhesApiUrl()}/orgs/${organizationName}/migrations/${exportId}/archive`,
        {
          method: 'GET',
          headers: this.buildRestHeaders(sourceToken),
          redirect: 'manual',
        },
      );

      if (archiveResponse.status === 302) {
        archiveUrl = archiveResponse.headers.get('Location') ?? undefined;
      }
    }

    return {
      success: true,
      exportId: status.id,
      state: status.state,
      createdAt: status.created_at,
      updatedAt: status.updated_at,
      archiveUrl,
    };
  }

  private async getOwnerIdForOrg(organizationLogin: string, token: string): Promise<string> {
    const query = `
      query($login: String!) {
        organization(login: $login) {
          login
          id
          name
          databaseId
        }
      }
    `;

    const response = await this.makeGraphQLRequest<OwnerInfoData>(query, { login: organizationLogin }, token);

    if (response.errors) {
      throw new InternalServerErrorException(
        `Failed to get organization info: ${response.errors.map((error) => error.message).join(', ')}`,
      );
    }

    if (!response.data?.organization?.id) {
      throw new BadRequestException(`Organization ${organizationLogin} not found`);
    }

    return response.data.organization.id;
  }

  private async createMigrationSource(name: string, ownerId: string, token: string): Promise<string> {
    const mutation = `
      mutation createMigrationSource($name: String!, $ownerId: ID!, $url: String!, $type: MigrationSourceType!) {
        createMigrationSource(input: {
          name: $name,
          url: $url,
          ownerId: $ownerId,
          type: $type
        }) {
          migrationSource {
            id
            name
            url
            type
          }
        }
      }
    `;

    const response = await this.makeGraphQLRequest<CreateMigrationSourceData>(
      mutation,
      {
        name,
        ownerId,
        url: this.environment.mode === 'GHES' ? this.requireGhesApiUrl() : 'https://github.com',
        type: 'GITHUB_ARCHIVE',
      },
      token,
    );

    if (response.errors) {
      throw new InternalServerErrorException(
        `Failed to create migration source: ${response.errors.map((error) => error.message).join(', ')}`,
      );
    }

    const sourceId = response.data?.createMigrationSource.migrationSource.id;
    if (!sourceId) {
      throw new InternalServerErrorException('Migration source creation failed - no ID returned');
    }

    return sourceId;
  }

  private async startRepositoryMigration(
    sourceId: string,
    ownerId: string,
    payload: StartMigrationDto,
    sourceToken: string,
    targetToken: string,
  ): Promise<StartRepositoryMigrationData> {
    const mutation = `
      mutation startRepositoryMigration(
        $sourceId: ID!,
        $ownerId: ID!,
        $sourceRepositoryUrl: URI!,
        $repositoryName: String!,
        $continueOnError: Boolean!,
        $accessToken: String!,
        $githubPat: String!,
        $targetRepoVisibility: String!,
        $lockSource: Boolean,
        $gitArchiveUrl: String,
        $metadataArchiveUrl: String
      ) {
        startRepositoryMigration(input: {
          sourceId: $sourceId,
          ownerId: $ownerId,
          repositoryName: $repositoryName,
          continueOnError: $continueOnError,
          accessToken: $accessToken,
          githubPat: $githubPat,
          targetRepoVisibility: $targetRepoVisibility,
          sourceRepositoryUrl: $sourceRepositoryUrl,
          lockSource: $lockSource,
          gitArchiveUrl: $gitArchiveUrl,
          metadataArchiveUrl: $metadataArchiveUrl
        }) {
          repositoryMigration {
            id
            migrationSource {
              id
              name
              type
            }
            sourceUrl
          }
        }
      }
    `;

    const response = await this.makeGraphQLRequest<StartRepositoryMigrationData>(
      mutation,
      {
        sourceId,
        ownerId,
        sourceRepositoryUrl: payload.sourceRepositoryUrl,
        repositoryName: payload.repositoryName,
        continueOnError: payload.continueOnError ?? true,
        accessToken: sourceToken,
        githubPat: targetToken,
        targetRepoVisibility: payload.targetRepoVisibility ?? 'private',
        lockSource: payload.lockSource,
        gitArchiveUrl: payload.gitSourceArchiveUrl,
        metadataArchiveUrl: payload.metadataArchiveUrl,
      },
      targetToken,
    );

    if (response.errors) {
      throw new InternalServerErrorException(
        `Failed to start repository migration: ${response.errors.map((error) => error.message).join(', ')}`,
      );
    }

    if (!response.data?.startRepositoryMigration.repositoryMigration.id) {
      throw new InternalServerErrorException('Repository migration start failed - no ID returned');
    }

    return response.data;
  }

  private async getSourceMigrationId(org: string, repoName: string, token: string): Promise<number> {
    const migrations = await this.makeRestJsonRequest<Migration[]>(
      'GET',
      `${this.getGitHubApiBase()}/orgs/${org}/migrations?per_page=100`,
      token,
    );
    const fullRepoName = `${org}/${repoName}`;

    for (const migration of migrations) {
      for (const repository of migration.repositories) {
        if (repository.full_name === fullRepoName) {
          return migration.id;
        }
      }
    }

    throw new BadRequestException(`No migration found for repository: ${fullRepoName}`);
  }

  private parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
    const match = repoUrl.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+)/);
    if (!match) {
      throw new BadRequestException(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  }

  private getGitHubApiBase(): string {
    if (this.environment.mode === 'GHES') {
      return this.requireGhesApiUrl();
    }

    return GITHUB_REST_API_BASE;
  }

  private requireTargetOrganization(): string {
    if (!this.environment.targetOrganization) {
      throw new BadRequestException('TARGET_ORGANIZATION environment variable is not set');
    }

    return this.environment.targetOrganization;
  }

  private requireSourceAdminToken(): string {
    if (!this.environment.sourceAdminToken) {
      throw new BadRequestException('SOURCE_ADMIN_TOKEN environment variable is not set');
    }

    return this.environment.sourceAdminToken;
  }

  private requireTargetAdminToken(): string {
    if (!this.environment.targetAdminToken) {
      throw new BadRequestException('TARGET_ADMIN_TOKEN environment variable is not set');
    }

    return this.environment.targetAdminToken;
  }

  private requireGhesApiUrl(): string {
    if (!this.environment.ghesApiUrl) {
      throw new BadRequestException('GHES_API_URL environment variable is not set');
    }

    return this.environment.ghesApiUrl;
  }

  private buildRestHeaders(token: string, contentType = false): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  private async makeGraphQLRequest<T>(
    query: string,
    variables: Record<string, unknown>,
    token: string,
  ): Promise<GraphQLResponse<T>> {
    const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        `GraphQL request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<GraphQLResponse<T>>;
  }

  private async makeRestJsonRequest<T>(
    method: string,
    url: string,
    token: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(url, {
      method,
      headers: this.buildRestHeaders(token, body !== undefined),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `GitHub API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  private async makeGhesRequest<T>(
    method: string,
    endpoint: string,
    token: string,
    body?: unknown,
  ): Promise<T> {
    return this.makeRestJsonRequest<T>(method, `${this.requireGhesApiUrl()}${endpoint}`, token, body);
  }
}