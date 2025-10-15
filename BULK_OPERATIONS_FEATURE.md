# Bulk Operations Feature Implementation

## Overview
This feature adds bulk operations capabilities to the repository migration tool, allowing users to efficiently manage multiple repository migrations at once.

## New Features

### 1. CSV Bulk Import
- **Button**: "Load CSV File" button in the repository list header
- **Format**: 
  ```csv
  source_repo_url,repo_visibility,lock_source_repo
  https://github.com/mindfulrob/java-private-library,private,false
  https://github.com/mindfulrob/java-private-library,internal,true
  https://github.com/mindfulrob/superbigmono,public,true
  ```
- **Behavior**: 
  - Parses CSV file and creates multiple repository entries
  - Automatically extracts repository name from URL
  - Supports optional header row
  - Creates all repositories in 'pending' state

### 2. Repository Selection
- **Select All Checkbox**: In table header, selects/deselects all repositories
- **Individual Checkboxes**: Each row has a checkbox for individual selection
- **Location**: Checkboxes are placed at the left side of each row (standard table pattern)

### 3. Bulk Actions

#### Start Selected
- **Purpose**: Start multiple migrations simultaneously
- **Button**: "Start selected" (green/primary button)
- **Behavior**: 
  - Only acts on repositories in `pending` or `reset` state
  - Disabled when no valid repositories are selected
  - Shows tooltip explaining why button is disabled

#### Reset Selected
- **Purpose**: Reset multiple migrations simultaneously
- **Button**: "Reset selected" (red/danger button)
- **Behavior**: 
  - Only acts on repositories NOT in `pending` or `reset` state
  - Disabled when no valid repositories are selected
  - Shows tooltip explaining why button is disabled

#### Bulk Settings Update
- **Purpose**: Update settings for multiple repositories at once
- **Button**: Settings gear icon (⚙️)
- **Behavior**: 
  - Only acts on repositories in `pending` or `reset` state
  - Opens modal with Lock source repository and Repository Visibility options
  - Shows count of selected repositories in modal
  - Has Save and Cancel buttons
  - Disabled when no valid repositories are selected

## UI Changes

### Header Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│ Repositories                                                         │
│ [Load CSV File] [Start selected] [Reset selected] [⚙️] [Add Repository] │
└─────────────────────────────────────────────────────────────────────┘
```

### Table Structure
```
┌───┬──────────────────────────────────────┬─────────────────────┐
│ ☐ │ Repository                           │ Actions             │
├───┼──────────────────────────────────────┼─────────────────────┤
│ ☐ │ repo-name                           │ [Start] [Delete] [⚙️]│
│   │ https://github.com/owner/repo       │                     │
├───┼──────────────────────────────────────┼─────────────────────┤
│ ☑ │ another-repo                        │ [Start] [Delete] [⚙️]│
│   │ https://github.com/owner/another    │                     │
└───┴──────────────────────────────────────┴─────────────────────┘
```

## State-Based Logic

### State Definitions
- **pending**: Repository added but migration not started
- **reset**: Repository was reset to initial state
- **in_progress**: Migration is currently running
- **completed**: Migration finished successfully
- **failed**: Migration failed with error

### Operation Rules
1. **Start Selected**: Only starts repos in `pending` or `reset` state
2. **Reset Selected**: Only resets repos in `in_progress`, `completed`, or `failed` state
3. **Bulk Settings**: Only updates repos in `pending` or `reset` state

## Files Modified

### app/page.tsx
- Added `BulkSettingsModal` component (lines 23-87)
- Added state for selected repositories and bulk settings modal
- Added CSV parsing function `handleCSVUpload` (lines 753-790)
- Added selection handlers: `handleSelectAll`, `handleSelectRepo` (lines 792-808)
- Added bulk operation handlers: `handleStartSelected`, `handleResetSelected`, `handleBulkSettingsUpdate` (lines 810-838)
- Added button enable/disable logic: `canStartSelected`, `canResetSelected`, `canUpdateSettings` (lines 840-853)
- Updated UI with new buttons and checkboxes (lines 870-975)

### app/github.css
- Added `.repository-list-actions` for button group styling
- Added `.repository-table-header` for table header row
- Added `.repository-checkbox-cell` for checkbox column
- Added `.repository-info-header` and `.repository-actions-header` for column headers
- Updated `.repository-item` to work with new layout

## User Experience

### Bulk Operation Workflow
1. User selects one or more repositories using checkboxes
2. User clicks one of the bulk action buttons
3. System:
   - Filters selected repositories based on state requirements
   - Performs operation on each valid repository
   - Updates UI to reflect changes

### CSV Import Workflow
1. User clicks "Load CSV File" button
2. File picker opens
3. User selects CSV file
4. System:
   - Parses CSV file
   - Extracts repository information
   - Creates database entries for each repository
   - Repositories appear in the list immediately

## Accessibility
- All checkboxes have appropriate `aria-label` attributes
- Buttons have descriptive `title` attributes for tooltips
- Disabled states are clearly indicated visually and via attributes
- Modal dialogs follow accessible patterns with proper focus management

## Error Handling
- CSV parsing handles malformed lines gracefully (skips invalid entries)
- Button disabled states prevent invalid operations
- State filtering ensures operations only affect appropriate repositories
- Existing error handling for individual operations is maintained

## Future Enhancements
- Progress indication for bulk operations
- Ability to cancel in-progress bulk operations
- Export current repository list to CSV
- Batch size limits for very large CSV imports
- Undo capability for bulk operations
