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

// Add the Amplify Data endpoint and API key to the polling function environment
const dataResources = backend.data.resources;
const cfnGraphQLApi = dataResources.cfnResources.cfnGraphqlApi;
const apiEndpoint = cfnGraphQLApi.attrGraphQlUrl;
const apiKey = dataResources.cfnResources.cfnApiKey?.attrApiKey;

if (apiKey) {
  backend.pollMigrationStatus.addEnvironment('AMPLIFY_DATA_ENDPOINT', apiEndpoint);
  backend.pollMigrationStatus.addEnvironment('AMPLIFY_API_KEY', apiKey);
}

// Add the EventBridge schedule for polling
// Get the Lambda function resource directly from the backend
const lambdaFunction = backend.pollMigrationStatus.resources.lambda;
const stack = Stack.of(lambdaFunction);

// Create EventBridge rule to run every 1 minute
const rule = new Rule(stack, 'MigrationPollingSchedule', {
  schedule: Schedule.rate(Duration.minutes(1)),
  description: 'Triggers migration status polling function',
});

// Add the Lambda function as a target
rule.addTarget(new LambdaFunction(lambdaFunction));
