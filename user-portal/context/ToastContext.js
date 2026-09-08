import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#34d399', icon: '#10b981' },
  error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#f87171', icon: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24', icon: '#f59e0b' },
  info: { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', text: '#a5b4fc', icon: '#6366f1' },
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const stableToast = useRef({
    success: (msg) => addToastRef.current(msg, 'success'),
    error: (msg) => addToastRef.current(msg, 'error', 6000),
    warning: (msg) => addToastRef.current(msg, 'warning'),
    info: (msg) => addToastRef.current(msg, 'info'),
  });

  return (
    <ToastContext.Provider value={stableToast.current}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            const c = COLORS[t.type] || COLORS.info;
            return (
              <div key={t.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: c.bg,
                border: `1px solid ${c.border}`,
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                fontSize: '13px',
                fontWeight: 500,
                color: c.text,
                fontFamily: 'Inter, system-ui, sans-serif',
                pointerEvents: 'auto',
                animation: 'toastSlideIn 0.25s ease-out',
                maxWidth: '380px',
              }}>
                <Icon size={16} color={c.icon} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{t.message}</span>
                <button
                  onClick={() => removeToast(t.id)}
                  style={{
                    background: 'none', border: 'none', color: c.text,
                    cursor: 'pointer', padding: '2px', opacity: 0.7, flexShrink: 0,
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { success: () => {}, error: () => {}, warning: () => {}, info: () => {} };
  }
  return ctx;
}
