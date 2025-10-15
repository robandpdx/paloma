import type { Handler } from 'aws-lambda';

// GraphQL API endpoint for GitHub Enterprise Cloud
const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface GetMigrationData {
  node: {
    id: string;
    sourceUrl: string;
    migrationSource: {
      name: string;
    };
    state: string;
    failureReason?: string;
  };
}

interface RepositoryMigration {
  id: string;
  repositoryMigrationId: string;
  state: string;
  repositoryName: string;
}

/**
 * Makes a GraphQL request to GitHub API
 */
async function makeGraphQLRequest<T>(
  query: string,
  variables: Record<string, any>,
  token: string
): Promise<GraphQLResponse<T>> {
  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get migration status using the getMigration query
 */
async function getMigrationStatus(migrationId: string, token: string): Promise<GetMigrationData['node']> {
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

  const variables = { id: migrationId };
  const response = await makeGraphQLRequest<GetMigrationData>(query, variables, token);

  if (response.errors) {
    throw new Error(`Failed to get migration status: ${response.errors.map(e => e.message).join(', ')}`);
  }

  if (!response.data?.node) {
    throw new Error(`Migration ${migrationId} not found`);
  }

  return response.data.node;
}

/**
 * Query the Amplify Data table for repositories in 'in_progress' state
 */
async function getInProgressRepositories(): Promise<RepositoryMigration[]> {
  const AMPLIFY_DATA_ENDPOINT = process.env.AMPLIFY_DATA_ENDPOINT;
  const AMPLIFY_API_KEY = process.env.AMPLIFY_API_KEY;

  if (!AMPLIFY_DATA_ENDPOINT || !AMPLIFY_API_KEY) {
    throw new Error('AMPLIFY_DATA_ENDPOINT or AMPLIFY_API_KEY not set');
  }

  const query = `
    query ListInProgressMigrations {
      listRepositoryMigrations(filter: {state: {eq: "in_progress"}}) {
        items {
          id
          repositoryMigrationId
          state
          repositoryName
        }
      }
    }
  `;

  const response = await fetch(AMPLIFY_DATA_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': AMPLIFY_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Failed to query Amplify Data: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data?.listRepositoryMigrations?.items || [];
}

/**
 * Update repository migration status in the database
 */
async function updateRepositoryStatus(
  id: string,
  state: string,
  failureReason?: string
): Promise<void> {
  const AMPLIFY_DATA_ENDPOINT = process.env.AMPLIFY_DATA_ENDPOINT;
  const AMPLIFY_API_KEY = process.env.AMPLIFY_API_KEY;

  if (!AMPLIFY_DATA_ENDPOINT || !AMPLIFY_API_KEY) {
    throw new Error('AMPLIFY_DATA_ENDPOINT or AMPLIFY_API_KEY not set');
  }

  const mutation = `
    mutation UpdateRepositoryMigration($id: ID!, $state: String, $failureReason: String) {
      updateRepositoryMigration(input: {id: $id, state: $state, failureReason: $failureReason}) {
        id
        state
        failureReason
      }
    }
  `;

  const variables = {
    id,
    state,
    failureReason: failureReason || null,
  };

  const response = await fetch(AMPLIFY_DATA_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': AMPLIFY_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update repository: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }
}

/**
 * Lambda handler function that runs on a schedule to poll migration statuses
 * 
 * This function:
 * 1. Queries the database for all repositories in 'in_progress' state
 * 2. For each repository, checks its migration status from GitHub API
 * 3. Updates the database with the current status
 */
export const handler: Handler = async (event, context) => {
  console.log('Starting scheduled migration status polling');
  console.log('Event:', JSON.stringify(event, null, 2));

  const TARGET_ADMIN_TOKEN = process.env.TARGET_ADMIN_TOKEN;

  if (!TARGET_ADMIN_TOKEN) {
    throw new Error('TARGET_ADMIN_TOKEN environment variable is not set');
  }

  try {
    // Get all repositories that are currently in progress
    const inProgressRepos = await getInProgressRepositories();
    console.log(`Found ${inProgressRepos.length} repositories in progress`);

    if (inProgressRepos.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No repositories in progress',
          processed: 0,
        }),
      };
    }

    // Check status for each repository
    const results = await Promise.allSettled(
      inProgressRepos.map(async (repo) => {
        if (!repo.repositoryMigrationId) {
          console.log(`Repository ${repo.id} has no repositoryMigrationId, skipping`);
          return { id: repo.id, skipped: true };
        }

        try {
          // Get status from GitHub API
          const migrationStatus = await getMigrationStatus(
            repo.repositoryMigrationId,
            TARGET_ADMIN_TOKEN
          );

          const state = migrationStatus.state.toLowerCase();
          console.log(`Repository ${repo.repositoryName} (${repo.id}): ${state}`);

          // Map 'succeeded' to 'completed' for consistency
          const finalState = state === 'succeeded' ? 'completed' : state;

          // Update database with new status
          await updateRepositoryStatus(
            repo.id,
            finalState,
            migrationStatus.failureReason
          );

          return {
            id: repo.id,
            repositoryName: repo.repositoryName,
            previousState: repo.state,
            newState: finalState,
            success: true,
          };
        } catch (error) {
          console.error(`Error processing repository ${repo.id}:`, error);
          return {
            id: repo.id,
            repositoryName: repo.repositoryName,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false,
          };
        }
      })
    );

    // Count successes and failures
    const processed = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const errors = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

    console.log(`Processed ${processed} repositories successfully`);
    if (errors.length > 0) {
      console.log(`${errors.length} repositories had errors`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Migration status polling completed',
        processed,
        total: inProgressRepos.length,
        errors: errors.length,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason }),
      }),
    };
  } catch (error) {
    console.error('Error in scheduled migration status polling:', error);
    
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
