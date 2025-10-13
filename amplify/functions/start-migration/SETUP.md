# Setting up Environment Variables for Start Migration Function

This guide explains how to configure the required environment variables for the `start-migration` Lambda function in AWS Amplify.

## Environment Variables Required

The function requires three environment variables:

1. `TARGET_ORGANIZATION` - The GitHub organization name that will receive migrated repositories
2. `SOURCE_ADMIN_TOKEN` - Personal Access Token for the source GitHub.com account
3. `TARGET_ADMIN_TOKEN` - Personal Access Token for the target GitHub Enterprise Cloud account

## Setup Instructions

### Option 1: Using Amplify Console (Recommended for Production)

1. Open your AWS Amplify Console
2. Navigate to your application
3. Click on **"App settings"** in the left sidebar
4. Select **"Environment variables"**
5. Click **"Manage variables"** button
6. Add the following variables:

   | Variable | Value | Notes |
   |----------|-------|-------|
   | `TARGET_ORGANIZATION` | `your-org-name` | Organization login name |
   | `SOURCE_ADMIN_TOKEN` | `ghp_...` | Keep this secret! |
   | `TARGET_ADMIN_TOKEN` | `ghp_...` | Keep this secret! |

7. Click **"Save"**
8. Redeploy your application for changes to take effect

### Option 2: Using AWS Secrets Manager (Most Secure)

For enhanced security, store tokens in AWS Secrets Manager and reference them:

1. Create secrets in AWS Secrets Manager:
   ```bash
   aws secretsmanager create-secret \
     --name github/source-admin-token \
     --secret-string "ghp_your_source_token"
   
   aws secretsmanager create-secret \
     --name github/target-admin-token \
     --secret-string "ghp_your_target_token"
   ```

2. Grant your Lambda function permission to read secrets:
   - This requires modifying the Lambda execution role
   - Add the `secretsmanager:GetSecretValue` permission

3. Update the handler code to fetch secrets from Secrets Manager instead of environment variables

### Option 3: Local Development with .env File

For local testing with `npx ampx sandbox`:

1. Create a `.env` file in your project root:
   ```bash
   TARGET_ORGANIZATION=your-test-org
   SOURCE_ADMIN_TOKEN=ghp_your_source_token_for_testing
   TARGET_ADMIN_TOKEN=ghp_your_target_token_for_testing
   ```

2. Add `.env` to your `.gitignore` file (should already be there)

3. The sandbox will automatically load these variables

## Creating Personal Access Tokens

### Source Token (GitHub.com)

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name: "Migration Source Token"
4. Select the following scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:org` (Read org and team membership)
5. Set an appropriate expiration date
6. Click "Generate token"
7. **Copy the token immediately** - you won't see it again!

### Target Token (GitHub Enterprise Cloud)

1. Go to your GitHub Enterprise Cloud instance
2. Navigate to Settings → Developer settings → Personal access tokens
3. Click "Generate new token" → "Generate new token (classic)"
4. Give it a descriptive name: "Migration Target Token"
5. Select the following scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `admin:org` (Full control of orgs and teams)
   - ✅ `workflow` (Update GitHub Action workflows)
6. Set an appropriate expiration date
7. Click "Generate token"
8. **Copy the token immediately** - you won't see it again!

## Security Best Practices

### 1. Token Storage
- ❌ Never commit tokens to source control
- ❌ Never share tokens in plain text (email, chat, etc.)
- ✅ Use environment variables or Secrets Manager
- ✅ Rotate tokens regularly

### 2. Token Scopes
- Use the minimum required scopes
- Create separate tokens for different purposes
- Document what each token is used for

### 3. Access Control
- Restrict who can view environment variables in Amplify Console
- Use AWS IAM policies to control access
- Enable CloudTrail logging for audit purposes

### 4. Token Rotation
Set up a reminder to rotate tokens before they expire:

```bash
# Example: Create a calendar reminder 7 days before token expiration
# Update tokens in Amplify Console
# Redeploy application
```

## Verification

After setting up environment variables, verify they're available:

1. Check CloudWatch Logs for your Lambda function
2. Look for log messages that confirm environment variables are set
3. The function will log errors if variables are missing

Example log output (successful):
```
Starting repository migration with event: {...}
Step 1: Getting ownerId for organization: your-org-name
Owner ID: MDEyOk9yZ2FuaXphdGlvbjU2MTA=
Step 2: Creating migration source
...
```

Example log output (missing variable):
```
Error: TARGET_ORGANIZATION environment variable is not set
```

## Troubleshooting

### Problem: Function returns "environment variable is not set"
**Solution**: 
1. Verify variables are set in Amplify Console
2. Redeploy the application
3. Check variable names match exactly (case-sensitive)

### Problem: "Failed to get organization info"
**Solution**:
1. Verify `TARGET_ORGANIZATION` value is correct
2. Check that `TARGET_ADMIN_TOKEN` has required permissions
3. Verify token hasn't expired

### Problem: "GraphQL request failed: 401"
**Solution**:
1. Verify tokens are valid and haven't expired
2. Check token has required scopes
3. Ensure tokens are for the correct GitHub instance

## Additional Resources

- [Amplify Environment Variables Documentation](https://docs.amplify.aws/console/reference/amplify-env-vars/)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [GitHub Enterprise Importer](https://docs.github.com/en/migrations/using-github-enterprise-importer)
