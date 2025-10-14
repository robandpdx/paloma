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
  onAdd: (url: string, name: string) => void;
}

function AddRepoModal({ onClose, onAdd }: AddRepoModalProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (url && name) {
      onAdd(url, name);
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
  const [failureInfo, setFailureInfo] = useState<string | null>(null);
  const [pollingRepos, setPollingRepos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const subscription = client.models.RepositoryMigration.observeQuery().subscribe({
      next: (data) => setRepositories([...data.items]),
    });

    return () => subscription.unsubscribe();
  }, []);

  const addRepository = async (url: string, name: string) => {
    await client.models.RepositoryMigration.create({
      sourceRepositoryUrl: url,
      repositoryName: name,
      state: 'pending',
    });
  };

  const deleteRepository = async (id: string) => {
    await client.models.RepositoryMigration.delete({ id });
    setDeleteRepo(null);
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
      });

      console.log('Migration started:', result);

      if (result.data) {
        const response = JSON.parse(result.data as string);
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
        const response = JSON.parse(result.data as string);
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

  const getStatusClass = (state?: string | null) => {
    switch (state) {
      case 'in_progress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      case 'failed':
        return 'status-failed';
      default:
        return 'status-pending';
    }
  };

  const handleStatusClick = (repo: RepositoryMigration) => {
    if (repo.state === 'failed' && repo.failureReason) {
      setFailureInfo(repo.failureReason);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">GitHub Repository Migration</h1>
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
              <div 
                className={`status-indicator ${getStatusClass(repo.state)}`}
                onClick={() => handleStatusClick(repo)}
                title={repo.state || 'pending'}
              />
              <div className="repository-actions">
                {(!repo.state || repo.state === 'pending') && (
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => startMigration(repo)}
                  >
                    Start Migration
                  </button>
                )}
                <button 
                  className="btn btn-default btn-sm btn-icon"
                  onClick={() => setInfoRepo(repo)}
                  title="View details"
                >
                  ℹ️
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => setDeleteRepo(repo)}
                >
                  Delete
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

      {failureInfo && (
        <FailureModal
          failureReason={failureInfo}
          onClose={() => setFailureInfo(null)}
        />
      )}
    </div>
  );
}

