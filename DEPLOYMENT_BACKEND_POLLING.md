# Deployment Guide for Backend Polling Architecture

## Overview
This guide covers deploying the new backend polling architecture to AWS using Amplify.

## Changes Summary
- **New**: Lambda function `poll-migration-status` with EventBridge schedule
- **Modified**: Backend configuration to pass Data API credentials
- **Removed**: Frontend polling logic (simplified code)
- **Impact**: More efficient, reliable polling that works without browser windows

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure the following environment variable is configured in Amplify Console:

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `TARGET_ADMIN_TOKEN` | GitHub PAT for target GHEC | `ghp_xxxx...` | Yes |

**Note**: The following are automatically configured by Amplify:
- `AMPLIFY_DATA_ENDPOINT` - Set automatically in backend.ts
- `AMPLIFY_API_KEY` - Set automatically in backend.ts

### 2. GitHub Token Permissions
Verify your `TARGET_ADMIN_TOKEN` has these scopes:
- `repo` (full control of private repositories)
- `admin:org` (read:org at minimum)
- `workflow` (if using GitHub Actions)

### 3. Review Code Changes
```bash
git diff main..copilot/rearchitect-migration-polling
```

Key files to review:
- `amplify/functions/poll-migration-status/` - New polling Lambda
- `amplify/custom/polling-schedule.ts` - EventBridge schedule
- `amplify/backend.ts` - Backend configuration
- `app/page.tsx` - Simplified frontend (no polling)

## Deployment Steps

### Option 1: Deploy via Amplify Console (Recommended)

#### Step 1: Push Changes
```bash
git checkout copilot/rearchitect-migration-polling
git push origin copilot/rearchitect-migration-polling
```

#### Step 2: Deploy from Console
1. Navigate to AWS Amplify Console
2. Select your app
3. Go to the branch settings
4. Create a new branch or update existing branch to point to `copilot/rearchitect-migration-polling`
5. Click "Redeploy this version" or wait for automatic deployment

#### Step 3: Monitor Deployment
1. Watch the build logs in Amplify Console
2. Verify all stages complete:
   - Provision
   - Build
   - Deploy
   - Post-build
3. Expected duration: 5-10 minutes

### Option 2: Deploy via Amplify CLI

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Deploy Backend
```bash
npx ampx sandbox  # For sandbox environment
# OR
npx ampx pipeline-deploy  # For production
```

#### Step 3: Monitor CloudFormation
1. Navigate to AWS CloudFormation Console
2. Find stack: `amplify-<app-name>-<branch>-<stack-id>`
3. Monitor stack status
4. Verify all resources are created:
   - Lambda function: `poll-migration-status`
   - EventBridge rule: with prefix `MigrationPollingSchedule`
   - IAM roles and permissions

## Post-Deployment Verification

### 1. Verify Lambda Function

#### Via AWS Console
```bash
# Navigate to Lambda Console
# Find function: poll-migration-status-<env>
# Verify:
# - Runtime: Node.js 18.x or 20.x
# - Timeout: 60 seconds
# - Environment variables:
#   - TARGET_ADMIN_TOKEN (set)
#   - AMPLIFY_DATA_ENDPOINT (set)
#   - AMPLIFY_API_KEY (set)
```

#### Via AWS CLI
```bash
aws lambda get-function --function-name poll-migration-status-<env>
aws lambda get-function-configuration --function-name poll-migration-status-<env>
```

### 2. Verify EventBridge Rule

#### Via AWS Console
```bash
# Navigate to EventBridge Console
# Go to Rules
# Find rule with name matching: MigrationPollingSchedule*
# Verify:
# - State: Enabled
# - Schedule: rate(1 minute)
# - Target: Lambda function poll-migration-status
```

#### Via AWS CLI
```bash
aws events list-rules --name-prefix MigrationPollingSchedule
aws events list-targets-by-rule --rule <rule-name>
```

### 3. Test the Deployment

#### Quick Test
1. Navigate to Lambda Console
2. Select `poll-migration-status` function
3. Click "Test" tab
4. Create test event with empty JSON: `{}`
5. Click "Test"
6. Verify response:
```json
{
  "statusCode": 200,
  "body": "{\"success\":true,\"message\":\"No repositories in progress\",\"processed\":0}"
}
```

#### End-to-End Test
1. Open the application
2. Add a test repository
3. Start a migration
4. Wait 1-2 minutes
5. Verify status updates automatically
6. Check CloudWatch Logs for polling activity

### 4. Monitor CloudWatch Logs

```bash
# Via AWS CLI
aws logs tail /aws/lambda/poll-migration-status-<env> --follow

# Or via Console
# Navigate to CloudWatch Logs
# Find log group: /aws/lambda/poll-migration-status-<env>
# Monitor for entries appearing every ~1 minute
```

## Rollback Plan

If issues occur, rollback using one of these methods:

### Method 1: Amplify Console Rollback
1. Navigate to Amplify Console
2. Go to branch deployments
3. Find previous successful deployment
4. Click "Redeploy this version"

### Method 2: Git Revert
```bash
git checkout main
git pull origin main
git push origin main --force
```

### Method 3: Disable EventBridge Rule
If polling is causing issues but app works otherwise:
```bash
aws events disable-rule --name <rule-name>
```

This stops scheduled polling while keeping other functionality intact.

## Troubleshooting Deployment

### Build Fails - Missing Dependencies
**Issue**: Build fails with "Cannot find module..."
**Solution**: 
```bash
cd amplify/functions/poll-migration-status
npm install
git add package-lock.json
git commit -m "Add dependencies"
git push
```

### Lambda Permission Errors
**Issue**: Lambda cannot access DynamoDB or AppSync
**Solution**: Verify IAM role has correct permissions. Check backend.ts configuration.

### EventBridge Not Triggering
**Issue**: Lambda not executing on schedule
**Solution**:
1. Verify EventBridge rule is enabled
2. Check rule targets configuration
3. Verify Lambda resource-based policy allows EventBridge invocation

### Environment Variables Not Set
**Issue**: Lambda fails with "TARGET_ADMIN_TOKEN is not set"
**Solution**:
1. Navigate to Amplify Console → Environment variables
2. Add `TARGET_ADMIN_TOKEN` with valid GitHub PAT
3. Redeploy the application

## Monitoring Post-Deployment

### Key Metrics to Watch

#### CloudWatch Metrics (First 24 Hours)
- **Lambda Invocations**: Should be ~1440 per day (1 per minute)
- **Lambda Duration**: Should be < 10 seconds
- **Lambda Errors**: Should be 0
- **Lambda Throttles**: Should be 0

#### CloudWatch Logs
Monitor for:
- Regular execution every ~1 minute
- "Found X repositories in progress"
- Successful status updates
- No error messages

#### Application Behavior
- Frontend loads without errors
- Status updates appear automatically
- No polling in browser Network tab
- Multiple browser windows show consistent state

### Set Up Alarms (Recommended)

```bash
# Create CloudWatch Alarm for Lambda Errors
aws cloudwatch put-metric-alarm \
  --alarm-name poll-migration-status-errors \
  --alarm-description "Alert when polling Lambda has errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=poll-migration-status-<env>
```

## Success Indicators

Deployment is successful when:
- ✅ Lambda function exists and has correct environment variables
- ✅ EventBridge rule is enabled and triggering every minute
- ✅ CloudWatch Logs show scheduled executions
- ✅ Frontend loads and displays repositories correctly
- ✅ Starting a migration triggers status updates automatically
- ✅ No errors in CloudWatch Logs or browser console
- ✅ Multiple browser windows show consistent state
- ✅ Status updates continue with no browser windows open

## Support

If you encounter issues:
1. Check CloudWatch Logs: `/aws/lambda/poll-migration-status-<env>`
2. Verify environment variables in Amplify Console
3. Review EventBridge rule configuration
4. Test Lambda function manually via Console
5. Refer to `TESTING_BACKEND_POLLING.md` for detailed testing procedures

## Next Steps After Deployment

1. Monitor CloudWatch Logs for first few hours
2. Test with a real repository migration
3. Verify performance with multiple simultaneous migrations
4. Set up CloudWatch Alarms for production monitoring
5. Document any environment-specific configurations
