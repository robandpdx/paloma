# Bug Fixes: Repository Visibility State Management

## Issues Identified

### Issue 1: Repository Visibility not reflected in Settings Modal
**Problem**: When opening the Repository Settings modal, the dropdown did not show the current repository visibility value. It always defaulted to "private" regardless of what was previously set.

**Root Cause**: The SettingsModal component used `useState` to initialize local state from the `repository` prop:
```typescript
const [repositoryVisibility, setRepositoryVisibility] = useState(repository.repositoryVisibility || 'private');
```

However, `useState` only initializes once when the component mounts. When the repository data changed (due to database updates from observeQuery), the local state did not update to reflect the new values.

**Fix**: Added a `useEffect` hook to synchronize local state with the repository prop:
```typescript
useEffect(() => {
  setLockSource(repository.lockSource || false);
  setRepositoryVisibility(repository.repositoryVisibility || 'private');
}, [repository.lockSource, repository.repositoryVisibility]);
```

This ensures that whenever the repository prop changes, the local state updates accordingly.

### Issue 2: SettingsRepo not updating with database changes
**Problem**: Even with the SettingsModal fix above, the repository object passed to the modal (`settingsRepo`) was not being updated when the database changed.

**Root Cause**: The data flow was:
1. User changes visibility in Settings modal
2. `updateRepositorySettings()` updates the database
3. `observeQuery()` subscription triggers and updates `repositories` array
4. But `settingsRepo` state still holds the old repository object
5. SettingsModal receives stale data through the `repository` prop

**Fix**: Added a `useEffect` in the main App component to keep `settingsRepo` synchronized:
```typescript
useEffect(() => {
  if (settingsRepo) {
    const updatedRepo = repositories.find(r => r.id === settingsRepo.id);
    if (updatedRepo) {
      setSettingsRepo(updatedRepo);
    }
  }
}, [repositories, settingsRepo]);
```

This ensures that when the `repositories` array updates (via observeQuery), the `settingsRepo` state is also updated with the latest data.

### Issue 3: Repository always migrated as private (Potential)
**Status**: Root cause not yet confirmed - added debugging to diagnose

**Potential Causes**:
1. Database not saving the visibility value correctly
2. Database not retrieving the visibility value correctly  
3. Value being lost during the GraphQL API call
4. Backend handler not using the value correctly

**Debugging Added**: Added console.log statement in `startMigration`:
```typescript
console.log('Starting migration for repository:', {
  id: repo.id,
  name: repo.repositoryName,
  visibility: repo.repositoryVisibility,
  lockSource: repo.lockSource
});
```

This will help identify at which point the visibility value is lost or incorrect.

## Data Flow

### Before Fixes
```
User changes visibility in modal
  ↓
onUpdate() called → updateRepositorySettings()
  ↓
Database updated
  ↓
observeQuery() triggers → repositories array updated
  ↓
❌ settingsRepo NOT updated → modal shows stale data
  ↓
❌ Modal's local state NOT updated → dropdown shows wrong value
```

### After Fixes
```
User changes visibility in modal
  ↓
onUpdate() called → updateRepositorySettings()
  ↓
Database updated
  ↓
observeQuery() triggers → repositories array updated
  ↓
✅ settingsRepo updated (via useEffect)
  ↓
✅ Modal's local state updated (via useEffect)
  ↓
✅ Dropdown shows correct value
```

## Testing Instructions

To verify the fixes:

1. **Test Settings Modal State Sync**:
   - Add a new repository with visibility set to "public"
   - Open the Settings modal (gear icon)
   - Verify dropdown shows "public" (not "private")
   - Change to "internal"
   - Close and reopen the Settings modal
   - Verify dropdown now shows "internal"

2. **Test Migration with Custom Visibility**:
   - Add a repository with visibility set to "public"
   - Open browser console (F12)
   - Click "Start Migration"
   - Check console for log message showing repository details
   - Verify `visibility: "public"` is shown in the log
   - After migration completes, check the target repository on GitHub
   - Verify the repository has public visibility

3. **Test Reset Behavior**:
   - Create a repository with visibility "public"
   - Start migration
   - Reset the repository
   - Open Settings modal
   - Verify visibility has been reset to "private"

## Commits

1. **cd676cf** - Fix: Sync SettingsModal state with repository prop changes and add debugging
   - Added useEffect to SettingsModal
   - Added console.log debugging

2. **0a2b9a2** - Fix: Keep settingsRepo in sync with repositories array updates
   - Added useEffect to App component
   - Ensures settingsRepo stays synchronized with database changes

## Related Files

- `app/page.tsx` - All fixes applied here
  - SettingsModal component (lines 237-264)
  - App component useEffect (lines 443-451)
  - startMigration function (lines 515-541)

## Future Improvements

If the visibility issue persists after these fixes, consider:

1. Add more comprehensive logging throughout the data flow
2. Verify the Amplify Data schema is correctly generated
3. Check if there are any TypeScript type mismatches
4. Verify the GraphQL query is correctly formed
5. Check the backend Lambda function logs for the received parameters
