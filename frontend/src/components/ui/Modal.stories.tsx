import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
    showCloseButton: { control: 'boolean' },
    closeOnOverlayClick: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
  },
  decorators: [
    (Story) => (
      <div className="min-h-[400px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Modal>;

// Interactive Modal with useState hook
const ModalWithTrigger = ({ children, ...props }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} {...props}>
        {children}
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: () => (
    <ModalWithTrigger title="Modal Title">
      <p className="text-gray-600">
        This is the modal content. You can put any content here including text,
        forms, images, or other components.
      </p>
    </ModalWithTrigger>
  ),
};

export const Small: Story = {
  render: () => (
    <ModalWithTrigger title="Small Modal" size="sm">
      <p className="text-gray-600">This is a small modal dialog.</p>
    </ModalWithTrigger>
  ),
};

export const Large: Story = {
  render: () => (
    <ModalWithTrigger title="Large Modal" size="lg">
      <p className="text-gray-600">
        This is a large modal dialog with more space for content.
        You can use this for complex forms or detailed information.
      </p>
    </ModalWithTrigger>
  ),
};

export const ExtraLarge: Story = {
  render: () => (
    <ModalWithTrigger title="Extra Large Modal" size="xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 p-4 rounded">Column 1</div>
        <div className="bg-gray-100 p-4 rounded">Column 2</div>
      </div>
    </ModalWithTrigger>
  ),
};

export const WithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Confirm Action"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setIsOpen(false)}>
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-gray-600">Are you sure you want to proceed with this action?</p>
        </Modal>
      </>
    );
  },
};

export const DeleteConfirmation: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button variant="danger" onClick={() => setIsOpen(true)}>
          Delete Species
        </Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Delete Species"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setIsOpen(false)}>
                Delete
              </Button>
            </>
          }
        >
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-gray-600">
              Are you sure you want to delete this species? This action cannot be undone.
            </p>
          </div>
        </Modal>
      </>
    );
  },
};

export const FormModal: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Add New Species</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Add New Species"
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="success" onClick={() => setIsOpen(false)}>
                Save Species
              </Button>
            </>
          }
        >
          <form className="space-y-4">
            <Input label="Common Name" placeholder="House Sparrow" fullWidth id="common-name" />
            <Input label="Scientific Name" placeholder="Passer domesticus" fullWidth id="scientific-name" />
            <Input label="Spanish Name" placeholder="Gorrión común" fullWidth id="spanish-name" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Family" placeholder="Passeridae" id="family" />
              <Input label="Order" placeholder="Passeriformes" id="order" />
            </div>
          </form>
        </Modal>
      </>
    );
  },
};

export const NoCloseButton: Story = {
  render: () => (
    <ModalWithTrigger title="No Close Button" showCloseButton={false}>
      <p className="text-gray-600">
        This modal doesn't have a close button. Use the footer buttons or click outside.
      </p>
    </ModalWithTrigger>
  ),
};

export const NoOverlayClose: Story = {
  render: () => (
    <ModalWithTrigger title="No Overlay Close" closeOnOverlayClick={false}>
      <p className="text-gray-600">
        This modal won't close when clicking the overlay. Use the close button instead.
      </p>
    </ModalWithTrigger>
  ),
};

export const ScrollableContent: Story = {
  render: () => (
    <ModalWithTrigger title="Long Content Modal" size="md">
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <p key={i} className="text-gray-600">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
            veniam, quis nostrud exercitation ullamco laboris.
          </p>
        ))}
      </div>
    </ModalWithTrigger>
  ),
};
