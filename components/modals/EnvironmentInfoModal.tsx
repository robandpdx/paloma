export interface EnvironmentInfoModalProps {
  onClose: () => void;
  sourceDescription: string;
  targetDescription: string;
  targetOrganization: string;
  mode: string;
  isWebSocketConnected: boolean;
}

export default function EnvironmentInfoModal({ onClose, sourceDescription, targetDescription, targetOrganization, mode, isWebSocketConnected }: EnvironmentInfoModalProps) {
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
            
            <div className="info-label">Mode:</div>
            <div className="info-value">{mode}</div>
            
            <div className="info-label">Real-time Updates:</div>
            <div className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                display: 'inline-block', 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: isWebSocketConnected ? '#28a745' : '#dc3545' 
              }}></span>
              {isWebSocketConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
