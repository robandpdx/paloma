"use client";

import { useState } from "react";

export interface ResetConfirmationModalProps {
  onClose: () => void;
  onConfirm: (resetExport: boolean) => Promise<void>;
  repositoryCount: number;
  hasLockedRepos?: boolean;
  isGHESMode?: boolean;
  exportCompleted?: boolean;
  migrationStarted?: boolean;
}

export default function ResetConfirmationModal({ onClose, onConfirm, repositoryCount, hasLockedRepos = false, isGHESMode = false, exportCompleted = false, migrationStarted = false }: ResetConfirmationModalProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [resetExport, setResetExport] = useState(isGHESMode && exportCompleted && !migrationStarted);

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
            {isGHESMode && resetExport && hasLockedRepos && <li>Unlock the source repository if it was locked</li>}
            {isGHESMode && resetExport && !hasLockedRepos && repositoryCount > 1 && <li>Unlock source repositories that were locked</li>}
            {isGHESMode && !resetExport && <li><strong>Source repositories will remain locked</strong> (check &quot;Reset Export&quot; to unlock)</li>}
            {!isGHESMode && hasLockedRepos && <li>Unlock the source repository if it was locked</li>}
            {!isGHESMode && !hasLockedRepos && repositoryCount > 1 && <li>Unlock source repositories that were locked</li>}
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
                If checked, this will also clear the export data and unlock source repositories, requiring a new export before the next migration can be started. If unchecked, export data will be preserved and source repositories will remain locked.
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
