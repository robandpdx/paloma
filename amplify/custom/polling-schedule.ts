import { defineBackend } from '@aws-amplify/backend';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Stack } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';

/**
 * Creates an EventBridge rule to trigger the polling function on a schedule
 */
export function addPollingSchedule(backend: ReturnType<typeof defineBackend>) {
  const pollMigrationStatus = backend.pollMigrationStatus;
  
  if (!pollMigrationStatus) {
    console.warn('pollMigrationStatus function not found in backend');
    return;
  }

  // Get the Lambda function resource
  const lambdaFunction = pollMigrationStatus.resources.lambda;
  
  // Get the stack from the Lambda function
  const stack = Stack.of(lambdaFunction);

  // Create EventBridge rule to run every 1 minute
  // Note: EventBridge minimum is 1 minute
  const rule = new Rule(stack, 'MigrationPollingSchedule', {
    schedule: Schedule.rate(Duration.minutes(1)), // Poll every 1 minute
    description: 'Triggers migration status polling function',
  });

  // Add the Lambda function as a target
  rule.addTarget(new LambdaFunction(lambdaFunction));

  console.log('Added EventBridge schedule for migration polling');
}
