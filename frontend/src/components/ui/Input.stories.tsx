import type { Meta, StoryObj } from '@storybook/react';
import { Input, TextArea } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

// Basic Input
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'you@example.com',
    type: 'email',
    id: 'email',
  },
};

export const Required: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter username',
    required: true,
    id: 'username',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    helperText: 'Must be at least 8 characters',
    id: 'password',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    type: 'email',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
    id: 'email-error',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    value: 'Cannot edit this',
    disabled: true,
    id: 'disabled',
  },
};

export const FullWidth: Story = {
  args: {
    label: 'Full Width Input',
    placeholder: 'This input takes full width',
    fullWidth: true,
    id: 'fullwidth',
  },
};

// With Icons
export const WithLeftIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search species...',
    leftIcon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    id: 'search',
  },
};

export const WithRightIcon: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    rightIcon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    id: 'email-icon',
  },
};

// Input Types
export const NumberInput: Story = {
  args: {
    label: 'Quantity',
    type: 'number',
    min: 0,
    max: 100,
    placeholder: '0',
    id: 'number',
  },
};

export const DateInput: Story = {
  args: {
    label: 'Date of Observation',
    type: 'date',
    id: 'date',
  },
};

// TextArea Stories
export const TextAreaDefault: Story = {
  render: () => (
    <TextArea
      label="Description"
      placeholder="Describe the bird observation..."
      id="description"
    />
  ),
};

export const TextAreaWithError: Story = {
  render: () => (
    <TextArea
      label="Notes"
      placeholder="Add your notes..."
      error="Notes cannot be empty"
      id="notes-error"
    />
  ),
};

export const TextAreaFullWidth: Story = {
  render: () => (
    <TextArea
      label="Comments"
      placeholder="Write your comments here..."
      fullWidth
      rows={5}
      id="comments"
    />
  ),
};

// Form Example
export const LoginForm: Story = {
  render: () => (
    <form className="space-y-4 max-w-sm">
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        required
        fullWidth
        id="login-email"
      />
      <Input
        label="Password"
        type="password"
        placeholder="Enter password"
        required
        fullWidth
        helperText="Minimum 8 characters"
        id="login-password"
      />
    </form>
  ),
};

// All States
export const AllStates: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <Input label="Default" placeholder="Default state" id="state-default" />
      <Input label="With Value" value="Entered value" id="state-value" />
      <Input label="Disabled" value="Disabled" disabled id="state-disabled" />
      <Input label="With Error" value="Bad input" error="This field has an error" id="state-error" />
      <Input label="With Helper" placeholder="Enter..." helperText="This is helper text" id="state-helper" />
    </div>
  ),
};
