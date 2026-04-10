"use client";

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 10000,
        padding: '12px 16px',
        backgroundColor: 'var(--color-danger-emphasis, #cf222e)',
        color: '#fff',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '480px',
        fontSize: '14px',
      }}
      role="alert"
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '0 4px',
        }}
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}
