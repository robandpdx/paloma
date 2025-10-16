# Scan Source Org Feature - Implementation Summary

## Visual Changes

### 1. New Blue Button: "Scan Source Org"
- **Location**: Repository list header, left of "Load CSV File" button
- **Style**: Blue background (#0969da) to distinguish from other buttons
- **Button order (left to right)**:
  1. 🔵 Scan Source Org (new, blue)
  2. Load CSV File (gray)
  3. Start selected (green)
  4. Reset selected (red)
  5. Settings gear icon (gray)
  6. Add Repository (green)

### 2. Scan Organization Modal
When clicking "Scan Source Org", a modal appears with:

**Fields:**
- Organization Name (text input with placeholder "organization-name")
- Repository Visibility (dropdown with options: Private, Public, Internal)
- Lock source repository (checkbox)

**Buttons:**
- Cancel (gray) - closes modal
- Scan (blue) - executes the scan, changes to "Scanning..." when active

**Behavior:**
- All inputs disable while scanning
- Shows success alert with statistics: "Added: X repositories, Skipped: Y existing repositories"
- Automatically skips duplicate repositories

### 3. Pagination Controls
Added above the repository table:

**Left side:**
- "Per page:" label
- Dropdown with options: 5, 10, 20, 50, 100 (default: 10)
- Status text: "Showing X to Y of Z repositories"

**Right side (only shown when totalPages > 1):**
- Previous button (disabled on first page)
- "Page X of Y" text
- Next button (disabled on last page)

## Code Structure

### New Files Created:
1. `amplify/functions/scan-source-org/handler.ts` - Lambda function
2. `amplify/functions/scan-source-org/resource.ts` - Function definition
3. `amplify/functions/scan-source-org/package.json` - Dependencies
4. `SCAN_SOURCE_ORG_FEATURE.md` - Feature documentation

### Modified Files:
1. `amplify/data/resource.ts` - Added scanSourceOrg query
2. `amplify/backend.ts` - Registered new function
3. `app/page.tsx` - Added modal, button, pagination logic
4. `app/github.css` - Added .btn-blue class
5. `.gitignore` - Updated to exclude node_modules globally

## Key Implementation Details

### Lambda Function
```typescript
// Uses Octokit REST API
const octokit = new Octokit({ auth: SOURCE_ADMIN_TOKEN });
const response = await octokit.rest.repos.listForOrg({
  org: organizationName,
  per_page: 100,
  page: page,
  type: 'all',
});
```

### Frontend Integration
```typescript
// State management
const [showScanOrgModal, setShowScanOrgModal] = useState(false);
const [currentPage, setCurrentPage] = useState(1);
const [perPage, setPerPage] = useState(10);

// Pagination calculation
const totalPages = Math.ceil(repositories.length / perPage);
const paginatedRepositories = repositories.slice(startIndex, endIndex);
```

### Duplicate Detection
```typescript
// Checks existing repositories before adding
const existingRepo = repositories.find(r => r.sourceRepositoryUrl === repo.html_url);
if (existingRepo) {
  skippedCount++;
  continue;
}
```

## User Flow

1. User clicks blue "Scan Source Org" button
2. Modal opens
3. User enters organization name (e.g., "github", "microsoft")
4. User selects visibility preference (private, public, or internal)
5. User optionally checks "Lock source repository"
6. User clicks "Scan" button
7. Button shows "Scanning..." and all inputs disable
8. Lambda function queries GitHub API for all repositories
9. Frontend receives list and adds new repositories to database
10. Alert shows: "Successfully scanned [org]! Added: X repositories, Skipped: Y existing repositories"
11. Modal closes
12. Table updates with new repositories
13. User can navigate using pagination controls

## Environment Requirements

- `SOURCE_ADMIN_TOKEN`: GitHub personal access token with `repo` and `read:org` scopes
- Must have access to the source organization

## Button Styling

```css
.btn-blue {
  color: #ffffff;
  background-color: #0969da;
  border-color: rgba(31, 35, 40, 0.15);
  box-shadow: var(--color-btn-shadow);
}

.btn-blue:hover:not(:disabled) {
  background-color: #0860ca;
}
```

## Pagination Features

- **Automatic page reset**: If current page becomes invalid (e.g., after deleting items), automatically resets to page 1
- **Per-page persistence**: Selected per-page value persists during the session
- **Smart display**: Pagination controls only show when there's more than 1 page
- **Accessibility**: All controls have proper labels and disabled states
