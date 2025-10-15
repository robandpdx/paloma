# Backend Migration Polling Architecture

## Overview

This implementation moves the migration status polling from the frontend to the backend, ensuring a single polling process runs regardless of how many browser windows are open or even if no browser windows are open.

## Architecture Components

### 1. Backend Polling Lambda Function
**Location**: `amplify/functions/poll-migration-status/`

This Lambda function:
- Runs on a scheduled EventBridge rule (every 1 minute)
- Queries the Amplify Data table for all repositories with `state: 'in_progress'`
- For each repository, checks the migration status via GitHub's GraphQL API
- Updates the database with the current status
- Maps GitHub's 'succeeded' state to 'completed' for consistency
- Continues running even when no browsers are connected

**Key Features**:
- Handles multiple repositories in parallel using `Promise.allSettled()`
- Gracefully handles errors for individual repositories
- Provides detailed logging for debugging
- Automatic timeout of 60 seconds for processing multiple repos

### 2. EventBridge Schedule
**Location**: `amplify/custom/polling-schedule.ts`

- Creates a scheduled rule that triggers every 1 minute
- EventBridge minimum interval is 1 minute (not 30 seconds)
- Automatically adds the Lambda function as a target
- Named rule: `migration-polling-schedule`

### 3. Backend Configuration
**Location**: `amplify/backend.ts`

Updated to:
- Include the new `pollMigrationStatus` function
- Pass Amplify Data endpoint and API key to the polling function via environment variables
- Grant the polling function permission to read and update the database
- Initialize the EventBridge schedule

### 4. Frontend Changes
**Location**: `app/page.tsx`

**Removed**:
- `pollingRepos` state and `pollingReposRef` 
- `startPolling` callback function
- `checkMigrationStatus` callback function
- Polling resumption useEffect hook
- Polling interval useEffect hook (30-second timer)
- `useCallback` and `useRef` imports (no longer needed)

**Retained**:
- `observeQuery` subscription to listen for database changes
- All UI components and modals
- Migration start functionality (only starts the migration)
- All other repository management functions

The frontend now only:
1. Displays the current state from the database via `observeQuery`
2. Starts migrations when requested
3. Shows real-time updates as the backend updates the database

## Benefits

1. **Single Polling Process**: Only one Lambda instance polls at a time, regardless of browser windows
2. **No Browser Required**: Polling continues even when no users are viewing the page
3. **Better Resource Usage**: No duplicate API calls from multiple browser windows
4. **Improved Rate Limiting**: Single controlled polling process respects GitHub API limits
5. **Simplified Frontend**: Removed ~100 lines of complex polling logic
6. **Scalability**: Can handle long-running migrations (hours) without keeping browsers open
7. **Reliability**: Backend process is more reliable than browser-based polling

## Environment Variables

The polling function requires:
- `TARGET_ADMIN_TOKEN`: GitHub PAT for accessing the GitHub API (set manually)
- `AMPLIFY_DATA_ENDPOINT`: GraphQL endpoint (set automatically by backend.ts)

**Note**: The Lambda function uses IAM permissions to access the AppSync API. No API key is required. The function is automatically granted the necessary permissions via IAM policy during deployment.

## Database Schema

No changes to the database schema were required. The polling function uses the existing fields:
- `state`: Current migration state ('pending', 'in_progress', 'completed', 'failed', 'reset')
- `repositoryMigrationId`: GitHub migration ID for status checks
- `failureReason`: Error message if migration fails

## Polling Frequency

- **EventBridge Rule**: 1 minute intervals (EventBridge minimum)
- **Previous Frontend**: 30 seconds per browser window
- **Net Effect**: More efficient overall, as a single 1-minute poll replaces multiple 30-second polls

For migrations requiring faster updates, the EventBridge schedule can be easily adjusted in `polling-schedule.ts`.

## Migration Flow

1. User clicks "Start Migration" in UI
2. Frontend calls `startMigration` function
3. Migration starts in GitHub
4. Database record updated to `state: 'in_progress'`
5. **Backend polling takes over**:
   - Every minute, EventBridge triggers the polling Lambda
   - Lambda queries for all in-progress migrations
   - For each migration, status is checked via GitHub API
   - Database is updated with current status
6. Frontend receives real-time updates via `observeQuery`
7. When migration completes, state changes to 'completed' or 'failed'
8. Polling Lambda stops checking that repository

## Error Handling

- Individual repository errors don't stop processing of other repositories
- Failed API calls are logged but don't crash the Lambda
- Database updates are wrapped in try-catch blocks
- Detailed error information is returned in the Lambda response

## Future Enhancements

Potential improvements:
1. Add SQS queue for more sophisticated queuing and retry logic
2. Implement exponential backoff for failed status checks
3. Add CloudWatch alarms for Lambda failures
4. Store polling metrics in CloudWatch for monitoring
5. Add DLQ (Dead Letter Queue) for failed events
