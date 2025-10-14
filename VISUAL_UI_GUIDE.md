# Visual UI Guide - Lock Source Repository Feature

## UI Screenshots Description

Since the app requires AWS Amplify backend to run, here's a detailed description of what the UI looks like:

## 1. Add Repository Modal - WITH Lock Source Checkbox

### Visual Description
```
The modal appears centered on screen with a semi-transparent dark overlay.

Modal Header:
- Title "Add New Repository" on the left
- Close button (×) on the right
- Bottom border separating header from body

Modal Body has three sections:

1. SOURCE REPOSITORY URL
   [Text input box spanning full width]
   Small gray help text below: "Enter the full URL of the GitHub repository you want to migrate"

2. REPOSITORY NAME  
   [Text input box spanning full width]
   Small gray help text below: "Enter the name for the migrated repository"

3. LOCK SOURCE REPOSITORY (NEW!)
   [☐] Lock source repository
   Small gray help text below: "Lock the source repository during migration to prevent modifications"

Modal Footer:
   [Cancel button - gray]  [Add Repository button - green]
```

### Changes from Original
- **NEW**: Third section with checkbox for "Lock source repository"
- Checkbox is standard HTML checkbox with browser accent color
- Checkbox has hover cursor pointer
- Label text is clickable

## 2. Repository List - WITH Settings Gear Icon

### Visual Description
```
Repository List Card:
┌─────────────────────────────────────────────────────────────┐
│ Repositories                          [Add Repository]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ my-awesome-repo                                             │
│ https://github.com/myorg/my-awesome-repo                    │
│           [Start Migration]  [Delete]  [⚙️]                 │
│                                          ↑                  │
│                                      NEW ICON               │
└─────────────────────────────────────────────────────────────┘
```

### Button Layout Details
- **Status Button**: Green "Start Migration" (or colored based on state)
  - Width: auto, padding for text
  - Font: 12px
  
- **Settings Button (NEW)**: Gear emoji ⚙️
  - Style: btn-default (gray background)
  - Size: btn-sm btn-icon (smaller with icon padding)
  - Hover: Slightly darker gray
  
- **Delete Button**: Red background
  - Text: "Delete"
  - Size: btn-sm

## 3. Settings Modal - BEFORE Migration Starts

### Visual Description
```
Smaller modal (max-width: 480px vs 600px for other modals)

┌─────────────────────────────────────────────────────┐
│  Repository Settings                            ×  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [☑] Lock source repository                        │
│                                                     │
│  Lock the source repository during migration       │
│  to prevent modifications                           │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │                                               │ │
│  │      ✓ Setting saved                         │ │
│  │                                               │ │
│  │  (Green background, success color text)      │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘

(No footer buttons - auto-saves)
```

### Key Visual Features
- **Checkbox**: Enabled, can be clicked
- **Help text**: Gray, normal weight
- **Save confirmation**: 
  - Light green background (#dafbe1)
  - Green border (#2da44e)
  - Centered text
  - Appears with smooth fade-in animation
  - Disappears after 2 seconds

## 4. Settings Modal - AFTER Migration Starts

### Visual Description
```
Same layout as above, but:

┌─────────────────────────────────────────────────────┐
│  Repository Settings                            ×  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [☑] Lock source repository                        │
│      ↑                                              │
│   GRAYED OUT, NOT CLICKABLE                         │
│                                                     │
│  This setting cannot be changed after               │
│  migration has started                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Key Visual Features
- **Checkbox**: Checked but disabled (grayed out)
- **Label**: Normal color (not grayed)
- **Help text**: Different message explaining it's locked
- **No save confirmation**: Cannot be changed

## 5. Color Scheme (GitHub-like)

### Buttons
- **Primary (Green)**: #1f883d
  - Hover: #1a7f37
  - Used for: Add Repository, Start Migration, Completed status

- **Default (Gray)**: #f6f8fa
  - Hover: #f3f4f6
  - Border: rgba(31, 35, 40, 0.15)
  - Used for: Cancel, Settings gear icon

- **Danger (Red)**: #d1242f
  - Hover: #b62324
  - Used for: Delete button, Failed status

- **Info (Blue)**: #0969da
  - Hover: #0860ca
  - Used for: In Progress status (with pulsing animation)

### Text Colors
- **Default**: #1f2328
- **Muted**: #656d76
- **Link/Accent**: #0969da
- **Success**: #1a7f37
- **Danger**: #d1242f

### Background Colors
- **Canvas**: #ffffff
- **Subtle**: #f6f8fa
- **Modal overlay**: rgba(31, 35, 40, 0.5)

## 6. Animations

### Pulsing (In Progress status)
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```
- Duration: 2 seconds
- Infinite loop
- Applied to blue "In Progress" button

### Fade In (Save confirmation)
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```
- Duration: 0.3 seconds
- Ease-in timing
- Slides down while fading in

## 7. Responsive Behavior

### Modal Sizing
- Max width: 600px (standard), 480px (settings)
- Width: 90% on smaller screens
- Max height: 90vh with scroll if needed

### Font Sizes
- Title: 18px
- Body text: 14px
- Help text: 12px
- Button text: 14px (normal), 12px (small)

## 8. Accessibility Features

### Keyboard Navigation
- Tab order: URL → Name → Checkbox → Cancel → Add
- Enter submits form
- Escape closes modal (when implemented)

### Screen Reader Support
- Labels properly associated with inputs
- Help text linked via aria-describedby
- Button states clearly indicated
- Disabled state announced

### Visual Indicators
- Focus outline on inputs (blue)
- Hover states on all interactive elements
- Disabled state visually distinct (opacity 0.6)
- Color contrast meets WCAG AA standards

## 9. User Interaction Patterns

### Modal Dismissal
1. Click outside modal area
2. Click X button in top-right
3. Press Escape key (browser default)

### Checkbox Interaction
1. Click checkbox directly
2. Click label text
3. Keyboard space when focused

### Save Confirmation
1. Appears immediately on change
2. Smooth fade-in animation
3. Stays for exactly 2 seconds
4. Smooth fade-out (not implemented, just disappears)

## 10. Edge Cases Handled

### Empty States
- Repository list empty: Shows empty state message
- No repositories in migration: Standard behavior

### Loading States
- During save: No explicit loading indicator (instant save)
- During migration: Status button shows "In Progress"

### Error States
- Failed migration: Red button, clickable for details
- Save errors: Would need to be added (not in scope)

## Testing This UI

To see this UI in action:

1. Deploy to Amplify: `npx ampx sandbox`
2. Navigate to the app URL
3. Click "Add Repository"
4. Check the "Lock source repository" checkbox
5. Add a repository
6. Click the ⚙️ icon to open settings
7. Toggle the checkbox and watch the save confirmation
8. Start a migration
9. Try to open settings again and see disabled state

## Comparison: Before and After

### Before This PR
```
[Status Button] [Delete]
```

### After This PR
```
[Status Button] [Delete] [⚙️]
```

Add Repository Modal:
- Before: 2 input fields
- After: 2 input fields + 1 checkbox

New Modal:
- Settings Modal (completely new)

This completes the visual UI guide for the Lock Source Repository feature!
