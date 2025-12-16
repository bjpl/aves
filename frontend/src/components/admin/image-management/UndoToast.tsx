/**
 * Undo Toast Component
 *
 * CONCEPT: Grace period notification for bulk operations with undo capability
 * WHY: Allow admins to cancel accidental bulk operations within 30 seconds
 * PATTERN: Toast notification with countdown timer and undo button
 */

import React, { useState, useEffect } from 'react';
import { error as logError } from '../../../utils/logger';

export interface UndoToastProps {
  operationId: string;
  message: string;
  itemCount: number;
  expiresAt: string;
  onUndo: (operationId: string) => Promise<void>;
  onExpire?: () => void;
  onDismiss?: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  operationId,
  message,
  itemCount,
  expiresAt,
  onUndo,
  onExpire,
  onDismiss,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Calculate initial seconds remaining
    const calculateRemaining = () => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.ceil((expires - now) / 1000));
      return remaining;
    };

    setSecondsRemaining(calculateRemaining());

    // Update countdown every second
    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onExpire && !isDismissed) {
          onExpire();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire, isDismissed]);

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      await onUndo(operationId);
      setIsDismissed(true);
    } catch (error) {
      logError('Failed to undo operation', error instanceof Error ? error : { error });
      setIsUndoing(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (isDismissed || secondsRemaining <= 0) {
    return null;
  }

  // Calculate progress percentage (0-100)
  const progressPercentage = (secondsRemaining / 30) * 100;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-orange-400 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Warning icon */}
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="w-6 h-6 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Message */}
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                {message}
              </h4>
              <p className="text-sm text-gray-600">
                {itemCount} item{itemCount !== 1 ? 's' : ''} will be deleted in{' '}
                <span className="font-bold text-orange-600">{secondsRemaining}s</span>
              </p>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isUndoing}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleUndo}
              disabled={isUndoing}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {isUndoing ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Undoing...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                  Undo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add animation styles to global CSS if not already present
// .animate-slide-up {
//   animation: slideUp 0.3s ease-out;
// }
// @keyframes slideUp {
//   from {
//     transform: translateY(100%);
//     opacity: 0;
//   }
//   to {
//     transform: translateY(0);
//     opacity: 1;
//   }
// }
