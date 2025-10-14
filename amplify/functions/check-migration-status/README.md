# Check Migration Status Function

This AWS Lambda function checks the status of a GitHub repository migration using the GitHub GraphQL API.

## Overview

This function queries the GitHub API to get the current status of an in-progress repository migration. It's designed to be called periodically (e.g., every 30 seconds) to monitor migration progress until completion or failure.

## Environment Variables

The function requires the following environment variable:

- `TARGET_ADMIN_TOKEN` - Personal Access Token for the target GitHub Enterprise Cloud organization

## Input

The function expects an event with the following structure:

```typescript
{
  migrationId: string;  // The repository migration ID returned from startRepositoryMigration
}
```

### Example Input

```json
{
  "migrationId": "RM_kgDaACQxYmYxOWU4Yi0wNzZmLTQ3NTMtOTdkZC1hNGUzZmYxN2U2YzA"
}
```

## Output

### Success Response

```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "migrationId": "RM_kgDaACQxYmYxOWU4Yi0wNzZmLTQ3NTMtOTdkZC1hNGUzZmYxN2U2YzA",
    "sourceUrl": "https://github.com/source-org/repo",
    "state": "IN_PROGRESS",
    "failureReason": null,
    "migrationSource": {
      "name": "GitHub.com Source"
    }
  }
}
```

### Possible States

The GitHub API returns states in uppercase:

- `QUEUED` - Migration is queued but not yet started
- `IN_PROGRESS` - Migration is currently in progress
- `FAILED` - Migration failed (check `failureReason` for details)
- `SUCCEEDED` - Migration completed successfully (convert to 'completed' in your app for display)

### Error Response

```json
{
  "statusCode": 500,
  "body": {
    "success": false,
    "message": "Failed to get migration status: ...",
    "error": "Error: ..."
  }
}
```

## Usage from Frontend

### With Amplify Data Client

```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

// Check migration status
const result = await client.queries.checkMigrationStatus({
  migrationId: 'RM_kgDaACQxYmYxOWU4Yi0wNzZmLTQ3NTMtOTdkZC1hNGUzZmYxN2U2YzA'
});

if (result.data) {
  const response = JSON.parse(result.data as string);
  if (response.success) {
    console.log('Current state:', response.state);
    if (response.state === 'FAILED') {
      console.error('Failure reason:', response.failureReason);
    }
  }
}
```

### Polling Pattern

```typescript
const pollMigrationStatus = async (migrationId: string) => {
  const pollInterval = 30000; // 30 seconds
  
  const poll = async () => {
    const result = await client.queries.checkMigrationStatus({ migrationId });
    
    if (result.data) {
      const response = JSON.parse(result.data as string);
      // GitHub API returns states in UPPERCASE (e.g., 'IN_PROGRESS', 'SUCCEEDED', 'FAILED')
      const state = response.state.toLowerCase(); // Convert to lowercase for consistency
      
      // Update UI with current state
      updateMigrationStatus(state, response.failureReason);
      
      // Continue polling if still in progress
      if (state !== 'failed' && state !== 'succeeded') {
        setTimeout(poll, pollInterval);
      }
    }
  };
  
  await poll();
};
```

## Implementation Details

### GraphQL Query

The function uses the GitHub `getMigration` query:

```graphql
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
```

### API Endpoint

All requests are sent to: `https://api.github.com/graphql`

## Error Handling

The function handles the following error scenarios:

1. **Missing Environment Variables**: Returns 500 if `TARGET_ADMIN_TOKEN` is not set
2. **Missing Input**: Returns error if `migrationId` is not provided
3. **API Errors**: Returns 500 with error details if the GitHub API request fails
4. **Migration Not Found**: Returns error if the migration ID is invalid

## Related Documentation

- [GitHub Enterprise Importer GraphQL API](https://docs.github.com/en/migrations/using-github-enterprise-importer/migrating-between-github-products/migrating-repositories-from-githubcom-to-github-enterprise-cloud)
- [Start Migration Function](../start-migration/README.md)
- [Personal Access Token Requirements](../start-migration/SETUP.md)

## Testing

To test the function locally:

```bash
cd amplify/functions/check-migration-status
npm test
```

## Monitoring

The function logs all activities to CloudWatch Logs, including:
- Input parameters
- Migration status retrieved
- Any errors encountered

Check CloudWatch Logs for debugging and monitoring migration progress.
