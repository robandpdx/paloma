import { defineFunction } from '@aws-amplify/backend';

export const exportGhes = defineFunction({
  name: 'export-ghes',
  entry: './handler.ts',
  timeoutSeconds: 120, // long enough to initiate both migrations
  environment: {
    SOURCE_ADMIN_TOKEN: process.env.SOURCE_ADMIN_TOKEN || '',
    MODE: process.env.MODE || '',
    GHES_API_URL: process.env.GHES_API_URL || '',
  }
});
