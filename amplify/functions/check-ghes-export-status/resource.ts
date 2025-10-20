import { defineFunction } from '@aws-amplify/backend';

export const checkGhesExportStatus = defineFunction({
  name: 'check-ghes-export-status',
  entry: './handler.ts',
  timeoutSeconds: 30,
  environment: {
    SOURCE_ADMIN_TOKEN: process.env.SOURCE_ADMIN_TOKEN || '',
    MODE: process.env.MODE || '',
    GHES_API_URL: process.env.GHES_API_URL || '',
  }
});
