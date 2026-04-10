"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  apiClient,
  getRuntimeConfig,
  type RepositoryMigration,
  type RuntimeConfig,
  type RepoVisibility,
} from "@/lib/api";
import { parseCSV } from "@/lib/csvParser";

export function useRepositoryMigrations() {
  const [repositories, setRepositories] = useState<RepositoryMigration[]>([]);
  const [pollingRepos, setPollingRepos] = useState<Set<string>>(new Set());
  const pollingReposRef = useRef<Set<string>>(new Set());
  const [pollingExports, setPollingExports] = useState<Set<string>>(new Set());
  const pollingExportsRef = useRef<Set<string>>(new Set());
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const targetOrganization = runtimeConfig?.targetOrganization || 'Not configured';
  const targetDescription = runtimeConfig?.targetDescription || 'Not configured';
  const sourceDescription = runtimeConfig?.sourceDescription || 'Not configured';
  const mode = runtimeConfig?.mode || 'GH';
  const isGHESMode = mode === 'GHES';

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    if (errorTimerRef.current !== null) {
      clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = setTimeout(() => {
      setErrorMessage(null);
      errorTimerRef.current = null;
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current !== null) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, []);

  const dismissError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const syncRepository = useCallback((nextRepository: RepositoryMigration) => {
    setRepositories((currentRepositories) => {
      const repositoryIndex = currentRepositories.findIndex(
        (repository) => repository.id === nextRepository.id,
      );

      if (repositoryIndex === -1) {
        return [...currentRepositories, nextRepository].sort((left, right) =>
          left.repositoryName.localeCompare(right.repositoryName),
        );
      }

      const updatedRepositories = [...currentRepositories];
      updatedRepositories[repositoryIndex] = nextRepository;
      return updatedRepositories;
    });
  }, []);

  const removeRepositoryFromState = useCallback((id: string) => {
    setRepositories((currentRepositories) =>
      currentRepositories.filter((repository) => repository.id !== id),
    );
  }, []);

  const refreshRepositories = useCallback(async () => {
    try {
      const nextRepositories = await apiClient.listRepositoryMigrations(true);
      setRepositories(nextRepositories);
    } catch (error) {
      showError(`Failed to load repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [showError]);

  // Keep refs in sync with state
  useEffect(() => {
    pollingReposRef.current = pollingRepos;
  }, [pollingRepos]);

  useEffect(() => {
    pollingExportsRef.current = pollingExports;
  }, [pollingExports]);

  const startPolling = useCallback((repoId: string) => {
    setPollingRepos(prev => new Set(prev).add(repoId));
  }, []);

  const startExportPolling = useCallback((repoId: string) => {
    setPollingExports(prev => new Set(prev).add(repoId));
  }, []);

  // Load runtime config
  useEffect(() => {
    let isMounted = true;
    void getRuntimeConfig().then((nextRuntimeConfig) => {
      if (isMounted) setRuntimeConfig(nextRuntimeConfig);
    });
    return () => { isMounted = false; };
  }, []);

  // Load repositories
  useEffect(() => {
    void refreshRepositories();
  }, [refreshRepositories]);

  // Resume polling for in-progress repos
  useEffect(() => {
    repositories.forEach(repo => {
      if ((repo.state === 'in_progress' || repo.state === 'queued') && repo.repositoryMigrationId && !pollingReposRef.current.has(repo.id)) {
        startPolling(repo.id);
      }

      if (isGHESMode && repo.gitSourceExportId && repo.metadataExportId && !pollingExportsRef.current.has(repo.id)) {
        const gitSourceInProgress = repo.gitSourceExportState === 'pending' || repo.gitSourceExportState === 'exporting';
        const metadataInProgress = repo.metadataExportState === 'pending' || repo.metadataExportState === 'exporting';

        if (gitSourceInProgress || metadataInProgress) {
          const match = repo.sourceRepositoryUrl.match(/\/([^\/]+)\/[^\/]+$/);
          if (match) {
            startExportPolling(repo.id);
          }
        }
      }
    });
  }, [repositories, startPolling, startExportPolling, isGHESMode]);

  // --- CRUD operations ---

  const addRepository = useCallback(async (url: string, name: string, lockSource: boolean, repositoryVisibility: string) => {
    try {
      const repository = await apiClient.createRepositoryMigration({
        sourceRepositoryUrl: url,
        repositoryName: name,
        state: 'pending',
        lockSource,
        repositoryVisibility: repositoryVisibility as 'private' | 'public' | 'internal',
        archived: false,
      });
      syncRepository(repository);
    } catch (error) {
      showError(`Failed to add repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [syncRepository, showError]);

  const deleteRepository = useCallback(async (id: string) => {
    try {
      await apiClient.deleteRepositoryMigration(id);
      removeRepositoryFromState(id);
    } catch (error) {
      showError(`Failed to delete repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [removeRepositoryFromState, showError]);

  const archiveRepository = useCallback(async (repo: RepositoryMigration) => {
    try {
      const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, { archived: true });
      syncRepository(updatedRepository);
    } catch (error) {
      showError(`Failed to archive repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [syncRepository, showError]);

  const unarchiveRepository = useCallback(async (repo: RepositoryMigration) => {
    try {
      const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, { archived: false });
      syncRepository(updatedRepository);
    } catch (error) {
      showError(`Failed to unarchive repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [syncRepository, showError]);

  const updateRepositorySettings = useCallback(async (repo: RepositoryMigration, lockSource: boolean, repositoryVisibility: RepoVisibility) => {
    try {
      const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, {
        lockSource,
        repositoryVisibility,
      });
      syncRepository(updatedRepository);
    } catch (error) {
      showError(`Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [syncRepository, showError]);

  // --- Migration operations ---

  const resetRepository = useCallback(async (repo: RepositoryMigration, resetExport: boolean = false) => {
    try {
      if (repo.repositoryName) {
        await apiClient.deleteTargetRepo(repo.repositoryName);
      }

      const shouldUnlock = isGHESMode ? resetExport : true;

      if (shouldUnlock && repo.lockSource && repo.sourceRepositoryUrl) {
        const hasRequiredFields = isGHESMode
          ? true
          : (repo.migrationSourceId && repo.repositoryName);

        if (hasRequiredFields) {
          await apiClient.unlockSourceRepo({
            sourceRepositoryUrl: repo.sourceRepositoryUrl,
            migrationSourceId: repo.migrationSourceId || '',
            repositoryName: repo.repositoryName || '',
          });
        }
      }

      const updateFields: Partial<RepositoryMigration> = {
        state: 'reset',
        migrationSourceId: '',
        repositoryMigrationId: '',
        lockSource: shouldUnlock ? false : (repo.lockSource ?? false),
        repositoryVisibility: 'private',
        failureReason: '',
      };

      if (resetExport) {
        updateFields.gitSourceExportId = '';
        updateFields.metadataExportId = '';
        updateFields.gitSourceExportState = undefined;
        updateFields.metadataExportState = undefined;
        updateFields.gitSourceArchiveUrl = '';
        updateFields.metadataArchiveUrl = '';
        updateFields.exportFailureReason = '';
      }

      const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, updateFields);
      syncRepository(updatedRepository);
      setPollingRepos(prev => { const next = new Set(prev); next.delete(repo.id); return next; });
      setPollingExports(prev => { const next = new Set(prev); next.delete(repo.id); return next; });
    } catch (error) {
      showError(`Failed to reset repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
      const shouldUnlock = isGHESMode ? resetExport : true;
      const updateFields: Partial<RepositoryMigration> = {
        state: 'reset',
        migrationSourceId: '',
        repositoryMigrationId: '',
        lockSource: shouldUnlock ? false : (repo.lockSource ?? false),
        repositoryVisibility: 'private',
        failureReason: error instanceof Error ? error.message : 'Error during reset',
      };

      if (resetExport) {
        updateFields.gitSourceExportId = '';
        updateFields.metadataExportId = '';
        updateFields.gitSourceExportState = undefined;
        updateFields.metadataExportState = undefined;
        updateFields.gitSourceArchiveUrl = '';
        updateFields.metadataArchiveUrl = '';
        updateFields.exportFailureReason = '';
      }

      try {
        const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, updateFields);
        syncRepository(updatedRepository);
      } catch { /* swallow secondary error */ }
    }
  }, [isGHESMode, syncRepository, showError]);

  const startMigration = useCallback(async (repo: RepositoryMigration) => {
    try {
      const queuedRepository = await apiClient.updateRepositoryMigration(repo.id, {
        state: 'queued',
        failureReason: '',
      });
      syncRepository(queuedRepository);

      const ghesParams = isGHESMode ? {
        gitSourceArchiveUrl: repo.gitSourceArchiveUrl || undefined,
        metadataArchiveUrl: repo.metadataArchiveUrl || undefined,
      } : {};

      const result = await apiClient.startMigration({
        sourceRepositoryUrl: repo.sourceRepositoryUrl,
        repositoryName: repo.repositoryName,
        targetRepoVisibility: repo.repositoryVisibility || 'private',
        continueOnError: true,
        lockSource: repo.lockSource || false,
        destinationOwnerId: repo.destinationOwnerId || undefined,
        ...ghesParams,
      });

      if (result.success) {
        const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, {
          repositoryMigrationId: result.migrationId,
          migrationSourceId: result.migrationSourceId,
          destinationOwnerId: result.ownerId,
          failureReason: '',
        });
        syncRepository(updatedRepository);
        startPolling(repo.id);
      } else {
        const failedRepository = await apiClient.updateRepositoryMigration(repo.id, {
          state: 'failed',
          failureReason: result.message || 'Failed to start migration',
        });
        syncRepository(failedRepository);
      }
    } catch (error) {
      try {
        const failedRepository = await apiClient.updateRepositoryMigration(repo.id, {
          state: 'failed',
          failureReason: error instanceof Error ? error.message : 'Unknown error',
        });
        syncRepository(failedRepository);
      } catch (updateError) {
        showError(`Failed to record migration failure: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
      }
    }
  }, [isGHESMode, syncRepository, startPolling, showError]);

  const startExport = useCallback(async (repo: RepositoryMigration) => {
    try {
      const match = repo.sourceRepositoryUrl.match(/\/([^\/]+)\/[^\/]+$/);
      if (!match) {
        throw new Error('Could not extract organization name from source URL');
      }
      const organizationName = match[1];

      const pendingRepository = await apiClient.updateRepositoryMigration(repo.id, {
        gitSourceExportState: 'pending',
        metadataExportState: 'pending',
      });
      syncRepository(pendingRepository);

      const result = await apiClient.startExport({
        organizationName,
        repositoryNames: [repo.repositoryName],
        lockSource: repo.lockSource || false,
      });

      if (result.success) {
        const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, {
          gitSourceExportId: String(result.gitSourceExportId),
          metadataExportId: String(result.metadataExportId),
          gitSourceExportState: result.gitSourceExportState as 'pending' | 'exporting' | 'exported' | 'failed',
          metadataExportState: result.metadataExportState as 'pending' | 'exporting' | 'exported' | 'failed',
          exportFailureReason: '',
        });
        syncRepository(updatedRepository);
        startExportPolling(repo.id);
      } else {
        const failedRepository = await apiClient.updateRepositoryMigration(repo.id, {
          gitSourceExportState: 'failed',
          metadataExportState: 'failed',
          exportFailureReason: result.message || 'Failed to start export',
        });
        syncRepository(failedRepository);
      }
    } catch (error) {
      try {
        const failedRepository = await apiClient.updateRepositoryMigration(repo.id, {
          gitSourceExportState: 'failed',
          metadataExportState: 'failed',
          exportFailureReason: error instanceof Error ? error.message : 'Unknown error',
        });
        syncRepository(failedRepository);
      } catch (updateError) {
        showError(`Failed to record export failure: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
      }
    }
  }, [syncRepository, startExportPolling, showError]);

  // --- Polling ---

  const checkMigrationStatus = useCallback(async (repoId: string, migrationId: string) => {
    try {
      const response = await apiClient.checkMigrationStatus(migrationId);
      if (response.success) {
        const state = response.state.toLowerCase();
        const normalizedState = state === 'succeeded' ? 'completed' : state;
        const updatedRepository = await apiClient.updateRepositoryMigration(repoId, {
          state: normalizedState as 'pending' | 'queued' | 'in_progress' | 'completed' | 'failed' | 'reset',
          failureReason: response.failureReason || '',
        });
        syncRepository(updatedRepository);

        if (state === 'failed' || state === 'succeeded' || state === 'completed') {
          setPollingRepos(prev => { const next = new Set(prev); next.delete(repoId); return next; });
        }
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
    }
  }, [syncRepository]);

  const checkExportStatus = useCallback(async (repoId: string, organizationName: string, gitSourceExportId: string, metadataExportId: string) => {
    try {
      const [gitSourceResponse, metadataResponse] = await Promise.all([
        apiClient.checkExportStatus(organizationName, gitSourceExportId),
        apiClient.checkExportStatus(organizationName, metadataExportId),
      ]);

      if (gitSourceResponse.success && metadataResponse.success) {
        const updatedRepository = await apiClient.updateRepositoryMigration(repoId, {
          gitSourceExportState: gitSourceResponse.state as 'pending' | 'exporting' | 'exported' | 'failed',
          metadataExportState: metadataResponse.state as 'pending' | 'exporting' | 'exported' | 'failed',
          gitSourceArchiveUrl: gitSourceResponse.archiveUrl || '',
          metadataArchiveUrl: metadataResponse.archiveUrl || '',
        });
        syncRepository(updatedRepository);

        const gitSourceComplete = gitSourceResponse.state === 'exported' || gitSourceResponse.state === 'failed';
        const metadataComplete = metadataResponse.state === 'exported' || metadataResponse.state === 'failed';

        if (gitSourceComplete && metadataComplete) {
          setPollingExports(prev => { const next = new Set(prev); next.delete(repoId); return next; });
        }
      }
    } catch (error) {
      console.error('Error checking export status:', error);
    }
  }, [syncRepository]);

  // Migration polling
  useEffect(() => {
    if (pollingRepos.size === 0) return;
    const interval = setInterval(() => {
      repositories.forEach(repo => {
        if (pollingRepos.has(repo.id) && repo.repositoryMigrationId) {
          checkMigrationStatus(repo.id, repo.repositoryMigrationId);
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [pollingRepos, repositories, checkMigrationStatus]);

  // Export polling
  useEffect(() => {
    if (pollingExports.size === 0 || !isGHESMode) return;
    const interval = setInterval(() => {
      repositories.forEach(repo => {
        if (pollingExports.has(repo.id) && repo.gitSourceExportId && repo.metadataExportId) {
          const match = repo.sourceRepositoryUrl.match(/\/([^\/]+)\/[^\/]+$/);
          if (match) {
            checkExportStatus(repo.id, match[1], repo.gitSourceExportId, repo.metadataExportId);
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [pollingExports, repositories, checkExportStatus, isGHESMode]);

  // --- Bulk operations (using Promise.allSettled) ---

  const handleStartSelected = useCallback(async (selectedRepos: Set<string>) => {
    const selectedRepoObjects = repositories.filter(r =>
      selectedRepos.has(r.id) && (r.state === 'pending' || r.state === 'reset')
    );

    const results = await Promise.allSettled(
      selectedRepoObjects.map(repo => {
        if (isGHESMode) {
          const exportsCompleted = repo.gitSourceExportState === 'exported' && repo.metadataExportState === 'exported';
          return exportsCompleted ? startMigration(repo) : startExport(repo);
        }
        return startMigration(repo);
      })
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      showError(`${failures.length} of ${results.length} operations failed`);
    }
  }, [repositories, isGHESMode, startMigration, startExport, showError]);

  const handleResetSelected = useCallback(async (selectedRepos: Set<string>, resetExport: boolean = false) => {
    const selectedRepoObjects = repositories.filter(r => {
      if (!selectedRepos.has(r.id)) return false;
      if (!isGHESMode) return r.state !== 'pending' && r.state !== 'reset';
      if (r.state === 'pending' || r.state === 'reset') {
        return r.gitSourceExportState === 'exported' && r.metadataExportState === 'exported';
      }
      return true;
    });

    const results = await Promise.allSettled(
      selectedRepoObjects.map(repo => resetRepository(repo, resetExport))
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      showError(`${failures.length} of ${results.length} reset operations failed`);
    }
  }, [repositories, isGHESMode, resetRepository, showError]);

  const handleBulkSettingsUpdate = useCallback(async (selectedRepos: Set<string>, lockSource: boolean, repositoryVisibility: RepoVisibility) => {
    const selectedRepoObjects = repositories.filter(r =>
      selectedRepos.has(r.id) && (r.state === 'pending' || r.state === 'reset')
    );

    const results = await Promise.allSettled(
      selectedRepoObjects.map(repo => updateRepositorySettings(repo, lockSource, repositoryVisibility))
    );

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      showError(`${failures.length} of ${results.length} settings updates failed`);
    }
  }, [repositories, updateRepositorySettings, showError]);

  const handleArchiveSelected = useCallback(async (selectedRepos: Set<string>) => {
    const selectedRepoObjects = repositories.filter(r => selectedRepos.has(r.id));
    const results = await Promise.allSettled(
      selectedRepoObjects.map(repo => archiveRepository(repo))
    );
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      showError(`${failures.length} of ${results.length} archive operations failed`);
    }
  }, [repositories, archiveRepository, showError]);

  const handleUnarchiveSelected = useCallback(async (selectedRepos: Set<string>) => {
    const selectedRepoObjects = repositories.filter(r => selectedRepos.has(r.id));
    const results = await Promise.allSettled(
      selectedRepoObjects.map(repo => unarchiveRepository(repo))
    );
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      showError(`${failures.length} of ${results.length} unarchive operations failed`);
    }
  }, [repositories, unarchiveRepository, showError]);

  const handleDeleteSelected = useCallback(async (selectedRepos: Set<string>) => {
    const selectedRepoObjects = repositories.filter(r => selectedRepos.has(r.id));
    const results = await Promise.allSettled(
      selectedRepoObjects.map(repo => deleteRepository(repo.id))
    );
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      showError(`${failures.length} of ${results.length} delete operations failed`);
    }
  }, [repositories, deleteRepository, showError]);

  // --- CSV and Org Scan ---

  const handleCSVUpload = useCallback(async (text: string) => {
    const rows = parseCSV(text);
    let added = 0;
    let skipped = 0;

    for (const row of rows) {
      const existingRepo = repositories.find(r => r.sourceRepositoryUrl === row.sourceRepoUrl);
      if (existingRepo) {
        skipped++;
        continue;
      }

      try {
        const repository = await apiClient.createRepositoryMigration({
          sourceRepositoryUrl: row.sourceRepoUrl,
          repositoryName: row.repoName,
          state: 'pending',
          lockSource: row.lockSource,
          repositoryVisibility: row.repositoryVisibility,
          archived: false,
        });
        syncRepository(repository);
        added++;
      } catch (error) {
        showError(`Failed to add ${row.repoName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { added, skipped };
  }, [repositories, syncRepository, showError]);

  const handleScanOrg = useCallback(async (orgName: string, repositoryVisibility: string, lockSource: boolean) => {
    try {
      const result = await apiClient.scanSourceOrg(orgName);

      if (result.success && result.repositories) {
        let addedCount = 0;
        let skippedCount = 0;

        for (const repo of result.repositories) {
          const existingRepo = repositories.find(r => r.sourceRepositoryUrl === repo.html_url);
          if (existingRepo) {
            skippedCount++;
            continue;
          }

          const createdRepository = await apiClient.createRepositoryMigration({
            sourceRepositoryUrl: repo.html_url,
            repositoryName: repo.name,
            state: 'pending',
            lockSource,
            repositoryVisibility: repositoryVisibility as 'private' | 'public' | 'internal',
            archived: false,
          });
          syncRepository(createdRepository);
          addedCount++;
        }

        return { success: true, addedCount, skippedCount };
      }
      showError('Failed to scan organization');
      return { success: false, addedCount: 0, skippedCount: 0 };
    } catch (error) {
      showError(`Error scanning organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false, addedCount: 0, skippedCount: 0 };
    }
  }, [repositories, syncRepository, showError]);

  return {
    repositories,
    runtimeConfig,
    targetOrganization,
    targetDescription,
    sourceDescription,
    mode,
    isGHESMode,
    errorMessage,
    dismissError,

    addRepository,
    deleteRepository,
    archiveRepository,
    unarchiveRepository,
    updateRepositorySettings,
    resetRepository,
    startMigration,
    startExport,

    handleStartSelected,
    handleResetSelected,
    handleBulkSettingsUpdate,
    handleArchiveSelected,
    handleUnarchiveSelected,
    handleDeleteSelected,
    handleCSVUpload,
    handleScanOrg,
  };
}
