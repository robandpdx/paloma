import { defineFunction } from '@aws-amplify/backend';

export const startMigration = defineFunction({
  name: 'start-migration',
  entry: './handler.ts',
  timeoutSeconds: 10,
  environment: {
    TARGET_ORGANIZATION: process.env.TARGET_ORGANIZATION || '',
    SOURCE_ADMIN_TOKEN: process.env.SOURCE_ADMIN_TOKEN || '',
    TARGET_ADMIN_TOKEN: process.env.TARGET_ADMIN_TOKEN || '',
    MODE: process.env.MODE || 'GH',
    GHES_API_URL: process.env.GHES_API_URL || '',
  }
});
