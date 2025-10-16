import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { startMigration } from "../functions/start-migration/resource.js";
import { checkMigrationStatus } from "../functions/check-migration-status/resource.js";
import { getOwnerId } from "../functions/get-owner-id/resource.js";
import { deleteTargetRepo } from "../functions/delete-target-repo/resource.js";
import { unlockSourceRepo } from "../functions/unlock-source-repo/resource.js";
import { scanSourceOrg } from "../functions/scan-source-org/resource.js";

const schema = a.schema({
  // Repository Migration tracking model
  RepositoryMigration: a
    .model({
      repositoryName: a.string().required(),
      sourceRepositoryUrl: a.string().required(),
      destinationOwnerId: a.string(),
      migrationSourceId: a.string(),
      repositoryMigrationId: a.string(),
      state: a.string(), // 'pending', 'in_progress', 'completed', 'failed'
      failureReason: a.string(),
      lockSource: a.boolean(), // Whether to lock the source repository during migration
      repositoryVisibility: a.string(), // 'private', 'public', or 'internal'
      archived: a.boolean(), // Whether the repository is archived
    })
    .authorization((allow) => [allow.publicApiKey()]),
  
  // Migration function queries
  startMigration: a
    .query()
    .arguments({
      sourceRepositoryUrl: a.string().required(),
      repositoryName: a.string().required(),
      targetRepoVisibility: a.string(),
      continueOnError: a.boolean(),
      lockSource: a.boolean(),
      destinationOwnerId: a.string(), // Optional: reuse if already known
    })
    .returns(a.json())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(startMigration)),
  
  checkMigrationStatus: a
    .query()
    .arguments({
      migrationId: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(checkMigrationStatus)),
  
  getOwnerId: a
    .query()
    .returns(a.json())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(getOwnerId)),
  deleteTargetRepo: a
    .query()
    .arguments({
      repositoryName: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(deleteTargetRepo)),
  
  unlockSourceRepo: a
    .query()
    .arguments({
      sourceRepositoryUrl: a.string().required(),
      migrationSourceId: a.string().required(),
      repositoryName: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(unlockSourceRepo)),
  
  scanSourceOrg: a
    .query()
    .arguments({
      organizationName: a.string().required(),
    })
    .returns(a.json())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(scanSourceOrg)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
