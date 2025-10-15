# Backend Polling Architecture - Visual Guide

## Before: Frontend Polling (Problem)

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Windows                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Window 1   │  │   Window 2   │  │   Window 3   │     │
│  │              │  │              │  │              │     │
│  │  Polling:    │  │  Polling:    │  │  Polling:    │     │
│  │  30 seconds  │  │  30 seconds  │  │  30 seconds  │     │
│  │              │  │              │  │              │     │
│  │  (State      │  │  (State      │  │  (State      │     │
│  │   mgmt)      │  │   mgmt)      │  │   mgmt)      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  GitHub API    │
                   │                │
                   │  Rate Limited  │
                   │  (N × calls)   │
                   └────────────────┘

Problems:
❌ Multiple polling processes (1 per browser window)
❌ Stops when all browser windows are closed
❌ Inefficient: N windows × 2 requests/minute = 2N API calls/min
❌ Race conditions between browsers
❌ Complex state management in frontend
❌ Not suitable for long-running migrations (hours)
```

## After: Backend Polling (Solution)

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser Windows                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Window 1   │  │   Window 2   │  │   Window 3   │     │
│  │              │  │              │  │              │     │
│  │  No Polling! │  │  No Polling! │  │  No Polling! │     │
│  │              │  │              │  │              │     │
│  │  observeQuery│  │  observeQuery│  │  observeQuery│     │
│  │  (Subscribe) │  │  (Subscribe) │  │  (Subscribe) │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          └─────────────────┴─────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │    Database    │
                   │  (DynamoDB)    │
                   │                │
                   │  Real-time     │
                   │  subscriptions │
                   └────────▲───────┘
                            │
                            │ Updates
                            │
                   ┌────────┴───────┐
                   │  Lambda        │
                   │  Function      │
                   │                │
                   │  poll-         │
                   │  migration-    │
                   │  status        │
                   └────────▲───────┘
                            │
                            │ Triggers
                            │ every 1 min
                   ┌────────┴───────┐
                   │  EventBridge   │
                   │  Schedule      │
                   │                │
                   │  rate(1 min)   │
                   └────────▲───────┘
                            │
                            │ Queries
                            │
                   ┌────────┴───────┐
                   │  GitHub API    │
                   │                │
                   │  Rate Limited  │
                   │  (1 × calls)   │
                   └────────────────┘

Benefits:
✅ Single polling process (runs in AWS Lambda)
✅ Continues even when all browser windows are closed
✅ Efficient: 1 request/minute per repo (not N × requests)
✅ No race conditions (single writer)
✅ Simple state management (just display)
✅ Perfect for long-running migrations (hours/days)
✅ Observable via CloudWatch Logs & Metrics
```

## Data Flow Comparison

### Before: Frontend Polling

```
User Action
    │
    ▼
Start Migration
    │
    ▼
Update DB → state: 'in_progress'
    │
    ▼
Frontend starts polling every 30s
    │
    ├─────────────────────────────────────┐
    │                                     │
    ▼                                     ▼
Browser 1                            Browser 2
    │                                     │
    ├─ Interval 1: Check status          │
    ├─ Interval 2: Check status          ├─ Interval 1: Check status
    ├─ Interval 3: Check status          ├─ Interval 2: Check status
    │  ...                                │  ...
    │                                     │
    ▼                                     ▼
Update local state                  Update local state
    │                                     │
    ▼                                     ▼
Render UI                           Render UI

Issues:
- 2 API calls every 30s (for 2 browsers)
- Stops when browsers close
- State can be inconsistent between browsers
```

### After: Backend Polling

```
User Action
    │
    ▼
Start Migration
    │
    ▼
Update DB → state: 'in_progress'
    │
    ▼
EventBridge detects schedule (1 min)
    │
    ▼
Trigger Lambda
    │
    ├─ Query DB for in_progress repos
    │
    ├─ For each repo:
    │   ├─ Call GitHub API
    │   ├─ Get current status
    │   └─ Update DB
    │
    ▼
Database updated → state: 'completed'
    │
    ├─────────────────────────────────────┐
    │                                     │
    ▼                                     ▼
observeQuery (Browser 1)          observeQuery (Browser 2)
    │                                     │
    ▼                                     ▼
Render UI                           Render UI

Benefits:
- 1 API call per minute (regardless of browsers)
- Continues even with no browsers
- Consistent state across all browsers
- Real-time updates via subscriptions
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              EventBridge Scheduler                  │    │
│  │                                                     │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │  Rule: MigrationPollingSchedule          │     │    │
│  │  │  Schedule: rate(1 minute)                │     │    │
│  │  │  State: ENABLED                          │     │    │
│  │  └──────────────────┬───────────────────────┘     │    │
│  └─────────────────────┼────────────────────────────┘    │
│                        │                                   │
│                        │ Invokes                           │
│                        ▼                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           Lambda Function                            │  │
│  │           poll-migration-status                      │  │
│  │                                                      │  │
│  │  Environment Variables:                             │  │
│  │  • TARGET_ADMIN_TOKEN      (GitHub PAT)             │  │
│  │  • AMPLIFY_DATA_ENDPOINT   (GraphQL API)            │  │
│  │  • AMPLIFY_API_KEY         (API Key)                │  │
│  │                                                      │  │
│  │  Handler Logic:                                     │  │
│  │  1. Query for in_progress repos                     │  │
│  │  2. For each repo:                                  │  │
│  │     a. Get migration status from GitHub            │  │
│  │     b. Update database with new state              │  │
│  │  3. Return success/failure                          │  │
│  │                                                      │  │
│  │  Timeout: 60 seconds                                │  │
│  │  Memory: 512 MB                                     │  │
│  └──────────┬──────────────────────────▲───────────────┘  │
│             │                          │                   │
│             │ Queries                  │ Updates           │
│             ▼                          │                   │
│  ┌──────────────────────────────────────────────────┐    │
│  │      Amplify Data (AppSync + DynamoDB)           │    │
│  │                                                   │    │
│  │  Table: RepositoryMigration                      │    │
│  │  ┌────────────────────────────────────────┐     │    │
│  │  │ id  │ state       │ repositoryMigration│     │    │
│  │  │     │             │ Id                  │     │    │
│  │  ├─────┼─────────────┼────────────────────┤     │    │
│  │  │ 1   │ pending     │ null                │     │    │
│  │  │ 2   │ in_progress │ MI_xxx...           │     │    │
│  │  │ 3   │ completed   │ MI_yyy...           │     │    │
│  │  └────────────────────────────────────────┘     │    │
│  │                                                   │    │
│  │  Subscriptions (Real-time):                      │    │
│  │  • onCreate                                       │    │
│  │  • onUpdate                                       │    │
│  │  • onDelete                                       │    │
│  └─────────────────────────┬────────────────────────┘    │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │
                             │ Subscription
                             │ (WebSocket)
                             ▼
┌────────────────────────────────────────────────────────────┐
│                      Client Browsers                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Browser 1  │  │   Browser 2  │  │   Browser N  │    │
│  │              │  │              │  │              │    │
│  │ observeQuery │  │ observeQuery │  │ observeQuery │    │
│  │              │  │              │  │              │    │
│  │  Real-time   │  │  Real-time   │  │  Real-time   │    │
│  │  updates     │  │  updates     │  │  updates     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└────────────────────────────────────────────────────────────┘

External Service:
┌────────────────────┐
│   GitHub API       │
│                    │
│   GraphQL endpoint │
│   Migration status │
│                    │
│   Rate Limits:     │
│   • 5000/hour      │
│   • PAT based      │
└────────────────────┘
         ▲
         │ HTTPS
         │ GraphQL query
         │
    (from Lambda)
```

## Timeline Comparison

### Before: Multiple Browser Windows Polling

```
Time →
0:00  Browser 1 polls  Browser 2 polls  Browser 3 polls
0:30  Browser 1 polls  Browser 2 polls  Browser 3 polls
1:00  Browser 1 polls  Browser 2 polls  Browser 3 polls
1:30  Browser 1 polls  Browser 2 polls  Browser 3 polls
...
[User closes all browsers]
2:00  ❌ No polling    ❌ No polling    ❌ No polling
      Migration status stuck at "in_progress"
```

### After: Backend Polling

```
Time →
0:00  EventBridge triggers Lambda → Updates DB → All browsers update
1:00  EventBridge triggers Lambda → Updates DB → All browsers update
2:00  EventBridge triggers Lambda → Updates DB → All browsers update
[User closes all browsers]
3:00  EventBridge triggers Lambda → Updates DB → (no browsers, but DB updated)
4:00  EventBridge triggers Lambda → Updates DB → (no browsers, but DB updated)
...
[User opens browser 24 hours later]
      ✅ Current status displayed immediately from DB
```

## Code Structure

```
amplify-next-paloma/
├── amplify/
│   ├── backend.ts                          # Backend configuration
│   │   └── Added pollMigrationStatus
│   │   └── Added environment variables
│   │   └── Added polling schedule
│   │
│   ├── custom/
│   │   └── polling-schedule.ts             # NEW: EventBridge schedule
│   │       └── Creates Rule with 1-min rate
│   │       └── Targets Lambda function
│   │
│   ├── data/
│   │   └── resource.ts                     # Data schema (unchanged)
│   │       └── RepositoryMigration model
│   │
│   └── functions/
│       ├── check-migration-status/         # Existing (still available)
│       │   └── For manual status checks
│       │
│       └── poll-migration-status/          # NEW: Backend polling
│           ├── handler.ts                   # Main polling logic (280 lines)
│           │   ├── getInProgressRepositories()
│           │   ├── getMigrationStatus()
│           │   └── updateRepositoryStatus()
│           │
│           ├── resource.ts                  # Function configuration
│           │   └── Timeout: 60 seconds
│           │   └── Environment variables
│           │
│           └── package.json                 # Dependencies
│
├── app/
│   └── page.tsx                             # Frontend (simplified)
│       └── REMOVED: ~100 lines of polling
│       └── KEPT: observeQuery subscription
│
└── docs/                                    # NEW: Comprehensive documentation
    ├── BACKEND_POLLING_ARCHITECTURE.md      # Technical architecture
    ├── TESTING_BACKEND_POLLING.md           # Testing procedures
    ├── DEPLOYMENT_BACKEND_POLLING.md        # Deployment guide
    └── BACKEND_POLLING_SUMMARY.md           # Executive summary
```

## Deployment Flow

```
Developer                Git                 AWS Amplify            AWS Services
    │                    │                       │                      │
    │ 1. Push code       │                       │                      │
    ├──────────────────►│                       │                      │
    │                    │ 2. Trigger deploy    │                      │
    │                    ├──────────────────────►│                      │
    │                    │                       │ 3. Build backend     │
    │                    │                       ├──────────────────────►│
    │                    │                       │                      │ CloudFormation
    │                    │                       │                      │ creates:
    │                    │                       │                      │ • Lambda
    │                    │                       │                      │ • EventBridge
    │                    │                       │                      │ • IAM roles
    │                    │                       │                      │
    │                    │                       │ 4. Build frontend    │
    │                    │                       ├─────────────────────►│
    │                    │                       │                      │ S3 + CloudFront
    │                    │                       │                      │ hosts static
    │                    │                       │                      │ files
    │                    │                       │                      │
    │                    │                       │◄─────────────────────┤
    │                    │◄──────────────────────┤ 5. Deploy complete   │
    │◄───────────────────┤                       │                      │
    │ 6. Verify           │                       │                      │
    │                    │                       │                      │
    │                                                    EventBridge starts:
    │                                                    T+0:00 → Invoke Lambda
    │                                                    T+1:00 → Invoke Lambda
    │                                                    T+2:00 → Invoke Lambda
    │                                                    ...
```

## Monitoring Dashboard View

```
CloudWatch Dashboard - Migration Polling

┌────────────────────────────────────────────────────────────┐
│ Lambda Metrics                                              │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Invocations                Duration                       │
│  ┌──────────┐              ┌──────────┐                    │
│  │ 1440/day │              │ ~5 sec   │                    │
│  │ (1/min)  │              │ avg      │                    │
│  └──────────┘              └──────────┘                    │
│                                                             │
│  Errors                     Throttles                      │
│  ┌──────────┐              ┌──────────┐                    │
│  │    0     │              │    0     │                    │
│  │          │              │          │                    │
│  └──────────┘              └──────────┘                    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Recent Logs                                                 │
├────────────────────────────────────────────────────────────┤
│ [2024-10-15 14:45] Starting scheduled migration polling    │
│ [2024-10-15 14:45] Found 2 repositories in progress        │
│ [2024-10-15 14:45] Repository repo-1: in_progress          │
│ [2024-10-15 14:45] Repository repo-2: in_progress          │
│ [2024-10-15 14:45] Processed 2 repositories successfully   │
│                                                             │
│ [2024-10-15 14:46] Starting scheduled migration polling    │
│ [2024-10-15 14:46] Found 2 repositories in progress        │
│ [2024-10-15 14:46] Repository repo-1: completed ✓          │
│ [2024-10-15 14:46] Repository repo-2: in_progress          │
│ [2024-10-15 14:46] Processed 2 repositories successfully   │
└────────────────────────────────────────────────────────────┘
```

## Summary

**Key Takeaway**: Single, reliable backend polling process replaces inefficient per-browser polling.

**Before**: ❌ N browsers × polling = complexity + inefficiency
**After**: ✅ 1 backend process = simplicity + reliability

This architecture ensures migrations are monitored continuously, regardless of user presence, while being more efficient with API rate limits.
