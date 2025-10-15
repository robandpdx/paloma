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
 * Get the ownerId for the target organization
 */
async function getOwnerIdForOrg(organizationLogin: string, token: string): Promise<string> {
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
 * Lambda handler function
 * 
 * This function retrieves the owner ID for the target organization.
 * It can be called independently before starting a migration to cache the owner ID.
 */
export const handler: Handler = async (event, context) => {
  console.log('Getting owner ID with event:', JSON.stringify(event, null, 2));

  try {
    // Validate environment variables
    const TARGET_ORGANIZATION = process.env.TARGET_ORGANIZATION;
    const TARGET_ADMIN_TOKEN = process.env.TARGET_ADMIN_TOKEN;

    if (!TARGET_ORGANIZATION) {
      throw new Error('TARGET_ORGANIZATION environment variable is not set');
    }
    if (!TARGET_ADMIN_TOKEN) {
      throw new Error('TARGET_ADMIN_TOKEN environment variable is not set');
    }

    // Get the ownerId for the target organization
    console.log(`Getting ownerId for organization: ${TARGET_ORGANIZATION}`);
    const ownerId = await getOwnerIdForOrg(TARGET_ORGANIZATION, TARGET_ADMIN_TOKEN);
    console.log(`Owner ID: ${ownerId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ownerId: ownerId,
        organization: TARGET_ORGANIZATION,
      }),
    };
  } catch (error) {
    console.error('Error getting owner ID:', error);
    
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
