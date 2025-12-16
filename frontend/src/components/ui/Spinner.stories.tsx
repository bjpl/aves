import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'UI/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <Spinner size="sm" />
        <p className="text-xs mt-2">Small</p>
      </div>
      <div className="text-center">
        <Spinner size="md" />
        <p className="text-xs mt-2">Medium</p>
      </div>
      <div className="text-center">
        <Spinner size="lg" />
        <p className="text-xs mt-2">Large</p>
      </div>
      <div className="text-center">
        <Spinner size="xl" />
        <p className="text-xs mt-2">Extra Large</p>
      </div>
    </div>
  ),
};

export const WithText: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Spinner size="sm" />
      <span className="text-gray-600">Loading...</span>
    </div>
  ),
};

export const CenteredInContainer: Story = {
  render: () => (
    <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg">
      <Spinner size="lg" />
    </div>
  ),
};

export const LoadingCard: Story = {
  render: () => (
    <div className="w-64 p-6 bg-white rounded-lg shadow text-center">
      <Spinner size="lg" />
      <p className="mt-4 text-gray-500">Loading species data...</p>
    </div>
  ),
};

export const ButtonLoading: Story = {
  render: () => (
    <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg" disabled>
      <Spinner size="sm" />
      Saving...
    </button>
  ),
};
