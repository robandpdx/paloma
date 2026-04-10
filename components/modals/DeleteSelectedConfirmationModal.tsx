"use client";

import { useState } from "react";

export interface DeleteSelectedConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
  repositoryCount: number;
}

export default function DeleteSelectedConfirmationModal({ onClose, onConfirm, repositoryCount }: DeleteSelectedConfirmationModalProps) {
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
