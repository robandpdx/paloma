import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { EnvironmentService } from '../config/environment.service';
import { GraphQLResponse } from './github.types';

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const GITHUB_REST_API_BASE = 'https://api.github.com';

@Injectable()
export class GitHubBaseService {
  constructor(protected readonly environment: EnvironmentService) {}

  protected requireTargetOrganization(): string {
    if (!this.environment.targetOrganization) {
      throw new BadRequestException('TARGET_ORGANIZATION environment variable is not set');
    }
    return this.environment.targetOrganization;
  }

  protected requireSourceAdminToken(): string {
    if (!this.environment.sourceAdminToken) {
      throw new BadRequestException('SOURCE_ADMIN_TOKEN environment variable is not set');
    }
    return this.environment.sourceAdminToken;
  }

  protected requireTargetAdminToken(): string {
    if (!this.environment.targetAdminToken) {
      throw new BadRequestException('TARGET_ADMIN_TOKEN environment variable is not set');
    }
    return this.environment.targetAdminToken;
  }

  protected requireGhesApiUrl(): string {
    if (!this.environment.ghesApiUrl) {
      throw new BadRequestException('GHES_API_URL environment variable is not set');
    }
    return this.environment.ghesApiUrl;
  }

  protected getGitHubApiBase(): string {
    if (this.environment.mode === 'GHES') {
      return this.requireGhesApiUrl();
    }
    return GITHUB_REST_API_BASE;
  }

  protected buildRestHeaders(token: string, contentType = false): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  protected async makeGraphQLRequest<T>(
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

  protected async makeRestJsonRequest<T>(
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

  protected async makeGhesRequest<T>(
    method: string,
    endpoint: string,
    token: string,
    body?: unknown,
  ): Promise<T> {
    return this.makeRestJsonRequest<T>(method, `${this.requireGhesApiUrl()}${endpoint}`, token, body);
  }

  protected parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
    const match = repoUrl.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+)/);
    if (!match) {
      throw new BadRequestException(`Invalid GitHub repository URL: ${repoUrl}`);
    }
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
    };
  }
}
