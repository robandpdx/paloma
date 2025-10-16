import type { Handler } from 'aws-lambda';
import { Octokit } from '@octokit/rest';

interface ScanOrgArguments {
  organizationName: string;
}

interface ScanOrgEvent {
  arguments: ScanOrgArguments;
}

interface Repository {
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
}

/**
 * Lambda handler function to scan a GitHub organization for repositories
 * 
 * This function uses the GitHub REST API to list all repositories in an organization
 * and returns them with pagination support.
 */
export const handler: Handler = async (event: ScanOrgEvent, context) => {
  console.log('Scanning organization with event:', JSON.stringify(event, null, 2));

  try {
    // Validate environment variables
    const SOURCE_ADMIN_TOKEN = process.env.SOURCE_ADMIN_TOKEN;

    if (!SOURCE_ADMIN_TOKEN) {
      throw new Error('SOURCE_ADMIN_TOKEN environment variable is not set');
    }

    // Get arguments
    const { organizationName } = event.arguments;

    if (!organizationName) {
      throw new Error('Organization name is required');
    }

    // Initialize Octokit
    const octokit = new Octokit({
      auth: SOURCE_ADMIN_TOKEN,
    });

    // Fetch all repositories from the organization with pagination
    const repositories: Repository[] = [];
    let page = 1;
    const perPage = 100; // Maximum allowed by GitHub API

    while (true) {
      console.log(`Fetching page ${page} of repositories from ${organizationName}`);
      
      const response = await octokit.rest.repos.listForOrg({
        org: organizationName,
        per_page: perPage,
        page: page,
        type: 'all', // Get all types of repositories
      });

      if (response.data.length === 0) {
        break; // No more repositories
      }

      repositories.push(...response.data.map((repo: any) => ({
        name: repo.name,
        full_name: repo.full_name,
        html_url: repo.html_url,
        private: repo.private,
        description: repo.description,
      })));

      // Check if there are more pages
      if (response.data.length < perPage) {
        break; // Last page
      }

      page++;
    }

    console.log(`Found ${repositories.length} repositories in ${organizationName}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        organization: organizationName,
        repositoryCount: repositories.length,
        repositories: repositories,
      }),
    };
  } catch (error) {
    console.error('Error scanning organization:', error);
    
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
