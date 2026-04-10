"use client";

import { useState } from "react";

export interface ScanOrgModalProps {
  onClose: () => void;
  onScan: (orgName: string, repositoryVisibility: string, lockSource: boolean) => void;
}

export default function ScanOrgModal({ onClose, onScan }: ScanOrgModalProps) {
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
