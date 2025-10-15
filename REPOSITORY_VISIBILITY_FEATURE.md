# Repository Visibility Feature

## Overview
This feature adds the ability to specify repository visibility (private, public, or internal) when migrating repositories from GitHub.com to GitHub Enterprise Cloud.

## Implementation Summary

### 1. Database Model Changes
**File**: `amplify/data/resource.ts`

Added `repositoryVisibility` field to the RepositoryMigration model as an optional field:
```typescript
repositoryVisibility: a.string(), // Optional: 'private', 'public', or 'internal'
```

The field is optional to maintain backwards compatibility with existing records.

### 2. UI Changes

#### A. Add New Repository Modal
**File**: `app/page.tsx` - `AddRepoModal` component

**Changes**:
- Added new state variable: `repositoryVisibility` (defaults to "private")
- Added visibility dropdown between "Repository Name" and "Lock source repository" sections
- Updated `onAdd` callback to accept visibility parameter

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Add New Repository                                     ×  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Source Repository URL                                      │
│  [https://github.com/owner/repository________________]      │
│  Enter the full URL of the GitHub repository...            │
│                                                             │
│  Repository Name                                            │
│  [repository-name___________________________]               │
│  Enter the name for the migrated repository                │
│                                                             │
│  Repository Visibility                     ◄── NEW          │
│  [Private             ▼]                   ◄── NEW          │
│  Select the visibility for the migrated repository          │
│                                                             │
│  [☐] Lock source repository                                │
│  Lock the source repository during migration...            │
│                                                             │
│                          [Cancel]  [Add Repository]         │
└─────────────────────────────────────────────────────────────┘
```

**Dropdown Options**:
- Private (default)
- Public
- Internal

#### B. Repository Migration Details Modal
**File**: `app/page.tsx` - `InfoModal` component

**Changes**:
- Added display of `Repository Visibility` field between "Failure Reason" and "Lock source repository"
- Shows the visibility value or defaults to 'private' if not set

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Repository Migration Details                           ×  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Repository Name:        my-awesome-repo                    │
│  Source URL:             https://github.com/...             │
│  State:                  in_progress                        │
│  Destination Owner ID:   MDEyOk9yZ2FuaXphdGlvbjU2MTA=      │
│  Migration Source ID:    MS_kgDaACQxYm...                   │
│  Repository Migration ID: RM_kgDaACQxYm...                  │
│  Repository Visibility:  private              ◄── NEW       │
│  Lock source repository: True                               │
│                                                             │
│                                            [Close]          │
└─────────────────────────────────────────────────────────────┘
```

#### C. Repository Settings Modal
**File**: `app/page.tsx` - `SettingsModal` component

**Changes**:
- Added state variable: `repositoryVisibility`
- Added `isSettingsEditable` boolean (true when state is 'pending' or 'reset')
- Added visibility dropdown as first field in the modal body
- Dropdown is disabled when migration has started or completed
- Updated `onUpdate` callback to accept both lockSource and repositoryVisibility

**Visual Layout - EDITABLE STATE (pending/reset)**:
```
┌─────────────────────────────────────────────────────────────┐
│  Repository Settings                                    ×  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Repository Visibility                     ◄── NEW          │
│  [Private             ▼]                   ◄── NEW          │
│  Select the visibility for the migrated repository          │
│                                                             │
│  [☑] Lock source repository                                │
│  Lock the source repository during migration...            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           ✓ Setting saved                            │ │
│  │  (Appears for 2 seconds after any change)            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│                                              [Reset]        │
└─────────────────────────────────────────────────────────────┘
```

**Visual Layout - LOCKED STATE (in_progress/completed/failed)**:
```
┌─────────────────────────────────────────────────────────────┐
│  Repository Settings                                    ×  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Repository Visibility                                      │
│  [Private             ▼] ◄── DISABLED (grayed out)          │
│  This setting cannot be changed after migration             │
│  has started or been completed                              │
│                                                             │
│  [☑] Lock source repository  ◄── DISABLED                  │
│  This setting cannot be changed after migration             │
│  has started                                                │
│                                                             │
│                                              [Reset]        │
└─────────────────────────────────────────────────────────────┘
```

### 3. Backend Integration

#### A. Data Operations
**Functions affected**:
- `addRepository`: Now accepts and saves `repositoryVisibility`
- `updateRepositorySettings`: Now updates both `lockSource` and `repositoryVisibility`
- `resetRepository`: Resets visibility to 'private' when resetting a repository
- `startMigration`: Passes `repositoryVisibility` to the backend Lambda function

#### B. Lambda Function
**File**: `amplify/functions/start-migration/handler.ts`

**No changes needed** - The handler already accepts and uses the `targetRepoVisibility` parameter from the GraphQL schema. It defaults to 'private' if not specified.

### 4. Business Logic

#### Visibility Options
1. **Private**: Only accessible to organization members with access
2. **Public**: Publicly visible to anyone
3. **Internal**: Visible to all organization members (Enterprise only)

#### Edit Permissions
- **Editable**: When repository state is 'pending' or 'reset'
- **Locked**: When repository state is 'in_progress', 'completed', or 'failed'

This aligns with the existing pattern for the `lockSource` setting, ensuring consistency in the UI behavior.

#### Default Values
- New repositories default to 'private' visibility
- Reset repositories revert to 'private' visibility
- If visibility is not specified, the backend defaults to 'private'

### 5. Auto-Save Pattern
The Settings modal follows the existing auto-save pattern:
1. User changes visibility dropdown
2. `handleVisibilityChange` is called immediately
3. Database is updated via `onUpdate` callback
4. Success confirmation appears for 2 seconds
5. No explicit "Save" button required

This matches the existing UX pattern for the `lockSource` checkbox.

## Testing Notes

### Manual Testing Checklist
- [ ] Add new repository with each visibility option (private, public, internal)
- [ ] Verify visibility is saved correctly in database
- [ ] Start migration and verify visibility is passed to backend
- [ ] Verify visibility is displayed correctly in Details modal
- [ ] Open Settings modal before migration - verify dropdown is enabled
- [ ] Change visibility in Settings modal - verify auto-save works
- [ ] Start migration
- [ ] Open Settings modal after migration starts - verify dropdown is disabled
- [ ] Complete migration
- [ ] Open Settings modal after completion - verify dropdown remains disabled
- [ ] Reset repository
- [ ] Open Settings modal after reset - verify dropdown is enabled again
- [ ] Verify target repository is created with correct visibility

### Integration Testing
The start-migration Lambda function already handles the `targetRepoVisibility` parameter correctly:
- Accepts values: 'private', 'public', 'internal'
- Defaults to 'private' if not specified
- Passes value to GitHub API's `startRepositoryMigration` mutation

## Files Modified

1. `amplify/data/resource.ts` - Added repositoryVisibility field to model
2. `app/page.tsx` - Updated all modal components and data operations

## Backwards Compatibility

- Existing repositories without a visibility value will default to 'private'
- The field is optional in the database model
- The UI gracefully handles missing values by defaulting to 'private'

## Future Enhancements

Potential improvements for future iterations:
1. Add visibility validation based on organization type (e.g., 'internal' only for Enterprise)
2. Add tooltips explaining each visibility option
3. Add warning when changing from private to public
4. Add visibility filter in repository list
5. Bulk edit visibility for multiple repositories
