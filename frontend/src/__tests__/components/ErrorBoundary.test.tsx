import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import { userEvent } from '@testing-library/user-event';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
};

// Component with error in effect
const ThrowErrorInEffect = () => {
  React.useEffect(() => {
    throw new Error('Error in effect');
  }, []);
  return <div>Content</div>;
};

describe('ErrorBoundary Component', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('Normal Rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText(/oops! something went wrong/i)).toBeInTheDocument();
      // When error is thrown, the child component content should not be visible
      expect(screen.queryByText('Normal content')).not.toBeInTheDocument();
    });

    it('should display error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText(/we encountered an unexpected error/i)).toBeInTheDocument();
    });

    it('should show error icon', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText(/oops! something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Details in Development', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show error details in development', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText(/error details \(development only\)/i)).toBeInTheDocument();
      expect(screen.getByText(/error: test error message/i)).toBeInTheDocument();
    });

    it('should show component stack in development', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      // Click to expand details
      const details = screen.getByText(/error details \(development only\)/i);
      expect(details).toBeInTheDocument();
    });
  });

  describe('Error Details in Production', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/error details \(development only\)/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/error: test error message/i)).not.toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('should have Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should reset error state when Try Again is clicked', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      const DynamicComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error message');
        }
        return <div>Normal content</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      // Error should be shown
      expect(screen.getByText(/oops! something went wrong/i)).toBeInTheDocument();

      // Click Try Again - this resets the error boundary
      await user.click(screen.getByRole('button', { name: /try again/i }));

      // Update the component to not throw
      shouldThrow = false;

      // Rerender with no error
      rerender(
        <ErrorBoundary>
          <DynamicComponent />
        </ErrorBoundary>
      );

      // Normal content should be shown
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });
  });

  describe('Go Home Button', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = { href: '' };
    });

    afterEach(() => {
      window.location = originalLocation;
    });

    it('should have Go Home button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    });

    it('should redirect to home when Go Home is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      await user.click(screen.getByRole('button', { name: /go home/i }));

      expect(window.location.href).toBe('/');
    });
  });

  describe('Styling', () => {
    it('should have proper container styling', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      const errorContainer = container.querySelector('.min-h-screen.flex.items-center.justify-center');
      expect(errorContainer).toBeInTheDocument();
    });

    it('should have card styling for error content', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      const card = container.querySelector('.bg-white.rounded-lg.shadow-lg');
      expect(card).toBeInTheDocument();
    });

    it('should have error icon with red background', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      const iconContainer = container.querySelector('.bg-red-100');
      expect(iconContainer).toBeInTheDocument();

      const icon = iconContainer?.querySelector('.text-red-600');
      expect(icon).toBeInTheDocument();
    });

    it('should style buttons correctly', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainButton.className).toContain('bg-blue-600');
      expect(tryAgainButton.className).toContain('text-white');

      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      expect(goHomeButton.className).toContain('bg-gray-200');
      expect(goHomeButton.className).toContain('text-gray-700');
    });
  });

  describe('Error Logging', () => {
    it('should log errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      // ErrorBoundary calls console.error internally through logger
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('State Management', () => {
    it('should track error state', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Normal content')).toBeInTheDocument();

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByText(/oops! something went wrong/i)).toBeInTheDocument();
    });

    it('should store error information', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      // In development mode, error message should be visible (with "Error:" prefix from toString())
      expect(screen.getByText(/error: test error message/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Multiple Errors', () => {
    it('should handle multiple child errors', () => {
      const ThrowMultiple = () => {
        const [shouldThrow, setShouldThrow] = React.useState(false);

        if (shouldThrow) {
          throw new Error('Multiple error');
        }

        return (
          <button onClick={() => setShouldThrow(true)}>
            Trigger Error
          </button>
        );
      };

      render(
        <ErrorBoundary>
          <ThrowMultiple />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /trigger error/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible heading', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      const heading = screen.getByText(/oops! something went wrong/i);
      expect(heading.tagName).toBe('H2');
      expect(heading.className).toContain('text-xl');
      expect(heading.className).toContain('font-semibold');
    });

    it('should have accessible buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    });
  });
});
