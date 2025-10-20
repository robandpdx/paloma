import { defineFunction } from '@aws-amplify/backend';

export const scanSourceOrg = defineFunction({
  name: 'scan-source-org',
  entry: './handler.ts',
  timeoutSeconds: 60, // Allow more time for scanning large organizations
  environment: {
    SOURCE_ADMIN_TOKEN: process.env.SOURCE_ADMIN_TOKEN || '',
    MODE: process.env.MODE || '',
    GHES_API_URL: process.env.GHES_API_URL || '',
  }
});
