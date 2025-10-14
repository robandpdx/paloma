"use client";

import { useState, useEffect, useCallback } from "react";
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
  onAdd: (url: string, name: string, lockSource: boolean) => void;
}

function AddRepoModal({ onClose, onAdd }: AddRepoModalProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [lockSource, setLockSource] = useState(false);

  const handleAdd = () => {
    if (url && name) {
      onAdd(url, name, lockSource);
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
  onUpdate: (lockSource: boolean) => void;
}

function SettingsModal({ repository, onClose, onUpdate }: SettingsModalProps) {
  const [lockSource, setLockSource] = useState(repository.lockSource || false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const isMigrationStarted = repository.state && repository.state !== 'pending';

  const handleCheckboxChange = async (checked: boolean) => {
    setLockSource(checked);
    await onUpdate(checked);
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 2000);
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
  const [deleteRepo, setDeleteRepo] = useState<RepositoryMigration | null>(null);
  const [infoRepo, setInfoRepo] = useState<RepositoryMigration | null>(null);
  const [settingsRepo, setSettingsRepo] = useState<RepositoryMigration | null>(null);
  const [failureInfo, setFailureInfo] = useState<string | null>(null);
  const [pollingRepos, setPollingRepos] = useState<Set<string>>(new Set());
  const targetOrganization = process.env.NEXT_PUBLIC_TARGET_ORGANIZATION || 'Not configured';

  useEffect(() => {
    const subscription = client.models.RepositoryMigration.observeQuery().subscribe({
      next: (data) => setRepositories([...data.items]),
    });

    return () => subscription.unsubscribe();
  }, []);

  const addRepository = async (url: string, name: string, lockSource: boolean) => {
    await client.models.RepositoryMigration.create({
      sourceRepositoryUrl: url,
      repositoryName: name,
      state: 'pending',
      lockSource,
    });
  };

  const deleteRepository = async (id: string) => {
    await client.models.RepositoryMigration.delete({ id });
    setDeleteRepo(null);
  };

  const updateRepositorySettings = async (repo: RepositoryMigration, lockSource: boolean) => {
    await client.models.RepositoryMigration.update({
      id: repo.id,
      lockSource,
    });
  };

  const startMigration = async (repo: RepositoryMigration) => {
    try {
      // Update state to in_progress
      await client.models.RepositoryMigration.update({
        id: repo.id,
        state: 'in_progress',
      });

      // Call the startMigration function
      const result = await client.queries.startMigration({
        sourceRepositoryUrl: repo.sourceRepositoryUrl,
        repositoryName: repo.repositoryName,
        targetRepoVisibility: 'private',
        continueOnError: true,
        lockSource: repo.lockSource || false,
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

  const startPolling = (repoId: string, migrationId: string) => {
    setPollingRepos(prev => new Set(prev).add(repoId));
  };

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
      default:
        return 'Start Migration';
    }
  };

  const handleStatusButtonClick = (repo: RepositoryMigration) => {
    // If pending, start the migration
    if (!repo.state || repo.state === 'pending') {
      startMigration(repo);
    } else {
      // Otherwise, show the info modal
      setInfoRepo(repo);
    }
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
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            Add Repository
          </button>
        </div>

        {repositories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3 className="empty-state-title">No repositories yet</h3>
            <p className="empty-state-description">
              Get started by adding a repository to migrate
            </p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              Add Your First Repository
            </button>
          </div>
        ) : (
          repositories.map((repo) => (
            <div key={repo.id} className="repository-item">
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
                  onClick={() => setDeleteRepo(repo)}
                >
                  Delete
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
          ))
        )}
      </div>

      {showAddModal && (
        <AddRepoModal
          onClose={() => setShowAddModal(false)}
          onAdd={addRepository}
        />
      )}

      {deleteRepo && (
        <DeleteModal
          repository={deleteRepo}
          onClose={() => setDeleteRepo(null)}
          onDelete={() => deleteRepository(deleteRepo.id)}
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
          onUpdate={(lockSource) => updateRepositorySettings(settingsRepo, lockSource)}
        />
      )}

      {failureInfo && (
        <FailureModal
          failureReason={failureInfo}
          onClose={() => setFailureInfo(null)}
        />
      )}
    </div>
  );
}

