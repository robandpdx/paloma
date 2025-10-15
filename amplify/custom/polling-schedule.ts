import { defineBackend } from '@aws-amplify/backend';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

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

  // Create EventBridge rule to run every 30 seconds
  // Note: EventBridge minimum is 1 minute, so we'll use 1 minute intervals
  const rule = new Rule(backend.stack, 'MigrationPollingSchedule', {
    schedule: Schedule.rate({ minutes: 1 }), // Poll every 1 minute
    description: 'Triggers migration status polling function',
    ruleName: 'migration-polling-schedule',
  });

  // Add the Lambda function as a target
  rule.addTarget(new LambdaFunction(lambdaFunction));

  console.log('Added EventBridge schedule for migration polling');
}
