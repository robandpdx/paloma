import {
  getMigrationButtonClass,
  getMigrationButtonText,
  getStatusButtonClass,
  getStatusButtonText,
  canStartMigration,
  getExportButtonClass,
  getExportButtonText,
  canResetRepository,
} from './migrationStatus';
import type { RepositoryMigration } from './api';

function makeRepo(overrides: Partial<RepositoryMigration> = {}): RepositoryMigration {
  return {
    id: '1',
    repositoryName: 'test-repo',
    sourceRepositoryUrl: 'https://github.com/org/test-repo',
    ...overrides,
  };
}

describe('getMigrationButtonClass', () => {
  it('returns in-progress for queued', () => {
    expect(getMigrationButtonClass('queued')).toBe('btn-status-in-progress');
  });
  it('returns completed for completed', () => {
    expect(getMigrationButtonClass('completed')).toBe('btn-status-completed');
  });
  it('returns failed for failed', () => {
    expect(getMigrationButtonClass('failed')).toBe('btn-status-failed');
  });
  it('returns primary for pending', () => {
    expect(getMigrationButtonClass('pending')).toBe('btn-primary');
  });
  it('returns primary for null', () => {
    expect(getMigrationButtonClass(null)).toBe('btn-primary');
  });
});

describe('getMigrationButtonText', () => {
  it('returns In Progress for in_progress', () => {
    expect(getMigrationButtonText('in_progress')).toBe('In Progress');
  });
  it('returns Completed for completed', () => {
    expect(getMigrationButtonText('completed')).toBe('Completed');
  });
  it('returns Start Migration for pending', () => {
    expect(getMigrationButtonText('pending')).toBe('Start Migration');
  });
});

describe('getStatusButtonClass', () => {
  it('handles GHES export in progress', () => {
    expect(getStatusButtonClass('pending', { git: 'exporting', metadata: 'pending' }, true)).toBe('btn-status-in-progress');
  });
  it('handles GHES export failed', () => {
    expect(getStatusButtonClass('pending', { git: 'failed', metadata: 'exported' }, true)).toBe('btn-status-failed');
  });
  it('falls through to migration state in non-GHES', () => {
    expect(getStatusButtonClass('completed', undefined, false)).toBe('btn-status-completed');
  });
});

describe('getStatusButtonText', () => {
  it('returns Exporting for GHES in-progress export', () => {
    expect(getStatusButtonText('pending', { git: 'pending', metadata: 'pending' }, true)).toBe('Exporting');
  });
  it('returns Start Migration when GHES exports completed', () => {
    expect(getStatusButtonText('pending', { git: 'exported', metadata: 'exported' }, true)).toBe('Start Migration');
  });
  it('returns Start Export for non-started GHES', () => {
    expect(getStatusButtonText('pending', { git: null, metadata: null }, true)).toBe('Start Export');
  });
});

describe('canStartMigration', () => {
  it('always true in non-GHES mode', () => {
    expect(canStartMigration(makeRepo(), false)).toBe(true);
  });
  it('true in GHES when exports complete', () => {
    expect(canStartMigration(makeRepo({
      gitSourceExportState: 'exported',
      metadataExportState: 'exported',
      gitSourceArchiveUrl: 'https://example.com/git',
      metadataArchiveUrl: 'https://example.com/meta',
    }), true)).toBe(true);
  });
  it('false in GHES when exports incomplete', () => {
    expect(canStartMigration(makeRepo({ gitSourceExportState: 'pending' }), true)).toBe(false);
  });
});

describe('getExportButtonClass', () => {
  it('returns in-progress when exporting', () => {
    expect(getExportButtonClass(makeRepo({ gitSourceExportState: 'exporting', metadataExportState: 'pending' }))).toBe('btn-status-in-progress');
  });
  it('returns completed when both exported', () => {
    expect(getExportButtonClass(makeRepo({ gitSourceExportState: 'exported', metadataExportState: 'exported' }))).toBe('btn-status-completed');
  });
});

describe('getExportButtonText', () => {
  it('returns Exporting when in progress', () => {
    expect(getExportButtonText(makeRepo({ gitSourceExportState: 'pending', metadataExportState: 'pending' }))).toBe('Exporting');
  });
  it('returns Export Completed when done', () => {
    expect(getExportButtonText(makeRepo({ gitSourceExportState: 'exported', metadataExportState: 'exported' }))).toBe('Export Completed');
  });
  it('returns Start Export when not started', () => {
    expect(getExportButtonText(makeRepo())).toBe('Start Export');
  });
});

describe('canResetRepository', () => {
  it('returns false for archived repos', () => {
    expect(canResetRepository(makeRepo({ archived: true, state: 'completed' }), false)).toBe(false);
  });
  it('returns false for pending repos in GH mode', () => {
    expect(canResetRepository(makeRepo({ state: 'pending' }), false)).toBe(false);
  });
  it('returns false for repos with undefined state in GH mode', () => {
    expect(canResetRepository(makeRepo({ state: undefined }), false)).toBe(false);
  });
  it('returns true for completed repos in GH mode', () => {
    expect(canResetRepository(makeRepo({ state: 'completed' }), false)).toBe(true);
  });
  it('returns true for failed repos in GH mode', () => {
    expect(canResetRepository(makeRepo({ state: 'failed' }), false)).toBe(true);
  });
  it('returns true in GHES when exports completed and state is reset', () => {
    expect(canResetRepository(makeRepo({
      state: 'reset',
      gitSourceExportState: 'exported',
      metadataExportState: 'exported',
    }), true)).toBe(true);
  });
  it('returns false in GHES when exports not completed and state is pending', () => {
    expect(canResetRepository(makeRepo({
      state: 'pending',
      gitSourceExportState: 'pending',
      metadataExportState: 'pending',
    }), true)).toBe(false);
  });
  it('returns false in GHES when state is undefined and exports not completed', () => {
    expect(canResetRepository(makeRepo({
      state: undefined,
      gitSourceExportState: 'pending',
      metadataExportState: 'pending',
    }), true)).toBe(false);
  });
});
