import type { Meta, StoryObj } from '@storybook/react';
import { Badge, StatusBadge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'danger', 'info'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    rounded: { control: 'boolean' },
    outlined: { control: 'boolean' },
    dot: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// Variants
export const Default: Story = {
  args: {
    children: 'Default',
    variant: 'default',
  },
};

export const Primary: Story = {
  args: {
    children: 'Primary',
    variant: 'primary',
  },
};

export const Success: Story = {
  args: {
    children: 'Success',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'Warning',
    variant: 'warning',
  },
};

export const Danger: Story = {
  args: {
    children: 'Danger',
    variant: 'danger',
  },
};

export const Info: Story = {
  args: {
    children: 'Info',
    variant: 'info',
  },
};

// Sizes
export const Small: Story = {
  args: {
    children: 'Small',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    children: 'Medium',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    children: 'Large',
    size: 'lg',
  },
};

// Styles
export const Rounded: Story = {
  args: {
    children: 'Rounded',
    rounded: true,
    variant: 'primary',
  },
};

export const Outlined: Story = {
  args: {
    children: 'Outlined',
    outlined: true,
    variant: 'primary',
  },
};

export const WithDot: Story = {
  args: {
    children: 'Active',
    dot: true,
    variant: 'success',
  },
};

// Status Badges (Conservation Status)
export const LeastConcern: Story = {
  render: () => <StatusBadge status="LC" />,
};

export const NearThreatened: Story = {
  render: () => <StatusBadge status="NT" />,
};

export const Vulnerable: Story = {
  render: () => <StatusBadge status="VU" />,
};

export const Endangered: Story = {
  render: () => <StatusBadge status="EN" />,
};

export const CriticallyEndangered: Story = {
  render: () => <StatusBadge status="CR" />,
};

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
};

// All Sizes
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge size="sm" variant="primary">Small</Badge>
      <Badge size="md" variant="primary">Medium</Badge>
      <Badge size="lg" variant="primary">Large</Badge>
    </div>
  ),
};

// Conservation Status Grid
export const ConservationStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="LC" />
      <StatusBadge status="NT" />
      <StatusBadge status="VU" />
      <StatusBadge status="EN" />
      <StatusBadge status="CR" />
    </div>
  ),
};

// Taxonomy Badges Example
export const TaxonomyExample: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="info" size="sm">Passeriformes</Badge>
      <Badge variant="default" size="sm">Passeridae</Badge>
      <Badge variant="primary" size="sm" rounded>Passer</Badge>
    </div>
  ),
};
