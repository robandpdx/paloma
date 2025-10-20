import type { Handler } from 'aws-lambda';

// GraphQL API endpoint for GitHub Enterprise Cloud
const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

const MODE_GHES = 'GHES';

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

interface FinalMigrationResponse {
  data: StartRepositoryMigrationData;
  errors?: Array<{ message: string }>;
}

interface MigrationArguments {
  sourceRepositoryUrl: string; // Source URL (GH or GHES)
  repositoryName: string; // Name for new target repo
  targetRepoVisibility?: 'private' | 'public' | 'internal';
  continueOnError?: boolean;
  lockSource?: boolean;
  destinationOwnerId?: string; // Optional: reuse target ownerId
  // GHES finalization inputs (after export step handled elsewhere)
  ghesGitMigrationId?: number;
  ghesMetadataMigrationId?: number;
  sourceOrganization?: string; // GHES source org (explicit to avoid re-parsing)
}

interface MigrationEvent {
  arguments: MigrationArguments;
}

/**
 * Makes a GraphQL request to GitHub API
 */
async function makeGraphQLRequest<T>(
  query: string,
  variables: Record<string, unknown>,
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
  // Ensure targetRepoVisibility has a valid value
  const visibility = targetRepoVisibility || 'private';
  
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
    targetRepoVisibility: visibility,
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
 *     lockSource?: boolean;          // Lock the source repository during migration
 *     destinationOwnerId?: string;   // Optional: reuse if already known to avoid API call
 *   }
 * }
 */
export const handler: Handler = async (event: MigrationEvent) => {
  console.log('Starting repository migration with event:', JSON.stringify(event, null, 2));

  try {
    // Extract arguments from AppSync event
    const args = event.arguments;

    // Validate environment variables
  const TARGET_ORGANIZATION = process.env.TARGET_ORGANIZATION;
  const SOURCE_ADMIN_TOKEN = process.env.SOURCE_ADMIN_TOKEN;
  const TARGET_ADMIN_TOKEN = process.env.TARGET_ADMIN_TOKEN;
  const MODE = process.env.MODE || 'GH'; // Default existing behaviour
  const GHES_API_URL = process.env.GHES_API_URL; // e.g. https://myghes.com/api/v3

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
    
    // If operating in GHES mode, validate GHES-specific arguments BEFORE resolving ownerId to fail fast
    if (MODE === MODE_GHES) {
      if (!GHES_API_URL) throw new Error('GHES_API_URL environment variable is required when MODE=GHES');
      if (!args.ghesGitMigrationId || !args.ghesMetadataMigrationId) {
        throw new Error('ghesGitMigrationId and ghesMetadataMigrationId are required when MODE=GHES');
      }
      if (!args.sourceOrganization) {
        throw new Error('sourceOrganization is required when MODE=GHES');
      }
    }

    // Step 1: Get the ownerId for the target organization (after fast validation)
    let ownerId: string;
    if (args.destinationOwnerId) {
      console.log(`Step 1: Reusing provided destinationOwnerId: ${args.destinationOwnerId}`);
      ownerId = args.destinationOwnerId;
    } else {
      console.log(`Step 1: Getting ownerId for organization: ${TARGET_ORGANIZATION}`);
      ownerId = await getOwnerId(TARGET_ORGANIZATION, TARGET_ADMIN_TOKEN);
      console.log(`Owner ID: ${ownerId}`);
    }

    if (MODE === MODE_GHES) {

      // Validate both GHES migrations are exported
      async function fetchMigration(id: number) {
        const r = await fetch(`${GHES_API_URL}/orgs/${args.sourceOrganization}/migrations/${id}`, {
          headers: { 'Authorization': `Bearer ${SOURCE_ADMIN_TOKEN}`, 'Accept': 'application/vnd.github+json' }
        });
        if (!r.ok) throw new Error(`GHES migration ${id} fetch failed: ${r.status} ${r.statusText}`);
        return r.json();
      }
  const gitMig = await fetchMigration(args.ghesGitMigrationId!);
  const metaMig = await fetchMigration(args.ghesMetadataMigrationId!);
      if (gitMig.state !== 'exported' || metaMig.state !== 'exported') {
        throw new Error('GHES exports not complete. Both git and metadata migrations must be in exported state before final migration.');
      }

      // Create migration source (points to GHES host for traceability)
      const migrationSourceName = `GHES Migration Source - ${new Date().toISOString()}`;
      const sourceId = await createMigrationSource(
        migrationSourceName,
        ownerId,
        TARGET_ADMIN_TOKEN
      );

      async function getArchiveUrl(id: number): Promise<string> {
        const resp = await fetch(`${GHES_API_URL}/orgs/${args.sourceOrganization}/migrations/${id}/archive`, {
          method: 'GET', redirect: 'manual', headers: { 'Authorization': `Bearer ${SOURCE_ADMIN_TOKEN}`, 'Accept': 'application/vnd.github+json' }
        });
        if (resp.status !== 302) {
            const body = await resp.text();
            throw new Error(`Expected 302 for archive URL (migration ${id}), got ${resp.status}. Body: ${body}`);
        }
        const loc = resp.headers.get('location');
        if (!loc) throw new Error(`Archive redirect missing Location header (migration ${id})`);
        return loc;
      }

  const gitArchiveUrl = await getArchiveUrl(args.ghesGitMigrationId!);
  const metadataArchiveUrl = await getArchiveUrl(args.ghesMetadataMigrationId!);

      // Start final repository migration using archive URLs
      const finalMutation = `
        mutation startRepositoryMigration(
          $sourceId: ID!, $ownerId: ID!, $repositoryName: String!, $continueOnError: Boolean!,
          $accessToken: String!, $githubPat: String!, $targetRepoVisibility: String!,
          $gitArchiveUrl: String!, $metadataArchiveUrl: String!, $sourceRepositoryUrl: URI!
        ) {
          startRepositoryMigration(input: {
            sourceId: $sourceId, ownerId: $ownerId, repositoryName: $repositoryName,
            continueOnError: $continueOnError, accessToken: $accessToken, githubPat: $githubPat,
            targetRepoVisibility: $targetRepoVisibility, gitArchiveUrl: $gitArchiveUrl,
            metadataArchiveUrl: $metadataArchiveUrl, sourceRepositoryUrl: $sourceRepositoryUrl
          }) { repositoryMigration { id sourceUrl migrationSource { id name type } } }
        }
      `;
  const finalResp = await makeGraphQLRequest<FinalMigrationResponse['data']>(finalMutation, {
        sourceId,
        ownerId,
        repositoryName: args.repositoryName,
        continueOnError: args.continueOnError !== undefined ? args.continueOnError : true,
        accessToken: SOURCE_ADMIN_TOKEN,
        githubPat: TARGET_ADMIN_TOKEN,
        targetRepoVisibility: args.targetRepoVisibility || 'private',
        gitArchiveUrl,
        metadataArchiveUrl,
        sourceRepositoryUrl: args.sourceRepositoryUrl,
      }, TARGET_ADMIN_TOKEN);
      const finalRespAny = finalResp as unknown as FinalMigrationResponse;
      if (finalRespAny.errors) {
        throw new Error(`Failed to start final repository migration: ${finalRespAny.errors.map(e=>e.message).join(', ')}`);
      }
      const repoMig = finalRespAny.data.startRepositoryMigration.repositoryMigration;

      // Server-side persistence removed (Option A). Client/UI layer remains responsible for state updates.
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          mode: MODE_GHES,
          message: 'Final repository migration started (GHES exports already completed)'.trim(),
          migrationId: repoMig.id,
          sourceUrl: repoMig.sourceUrl,
          migrationSourceId: repoMig.migrationSource.id,
          ownerId,
          repositoryName: args.repositoryName,
          sourceRepositoryUrl: args.sourceRepositoryUrl,
          gitArchiveUrl,
          metadataArchiveUrl,
          ghes: {
            gitMigrationId: args.ghesGitMigrationId,
            metadataMigrationId: args.ghesMetadataMigrationId
          }
        })
      };
    }

    // Original GitHub.com -> GHEC flow
    console.log('MODE=GH (default): proceeding with single repository migration');
    const migrationSourceName = `Migration Source - ${new Date().toISOString()}`;
    const sourceId = await createMigrationSource(
      migrationSourceName,
      ownerId,
      TARGET_ADMIN_TOKEN
    );
    console.log(`Migration Source ID: ${sourceId}`);

    console.log('Starting repository migration');
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
        mode: 'GH',
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
