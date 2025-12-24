import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  outlined?: boolean;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  rounded = false,
  outlined = false,
  dot = false,
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium transition-colors';

  const variantStyles = {
    default: outlined
      ? 'border border-gray-300 text-gray-700 bg-transparent'
      : 'bg-gray-100 text-gray-800',
    primary: outlined
      ? 'border border-blue-300 text-blue-700 bg-transparent'
      : 'bg-blue-100 text-blue-800',
    success: outlined
      ? 'border border-green-300 text-green-700 bg-transparent'
      : 'bg-green-100 text-green-800',
    warning: outlined
      ? 'border border-yellow-300 text-yellow-700 bg-transparent'
      : 'bg-yellow-100 text-yellow-800',
    danger: outlined
      ? 'border border-red-300 text-red-700 bg-transparent'
      : 'bg-red-100 text-red-800',
    info: outlined
      ? 'border border-blue-300 text-blue-700 bg-transparent'
      : 'bg-blue-50 text-blue-700',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const shapeStyle = rounded ? 'rounded-full' : 'rounded';

  const dotColors = {
    default: 'bg-gray-500',
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${shapeStyle} ${className}`}
      {...props}
    >
      {dot && <span className={`w-2 h-2 rounded-full mr-1.5 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

export interface StatusBadgeProps {
  status: 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'LC':
        return { variant: 'success' as const, text: label || 'Least Concern' };
      case 'NT':
        return { variant: 'warning' as const, text: label || 'Near Threatened' };
      case 'VU':
        return { variant: 'warning' as const, text: label || 'Vulnerable' };
      case 'EN':
        return { variant: 'danger' as const, text: label || 'Endangered' };
      case 'CR':
        return { variant: 'danger' as const, text: label || 'Critically Endangered' };
      default:
        return { variant: 'default' as const, text: label || status };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} size="sm" rounded>
      {config.text}
    </Badge>
  );
};
