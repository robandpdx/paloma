"use client";

import { useState, useEffect, useCallback } from "react";
import type { RepositoryMigration } from "@/lib/api";
import { useRepositoryMigrations } from "@/hooks/useRepositoryMigrations";
import {
  getMigrationButtonClass,
  getMigrationButtonText,
  getStatusButtonClass,
  getStatusButtonText,
  canStartMigration,
  getExportButtonClass,
  getExportButtonText,
  canResetRepository,
} from "@/lib/migrationStatus";
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
import ErrorToast from "@/components/ErrorToast";
import "./github.css";

export default function App() {
  const {
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
  } = useRepositoryMigrations();

  // --- UI-only state ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanOrgModal, setShowScanOrgModal] = useState(false);
  const [infoRepo, setInfoRepo] = useState<RepositoryMigration | null>(null);
  const [exportInfoRepo, setExportInfoRepo] = useState<RepositoryMigration | null>(null);
  const [settingsRepo, setSettingsRepo] = useState<RepositoryMigration | null>(null);
  const [resetRepo, setResetRepo] = useState<RepositoryMigration | null>(null);
  const [failureInfo, setFailureInfo] = useState<string | null>(null);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [showBulkSettingsModal, setShowBulkSettingsModal] = useState(false);
  const [showBulkResetConfirmation, setShowBulkResetConfirmation] = useState(false);
  const [showDeleteSelectedConfirmation, setShowDeleteSelectedConfirmation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showArchiveView, setShowArchiveView] = useState(false);
  const [showEnvironmentInfoModal, setShowEnvironmentInfoModal] = useState(false);

  // Keep settingsRepo in sync with repositories array
  useEffect(() => {
    if (settingsRepo) {
      const updatedRepo = repositories.find(r => r.id === settingsRepo.id);
      if (updatedRepo) setSettingsRepo(updatedRepo);
    }
  }, [repositories, settingsRepo]);

  // --- Derived state ---
  const filteredRepositories = repositories.filter(repo =>
    showArchiveView ? (repo.archived === true) : (repo.archived !== true)
  );
  const totalPages = Math.ceil(filteredRepositories.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedRepositories = filteredRepositories.slice(startIndex, endIndex);

  const canStartSelected = Array.from(selectedRepos).some(id => {
    const repo = repositories.find(r => r.id === id);
    return repo && (repo.state === 'pending' || repo.state === 'reset');
  });

  const canResetSelected = Array.from(selectedRepos).some(id => {
    const repo = repositories.find(r => r.id === id);
    return repo ? canResetRepository(repo, isGHESMode) : false;
  });

  const canUpdateSettings = Array.from(selectedRepos).some(id => {
    const repo = repositories.find(r => r.id === id);
    return repo && (repo.state === 'pending' || repo.state === 'reset' || repo.state === 'completed');
  });

  // Reset page when out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [currentPage, totalPages]);

  // Reset page when toggling archive view
  useEffect(() => {
    setCurrentPage(1);
    setSelectedRepos(new Set());
  }, [showArchiveView]);

  // --- Handlers ---

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedRepos(checked ? new Set(filteredRepositories.map(r => r.id)) : new Set());
  };

  const handleSelectRepo = (repoId: string, checked: boolean) => {
    const next = new Set(selectedRepos);
    checked ? next.add(repoId) : next.delete(repoId);
    setSelectedRepos(next);
  };

  const onCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      await handleCSVUpload(text);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const onScanOrg = async (orgName: string, repositoryVisibility: string, lockSource: boolean) => {
    const result = await handleScanOrg(orgName, repositoryVisibility, lockSource);
    if (result.success) {
      alert(`Successfully scanned ${orgName}!\nAdded: ${result.addedCount} repositories\nSkipped: ${result.skippedCount} existing repositories`);
    }
    setShowScanOrgModal(false);
  };

  const onStartSelected = async () => {
    await handleStartSelected(selectedRepos);
  };

  const onResetSelected = async (resetExport: boolean = false) => {
    await handleResetSelected(selectedRepos, resetExport);
  };

  const onBulkSettingsUpdate = async (lockSource: boolean, repositoryVisibility: string) => {
    await handleBulkSettingsUpdate(selectedRepos, lockSource, repositoryVisibility);
  };

  const onArchiveSelected = useCallback(async () => {
    await handleArchiveSelected(selectedRepos);
    setSelectedRepos(new Set());
  }, [handleArchiveSelected, selectedRepos]);

  const onUnarchiveSelected = useCallback(async () => {
    await handleUnarchiveSelected(selectedRepos);
    setSelectedRepos(new Set());
  }, [handleUnarchiveSelected, selectedRepos]);

  const onDeleteSelected = useCallback(async () => {
    await handleDeleteSelected(selectedRepos);
    setSelectedRepos(new Set());
  }, [handleDeleteSelected, selectedRepos]);

  const handleExportButtonClick = (repo: RepositoryMigration) => {
    const gitExported = repo.gitSourceExportState === 'exported';
    const metadataExported = repo.metadataExportState === 'exported';
    const gitExporting = repo.gitSourceExportState === 'pending' || repo.gitSourceExportState === 'exporting';
    const metadataExporting = repo.metadataExportState === 'pending' || repo.metadataExportState === 'exporting';
    const gitFailed = repo.gitSourceExportState === 'failed';
    const metadataFailed = repo.metadataExportState === 'failed';

    if (gitExporting || metadataExporting || gitFailed || metadataFailed || (gitExported && metadataExported)) {
      setExportInfoRepo(repo);
    } else {
      startExport(repo);
    }
  };

  const handleMigrationButtonClick = (repo: RepositoryMigration) => {
    if (!repo.state || repo.state === 'pending' || repo.state === 'reset') {
      startMigration(repo);
    } else {
      setInfoRepo(repo);
    }
  };

  const handleStatusButtonClick = (repo: RepositoryMigration) => {
    if (isGHESMode) {
      const gitExporting = repo.gitSourceExportState === 'pending' || repo.gitSourceExportState === 'exporting';
      const metadataExporting = repo.metadataExportState === 'pending' || repo.metadataExportState === 'exporting';

      if (gitExporting || metadataExporting) { setInfoRepo(repo); return; }

      const gitFailed = repo.gitSourceExportState === 'failed';
      const metadataFailed = repo.metadataExportState === 'failed';

      if (gitFailed || metadataFailed) { setInfoRepo(repo); return; }

      const gitExported = repo.gitSourceExportState === 'exported';
      const metadataExported = repo.metadataExportState === 'exported';

      if (gitExported && metadataExported && (!repo.state || repo.state === 'pending' || repo.state === 'reset')) {
        startMigration(repo);
        return;
      }

      if (!gitExported || !metadataExported) {
        if (!repo.state || repo.state === 'pending' || repo.state === 'reset') {
          startExport(repo);
          return;
        }
      }
    }

    if (!repo.state || repo.state === 'pending' || repo.state === 'reset') {
      startMigration(repo);
    } else {
      setInfoRepo(repo);
    }
  };

  // --- Render ---

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
      {errorMessage && (
        <ErrorToast message={errorMessage} onDismiss={dismissError} />
      )}

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
                  onChange={onCSVUpload}
                />
                <label htmlFor="csv-upload" className="btn btn-default">
                  Load CSV File
                </label>
                <button
                  className="btn btn-primary"
                  onClick={onStartSelected}
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
                  onClick={onUnarchiveSelected}
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
                          disabled={!canStartMigration(repo, isGHESMode)}
                        >
                          {getMigrationButtonText(repo.state)}
                        </button>
                      </>
                    ) : (
                      <button
                        className={`btn btn-sm ${getStatusButtonClass(repo.state, exportState, isGHESMode)}`}
                        onClick={() => {
                          if (canClickStatus) {
                            setInfoRepo(repo);
                          } else if (!isArchived) {
                            handleStatusButtonClick(repo);
                          }
                        }}
                        disabled={isArchived && !canClickStatus}
                      >
                        {getStatusButtonText(repo.state, exportState, isGHESMode)}
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setResetRepo(repo)}
                      disabled={!canResetRepository(repo, isGHESMode)}
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
          onSave={onBulkSettingsUpdate}
          selectedCount={selectedRepos.size}
          onArchiveSelected={onArchiveSelected}
          isArchiveView={showArchiveView}
          onShowDeleteConfirmation={() => setShowDeleteSelectedConfirmation(true)}
          selectedRepositories={repositories.filter(r => selectedRepos.has(r.id))}
        />
      )}

      {resetRepo && (
        <ResetConfirmationModal
          onClose={() => setResetRepo(null)}
          onConfirm={async (resetExportFlag) => {
            await resetRepository(resetRepo, resetExportFlag);
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
            resetRepo.state !== undefined
          }
        />
      )}

      {showBulkResetConfirmation && (() => {
        const selectedResetRepos = repositories.filter(r => {
          if (!selectedRepos.has(r.id)) return false;
          return canResetRepository(r, isGHESMode);
        });

        const allExportsCompleted = selectedResetRepos.every(r =>
          r.gitSourceExportState === 'exported' && r.metadataExportState === 'exported'
        );
        const anyMigrationStarted = selectedResetRepos.some(r =>
          r.state !== 'pending' && r.state !== 'reset' && r.state !== undefined
        );

        return (
          <ResetConfirmationModal
            onClose={() => setShowBulkResetConfirmation(false)}
            onConfirm={onResetSelected}
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
          onScan={onScanOrg}
        />
      )}

      {showDeleteSelectedConfirmation && (
        <DeleteSelectedConfirmationModal
          onClose={() => setShowDeleteSelectedConfirmation(false)}
          onConfirm={onDeleteSelected}
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
