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

interface MigrationStatusEvent {
  migrationId: string;
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
 * Lambda handler function
 * 
 * Expected event format:
 * {
 *   migrationId: string;  // The repository migration ID
 * }
 */
export const handler: Handler = async (event: MigrationStatusEvent, context) => {
  console.log('Checking migration status with event:', JSON.stringify(event, null, 2));

  // Validate environment variables
  const TARGET_ADMIN_TOKEN = process.env.TARGET_ADMIN_TOKEN;

  if (!TARGET_ADMIN_TOKEN) {
    throw new Error('TARGET_ADMIN_TOKEN environment variable is not set');
  }

  // Validate event parameters
  if (!event.migrationId) {
    throw new Error('migrationId is required in the event');
  }

  try {
    const migrationStatus = await getMigrationStatus(event.migrationId, TARGET_ADMIN_TOKEN);

    console.log('Migration status retrieved:', JSON.stringify(migrationStatus, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        migrationId: migrationStatus.id,
        sourceUrl: migrationStatus.sourceUrl,
        state: migrationStatus.state,
        failureReason: migrationStatus.failureReason,
        migrationSource: migrationStatus.migrationSource,
      }),
    };
  } catch (error) {
    console.error('Error checking migration status:', error);
    
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
