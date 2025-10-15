import { defineFunction } from '@aws-amplify/backend';

export const getOwnerId = defineFunction({
  name: 'get-owner-id',
  entry: './handler.ts',
  timeoutSeconds: 10,
  environment: {
    TARGET_ORGANIZATION: process.env.TARGET_ORGANIZATION || '',
    TARGET_ADMIN_TOKEN: process.env.TARGET_ADMIN_TOKEN || '',
  }
});
