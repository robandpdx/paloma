import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { startMigration } from './functions/start-migration/resource.js';
import { checkMigrationStatus } from './functions/check-migration-status/resource.js';
import { getOwnerId } from './functions/get-owner-id/resource.js';
import { deleteTargetRepo } from './functions/delete-target-repo/resource.js';
import { unlockSourceRepo } from './functions/unlock-source-repo/resource.js';
import { pollMigrationStatus } from './functions/poll-migration-status/resource.js';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Stack } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  data,
  startMigration,
  checkMigrationStatus,
  getOwnerId,
  deleteTargetRepo,
  unlockSourceRepo,
  pollMigrationStatus,
});

// Get the Lambda function
const lambdaFunction = backend.pollMigrationStatus.resources.lambda;
const region = process.env.AWS_REGION || Stack.of(lambdaFunction).region;
const accountId = Stack.of(lambdaFunction).account;

// Grant the Lambda function permission to query and mutate the AppSync API
// Using wildcard resource to avoid circular dependency with data resource
lambdaFunction.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'appsync:GraphQL',
    ],
    resources: [
      `arn:aws:appsync:${region}:${accountId}:apis/*`,
    ],
  })
);

// Grant permission to list GraphQL APIs (needed to discover the endpoint at runtime)
lambdaFunction.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'appsync:ListGraphqlApis',
      'appsync:GetGraphqlApi',
    ],
    resources: ['*'],
  })
);

// Add the EventBridge schedule for polling
const stack = Stack.of(lambdaFunction);

// Create EventBridge rule to run every 1 minute
const rule = new Rule(stack, 'MigrationPollingSchedule', {
  schedule: Schedule.rate(Duration.minutes(1)),
  description: 'Triggers migration status polling function',
});

// Add the Lambda function as a target
rule.addTarget(new LambdaFunction(lambdaFunction));
