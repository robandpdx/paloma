import { defineFunction } from '@aws-amplify/backend';

export const checkExportStatus = defineFunction({
  name: 'check-export-status',
  entry: './handler.ts',
  timeoutSeconds: 10,
  environment: {
    GHES_API_URL: process.env.GHES_API_URL || '',
    SOURCE_ADMIN_TOKEN: process.env.SOURCE_ADMIN_TOKEN || '',
  }
});
