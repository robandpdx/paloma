"use client";

import { useState, useEffect } from "react";
import type { RepositoryMigration, RepoVisibility } from "@/lib/api";
import DeleteModal from "./DeleteModal";

export interface SettingsModalProps {
  repository: RepositoryMigration;
  onClose: () => void;
  onUpdate: (lockSource: boolean, repositoryVisibility: string) => void;
  onDelete: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
}

export default function SettingsModal({ repository, onClose, onUpdate, onDelete, onArchive, onUnarchive }: SettingsModalProps) {
  const [lockSource, setLockSource] = useState(repository.lockSource || false);
  const [repositoryVisibility, setRepositoryVisibility] = useState(repository.repositoryVisibility || 'private');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const isMigrationStarted = repository.state === 'queued' || repository.state === 'in_progress' || repository.state === 'completed' || repository.state === 'failed';
  const isSettingsEditable = repository.state === 'pending' || repository.state === 'reset';
  const isArchived = repository.archived || false;

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

  const handleVisibilityChange = async (visibility: RepoVisibility) => {
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
              onChange={(e) => handleVisibilityChange(e.target.value as RepoVisibility)}
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
