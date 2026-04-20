"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  apiClient,
  getRuntimeConfig,
  type RepositoryMigration,
  type RuntimeConfig,
  type RepoVisibility,
} from "@/lib/api";
import { parseCSV } from "@/lib/csvParser";
import { useWebSocket, type MigrationUpdate, type ExportUpdate, type RepositoryUpdate } from "./useWebSocket";

export function useRepositoryMigrations() {
  const [repositories, setRepositories] = useState<RepositoryMigration[]>([]);
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
        errorTimerRef.current = null;
      }
      setErrorMessage(null);
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

  // WebSocket callbacks for real-time updates
  const webSocketCallbacks = useMemo(() => ({
    onMigrationUpdate: (update: MigrationUpdate) => {
      console.log('Processing migration update:', update);
      setRepositories((currentRepositories) => {
        return currentRepositories.map((repo) => {
          if (repo.id === update.repoId) {
            console.log(`Updating repo ${repo.repositoryName} state from ${repo.state} to ${update.state}`);
            return { 
              ...repo, 
              state: update.state, 
              failureReason: update.failureReason || '' 
            };
          }
          return repo;
        });
      });
    },

    onExportUpdate: (update: ExportUpdate) => {
      console.log('Processing export update:', update);
      setRepositories((currentRepositories) => {
        return currentRepositories.map((repo) => {
          if (repo.id === update.repoId) {
            console.log(`Updating export states for repo ${repo.repositoryName}`);
            return {
              ...repo,
              gitSourceExportState: update.gitSourceExportState || repo.gitSourceExportState,
              metadataExportState: update.metadataExportState || repo.metadataExportState,
              gitSourceArchiveUrl: update.gitSourceArchiveUrl || repo.gitSourceArchiveUrl,
              metadataArchiveUrl: update.metadataArchiveUrl || repo.metadataArchiveUrl,
            };
          }
          return repo;
        });
      });
    },

    onRepositoryUpdate: (update: RepositoryUpdate) => {
      console.log('Processing repository update:', update);
      syncRepository(update.repository);
    },
  }), [syncRepository]);

  // Initialize WebSocket connection with callbacks
  const webSocket = useWebSocket(webSocketCallbacks);
  
  // Track subscribed IDs to avoid duplicate subscriptions
  const subscribedMigrationIds = useRef(new Set<string>());
  const subscribedExportIds = useRef(new Set<string>());

  // Subscribe to active migrations and exports when repositories change
  useEffect(() => {
    const currentMigrationIds = new Set<string>();
    const currentExportIds = new Set<string>();

    // Collect IDs that should be subscribed
    repositories.forEach(repo => {
      // Collect migration IDs that should be subscribed
      if ((repo.state === 'in_progress' || repo.state === 'queued') && repo.repositoryMigrationId) {
        currentMigrationIds.add(repo.repositoryMigrationId);
      }

      // Collect export IDs that should be subscribed (GHES mode)
      if (isGHESMode) {
        const gitSourceInProgress = repo.gitSourceExportState === 'pending' || repo.gitSourceExportState === 'exporting';
        const metadataInProgress = repo.metadataExportState === 'pending' || repo.metadataExportState === 'exporting';

        if (gitSourceInProgress || metadataInProgress) {
          currentExportIds.add(repo.id);
        }
      }
    });

    // Subscribe to new migrations
    currentMigrationIds.forEach(migrationId => {
      if (!subscribedMigrationIds.current.has(migrationId)) {
        console.log('Subscribing to new migration:', migrationId);
        webSocket.subscribeToMigration(migrationId);
        subscribedMigrationIds.current.add(migrationId);
      }
    });

    // Subscribe to new exports
    currentExportIds.forEach(exportId => {
      if (!subscribedExportIds.current.has(exportId)) {
        console.log('Subscribing to new export:', exportId);
        webSocket.subscribeToExport(exportId);
        subscribedExportIds.current.add(exportId);
      }
    });

    // Unsubscribe from removed migrations
    subscribedMigrationIds.current.forEach(migrationId => {
      if (!currentMigrationIds.has(migrationId)) {
        console.log('Unsubscribing from migration:', migrationId);
        webSocket.unsubscribeFromMigration(migrationId);
        subscribedMigrationIds.current.delete(migrationId);
      }
    });

    // Unsubscribe from removed exports
    subscribedExportIds.current.forEach(exportId => {
      if (!currentExportIds.has(exportId)) {
        console.log('Unsubscribing from export:', exportId);
        webSocket.unsubscribeFromExport(exportId);
        subscribedExportIds.current.delete(exportId);
      }
    });
  }, [repositories, webSocket, isGHESMode]);

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
      // Only attempt to delete target repository if migration was actually started
      // (repositoryMigrationId exists). If export failed before migration started,
      // there's no target repository to delete.
      if (repo.repositoryMigrationId && repo.repositoryName) {
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
        updateFields.gitSourceExportState = ''; // Clear export state - empty string represents reset state
        updateFields.metadataExportState = ''; // Clear export state - empty string represents reset state
        updateFields.gitSourceArchiveUrl = '';
        updateFields.metadataArchiveUrl = '';
        updateFields.exportFailureReason = '';
      }

      const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, updateFields);
      syncRepository(updatedRepository);
      
      // Unsubscribe from WebSocket updates
      if (repo.repositoryMigrationId) {
        webSocket.unsubscribeFromMigration(repo.repositoryMigrationId);
      }
      webSocket.unsubscribeFromExport(repo.id);
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
  }, [isGHESMode, syncRepository, webSocket, showError]);

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
        
        // Subscribe to WebSocket updates for this migration
        webSocket.subscribeToMigration(result.migrationId);
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
  }, [isGHESMode, syncRepository, webSocket, showError]);

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
          exportPolling: true, // Enable export polling specifically
        });
        syncRepository(updatedRepository);
        
        // Subscribe to WebSocket updates for this export
        webSocket.subscribeToExport(repo.id);
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
  }, [syncRepository, webSocket, showError]);

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
    isWebSocketConnected: webSocket.isConnected,

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
