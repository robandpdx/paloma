# Visual Layout Changes

## BEFORE the change:

```
┌─────────────────────────────────────────────────────────────┐
│                    MAIN PAGE                                 │
│  Repository List:                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ☑ Repository Name                                   │   │
│  │     source-url.com/repo                              │   │
│  │                                                       │   │
│  │     [Start Migration]  [DELETE]  [⚙️ Settings]       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

When clicking [⚙️ Settings]:

┌─────────────────────────────────────────────────────────────┐
│  Repository Settings                                    [×]  │
│─────────────────────────────────────────────────────────────│
│                                                              │
│  Repository Visibility:  [Private ▾]                        │
│                                                              │
│  ☐ Lock source repository                                   │
│                                                              │
│─────────────────────────────────────────────────────────────│
│                                          [RESET]             │
└─────────────────────────────────────────────────────────────┘
```

## AFTER the change:

```
┌─────────────────────────────────────────────────────────────┐
│                    MAIN PAGE                                 │
│  Repository List:                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ☑ Repository Name                                   │   │
│  │     source-url.com/repo                              │   │
│  │                                                       │   │
│  │     [Start Migration]  [RESET]  [⚙️ Settings]        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

When clicking [⚙️ Settings]:

┌─────────────────────────────────────────────────────────────┐
│  Repository Settings                                    [×]  │
│─────────────────────────────────────────────────────────────│
│                                                              │
│  Repository Visibility:  [Private ▾]                        │
│                                                              │
│  ☐ Lock source repository                                   │
│                                                              │
│─────────────────────────────────────────────────────────────│
│                                         [DELETE]             │
└─────────────────────────────────────────────────────────────┘
```

## Summary of Changes

### Main Page - Repository Actions Row
- **Removed**: DELETE button (red danger button)
- **Added**: RESET button (red danger button, disabled when state is 'pending' or 'reset')

### Settings Modal - Footer
- **Removed**: RESET button (red danger button, was disabled when state is 'pending' or 'reset')
- **Added**: DELETE button (red danger button, shows confirmation modal)

## Behavioral Notes

### Reset Button (Now on Main Page)
- **Disabled State**: Cannot reset repositories in 'pending' or 'reset' state
- **Tooltip**: Shows explanatory message when disabled
- **Action**: Directly executes reset operation (no confirmation modal)
- **What it does**:
  - Deletes target repository if it exists
  - Unlocks source repository if it was locked
  - Clears migration IDs
  - Resets the migration state
  - Sets repository visibility to private
  - Clears lock source repository setting

### Delete Button (Now in Settings Modal)
- **Confirmation Required**: Shows DeleteModal that requires typing the repository URL
- **Always Enabled**: Can delete any repository
- **Action**: Shows confirmation modal, then deletes repository record from database
- **More Protected**: Requires opening Settings modal first, then confirming with URL

## UX Rationale

1. **Reset is more common**: Users need to reset repositories more frequently than delete them, so it's more accessible on the main page
2. **Delete is more dangerous**: Deletion is permanent, so it's now behind an extra step (Settings modal) for safety
3. **Consistent with action patterns**: Other immediate actions (Start Migration) are on main page, while settings/configuration changes are in modals
4. **Clear visual hierarchy**: 
   - Main page = quick actions
   - Settings modal = configuration and dangerous operations
