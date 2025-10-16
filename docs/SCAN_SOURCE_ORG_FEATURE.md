# Scan Source Organization Feature

## Overview
The "Scan Source Org" feature allows users to automatically discover and import all repositories from a GitHub organization into the migration tool, rather than adding them one by one or via CSV.

## Features Added

### 1. New Lambda Function: scan-source-org
- **Location**: `amplify/functions/scan-source-org/`
- **Purpose**: Scans a GitHub organization and returns a list of all repositories
- **Dependencies**: Uses `@octokit/rest` to interact with the GitHub API
- **Pagination**: Automatically handles pagination to retrieve all repositories (up to 100 per page)
- **Authentication**: Uses the `SOURCE_ADMIN_TOKEN` environment variable

### 2. Scan Source Org Button
- **Location**: Left of the "Load CSV File" button in the repository list header
- **Style**: Blue button (using new `.btn-blue` CSS class)
- **Action**: Opens the Scan Organization modal

### 3. Scan Organization Modal
- **Fields**:
  - Organization Name (text input)
  - Repository Visibility (dropdown: private, public, internal)
  - Lock Source Repository (checkbox)
- **Buttons**:
  - Cancel: Closes the modal
  - Scan: Triggers the organization scan
- **Behavior**:
  - Disables all inputs while scanning
  - Shows "Scanning..." text on button during operation
  - Displays success/failure alerts with statistics
  - Skips repositories that already exist in the database

### 4. Pagination for Repository Table
- **Per Page Dropdown**: Allows users to select 5, 10, 20, 50, or 100 repositories per page (default: 10)
- **Navigation Controls**: Previous and Next buttons
- **Status Display**: Shows "Showing X to Y of Z repositories" and "Page X of Y"
- **Auto-reset**: Automatically resets to page 1 when changing items per page or when current page exceeds total pages

## Technical Implementation

### Backend Changes
1. **Data Schema** (`amplify/data/resource.ts`):
   - Added `scanSourceOrg` query with `organizationName` parameter
   - Returns JSON with list of repositories

2. **Backend Configuration** (`amplify/backend.ts`):
   - Registered `scanSourceOrg` function

3. **Lambda Function** (`amplify/functions/scan-source-org/handler.ts`):
   - Uses Octokit to call `octokit.rest.repos.listForOrg()`
   - Handles pagination automatically
   - Returns repository details: name, full_name, html_url, private, description

### Frontend Changes
1. **UI Components** (`app/page.tsx`):
   - Added `ScanOrgModal` component with form inputs
   - Added `handleScanOrg` function to process scan results
   - Added pagination state: `currentPage` and `perPage`
   - Added pagination controls and per-page selector
   - Updated repository list to use `paginatedRepositories`

2. **Styling** (`app/github.css`):
   - Added `.btn-blue` class for blue buttons with hover state

3. **State Management**:
   - Added `showScanOrgModal` state for modal visibility
   - Added pagination state variables

## Usage Flow

1. User clicks "Scan Source Org" button
2. Modal opens with form fields
3. User enters organization name and sets preferences (visibility, lock source)
4. User clicks "Scan" button
5. Lambda function fetches all repositories from the organization
6. Frontend receives results and adds non-duplicate repositories to the database
7. User sees success alert with count of added/skipped repositories
8. Modal closes and table updates with new repositories

## Duplicate Handling
The feature automatically skips repositories that already exist in the database by checking the `sourceRepositoryUrl` field. This prevents duplicate entries and allows users to re-scan organizations safely.

## Error Handling
- Invalid organization names show error alerts
- Network failures are caught and displayed to the user
- GitHub API errors are logged and returned to the frontend
- All inputs are disabled during scanning to prevent race conditions

## Environment Variables Required
- `SOURCE_ADMIN_TOKEN`: GitHub personal access token with permissions to list organization repositories

## CSS Classes Added
- `.btn-blue`: Blue button styling (color: #0969da) for the Scan Source Org button
