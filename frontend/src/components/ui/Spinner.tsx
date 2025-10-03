import React from 'react';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'white';
  label?: string;
  centered?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  label,
  centered = false,
}) => {
  const sizeStyles = {
    xs: 'h-4 w-4 border-2',
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4',
  };

  const colorStyles = {
    primary: 'border-blue-600',
    secondary: 'border-gray-600',
    success: 'border-green-600',
    danger: 'border-red-600',
    white: 'border-white',
  };

  const spinner = (
    <div
      className={`animate-spin rounded-full ${sizeStyles[size]} ${colorStyles[color]} border-t-transparent`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center">
        {spinner}
        {label && <span className="ml-2 text-gray-600">{label}</span>}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center">
      {spinner}
      {label && <span className="ml-2 text-gray-600">{label}</span>}
    </div>
  );
};

export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  transparent?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  transparent = false,
}) => {
  if (!isLoading) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        transparent ? 'bg-white bg-opacity-75' : 'bg-gray-900 bg-opacity-50'
      }`}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 flex flex-col items-center">
        <Spinner size="lg" color="primary" />
        {message && <p className="mt-4 text-gray-700 font-medium">{message}</p>}
      </div>
    </div>
  );
};
