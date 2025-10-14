import type { Handler } from 'aws-lambda';

// GraphQL API endpoint for GitHub Enterprise Cloud
const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface GetOrgInfoData {
  organization: {
    login: string;
    id: string;
    name: string;
    databaseId: number;
  };
}

interface CreateMigrationSourceData {
  createMigrationSource: {
    migrationSource: {
      id: string;
      name: string;
      url: string;
      type: string;
    };
  };
}

interface StartRepositoryMigrationData {
  startRepositoryMigration: {
    repositoryMigration: {
      id: string;
      migrationSource: {
        id: string;
        name: string;
        type: string;
      };
      sourceUrl: string;
    };
  };
}

interface MigrationArguments {
  sourceRepositoryUrl: string;
  repositoryName: string;
  targetRepoVisibility?: 'private' | 'public' | 'internal';
  continueOnError?: boolean;
  lockSource?: boolean;
}

interface MigrationEvent {
  arguments: MigrationArguments;
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
 * Step 1: Get the ownerId for the target organization
 */
async function getOwnerId(organizationLogin: string, token: string): Promise<string> {
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

  const variables = { login: organizationLogin };
  const response = await makeGraphQLRequest<GetOrgInfoData>(query, variables, token);

  if (response.errors) {
    throw new Error(`Failed to get organization info: ${response.errors.map(e => e.message).join(', ')}`);
  }

  if (!response.data?.organization?.id) {
    throw new Error(`Organization ${organizationLogin} not found`);
  }

  return response.data.organization.id;
}

/**
 * Step 2: Create a migration source
 */
async function createMigrationSource(
  name: string,
  ownerId: string,
  token: string
): Promise<string> {
  const mutation = `
    mutation createMigrationSource($name: String!, $ownerId: ID!) {
      createMigrationSource(input: {
        name: $name,
        url: "https://github.com",
        ownerId: $ownerId,
        type: GITHUB_ARCHIVE
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

  const variables = { name, ownerId };
  const response = await makeGraphQLRequest<CreateMigrationSourceData>(mutation, variables, token);

  if (response.errors) {
    throw new Error(`Failed to create migration source: ${response.errors.map(e => e.message).join(', ')}`);
  }

  if (!response.data?.createMigrationSource?.migrationSource?.id) {
    throw new Error('Migration source creation failed - no ID returned');
  }

  return response.data.createMigrationSource.migrationSource.id;
}

/**
 * Step 3: Start the repository migration
 */
async function startRepositoryMigration(
  sourceId: string,
  ownerId: string,
  sourceRepositoryUrl: string,
  repositoryName: string,
  sourceToken: string,
  targetToken: string,
  targetRepoVisibility: string = 'private',
  continueOnError: boolean = true,
  lockSource?: boolean
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
      $lockSource: Boolean
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
        lockSource: $lockSource
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

  const variables = {
    sourceId,
    ownerId,
    sourceRepositoryUrl,
    repositoryName,
    continueOnError,
    accessToken: sourceToken,
    githubPat: targetToken,
    targetRepoVisibility,
    lockSource,
  };

  const response = await makeGraphQLRequest<StartRepositoryMigrationData>(mutation, variables, targetToken);

  if (response.errors) {
    throw new Error(`Failed to start repository migration: ${response.errors.map(e => e.message).join(', ')}`);
  }

  if (!response.data?.startRepositoryMigration?.repositoryMigration?.id) {
    throw new Error('Repository migration start failed - no ID returned');
  }

  return response.data;
}

/**
 * Lambda handler function
 * 
 * Expected event format from AppSync:
 * {
 *   arguments: {
 *     sourceRepositoryUrl: string;  // e.g., "https://github.com/source-org/repo-name"
 *     repositoryName: string;        // Name for the new repository in target org
 *     targetRepoVisibility?: 'private' | 'public' | 'internal';  // Defaults to 'private'
 *     continueOnError?: boolean;     // Defaults to true
 *   }
 * }
 */
export const handler: Handler = async (event: MigrationEvent, context) => {
  console.log('Starting repository migration with event:', JSON.stringify(event, null, 2));

  try {
    // Extract arguments from AppSync event
    const args = event.arguments;

    // Validate environment variables
    const TARGET_ORGANIZATION = process.env.TARGET_ORGANIZATION;
    const SOURCE_ADMIN_TOKEN = process.env.SOURCE_ADMIN_TOKEN;
    const TARGET_ADMIN_TOKEN = process.env.TARGET_ADMIN_TOKEN;

    if (!TARGET_ORGANIZATION) {
      throw new Error('TARGET_ORGANIZATION environment variable is not set');
    }
    if (!SOURCE_ADMIN_TOKEN) {
      throw new Error('SOURCE_ADMIN_TOKEN environment variable is not set');
    }
    if (!TARGET_ADMIN_TOKEN) {
      throw new Error('TARGET_ADMIN_TOKEN environment variable is not set');
    }

    // Validate event parameters
    if (!args.sourceRepositoryUrl) {
      throw new Error('sourceRepositoryUrl is required in the event');
    }
    if (!args.repositoryName) {
      throw new Error('repositoryName is required in the event');
    }
    // Step 1: Get the ownerId for the target organization
    console.log(`Step 1: Getting ownerId for organization: ${TARGET_ORGANIZATION}`);
    const ownerId = await getOwnerId(TARGET_ORGANIZATION, TARGET_ADMIN_TOKEN);
    console.log(`Owner ID: ${ownerId}`);

    // Step 2: Create migration source
    console.log('Step 2: Creating migration source');
    const migrationSourceName = `Migration Source - ${new Date().toISOString()}`;
    const sourceId = await createMigrationSource(
      migrationSourceName,
      ownerId,
      TARGET_ADMIN_TOKEN
    );
    console.log(`Migration Source ID: ${sourceId}`);

    // Step 3: Start repository migration
    console.log('Step 3: Starting repository migration');
    const migrationData = await startRepositoryMigration(
      sourceId,
      ownerId,
      args.sourceRepositoryUrl,
      args.repositoryName,
      SOURCE_ADMIN_TOKEN,
      TARGET_ADMIN_TOKEN,
      args.targetRepoVisibility || 'private',
      args.continueOnError !== undefined ? args.continueOnError : true,
      args.lockSource
    );

    console.log('Migration started successfully:', JSON.stringify(migrationData, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Repository migration started successfully',
        migrationId: migrationData.startRepositoryMigration.repositoryMigration.id,
        sourceUrl: migrationData.startRepositoryMigration.repositoryMigration.sourceUrl,
        migrationSourceId: migrationData.startRepositoryMigration.repositoryMigration.migrationSource.id,
        ownerId: ownerId,
        repositoryName: args.repositoryName,
        sourceRepositoryUrl: args.sourceRepositoryUrl,
      }),
    };
  } catch (error) {
    console.error('Error during migration:', error);
    
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
