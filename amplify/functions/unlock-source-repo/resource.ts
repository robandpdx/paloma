import { defineFunction } from '@aws-amplify/backend';

export const unlockSourceRepo = defineFunction({
  name: 'unlock-source-repo',
  entry: './handler.ts',
  environment: {
    SOURCE_ADMIN_TOKEN: process.env.SOURCE_ADMIN_TOKEN || '',
  }
});
