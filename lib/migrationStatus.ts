import type { RepositoryMigration, MigrationState, ExportState } from "@/lib/api";

interface ExportStateInfo {
  git?: ExportState | null;
  metadata?: ExportState | null;
}

export function getMigrationButtonClass(state?: MigrationState | null): string {
  switch (state) {
    case 'queued':
    case 'in_progress':
      return 'btn-status-in-progress';
    case 'completed':
      return 'btn-status-completed';
    case 'failed':
      return 'btn-status-failed';
    case 'reset':
    case 'pending':
    default:
      return 'btn-primary';
  }
}

export function getMigrationButtonText(state?: MigrationState | null): string {
  switch (state) {
    case 'queued':
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'reset':
    case 'pending':
    default:
      return 'Start Migration';
  }
}

export function getStatusButtonClass(
  state?: MigrationState | null,
  exportState?: ExportStateInfo,
  isGHESMode = false,
): string {
  if (isGHESMode && exportState) {
    const gitExporting = exportState.git === 'pending' || exportState.git === 'exporting';
    const metadataExporting = exportState.metadata === 'pending' || exportState.metadata === 'exporting';

    if (gitExporting || metadataExporting) {
      return 'btn-status-in-progress';
    }

    const gitFailed = exportState.git === 'failed';
    const metadataFailed = exportState.metadata === 'failed';

    if (gitFailed || metadataFailed) {
      return 'btn-status-failed';
    }
  }

  switch (state) {
    case 'queued':
    case 'in_progress':
      return 'btn-status-in-progress';
    case 'completed':
      return 'btn-status-completed';
    case 'failed':
      return 'btn-status-failed';
    case 'reset':
      return 'btn-primary';
    default:
      return 'btn-primary';
  }
}

export function getStatusButtonText(
  state?: MigrationState | null,
  exportState?: ExportStateInfo,
  isGHESMode = false,
): string {
  if (isGHESMode && exportState) {
    const gitExporting = exportState.git === 'pending' || exportState.git === 'exporting';
    const metadataExporting = exportState.metadata === 'pending' || exportState.metadata === 'exporting';

    if (gitExporting || metadataExporting) {
      return 'Exporting';
    }

    const gitFailed = exportState.git === 'failed';
    const metadataFailed = exportState.metadata === 'failed';

    if (gitFailed || metadataFailed) {
      return 'Export Failed';
    }

    const gitExported = exportState.git === 'exported';
    const metadataExported = exportState.metadata === 'exported';

    if (gitExported && metadataExported) {
      if (state && state !== 'pending' && state !== 'reset') {
        // Fall through to migration state handling
      } else {
        return 'Start Migration';
      }
    } else {
      return 'Start Export';
    }
  }

  switch (state) {
    case 'queued':
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'reset':
      return isGHESMode ? 'Start Export' : 'Start Migration';
    default:
      return isGHESMode ? 'Start Export' : 'Start Migration';
  }
}

export function canStartMigration(repo: RepositoryMigration, isGHESMode: boolean): boolean {
  if (!isGHESMode) return true;

  return repo.gitSourceExportState === 'exported' &&
    repo.metadataExportState === 'exported' &&
    !!repo.gitSourceArchiveUrl &&
    !!repo.metadataArchiveUrl;
}

export function getExportButtonClass(repo: RepositoryMigration): string {
  const gitExporting = repo.gitSourceExportState === 'pending' || repo.gitSourceExportState === 'exporting';
  const metadataExporting = repo.metadataExportState === 'pending' || repo.metadataExportState === 'exporting';

  if (gitExporting || metadataExporting) {
    return 'btn-status-in-progress';
  }

  const gitFailed = repo.gitSourceExportState === 'failed';
  const metadataFailed = repo.metadataExportState === 'failed';

  if (gitFailed || metadataFailed) {
    return 'btn-status-failed';
  }

  const gitExported = repo.gitSourceExportState === 'exported';
  const metadataExported = repo.metadataExportState === 'exported';

  if (gitExported && metadataExported) {
    return 'btn-status-completed';
  }

  return 'btn-primary';
}

export function getExportButtonText(repo: RepositoryMigration): string {
  const gitExporting = repo.gitSourceExportState === 'pending' || repo.gitSourceExportState === 'exporting';
  const metadataExporting = repo.metadataExportState === 'pending' || repo.metadataExportState === 'exporting';

  if (gitExporting || metadataExporting) {
    return 'Exporting';
  }

  const gitFailed = repo.gitSourceExportState === 'failed';
  const metadataFailed = repo.metadataExportState === 'failed';

  if (gitFailed || metadataFailed) {
    return 'Export Failed';
  }

  const gitExported = repo.gitSourceExportState === 'exported';
  const metadataExported = repo.metadataExportState === 'exported';

  if (gitExported && metadataExported) {
    return 'Export Completed';
  }

  return 'Start Export';
}

export function canResetRepository(repo: RepositoryMigration, isGHESMode: boolean): boolean {
  if (repo.archived) return false;

  if (!isGHESMode) {
    return !!repo.state && repo.state !== 'pending' && repo.state !== 'reset';
  }

  // Treat undefined/null state the same as 'pending' for GHES
  const state = repo.state ?? 'pending';

  if (state === 'reset') {
    const exportsCompleted = repo.gitSourceExportState === 'exported' &&
      repo.metadataExportState === 'exported';
    const exportsFailed = repo.gitSourceExportState === 'failed' ||
      repo.metadataExportState === 'failed';
    return exportsCompleted || exportsFailed;
  }

  if (state === 'pending') {
    const exportsCompleted = repo.gitSourceExportState === 'exported' &&
      repo.metadataExportState === 'exported';
    const exportsFailed = repo.gitSourceExportState === 'failed' ||
      repo.metadataExportState === 'failed';
    const exportsInProgress =
      !repo.gitSourceExportState ||
      !repo.metadataExportState ||
      repo.gitSourceExportState === 'pending' ||
      repo.metadataExportState === 'pending' ||
      repo.gitSourceExportState === 'exporting' ||
      repo.metadataExportState === 'exporting';

    // Allow reset if exports are completed OR if any export has failed
    return !exportsInProgress && (exportsCompleted || exportsFailed);
  }

  return true;
}
