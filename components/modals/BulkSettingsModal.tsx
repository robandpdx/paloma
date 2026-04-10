"use client";

import { useState } from "react";
import type { RepositoryMigration } from "@/lib/api";

export interface BulkSettingsModalProps {
  onClose: () => void;
  onSave: (lockSource: boolean, repositoryVisibility: string) => void;
  selectedCount: number;
  onArchiveSelected: () => void;
  isArchiveView: boolean;
  onShowDeleteConfirmation: () => void;
  selectedRepositories: RepositoryMigration[];
}

export default function BulkSettingsModal({ onClose, onSave, selectedCount, onArchiveSelected, isArchiveView, onShowDeleteConfirmation, selectedRepositories }: BulkSettingsModalProps) {
  const [lockSource, setLockSource] = useState(false);
  const [repositoryVisibility, setRepositoryVisibility] = useState("private");

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
