# Debugging Guide: Repository Visibility Issue

## Problem
Target repositories are always created as `private` regardless of the `Repository Visibility` setting.

## Debugging Approach

This guide will help diagnose where the visibility value is being lost or ignored in the migration flow.

### Flow Overview

```
User selects visibility in UI
    ↓
Value stored in database (repositoryVisibility field)
    ↓
Value retrieved from database (repo.repositoryVisibility)
    ↓
Value passed to GraphQL query (targetRepoVisibility)
    ↓
Lambda handler receives value (args.targetRepoVisibility)
    ↓
Lambda sends GraphQL mutation to GitHub API
    ↓
GitHub API creates repository with specified visibility
```

## Step-by-Step Debugging

### Step 1: Check Browser Console

When you start a migration, check the browser console for this log:

```javascript
Starting migration for repository: {
  id: "...",
  name: "...",
  visibility: "public",        // ← Should match your selection
  visibilityType: "string",
  lockSource: true/false
}
```

**If visibility is `undefined` or `null`:**
- Issue: Value not being saved to or retrieved from database
- Check: Database schema has `repositoryVisibility` field
- Check: `addRepository` and `updateRepositorySettings` functions save the value

**If visibility shows correctly:**
- Proceed to Step 2

### Step 2: Check Lambda CloudWatch Logs

1. Open AWS Console
2. Navigate to CloudWatch → Log groups
3. Find the log group for `start-migration` Lambda function
4. Look for recent log entries

You should see these logs:

```
Step 3: Starting repository migration
Repository visibility parameter: {
  received: "public",    // ← Value received from GraphQL query
  using: "public"        // ← Value being used (after defaulting)
}

startRepositoryMigration called with visibility: {
  rawValue: "public",    // ← Raw parameter value
  finalValue: "public"   // ← Final value after fallback
}

GraphQL mutation variables: {
  sourceId: "...",
  ownerId: "...",
  targetRepoVisibility: "public",  // ← Value sent to GitHub API
  ...
}
```

**If `received` is `undefined` or `null`:**
- Issue: GraphQL query not passing the parameter
- Check: `amplify/data/resource.ts` has `targetRepoVisibility` argument
- Check: Frontend is passing the correct parameter name

**If `received` is correct but `using` or `finalValue` is wrong:**
- Issue: Parameter defaulting logic is wrong
- This shouldn't happen with current code

**If all values in logs are correct:**
- Proceed to Step 3

### Step 3: Check GitHub API Response

If the Lambda logs show the correct visibility value is being sent to GitHub, but the repository is still created as private, the issue is with:

1. **GitHub API behavior**
   - The API might ignore the parameter
   - The API might require specific permissions
   - The API might have organization-level restrictions

2. **Token permissions**
   - The personal access token needs specific scopes
   - Required scopes: `repo`, `admin:org`, `workflow`
   - Check token permissions in GitHub settings

3. **Organization settings**
   - Some organizations restrict repository visibility
   - Check organization settings → Member privileges
   - Check if public repositories are allowed

### Step 4: Manual API Test

To verify if GitHub's API is working correctly, test directly with GraphQL:

```graphql
mutation {
  startRepositoryMigration(input: {
    sourceId: "YOUR_SOURCE_ID",
    ownerId: "YOUR_OWNER_ID",
    repositoryName: "test-visibility",
    sourceRepositoryUrl: "https://github.com/source-org/source-repo",
    accessToken: "YOUR_SOURCE_TOKEN",
    githubPat: "YOUR_TARGET_TOKEN",
    targetRepoVisibility: "public",
    continueOnError: true
  }) {
    repositoryMigration {
      id
      sourceUrl
    }
  }
}
```

Send this to: `https://api.github.com/graphql`

**If this creates a public repository:**
- Issue is in how our code is calling the API
- Double-check the mutation string in `handler.ts`

**If this also creates a private repository:**
- Issue is with GitHub API or permissions
- Contact GitHub support

## Common Issues and Solutions

### Issue: Database field not saving

**Symptom**: Browser console shows `visibility: null` or `undefined`

**Solution**:
1. Check database schema is deployed: `npx ampx sandbox`
2. Verify field was added to model
3. Try deleting and re-adding a repository

### Issue: GraphQL query not passing parameter

**Symptom**: Lambda logs show `received: undefined`

**Solution**:
1. Check `amplify/data/resource.ts` has correct schema
2. Verify generated types: `npx ampx generate graphql-client-code`
3. Check frontend is using correct parameter name

### Issue: GitHub API ignoring parameter

**Symptom**: All logs show correct value, but repo is still private

**Solution**:
1. Verify token has `repo` scope
2. Check organization allows public repositories
3. Try with `internal` visibility instead of `public`
4. Check GitHub Enterprise Importer documentation for updates

## Verification

After fixing, verify by:

1. Creating a test repository with `public` visibility
2. Starting migration
3. Checking all three log locations show correct value
4. Confirming target repository is actually public on GitHub

## Support

If issue persists after debugging:

1. Include all three log outputs in bug report
2. Specify organization type (regular vs enterprise)
3. Include token scopes (without revealing token)
4. Note if any repositories migrated correctly

## Related Files

- `app/page.tsx` - Frontend migration trigger
- `amplify/data/resource.ts` - GraphQL schema
- `amplify/functions/start-migration/handler.ts` - Backend handler
- `.github/copilot-instructions.md` - GitHub API documentation
