import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton, SkeletonCard, SkeletonList, SkeletonGrid } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular', 'rounded'],
    },
    animation: {
      control: 'select',
      options: ['pulse', 'wave', 'none'],
    },
    width: { control: 'text' },
    height: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

// Basic Variants
export const Text: Story = {
  args: {
    variant: 'text',
    width: '200px',
  },
};

export const Circular: Story = {
  args: {
    variant: 'circular',
    width: 48,
    height: 48,
  },
};

export const Rectangular: Story = {
  args: {
    variant: 'rectangular',
    width: '100%',
    height: 200,
  },
};

export const Rounded: Story = {
  args: {
    variant: 'rounded',
    width: '100%',
    height: 100,
  },
};

// Animations
export const PulseAnimation: Story = {
  args: {
    variant: 'rectangular',
    width: '100%',
    height: 100,
    animation: 'pulse',
  },
};

export const WaveAnimation: Story = {
  args: {
    variant: 'rectangular',
    width: '100%',
    height: 100,
    animation: 'wave',
  },
};

export const NoAnimation: Story = {
  args: {
    variant: 'rectangular',
    width: '100%',
    height: 100,
    animation: 'none',
  },
};

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton variant="text" width="70%" className="mb-2" />
          <Skeleton variant="text" width="50%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={150} />
      <Skeleton variant="rounded" height={40} />
    </div>
  ),
};

// Skeleton Card
export const CardSkeleton: Story = {
  render: () => (
    <div className="max-w-sm">
      <SkeletonCard hasImage lines={3} />
    </div>
  ),
};

export const CardSkeletonNoImage: Story = {
  render: () => (
    <div className="max-w-sm">
      <SkeletonCard hasImage={false} lines={4} />
    </div>
  ),
};

// Skeleton List
export const ListSkeleton: Story = {
  render: () => (
    <div className="max-w-md">
      <SkeletonList items={5} hasAvatar />
    </div>
  ),
};

export const ListSkeletonNoAvatar: Story = {
  render: () => (
    <div className="max-w-md">
      <SkeletonList items={5} hasAvatar={false} />
    </div>
  ),
};

// Skeleton Grid
export const GridSkeleton: Story = {
  render: () => (
    <div className="max-w-4xl">
      <SkeletonGrid items={6} columns={3} hasImage />
    </div>
  ),
};

export const GridSkeletonTwoColumns: Story = {
  render: () => (
    <div className="max-w-2xl">
      <SkeletonGrid items={4} columns={2} hasImage />
    </div>
  ),
};

// Species Browser Loading State
export const SpeciesBrowserLoading: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rounded" width={120} height={40} />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={100} height={32} />
        <Skeleton variant="rounded" width={90} height={32} />
      </div>
      <SkeletonGrid items={6} columns={3} hasImage />
    </div>
  ),
};

// Species Detail Loading State
export const SpeciesDetailLoading: Story = {
  render: () => (
    <div className="max-w-2xl space-y-6">
      <Skeleton variant="rectangular" height={300} className="rounded-lg" />
      <div className="space-y-4">
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" height={20} />
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={60} height={24} />
          <Skeleton variant="rounded" width={80} height={24} />
        </div>
        <div className="space-y-2">
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
        </div>
      </div>
    </div>
  ),
};

// Profile Loading State
export const ProfileLoading: Story = {
  render: () => (
    <div className="max-w-md p-6 bg-white rounded-lg shadow space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={80} height={80} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" height={24} className="mb-2" />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <Skeleton variant="text" width="80%" height={24} className="mx-auto mb-1" />
          <Skeleton variant="text" width="60%" height={12} className="mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton variant="text" width="80%" height={24} className="mx-auto mb-1" />
          <Skeleton variant="text" width="60%" height={12} className="mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton variant="text" width="80%" height={24} className="mx-auto mb-1" />
          <Skeleton variant="text" width="60%" height={12} className="mx-auto" />
        </div>
      </div>
    </div>
  ),
};
