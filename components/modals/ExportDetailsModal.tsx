import type { RepositoryMigration } from "@/lib/api";

export interface ExportDetailsModalProps {
  repository: RepositoryMigration;
  onClose: () => void;
}

export default function ExportDetailsModal({ repository, onClose }: ExportDetailsModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Export Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="info-grid">
            <div className="info-label">Repository Name:</div>
            <div className="info-value">{repository.repositoryName}</div>
            
            <div className="info-label">Source URL:</div>
            <div className="info-value">{repository.sourceRepositoryUrl}</div>
            
            <div className="info-label">Git Source Export State:</div>
            <div className="info-value">{repository.gitSourceExportState || 'Not started'}</div>
            
            <div className="info-label">Metadata Export State:</div>
            <div className="info-value">{repository.metadataExportState || 'Not started'}</div>
            
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
            
            {repository.gitSourceArchiveUrl && (
              <>
                <div className="info-label">Git Source Archive:</div>
                <div className="info-value">Available</div>
              </>
            )}
            
            {repository.metadataArchiveUrl && (
              <>
                <div className="info-label">Metadata Archive:</div>
                <div className="info-value">Available</div>
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
