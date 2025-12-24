// CONCEPT: Skip link for keyboard navigation accessibility
// WHY: Allows keyboard users to skip repetitive navigation and jump to main content
// PATTERN: Visually hidden until focused, positioned above all content when visible

import React from 'react';

interface SkipLinkProps {
  targetId: string;
  children: React.ReactNode;
}

/**
 * SkipLink component provides keyboard accessibility by allowing users
 * to skip navigation and jump directly to main content.
 *
 * @param targetId - The id of the target element to skip to
 * @param children - The text content to display (e.g., "Skip to main content")
 *
 * @example
 * <SkipLink targetId="main-content">Skip to main content</SkipLink>
 */
export const SkipLink: React.FC<SkipLinkProps> = ({ targetId, children }) => (
  <a
    href={`#${targetId}`}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
  >
    {children}
  </a>
);
