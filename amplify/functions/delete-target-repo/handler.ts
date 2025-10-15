import type { Handler } from 'aws-lambda';

// GitHub REST API endpoint
const GITHUB_API_BASE = 'https://api.github.com';

interface DeleteTargetRepoArguments {
  repositoryName: string;
}

interface DeleteTargetRepoEvent {
  arguments: DeleteTargetRepoArguments;
}

/**
 * Delete a repository using GitHub REST API
 */
async function deleteRepository(
  owner: string,
  repo: string,
  token: string
): Promise<void> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  
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
    throw new Error(`Failed to delete repository: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

/**
 * Lambda handler function
 * 
 * Expected event format from AppSync:
 * {
 *   arguments: {
 *     repositoryName: string;  // Name of the repository to delete in the target org
 *   }
 * }
 */
export const handler: Handler = async (event: DeleteTargetRepoEvent, context) => {
  console.log('Deleting target repository with event:', JSON.stringify(event, null, 2));

  try {
    // Extract arguments from AppSync event
    const args = event.arguments;

    // Validate environment variables
    const TARGET_ORGANIZATION = process.env.TARGET_ORGANIZATION;
    const TARGET_ADMIN_TOKEN = process.env.TARGET_ADMIN_TOKEN;

    if (!TARGET_ORGANIZATION) {
      throw new Error('TARGET_ORGANIZATION environment variable is not set');
    }
    if (!TARGET_ADMIN_TOKEN) {
      throw new Error('TARGET_ADMIN_TOKEN environment variable is not set');
    }

    // Validate event parameters
    if (!args.repositoryName) {
      throw new Error('repositoryName is required in the event');
    }

    // Delete the repository
    console.log(`Deleting repository: ${TARGET_ORGANIZATION}/${args.repositoryName}`);
    await deleteRepository(TARGET_ORGANIZATION, args.repositoryName, TARGET_ADMIN_TOKEN);

    console.log('Repository deleted successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Repository deleted successfully',
        repositoryName: args.repositoryName,
        organization: TARGET_ORGANIZATION,
      }),
    };
  } catch (error) {
    console.error('Error deleting repository:', error);
    
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
