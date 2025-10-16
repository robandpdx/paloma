# Lock Source Repository Feature

## Overview
This feature allows users to lock the source repository during migration to prevent any modifications while the migration is in progress. This ensures data integrity and prevents potential conflicts during the migration process.

## User Experience Flow

### 1. Adding a Repository with Lock Source Option

When adding a new repository via the "Add Repository" modal:

**Location**: Click "Add Repository" button → Modal appears

**New UI Element**: 
- A checkbox labeled "Lock source repository" appears below the Repository Name field
- Help text: "Lock the source repository during migration to prevent modifications"
- Default state: Unchecked

**Behavior**:
- User can check the box to enable source repository locking
- When "Add Repository" is clicked, the `lockSource` value is saved with the repository record

### 2. Managing Lock Source Setting via Settings Modal

After a repository is added, users can manage the lock source setting:

**Location**: Repository row → Settings gear icon (⚙️) to the right of delete button

**Settings Modal Components**:
- **Title**: "Repository Settings"
- **Close button**: X in top-right corner
- **Checkbox**: "Lock source repository"
  - Shows current state of `lockSource` setting
  - Help text adapts based on migration state:
    - Before migration: "Lock the source repository during migration to prevent modifications"
    - After migration started: "This setting cannot be changed after migration has started"
- **Save confirmation**: Auto-appears for 2 seconds after any change
  - Message: "✓ Setting saved"
  - Styled with green background and success color

**Behavior**:
- **Before Migration Starts** (state = 'pending'):
  - Checkbox is enabled and can be toggled
  - Changes save immediately on checkbox change
  - Save confirmation appears for 2 seconds
  - No Save/Cancel buttons needed

- **After Migration Starts** (state != 'pending'):
  - Checkbox is disabled (read-only)
  - Shows the locked-in value but cannot be changed
  - Help text indicates setting cannot be changed

- **Modal Closing**:
  - Click outside the modal
  - Click the X button in top-right corner
  - No confirmation needed as changes are auto-saved

### 3. Backend Integration

**Data Flow**:
1. UI → GraphQL mutation → Lambda handler → GitHub API
2. `lockSource` value is passed through all layers
3. GitHub's `startRepositoryMigration` mutation includes `lockSource: true/false/undefined`

**Database Schema**:
- Field: `lockSource` (boolean, optional)
- Stored in `RepositoryMigration` model
- Defaults to `false` if not specified

**API Parameters**:
```typescript
// GraphQL Query
startMigration({
  sourceRepositoryUrl: string,
  repositoryName: string,
  targetRepoVisibility: 'private' | 'public' | 'internal',
  continueOnError: boolean,
  lockSource: boolean  // New parameter
})
```

## Technical Implementation Details

### Files Modified

1. **amplify/data/resource.ts**
   - Added `lockSource: a.boolean()` to RepositoryMigration model
   - Added `lockSource: a.boolean()` to startMigration query arguments

2. **amplify/functions/start-migration/handler.ts**
   - Updated `MigrationArguments` interface to include `lockSource?: boolean`
   - Modified `startRepositoryMigration` function to accept and pass `lockSource`
   - Updated GraphQL mutation to include `lockSource` parameter
   - Updated JSDoc documentation

3. **amplify/functions/start-migration/handler.test.ts**
   - Added test cases for `lockSource` parameter
   - Updated mock event structure

4. **app/page.tsx**
   - Updated `AddRepoModal` to include lockSource checkbox
   - Created new `SettingsModal` component
   - Added `settingsRepo` state variable
   - Created `updateRepositorySettings` function
   - Updated `addRepository` to accept and store lockSource
   - Updated `startMigration` to pass lockSource to API
   - Added settings gear icon to repository actions

5. **app/github.css**
   - Added `.form-checkbox-wrapper` styles
   - Added `.form-checkbox` styles
   - Added `.form-checkbox-label` styles
   - Added `.modal-settings` sizing
   - Added `.save-confirmation` styles with fade-in animation

### Component Structure

```
SettingsModal
├── Modal Overlay (dismisses on click)
├── Modal Container
│   ├── Header
│   │   ├── Title: "Repository Settings"
│   │   └── Close Button (×)
│   ├── Body
│   │   ├── Checkbox Group
│   │   │   ├── Checkbox Input (disabled if migration started)
│   │   │   └── Label: "Lock source repository"
│   │   ├── Help Text (dynamic based on state)
│   │   └── Save Confirmation (conditional, 2s timeout)
```

### State Management

**Component State**:
- `lockSource` - Local state for checkbox value
- `showSaveConfirmation` - Controls visibility of save message
- `isMigrationStarted` - Computed from repository.state

**Save Flow**:
```
User toggles checkbox
  ↓
handleCheckboxChange called
  ↓
Update local state
  ↓
Call onUpdate (parent callback)
  ↓
Update database via Amplify Data
  ↓
Show confirmation (2 seconds)
  ↓
Auto-hide confirmation
```

## UI/UX Design Decisions

### Auto-Save Pattern
- **Why**: Simplifies UX, reduces clicks, provides immediate feedback
- **How**: onChange event triggers immediate save
- **Confirmation**: Visual feedback for 2 seconds ensures user knows save succeeded

### Disabled After Migration
- **Why**: Prevents inconsistency - can't change migration parameters mid-flight
- **How**: Checkbox disabled based on `state !== 'pending'`
- **UX**: Help text explains why it's disabled

### Settings Icon Placement
- **Why**: Conventional placement between action and destructive buttons
- **Icon**: ⚙️ (gear) - universally recognized settings symbol
- **Size**: Matches other buttons in the action row

### Modal Dismissal
- **Options**: Click outside, click X
- **No Save/Cancel**: Not needed because of auto-save
- **Immediate**: No confirmation needed on close

## Testing Checklist

### Manual UI Testing
- [ ] Add repository with lockSource checked
- [ ] Add repository with lockSource unchecked
- [ ] Open settings modal for pending repository
- [ ] Toggle lockSource in settings (verify save confirmation)
- [ ] Start migration
- [ ] Open settings modal for in-progress migration (verify disabled)
- [ ] Verify lockSource value persists across page refreshes
- [ ] Test modal dismissal (outside click and X button)

### Backend Testing
- [ ] Verify lockSource parameter passed to Lambda
- [ ] Verify lockSource included in GraphQL mutation
- [ ] Run unit tests: `npm test`
- [ ] Verify GitHub API receives lockSource parameter

### Integration Testing
- [ ] End-to-end flow with actual GitHub repository
- [ ] Verify source repository is actually locked when lockSource=true
- [ ] Verify migration completes successfully with lockSource enabled

## Known Limitations

1. **GitHub API Support**: Requires GitHub Enterprise Importer with lockSource support
2. **One-Way Change**: Once migration starts, lockSource cannot be changed
3. **No Validation**: System doesn't verify if user has permission to lock repository

## Future Enhancements

1. **Validation**: Check if user token has permission to lock repository before starting
2. **Unlock Option**: Add ability to manually unlock after migration completes
3. **Lock Status Display**: Show if repository is currently locked in UI
4. **Bulk Settings**: Allow changing lockSource for multiple repositories at once
