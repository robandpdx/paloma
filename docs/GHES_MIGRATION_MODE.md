# GitHub Enterprise Server (GHES) Migration Mode

This document describes how the application enables repository migrations from **GitHub Enterprise Server (GHES 3.8+)** to **GitHub Enterprise Cloud (GHEC)**.

## Overview
When `MODE=GHES`, the migration flow is now **split into an export phase and a final migration phase**:

Phase A (Export):
1. `exportGhes` starts two GHES organization migrations:
  - Git data (`exclude_metadata: true`)
  - Metadata (`exclude_git_data: true`)
2. `checkGhesExportStatus` polls the two migration IDs until both states are `exported`.

Phase B (Finalize):
3. `startMigration` (with GHES-specific arguments) verifies both exports, fetches the archive URLs, and calls `startRepositoryMigration` on GHEC.
4. `checkMigrationStatus` monitors the final repository migration.

## Environment Variables
| Variable | Required (MODE=GHES) | Description |
|----------|----------------------|-------------|
| `MODE` | Yes | Must be set to `GHES` to enable this path. Any other value (or unset) uses the GitHub.com flow. |
| `GHES_API_URL` | Yes | Base API endpoint including `/api/v3`, e.g. `https://myghes.company.com/api/v3`. |
| `SOURCE_ADMIN_TOKEN` | Yes | PAT on GHES with required organization & migration scopes. |
| `TARGET_ADMIN_TOKEN` | Yes | PAT on GHEC with `admin:org`, `admin:enterprise` (if needed), `repo`, and migration scopes. |
| `TARGET_ORGANIZATION` | Yes | Destination org on GHEC (ownerId is resolved once and reused). |

## Flow Diagram (Updated)
```
exportGhes ─► GHES POST (git) ┐
       GHES POST (meta) │
         │            │
         ▼            │
   checkGhesExportStatus (poll both) ──► both exported? ──► startMigration (GHES final) ──► checkMigrationStatus
```

## Status Responses (Export Phase)
During export polling (`checkGhesExportStatus`):
```jsonc
{
  "mode": "GHES",
  "ghes": {
    "git": { "id": 123, "state": "exporting" },
    "metadata": { "id": 124, "state": "exported" },
    "bothExported": false
  },
  "finalMigration": null
}
```
After final migration starts (use `checkMigrationStatus` for repository migration):
```jsonc
{
  "mode": "GHES",
  "ghes": { "git": {"id":123,"state":"exported"}, "metadata": {"id":124,"state":"exported"}, "bothExported": true },
  "finalMigration": { "id": "MDE...", "state": "IN_PROGRESS" },
  "migrationId": "MDE..."
}
```

## Limitations
- Only **GHES 3.8+** supported (expects working 302 archive redirects).
- Archives fetched on-demand during finalization; not cached.
- Visibility defaults to `private` (extendable).

## Persistence Model
The backend does **not** automatically persist export phase identifiers. This keeps the Lambda surface minimal and avoids introducing extra write permissions solely for interim states. The client (UI) should retain:

- `ghesGitMigrationId`
- `ghesMetadataMigrationId`

If these are lost, simply invoke `exportGhes` again; duplicate exports are harmless—the first pair to reach `exported` is used when you call `startMigration`.

## Future Enhancements
- Persist export state in DynamoDB to enable server-driven recovery without client-stored IDs.
- Support configurable visibility (public/internal) for GHES migrations.
- Add exponential backoff and jitter for polling cadence on the client.
- Surface per-migration failure reasons directly in UI with actionable remediation hints.
- Optional archival of export responses for audit trail.

## Testing Notes
- Unit test added to ensure `MODE=GHES` requires `GHES_API_URL`.
- Additional integration tests (mocking GHES responses & GraphQL) recommended for full coverage.
 - Export polling logic covered for consolidated status transitions.

---
_Last updated: 2025-10-17_
