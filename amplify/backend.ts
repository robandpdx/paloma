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
import { CfnFunction } from 'aws-cdk-lib/aws-lambda';

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

// Get the Lambda function and Data resources
const lambdaFunction = backend.pollMigrationStatus.resources.lambda;
const dataResources = backend.data.resources;
const graphqlApi = dataResources.graphqlApi;
const apiEndpoint = dataResources.cfnResources.cfnGraphqlApi.attrGraphQlUrl;

// Grant the Lambda function permission to query and mutate the AppSync API
lambdaFunction.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'appsync:GraphQL',
    ],
    resources: [
      `${graphqlApi.arn}/*`,
    ],
  })
);

// Set the GraphQL endpoint as an environment variable using the CloudFormation-level construct
// This avoids circular dependency by setting it directly on the CFN resource
const cfnFunction = lambdaFunction.node.defaultChild as CfnFunction;

// Get existing environment variables if they exist
const existingVars = cfnFunction.environment && 
  typeof cfnFunction.environment === 'object' && 
  'variables' in cfnFunction.environment
  ? cfnFunction.environment.variables
  : undefined;

// Set the environment with the new variable
cfnFunction.environment = {
  variables: {
    ...(existingVars || {}),
    AMPLIFY_DATA_ENDPOINT: apiEndpoint,
  },
};

// Add the EventBridge schedule for polling
const stack = Stack.of(lambdaFunction);

// Create EventBridge rule to run every 1 minute
const rule = new Rule(stack, 'MigrationPollingSchedule', {
  schedule: Schedule.rate(Duration.minutes(1)),
  description: 'Triggers migration status polling function',
});

// Add the Lambda function as a target
rule.addTarget(new LambdaFunction(lambdaFunction));
