"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  apiClient,
  getRuntimeConfig,
  type RepositoryMigration,
  type RuntimeConfig,
} from "@/lib/api";
import AddRepoModal from "@/components/modals/AddRepoModal";
import BulkSettingsModal from "@/components/modals/BulkSettingsModal";
import DeleteSelectedConfirmationModal from "@/components/modals/DeleteSelectedConfirmationModal";
import EnvironmentInfoModal from "@/components/modals/EnvironmentInfoModal";
import ExportDetailsModal from "@/components/modals/ExportDetailsModal";
import FailureModal from "@/components/modals/FailureModal";
import InfoModal from "@/components/modals/InfoModal";
import ResetConfirmationModal from "@/components/modals/ResetConfirmationModal";
import ScanOrgModal from "@/components/modals/ScanOrgModal";
import SettingsModal from "@/components/modals/SettingsModal";
import "./github.css";

// All modal components are in @/components/modals/

export default function App() {
  const [repositories, setRepositories] = useState<RepositoryMigration[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanOrgModal, setShowScanOrgModal] = useState(false);
  const [infoRepo, setInfoRepo] = useState<RepositoryMigration | null>(null);
  const [exportInfoRepo, setExportInfoRepo] = useState<RepositoryMigration | null>(null);
  const [settingsRepo, setSettingsRepo] = useState<RepositoryMigration | null>(null);
  const [resetRepo, setResetRepo] = useState<RepositoryMigration | null>(null);
  const [failureInfo, setFailureInfo] = useState<string | null>(null);
  const [pollingRepos, setPollingRepos] = useState<Set<string>>(new Set());
  const pollingReposRef = useRef<Set<string>>(new Set());
  const [pollingExports, setPollingExports] = useState<Set<string>>(new Set());
  const pollingExportsRef = useRef<Set<string>>(new Set());
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [showBulkSettingsModal, setShowBulkSettingsModal] = useState(false);
  const [showBulkResetConfirmation, setShowBulkResetConfirmation] = useState(false);
  const [showDeleteSelectedConfirmation, setShowDeleteSelectedConfirmation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showArchiveView, setShowArchiveView] = useState(false);
  const [showEnvironmentInfoModal, setShowEnvironmentInfoModal] = useState(false);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const targetOrganization = runtimeConfig?.targetOrganization || 'Not configured';
  const targetDescription = runtimeConfig?.targetDescription || 'Not configured';
  const sourceDescription = runtimeConfig?.sourceDescription || 'Not configured';
  const mode = runtimeConfig?.mode || 'GH';
  const isGHESMode = mode === 'GHES';

  const refreshRepositories = useCallback(async () => {
    try {
      const nextRepositories = await apiClient.listRepositoryMigrations(true);
      setRepositories(nextRepositories);
    } catch (error) {
      console.error('Error loading repositories:', error);
    }
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

  // Keep ref in sync with state
  useEffect(() => {
    pollingReposRef.current = pollingRepos;
  }, [pollingRepos]);

  // Keep export polling ref in sync with state
  useEffect(() => {
    pollingExportsRef.current = pollingExports;
  }, [pollingExports]);

  // Define startPolling before it's used in effects
  const startPolling = useCallback((repoId: string) => {
    setPollingRepos(prev => new Set(prev).add(repoId));
  }, []);

  // Define startExportPolling before it's used
  const startExportPolling = useCallback((repoId: string) => {
    setPollingExports(prev => new Set(prev).add(repoId));
  }, []);

  useEffect(() => {
    let isMounted = true;

    void getRuntimeConfig().then((nextRuntimeConfig) => {
      if (isMounted) {
        setRuntimeConfig(nextRuntimeConfig);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    void refreshRepositories();
  }, [refreshRepositories]);

  // Resume polling for repositories that are in progress or queued on page load/refresh
  useEffect(() => {
    repositories.forEach(repo => {
      // Start polling for repositories that are in_progress or queued and have a repositoryMigrationId
      // Check ref to avoid unnecessary state updates
      if ((repo.state === 'in_progress' || repo.state === 'queued') && repo.repositoryMigrationId && !pollingReposRef.current.has(repo.id)) {
        startPolling(repo.id);
      }
      
      // Start export polling for repositories with exports in progress
      if (isGHESMode && repo.gitSourceExportId && repo.metadataExportId && !pollingExportsRef.current.has(repo.id)) {
        const gitSourceInProgress = repo.gitSourceExportState === 'pending' || repo.gitSourceExportState === 'exporting';
        const metadataInProgress = repo.metadataExportState === 'pending' || repo.metadataExportState === 'exporting';
        
        if (gitSourceInProgress || metadataInProgress) {
          // Extract organization name from source URL
          const match = repo.sourceRepositoryUrl.match(/\/([^\/]+)\/[^\/]+$/);
          if (match) {
            startExportPolling(repo.id);
          }
        }
      }
    });
  }, [repositories, startPolling, startExportPolling, isGHESMode]);

  // Keep settingsRepo in sync with repositories array when data changes
  useEffect(() => {
    if (settingsRepo) {
      const updatedRepo = repositories.find(r => r.id === settingsRepo.id);
      if (updatedRepo) {
        setSettingsRepo(updatedRepo);
      }
    }
  }, [repositories, settingsRepo]);

  const addRepository = async (url: string, name: string, lockSource: boolean, repositoryVisibility: string) => {
    const repository = await apiClient.createRepositoryMigration({
      sourceRepositoryUrl: url,
      repositoryName: name,
      state: 'pending',
      lockSource,
      repositoryVisibility,
      archived: false,
    });

    syncRepository(repository);
  };

  const deleteRepository = async (id: string) => {
    await apiClient.deleteRepositoryMigration(id);
    removeRepositoryFromState(id);
  };

  const archiveRepository = async (repo: RepositoryMigration) => {
    const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, {
      archived: true,
    });

    syncRepository(updatedRepository);
  };

  const unarchiveRepository = async (repo: RepositoryMigration) => {
    const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, {
      archived: false,
    });

    syncRepository(updatedRepository);
  };

  const updateRepositorySettings = async (repo: RepositoryMigration, lockSource: boolean, repositoryVisibility: string) => {
    const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, {
      lockSource,
      repositoryVisibility,
    });

    syncRepository(updatedRepository);
  };

  const resetRepository = async (repo: RepositoryMigration, resetExport: boolean = false) => {
    try {
      // Delete target repository if migration was started
      if (repo.repositoryName) {
        console.log('Deleting target repository:', repo.repositoryName);
        const deleteResult = await apiClient.deleteTargetRepo(repo.repositoryName);
        console.log('Delete result:', deleteResult);
      }

      // In GHES mode, only unlock if resetExport is true
      // In GH mode, always unlock
      const shouldUnlock = isGHESMode ? resetExport : true;
      
      // Unlock source repository if it was locked
      // In GHES mode (after export), we only need sourceRepositoryUrl
      // In GH mode (after migration), we need migrationSourceId and repositoryName as well
      if (shouldUnlock && repo.lockSource && repo.sourceRepositoryUrl) {
        // Only call unlock if we have the required fields based on the mode and state
        const hasRequiredFields = isGHESMode 
          ? true  // In GHES mode, sourceRepositoryUrl is sufficient
          : (repo.migrationSourceId && repo.repositoryName); // In GH mode, need migration fields
        
        if (hasRequiredFields) {
          console.log('Unlocking source repository:', repo.sourceRepositoryUrl);
          const unlockResult = await apiClient.unlockSourceRepo({
            sourceRepositoryUrl: repo.sourceRepositoryUrl,
            migrationSourceId: repo.migrationSourceId || '',
            repositoryName: repo.repositoryName || '',
          });
          console.log('Unlock result:', unlockResult);
        }
      }

      // Update the repository record
      const updateFields: {
        state: string;
        migrationSourceId: string;
        repositoryMigrationId: string;
        lockSource: boolean;
        repositoryVisibility: string;
        failureReason: string;
        gitSourceExportId?: string;
        metadataExportId?: string;
        gitSourceExportState?: string;
        metadataExportState?: string;
        gitSourceArchiveUrl?: string;
        metadataArchiveUrl?: string;
        exportFailureReason?: string;
      } = {
        state: 'reset',
        migrationSourceId: '',
        repositoryMigrationId: '',
        lockSource: shouldUnlock ? false : (repo.lockSource ?? false), // Keep lockSource if not unlocking in GHES mode
        repositoryVisibility: 'private', // Reset to default
        failureReason: '',
      };

      // If resetExport is true, also clear export fields
      if (resetExport) {
        updateFields.gitSourceExportId = '';
        updateFields.metadataExportId = '';
        updateFields.gitSourceExportState = '';
        updateFields.metadataExportState = '';
        updateFields.gitSourceArchiveUrl = '';
        updateFields.metadataArchiveUrl = '';
        updateFields.exportFailureReason = '';
      }

      const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, updateFields);
      syncRepository(updatedRepository);
      setPollingRepos((currentPollingRepos) => {
        const nextPollingRepos = new Set(currentPollingRepos);
        nextPollingRepos.delete(repo.id);
        return nextPollingRepos;
      });
      setPollingExports((currentPollingExports) => {
        const nextPollingExports = new Set(currentPollingExports);
        nextPollingExports.delete(repo.id);
        return nextPollingExports;
      });

      console.log('Repository reset successfully');
    } catch (error) {
      console.error('Error resetting repository:', error);
      // Still update the state even if the API calls failed
      const shouldUnlock = isGHESMode ? resetExport : true;
      const updateFields: {
        state: string;
        migrationSourceId: string;
        repositoryMigrationId: string;
        lockSource: boolean;
        repositoryVisibility: string;
        failureReason: string;
        gitSourceExportId?: string;
        metadataExportId?: string;
        gitSourceExportState?: string;
        metadataExportState?: string;
        gitSourceArchiveUrl?: string;
        metadataArchiveUrl?: string;
        exportFailureReason?: string;
      } = {
        state: 'reset',
        migrationSourceId: '',
        repositoryMigrationId: '',
        lockSource: shouldUnlock ? false : (repo.lockSource ?? false), // Keep lockSource if not unlocking in GHES mode
        repositoryVisibility: 'private', // Reset to default
        failureReason: error instanceof Error ? error.message : 'Error during reset',
      };

      if (resetExport) {
        updateFields.gitSourceExportId = '';
        updateFields.metadataExportId = '';
        updateFields.gitSourceExportState = '';
        updateFields.metadataExportState = '';
        updateFields.gitSourceArchiveUrl = '';
        updateFields.metadataArchiveUrl = '';
        updateFields.exportFailureReason = '';
      }

      const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, updateFields);
      syncRepository(updatedRepository);
    }
  };

  const startMigration = async (repo: RepositoryMigration) => {
    try {
      // Optimistic update: Set state to queued immediately for user feedback
      const queuedRepository = await apiClient.updateRepositoryMigration(repo.id, {
        state: 'queued',
        failureReason: '',
      });
      syncRepository(queuedRepository);

      // For GHES mode, pass archive URLs
      const ghesParams = isGHESMode ? {
        gitSourceArchiveUrl: repo.gitSourceArchiveUrl || undefined,
        metadataArchiveUrl: repo.metadataArchiveUrl || undefined,
      } : {};

      // Call the startMigration function
      // Pass destinationOwnerId if it exists to skip the API call to fetch it
      const result = await apiClient.startMigration({
        sourceRepositoryUrl: repo.sourceRepositoryUrl,
        repositoryName: repo.repositoryName,
        targetRepoVisibility: repo.repositoryVisibility || 'private',
        continueOnError: true,
        lockSource: repo.lockSource || false,
        destinationOwnerId: repo.destinationOwnerId || undefined,
        ...ghesParams,
      });

      console.log('Migration started:', result);

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
      console.error('Error starting migration:', error);
      const failedRepository = await apiClient.updateRepositoryMigration(repo.id, {
        state: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });
      syncRepository(failedRepository);
    }
  };

  const startExport = async (repo: RepositoryMigration) => {
    try {
      // Extract organization name from source URL
      const match = repo.sourceRepositoryUrl.match(/\/([^\/]+)\/[^\/]+$/);
      if (!match) {
        throw new Error('Could not extract organization name from source URL');
      }
      const organizationName = match[1];

      // Optimistic update: Set export states to pending
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

      console.log('Export started:', result);

        if (result.success) {
          const updatedRepository = await apiClient.updateRepositoryMigration(repo.id, {
            gitSourceExportId: String(result.gitSourceExportId),
            metadataExportId: String(result.metadataExportId),
            gitSourceExportState: result.gitSourceExportState,
            metadataExportState: result.metadataExportState,
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
      console.error('Error starting export:', error);
        const failedRepository = await apiClient.updateRepositoryMigration(repo.id, {
        gitSourceExportState: 'failed',
        metadataExportState: 'failed',
        exportFailureReason: error instanceof Error ? error.message : 'Unknown error',
      });
        syncRepository(failedRepository);
    }
  };

  const checkMigrationStatus = useCallback(async (repoId: string, migrationId: string) => {
    try {
        const response = await apiClient.checkMigrationStatus(migrationId);

        if (response.success) {
          const state = response.state.toLowerCase();
          const normalizedState = state === 'succeeded' ? 'completed' : state;
          const updatedRepository = await apiClient.updateRepositoryMigration(repoId, {
            state: normalizedState,
            failureReason: response.failureReason || '',
          });
          syncRepository(updatedRepository);

          if (state === 'failed' || state === 'succeeded' || state === 'completed') {
            setPollingRepos(prev => {
              const newSet = new Set(prev);
              newSet.delete(repoId);
              return newSet;
            });
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
            gitSourceExportState: gitSourceResponse.state,
            metadataExportState: metadataResponse.state,
            gitSourceArchiveUrl: gitSourceResponse.archiveUrl || '',
            metadataArchiveUrl: metadataResponse.archiveUrl || '',
          });
          syncRepository(updatedRepository);

          const gitSourceComplete = gitSourceResponse.state === 'exported' || gitSourceResponse.state === 'failed';
          const metadataComplete = metadataResponse.state === 'exported' || metadataResponse.state === 'failed';

          if (gitSourceComplete && metadataComplete) {
            setPollingExports(prev => {
              const newSet = new Set(prev);
              newSet.delete(repoId);
              return newSet;
            });
          }
      }
    } catch (error) {
      console.error('Error checking export status:', error);
    }
  }, [syncRepository]);

  // Polling effect
  useEffect(() => {
    if (pollingRepos.size === 0) return;

    const interval = setInterval(() => {
      repositories.forEach(repo => {
        if (pollingRepos.has(repo.id) && repo.repositoryMigrationId) {
          checkMigrationStatus(repo.id, repo.repositoryMigrationId);
        }
      });
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [pollingRepos, repositories, checkMigrationStatus]);

  // Export polling effect
  useEffect(() => {
    if (pollingExports.size === 0 || !isGHESMode) return;

    const interval = setInterval(() => {
      repositories.forEach(repo => {
        if (pollingExports.has(repo.id) && repo.gitSourceExportId && repo.metadataExportId) {
          // Extract organization name from source URL
          const match = repo.sourceRepositoryUrl.match(/\/([^\/]+)\/[^\/]+$/);
          if (match) {
            const organizationName = match[1];
            checkExportStatus(repo.id, organizationName, repo.gitSourceExportId, repo.metadataExportId);
          }
        }
      });
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [pollingExports, repositories, checkExportStatus, isGHESMode]);

  const getMigrationButtonClass = (state?: string | null) => {
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
  };

  const getMigrationButtonText = (state?: string | null) => {
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
  };

  const getStatusButtonClass = (state?: string | null, exportState?: { git?: string | null; metadata?: string | null }) => {
    // For GHES mode, check export states first
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
  };

  const getStatusButtonText = (state?: string | null, exportState?: { git?: string | null; metadata?: string | null }) => {
    // For GHES mode, check export states first
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
      
      // Both exports completed, show Start Migration
      if (gitExported && metadataExported) {
        // If migration already started, show its state
        if (state && state !== 'pending' && state !== 'reset') {
          // Fall through to migration state handling
        } else {
          return 'Start Migration';
        }
      } else {
        // Exports not complete
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
  };

  const canStartMigration = (repo: RepositoryMigration) => {
    if (!isGHESMode) return true;
    
    // In GHES mode, both exports must be completed
    return repo.gitSourceExportState === 'exported' && 
           repo.metadataExportState === 'exported' &&
           !!repo.gitSourceArchiveUrl &&
           !!repo.metadataArchiveUrl;
  };

  const getExportButtonClass = (repo: RepositoryMigration) => {
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
  };

  const getExportButtonText = (repo: RepositoryMigration) => {
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
  };

  const handleExportButtonClick = (repo: RepositoryMigration) => {
    const gitExported = repo.gitSourceExportState === 'exported';
    const metadataExported = repo.metadataExportState === 'exported';
    const gitExporting = repo.gitSourceExportState === 'pending' || repo.gitSourceExportState === 'exporting';
    const metadataExporting = repo.metadataExportState === 'pending' || repo.metadataExportState === 'exporting';
    const gitFailed = repo.gitSourceExportState === 'failed';
    const metadataFailed = repo.metadataExportState === 'failed';
    
    // If export is in progress, failed, or completed, show details
    if (gitExporting || metadataExporting || gitFailed || metadataFailed || (gitExported && metadataExported)) {
      setExportInfoRepo(repo);
    } else {
      // Otherwise start the export
      startExport(repo);
    }
  };

  const handleMigrationButtonClick = (repo: RepositoryMigration) => {
    // If migration not started, start it
    if (!repo.state || repo.state === 'pending' || repo.state === 'reset') {
      startMigration(repo);
    } else {
      // Otherwise show migration details
      setInfoRepo(repo);
    }
  };

  const handleStatusButtonClick = (repo: RepositoryMigration) => {
    const exportState = isGHESMode ? {
      git: repo.gitSourceExportState,
      metadata: repo.metadataExportState,
    } : undefined;
    
    // For GHES mode, handle export states
    if (isGHESMode && exportState) {
      const gitExporting = exportState.git === 'pending' || exportState.git === 'exporting';
      const metadataExporting = exportState.metadata === 'pending' || exportState.metadata === 'exporting';
      
      if (gitExporting || metadataExporting) {
        // Show info modal during export
        setInfoRepo(repo);
        return;
      }
      
      const gitFailed = exportState.git === 'failed';
      const metadataFailed = exportState.metadata === 'failed';
      
      if (gitFailed || metadataFailed) {
        // Show info modal for export failure
        setInfoRepo(repo);
        return;
      }
      
      const gitExported = exportState.git === 'exported';
      const metadataExported = exportState.metadata === 'exported';
      
      // If both exports completed and migration not started, start migration
      if (gitExported && metadataExported && (!repo.state || repo.state === 'pending' || repo.state === 'reset')) {
        startMigration(repo);
        return;
      }
      
      // If exports not complete, start export
      if (!gitExported || !metadataExported) {
        if (!repo.state || repo.state === 'pending' || repo.state === 'reset') {
          startExport(repo);
          return;
        }
      }
    }
    
    // Non-GHES mode or migration already started
    if (!repo.state || repo.state === 'pending' || repo.state === 'reset') {
      startMigration(repo);
    } else {
      // Otherwise, show the info modal
      setInfoRepo(repo);
    }
  };

  // CSV handling
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header line if it exists
      const dataLines = lines[0].toLowerCase().includes('source_repo_url') ? lines.slice(1) : lines;
      
      for (const line of dataLines) {
        const [sourceRepoUrl, repoVisibility, lockSourceStr] = line.split(',').map(s => s.trim());
        if (sourceRepoUrl) {
          // Check if repository already exists in the database
          const existingRepo = repositories.find(r => r.sourceRepositoryUrl === sourceRepoUrl);
          if (existingRepo) {
            console.log(`Skipping ${sourceRepoUrl} - already exists in database`);
            continue;
          }
          
          // Extract repo name from URL
          const match = sourceRepoUrl.match(/github\.com\/[^\/]+\/([^\/]+)/);
          const repoName = match ? match[1].replace(/\.git$/, '') : '';
          
          if (repoName) {
            const lockSource = lockSourceStr?.toLowerCase() === 'true';
            const visibility = repoVisibility || 'private';

            const repository = await apiClient.createRepositoryMigration({
              sourceRepositoryUrl: sourceRepoUrl,
              repositoryName: repoName,
              state: 'pending',
              lockSource,
              repositoryVisibility: visibility,
              archived: false,
            });
            syncRepository(repository);
          }
        }
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be uploaded again
    event.target.value = '';
  };

  const handleScanOrg = async (orgName: string, repositoryVisibility: string, lockSource: boolean) => {
    try {
      console.log(`Scanning organization: ${orgName}`);

      const result = await apiClient.scanSourceOrg(orgName);

      console.log('Scan result:', result);

      if (result.success && result.repositories) {
        console.log(`Found ${result.repositories.length} repositories`);

        let addedCount = 0;
        let skippedCount = 0;

        for (const repo of result.repositories) {
          const existingRepo = repositories.find(r => r.sourceRepositoryUrl === repo.html_url);
          if (existingRepo) {
            console.log(`Skipping ${repo.name} - already exists in database`);
            skippedCount++;
            continue;
          }

          const createdRepository = await apiClient.createRepositoryMigration({
            sourceRepositoryUrl: repo.html_url,
            repositoryName: repo.name,
            state: 'pending',
            lockSource,
            repositoryVisibility,
            archived: false,
          });
          syncRepository(createdRepository);
          addedCount++;
        }

        console.log(`Added ${addedCount} repositories, skipped ${skippedCount} existing repositories`);
        alert(`Successfully scanned ${orgName}!\nAdded: ${addedCount} repositories\nSkipped: ${skippedCount} existing repositories`);
      } else {
        console.error('Scan failed:', result);
        alert('Failed to scan organization');
      }
      
      setShowScanOrgModal(false);
    } catch (error) {
      console.error('Error scanning organization:', error);
      alert(`Error scanning organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRepos(new Set(filteredRepositories.map(r => r.id)));
    } else {
      setSelectedRepos(new Set());
    }
  };

  const handleSelectRepo = (repoId: string, checked: boolean) => {
    const newSelected = new Set(selectedRepos);
    if (checked) {
      newSelected.add(repoId);
    } else {
      newSelected.delete(repoId);
    }
    setSelectedRepos(newSelected);
  };

  const handleStartSelected = async () => {
    const selectedRepoObjects = repositories.filter(r => 
      selectedRepos.has(r.id) && (r.state === 'pending' || r.state === 'reset')
    );
    
    for (const repo of selectedRepoObjects) {
      // In GHES mode, check if we need to start export first
      if (isGHESMode) {
        const gitExported = repo.gitSourceExportState === 'exported';
        const metadataExported = repo.metadataExportState === 'exported';
        const exportsCompleted = gitExported && metadataExported;
        
        if (!exportsCompleted) {
          // Start export if not yet completed
          await startExport(repo);
        } else {
          // Exports are completed, start migration
          await startMigration(repo);
        }
      } else {
        // GH mode: directly start migration
        await startMigration(repo);
      }
    }
  };

  const handleResetSelected = async (resetExport: boolean = false) => {
    const selectedRepoObjects = repositories.filter(r => {
      if (!selectedRepos.has(r.id)) return false;
      
      // In GH mode: exclude 'pending' and 'reset' states
      if (!isGHESMode) {
        return r.state !== 'pending' && r.state !== 'reset';
      }
      
      // In GHES mode: allow reset if exports are completed, even if state is 'pending' or 'reset'
      if (r.state === 'pending' || r.state === 'reset') {
        const exportsCompleted = r.gitSourceExportState === 'exported' && 
                                 r.metadataExportState === 'exported';
        return exportsCompleted;
      }
      
      // For other states in GHES mode, allow reset
      return true;
    });
    
    for (const repo of selectedRepoObjects) {
      await resetRepository(repo, resetExport);
    }
  };

  const handleBulkSettingsUpdate = async (lockSource: boolean, repositoryVisibility: string) => {
    const selectedRepoObjects = repositories.filter(r => 
      selectedRepos.has(r.id) && (r.state === 'pending' || r.state === 'reset')
    );
    
    for (const repo of selectedRepoObjects) {
      await updateRepositorySettings(repo, lockSource, repositoryVisibility);
    }
  };

  const handleArchiveSelected = async () => {
    const selectedRepoObjects = repositories.filter(r => selectedRepos.has(r.id));
    
    for (const repo of selectedRepoObjects) {
      await archiveRepository(repo);
    }
    
    setSelectedRepos(new Set());
  };

  const handleUnarchiveSelected = async () => {
    const selectedRepoObjects = repositories.filter(r => selectedRepos.has(r.id));
    
    for (const repo of selectedRepoObjects) {
      await unarchiveRepository(repo);
    }
    
    setSelectedRepos(new Set());
  };

  const handleDeleteSelected = async () => {
    const selectedRepoObjects = repositories.filter(r => selectedRepos.has(r.id));
    
    for (const repo of selectedRepoObjects) {
      await deleteRepository(repo.id);
    }
    
    setSelectedRepos(new Set());
  };

  const canStartSelected = Array.from(selectedRepos).some(id => {
    const repo = repositories.find(r => r.id === id);
    return repo && (repo.state === 'pending' || repo.state === 'reset');
  });

  const canResetSelected = Array.from(selectedRepos).some(id => {
    const repo = repositories.find(r => r.id === id);
    if (!repo || repo.archived) return false;
    
    // In GH mode: can reset if state is not 'pending' or 'reset'
    if (!isGHESMode) {
      return repo.state !== 'pending' && repo.state !== 'reset';
    }
    
    // In GHES mode: apply the same logic as individual Reset button
    // Can reset if:
    // 1. State is 'reset' AND both exports are 'exported'
    // 2. State is 'pending' AND both exports are 'exported' (not pending/exporting)
    // 3. State is anything else (completed, failed, in_progress)
    
    if (repo.state === 'reset') {
      // Only enable if both exports are exported
      return repo.gitSourceExportState === 'exported' && 
             repo.metadataExportState === 'exported';
    }
    
    if (repo.state === 'pending') {
      // Only enable if exports are completed (not pending or exporting)
      const gitExported = repo.gitSourceExportState === 'exported';
      const metadataExported = repo.metadataExportState === 'exported';
      const exportsCompleted = gitExported && metadataExported;
      
      // Disable if exports are pending or in progress
      const exportsInProgress = 
        !repo.gitSourceExportState || 
        !repo.metadataExportState ||
        repo.gitSourceExportState === 'pending' ||
        repo.metadataExportState === 'pending' ||
        repo.gitSourceExportState === 'exporting' ||
        repo.metadataExportState === 'exporting';
      
      return !exportsInProgress && exportsCompleted;
    }
    
    // For other states (completed, failed, in_progress), always enable
    return true;
  });

  const canUpdateSettings = Array.from(selectedRepos).some(id => {
    const repo = repositories.find(r => r.id === id);
    return repo && (repo.state === 'pending' || repo.state === 'reset' || repo.state === 'completed');
  });

  // Pagination logic
  const filteredRepositories = repositories.filter(repo => 
    showArchiveView ? (repo.archived === true) : (repo.archived !== true)
  );
  const totalPages = Math.ceil(filteredRepositories.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedRepositories = filteredRepositories.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Reset to page 1 when toggling archive view
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRepos(new Set());
  }, [showArchiveView]);

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1); // Reset to first page when changing per page
  };

  if (!runtimeConfig) {
    return (
      <div className="app-container">
        <div className="repository-list">
          <div className="empty-state">
            <div className="empty-state-icon">⚙️</div>
            <h3 className="empty-state-title">Loading configuration</h3>
            <p className="empty-state-description">Reading runtime configuration from the running container.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1 className="app-title">GitHub Repository Migration</h1>
        </div>
      </header>

      <div className="repository-list">
        <div className="repository-list-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="repository-list-title">Repositories</h2>
            <button 
              className="btn btn-default btn-sm btn-icon" 
              onClick={() => setShowEnvironmentInfoModal(true)}
              title="View environment information"
              aria-label="View environment information"
            >
              ℹ️
            </button>
          </div>
          <div className="repository-list-actions">
            {!showArchiveView ? (
              <>
                <button 
                  className="btn btn-blue" 
                  onClick={() => setShowScanOrgModal(true)}
                  title="Scan a source organization for repositories"
                >
                  Scan Source Org
                </button>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                  Add Repository
                </button>
                <input
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  id="csv-upload"
                  onChange={handleCSVUpload}
                />
                <label htmlFor="csv-upload" className="btn btn-default">
                  Load CSV File
                </label>
                <button 
                  className="btn btn-primary" 
                  onClick={handleStartSelected}
                  disabled={!canStartSelected || selectedRepos.size === 0}
                  title={selectedRepos.size === 0 ? 'Select repositories to start' : 'Start selected migrations'}
                >
                  Start Selected
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => setShowBulkResetConfirmation(true)}
                  disabled={!canResetSelected || selectedRepos.size === 0}
                  title={selectedRepos.size === 0 ? 'Select repositories to reset' : 'Reset selected migrations'}
                >
                  Reset Selected
                </button>
                <button 
                  className="btn btn-default btn-icon" 
                  onClick={() => setShowBulkSettingsModal(true)}
                  disabled={!canUpdateSettings || selectedRepos.size === 0}
                  title={selectedRepos.size === 0 ? 'Select repositories to update settings' : 'Update settings for selected'}
                >
                  ⚙️
                </button>
              </>
            ) : (
              <>
                <button 
                  className="btn btn-warning" 
                  onClick={handleUnarchiveSelected}
                  disabled={selectedRepos.size === 0}
                  title={selectedRepos.size === 0 ? 'Select repositories to unarchive' : 'Unarchive selected repositories'}
                >
                  Unarchive Selected
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => setShowDeleteSelectedConfirmation(true)}
                  disabled={selectedRepos.size === 0}
                  title={selectedRepos.size === 0 ? 'Select repositories to delete' : 'Delete selected repositories'}
                >
                  Delete Selected
                </button>
              </>
            )}
          </div>
        </div>

        {filteredRepositories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3 className="empty-state-title">{showArchiveView ? 'No archived repositories' : 'No repositories yet'}</h3>
            <p className="empty-state-description">
              {showArchiveView
                ? 'You have no archived repositories'
                : 'Get started by adding a repository to migrate or load a CSV file'}
            </p>
            {!showArchiveView && (
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                Add Your First Repository
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="repository-table-header">
              <div className="repository-checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedRepos.size === filteredRepositories.length && filteredRepositories.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label="Select all repositories"
                />
              </div>
              <div className="repository-info-header">Repository</div>
              <div className="repository-actions-header">Actions</div>
            </div>
            {paginatedRepositories.map((repo) => {
              const isArchived = repo.archived === true;
              const canClickStatus = isArchived && (repo.state === 'completed' || repo.state === 'failed');
              const exportState = isGHESMode ? {
                git: repo.gitSourceExportState,
                metadata: repo.metadataExportState,
              } : undefined;

              return (
                <div key={repo.id} className="repository-item">
                  <div className="repository-checkbox-cell">
                    <input
                      type="checkbox"
                      checked={selectedRepos.has(repo.id)}
                      onChange={(e) => handleSelectRepo(repo.id, e.target.checked)}
                      aria-label={`Select ${repo.repositoryName}`}
                    />
                  </div>
                  <div className="repository-info">
                    <div className="repository-name">{repo.repositoryName}</div>
                    <div className="repository-url">{repo.sourceRepositoryUrl}</div>
                  </div>
                  <div className="repository-actions">
                    {isGHESMode && !isArchived ? (
                      <>
                        <button
                          className={`btn btn-sm ${getExportButtonClass(repo)}`}
                          onClick={() => handleExportButtonClick(repo)}
                        >
                          {getExportButtonText(repo)}
                        </button>
                        <button
                          className={`btn btn-sm ${getMigrationButtonClass(repo.state)}`}
                          onClick={() => handleMigrationButtonClick(repo)}
                          disabled={!canStartMigration(repo)}
                        >
                          {getMigrationButtonText(repo.state)}
                        </button>
                      </>
                    ) : (
                      <button
                        className={`btn btn-sm ${getStatusButtonClass(repo.state, exportState)}`}
                        onClick={() => {
                          if (canClickStatus) {
                            setInfoRepo(repo);
                          } else if (!isArchived) {
                            handleStatusButtonClick(repo);
                          }
                        }}
                        disabled={isArchived && !canClickStatus}
                      >
                        {getStatusButtonText(repo.state, exportState)}
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setResetRepo(repo)}
                      disabled={
                        isArchived ||
                        (!isGHESMode && (repo.state === 'reset' || repo.state === 'pending')) ||
                        (isGHESMode && (
                          (repo.state === 'reset' && (
                            !repo.gitSourceExportState ||
                            !repo.metadataExportState ||
                            repo.gitSourceExportState !== 'exported' ||
                            repo.metadataExportState !== 'exported'
                          )) ||
                          (repo.state === 'pending' && (
                            !repo.gitSourceExportState ||
                            !repo.metadataExportState ||
                            repo.gitSourceExportState === 'pending' ||
                            repo.metadataExportState === 'pending' ||
                            repo.gitSourceExportState === 'exporting' ||
                            repo.metadataExportState === 'exporting'
                          ))
                        ))
                      }
                      title={isArchived ? 'Reset is not available for archived repositories' : 'Reset this repository'}
                      aria-label={isArchived ? 'Reset is not available for archived repositories' : 'Reset this repository'}
                    >
                      Reset
                    </button>
                    <button
                      className="btn btn-default btn-sm btn-icon"
                      onClick={() => setSettingsRepo(repo)}
                      title="Repository settings"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {repositories.length > 0 && (
        <>
          {filteredRepositories.length > 0 && (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="per-page-select" style={{ fontSize: '14px', color: 'var(--color-fg-muted)' }}>
                    Per page:
                  </label>
                  <select
                    id="per-page-select"
                    value={perPage}
                    onChange={(e) => handlePerPageChange(Number(e.target.value))}
                    style={{
                      padding: '4px 8px',
                      fontSize: '14px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border-default)',
                      backgroundColor: 'var(--color-canvas-default)',
                      color: 'var(--color-fg-default)',
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <span style={{ fontSize: '14px', color: 'var(--color-fg-muted)' }}>
                  Showing {filteredRepositories.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredRepositories.length)} of {filteredRepositories.length} repositories
                </span>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="btn btn-default btn-sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: '14px', color: 'var(--color-fg-muted)' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="btn btn-default btn-sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
              <button
                className="btn btn-default btn-sm"
                onClick={() => setShowArchiveView(!showArchiveView)}
                style={{ marginLeft: 'auto' }}
              >
                {showArchiveView ? 'Show Main' : 'Show Archive'}
              </button>
            </div>
          )}
          {filteredRepositories.length === 0 && (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-default btn-sm"
                onClick={() => setShowArchiveView(!showArchiveView)}
              >
                {showArchiveView ? 'Show Main' : 'Show Archive'}
              </button>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <AddRepoModal
          onClose={() => setShowAddModal(false)}
          onAdd={addRepository}
        />
      )}

      {infoRepo && (
        <InfoModal
          repository={infoRepo}
          onClose={() => setInfoRepo(null)}
        />
      )}

      {exportInfoRepo && (
        <ExportDetailsModal
          repository={exportInfoRepo}
          onClose={() => setExportInfoRepo(null)}
        />
      )}

      {settingsRepo && (
        <SettingsModal
          repository={settingsRepo}
          onClose={() => setSettingsRepo(null)}
          onUpdate={(lockSource, repositoryVisibility) => updateRepositorySettings(settingsRepo, lockSource, repositoryVisibility)}
          onDelete={() => deleteRepository(settingsRepo.id)}
          onArchive={() => archiveRepository(settingsRepo)}
          onUnarchive={() => unarchiveRepository(settingsRepo)}
        />
      )}

      {failureInfo && (
        <FailureModal
          failureReason={failureInfo}
          onClose={() => setFailureInfo(null)}
        />
      )}

      {showBulkSettingsModal && (
        <BulkSettingsModal
          onClose={() => setShowBulkSettingsModal(false)}
          onSave={handleBulkSettingsUpdate}
          selectedCount={selectedRepos.size}
          onArchiveSelected={handleArchiveSelected}
          isArchiveView={showArchiveView}
          onShowDeleteConfirmation={() => setShowDeleteSelectedConfirmation(true)}
          selectedRepositories={repositories.filter(r => selectedRepos.has(r.id))}
        />
      )}

      {resetRepo && (
        <ResetConfirmationModal
          onClose={() => setResetRepo(null)}
          onConfirm={async (resetExport) => {
            await resetRepository(resetRepo, resetExport);
          }}
          repositoryCount={1}
          hasLockedRepos={resetRepo.lockSource || false}
          isGHESMode={isGHESMode}
          exportCompleted={
            isGHESMode && 
            resetRepo.gitSourceExportState === 'exported' && 
            resetRepo.metadataExportState === 'exported'
          }
          migrationStarted={
            isGHESMode && 
            resetRepo.state !== 'pending' && 
            resetRepo.state !== 'reset' &&
            resetRepo.state !== null
          }
        />
      )}

      {showBulkResetConfirmation && (() => {
        const selectedResetRepos = repositories.filter(r => {
          if (!selectedRepos.has(r.id)) return false;
          
          // In GH mode: exclude 'pending' and 'reset' states
          if (!isGHESMode) {
            return r.state !== 'pending' && r.state !== 'reset';
          }
          
          // In GHES mode: allow reset if exports are completed, even if state is 'pending' or 'reset'
          if (r.state === 'pending' || r.state === 'reset') {
            const exportsCompleted = r.gitSourceExportState === 'exported' && 
                                     r.metadataExportState === 'exported';
            return exportsCompleted;
          }
          
          // For other states in GHES mode, allow reset
          return true;
        });
        
        const allExportsCompleted = selectedResetRepos.every(r => 
          r.gitSourceExportState === 'exported' && r.metadataExportState === 'exported'
        );
        const anyMigrationStarted = selectedResetRepos.some(r => 
          r.state !== 'pending' && r.state !== 'reset' && r.state !== null
        );
        
        return (
          <ResetConfirmationModal
            onClose={() => setShowBulkResetConfirmation(false)}
            onConfirm={handleResetSelected}
            repositoryCount={selectedResetRepos.length}
            hasLockedRepos={selectedResetRepos.some(r => r.lockSource)}
            isGHESMode={isGHESMode}
            exportCompleted={isGHESMode && allExportsCompleted}
            migrationStarted={isGHESMode && anyMigrationStarted}
          />
        );
      })()}

      {showScanOrgModal && (
        <ScanOrgModal
          onClose={() => setShowScanOrgModal(false)}
          onScan={handleScanOrg}
        />
      )}

      {showDeleteSelectedConfirmation && (
        <DeleteSelectedConfirmationModal
          onClose={() => setShowDeleteSelectedConfirmation(false)}
          onConfirm={handleDeleteSelected}
          repositoryCount={repositories.filter(r => selectedRepos.has(r.id)).length}
        />
      )}

      {showEnvironmentInfoModal && (
        <EnvironmentInfoModal
          onClose={() => setShowEnvironmentInfoModal(false)}
          sourceDescription={sourceDescription}
          targetDescription={targetDescription}
          targetOrganization={targetOrganization}
          mode={mode}
        />
      )}
    </div>
  );
}

