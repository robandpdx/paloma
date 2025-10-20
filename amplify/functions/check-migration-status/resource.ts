import { defineFunction } from '@aws-amplify/backend';

export const checkMigrationStatus = defineFunction({
  name: 'check-migration-status',
  entry: './handler.ts',
  environment: {
    TARGET_ADMIN_TOKEN: process.env.TARGET_ADMIN_TOKEN || '',
    SOURCE_ADMIN_TOKEN: process.env.SOURCE_ADMIN_TOKEN || '',
    MODE: process.env.MODE || '',
    GHES_API_URL: process.env.GHES_API_URL || '',
  }
});
