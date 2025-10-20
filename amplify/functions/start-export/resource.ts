import { defineFunction } from '@aws-amplify/backend';

export const startExport = defineFunction({
  name: 'start-export',
  entry: './handler.ts',
  timeoutSeconds: 30,
  environment: {
    GHES_API_URL: process.env.GHES_API_URL || '',
    SOURCE_ADMIN_TOKEN: process.env.SOURCE_ADMIN_TOKEN || '',
    TARGET_ORGANIZATION: process.env.TARGET_ORGANIZATION || '',
  }
});
