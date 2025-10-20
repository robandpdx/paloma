import type { Handler } from 'aws-lambda';

interface ExportArguments {
  organizationName: string;
  repositoryNames: string[];
}

interface ExportEvent {
  arguments: ExportArguments;
}

interface ExportResponse {
  id: number;
  state: string;
  // Other fields returned by GHES API
}

/**
 * Makes a REST API request to GitHub Enterprise Server
 */
async function makeGHESRequest<T>(
  method: string,
  endpoint: string,
  token: string,
  body?: any
): Promise<T> {
  const ghesApiUrl = process.env.GHES_API_URL;
  
  if (!ghesApiUrl) {
    throw new Error('GHES_API_URL environment variable is not set');
  }

  const url = `${ghesApiUrl}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GHES API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

/**
 * Start migration export for git source (repository data)
 */
async function startGitSourceExport(
  organizationName: string,
  repositoryNames: string[],
  token: string
): Promise<ExportResponse> {
  const endpoint = `/orgs/${organizationName}/migrations`;
  
  const body = {
    repositories: repositoryNames,
    lock_repositories: false,
    exclude_metadata: false,
    exclude_git_data: false,
    exclude_attachments: true,
    exclude_releases: true,
    exclude_owner_projects: true,
  };

  return makeGHESRequest<ExportResponse>('POST', endpoint, token, body);
}

/**
 * Start migration export for metadata
 */
async function startMetadataExport(
  organizationName: string,
  repositoryNames: string[],
  token: string
): Promise<ExportResponse> {
  const endpoint = `/orgs/${organizationName}/migrations`;
  
  const body = {
    repositories: repositoryNames,
    lock_repositories: false,
    exclude_metadata: false,
    exclude_git_data: true,
    exclude_attachments: true,
    exclude_releases: true,
    exclude_owner_projects: true,
  };

  return makeGHESRequest<ExportResponse>('POST', endpoint, token, body);
}

/**
 * Lambda handler function
 * 
 * Expected event format from AppSync:
 * {
 *   arguments: {
 *     organizationName: string;  // e.g., "my-org"
 *     repositoryNames: string[]; // e.g., ["repo1", "repo2"]
 *   }
 * }
 */
export const handler: Handler = async (event: ExportEvent, context) => {
  console.log('Starting GHES export with event:', JSON.stringify(event, null, 2));

  try {
    // Extract arguments from AppSync event
    const args = event.arguments;

    // Validate environment variables
    const GHES_API_URL = process.env.GHES_API_URL;
    const SOURCE_ADMIN_TOKEN = process.env.SOURCE_ADMIN_TOKEN;

    if (!GHES_API_URL) {
      throw new Error('GHES_API_URL environment variable is not set');
    }
    if (!SOURCE_ADMIN_TOKEN) {
      throw new Error('SOURCE_ADMIN_TOKEN environment variable is not set');
    }

    // Validate event parameters
    if (!args.organizationName) {
      throw new Error('organizationName is required in the event');
    }
    if (!args.repositoryNames || args.repositoryNames.length === 0) {
      throw new Error('repositoryNames is required and must not be empty');
    }

    console.log(`Starting exports for organization: ${args.organizationName}`);
    console.log(`Repositories: ${args.repositoryNames.join(', ')}`);

    // Start both exports in parallel
    console.log('Step 1: Starting git source export');
    const gitSourceExportPromise = startGitSourceExport(
      args.organizationName,
      args.repositoryNames,
      SOURCE_ADMIN_TOKEN
    );

    console.log('Step 2: Starting metadata export');
    const metadataExportPromise = startMetadataExport(
      args.organizationName,
      args.repositoryNames,
      SOURCE_ADMIN_TOKEN
    );

    // Wait for both exports to start
    const [gitSourceExport, metadataExport] = await Promise.all([
      gitSourceExportPromise,
      metadataExportPromise,
    ]);

    console.log('Exports started successfully');
    console.log('Git source export ID:', gitSourceExport.id);
    console.log('Metadata export ID:', metadataExport.id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'GHES exports started successfully',
        gitSourceExportId: gitSourceExport.id,
        metadataExportId: metadataExport.id,
        gitSourceExportState: gitSourceExport.state,
        metadataExportState: metadataExport.state,
      }),
    };
  } catch (error) {
    console.error('Error during GHES export:', error);
    
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
