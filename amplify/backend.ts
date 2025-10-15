import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { startMigration } from './functions/start-migration/resource.js';
import { checkMigrationStatus } from './functions/check-migration-status/resource.js';
import { getOwnerId } from './functions/get-owner-id/resource.js';

defineBackend({
  auth,
  data,
  startMigration,
  checkMigrationStatus,
  getOwnerId,
});
