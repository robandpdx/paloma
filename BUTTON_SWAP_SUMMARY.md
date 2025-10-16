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
- **Behavior**: Shows ResetConfirmationModal when clicked, then calls `resetRepository(repo)` on confirm
- **Disabled State**: Disabled when repository state is 'pending' or 'reset'
- **Accessibility**: Includes title and aria-label attributes with descriptive text
- **Confirmation Modal**: Shows a confirmation dialog explaining what will be reset before executing

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

### Reset Button Behavior
The Reset button maintains its confirmation behavior:
- **Confirmation Required**: Shows ResetConfirmationModal with details about what will be reset
- **Modal Content**: Explains that it will delete target repo, unlock source repo if locked, clear migration IDs, reset state, set visibility to private, and clear lock source setting
- **User Action**: User must click "Reset" button in the modal to confirm

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
