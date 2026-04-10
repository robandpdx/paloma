import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { GitHubBaseService } from './github-base.service';
import { Migration, ScannedRepository } from './github.types';
import { ScanSourceOrgDto, UnlockSourceRepoDto } from './github.dto';

@Injectable()
export class SourceRepositoryService extends GitHubBaseService {
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

      if (response.data.length === 0) break;

      repositories.push(
        ...response.data.map((repo) => ({
          name: repo.name,
          full_name: repo.full_name,
          html_url: repo.html_url,
          private: repo.private,
          description: repo.description,
        })),
      );

      if (response.data.length < perPage) break;
      page += 1;
    }

    return {
      success: true,
      organization: payload.organizationName,
      repositoryCount: repositories.length,
      repositories,
    };
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
}
