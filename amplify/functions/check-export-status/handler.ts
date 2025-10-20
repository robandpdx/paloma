import type { Handler } from 'aws-lambda';

interface ExportStatusArguments {
  organizationName: string;
  exportId: string;
}

interface ExportStatusEvent {
  arguments: ExportStatusArguments;
}

interface ExportStatusResponse {
  id: number;
  state: string;
  created_at: string;
  updated_at: string;
  // Other fields
}

/**
 * Makes a REST API request to GitHub Enterprise Server
 */
async function makeGHESRequest<T>(
  endpoint: string,
  token: string
): Promise<{ data: T; headers: Headers }> {
  const ghesApiUrl = process.env.GHES_API_URL;
  
  if (!ghesApiUrl) {
    throw new Error('GHES_API_URL environment variable is not set');
  }

  const url = `${ghesApiUrl}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GHES API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return { data, headers: response.headers };
}

/**
 * Get the status of a migration export
 */
async function getExportStatus(
  organizationName: string,
  exportId: string,
  token: string
): Promise<{ status: ExportStatusResponse; archiveUrl?: string }> {
  const endpoint = `/orgs/${organizationName}/migrations/${exportId}`;
  
  const { data: status } = await makeGHESRequest<ExportStatusResponse>(endpoint, token);
  
  // If export is exported (completed), get the archive URL
  let archiveUrl: string | undefined;
  if (status.state === 'exported') {
    try {
      const archiveEndpoint = `/orgs/${organizationName}/migrations/${exportId}/archive`;
      const archiveResponse = await fetch(`${process.env.GHES_API_URL}${archiveEndpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        redirect: 'manual', // Don't follow redirects automatically
      });
      
      // The Location header contains the short-lived URL to the archive
      if (archiveResponse.status === 302) {
        archiveUrl = archiveResponse.headers.get('Location') || undefined;
      }
    } catch (error) {
      console.error('Error getting archive URL:', error);
      // Continue without archive URL - it can be retrieved later
    }
  }
  
  return { status, archiveUrl };
}

/**
 * Lambda handler function
 * 
 * Expected event format from AppSync:
 * {
 *   arguments: {
 *     organizationName: string;  // e.g., "my-org"
 *     exportId: string;          // The migration export ID
 *   }
 * }
 */
export const handler: Handler = async (event: ExportStatusEvent, context) => {
  console.log('Checking GHES export status with event:', JSON.stringify(event, null, 2));

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
    if (!args.exportId) {
      throw new Error('exportId is required in the event');
    }

    console.log(`Checking export status for organization: ${args.organizationName}, exportId: ${args.exportId}`);

    // Get the export status
    const { status, archiveUrl } = await getExportStatus(
      args.organizationName,
      args.exportId,
      SOURCE_ADMIN_TOKEN
    );

    console.log('Export status:', status.state);
    if (archiveUrl) {
      console.log('Archive URL available');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        exportId: status.id,
        state: status.state,
        createdAt: status.created_at,
        updatedAt: status.updated_at,
        archiveUrl,
      }),
    };
  } catch (error) {
    console.error('Error checking GHES export status:', error);
    
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
