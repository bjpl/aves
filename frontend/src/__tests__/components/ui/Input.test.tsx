import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { Input, TextArea } from '../../../components/ui/Input';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render input with label', () => {
      render(<Input label="Username" id="username" />);
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    it('should render without label', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();
    });

    it('should show required indicator when required', () => {
      render(<Input label="Email" required id="email" />);
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('*').className).toContain('text-red-500');
    });

    it('should render full width when specified', () => {
      const { container } = render(<Input fullWidth />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('w-full');
    });

    it('should render with left icon', () => {
      render(
        <Input
          leftIcon={<span data-testid="search-icon">🔍</span>}
          placeholder="Search"
        />
      );
      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should render with right icon', () => {
      render(
        <Input
          rightIcon={<span data-testid="close-icon">✕</span>}
          placeholder="Search"
        />
      );
      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<Input error="This field is required" id="test-input" />);
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });

    it('should apply error styles', () => {
      render(<Input error="Error" id="test-input" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-red-500');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should link error with aria-describedby', () => {
      render(<Input error="Error message" id="test-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
    });

    it('should not show helper text when error is present', () => {
      render(<Input error="Error" helperText="Helper" id="test-input" />);
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    it('should display helper text', () => {
      render(<Input helperText="Enter your email address" id="test-input" />);
      expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
    });

    it('should link helper text with aria-describedby', () => {
      render(<Input helperText="Helper" id="test-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-helper');
    });
  });

  describe('Disabled State', () => {
    it('should render disabled input', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input.className).toContain('bg-gray-100');
      expect(input.className).toContain('cursor-not-allowed');
    });

    it('should not accept input when disabled', async () => {
      const user = userEvent.setup();
      render(<Input disabled />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'test');
      expect(input).toHaveValue('');
    });
  });

  describe('Interactions', () => {
    it('should handle onChange events', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'hello');
      expect(handleChange).toHaveBeenCalled();
      expect(input).toHaveValue('hello');
    });

    it('should handle onFocus events', async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();

      render(<Input onFocus={handleFocus} />);
      const input = screen.getByRole('textbox');

      await user.click(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should handle onBlur events', async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn();

      render(<Input onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');

      await user.click(input);
      await user.tab();
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should apply custom className', () => {
      render(<Input className="custom-input" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('custom-input');
    });

    it('should forward HTML input attributes', () => {
      render(
        <Input
          type="email"
          placeholder="Enter email"
          maxLength={50}
          autoComplete="email"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('placeholder', 'Enter email');
      expect(input).toHaveAttribute('maxLength', '50');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });
  });

  describe('Icon Padding', () => {
    it('should add left padding when left icon is present', () => {
      render(<Input leftIcon={<span>→</span>} />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('pl-10');
    });

    it('should add right padding when right icon is present', () => {
      render(<Input rightIcon={<span>←</span>} />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('pr-10');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<Input />);
      const input = screen.getByRole('textbox');

      await user.tab();
      expect(input).toHaveFocus();
    });

    it('should support ref forwarding', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});

describe('TextArea Component', () => {
  describe('Rendering', () => {
    it('should render textarea with label', () => {
      render(<TextArea label="Description" id="description" />);
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('should render without label', () => {
      render(<TextArea placeholder="Enter description" />);
      expect(screen.getByPlaceholderText(/enter description/i)).toBeInTheDocument();
    });

    it('should show required indicator when required', () => {
      render(<TextArea label="Comments" required id="comments" />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render full width when specified', () => {
      const { container } = render(<TextArea fullWidth />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('w-full');
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<TextArea error="This field is required" id="test-textarea" />);
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });

    it('should apply error styles', () => {
      render(<TextArea error="Error" id="test-textarea" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea.className).toContain('border-red-500');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Disabled State', () => {
    it('should render disabled textarea', () => {
      render(<TextArea disabled />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
      expect(textarea.className).toContain('bg-gray-100');
    });
  });

  describe('Interactions', () => {
    it('should handle onChange events', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<TextArea onChange={handleChange} />);
      const textarea = screen.getByRole('textbox');

      await user.type(textarea, 'hello world');
      expect(handleChange).toHaveBeenCalled();
      expect(textarea).toHaveValue('hello world');
    });

    it('should apply custom className', () => {
      render(<TextArea className="custom-textarea" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea.className).toContain('custom-textarea');
    });

    it('should forward HTML textarea attributes', () => {
      render(
        <TextArea
          rows={5}
          cols={40}
          maxLength={500}
          placeholder="Enter text"
        />
      );
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '5');
      expect(textarea).toHaveAttribute('cols', '40');
      expect(textarea).toHaveAttribute('maxLength', '500');
    });
  });

  describe('Resize', () => {
    it('should have resize-y class for vertical resizing', () => {
      render(<TextArea />);
      const textarea = screen.getByRole('textbox');
      expect(textarea.className).toContain('resize-y');
    });
  });

  describe('Accessibility', () => {
    it('should support ref forwarding', () => {
      const ref = React.createRef<HTMLTextAreaElement>();
      render(<TextArea ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });
});
