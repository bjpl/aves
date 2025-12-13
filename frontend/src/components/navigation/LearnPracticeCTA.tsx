/**
 * LearnPracticeCTA Component
 *
 * CTA button shown after completing a lesson, encouraging users to
 * practice what they learned. Links to /practice with optional filters
 * for species or module.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

export interface LearnPracticeCTAProps {
  /**
   * Optional species ID to filter practice exercises
   */
  speciesId?: string;

  /**
   * Optional module ID to filter practice exercises
   */
  moduleId?: string;

  /**
   * Custom button text (defaults to "Practice what you learned")
   */
  text?: string;

  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'success';

  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Full width button
   */
  fullWidth?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const LearnPracticeCTA: React.FC<LearnPracticeCTAProps> = ({
  speciesId,
  moduleId,
  text = 'Practice what you learned',
  variant = 'success',
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  // Build query params for practice page
  const params = new URLSearchParams();
  if (speciesId) params.set('speciesId', speciesId);
  if (moduleId) params.set('moduleId', moduleId);

  const queryString = params.toString();
  const practiceUrl = `/practice${queryString ? `?${queryString}` : ''}`;

  // Icon for the button
  const icon = (
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
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );

  return (
    <Link
      to={practiceUrl}
      className={className}
      aria-label={`${text}${speciesId ? ' for this species' : ''}${moduleId ? ' from this module' : ''}`}
    >
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        rightIcon={icon}
        className="shadow-lg hover:shadow-xl"
      >
        {text}
      </Button>
    </Link>
  );
};

export default LearnPracticeCTA;
