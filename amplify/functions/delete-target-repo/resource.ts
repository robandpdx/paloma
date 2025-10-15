import { defineFunction } from '@aws-amplify/backend';

export const deleteTargetRepo = defineFunction({
  name: 'delete-target-repo',
  entry: './handler.ts',
  environment: {
    TARGET_ORGANIZATION: process.env.TARGET_ORGANIZATION || '',
    TARGET_ADMIN_TOKEN: process.env.TARGET_ADMIN_TOKEN || '',
  }
});
