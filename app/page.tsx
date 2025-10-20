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
  onArchiveSelected: () => void;
  onDeleteSelected: () => void;
  isArchiveView: boolean;
  onShowDeleteConfirmation: () => void;
  selectedRepositories: RepositoryMigration[];
}

interface ResetConfirmationModalProps {
  onClose: () => void;
  onConfirm: (resetExport: boolean) => Promise<void>;
  repositoryCount: number;
  hasLockedRepos?: boolean;
  isGHESMode?: boolean;
}

interface ScanOrgModalProps {
  onClose: () => void;
  onScan: (orgName: string, repositoryVisibility: string, lockSource: boolean) => void;
}

interface EnvironmentInfoModalProps {
  onClose: () => void;
  sourceDescription: string;
  targetDescription: string;
  targetOrganization: string;
}

function ResetConfirmationModal({ onClose, onConfirm, repositoryCount, hasLockedRepos = false, isGHESMode = false }: ResetConfirmationModalProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [resetExport, setResetExport] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    await onConfirm(resetExport);
    setIsResetting(false);
    onClose();
  };

  const handleClose = () => {
    if (!isResetting) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Confirm Reset</h2>
          <button className="modal-close" onClick={handleClose} disabled={isResetting}>×</button>
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
          {isGHESMode && (
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-checkbox-wrapper">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={resetExport}
                  onChange={(e) => setResetExport(e.target.checked)}
                  disabled={isResetting}
                />
                <span className="form-checkbox-label">Reset Export</span>
              </label>
              <div className="form-help">
                If checked, this will also clear the export data, requiring a new export before the next migration can be started.
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={handleClose} disabled={isResetting}>Cancel</button>
          <button 
            className="btn btn-danger" 
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : `Reset ${repositoryCount > 1 ? 'Selected' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function EnvironmentInfoModal({ onClose, sourceDescription, targetDescription, targetOrganization }: EnvironmentInfoModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Environment Information</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="info-grid">
            <div className="info-label">Source Description:</div>
            <div className="info-value">{sourceDescription}</div>
            
            <div className="info-label">Target Description:</div>
            <div className="info-value">{targetDescription}</div>
            
            <div className="info-label">Target Organization:</div>
            <div className="info-value">{targetOrganization}</div>
          </div>
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

function BulkSettingsModal({ onClose, onSave, selectedCount, onArchiveSelected, onDeleteSelected, isArchiveView, onShowDeleteConfirmation, selectedRepositories }: BulkSettingsModalProps) {
  const [lockSource, setLockSource] = useState(false);
  const [repositoryVisibility, setRepositoryVisibility] = useState("private");

  // Check if any selected repositories are in a non-editable state
  const hasNonEditableRepos = selectedRepositories.some(
    repo => repo.state !== 'pending' && repo.state !== 'reset'
  );
  const isSettingsEditable = !hasNonEditableRepos;

  const handleSave = () => {
    onSave(lockSource, repositoryVisibility);
    onClose();
  };

  const handleArchiveSelected = () => {
    onArchiveSelected();
    onClose();
  };

  const handleDeleteSelected = () => {
    onClose();
    onShowDeleteConfirmation();
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
              disabled={!isSettingsEditable}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
              <option value="internal">Internal</option>
            </select>
            <div className="form-help">
              {!isSettingsEditable 
                ? 'This setting cannot be changed after migration has started or been completed'
                : 'Select the visibility for the target repositories'}
            </div>
          </div>
          <div className="form-group">
            <label className="form-checkbox-wrapper">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={lockSource}
                onChange={(e) => setLockSource(e.target.checked)}
                disabled={!isSettingsEditable}
              />
              <span className="form-checkbox-label">Lock source repository</span>
            </label>
            <div className="form-help">
              {!isSettingsEditable 
                ? 'This setting cannot be changed after migration has started'
                : 'Lock the source repositories during migration to prevent modifications'}
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isArchiveView && (
              <button 
                className="btn btn-warning" 
                onClick={handleArchiveSelected}
              >
                Archive Selected
              </button>
            )}
            <button 
              className="btn btn-danger" 
              onClick={handleDeleteSelected}
            >
              Delete Selected
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-default" onClick={onClose}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={!isSettingsEditable}
            >
              Save Settings
            </button>
          </div>
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

interface DeleteSelectedConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
  repositoryCount: number;
}

function DeleteSelectedConfirmationModal({ onClose, onConfirm, repositoryCount }: DeleteSelectedConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
    onClose();
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Confirm Delete</h2>
          <button className="modal-close" onClick={handleClose} disabled={isDeleting}>×</button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to delete {repositoryCount === 1 ? 'this repository' : `${repositoryCount} repositories`}?</p>
          <p className="form-help">This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={handleClose} disabled={isDeleting}>Cancel</button>
          <button 
            className="btn btn-danger" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : `Delete ${repositoryCount > 1 ? 'Selected' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

interface InfoModalProps {
  repository: RepositoryMigration;
  onClose: () => void;
  isGHESMode?: boolean;
}

function InfoModal({ repository, onClose, isGHESMode = false }: InfoModalProps) {
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
            
            {isGHESMode && (
              <>
                <div className="info-label">Git Source Export State:</div>
                <div className="info-value">{repository.gitSourceExportState || 'N/A'}</div>
                
                <div className="info-label">Metadata Export State:</div>
                <div className="info-value">{repository.metadataExportState || 'N/A'}</div>
                
                {repository.gitSourceExportId && (
                  <>
                    <div className="info-label">Git Source Export ID:</div>
                    <div className="info-value">{repository.gitSourceExportId}</div>
                  </>
                )}
                
                {repository.metadataExportId && (
                  <>
                    <div className="info-label">Metadata Export ID:</div>
                    <div className="info-value">{repository.metadataExportId}</div>
                  </>
                )}
                
                {repository.exportFailureReason && (
                  <>
                    <div className="info-label">Export Failure Reason:</div>
                    <div className="info-value" style={{ color: 'var(--color-danger-fg)' }}>
                      {repository.exportFailureReason}
                    </div>
                  </>
                )}
              </>
            )}
            
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
  onArchive?: () => void;
  onUnarchive?: () => void;
}

function SettingsModal({ repository, onClose, onUpdate, onDelete, onArchive, onUnarchive }: SettingsModalProps) {
  const [lockSource, setLockSource] = useState(repository.lockSource || false);
  const [repositoryVisibility, setRepositoryVisibility] = useState(repository.repositoryVisibility || 'private');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const isMigrationStarted = repository.state === 'queued' || repository.state === 'in_progress' || repository.state === 'completed' || repository.state === 'failed';
  const isSettingsEditable = repository.state === 'pending' || repository.state === 'reset';
  const isArchived = repository.archived || false;

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

  const handleArchive = () => {
    if (onArchive) {
      onArchive();
      onClose();
    }
  };

  const handleUnarchive = () => {
    if (onUnarchive) {
      onUnarchive();
      onClose();
    }
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
        <div className="modal-footer" style={{ justifyContent: 'flex-start' }}>
          {isArchived ? (
            <button 
              className="btn btn-warning" 
              onClick={handleUnarchive}
              title="Unarchive this repository"
              aria-label="Unarchive this repository"
            >
              Unarchive
            </button>
          ) : (
            <button 
              className="btn btn-warning" 
              onClick={handleArchive}
              title="Archive this repository"
              aria-label="Archive this repository"
            >
              Archive
            </button>
          )}
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
  const targetOrganization = process.env.NEXT_PUBLIC_TARGET_ORGANIZATION || 'Not configured';
  const targetDescription = process.env.NEXT_PUBLIC_TARGET_DESCRIPTION || 'Not configured';
  const sourceDescription = process.env.NEXT_PUBLIC_SOURCE_DESCRIPTION || 'Not configured';
  const mode = process.env.NEXT_PUBLIC_MODE || 'GH';
  const isGHESMode = mode === 'GHES';

  // Keep ref in sync with state
  useEffect(() => {
    pollingReposRef.current = pollingRepos;
  }, [pollingRepos]);

  // Keep export polling ref in sync with state
  useEffect(() => {
    pollingExportsRef.current = pollingExports;
  }, [pollingExports]);

  // Define startPolling before it's used in effects
  const startPolling = useCallback((repoId: string, _migrationId: string) => {
    setPollingRepos(prev => new Set(prev).add(repoId));
  }, []);

  // Define startExportPolling before it's used
  const startExportPolling = useCallback((_repoId: string, _organizationName: string) => {
    setPollingExports(prev => new Set(prev).add(_repoId));
  }, []);

  useEffect(() => {
    const subscription = client.models.RepositoryMigration.observeQuery().subscribe({
      next: (data) => setRepositories([...data.items]),
    });

    return () => subscription.unsubscribe();
  }, []);

  // Resume polling for repositories that are in progress or queued on page load/refresh
  useEffect(() => {
    repositories.forEach(repo => {
      // Start polling for repositories that are in_progress or queued and have a repositoryMigrationId
      // Check ref to avoid unnecessary state updates
      if ((repo.state === 'in_progress' || repo.state === 'queued') && repo.repositoryMigrationId && !pollingReposRef.current.has(repo.id)) {
        startPolling(repo.id, repo.repositoryMigrationId);
      }
      
      // Start export polling for repositories with exports in progress
      if (isGHESMode && repo.gitSourceExportId && repo.metadataExportId && !pollingExportsRef.current.has(repo.id)) {
        const gitSourceInProgress = repo.gitSourceExportState === 'pending' || repo.gitSourceExportState === 'exporting';
        const metadataInProgress = repo.metadataExportState === 'pending' || repo.metadataExportState === 'exporting';
        
        if (gitSourceInProgress || metadataInProgress) {
          // Extract organization name from source URL
          const match = repo.sourceRepositoryUrl.match(/\/([^\/]+)\/[^\/]+$/);
          if (match) {
            const organizationName = match[1];
            startExportPolling(repo.id, organizationName);
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
    await client.models.RepositoryMigration.create({
      sourceRepositoryUrl: url,
      repositoryName: name,
      state: 'pending',
      lockSource,
      repositoryVisibility,
      archived: false,
    });
  };

  const deleteRepository = async (id: string) => {
    await client.models.RepositoryMigration.delete({ id });
  };

  const archiveRepository = async (repo: RepositoryMigration) => {
    await client.models.RepositoryMigration.update({
      id: repo.id,
      archived: true,
    });
  };

  const unarchiveRepository = async (repo: RepositoryMigration) => {
    await client.models.RepositoryMigration.update({
      id: repo.id,
      archived: false,
    });
  };

  const updateRepositorySettings = async (repo: RepositoryMigration, lockSource: boolean, repositoryVisibility: string) => {
    await client.models.RepositoryMigration.update({
      id: repo.id,
      lockSource,
      repositoryVisibility,
    });
  };

  const resetRepository = async (repo: RepositoryMigration, resetExport: boolean = false) => {
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
      const updateFields: Record<string, string | boolean | null> = {
        id: repo.id,
        state: 'reset',
        migrationSourceId: null,
        repositoryMigrationId: null,
        lockSource: false,
        repositoryVisibility: 'private', // Reset to default
        failureReason: null,
      };

      // If resetExport is true, also clear export fields
      if (resetExport) {
        updateFields.gitSourceExportId = null;
        updateFields.metadataExportId = null;
        updateFields.gitSourceExportState = null;
        updateFields.metadataExportState = null;
        updateFields.gitSourceArchiveUrl = null;
        updateFields.metadataArchiveUrl = null;
        updateFields.exportFailureReason = null;
      }

      await client.models.RepositoryMigration.update(updateFields);

      console.log('Repository reset successfully');
    } catch (error) {
      console.error('Error resetting repository:', error);
      // Still update the state even if the API calls failed
      const updateFields: Record<string, string | boolean | null> = {
        id: repo.id,
        state: 'reset',
        migrationSourceId: null,
        repositoryMigrationId: null,
        lockSource: false,
        repositoryVisibility: 'private', // Reset to default
        failureReason: error instanceof Error ? error.message : 'Error during reset',
      };

      if (resetExport) {
        updateFields.gitSourceExportId = null;
        updateFields.metadataExportId = null;
        updateFields.gitSourceExportState = null;
        updateFields.metadataExportState = null;
        updateFields.gitSourceArchiveUrl = null;
        updateFields.metadataArchiveUrl = null;
        updateFields.exportFailureReason = null;
      }

      await client.models.RepositoryMigration.update(updateFields);
    }
  };

  const startMigration = async (repo: RepositoryMigration) => {
    try {
      // Optimistic update: Set state to queued immediately for user feedback
      await client.models.RepositoryMigration.update({
        id: repo.id,
        state: 'queued',
      });

      // For GHES mode, pass archive URLs
      const ghesParams = isGHESMode ? {
        gitSourceArchiveUrl: repo.gitSourceArchiveUrl || undefined,
        metadataArchiveUrl: repo.metadataArchiveUrl || undefined,
      } : {};

      // Call the startMigration function
      // Pass destinationOwnerId if it exists to skip the API call to fetch it
      const result = await client.queries.startMigration({
        sourceRepositoryUrl: repo.sourceRepositoryUrl,
        repositoryName: repo.repositoryName,
        targetRepoVisibility: repo.repositoryVisibility || 'private',
        continueOnError: true,
        lockSource: repo.lockSource || false,
        destinationOwnerId: repo.destinationOwnerId || undefined,
        ...ghesParams,
      });

      console.log('Migration started:', result);

      if (result.data) {
        // Parse the outer JSON wrapper
        const lambdaResponse = JSON.parse(result.data as string);
        // Parse the inner body JSON
        const response = JSON.parse(lambdaResponse.body);
        
        if (response.success) {
          // Update with complete migration details including IDs
          await client.models.RepositoryMigration.update({
            id: repo.id,
            repositoryMigrationId: response.migrationId,
            migrationSourceId: response.migrationSourceId,
            destinationOwnerId: response.ownerId,
            // Keep state as queued; polling will update to actual state
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

  const startExport = async (repo: RepositoryMigration) => {
    try {
      // Extract organization name from source URL
      const match = repo.sourceRepositoryUrl.match(/\/([^\/]+)\/[^\/]+$/);
      if (!match) {
        throw new Error('Could not extract organization name from source URL');
      }
      const organizationName = match[1];

      // Optimistic update: Set export states to pending
      await client.models.RepositoryMigration.update({
        id: repo.id,
        gitSourceExportState: 'pending',
        metadataExportState: 'pending',
      });

      // Call the startExport function
      const result = await client.queries.startExport({
        organizationName,
        repositoryNames: [repo.repositoryName],
        lockSource: repo.lockSource || false,
      });

      console.log('Export started:', result);

      if (result.data) {
        // Parse the outer JSON wrapper
        const lambdaResponse = JSON.parse(result.data as string);
        // Parse the inner body JSON
        const response = JSON.parse(lambdaResponse.body);
        
        if (response.success) {
          // Update with export IDs and states
          await client.models.RepositoryMigration.update({
            id: repo.id,
            gitSourceExportId: String(response.gitSourceExportId),
            metadataExportId: String(response.metadataExportId),
            gitSourceExportState: response.gitSourceExportState,
            metadataExportState: response.metadataExportState,
          });

          // Start polling for export status
          startExportPolling(repo.id, organizationName);
        } else {
          await client.models.RepositoryMigration.update({
            id: repo.id,
            gitSourceExportState: 'failed',
            metadataExportState: 'failed',
            exportFailureReason: response.message || 'Failed to start export',
          });
        }
      }
    } catch (error) {
      console.error('Error starting export:', error);
      await client.models.RepositoryMigration.update({
        id: repo.id,
        gitSourceExportState: 'failed',
        metadataExportState: 'failed',
        exportFailureReason: error instanceof Error ? error.message : 'Unknown error',
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

  const checkExportStatus = useCallback(async (repoId: string, organizationName: string, gitSourceExportId: string, metadataExportId: string) => {
    try {
      // Check git source export status
      const gitSourceResult = await client.queries.checkExportStatus({
        organizationName,
        exportId: gitSourceExportId,
      });

      // Check metadata export status
      const metadataResult = await client.queries.checkExportStatus({
        organizationName,
        exportId: metadataExportId,
      });

      if (gitSourceResult.data && metadataResult.data) {
        // Parse responses
        const gitSourceLambdaResponse = JSON.parse(gitSourceResult.data as string);
        const gitSourceResponse = JSON.parse(gitSourceLambdaResponse.body);
        
        const metadataLambdaResponse = JSON.parse(metadataResult.data as string);
        const metadataResponse = JSON.parse(metadataLambdaResponse.body);
        
        if (gitSourceResponse.success && metadataResponse.success) {
          // Update repository with current export states
          await client.models.RepositoryMigration.update({
            id: repoId,
            gitSourceExportState: gitSourceResponse.state,
            metadataExportState: metadataResponse.state,
            gitSourceArchiveUrl: gitSourceResponse.archiveUrl || undefined,
            metadataArchiveUrl: metadataResponse.archiveUrl || undefined,
          });

          // Stop polling if both exports are complete or failed
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
      }
    } catch (error) {
      console.error('Error checking export status:', error);
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
            
            await client.models.RepositoryMigration.create({
              sourceRepositoryUrl: sourceRepoUrl,
              repositoryName: repoName,
              state: 'pending',
              lockSource,
              repositoryVisibility: visibility,
              archived: false,
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
              archived: false,
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
      await startMigration(repo);
    }
  };

  const handleResetSelected = async (resetExport: boolean = false) => {
    const selectedRepoObjects = repositories.filter(r => 
      selectedRepos.has(r.id) && r.state !== 'pending' && r.state !== 'reset'
    );
    
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
    return repo && repo.state !== 'pending' && repo.state !== 'reset';
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

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1 className="app-title">GitHub Repository Migration</h1>
        </div>
        <button className="btn btn-default sign-out-btn" onClick={signOut}>
          Sign out
        </button>
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
                    <button 
                      className={`btn btn-sm ${getStatusButtonClass(repo.state, exportState)}`}
                      onClick={() => {
                        if (canClickStatus) {
                          // Archived repos in completed/failed state can show info modal
                          setInfoRepo(repo);
                        } else if (!isArchived) {
                          // Non-archived repos use normal handleStatusButtonClick logic
                          handleStatusButtonClick(repo);
                        }
                      }}
                      disabled={isArchived && !canClickStatus}
                    >
                      {getStatusButtonText(repo.state, exportState)}
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => setResetRepo(repo)}
                      disabled={isArchived || repo.state === 'pending' || repo.state === 'reset'}
                      title={isArchived ? 'Reset is not available for archived repositories' : (repo.state === 'pending' || repo.state === 'reset' ? 'Reset is not available for repositories in pending or reset state' : 'Reset this repository')}
                      aria-label={isArchived ? 'Reset is not available for archived repositories' : (repo.state === 'pending' || repo.state === 'reset' ? 'Reset is not available for repositories in pending or reset state' : 'Reset this repository')}
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
          isGHESMode={isGHESMode}
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
          onDeleteSelected={handleDeleteSelected}
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
        />
      )}

      {showBulkResetConfirmation && (
        <ResetConfirmationModal
          onClose={() => setShowBulkResetConfirmation(false)}
          onConfirm={handleResetSelected}
          repositoryCount={repositories.filter(r => selectedRepos.has(r.id) && r.state !== 'pending' && r.state !== 'reset').length}
          hasLockedRepos={repositories.filter(r => selectedRepos.has(r.id) && r.state !== 'pending' && r.state !== 'reset').some(r => r.lockSource)}
          isGHESMode={isGHESMode}
        />
      )}

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
        />
      )}
    </div>
  );
}

