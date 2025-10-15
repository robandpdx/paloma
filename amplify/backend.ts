import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { startMigration } from './functions/start-migration/resource.js';
import { checkMigrationStatus } from './functions/check-migration-status/resource.js';
import { getOwnerId } from './functions/get-owner-id/resource.js';
import { deleteTargetRepo } from './functions/delete-target-repo/resource.js';
import { unlockSourceRepo } from './functions/unlock-source-repo/resource.js';
import { pollMigrationStatus } from './functions/poll-migration-status/resource.js';
import { addPollingSchedule } from './custom/polling-schedule.js';

const backend = defineBackend({
  auth,
  data,
  startMigration,
  checkMigrationStatus,
  getOwnerId,
  deleteTargetRepo,
  unlockSourceRepo,
  pollMigrationStatus,
});

// Add the Amplify Data endpoint and API key to the polling function environment
const dataResources = backend.data.resources;
const cfnGraphQLApi = dataResources.cfnResources.cfnGraphqlApi;
const apiEndpoint = cfnGraphQLApi.attrGraphQlUrl;
const apiKey = dataResources.cfnResources.cfnApiKey?.attrApiKey;

if (apiKey) {
  backend.pollMigrationStatus.addEnvironment('AMPLIFY_DATA_ENDPOINT', apiEndpoint);
  backend.pollMigrationStatus.addEnvironment('AMPLIFY_API_KEY', apiKey);
}

// Add the EventBridge schedule for polling
addPollingSchedule(backend);
