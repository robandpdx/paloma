## AWS Amplify Next.js (App Router) Starter Template

This repository provides a starter template for creating applications using Next.js (App Router) and AWS Amplify, emphasizing easy setup for authentication, API, and database capabilities.

## Overview

This template equips you with a foundational Next.js application integrated with AWS Amplify, streamlined for scalability and performance. It is ideal for developers looking to jumpstart their project with pre-configured AWS services like Cognito, AppSync, and DynamoDB.

## Features

- **Authentication**: Setup with Amazon Cognito for secure user authentication.
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.
- **GitHub Migration Functions**: Lambda functions for automating repository migrations using GitHub Enterprise Importer.
- **Migration Management UI**: GitHub-like interface for managing repository migrations with real-time status updates and a unified status button design.

## GitHub Repository Migration

This application provides a complete solution for managing GitHub repository migrations using the GitHub Enterprise Importer. It includes:

- **Repository tracking**: Add and manage multiple repositories for migration
- **Migration initiation**: Start repository migrations with a unified status button
- **Status monitoring**: Real-time status updates via color-coded status buttons
- **Target organization visibility**: Displays the target organization to ensure users know where repos are migrating
- **Migration details**: Click status buttons to view complete migration information
- **Failure handling**: View detailed error messages when migrations fail

### Functions

1. **start-migration**: Initiates a repository migration from GitHub.com to GitHub Enterprise Cloud
2. **check-migration-status**: Checks the current status of an in-progress migration

### UI Features

- **Repository List**: View all repositories that have been added for migration
- **Add Repository**: Modal for adding new repositories with URL validation
  - Option to lock source repository during migration
- **Repository Settings**: Settings gear icon (⚙️) for each repository
  - Toggle "Lock source repository" option before migration starts
  - Auto-save with visual confirmation
  - Read-only view after migration begins
- **Status Button**: Combined status indicator and action button that:
  - Shows "Start Migration" (green) for pending repositories - click to start migration
  - Shows "In Progress" (blue, pulsing) during migration - click to view details
  - Shows "Completed" (green) for successful migrations - click to view details
  - Shows "Failed" (red) for failed migrations - click to view error details
- **Target Organization Display**: Shows the target organization below the page title
- **Delete Confirmation**: Type repository URL to confirm deletion
- **Auto-polling**: Status updates every 30 seconds after migration starts

## GitHub Repository Migration

This application includes a Lambda function (`start-migration`) that automates GitHub repository migrations using the GitHub Enterprise Importer GraphQL API.

### Quick Start

1. **Set up environment variables** in Amplify Console:
   - `TARGET_ORGANIZATION` - Target GitHub organization name (also displayed in the UI via `NEXT_PUBLIC_TARGET_ORGANIZATION`)
   - `SOURCE_ADMIN_TOKEN` - Personal Access Token for source GitHub.com
   - `TARGET_ADMIN_TOKEN` - Personal Access Token for target GHEC

2. **Deploy the application** (see deployment section below)

3. **Use the UI** to manage migrations:
   - The target organization is displayed below the page title
   - Click "Add Repository" to add a new repository for migration
   - Check "Lock source repository" option to prevent modifications during migration
   - Click the "Start Migration" button (green) to begin the migration process
   - Click the settings gear icon (⚙️) to manage repository settings before migration
   - Monitor status via the status button that changes color and text based on state
   - Click status buttons (except "Start Migration") to view migration details
   - Use the Delete button to remove repositories from the list

4. **Or call the functions programmatically** from your frontend:
   ```typescript
   // Start a migration
   const response = await client.queries.startMigration({
     sourceRepositoryUrl: "https://github.com/source-org/repo",
     repositoryName: "migrated-repo",
     targetRepoVisibility: "private"
   });
   
   // Check migration status
   const status = await client.queries.checkMigrationStatus({
     migrationId: "MIGRATION_ID_HERE"
   });
   ```

For detailed documentation, see:
- [Function README](amplify/functions/start-migration/README.md) - API details and integration examples
- [Setup Guide](amplify/functions/start-migration/SETUP.md) - Environment configuration and token setup

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/#deploy-a-fullstack-app-to-aws) of our documentation.

First create a new secret in AWS Secrets Manager. Enter the following key/value pairs for the new secret:
| Secret key         | Secret value                                    |
|--------------------|-------------------------------------------------|
| token              | PAT with access to the git repo of your project |
| password           | Password for basic auth on deployments          |

Deploy to AWS via SAM:
```bash
sam build
sam deploy --capabilities CAPABILITY_NAMED_IAM
```

## Local development
You first need to deploy a sandbox backend environment, or download the `amplify_outputs.json` file for backend environment. [Reference](https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/#4-set-up-local-environment).  

To deploy a sandbox backend environment, run `npx ampx sandbox`.

To start the app locally, run `npm run dev`

### Environment Variables

For local development, create a `.env.local` file in the root directory with the following variables:
```
NEXT_PUBLIC_TARGET_ORGANIZATION=your-target-organization
```

For production deployment in Amplify Console, set the `NEXT_PUBLIC_TARGET_ORGANIZATION` environment variable in the app settings to display the target organization in the UI.



## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.