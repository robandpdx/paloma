# Repository Visibility Feature - UI Changes Summary

## Overview
This document describes the visual changes made to implement the Repository Visibility feature.

## Changed Components

### 1. Add New Repository Modal

**Before**: 3 fields (Source URL, Repository Name, Lock Source checkbox)
**After**: 4 fields (added Repository Visibility dropdown)

```
Visual Structure:
┌─────────────────────────────────────────────────────────────┐
│  Add New Repository                                     ×  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Source Repository URL                                      │
│  [_____________________________________________]             │
│  Enter the full URL of the GitHub repository...            │
│                                                             │
│  Repository Name                                            │
│  [_____________________________________________]             │
│  Enter the name for the migrated repository                │
│                                                             │
│  Repository Visibility                     ◄── NEW          │
│  [Private                               ▼]  ◄── NEW         │
│  Select the visibility for the migrated repository          │
│                                                             │
│  [☐] Lock source repository                                │
│  Lock the source repository during migration...            │
│                                                             │
│                          [Cancel]  [Add Repository]         │
└─────────────────────────────────────────────────────────────┘

Dropdown Options:
- Private (default)
- Public
- Internal
```

**Location in Code**: `app/page.tsx` lines 86-97

---

### 2. Repository Migration Details Modal

**Before**: Did not show repository visibility
**After**: Shows repository visibility between Failure Reason and Lock Source

```
Visual Structure:
┌─────────────────────────────────────────────────────────────┐
│  Repository Migration Details                           ×  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Repository Name:        my-awesome-repo                    │
│  Source URL:             https://github.com/org/repo        │
│  State:                  in_progress                        │
│  Destination Owner ID:   MDEyOk9yZ2FuaXphdGlvbjU2MTA=      │
│  Migration Source ID:    MS_kgDaACQxYm...                   │
│  Repository Migration ID: RM_kgDaACQxYm...                  │
│                                                             │
│  Repository Visibility:  private              ◄── NEW       │
│                                                             │
│  Lock source repository: True                               │
│                                                             │
│                                            [Close]          │
└─────────────────────────────────────────────────────────────┘

Display Logic:
- Shows the stored visibility value
- Defaults to "private" if not set
- Read-only (display only)
```

**Location in Code**: `app/page.tsx` lines 203-204

---

### 3. Repository Settings Modal

**Before**: Only showed Lock Source checkbox
**After**: Shows Repository Visibility dropdown above Lock Source

#### 3a. When Editable (state = 'pending' or 'reset')

```
Visual Structure:
┌─────────────────────────────────────────────────────────────┐
│  Repository Settings                                    ×  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Repository Visibility                     ◄── NEW          │
│  [Private                               ▼]  ◄── NEW         │
│  Select the visibility for the migrated repository          │
│                                                             │
│  [☑] Lock source repository                                │
│  Lock the source repository during migration...            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           ✓ Setting saved                            │ │
│  │  (Green background - appears for 2 seconds)          │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│                                              [Reset]        │
└─────────────────────────────────────────────────────────────┘

Behavior:
- Dropdown is enabled and changeable
- Changes auto-save immediately
- Success confirmation appears for 2 seconds
- User can change visibility before migration starts
```

#### 3b. When Locked (state = 'in_progress', 'completed', or 'failed')

```
Visual Structure:
┌─────────────────────────────────────────────────────────────┐
│  Repository Settings                                    ×  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Repository Visibility                                      │
│  [Private                               ▼]  ◄── DISABLED    │
│  This setting cannot be changed after migration             │
│  has started or been completed                              │
│                                                             │
│  [☑] Lock source repository         ◄── DISABLED           │
│  This setting cannot be changed after migration             │
│  has started                                                │
│                                                             │
│                                              [Reset]        │
└─────────────────────────────────────────────────────────────┘

Behavior:
- Dropdown is disabled (grayed out)
- Cannot be changed once migration starts
- Helpful text explains why it's disabled
- Prevents accidental changes to active migrations
```

**Location in Code**: `app/page.tsx` lines 248-264

---

## State-Based Editing Logic

### Visibility Dropdown Disabled States

The Repository Visibility dropdown uses `isSettingsEditable` constant:

```typescript
const isSettingsEditable = repository.state === 'pending' || repository.state === 'reset';
```

| Repository State | Visibility Dropdown | Lock Source Checkbox |
|-----------------|---------------------|---------------------|
| pending         | ✅ Editable         | ✅ Editable         |
| reset           | ✅ Editable         | ✅ Editable         |
| in_progress     | ❌ Disabled         | ❌ Disabled         |
| completed       | ❌ Disabled         | ❌ Disabled         |
| failed          | ❌ Disabled         | ❌ Disabled         |

**Reasoning**: Once a migration starts, the repository is being created with the specified visibility. Changing the setting mid-migration would be confusing and potentially cause issues.

---

## Auto-Save User Experience

### Flow for Changing Visibility in Settings Modal

1. User opens Settings modal (gear icon ⚙️)
2. User changes dropdown selection
3. `handleVisibilityChange` function fires immediately
4. Database update happens in background
5. Green "✓ Setting saved" confirmation appears
6. Confirmation fades after 2 seconds
7. No explicit "Save" button needed

This matches the existing auto-save pattern used for the Lock Source checkbox, providing a consistent user experience.

---

## CSS Classes Used

All components use existing CSS classes from `app/github.css`:

- `.form-label` - Label text styling
- `.form-input` - Applied to both input and select elements
- `.form-help` - Help text below inputs
- `.form-group` - Container for each form field
- `.save-confirmation` - Success message styling

The select dropdown automatically inherits proper styling from `.form-input` class without needing custom CSS.

---

## Validation Rules

### Dropdown Validation
- **Required**: Yes (in UI, field always has a value)
- **Default**: "private"
- **Allowed Values**: "private", "public", "internal"
- **Database**: Optional field (for backwards compatibility)

### Business Logic
1. New repositories default to "private"
2. Settings changes auto-save immediately
3. Reset operation reverts to "private"
4. Backend defaults to "private" if value missing
5. UI shows "private" if database value is null/undefined

---

## Accessibility

### ARIA and Semantic HTML
- Uses semantic `<select>` element for dropdown
- `<label>` elements properly associated with form controls
- Disabled state properly communicated via `disabled` attribute
- Help text provides context for all users
- Color coding (green for editable, gray for disabled) supplements, not replaces, explicit text indicators

### Keyboard Navigation
- Standard tab order through form fields
- Arrow keys work in dropdown
- Enter/Space to open dropdown
- Escape to close modal

---

## Browser Compatibility

The implementation uses standard HTML5 form elements:
- `<select>` dropdown - Supported in all modern browsers
- `<option>` elements - Universal support
- CSS styling uses CSS variables - Supported in all modern browsers
- No JavaScript framework dependencies beyond React

---

## Migration from Old to New UI

For existing users:
1. Existing repositories will show "private" as default
2. No action required - defaults work automatically
3. Can change visibility in Settings modal if repo is pending/reset
4. Visual feedback confirms all changes
5. No breaking changes to existing workflows
