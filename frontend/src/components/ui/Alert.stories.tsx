import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
    },
    dismissible: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Info: Story = {
  args: {
    variant: 'info',
    title: 'Information',
    children: 'This is an informational message about the current state.',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Success',
    children: 'Your changes have been saved successfully.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Warning',
    children: 'Please review your input before proceeding.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    title: 'Error',
    children: 'Something went wrong. Please try again later.',
  },
};

export const WithoutTitle: Story = {
  args: {
    variant: 'info',
    children: 'This alert has no title, just a message.',
  },
};

export const Dismissible: Story = {
  args: {
    variant: 'success',
    title: 'Dismissible Alert',
    children: 'Click the X button to dismiss this alert.',
    dismissible: true,
    onDismiss: () => alert('Alert dismissed!'),
  },
};

export const LongContent: Story = {
  args: {
    variant: 'warning',
    title: 'Important Notice',
    children: `This is a longer alert message that might wrap to multiple lines.
      It contains important information that users need to know about.
      Please read carefully before proceeding with any actions.`,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Alert variant="info" title="Info Alert">
        This is an informational message.
      </Alert>
      <Alert variant="success" title="Success Alert">
        Operation completed successfully.
      </Alert>
      <Alert variant="warning" title="Warning Alert">
        Please proceed with caution.
      </Alert>
      <Alert variant="error" title="Error Alert">
        An error occurred during the operation.
      </Alert>
    </div>
  ),
};

export const ApiError: Story = {
  args: {
    variant: 'error',
    title: 'Failed to load species',
    children: 'Unable to connect to the server. Please check your internet connection and try again.',
    dismissible: true,
  },
};

export const SuccessSave: Story = {
  args: {
    variant: 'success',
    title: 'Species saved',
    children: 'House Sparrow (Passer domesticus) has been added to your collection.',
    dismissible: true,
  },
};

export const AnnotationWarning: Story = {
  args: {
    variant: 'warning',
    title: 'Incomplete annotations',
    children: 'This species has 3 annotations pending review. Some features may not be fully annotated.',
  },
};
