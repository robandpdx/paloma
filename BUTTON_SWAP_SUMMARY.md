# Button Position Swap Summary

## Changes Made

This document summarizes the changes made to swap the positions of the Reset and Delete buttons as requested in the issue.

### Before

**Repository Actions (Main Page)**:
- Start Migration / In Progress / Completed / Failed button
- **Delete** button (red)
- Settings button (gear icon)

**Repository Settings Modal**:
- Settings form fields (Repository Visibility, Lock source repository)
- **Reset** button (red, in footer)

### After

**Repository Actions (Main Page)**:
- Start Migration / In Progress / Completed / Failed button
- **Reset** button (red, moved from Settings modal)
- Settings button (gear icon)

**Repository Settings Modal**:
- Settings form fields (Repository Visibility, Lock source repository)
- **Delete** button (red, moved from main page)

## Implementation Details

### 1. Reset Button (Moved to Main Page)
- **Location**: Now in repository actions area on the main page
- **Behavior**: Directly calls `resetRepository(repo)` when clicked
- **Disabled State**: Disabled when repository state is 'pending' or 'reset'
- **Accessibility**: Includes title and aria-label attributes with descriptive text
- **No Confirmation Modal**: The reset button on the main page directly executes the reset operation (previously it showed a confirmation modal when in the Settings modal)

### 2. Delete Button (Moved to Settings Modal)
- **Location**: Now in the footer of the Repository Settings modal
- **Behavior**: Shows the DeleteModal confirmation dialog when clicked
- **Confirmation Flow**: Maintained - user must type the repository URL to confirm deletion
- **Accessibility**: Includes title and aria-label attributes

### 3. Code Cleanup
- Removed unused `deleteRepo` state variable
- Removed standalone DeleteModal rendering from main component (now only shown from within SettingsModal)
- Updated `SettingsModalProps` interface to use `onDelete` instead of `onReset`
- Updated modal state from `showResetConfirmation` to `showDeleteConfirmation`
- Removed `isResetDisabled` constant (logic moved to main page button)

## Technical Notes

### Reset Button Behavior Change
The Reset button behavior has changed slightly:
- **Previously**: In Settings modal, clicking Reset showed a confirmation modal with details about what would be reset
- **Now**: On main page, clicking Reset directly executes the reset operation without a confirmation modal

This change aligns the Reset button with the existing pattern of other action buttons on the main page (like Start Migration), which execute immediately without confirmation modals.

### Delete Button Behavior
The Delete button maintains its original behavior:
- Still requires confirmation via typing the repository URL
- Still shows a modal dialog before deletion
- The DeleteModal component is reused within the Settings modal context

## User Experience Impact

### Improved Workflow
1. **Quick Reset Access**: Users can now reset repositories directly from the main page without opening the Settings modal
2. **Safer Delete**: Delete is now in the Settings modal, reducing accidental deletions
3. **Consistent Pattern**: The danger actions (Reset and Delete) follow a clearer hierarchy:
   - Reset: More common action, available on main page
   - Delete: More destructive action, requires extra step (open Settings first)

### Button States
- **Reset Button**: Disabled for repositories in 'pending' or 'reset' state (cannot reset what hasn't been migrated)
- **Delete Button**: Always enabled in the Settings modal (can delete any repository)

## Files Modified

- `app/page.tsx`: Main application file with all UI components and logic
  - SettingsModal component updated
  - Repository actions area updated
  - State management simplified
