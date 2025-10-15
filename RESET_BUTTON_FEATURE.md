# Reset Button Feature - Visual Guide

## Overview
This document describes the new Reset button feature added to the Repository Settings modal.

## UI Changes

### 1. Settings Modal with Reset Button

The Settings modal now includes a red "Reset" button at the bottom:

```
┌─────────────────────────────────────────────┐
│ Repository Settings                      × │
├─────────────────────────────────────────────┤
│                                             │
│ ☐ Lock source repository                   │
│ Lock the source repository during           │
│ migration to prevent modifications          │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ✓ Setting saved                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
├─────────────────────────────────────────────┤
│                               ┌───────────┐ │
│                               │   Reset   │ │ <- Red button
│                               └───────────┘ │
└─────────────────────────────────────────────┘
```

### 2. Confirmation Dialog

When the Reset button is clicked, a confirmation dialog appears:

```
┌─────────────────────────────────────────────┐
│ Confirm Reset                            × │
├─────────────────────────────────────────────┤
│                                             │
│ Are you sure you want to reset this         │
│ repository?                                 │
│                                             │
│ This will:                                  │
│  • Delete the target repository if it       │
│    exists                                   │
│  • Unlock the source repository (if locked) │
│  • Clear migration IDs                      │
│  • Reset the migration state                │
│                                             │
├─────────────────────────────────────────────┤
│                 ┌──────────┐  ┌───────────┐ │
│                 │  Cancel  │  │   Reset   │ │
│                 └──────────┘  └───────────┘ │
│                                       ↑      │
│                                  Red button  │
└─────────────────────────────────────────────┘
```

## Functionality

### Reset Operation Flow

1. **User clicks the Reset button** in the Settings modal
2. **Confirmation dialog appears** showing what will happen
3. **User confirms** by clicking the red Reset button in the confirmation
4. **Backend operations execute**:
   - `deleteTargetRepo` function is called to delete the migrated repository
   - `unlockSourceRepo` function is called (only if lockSource was true)
5. **Database record updated**:
   - `state` is set to "reset"
   - `migrationSourceId` is cleared (set to null)
   - `repositoryMigrationId` is cleared (set to null)
   - `lockSource` is set to false
   - `failureReason` is cleared (set to null)
   - `destinationOwnerId` is **preserved** (as requested)

### State Changes

After a reset:
- Repository state changes to "reset"
- The status button changes back to "Start Migration"
- Lock source repository checkbox is unchecked
- User can start a fresh migration

## Technical Implementation

### New Lambda Functions

#### 1. delete-target-repo
- **Purpose**: Delete the target repository in the destination organization
- **API**: GitHub REST API - DELETE /repos/{owner}/{repo}
- **Environment Variables**:
  - TARGET_ORGANIZATION
  - TARGET_ADMIN_TOKEN

#### 2. unlock-source-repo
- **Purpose**: Unlock the source repository that was locked during migration
- **API**: 
  1. First queries `GET /orgs/{org}/migrations` to find the migration containing the repository
  2. Then calls `DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock`
- **Environment Variables**:
  - SOURCE_ADMIN_TOKEN
- **Required Arguments**:
  - sourceRepositoryUrl - To extract the organization
  - repositoryName - The repository name
- **Note**: The function automatically finds the correct migration ID by querying all migrations for the organization

### GraphQL Queries

Two new queries were added to the Amplify Data schema:

```graphql
deleteTargetRepo(repositoryName: String!): JSON
unlockSourceRepo(
  sourceRepositoryUrl: String!, 
  repositoryName: String!
): JSON
```

Note: The unlock function automatically finds the migration ID by querying all migrations for the organization.

### UI Logic

The reset operation in the frontend:
1. Calls `deleteTargetRepo` with the repository name
2. Conditionally calls `unlockSourceRepo` if lockSource was true
   - Only requires sourceRepositoryUrl and repositoryName
   - The function automatically finds the correct migration ID
3. Updates the database record with new state and cleared fields
4. Handles errors gracefully - still resets state even if API calls fail

## Files Modified

1. **amplify/functions/delete-target-repo/** (new)
   - handler.ts - Lambda function to delete target repository
   - resource.ts - Function definition
   - package.json - Function metadata

2. **amplify/functions/unlock-source-repo/** (new)
   - handler.ts - Lambda function to unlock source repository
   - resource.ts - Function definition
   - package.json - Function metadata

3. **amplify/backend.ts**
   - Registered new functions

4. **amplify/data/resource.ts**
   - Added deleteTargetRepo query
   - Added unlockSourceRepo query

5. **app/page.tsx**
   - Added Reset button to SettingsModal
   - Added confirmation dialog
   - Added resetRepository function
   - Updated state handling to support "reset" state
