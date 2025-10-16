# Testing Guide for destinationOwnerId Optimization

This guide explains how to verify that the optimization is working correctly.

## Automated Tests

### Unit Tests Included

1. **get-owner-id function** (`amplify/functions/get-owner-id/handler.test.ts`)
   - Environment variable validation
   - Response structure validation

2. **start-migration function** (`amplify/functions/start-migration/handler.test.ts`)
   - Accepts `destinationOwnerId` parameter
   - Validates event structure with new parameter
   - Environment and parameter validation

### Running Tests

```bash
# Run tests for get-owner-id
cd amplify/functions/get-owner-id
npm test

# Run tests for start-migration
cd amplify/functions/start-migration
npm test
```

## Manual Testing Scenarios

### Scenario 1: First Migration (No Owner ID Cached)

**Setup:**
1. Add a new repository to the system
2. Ensure the repository record does NOT have a `destinationOwnerId`

**Test Steps:**
1. Click "Start Migration" button
2. Check the Lambda function logs

**Expected Results:**
- ✅ Logs show: "Step 1: Getting ownerId for organization: [org-name]"
- ✅ GitHub API call is made to fetch owner ID
- ✅ Migration starts successfully
- ✅ Repository record is updated with `destinationOwnerId`

**Verification:**
```
# Check repository record in database
- destinationOwnerId should be populated (e.g., "MDEyOk9yZ2FuaXphdGlvbjU2MTA=")
```

### Scenario 2: Second Migration (Owner ID Cached)

**Setup:**
1. Use the same repository from Scenario 1
2. Wait for migration to complete or fail
3. Ensure `destinationOwnerId` is still in the record

**Test Steps:**
1. Click "Start Migration" button again (or after Reset)
2. Check the Lambda function logs

**Expected Results:**
- ✅ Logs show: "Step 1: Reusing provided destinationOwnerId: [owner-id]"
- ✅ NO GitHub API call to fetch owner ID
- ✅ Migration starts successfully
- ✅ Repository record retains the same `destinationOwnerId`

**Verification:**
```
# Compare log entries between first and second migration
First:  "Getting ownerId for organization"
Second: "Reusing provided destinationOwnerId"
```

### Scenario 3: After Reset (Owner ID Preserved)

**Setup:**
1. Complete a migration successfully
2. Open the Settings modal for the repository
3. Click the "Reset" button (if available)

**Test Steps:**
1. Check the repository record after reset
2. Start migration again
3. Check the Lambda function logs

**Expected Results:**
- ✅ After reset: `destinationOwnerId` is still present in record
- ✅ After reset: `migrationSourceId` is cleared
- ✅ After reset: `repositoryMigrationId` is cleared
- ✅ Logs show: "Step 1: Reusing provided destinationOwnerId: [owner-id]"
- ✅ NO GitHub API call to fetch owner ID

### Scenario 4: Multiple Repositories (Same Organization)

**Setup:**
1. Add multiple repositories to migrate
2. Start migration for the first repository

**Test Steps:**
1. Start first migration and let it complete
2. Start second migration immediately after
3. Compare logs for both migrations

**Expected Results:**
- ✅ First migration: Fetches owner ID via API
- ✅ Second migration: Reuses cached owner ID (if already cached)
- ✅ All migrations use the same owner ID value

## Log Analysis

### Optimization Active (Owner ID Reused)

Look for this in CloudWatch Logs:
```
Step 1: Reusing provided destinationOwnerId: MDEyOk9yZ2FuaXphdGlvbjU2MTA=
```

### Fallback Mode (API Call Made)

Look for this in CloudWatch Logs:
```
Step 1: Getting ownerId for organization: my-org
Owner ID: MDEyOk9yZ2FuaXphdGlvbjU2MTA=
```

## Verification Checklist

- [ ] Unit tests pass for both functions
- [ ] First migration fetches owner ID via API (logs confirm)
- [ ] Second migration reuses cached owner ID (logs confirm)
- [ ] After reset, owner ID is preserved in database
- [ ] After reset, migration still reuses owner ID
- [ ] No breaking changes to existing functionality
- [ ] Error handling works when owner ID is invalid
- [ ] GraphQL schema includes new optional parameter

## Performance Metrics

### Before Optimization
- API calls per migration: **3** (getOwnerId, createMigrationSource, startRepositoryMigration)
- Typical latency: ~2-3 seconds

### After Optimization (Owner ID Cached)
- API calls per migration: **2** (createMigrationSource, startRepositoryMigration)
- Typical latency: ~1-2 seconds
- **Reduction**: ~33% fewer API calls, ~1 second faster

## Database Verification Queries

### Check if owner ID is stored

```graphql
query GetRepository {
  getRepositoryMigration(id: "repo-id") {
    repositoryName
    destinationOwnerId
    migrationSourceId
    repositoryMigrationId
    state
  }
}
```

Expected after first successful migration:
- `destinationOwnerId`: Present (e.g., "MDEyOk9yZ2FuaXphdGlvbjU2MTA=")
- `migrationSourceId`: Present
- `repositoryMigrationId`: Present
- `state`: "in_progress" or "completed"

Expected after reset:
- `destinationOwnerId`: **Still Present** ✅
- `migrationSourceId`: Cleared
- `repositoryMigrationId`: Cleared
- `state`: "pending" or unchanged

## Troubleshooting

### Issue: Logs show API call every time

**Possible causes:**
1. `destinationOwnerId` is not being saved to database
2. Frontend is not passing the parameter
3. Repository record is being cleared unexpectedly

**Solution:**
- Check database record has `destinationOwnerId`
- Verify frontend code passes `repo.destinationOwnerId || undefined`
- Check Reset functionality preserves `destinationOwnerId`

### Issue: Migration fails with invalid owner ID

**Possible causes:**
1. Stale owner ID in database (organization changed)
2. Incorrect owner ID format

**Solution:**
- Clear the `destinationOwnerId` from the record
- Let the function fetch a fresh owner ID
- Update the record with the new value

### Issue: Owner ID not populated after migration

**Possible causes:**
1. Lambda function not returning owner ID
2. Frontend not saving the response

**Solution:**
- Check Lambda response includes `ownerId` field
- Verify frontend updates repository with `destinationOwnerId: response.ownerId`

## Success Criteria

✅ All unit tests pass  
✅ First migration fetches owner ID  
✅ Second migration reuses owner ID  
✅ Logs clearly indicate optimization is active  
✅ Performance improved (fewer API calls)  
✅ No breaking changes  
✅ Backward compatible with existing migrations
