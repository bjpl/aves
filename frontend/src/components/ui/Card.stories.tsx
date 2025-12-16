import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription, CardContent } from './Card';
import { Button } from './Button';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined', 'interactive'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    hover: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: 'This is a default card with some content inside.',
    variant: 'default',
  },
};

export const Elevated: Story = {
  args: {
    children: 'This card has an elevated shadow for emphasis.',
    variant: 'elevated',
  },
};

export const Outlined: Story = {
  args: {
    children: 'This card has a subtle border instead of shadow.',
    variant: 'outlined',
  },
};

export const Interactive: Story = {
  args: {
    children: 'Hover over me! I\'m an interactive card.',
    variant: 'interactive',
  },
};

export const WithHover: Story = {
  args: {
    children: 'This card scales up on hover.',
    hover: true,
  },
};

// Padding variants
export const NoPadding: Story = {
  args: {
    children: <img src="https://via.placeholder.com/400x200" alt="placeholder" className="w-full" />,
    padding: 'none',
  },
};

export const SmallPadding: Story = {
  args: {
    children: 'Small padding card',
    padding: 'sm',
  },
};

export const LargePadding: Story = {
  args: {
    children: 'Large padding card',
    padding: 'lg',
  },
};

// Composed Card
export const WithHeaderAndFooter: Story = {
  render: () => (
    <Card variant="elevated" className="max-w-md">
      <CardHeader
        title="Card Title"
        subtitle="A brief description of the card content"
        action={<Button size="sm" variant="ghost">Edit</Button>}
      />
      <CardBody>
        <p className="text-gray-600">
          This is the main content area of the card. You can put any content here,
          including text, images, forms, or other components.
        </p>
      </CardBody>
      <CardFooter align="between">
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button variant="primary" size="sm">Save</Button>
      </CardFooter>
    </Card>
  ),
};

// Species Card Example
export const SpeciesCardExample: Story = {
  render: () => (
    <Card variant="interactive" className="max-w-sm">
      <div className="aspect-video bg-gray-200 rounded-t-lg" />
      <div className="p-4">
        <CardTitle>House Sparrow</CardTitle>
        <CardDescription>Passer domesticus</CardDescription>
        <div className="mt-3 flex gap-2">
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">LC</span>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Passeridae</span>
        </div>
      </div>
    </Card>
  ),
};

// Dashboard Stats Card
export const StatsCard: Story = {
  render: () => (
    <Card variant="outlined" className="max-w-xs">
      <CardContent className="text-center py-6">
        <div className="text-4xl font-bold text-blue-600">156</div>
        <div className="text-sm text-gray-500 mt-1">Species Learned</div>
      </CardContent>
    </Card>
  ),
};

// All Variants
export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-2xl">
      <Card variant="default">Default Card</Card>
      <Card variant="elevated">Elevated Card</Card>
      <Card variant="outlined">Outlined Card</Card>
      <Card variant="interactive">Interactive Card</Card>
    </div>
  ),
};
