import type { Handler } from 'aws-lambda';

// GitHub REST API endpoint
const GITHUB_API_BASE = 'https://api.github.com';

interface UnlockSourceRepoArguments {
  sourceRepositoryUrl: string;
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
 * Unlock a repository using GitHub REST API
 */
async function unlockRepository(
  owner: string,
  repo: string,
  token: string
): Promise<void> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      archived: false,
    }),
  });

  if (!response.ok) {
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

    // Parse the repository URL
    const { owner, repo } = parseRepoUrl(args.sourceRepositoryUrl);

    // Unlock the repository
    console.log(`Unlocking repository: ${owner}/${repo}`);
    await unlockRepository(owner, repo, SOURCE_ADMIN_TOKEN);

    console.log('Repository unlocked successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Repository unlocked successfully',
        sourceRepositoryUrl: args.sourceRepositoryUrl,
        owner,
        repo,
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
