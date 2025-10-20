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

This application provides a complete solution for managing GitHub repository migrations using the GitHub Enterprise Importer. It supports both:

* Standard GitHub.com → GitHub Enterprise Cloud (MODE=GH – default)
* GitHub Enterprise Server (GHES 3.8+) → GitHub Enterprise Cloud dual‑phase exports (MODE=GHES)

### Core UI Capabilities
* **Repository tracking** – Add and manage multiple repositories for migration
* **Migration initiation** – Unified status/action button
* **Status monitoring** – Real-time color‑coded status & detail modal
* **Target organization visibility** – Destination org rendered below title
* **Failure handling** – Detailed error with retained context
* **Lock source** – Optional repository lock (GitHub.com flow)

### Lambda Functions (Amplify Gen2)
| Function | Mode(s) | Purpose |
|----------|---------|---------|
| `start-migration` | GH & GHES | Triggers final GitHub Enterprise Importer migration (direct for GH, archive finalization for GHES) |
| `check-migration-status` | GH & GHES | Polls final repository migration state via GraphQL |
| `export-ghes` | GHES | Starts two GHES org migrations (git + metadata) |
| `check-ghes-export-status` | GHES | Polls paired GHES export migrations until both exported |
| `get-owner-id` | (internal optimization) | Caches destination ownerId to reduce GraphQL lookups |
| `unlock-source-repo` | Optional | Unlocks a previously locked source repository (GitHub.com flow) |

> The GHES export IDs (`ghesGitMigrationId`, `ghesMetadataMigrationId`) are **not server‑persisted automatically**. The frontend (or an external client) is responsible for storing them between page loads so polling can resume. (See GHES section below.)

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

### Programmatic Usage

The primary entry point remains `start-migration`, which wraps the GitHub Enterprise Importer GraphQL APIs. In GHES mode it additionally validates previously exported archives before starting the final migration.

### Quick Start

1. **Set up environment variables** in Amplify Console:
   - `TARGET_ORGANIZATION` - Target GitHub organization name (displayed in the UI)
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

For local development, create a `.env.local` file in the root directory with the following variables (minimum for GitHub.com source migrations):
```
TARGET_ORGANIZATION=your-target-organization
MODE=GH
```

If you are migrating from GitHub Enterprise Server (GHES 3.8+), also add:
```
MODE=GHES
GHES_API_URL=https://your-ghes-hostname/api/v3
```

Runtime / function environment variables (configure in Amplify Console or deployment pipeline):

| Variable | Required | Description |
|----------|----------|-------------|
| TARGET_ORGANIZATION | Yes | Destination (GitHub Enterprise Cloud) organization login. Embedded in UI. |
| SOURCE_ADMIN_TOKEN | Yes | PAT for source (GitHub.com or GHES). Must have migration + repo scopes. |
| TARGET_ADMIN_TOKEN | Yes | PAT for target GHEC org (admin:migration + repo scopes). |
| MODE | No (defaults to GH) | Set to `GHES` to enable GHES dual-archive migration flow. Otherwise `GH` or unset keeps existing GitHub.com flow. |
| GHES_API_URL | When MODE=GHES | Base API URL to GHES instance (include `/api/v3`). Example: `https://myghes.internal/api/v3` |

#### Client Persistence (GHES Mode)
In GHES mode the export phase is intentionally stateless on the backend after the Lambda invocation returns. No DynamoDB/Data API writes occur automatically. Store these values client‑side (or persist them yourself) after calling `exportGhes`:
* `ghesGitMigrationId`
* `ghesMetadataMigrationId`

You then pass them back to:
* `checkGhesExportStatus` (polling)
* `startMigration` (finalization) along with the original `sourceRepositoryUrl` & `repositoryName`.

If IDs are lost mid‑export, re‑run `exportGhes`; duplicate export attempts are safe—the first successful pair to reach `exported` is used.

### GHES Mode Flow (Separated Exports)

GHES migrations now happen in two explicit phases:

1. Call `exportGhes` (query: `exportGhes`) with `sourceOrganization` & `repositoryName`.
  - Starts two GHES org migrations (git & metadata) and returns their IDs + initial states.
2. Poll `checkGhesExportStatus` with those IDs until `exportStatus === EXPORTED_BOTH`.
  - Custom consolidated statuses: `STARTED`, `EXPORTING`, `EXPORTING_PARTIAL`, `EXPORTED_BOTH`, `FAILED_PARTIAL`, `FAILED`.
3. Once exported, invoke `startMigration` (MODE=GHES) providing:
  - `repositoryName`
  - `sourceRepositoryUrl` (original GHES repo URL)
  - `sourceOrganization`
  - `ghesGitMigrationId`
  - `ghesMetadataMigrationId`
4. The `startMigration` function validates both exports, fetches archive redirect URLs, and triggers the final GitHub Enterprise Cloud repository migration.
5. Use `checkMigrationStatus` (standard) to monitor the final migration.

Notes:
* Only GHES 3.8+ supported (relies on 302 archive redirect URLs; no manual blob storage step required).
* Visibility currently defaults to `private` during final migration; extend by passing `targetRepoVisibility` when feature added.
* Frontend must persist GHES export IDs (no automatic server persistence by design for simplicity / least privilege).

**Build-time embedding**: Only `TARGET_ORGANIZATION` is embedded in the Next.js bundle. Changing it requires a new build/deploy to reflect in the UI.

### Testing

All unit tests (Jest) live alongside their function code. A consolidated test run is available at the repo root.

Quick commands:
```
npm install   # (first time or after dependency changes)
npm test      # runs all function/unit tests (ts-jest)
```

Key coverage areas:
* GH flow: validation & successful start
* GHES flow: early argument validation, export status derivation, finalization path
* Owner ID reuse optimization (`get-owner-id` + `start-migration`)

See `docs/TESTING_GUIDE.md` for deeper manual scenarios.



## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.