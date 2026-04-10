export const MIGRATION_STATES = [
  'pending',
  'queued',
  'in_progress',
  'completed',
  'failed',
  'reset',
] as const;

export type MigrationState = (typeof MIGRATION_STATES)[number];

export const EXPORT_STATES = [
  'pending',
  'exporting',
  'exported',
  'failed',
] as const;

export type ExportState = (typeof EXPORT_STATES)[number];

export const REPO_VISIBILITIES = ['private', 'public', 'internal'] as const;

export type RepoVisibility = (typeof REPO_VISIBILITIES)[number];
