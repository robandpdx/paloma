import type { Handler } from 'aws-lambda';

// GitHub REST API endpoint
const GITHUB_API_BASE = 'https://api.github.com';

interface UnlockSourceRepoArguments {
  sourceRepositoryUrl: string;
  migrationSourceId: string;
  repositoryName: string;
}

interface UnlockSourceRepoEvent {
  arguments: UnlockSourceRepoArguments;
}

/**
 * Parse a GitHub repository URL to extract owner and repo name
 */
function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
  }
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
  };
}

/**
 * Unlock a repository using GitHub Migration API
 * DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock
 */
async function unlockRepository(
  org: string,
  migrationId: string,
  repo: string,
  token: string
): Promise<void> {
  const url = `${GITHUB_API_BASE}/orgs/${org}/migrations/${migrationId}/repos/${repo}/lock`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  // 204 No Content indicates success
  if (response.status !== 204) {
    const errorText = await response.text();
    throw new Error(`Failed to unlock repository: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

/**
 * Lambda handler function
 * 
 * Expected event format from AppSync:
 * {
 *   arguments: {
 *     sourceRepositoryUrl: string;  // URL of the source repository to unlock
 *     migrationSourceId: string;    // The migration source ID (used as migration ID)
 *     repositoryName: string;        // The repository name
 *   }
 * }
 */
export const handler: Handler = async (event: UnlockSourceRepoEvent, context) => {
  console.log('Unlocking source repository with event:', JSON.stringify(event, null, 2));

  try {
    // Extract arguments from AppSync event
    const args = event.arguments;

    // Validate environment variables
    const SOURCE_ADMIN_TOKEN = process.env.SOURCE_ADMIN_TOKEN;

    if (!SOURCE_ADMIN_TOKEN) {
      throw new Error('SOURCE_ADMIN_TOKEN environment variable is not set');
    }

    // Validate event parameters
    if (!args.sourceRepositoryUrl) {
      throw new Error('sourceRepositoryUrl is required in the event');
    }
    if (!args.migrationSourceId) {
      throw new Error('migrationSourceId is required in the event');
    }
    if (!args.repositoryName) {
      throw new Error('repositoryName is required in the event');
    }

    // Parse the repository URL to get the organization
    const { owner } = parseRepoUrl(args.sourceRepositoryUrl);

    // Unlock the repository using the migration API
    console.log(`Unlocking repository: ${owner}/${args.repositoryName} from migration ${args.migrationSourceId}`);
    await unlockRepository(owner, args.migrationSourceId, args.repositoryName, SOURCE_ADMIN_TOKEN);

    console.log('Repository unlocked successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Repository unlocked successfully',
        sourceRepositoryUrl: args.sourceRepositoryUrl,
        organization: owner,
        repositoryName: args.repositoryName,
        migrationSourceId: args.migrationSourceId,
      }),
    };
  } catch (error) {
    console.error('Error unlocking repository:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: error instanceof Error ? error.toString() : String(error),
      }),
    };
  }
};
