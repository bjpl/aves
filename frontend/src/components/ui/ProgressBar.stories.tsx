import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar, CircularProgress } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'UI/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    max: { control: 'number' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'select',
      options: ['default', 'gradient', 'striped'],
    },
    color: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'danger'],
    },
    showLabel: { control: 'boolean' },
    animated: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

// Basic Progress
export const Default: Story = {
  args: {
    value: 60,
    max: 100,
  },
};

export const WithLabel: Story = {
  args: {
    value: 75,
    showLabel: true,
    label: 'Lesson Progress',
  },
};

// Sizes
export const Small: Story = {
  args: {
    value: 50,
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    value: 50,
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    value: 50,
    size: 'lg',
  },
};

// Variants
export const Gradient: Story = {
  args: {
    value: 65,
    variant: 'gradient',
    color: 'primary',
  },
};

export const Striped: Story = {
  args: {
    value: 70,
    variant: 'striped',
    color: 'success',
  },
};

export const Animated: Story = {
  args: {
    value: 80,
    animated: true,
    color: 'warning',
  },
};

// Colors
export const AllColors: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <ProgressBar value={75} color="primary" label="Primary" showLabel />
      <ProgressBar value={75} color="success" label="Success" showLabel />
      <ProgressBar value={75} color="warning" label="Warning" showLabel />
      <ProgressBar value={75} color="danger" label="Danger" showLabel />
    </div>
  ),
};

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <ProgressBar value={60} variant="default" label="Default" showLabel />
      <ProgressBar value={60} variant="gradient" label="Gradient" showLabel />
      <ProgressBar value={60} variant="striped" label="Striped" showLabel />
    </div>
  ),
};

// All Sizes
export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <div>
        <p className="text-sm text-gray-600 mb-1">Small</p>
        <ProgressBar value={50} size="sm" />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-1">Medium</p>
        <ProgressBar value={50} size="md" />
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-1">Large</p>
        <ProgressBar value={50} size="lg" />
      </div>
    </div>
  ),
};

// Learning Progress Example
export const LearningProgress: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-md p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900">Species Mastery</h3>
      <div className="space-y-3">
        <ProgressBar value={90} color="success" variant="gradient" label="Northern Cardinal" showLabel />
        <ProgressBar value={65} color="primary" variant="gradient" label="Blue Jay" showLabel />
        <ProgressBar value={40} color="warning" variant="gradient" label="American Robin" showLabel />
        <ProgressBar value={15} color="danger" variant="gradient" label="Bald Eagle" showLabel />
      </div>
    </div>
  ),
};

// Circular Progress Stories
const circularMeta: Meta<typeof CircularProgress> = {
  title: 'UI/CircularProgress',
  component: CircularProgress,
  tags: ['autodocs'],
};

export const CircularDefault: Story = {
  render: () => <CircularProgress value={75} />,
};

export const CircularSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <CircularProgress value={60} size={60} strokeWidth={4} />
        <p className="text-xs mt-2">Small</p>
      </div>
      <div className="text-center">
        <CircularProgress value={60} size={100} strokeWidth={6} />
        <p className="text-xs mt-2">Medium</p>
      </div>
      <div className="text-center">
        <CircularProgress value={60} size={140} strokeWidth={10} />
        <p className="text-xs mt-2">Large</p>
      </div>
    </div>
  ),
};

export const CircularColors: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <CircularProgress value={25} color="danger" />
      <CircularProgress value={50} color="warning" />
      <CircularProgress value={75} color="primary" />
      <CircularProgress value={100} color="success" />
    </div>
  ),
};

export const MasteryDashboard: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-6 p-6 bg-gray-50 rounded-lg">
      <div className="text-center">
        <CircularProgress value={85} color="success" size={100} />
        <p className="mt-2 font-medium text-gray-700">Vocabulary</p>
      </div>
      <div className="text-center">
        <CircularProgress value={62} color="primary" size={100} />
        <p className="mt-2 font-medium text-gray-700">Identification</p>
      </div>
      <div className="text-center">
        <CircularProgress value={45} color="warning" size={100} />
        <p className="mt-2 font-medium text-gray-700">Audio</p>
      </div>
    </div>
  ),
};
