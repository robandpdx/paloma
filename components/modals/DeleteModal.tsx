"use client";

import { useState } from "react";
import type { RepositoryMigration } from "@/lib/api";

export interface DeleteModalProps {
  repository: RepositoryMigration;
  onClose: () => void;
  onDelete: () => void;
}

export default function DeleteModal({ repository, onClose, onDelete }: DeleteModalProps) {
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
