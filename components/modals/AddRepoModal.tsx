"use client";

import { useState } from "react";

export interface AddRepoModalProps {
  onClose: () => void;
  onAdd: (url: string, name: string, lockSource: boolean, repositoryVisibility: string) => void;
}

export default function AddRepoModal({ onClose, onAdd }: AddRepoModalProps) {
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
    const match = repoUrl.match(/github\.com\/[^\/]+\/([^\/]+)/);
    if (match) {
      return match[1].replace(/\.git$/, '');
    }
    return '';
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
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
