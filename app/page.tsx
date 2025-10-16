"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import "./github.css";

Amplify.configure(outputs);

const client = generateClient<Schema>();

type RepositoryMigration = Schema["RepositoryMigration"]["type"];

interface AddRepoModalProps {
  onClose: () => void;
  onAdd: (url: string, name: string, lockSource: boolean, repositoryVisibility: string) => void;
}

interface BulkSettingsModalProps {
  onClose: () => void;
  onSave: (lockSource: boolean, repositoryVisibility: string) => void;
  selectedCount: number;
}

interface ResetConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
  repositoryCount: number;
  hasLockedRepos?: boolean;
}

interface ScanOrgModalProps {
  onClose: () => void;
  onScan: (orgName: string, repositoryVisibility: string, lockSource: boolean) => void;
}

function ResetConfirmationModal({ onClose, onConfirm, repositoryCount, hasLockedRepos = false }: ResetConfirmationModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Confirm Reset</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to reset {repositoryCount === 1 ? 'this repository' : `${repositoryCount} repositories`}?</p>
          <p className="form-help">This will:</p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>Delete the target repository if it exists</li>
            {hasLockedRepos && <li>Unlock the source repository if it was locked</li>}
            {!hasLockedRepos && repositoryCount > 1 && <li>Unlock source repositories that were locked</li>}
            <li>Clear migration IDs</li>
            <li>Reset the migration state</li>
            <li>Set repository visibility to private</li>
            <li>Clear lock source repository setting</li>
          </ul>
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-danger" 
            onClick={onConfirm}
          >
            Reset {repositoryCount > 1 ? 'Selected' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScanOrgModal({ onClose, onScan }: ScanOrgModalProps) {
  const [orgName, setOrgName] = useState("");
  const [repositoryVisibility, setRepositoryVisibility] = useState("private");
  const [lockSource, setLockSource] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    if (orgName) {
      setIsScanning(true);
      await onScan(orgName, repositoryVisibility, lockSource);
      setIsScanning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Scan Source Organization</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Organization Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="organization-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={isScanning}
            />
            <div className="form-help">Enter the name of the GitHub organization to scan</div>
          </div>
          <div className="form-group">
            <label className="form-label">Repository Visibility</label>
            <select
              className="form-input"
              value={repositoryVisibility}
              onChange={(e) => setRepositoryVisibility(e.target.value)}
              disabled={isScanning}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
              <option value="internal">Internal</option>
            </select>
            <div className="form-help">Select the visibility for all scanned repositories</div>
          </div>
          <div className="form-group">
            <label className="form-checkbox-wrapper">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={lockSource}
                onChange={(e) => setLockSource(e.target.checked)}
                disabled={isScanning}
              />
              <span className="form-checkbox-label">Lock source repository</span>
            </label>
            <div className="form-help">Lock the source repositories during migration to prevent modifications</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose} disabled={isScanning}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleScan}
            disabled={!orgName || isScanning}
          >
            {isScanning ? 'Scanning...' : 'Scan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkSettingsModal({ onClose, onSave, selectedCount }: BulkSettingsModalProps) {
  const [lockSource, setLockSource] = useState(false);
  const [repositoryVisibility, setRepositoryVisibility] = useState("private");

  const handleSave = () => {
    onSave(lockSource, repositoryVisibility);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Bulk Update Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="form-help" style={{ marginBottom: '16px' }}>
            Update settings for {selectedCount} selected {selectedCount === 1 ? 'repository' : 'repositories'}
          </p>
          <div className="form-group">
            <label className="form-label">Repository Visibility</label>
            <select
              className="form-input"
              value={repositoryVisibility}
              onChange={(e) => setRepositoryVisibility(e.target.value)}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
              <option value="internal">Internal</option>
            </select>
            <div className="form-help">Select the visibility for the migrated repositories</div>
          </div>
          <div className="form-group">
            <label className="form-checkbox-wrapper">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={lockSource}
                onChange={(e) => setLockSource(e.target.checked)}
              />
              <span className="form-checkbox-label">Lock source repository</span>
            </label>
            <div className="form-help">Lock the source repositories during migration to prevent modifications</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

function AddRepoModal({ onClose, onAdd }: AddRepoModalProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [lockSource, setLockSource] = useState(false);
  const [repositoryVisibility, setRepositoryVisibility] = useState("private");

  const handleAdd = () => {
    if (url && name) {
      onAdd(url, name, lockSource, repositoryVisibility);
      onClose();
    }
  };

  const extractRepoName = (repoUrl: string) => {
    // Extract repo name from URL like https://github.com/owner/repo
    const match = repoUrl.match(/github\.com\/[^\/]+\/([^\/]+)/);
    if (match) {
      return match[1].replace(/\.git$/, '');
    }
    return '';
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    // Auto-populate name if empty
    if (!name && newUrl) {
      const extractedName = extractRepoName(newUrl);
      if (extractedName) {
        setName(extractedName);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Repository</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Source Repository URL</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://github.com/owner/repository"
              value={url}
              onChange={handleUrlChange}
            />
            <div className="form-help">Enter the full URL of the GitHub repository you want to migrate</div>
          </div>
          <div className="form-group">
            <label className="form-label">Repository Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="repository-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="form-help">Enter the name for the migrated repository</div>
          </div>
          <div className="form-group">
            <label className="form-label">Repository Visibility</label>
            <select
              className="form-input"
              value={repositoryVisibility}
              onChange={(e) => setRepositoryVisibility(e.target.value)}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
              <option value="internal">Internal</option>
            </select>
            <div className="form-help">Select the visibility for the migrated repository</div>
          </div>
          <div className="form-group">
            <label className="form-checkbox-wrapper">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={lockSource}
                onChange={(e) => setLockSource(e.target.checked)}
              />
              <span className="form-checkbox-label">Lock source repository</span>
            </label>
            <div className="form-help">Lock the source repository during migration to prevent modifications</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleAdd}
            disabled={!url || !name}
          >
            Add Repository
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeleteModalProps {
  repository: RepositoryMigration;
  onClose: () => void;
  onDelete: () => void;
}

function DeleteModal({ repository, onClose, onDelete }: DeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const isConfirmed = confirmText === repository.sourceRepositoryUrl;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Delete Repository</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to delete <strong>{repository.repositoryName}</strong>?</p>
          <p className="form-help">Type the repository URL to confirm deletion:</p>
          <div className="form-group">
            <input
              type="text"
              className="form-input"
              placeholder={repository.sourceRepositoryUrl}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-danger" 
            onClick={onDelete}
            disabled={!isConfirmed}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

interface InfoModalProps {
  repository: RepositoryMigration;
  onClose: () => void;
}

function InfoModal({ repository, onClose }: InfoModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Repository Migration Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="info-grid">
            <div className="info-label">Repository Name:</div>
            <div className="info-value">{repository.repositoryName}</div>
            
            <div className="info-label">Source URL:</div>
            <div className="info-value">{repository.sourceRepositoryUrl}</div>
            
            <div className="info-label">State:</div>
            <div className="info-value">{repository.state || 'pending'}</div>
            
            <div className="info-label">Destination Owner ID:</div>
            <div className="info-value">{repository.destinationOwnerId || 'N/A'}</div>
            
            <div className="info-label">Migration Source ID:</div>
            <div className="info-value">{repository.migrationSourceId || 'N/A'}</div>
            
            <div className="info-label">Repository Migration ID:</div>
            <div className="info-value">{repository.repositoryMigrationId || 'N/A'}</div>
            
            {repository.failureReason && (
              <>
                <div className="info-label">Failure Reason:</div>
                <div className="info-value" style={{ color: 'var(--color-danger-fg)' }}>
                  {repository.failureReason}
                </div>
              </>
            )}
            
            <div className="info-label">Repository Visibility:</div>
            <div className="info-value">{repository.repositoryVisibility || 'private'}</div>
            
            <div className="info-label">Lock source repository:</div>
            <div className="info-value">{repository.lockSource ? 'True' : 'False'}</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

interface SettingsModalProps {
  repository: RepositoryMigration;
  onClose: () => void;
  onUpdate: (lockSource: boolean, repositoryVisibility: string) => void;
  onDelete: () => void;
}

function SettingsModal({ repository, onClose, onUpdate, onDelete }: SettingsModalProps) {
  const [lockSource, setLockSource] = useState(repository.lockSource || false);
  const [repositoryVisibility, setRepositoryVisibility] = useState(repository.repositoryVisibility || 'private');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const isMigrationStarted = repository.state === 'in_progress' || repository.state === 'completed' || repository.state === 'failed';
  const isSettingsEditable = repository.state === 'pending' || repository.state === 'reset';

  // Sync local state with repository prop when it changes
  useEffect(() => {
    setLockSource(repository.lockSource || false);
    setRepositoryVisibility(repository.repositoryVisibility || 'private');
  }, [repository.lockSource, repository.repositoryVisibility]);

  const handleCheckboxChange = async (checked: boolean) => {
    setLockSource(checked);
    await onUpdate(checked, repositoryVisibility);
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 2000);
  };

  const handleVisibilityChange = async (visibility: string) => {
    setRepositoryVisibility(visibility);
    await onUpdate(lockSource, visibility);
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 2000);
  };

  const handleDelete = () => {
    setShowDeleteConfirmation(false);
    onDelete();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-settings" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Repository Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Repository Visibility</label>
            <select
              className="form-input"
              value={repositoryVisibility}
              onChange={(e) => handleVisibilityChange(e.target.value)}
              disabled={!isSettingsEditable}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
              <option value="internal">Internal</option>
            </select>
            <div className="form-help">
              {!isSettingsEditable 
                ? 'This setting cannot be changed after migration has started or been completed'
                : 'Select the visibility for the migrated repository'}
            </div>
          </div>
          <div className="form-group">
            <label className="form-checkbox-wrapper">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={lockSource}
                onChange={(e) => handleCheckboxChange(e.target.checked)}
                disabled={isMigrationStarted}
              />
              <span className="form-checkbox-label">Lock source repository</span>
            </label>
            <div className="form-help">
              {isMigrationStarted 
                ? 'This setting cannot be changed after migration has started'
                : 'Lock the source repository during migration to prevent modifications'}
            </div>
          </div>
          {showSaveConfirmation && (
            <div className="save-confirmation">
              ✓ Setting saved
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button 
            className="btn btn-danger" 
            onClick={() => setShowDeleteConfirmation(true)}
            title="Delete this repository"
            aria-label="Delete this repository"
          >
            Delete
          </button>
        </div>
        {showDeleteConfirmation && (
          <DeleteModal
            repository={repository}
            onClose={() => setShowDeleteConfirmation(false)}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

interface FailureModalProps {
  failureReason: string;
  onClose: () => void;
}

function FailureModal({ failureReason, onClose }: FailureModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Migration Failed</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--color-danger-fg)', marginBottom: '16px' }}>
            The migration failed with the following reason:
          </p>
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'var(--color-canvas-subtle)', 
            borderRadius: '6px',
            border: '1px solid var(--color-border-default)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {failureReason}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { signOut } = useAuthenticator();
  const [repositories, setRepositories] = useState<RepositoryMigration[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanOrgModal, setShowScanOrgModal] = useState(false);
  const [infoRepo, setInfoRepo] = useState<RepositoryMigration | null>(null);
  const [settingsRepo, setSettingsRepo] = useState<RepositoryMigration | null>(null);
  const [resetRepo, setResetRepo] = useState<RepositoryMigration | null>(null);
  const [failureInfo, setFailureInfo] = useState<string | null>(null);
  const [pollingRepos, setPollingRepos] = useState<Set<string>>(new Set());
  const pollingReposRef = useRef<Set<string>>(new Set());
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [showBulkSettingsModal, setShowBulkSettingsModal] = useState(false);
  const [showBulkResetConfirmation, setShowBulkResetConfirmation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const targetOrganization = process.env.NEXT_PUBLIC_TARGET_ORGANIZATION || 'Not configured';

  // Keep ref in sync with state
  useEffect(() => {
    pollingReposRef.current = pollingRepos;
  }, [pollingRepos]);

  // Define startPolling before it's used in effects
  const startPolling = useCallback((repoId: string, migrationId: string) => {
    setPollingRepos(prev => new Set(prev).add(repoId));
  }, []);

  useEffect(() => {
    const subscription = client.models.RepositoryMigration.observeQuery().subscribe({
      next: (data) => setRepositories([...data.items]),
    });

    return () => subscription.unsubscribe();
  }, []);

  // Resume polling for repositories that are in progress on page load/refresh
  useEffect(() => {
    repositories.forEach(repo => {
      // Start polling for repositories that are in_progress and have a repositoryMigrationId
      // Check ref to avoid unnecessary state updates
      if (repo.state === 'in_progress' && repo.repositoryMigrationId && !pollingReposRef.current.has(repo.id)) {
        startPolling(repo.id, repo.repositoryMigrationId);
      }
    });
  }, [repositories, startPolling]);

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
    await client.models.RepositoryMigration.create({
      sourceRepositoryUrl: url,
      repositoryName: name,
      state: 'pending',
      lockSource,
      repositoryVisibility,
    });
  };

  const deleteRepository = async (id: string) => {
    await client.models.RepositoryMigration.delete({ id });
  };

  const updateRepositorySettings = async (repo: RepositoryMigration, lockSource: boolean, repositoryVisibility: string) => {
    await client.models.RepositoryMigration.update({
      id: repo.id,
      lockSource,
      repositoryVisibility,
    });
  };

  const resetRepository = async (repo: RepositoryMigration) => {
    try {
      // Delete target repository if migration was started
      if (repo.repositoryName) {
        console.log('Deleting target repository:', repo.repositoryName);
        const deleteResult = await client.queries.deleteTargetRepo({
          repositoryName: repo.repositoryName,
        });
        console.log('Delete result:', deleteResult);
      }

      // Unlock source repository if it was locked
      if (repo.lockSource && repo.sourceRepositoryUrl && repo.migrationSourceId && repo.repositoryName) {
        console.log('Unlocking source repository:', repo.sourceRepositoryUrl);
        const unlockResult = await client.queries.unlockSourceRepo({
          sourceRepositoryUrl: repo.sourceRepositoryUrl,
          migrationSourceId: repo.migrationSourceId,
          repositoryName: repo.repositoryName,
        });
        console.log('Unlock result:', unlockResult);
      }

      // Update the repository record
      await client.models.RepositoryMigration.update({
        id: repo.id,
        state: 'reset',
        migrationSourceId: null,
        repositoryMigrationId: null,
        lockSource: false,
        repositoryVisibility: 'private', // Reset to default
        failureReason: null,
      });

      console.log('Repository reset successfully');
    } catch (error) {
      console.error('Error resetting repository:', error);
      // Still update the state even if the API calls failed
      await client.models.RepositoryMigration.update({
        id: repo.id,
        state: 'reset',
        migrationSourceId: null,
        repositoryMigrationId: null,
        lockSource: false,
        repositoryVisibility: 'private', // Reset to default
        failureReason: error instanceof Error ? error.message : 'Error during reset',
      });
    }
  };

  const startMigration = async (repo: RepositoryMigration) => {
    try {
      // Update state to in_progress
      await client.models.RepositoryMigration.update({
        id: repo.id,
        state: 'in_progress',
      });

      // Call the startMigration function
      // Pass destinationOwnerId if it exists to skip the API call to fetch it
      const result = await client.queries.startMigration({
        sourceRepositoryUrl: repo.sourceRepositoryUrl,
        repositoryName: repo.repositoryName,
        targetRepoVisibility: repo.repositoryVisibility || 'private',
        continueOnError: true,
        lockSource: repo.lockSource || false,
        destinationOwnerId: repo.destinationOwnerId || undefined,
      });

      console.log('Migration started:', result);

      if (result.data) {
        // Parse the outer JSON wrapper
        const lambdaResponse = JSON.parse(result.data as string);
        // Parse the inner body JSON
        const response = JSON.parse(lambdaResponse.body);
        
        if (response.success) {
          // Update the repository with migration details
          await client.models.RepositoryMigration.update({
            id: repo.id,
            repositoryMigrationId: response.migrationId,
            migrationSourceId: response.migrationSourceId,
            destinationOwnerId: response.ownerId,
            state: 'in_progress',
          });

          // Start polling for status
          startPolling(repo.id, response.migrationId);
        } else {
          await client.models.RepositoryMigration.update({
            id: repo.id,
            state: 'failed',
            failureReason: response.message || 'Failed to start migration',
          });
        }
      }
    } catch (error) {
      console.error('Error starting migration:', error);
      await client.models.RepositoryMigration.update({
        id: repo.id,
        state: 'failed',
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const checkMigrationStatus = useCallback(async (repoId: string, migrationId: string) => {
    try {
      const result = await client.queries.checkMigrationStatus({
        migrationId,
      });

      if (result.data) {
        // Parse the outer JSON wrapper
        const lambdaResponse = JSON.parse(result.data as string);
        // Parse the inner body JSON
        const response = JSON.parse(lambdaResponse.body);
        
        if (response.success) {
          const state = response.state.toLowerCase();
          
          // Update repository with current state
          await client.models.RepositoryMigration.update({
            id: repoId,
            state,
            failureReason: response.failureReason || undefined,
          });

          // Stop polling if migration is complete or failed
          if (state === 'failed' || state === 'succeeded' || state === 'completed') {
            setPollingRepos(prev => {
              const newSet = new Set(prev);
              newSet.delete(repoId);
              return newSet;
            });
            
            // If succeeded, update state to completed
            if (state === 'succeeded') {
              await client.models.RepositoryMigration.update({
                id: repoId,
                state: 'completed',
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
    }
  }, []);

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

  const getStatusButtonClass = (state?: string | null) => {
    switch (state) {
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

  const getStatusButtonText = (state?: string | null) => {
    switch (state) {
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'reset':
        return 'Start Migration';
      default:
        return 'Start Migration';
    }
  };

  const handleStatusButtonClick = (repo: RepositoryMigration) => {
    // If pending or reset, start the migration
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
            
            await client.models.RepositoryMigration.create({
              sourceRepositoryUrl: sourceRepoUrl,
              repositoryName: repoName,
              state: 'pending',
              lockSource,
              repositoryVisibility: visibility,
            });
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
      
      // Call the scanSourceOrg function
      const result = await client.queries.scanSourceOrg({
        organizationName: orgName,
      });

      console.log('Scan result:', result);

      if (result.data) {
        // Parse the outer JSON wrapper
        const lambdaResponse = JSON.parse(result.data as string);
        // Parse the inner body JSON
        const response = JSON.parse(lambdaResponse.body);
        
        if (response.success && response.repositories) {
          console.log(`Found ${response.repositories.length} repositories`);
          
          // Add repositories to the database
          let addedCount = 0;
          let skippedCount = 0;
          
          for (const repo of response.repositories) {
            // Check if repository already exists in the database
            const existingRepo = repositories.find(r => r.sourceRepositoryUrl === repo.html_url);
            if (existingRepo) {
              console.log(`Skipping ${repo.name} - already exists in database`);
              skippedCount++;
              continue;
            }
            
            // Add repository to database
            await client.models.RepositoryMigration.create({
              sourceRepositoryUrl: repo.html_url,
              repositoryName: repo.name,
              state: 'pending',
              lockSource,
              repositoryVisibility,
            });
            
            addedCount++;
          }
          
          console.log(`Added ${addedCount} repositories, skipped ${skippedCount} existing repositories`);
          alert(`Successfully scanned ${orgName}!\nAdded: ${addedCount} repositories\nSkipped: ${skippedCount} existing repositories`);
        } else {
          console.error('Scan failed:', response);
          alert(`Failed to scan organization: ${response.message || 'Unknown error'}`);
        }
      }
      
      setShowScanOrgModal(false);
    } catch (error) {
      console.error('Error scanning organization:', error);
      alert(`Error scanning organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRepos(new Set(repositories.map(r => r.id)));
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
      await startMigration(repo);
    }
  };

  const handleResetSelected = async () => {
    const selectedRepoObjects = repositories.filter(r => 
      selectedRepos.has(r.id) && r.state !== 'pending' && r.state !== 'reset'
    );
    
    for (const repo of selectedRepoObjects) {
      await resetRepository(repo);
    }
    
    setShowBulkResetConfirmation(false);
  };

  const handleBulkSettingsUpdate = async (lockSource: boolean, repositoryVisibility: string) => {
    const selectedRepoObjects = repositories.filter(r => 
      selectedRepos.has(r.id) && (r.state === 'pending' || r.state === 'reset')
    );
    
    for (const repo of selectedRepoObjects) {
      await updateRepositorySettings(repo, lockSource, repositoryVisibility);
    }
  };

  const canStartSelected = Array.from(selectedRepos).some(id => {
    const repo = repositories.find(r => r.id === id);
    return repo && (repo.state === 'pending' || repo.state === 'reset');
  });

  const canResetSelected = Array.from(selectedRepos).some(id => {
    const repo = repositories.find(r => r.id === id);
    return repo && repo.state !== 'pending' && repo.state !== 'reset';
  });

  const canUpdateSettings = Array.from(selectedRepos).some(id => {
    const repo = repositories.find(r => r.id === id);
    return repo && (repo.state === 'pending' || repo.state === 'reset');
  });

  // Pagination logic
  const totalPages = Math.ceil(repositories.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedRepositories = repositories.slice(startIndex, endIndex);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1); // Reset to first page when changing per page
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1 className="app-title">GitHub Repository Migration</h1>
          <div className="target-org-info">
            <span className="target-org-label">Target Organization:</span>
            <span className="target-org-value">{targetOrganization}</span>
          </div>
        </div>
        <button className="btn btn-default sign-out-btn" onClick={signOut}>
          Sign out
        </button>
      </header>

      <div className="repository-list">
        <div className="repository-list-header">
          <h2 className="repository-list-title">Repositories</h2>
          <div className="repository-list-actions">
            <button 
              className="btn btn-blue" 
              onClick={() => setShowScanOrgModal(true)}
              title="Scan a source organization for repositories"
            >
              Scan Source Org
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
              Start selected
            </button>
            <button 
              className="btn btn-danger" 
              onClick={() => setShowBulkResetConfirmation(true)}
              disabled={!canResetSelected || selectedRepos.size === 0}
              title={selectedRepos.size === 0 ? 'Select repositories to reset' : 'Reset selected migrations'}
            >
              Reset selected
            </button>
            <button 
              className="btn btn-default btn-icon" 
              onClick={() => setShowBulkSettingsModal(true)}
              disabled={!canUpdateSettings || selectedRepos.size === 0}
              title={selectedRepos.size === 0 ? 'Select repositories to update settings' : 'Update settings for selected'}
            >
              ⚙️
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              Add Repository
            </button>
          </div>
        </div>

        {repositories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3 className="empty-state-title">No repositories yet</h3>
            <p className="empty-state-description">
              Get started by adding a repository to migrate or load a CSV file
            </p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              Add Your First Repository
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <span style={{ fontSize: '14px', color: 'var(--color-fg-muted)', marginLeft: '16px' }}>
                  Showing {repositories.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, repositories.length)} of {repositories.length} repositories
                </span>
              </div>
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
            <div className="repository-table-header">
              <div className="repository-checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedRepos.size === repositories.length && repositories.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  aria-label="Select all repositories"
                />
              </div>
              <div className="repository-info-header">Repository</div>
              <div className="repository-actions-header">Actions</div>
            </div>
            {paginatedRepositories.map((repo) => (
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
                  <button 
                    className={`btn btn-sm ${getStatusButtonClass(repo.state)}`}
                    onClick={() => handleStatusButtonClick(repo)}
                  >
                    {getStatusButtonText(repo.state)}
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => setResetRepo(repo)}
                    disabled={repo.state === 'pending' || repo.state === 'reset'}
                    title={repo.state === 'pending' || repo.state === 'reset' ? 'Reset is not available for repositories in pending or reset state' : 'Reset this repository'}
                    aria-label={repo.state === 'pending' || repo.state === 'reset' ? 'Reset is not available for repositories in pending or reset state' : 'Reset this repository'}
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
            ))}
          </>
        )}
      </div>

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

      {settingsRepo && (
        <SettingsModal
          repository={settingsRepo}
          onClose={() => setSettingsRepo(null)}
          onUpdate={(lockSource, repositoryVisibility) => updateRepositorySettings(settingsRepo, lockSource, repositoryVisibility)}
          onDelete={() => deleteRepository(settingsRepo.id)}
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
        />
      )}

      {resetRepo && (
        <ResetConfirmationModal
          onClose={() => setResetRepo(null)}
          onConfirm={() => {
            resetRepository(resetRepo);
            setResetRepo(null);
          }}
          repositoryCount={1}
          hasLockedRepos={resetRepo.lockSource || false}
        />
      )}

      {showBulkResetConfirmation && (
        <ResetConfirmationModal
          onClose={() => setShowBulkResetConfirmation(false)}
          onConfirm={handleResetSelected}
          repositoryCount={repositories.filter(r => selectedRepos.has(r.id) && r.state !== 'pending' && r.state !== 'reset').length}
          hasLockedRepos={repositories.filter(r => selectedRepos.has(r.id) && r.state !== 'pending' && r.state !== 'reset').some(r => r.lockSource)}
        />
      )}

      {showScanOrgModal && (
        <ScanOrgModal
          onClose={() => setShowScanOrgModal(false)}
          onScan={handleScanOrg}
        />
      )}
    </div>
  );
}

