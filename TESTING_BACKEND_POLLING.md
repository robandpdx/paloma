# Testing Guide for Backend Polling Architecture

## Prerequisites
- AWS Amplify environment deployed with the new backend polling architecture
- Valid GitHub Personal Access Tokens configured
- At least one repository added to the system

## Manual Testing Steps

### 1. Test Backend Polling Lambda Function

#### Via AWS Console
1. Navigate to AWS Lambda console
2. Find the `poll-migration-status` function
3. Click "Test" tab
4. Create a test event (can use empty JSON `{}`)
5. Click "Test" to invoke the function
6. Verify the response shows successful execution

**Expected Response**:
```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"message\":\"No repositories in progress\",\"processed\":0}"
}
```
(If no migrations are in progress)

#### Via CloudWatch Logs
1. Navigate to CloudWatch Logs
2. Find log group: `/aws/lambda/poll-migration-status`
3. Check recent log streams
4. Verify logs show:
   - "Starting scheduled migration status polling"
   - Number of repositories found
   - Status updates for each repository

### 2. Test EventBridge Schedule

#### Via AWS Console
1. Navigate to EventBridge console
2. Go to "Rules" section
3. Find rule: `migration-polling-schedule` or with prefix `MigrationPollingSchedule`
4. Verify:
   - State: "Enabled"
   - Schedule: "rate(1 minute)"
   - Target: Lambda function `poll-migration-status`

#### Monitor Executions
1. Wait 1-2 minutes
2. Check CloudWatch Logs for the Lambda function
3. Verify function is being triggered automatically every minute
4. Look for log entries with timestamps ~1 minute apart

### 3. Test End-to-End Migration Flow

#### Step 1: Start a Migration
1. Open the application in a web browser
2. Add a new repository
3. Click "Start Migration"
4. Verify the status changes to "In Progress"

#### Step 2: Verify Backend Polling
1. Check CloudWatch Logs for `poll-migration-status`
2. Within 1 minute, you should see logs indicating:
   ```
   Found 1 repositories in progress
   Repository <name> (<id>): in_progress
   ```
3. Keep monitoring logs to see status updates

#### Step 3: Test Multiple Browser Windows
1. Open the application in 2-3 different browser windows/tabs
2. Verify all windows show the same status
3. Check CloudWatch Logs - should still show only ONE polling process
4. Close all browser windows
5. Check CloudWatch Logs - polling should CONTINUE

#### Step 4: Verify Status Updates
1. Wait for migration to progress or complete
2. All browser windows should update automatically (via observeQuery)
3. No frontend polling should occur (verify in browser console - no status check API calls)
4. Verify database is updated with current status

### 4. Test Error Handling

#### Test with Invalid Migration ID
1. Manually update a repository in the database to have an invalid `repositoryMigrationId`
2. Set state to `in_progress`
3. Wait for polling cycle
4. Check CloudWatch Logs for error handling
5. Verify other repositories continue to be processed

#### Test with GitHub API Errors
1. Temporarily set invalid `TARGET_ADMIN_TOKEN` in Lambda environment
2. Start a migration
3. Wait for polling cycle
4. Verify errors are logged but Lambda doesn't crash
5. Restore valid token

### 5. Performance Testing

#### Test Multiple Migrations
1. Add 5-10 repositories
2. Start all migrations simultaneously
3. Monitor CloudWatch Logs
4. Verify all repositories are processed within reasonable time (< 60 seconds)
5. Check for any timeout errors

#### Monitor CloudWatch Metrics
1. Navigate to CloudWatch Metrics
2. Find Lambda metrics for `poll-migration-status`
3. Monitor:
   - Invocations (should be ~1 per minute)
   - Duration (should be < 10 seconds for typical load)
   - Errors (should be 0 or minimal)
   - Throttles (should be 0)

### 6. Test Frontend Changes

#### Verify No Frontend Polling
1. Open browser DevTools (Network tab)
2. Filter for "checkMigrationStatus" API calls
3. Start a migration
4. Monitor for 2-3 minutes
5. Verify NO frontend polling occurs
6. Only `observeQuery` subscription should be active

#### Test observeQuery Updates
1. Start a migration
2. Monitor browser console
3. Verify database updates appear automatically
4. Status button should update in real-time
5. No manual refresh needed

## Automated Testing

### Lambda Function Unit Test (Optional)
Create test file: `amplify/functions/poll-migration-status/handler.test.ts`

```typescript
import { handler } from './handler';

describe('poll-migration-status', () => {
  it('should handle empty repository list', async () => {
    const result = await handler({}, {} as any);
    expect(result.statusCode).toBe(200);
  });
});
```

Run with: `npm test` (if test framework is configured)

## Verification Checklist

- [ ] Lambda function executes successfully
- [ ] EventBridge rule is enabled and triggering every 1 minute
- [ ] CloudWatch Logs show scheduled executions
- [ ] Frontend does NOT poll GitHub API
- [ ] Status updates appear in real-time via observeQuery
- [ ] Multiple browser windows show consistent state
- [ ] Polling continues when all browsers are closed
- [ ] Migration status progresses from in_progress to completed/failed
- [ ] Error handling works correctly
- [ ] Performance is acceptable (< 60s for multiple repos)

## Troubleshooting

### Lambda Not Executing
- Check EventBridge rule is enabled
- Verify Lambda permissions
- Check CloudWatch Logs for errors

### No Status Updates
- Verify `AMPLIFY_DATA_ENDPOINT` and `AMPLIFY_API_KEY` are set
- Check Lambda has network access
- Verify database records exist with state='in_progress'

### GitHub API Errors
- Verify `TARGET_ADMIN_TOKEN` is valid and has correct scopes
- Check rate limiting (GitHub API has limits)
- Verify network connectivity from Lambda to GitHub

### Frontend Not Updating
- Verify `observeQuery` subscription is active
- Check browser console for errors
- Verify database updates are occurring (check DynamoDB/DataStore)

## Success Criteria

The implementation is successful when:
1. ✅ Only ONE polling process runs regardless of browser windows
2. ✅ Polling continues with zero browser windows open
3. ✅ Frontend receives real-time updates via database subscription
4. ✅ No frontend code makes repeated status check API calls
5. ✅ Migrations complete successfully with status updates
6. ✅ System handles multiple simultaneous migrations
7. ✅ Error handling prevents cascade failures
8. ✅ CloudWatch Logs show clean execution every minute
