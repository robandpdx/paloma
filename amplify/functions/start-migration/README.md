# Start Migration Function

This AWS Lambda function orchestrates the GitHub Enterprise Importer repository migration process. It automates the three-step process of starting a repository migration from GitHub.com to GitHub Enterprise Cloud.

## Overview

The function performs the following steps:

1. **Get Owner ID**: Queries the GraphQL API to retrieve the organization ID (`ownerId`) for the target organization
2. **Create Migration Source**: Creates a migration source pointing to GitHub.com
3. **Start Repository Migration**: Initiates the actual repository migration with the specified parameters

## Environment Variables

The function requires three environment variables to be configured in the Amplify environment:

| Variable | Description | Example |
|----------|-------------|---------|
| `TARGET_ORGANIZATION` | The GitHub organization name that will receive the migrated repository | `my-target-org` |
| `SOURCE_ADMIN_TOKEN` | Personal Access Token (PAT) with admin access to the source repository | `ghp_xxxxxxxxxxxx` |
| `TARGET_ADMIN_TOKEN` | Personal Access Token (PAT) with admin access to the target organization | `ghp_xxxxxxxxxxxx` |

### Required Token Scopes

#### Source Token (`SOURCE_ADMIN_TOKEN`)
- `repo` (Full control of private repositories)
- `read:org` (Read org and team membership)

#### Target Token (`TARGET_ADMIN_TOKEN`)
- `repo` (Full control of private repositories)
- `admin:org` (Full control of orgs and teams)
- `workflow` (Update GitHub Action workflows)

## Input Event Format

The function expects a JSON event with the following structure:

```json
{
  "sourceRepositoryUrl": "https://github.com/source-org/repo-name",
  "repositoryName": "new-repo-name",
  "targetRepoVisibility": "private",
  "continueOnError": true
}
```

### Event Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `sourceRepositoryUrl` | string | Yes | - | Full URL of the source repository to migrate |
| `repositoryName` | string | Yes | - | Name for the new repository in the target organization |
| `targetRepoVisibility` | string | No | `private` | Visibility of the migrated repository: `private`, `public`, or `internal` |
| `continueOnError` | boolean | No | `true` | Whether to continue migration when encountering non-fatal errors |

## Response Format

### Success Response

```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "message": "Repository migration started successfully",
    "migrationId": "RM_kgDaACQxYmYxOWU4Yi0wNzZmLTQ3NTMtOTdkZC1hNGUzZmYxN2U2YzA",
    "sourceUrl": "https://github.com/source-org/repo-name",
    "migrationSource": {
      "id": "MS_kgDaACQxYmYxOWU4Yi0wNzZmLTQ3NTMtOTdkZC1hNGUzZmYxN2U2YzA",
      "name": "Migration Source - 2024-01-15T10:30:00.000Z",
      "type": "GITHUB_SOURCE"
    }
  }
}
```

### Error Response

```json
{
  "statusCode": 500,
  "body": {
    "success": false,
    "message": "Failed to get organization info: Organization not found",
    "error": "Error: Organization not found"
  }
}
```

## Frontend Integration

### Option 1: Using Amplify Data with Custom Query

Add the function as a custom query handler in your Amplify Data schema:

```typescript
// amplify/data/resource.ts
import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { startMigration } from "../functions/start-migration/resource";

const schema = a.schema({
  startMigration: a
    .query()
    .arguments({
      sourceRepositoryUrl: a.string().required(),
      repositoryName: a.string().required(),
      targetRepoVisibility: a.string(),
      continueOnError: a.boolean(),
    })
    .returns(a.json())
    .authorization(allow => [allow.authenticated()])
    .handler(a.handler.function(startMigration)),
  
  // ... other schema definitions
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
```

Then call it from your frontend:

```typescript
// app/components/MigrationButton.tsx
"use client";

import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { useState } from "react";

const client = generateClient<Schema>();

export default function MigrationButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleStartMigration = async () => {
    setIsLoading(true);
    setResult("");

    try {
      const response = await client.queries.startMigration({
        sourceRepositoryUrl: "https://github.com/source-org/my-repo",
        repositoryName: "migrated-repo",
        targetRepoVisibility: "private",
        continueOnError: true,
      });

      const data = JSON.parse(response.data as string);
      
      if (data.success) {
        setResult(`Migration started! ID: ${data.migrationId}`);
      } else {
        setResult(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error("Migration error:", error);
      setResult(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="migration-container">
      <button 
        onClick={handleStartMigration} 
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {isLoading ? "Starting Migration..." : "Start Migration"}
      </button>
      {result && (
        <div className="mt-4 p-4 border rounded">
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}
```

### Option 2: Direct Lambda Invocation via API

If you prefer to invoke the Lambda directly through an API Gateway endpoint:

```typescript
// app/components/MigrationForm.tsx
"use client";

import { useState } from "react";

interface MigrationFormData {
  sourceRepositoryUrl: string;
  repositoryName: string;
  targetRepoVisibility: "private" | "public" | "internal";
}

export default function MigrationForm() {
  const [formData, setFormData] = useState<MigrationFormData>({
    sourceRepositoryUrl: "",
    repositoryName: "",
    targetRepoVisibility: "private",
  });
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      // Replace with your actual API endpoint
      const response = await fetch("/api/start-migration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error starting migration:", error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 space-y-4">
      <div>
        <label htmlFor="sourceRepo" className="block text-sm font-medium mb-1">
          Source Repository URL
        </label>
        <input
          id="sourceRepo"
          type="url"
          value={formData.sourceRepositoryUrl}
          onChange={(e) =>
            setFormData({ ...formData, sourceRepositoryUrl: e.target.value })
          }
          placeholder="https://github.com/org/repo"
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="repoName" className="block text-sm font-medium mb-1">
          New Repository Name
        </label>
        <input
          id="repoName"
          type="text"
          value={formData.repositoryName}
          onChange={(e) =>
            setFormData({ ...formData, repositoryName: e.target.value })
          }
          placeholder="my-migrated-repo"
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div>
        <label htmlFor="visibility" className="block text-sm font-medium mb-1">
          Repository Visibility
        </label>
        <select
          id="visibility"
          value={formData.targetRepoVisibility}
          onChange={(e) =>
            setFormData({
              ...formData,
              targetRepoVisibility: e.target.value as "private" | "public" | "internal",
            })
          }
          className="w-full px-3 py-2 border rounded"
        >
          <option value="private">Private</option>
          <option value="public">Public</option>
          <option value="internal">Internal</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {isLoading ? "Starting Migration..." : "Start Migration"}
      </button>

      {result && (
        <div
          className={`mt-4 p-4 border rounded ${
            result.success ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
          }`}
        >
          <h3 className="font-bold mb-2">
            {result.success ? "Success!" : "Error"}
          </h3>
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </form>
  );
}
```

### Option 3: Server-Side API Route (Next.js App Router)

Create an API route that invokes the Lambda function:

```typescript
// app/api/start-migration/route.ts
import { NextResponse } from "next/server";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { sourceRepositoryUrl, repositoryName, targetRepoVisibility, continueOnError } = body;

    if (!sourceRepositoryUrl || !repositoryName) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const response = await client.queries.startMigration({
      sourceRepositoryUrl,
      repositoryName,
      targetRepoVisibility: targetRepoVisibility || "private",
      continueOnError: continueOnError !== undefined ? continueOnError : true,
    });

    const data = JSON.parse(response.data as string);
    
    return NextResponse.json(data, { status: data.success ? 200 : 500 });
  } catch (error) {
    console.error("Error in start-migration API:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

## Testing

### Local Testing

You can test the function locally using the AWS SAM CLI or by creating a test event:

```json
{
  "sourceRepositoryUrl": "https://github.com/test-org/test-repo",
  "repositoryName": "migrated-test-repo",
  "targetRepoVisibility": "private",
  "continueOnError": true
}
```

### Environment Setup

Before deploying, ensure you've set the required environment variables in your Amplify app:

1. Go to your Amplify Console
2. Navigate to Environment Variables
3. Add the three required variables:
   - `TARGET_ORGANIZATION`
   - `SOURCE_ADMIN_TOKEN`
   - `TARGET_ADMIN_TOKEN`

## Monitoring

The function logs detailed information at each step:

1. Initial event received
2. Owner ID retrieval
3. Migration source creation
4. Repository migration start

Check CloudWatch Logs for detailed execution logs and any errors that occur during the migration process.

## Error Handling

The function includes comprehensive error handling:

- Validates all environment variables before execution
- Validates input event parameters
- Handles GraphQL API errors with descriptive messages
- Returns structured error responses with details
- Logs all errors to CloudWatch

## Security Considerations

1. **Token Security**: Never commit tokens to source control. Use environment variables or AWS Secrets Manager.
2. **Authorization**: Ensure the function is only accessible to authenticated and authorized users.
3. **Token Scopes**: Use tokens with the minimum required scopes.
4. **Audit Logging**: All migrations are logged in CloudWatch for audit purposes.

## References

- [GitHub Enterprise Importer Documentation](https://docs.github.com/en/migrations/using-github-enterprise-importer)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [AWS Amplify Functions](https://docs.amplify.aws/nextjs/build-a-backend/functions/)
