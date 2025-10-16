# Optimization: Reuse destinationOwnerId in Start Migration

## Overview

This optimization improves the `start-migration` function by allowing it to reuse the `destinationOwnerId` when it's already known, eliminating an unnecessary GitHub API call.

## Problem

Previously, every time a migration was started, the `start-migration` function would make a GitHub GraphQL API call to retrieve the `destinationOwnerId` (organization ID) for the target organization. This happened even when:

1. The value was already stored in the repository record from a previous migration
2. The value was preserved after using the "Reset" button
3. Multiple migrations were being started to the same target organization

This resulted in:
- Unnecessary API calls
- Increased latency when starting migrations
- Higher API rate limit consumption

## Solution

### 1. New `get-owner-id` Function

Created a separate Lambda function (`amplify/functions/get-owner-id/`) that:
- Retrieves the GitHub organization owner ID
- Can be called independently if needed
- Returns a simple JSON response with the owner ID

**Files created:**
- `handler.ts` - Lambda function implementation
- `resource.ts` - Amplify function definition
- `handler.test.ts` - Unit tests
- `package.json` - Package metadata
- `README.md` - Documentation

### 2. Updated `start-migration` Function

Modified the `start-migration` function to:
- Accept an optional `destinationOwnerId` parameter
- Skip the API call to fetch the owner ID if the parameter is provided
- Fall back to fetching it via API if not provided (backward compatible)

**Changes made:**
- Added `destinationOwnerId?: string` to `MigrationArguments` interface
- Updated handler to check for `args.destinationOwnerId` before calling `getOwnerId()`
- Logs indicate whether the owner ID was reused or fetched

### 3. Updated GraphQL Schema

Modified `amplify/data/resource.ts` to:
- Add `destinationOwnerId` as optional parameter to `startMigration` query
- Add new `getOwnerId` query (for future use)

### 4. Updated Frontend

Modified `app/page.tsx` to:
- Pass `destinationOwnerId` from the repository record to `startMigration` when available
- Uses `repo.destinationOwnerId || undefined` to provide the value if present

## Benefits

1. **Performance**: Eliminates one GitHub API call per migration start when the owner ID is known
2. **Rate Limit**: Reduces API usage, helping stay within GitHub rate limits
3. **Backward Compatible**: Works with existing migrations that don't have cached owner IDs
4. **Clean Separation**: The `get-owner-id` function can be used independently if needed

## How It Works

### When Starting a Migration

1. Frontend retrieves the repository record from the database
2. If `destinationOwnerId` exists in the record, it passes it to `startMigration`
3. Backend receives the owner ID and uses it directly, skipping the API call
4. If not provided, backend fetches it as before (backward compatible)

### When Owner ID is Preserved

According to the issue description, when the "Reset" button is pressed in the Settings modal:
- `migrationSourceId` is cleared
- `repositoryMigrationId` is cleared
- `destinationOwnerId` is **preserved** (not cleared)

This means subsequent migrations will automatically benefit from the optimization.

## Testing

### Unit Tests

- **get-owner-id**: Tests environment variable validation and response structure
- **start-migration**: Added test to verify `destinationOwnerId` parameter is accepted

### Manual Testing

To manually test the optimization:

1. Start a migration for a repository (first time)
   - Check logs: should show "Getting ownerId for organization"
   - Verify `destinationOwnerId` is stored in the repository record

2. Reset the migration (if Reset button exists)
   - Verify `destinationOwnerId` is still present in the record

3. Start migration again
   - Check logs: should show "Reusing provided destinationOwnerId"
   - Verify no API call was made to fetch owner ID

## Files Modified

- `amplify/backend.ts` - Added `getOwnerId` function import and registration
- `amplify/data/resource.ts` - Added `getOwnerId` query and `destinationOwnerId` parameter
- `amplify/functions/start-migration/handler.ts` - Updated to accept and use `destinationOwnerId`
- `amplify/functions/start-migration/handler.test.ts` - Added test for new parameter
- `app/page.tsx` - Updated to pass `destinationOwnerId` when available

## Files Created

- `amplify/functions/get-owner-id/handler.ts`
- `amplify/functions/get-owner-id/resource.ts`
- `amplify/functions/get-owner-id/handler.test.ts`
- `amplify/functions/get-owner-id/package.json`
- `amplify/functions/get-owner-id/README.md`

## Future Enhancements

1. **Pre-fetch Owner ID**: The frontend could call `getOwnerId` when adding a repository to pre-populate the field
2. **Cache Validation**: Add logic to refresh the owner ID if it's stale or invalid
3. **Multiple Organizations**: Support different target organizations with cached owner IDs
