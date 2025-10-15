import { defineFunction } from '@aws-amplify/backend';

export const pollMigrationStatus = defineFunction({
  name: 'poll-migration-status',
  entry: './handler.ts',
  timeoutSeconds: 60, // Allow 1 minute for processing multiple repositories
  environment: {
    TARGET_ADMIN_TOKEN: process.env.TARGET_ADMIN_TOKEN || '',
  }
});
