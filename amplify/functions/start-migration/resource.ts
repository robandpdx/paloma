import { defineFunction } from '@aws-amplify/backend';

export const startMigration = defineFunction({
  name: 'start-migration',
  entry: './handler.ts',
  environment: {
    TARGET_ORGANIZATION: process.env.TARGET_ORGANIZATION || '',
    SOURCE_ADMIN_TOKEN: process.env.SOURCE_ADMIN_TOKEN || '',
    TARGET_ADMIN_TOKEN: process.env.TARGET_ADMIN_TOKEN || '',
  }
});
