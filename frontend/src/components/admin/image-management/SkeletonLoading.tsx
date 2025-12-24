/**
 * Skeleton Loading Components for Image Management
 *
 * CONCEPT: Skeleton screens provide better perceived performance than spinners
 * WHY: Users see the page structure immediately, reducing perceived load time
 * PATTERN: Animated placeholder components that match final layout
 */

import React from 'react';

// Base skeleton element with pulse animation
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// Card skeleton
export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <Skeleton className="h-6 w-1/3 mb-4" />
    <Skeleton className="h-4 w-2/3 mb-6" />
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  </div>
);

// Stats card skeleton
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-lg p-4 text-center">
    <Skeleton className="h-8 w-16 mx-auto mb-2" />
    <Skeleton className="h-4 w-24 mx-auto" />
  </div>
);

// Stats row skeleton (4 stat cards)
export const StatsRowSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCardSkeleton />
    <StatCardSkeleton />
    <StatCardSkeleton />
    <StatCardSkeleton />
  </div>
);

// Species select skeleton
export const SpeciesSelectSkeleton: React.FC = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-10 w-full" />
  </div>
);

// Job card skeleton
export const JobCardSkeleton: React.FC = () => (
  <div className="border rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <Skeleton className="h-2 w-full rounded-full mb-2" />
    <Skeleton className="h-4 w-32" />
  </div>
);

// Active jobs card skeleton
export const ActiveJobsSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <Skeleton className="h-6 w-1/3 mb-2" />
    <Skeleton className="h-4 w-2/3 mb-6" />
    <div className="space-y-4">
      <JobCardSkeleton />
      <JobCardSkeleton />
    </div>
  </div>
);

// Image grid skeleton for gallery
export const ImageGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="aspect-square">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    ))}
  </div>
);

// Progress bar skeleton
export const ProgressBarSkeleton: React.FC = () => (
  <div className="space-y-2">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-3 w-full rounded-full" />
    <Skeleton className="h-3 w-32" />
  </div>
);

// Collection tab skeleton
export const CollectionTabSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="bg-white rounded-lg shadow-lg p-6">
      <Skeleton className="h-6 w-1/3 mb-2" />
      <Skeleton className="h-4 w-2/3 mb-6" />
      <div className="space-y-4">
        <SpeciesSelectSkeleton />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="mt-6 pt-4 border-t">
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
    <ActiveJobsSkeleton />
  </div>
);

// Statistics tab skeleton
export const StatisticsTabSkeleton: React.FC = () => (
  <div className="space-y-6">
    <StatsRowSkeleton />
    <div className="bg-white rounded-lg shadow-lg p-6">
      <Skeleton className="h-6 w-1/4 mb-2" />
      <Skeleton className="h-4 w-1/3 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressBarSkeleton />
        <ProgressBarSkeleton />
      </div>
    </div>
    <div className="bg-white rounded-lg shadow-lg p-6">
      <Skeleton className="h-6 w-1/3 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
            <Skeleton className="h-6 w-8 mx-auto mb-1" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Gallery tab skeleton
export const GalleryTabSkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
    <ImageGridSkeleton count={12} />
    <div className="flex justify-center gap-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-10" />
      <Skeleton className="h-10 w-10" />
      <Skeleton className="h-10 w-10" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// Job history table skeleton
export const JobHistorySkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <Skeleton className="h-6 w-1/4 mb-2" />
    <Skeleton className="h-4 w-1/3 mb-6" />
    <div className="space-y-3">
      {/* Table header */}
      <div className="flex gap-4 pb-3 border-b">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Table rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-gray-100">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  </div>
);

// Full dashboard skeleton (for initial load)
export const DashboardSkeleton: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  switch (activeTab) {
    case 'collection':
      return <CollectionTabSkeleton />;
    case 'gallery':
      return <GalleryTabSkeleton />;
    case 'annotation':
      return <CollectionTabSkeleton />;
    case 'statistics':
      return <StatisticsTabSkeleton />;
    case 'history':
      return <JobHistorySkeleton />;
    default:
      return <CollectionTabSkeleton />;
  }
};
