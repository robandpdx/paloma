import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { GitHubBaseService } from './github-base.service';
import {
  CreateMigrationSourceData,
  MigrationNode,
  OwnerInfoData,
  StartRepositoryMigrationData,
} from './github.types';
import { StartMigrationDto } from './github.dto';

@Injectable()
export class MigrationService extends GitHubBaseService {
  async getOwnerId() {
    const organization = this.requireTargetOrganization();
    const targetToken = this.requireTargetAdminToken();
    const ownerId = await this.getOwnerIdForOrg(organization, targetToken);

    return { success: true, ownerId, organization };
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
      migrationSourceId: migration.startRepositoryMigration.repositoryMigration.migrationSource.id,
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
            migrationSource { name }
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
        `Failed to get migration status: ${response.errors.map((e) => e.message).join(', ')}`,
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
    const url = `${this.getGitHubApiBase()}/repos/${organization}/${repositoryName}`;

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

    return { success: true, message: 'Repository deleted successfully', repositoryName, organization };
  }

  private async getOwnerIdForOrg(organizationLogin: string, token: string): Promise<string> {
    const query = `
      query($login: String!) {
        organization(login: $login) { login, id, name, databaseId }
      }
    `;

    const response = await this.makeGraphQLRequest<OwnerInfoData>(query, { login: organizationLogin }, token);

    if (response.errors) {
      throw new InternalServerErrorException(
        `Failed to get organization info: ${response.errors.map((e) => e.message).join(', ')}`,
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
        createMigrationSource(input: { name: $name, url: $url, ownerId: $ownerId, type: $type }) {
          migrationSource { id, name, url, type }
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
        `Failed to create migration source: ${response.errors.map((e) => e.message).join(', ')}`,
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
        $sourceId: ID!, $ownerId: ID!, $sourceRepositoryUrl: URI!, $repositoryName: String!,
        $continueOnError: Boolean!, $accessToken: String!, $githubPat: String!,
        $targetRepoVisibility: String!, $lockSource: Boolean,
        $gitArchiveUrl: String, $metadataArchiveUrl: String
      ) {
        startRepositoryMigration(input: {
          sourceId: $sourceId, ownerId: $ownerId, repositoryName: $repositoryName,
          continueOnError: $continueOnError, accessToken: $accessToken, githubPat: $githubPat,
          targetRepoVisibility: $targetRepoVisibility, sourceRepositoryUrl: $sourceRepositoryUrl,
          lockSource: $lockSource, gitArchiveUrl: $gitArchiveUrl, metadataArchiveUrl: $metadataArchiveUrl
        }) {
          repositoryMigration { id, migrationSource { id, name, type }, sourceUrl }
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
        `Failed to start repository migration: ${response.errors.map((e) => e.message).join(', ')}`,
      );
    }

    if (!response.data?.startRepositoryMigration.repositoryMigration.id) {
      throw new InternalServerErrorException('Repository migration start failed - no ID returned');
    }

    return response.data;
  }
}
