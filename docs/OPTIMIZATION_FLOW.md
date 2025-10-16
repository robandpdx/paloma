# Optimization Flow Diagram

## Before Optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                     Start Migration Flow (OLD)                   │
└─────────────────────────────────────────────────────────────────┘

User clicks "Start Migration"
         │
         ▼
┌────────────────────────┐
│  Frontend (page.tsx)   │
│  - Reads repository    │
│  - Calls startMigration│
└────────┬───────────────┘
         │ {sourceRepositoryUrl, repositoryName, ...}
         ▼
┌────────────────────────────────────────┐
│  Lambda: start-migration               │
│                                        │
│  1. ⚠️ ALWAYS call GitHub API          │
│     GET organization owner ID          │
│     (even if we already have it!)      │
│                                        │
│  2. Create migration source            │
│                                        │
│  3. Start repository migration         │
│                                        │
└────────┬───────────────────────────────┘
         │ {success, migrationId, ownerId, ...}
         ▼
┌────────────────────────┐
│  Frontend (page.tsx)   │
│  - Store ownerId in DB │
│  - Start polling       │
└────────────────────────┘
```

**Problem**: Every migration start makes an API call to get owner ID, even when:
- The value is already in the database
- Multiple migrations target the same organization
- The value was preserved after Reset


## After Optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                     Start Migration Flow (NEW)                   │
└─────────────────────────────────────────────────────────────────┘

User clicks "Start Migration"
         │
         ▼
┌────────────────────────────────────────┐
│  Frontend (page.tsx)                   │
│  - Reads repository from DB            │
│  - Check: does it have ownerId?        │
│    ✓ Yes: pass it to startMigration    │
│    ✗ No: pass undefined                │
└────────┬───────────────────────────────┘
         │ {sourceRepositoryUrl, repositoryName, 
         │  destinationOwnerId: "MDEyO..." or undefined}
         ▼
┌────────────────────────────────────────┐
│  Lambda: start-migration               │
│                                        │
│  if (destinationOwnerId provided)      │
│    ✅ Use it directly (OPTIMIZED!)     │
│  else                                  │
│    📞 Call GitHub API to get it        │
│                                        │
│  2. Create migration source            │
│                                        │
│  3. Start repository migration         │
│                                        │
└────────┬───────────────────────────────┘
         │ {success, migrationId, ownerId, ...}
         ▼
┌────────────────────────┐
│  Frontend (page.tsx)   │
│  - Store ownerId in DB │
│  - Start polling       │
└────────────────────────┘
```

**Benefits**: 
- ✅ Skips API call when owner ID is cached
- ✅ Faster migration starts
- ✅ Reduced API rate limit usage
- ✅ Backward compatible


## New get-owner-id Function

This function can be used independently if needed in the future:

```
┌─────────────────────────────────────────────────────────────────┐
│              Optional: Pre-fetch Owner ID (Future)               │
└─────────────────────────────────────────────────────────────────┘

User adds new repository
         │
         ▼
┌────────────────────────────┐
│  Frontend (page.tsx)       │
│  - User enters repo URL    │
│  - Optional: call          │
│    getOwnerId() to cache   │
└────────┬───────────────────┘
         │ (no parameters)
         ▼
┌────────────────────────────┐
│  Lambda: get-owner-id      │
│  - Get TARGET_ORGANIZATION │
│  - Call GitHub API         │
│  - Return ownerId          │
└────────┬───────────────────┘
         │ {success, ownerId, organization}
         ▼
┌────────────────────────────┐
│  Frontend (page.tsx)       │
│  - Store ownerId in new    │
│    repository record       │
│  - Ready for migration!    │
└────────────────────────────┘
```

**Future enhancement**: Pre-populate owner ID when adding repositories


## When Optimization Applies

### ✅ Optimization Active (Owner ID Reused)

1. **Second migration** - After one migration completes successfully
2. **After Reset** - When Reset preserves destinationOwnerId
3. **Retry failed migration** - When owner ID is still in record
4. **Batch migrations** - When migrating multiple repos to same org

### ⚠️ Fallback to API Call (Backward Compatible)

1. **First migration** - No owner ID cached yet
2. **Manually cleared** - If destinationOwnerId was manually removed
3. **New repository** - Freshly added without pre-fetch


## Key Implementation Details

### Frontend Change (app/page.tsx)

```typescript
// OLD
const result = await client.queries.startMigration({
  sourceRepositoryUrl: repo.sourceRepositoryUrl,
  repositoryName: repo.repositoryName,
  // ... other params
});

// NEW
const result = await client.queries.startMigration({
  sourceRepositoryUrl: repo.sourceRepositoryUrl,
  repositoryName: repo.repositoryName,
  destinationOwnerId: repo.destinationOwnerId || undefined, // ✨ Pass if available
  // ... other params
});
```

### Backend Change (start-migration/handler.ts)

```typescript
// OLD
console.log(`Step 1: Getting ownerId for organization: ${TARGET_ORGANIZATION}`);
const ownerId = await getOwnerId(TARGET_ORGANIZATION, TARGET_ADMIN_TOKEN);

// NEW
let ownerId: string;
if (args.destinationOwnerId) {
  console.log(`Step 1: Reusing provided destinationOwnerId`); // ✨ Skip API call
  ownerId = args.destinationOwnerId;
} else {
  console.log(`Step 1: Getting ownerId for organization: ${TARGET_ORGANIZATION}`);
  ownerId = await getOwnerId(TARGET_ORGANIZATION, TARGET_ADMIN_TOKEN);
}
```

### Schema Change (data/resource.ts)

```typescript
startMigration: a
  .query()
  .arguments({
    // ... existing arguments
    destinationOwnerId: a.string(), // ✨ New optional parameter
  })
```
