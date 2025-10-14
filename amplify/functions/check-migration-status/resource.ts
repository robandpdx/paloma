import { defineFunction } from '@aws-amplify/backend';

export const checkMigrationStatus = defineFunction({
  name: 'check-migration-status',
  entry: './handler.ts',
  environment: {
    TARGET_ADMIN_TOKEN: process.env.TARGET_ADMIN_TOKEN || '',
  }
});
