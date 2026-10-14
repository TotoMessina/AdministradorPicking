import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { playWarningTone } from '../utils/audio';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextProps {
  notify: (type: ToastType, message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((type: ToastType, message: string, title?: string) => {
    if (type === 'warning' || type === 'error') {
      playWarningTone();
    }

    const defaultTitle =
      type === 'success' ? 'Éxito' :
      type === 'warning' ? 'Atención' :
      type === 'error' ? 'Error' : 'Kiosco Express';

    const newToast: ToastItem = {
      id: `toast_${Date.now()}_${Math.random()}`,
      type,
      title: title || defaultTitle,
      message
    };

    setToasts(prev => [newToast, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 3800);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}

      {/* Floating Toasts Container */}
      <div
        className="toast-container" aria-live="polite" aria-relevant="additions"
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
          maxWidth: '380px',
          width: '100%',
          pointerEvents: 'none'
        }}
      >
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';
          const isError = toast.type === 'error';

          const borderColor = isError ? 'var(--tone-danger-border)' : 'var(--tone-border)';
          const bgColor = isError ? 'var(--tone-danger-soft)' : 'var(--tone-soft)';
          const iconColor = isError ? 'var(--tone-danger)' : 'var(--tone-accent)';

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                background: 'var(--bg-surface, #ffffff)',
                border: `1.5px solid ${borderColor}`,
                borderRadius: '0.875rem',
                padding: '0.875rem 1rem',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                animation: 'slideInRight 0.22s ease-out'
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '0.5rem',
                  background: bgColor,
                  color: iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {isSuccess && <CheckCircle2 size={18} />}
                {isWarning && <AlertTriangle size={18} />}
                {isError && <AlertCircle size={18} />}
                {!isSuccess && !isWarning && !isError && <Info size={18} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  {toast.title}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted, #64748b)', marginTop: '2px', wordBreak: 'break-word' }}>
                  {toast.message}
                </div>
              </div>

              <button
                aria-label="Cerrar notificación"
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
