import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  message: string;
  songName?: string;  // Optional song name for success messages
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
  duration?: number;  // Duration in ms before auto-dismiss (default 2000)
}

export function Toast({ toast, onDismiss, duration = 2000 }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start exit animation slightly before actual dismiss
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    const dismissTimer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, onDismiss, duration]);

  return (
    <div className={`toast toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}>
      <div className="toast-icon">
        {toast.type === 'success' ? '✓' : '✕'}
      </div>
      <div className="toast-content">
        <span className="toast-message">{toast.message}</span>
        {toast.songName && (
          <span className="toast-song-name">🎵 {toast.songName}</span>
        )}
      </div>
    </div>
  );
}

// Toast container manages multiple toasts
interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error', songName?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message, songName }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, showToast, dismissToast };
}

