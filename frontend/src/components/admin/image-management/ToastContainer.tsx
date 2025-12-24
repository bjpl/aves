/**
 * Toast notification container
 */

import React from 'react';
import { Alert } from '../../ui/Alert';
import { ToastNotification } from './types';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Alert
          key={toast.id}
          variant={toast.type === 'success' ? 'success' : toast.type === 'error' ? 'danger' : 'info'}
          onClose={() => onRemove(toast.id)}
        >
          {toast.message}
        </Alert>
      ))}
    </div>
  );
};
