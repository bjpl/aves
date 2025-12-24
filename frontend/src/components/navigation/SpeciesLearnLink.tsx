/**
 * SpeciesLearnLink Component
 *
 * Link to the Learn page filtered for a specific species.
 * Typically used on species detail pages to encourage vocabulary learning.
 */

import React from 'react';
import { Link } from 'react-router-dom';

export interface SpeciesLearnLinkProps {
  /**
   * Species ID to link to
   */
  speciesId: string;

  /**
   * Species name for display
   */
  speciesName: string;

  /**
   * Display variant
   */
  variant?: 'link' | 'button' | 'card';

  /**
   * Size (for button variant)
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Show icon
   */
  showIcon?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Custom text (defaults to "Learn vocabulary for {speciesName}")
   */
  text?: string;
}

export const SpeciesLearnLink: React.FC<SpeciesLearnLinkProps> = ({
  speciesId,
  speciesName,
  variant = 'button',
  size = 'md',
  showIcon = true,
  className = '',
  text,
}) => {
  const learnUrl = `/learn?speciesId=${speciesId}`;
  const displayText = text || `Learn vocabulary for ${speciesName}`;

  const icon = showIcon ? (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ) : null;

  // Link variant (inline text link)
  if (variant === 'link') {
    return (
      <Link
        to={learnUrl}
        className={`inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors underline underline-offset-2 ${className}`}
        aria-label={displayText}
      >
        {icon}
        <span className="text-sm font-medium">{displayText}</span>
      </Link>
    );
  }

  // Card variant (featured CTA card)
  if (variant === 'card') {
    return (
      <Link
        to={learnUrl}
        className={`block p-4 rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-green-50 hover:border-blue-300 hover:shadow-lg transition-all ${className}`}
        aria-label={displayText}
      >
        <div className="flex items-start gap-3">
          {icon && (
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Learn Bird Vocabulary
            </h3>
            <p className="text-sm text-gray-600">
              Discover and master Spanish terms for parts of {speciesName}
            </p>
          </div>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </Link>
    );
  }

  // Button variant (default)
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <Link
      to={learnUrl}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-gradient-to-r from-blue-600 to-green-600 text-white hover:shadow-xl transform hover:scale-105 ${sizeStyles[size]} ${className}`}
      aria-label={displayText}
    >
      {icon}
      <span>{displayText}</span>
    </Link>
  );
};

export default SpeciesLearnLink;
