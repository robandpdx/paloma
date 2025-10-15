import type { Handler } from 'aws-lambda';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AppSyncClient, ListGraphqlApisCommand } from '@aws-sdk/client-appsync';

// GraphQL API endpoint for GitHub Enterprise Cloud
const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

// Cache for the AppSync endpoint (to avoid repeated API calls)
let cachedAppSyncEndpoint: string | null = null;

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
 * Discover the AppSync GraphQL endpoint at runtime
 * This avoids circular dependency issues in CloudFormation
 */
async function getAppSyncEndpoint(): Promise<string> {
  // Return cached endpoint if available
  if (cachedAppSyncEndpoint) {
    return cachedAppSyncEndpoint;
  }

  const region = process.env.AWS_REGION || 'us-east-1';
  const client = new AppSyncClient({ region });
  
  try {
    const command = new ListGraphqlApisCommand({});
    const response = await client.send(command);
    
    // Find the Amplify Data GraphQL API (it should be the first/only one in this account)
    const api = response.graphqlApis?.[0];
    
    if (!api?.uris?.GRAPHQL) {
      throw new Error('No AppSync GraphQL API found');
    }
    
    // Cache the endpoint for subsequent invocations
    cachedAppSyncEndpoint = api.uris.GRAPHQL;
    console.log(`Discovered AppSync endpoint: ${cachedAppSyncEndpoint}`);
    
    return cachedAppSyncEndpoint;
  } catch (error) {
    console.error('Failed to discover AppSync endpoint:', error);
    throw new Error(`Failed to discover AppSync endpoint: ${error}`);
  }
}

/**
 * Makes a signed GraphQL request to AppSync using IAM credentials
 */
async function makeAppSyncRequest<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const region = process.env.AWS_REGION || 'us-east-1';
  const url = new URL(endpoint);
  
  const requestBody = JSON.stringify({ query, variables });
  
  const request = new HttpRequest({
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: url.hostname,
    },
    body: requestBody,
  });

  const signer = new SignatureV4({
    service: 'appsync',
    region,
    credentials: defaultProvider(),
    sha256: Sha256,
  });

  const signedRequest = await signer.sign(request);
  
  const response = await fetch(endpoint, {
    method: signedRequest.method,
    headers: signedRequest.headers,
    body: requestBody,
  });

  if (!response.ok) {
    throw new Error(`AppSync request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

/**
 * Query the Amplify Data table for repositories in 'in_progress' state
 */
async function getInProgressRepositories(): Promise<RepositoryMigration[]> {
  const endpoint = await getAppSyncEndpoint();

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

  const data = await makeAppSyncRequest<{ listRepositoryMigrations: { items: RepositoryMigration[] } }>(
    endpoint,
    query
  );

  return data.listRepositoryMigrations?.items || [];
}

/**
 * Update repository migration status in the database
 */
async function updateRepositoryStatus(
  id: string,
  state: string,
  failureReason?: string
): Promise<void> {
  const endpoint = await getAppSyncEndpoint();

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

  await makeAppSyncRequest(endpoint, mutation, variables);
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
