# GHES Migration Implementation Summary

## Overview
This implementation adds support for GitHub Enterprise Server (GHES) migrations to the repository migration tool, enabling a two-phase migration workflow specifically designed for GHES version 3.8 and above.

## Key Features

### 1. Migration Modes
The application now supports two distinct migration modes via the `MODE` environment variable:

- **GH Mode (Default)**: Single-step migration from GitHub.com to GitHub Enterprise Cloud
- **GHES Mode**: Two-phase migration from GitHub Enterprise Server to GitHub Enterprise Cloud

### 2. Two-Phase GHES Workflow

#### Phase 1: Export
- Initiated by clicking "Start Export" button
- Executes two parallel exports from GHES:
  - Git source data export
  - Repository metadata export
- Exports are tracked with states: `pending`, `exporting`, `exported`, `failed`
- GHES 3.8+ automatically uploads archives to blob storage
- Archive URLs are retrieved via the Location header from the GHES API

#### Phase 2: Migration
- Only enabled after both exports successfully complete
- Uses archive URLs from Phase 1 to migrate data to GitHub Enterprise Cloud
- Follows standard migration workflow with status tracking

### 3. Backend Implementation

#### New Lambda Functions

**start-export** (`amplify/functions/start-export/`)
- Initiates parallel exports from GHES
- Calls GHES REST API to create migration exports
- Returns export IDs and initial states
- Environment variables: `GHES_API_URL`, `SOURCE_ADMIN_TOKEN`

**check-export-status** (`amplify/functions/check-export-status/`)
- Polls GHES API for export status
- Retrieves archive URLs when exports complete
- Handles redirect responses to get short-lived archive URLs
- Environment variables: `GHES_API_URL`, `SOURCE_ADMIN_TOKEN`

#### Enhanced start-migration Function
- Added support for `MODE` environment variable
- Accepts optional `gitSourceArchiveUrl` and `metadataArchiveUrl` parameters
- Uses `GITHUB_ARCHIVE` source type for both GH and GHES migrations (differentiated by URL)
- For GHES mode: Sets source URL to GHES_API_URL instead of https://github.com
- Validates that archive URLs are provided in GHES mode

#### Data Schema Updates
Added fields to `RepositoryMigration` model:
```typescript
gitSourceExportId: string
metadataExportId: string
gitSourceExportState: string  // 'pending', 'exporting', 'exported', 'failed'
metadataExportState: string   // 'pending', 'exporting', 'exported', 'failed'
gitSourceArchiveUrl: string   // Short-lived URL to git source archive
metadataArchiveUrl: string    // Short-lived URL to metadata archive
exportFailureReason: string   // Reason for export failure
```

### 4. Frontend Implementation

#### Button State Logic
The status button dynamically changes based on export and migration states:

- **Start Export**: Initial state in GHES mode
- **Exporting**: During export operations (pulsing animation)
- **Export Failed**: If either export fails (red)
- **Start Migration**: After successful exports or in GH mode
- **In Progress**: During migration (pulsing animation)
- **Completed**: Successful migration (green)
- **Failed**: Failed migration (red)

#### Export Polling
- Automatic polling every 30 seconds for repositories with exports in progress
- Checks both git source and metadata export statuses
- Retrieves archive URLs when exports complete
- Resumes polling on page refresh

#### Reset Functionality
Enhanced reset modal for GHES mode:
- Default behavior: Preserves export data for reuse
- Optional "Reset Export" checkbox: Clears export data, requiring new exports
- Rationale: Export process can take time, so preserving exports improves efficiency

#### Info Modal Enhancements
Displays export-related information in GHES mode:
- Git source export state and ID
- Metadata export state and ID
- Export failure reasons (if applicable)

### 5. Environment Variables

#### Required for All Modes
- `TARGET_ORGANIZATION`: Target GitHub organization
- `SOURCE_ADMIN_TOKEN`: PAT for source (GitHub.com or GHES)
- `TARGET_ADMIN_TOKEN`: PAT for target GHEC

#### Additional for GHES Mode
- `MODE=GHES`: Enables GHES migration mode
- `GHES_API_URL`: API endpoint for GHES instance (e.g., `https://myghes.com/api/v3`)

### 6. Configuration Files

**next.config.js**
```javascript
env: {
  NEXT_PUBLIC_MODE: process.env.MODE || 'GH',
  // ... other variables
}
```

**Lambda Resource Files**
Each function includes MODE and GHES_API_URL in its environment configuration.

## Technical Details

### Export API Calls
The export functions use the GHES REST API:
- Endpoint: `POST /orgs/{org}/migrations`
- Git source export: `exclude_git_data: false, exclude_metadata: false`
- Metadata export: `exclude_git_data: true, exclude_metadata: false`

### Archive URL Retrieval
- Endpoint: `GET /orgs/{org}/migrations/{id}/archive`
- Returns 302 redirect with Location header containing archive URL
- URL is short-lived and must be retrieved when needed

### State Management
- Export states tracked independently for git source and metadata
- Migration only proceeds when both exports reach "exported" state
- Polling refs used to prevent unnecessary state updates

## Security Considerations

1. **Environment Variables**: Sensitive tokens stored as environment variables, not in code
2. **Archive URLs**: Short-lived URLs reduce security risk
3. **Token Scopes**: Documentation specifies minimum required scopes
4. **Input Validation**: All user inputs validated before API calls
5. **Error Handling**: Comprehensive error handling prevents information leakage

## Testing Recommendations

1. **GH Mode Testing**:
   - Verify single-step migration still works as before
   - Ensure no GHES-specific UI elements appear

2. **GHES Mode Testing**:
   - Test export initiation and polling
   - Verify archive URL retrieval
   - Test migration with valid archive URLs
   - Verify export failure handling
   - Test reset with and without "Reset Export" checked

3. **Edge Cases**:
   - Network failures during export
   - Expired archive URLs
   - Switching between repositories during export
   - Page refresh during export/migration

## Future Enhancements

1. **Batch Exports**: Support exporting multiple repositories in a single operation
2. **Export Scheduling**: Allow scheduling exports for off-peak hours
3. **Archive Management**: Display archive expiration times
4. **Retry Logic**: Automatic retry for failed exports
5. **Progress Indicators**: More detailed progress information during exports

## Known Limitations

1. Archive URLs are short-lived and may expire if not used promptly
2. Export process cannot be paused or resumed
3. No support for incremental exports
4. GHES version must be 3.8 or above

## Deployment Notes

1. Set all required environment variables in Amplify Console
2. Trigger a new build after updating environment variables
3. Verify GHES_API_URL is accessible from Lambda execution environment
4. Test with a small repository first in GHES mode
5. Monitor CloudWatch logs for any issues during export/migration

## Support

For issues or questions about GHES migrations:
1. Check CloudWatch logs for detailed error messages
2. Verify GHES API URL and token permissions
3. Ensure GHES version is 3.8 or above
4. Review the GHES migration documentation in README.md
