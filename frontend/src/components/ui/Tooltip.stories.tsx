import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from './Tooltip';
import { Button } from './Button';

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
    delay: { control: 'number' },
    disabled: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="flex items-center justify-center min-h-[200px] p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

// Basic Tooltips
export const Default: Story = {
  args: {
    content: 'This is a tooltip',
    children: <Button>Hover me</Button>,
  },
};

// Positions
export const TopPosition: Story = {
  args: {
    content: 'Tooltip on top',
    position: 'top',
    children: <Button>Top</Button>,
  },
};

export const BottomPosition: Story = {
  args: {
    content: 'Tooltip on bottom',
    position: 'bottom',
    children: <Button>Bottom</Button>,
  },
};

export const LeftPosition: Story = {
  args: {
    content: 'Tooltip on left',
    position: 'left',
    children: <Button>Left</Button>,
  },
};

export const RightPosition: Story = {
  args: {
    content: 'Tooltip on right',
    position: 'right',
    children: <Button>Right</Button>,
  },
};

// All Positions
export const AllPositions: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8">
      <Tooltip content="Top tooltip" position="top">
        <Button variant="secondary">Top</Button>
      </Tooltip>
      <Tooltip content="Bottom tooltip" position="bottom">
        <Button variant="secondary">Bottom</Button>
      </Tooltip>
      <Tooltip content="Left tooltip" position="left">
        <Button variant="secondary">Left</Button>
      </Tooltip>
      <Tooltip content="Right tooltip" position="right">
        <Button variant="secondary">Right</Button>
      </Tooltip>
    </div>
  ),
};

// Custom Delay
export const NoDelay: Story = {
  args: {
    content: 'Instant tooltip!',
    delay: 0,
    children: <Button>No delay</Button>,
  },
};

export const LongDelay: Story = {
  args: {
    content: 'Tooltip with 500ms delay',
    delay: 500,
    children: <Button>Long delay (500ms)</Button>,
  },
};

// Disabled
export const Disabled: Story = {
  args: {
    content: 'This tooltip is disabled',
    disabled: true,
    children: <Button>Disabled tooltip</Button>,
  },
};

// Long Content
export const LongContent: Story = {
  args: {
    content: 'This is a longer tooltip message that provides more detailed information about the element.',
    children: <Button>Long content</Button>,
  },
};

// Rich Content
export const RichContent: Story = {
  args: {
    content: (
      <div>
        <strong className="block mb-1">Species Info</strong>
        <span className="text-gray-300">Northern Cardinal</span>
      </div>
    ),
    children: <Button>Rich tooltip</Button>,
  },
};

// With Icons
export const WithIcon: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Tooltip content="Save your progress">
        <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Add to favorites">
        <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Share species">
        <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </Tooltip>
    </div>
  ),
};

// Bird Anatomy Tooltip Example
export const BirdAnatomyTooltip: Story = {
  render: () => (
    <div className="relative w-64 h-64 bg-gray-100 rounded-lg">
      <Tooltip content="el pico (the beak)" position="right">
        <div className="absolute top-8 left-16 w-6 h-6 bg-yellow-400 rounded-full cursor-pointer hover:ring-2 ring-yellow-500" />
      </Tooltip>
      <Tooltip content="las alas (the wings)" position="right">
        <div className="absolute top-20 left-8 w-8 h-4 bg-brown-400 rounded cursor-pointer hover:ring-2 ring-brown-500" style={{ backgroundColor: '#8B4513' }} />
      </Tooltip>
      <Tooltip content="la cola (the tail)" position="left">
        <div className="absolute top-24 right-8 w-6 h-8 bg-gray-600 rounded cursor-pointer hover:ring-2 ring-gray-700" />
      </Tooltip>
      <Tooltip content="las patas (the legs)" position="top">
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-4 h-8 bg-orange-400 rounded cursor-pointer hover:ring-2 ring-orange-500" />
      </Tooltip>
    </div>
  ),
};

// Conservation Status Tooltip
export const ConservationTooltip: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Tooltip
        content={
          <div>
            <strong className="block text-green-300">Least Concern</strong>
            <span className="text-xs">Population is stable and widespread</span>
          </div>
        }
      >
        <span className="inline-block bg-green-100 text-green-800 text-sm px-2 py-1 rounded cursor-help">
          LC
        </span>
      </Tooltip>
      <Tooltip
        content={
          <div>
            <strong className="block text-orange-300">Vulnerable</strong>
            <span className="text-xs">High risk of endangerment in the wild</span>
          </div>
        }
      >
        <span className="inline-block bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded cursor-help">
          VU
        </span>
      </Tooltip>
      <Tooltip
        content={
          <div>
            <strong className="block text-red-300">Critically Endangered</strong>
            <span className="text-xs">Extremely high risk of extinction</span>
          </div>
        }
      >
        <span className="inline-block bg-red-200 text-red-900 text-sm px-2 py-1 rounded cursor-help">
          CR
        </span>
      </Tooltip>
    </div>
  ),
};
