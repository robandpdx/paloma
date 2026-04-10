import type { RepositoryMigration } from "@/lib/api";

export interface InfoModalProps {
  repository: RepositoryMigration;
  onClose: () => void;
}

export default function InfoModal({ repository, onClose }: InfoModalProps) {
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
