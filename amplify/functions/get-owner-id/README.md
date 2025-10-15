# Get Owner ID Function

This Lambda function retrieves the GitHub organization owner ID for the target organization. It's designed to be called independently before starting a migration to cache the owner ID, enabling optimization of the migration process.

## Purpose

The owner ID is required to start a repository migration using GitHub Enterprise Importer. By separating this call into its own function, we can:

1. **Cache the value**: Store the owner ID in the repository record
2. **Reuse it**: Pass it to subsequent migration starts, avoiding redundant API calls
3. **Optimize performance**: Reduce the number of API calls needed during migration

## Usage

This function is called automatically when needed by the migration UI. It reads the target organization name from environment variables and returns the corresponding owner ID.

### Environment Variables

- `TARGET_ORGANIZATION`: The GitHub organization name (e.g., 'my-org')
- `TARGET_ADMIN_TOKEN`: GitHub personal access token with appropriate permissions

### Response Format

Success response:
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "ownerId": "MDEyOk9yZ2FuaXphdGlvbjU2MTA=",
    "organization": "my-org"
  }
}
```

Error response:
```json
{
  "statusCode": 500,
  "body": {
    "success": false,
    "message": "Error message",
    "error": "Error details"
  }
}
```

## Integration with Start Migration

The `start-migration` function now accepts an optional `destinationOwnerId` parameter. When this value is present, it skips the API call to fetch the owner ID, improving performance and reducing API usage.

## Testing

Unit tests are provided in `handler.test.ts`. Full integration tests require actual GitHub tokens and should be performed in a test environment.
