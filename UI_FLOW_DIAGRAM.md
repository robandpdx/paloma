# UI Flow Diagram - Lock Source Repository Feature

## 1. Add Repository Modal

```
┌──────────────────────────────────────────────────────────────┐
│  Add New Repository                                      × │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Source Repository URL                                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ https://github.com/owner/repository                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  Enter the full URL of the GitHub repository               │
│                                                              │
│  Repository Name                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ repository-name                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│  Enter the name for the migrated repository                │
│                                                              │
│  ☐ Lock source repository                  <-- NEW          │
│  Lock the source repository during migration               │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                               [ Cancel ]  [ Add Repository ] │
└──────────────────────────────────────────────────────────────┘
```

## 2. Repository List with Settings Icon

```
┌──────────────────────────────────────────────────────────────────┐
│  Repositories                           [ Add Repository ]       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  my-repo-1                                                       │
│  https://github.com/owner/my-repo-1                              │
│                  [ Start Migration ]  [ Delete ]  [ ⚙️ ]         │
│                                                        ↑          │
│                                                   NEW: Settings   │
├──────────────────────────────────────────────────────────────────┤
│  my-repo-2                                                       │
│  https://github.com/owner/my-repo-2                              │
│                  [ In Progress... ]  [ Delete ]  [ ⚙️ ]          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 3. Settings Modal - Before Migration

```
┌──────────────────────────────────────────────────┐
│  Repository Settings                         × │
├──────────────────────────────────────────────────┤
│                                                  │
│  ☑ Lock source repository     <- Enabled        │
│  Lock the source repository during migration    │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ ✓ Setting saved          <- Auto-save      │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
└──────────────────────────────────────────────────┘
    (No Save/Cancel buttons - auto-saves)
```

## 4. Settings Modal - After Migration Started

```
┌──────────────────────────────────────────────────┐
│  Repository Settings                         × │
├──────────────────────────────────────────────────┤
│                                                  │
│  ☑ Lock source repository     <- DISABLED       │
│  This setting cannot be changed after            │
│  migration has started                           │
│                                                  │
└──────────────────────────────────────────────────┘
    (Checkbox shows locked-in state)
```

## User Interaction Flow

### Flow 1: Add New Repository with Lock Source
```
User clicks "Add Repository"
    ↓
Modal opens
    ↓
User enters repository URL and name
    ↓
User checks "Lock source repository" checkbox
    ↓
User clicks "Add Repository"
    ↓
Repository added to list with lockSource=true
```

### Flow 2: Modify Lock Source Before Migration
```
User clicks settings gear icon (⚙️)
    ↓
Settings modal opens
    ↓
User sees current lockSource state
    ↓
User toggles checkbox
    ↓
Setting saves immediately
    ↓
"✓ Setting saved" confirmation appears (2 seconds)
    ↓
User clicks outside modal to close
```

### Flow 3: View Lock Source After Migration Started
```
User clicks settings gear icon (⚙️)
    ↓
Settings modal opens
    ↓
User sees checkbox disabled
    ↓
User sees explanatory text
    ↓
User closes modal (no changes possible)
```

## State Transitions

```
┌─────────────┐
│   PENDING   │  lockSource can be changed
└──────┬──────┘
       │ Start Migration
       ↓
┌─────────────┐
│ IN_PROGRESS │  lockSource locked (read-only)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ COMPLETED/  │  lockSource locked (read-only)
│   FAILED    │
└─────────────┘
```

## Button Layout on Repository Row

```
Before:
[ Status Button ]  [ Delete ]

After:
[ Status Button ]  [ Delete ]  [ ⚙️ Settings ]
                                  ↑
                               New icon
```

## CSS Classes Added

```css
/* Checkbox styling */
.form-checkbox-wrapper   - Wrapper for checkbox and label
.form-checkbox          - Styled checkbox input
.form-checkbox-label    - Label text next to checkbox

/* Modal sizing */
.modal-settings         - Smaller modal for settings

/* Save confirmation */
.save-confirmation      - Green success message with fade-in
```

## Data Flow

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  React UI   │ ------→ │  GraphQL     │ ------→ │   Lambda     │
│  (page.tsx) │         │  (data/      │         │   Handler    │
│             │         │  resource)   │         │              │
└─────────────┘         └──────────────┘         └──────────────┘
                                                         │
                                                         ↓
                                                  ┌──────────────┐
                                                  │  GitHub API  │
                                                  │  (mutation)  │
                                                  └──────────────┘

lockSource value passed through:
UI state → GraphQL arguments → Lambda event.arguments → GitHub mutation variables
```

## Key Features Summary

✅ Checkbox in Add Repository modal
✅ Settings gear icon on each repository row
✅ Settings modal with auto-save
✅ Visual save confirmation
✅ Disabled state after migration starts
✅ Help text adapts to state
✅ No Save/Cancel buttons (immediate save)
✅ Modal dismissal by clicking outside or X
✅ Proper data flow through all layers
✅ Unit tests for new parameter
✅ Comprehensive documentation
