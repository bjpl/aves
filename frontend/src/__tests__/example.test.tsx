import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import { userEvent } from '@testing-library/user-event';

/**
 * EXAMPLE TEST TEMPLATE
 *
 * This file demonstrates the structure for writing tests in the Aves project.
 * Copy this template when creating new test files.
 */

// Mock component for demonstration
const ExampleComponent = ({ title, onClick }: { title: string; onClick?: () => void }) => (
  <div>
    <h1>{title}</h1>
    <button onClick={onClick}>Click me</button>
  </div>
);

describe('ExampleComponent', () => {
  describe('Rendering', () => {
    it('should render the component with title', () => {
      render(<ExampleComponent title="Test Title" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render a button', () => {
      render(<ExampleComponent title="Test" />);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(<ExampleComponent title="Test" onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /click me/i });
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Async Operations', () => {
    it('should handle async updates', async () => {
      const AsyncComponent = () => {
        const [text, setText] = React.useState('Loading...');

        React.useEffect(() => {
          setTimeout(() => setText('Loaded!'), 100);
        }, []);

        return <div>{text}</div>;
      };

      render(<AsyncComponent />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Loaded!')).toBeInTheDocument();
      });
    });
  });
});

/**
 * TEST WRITING GUIDELINES:
 *
 * 1. Structure: Use describe blocks to organize tests by feature/behavior
 * 2. Naming: Test names should be descriptive and start with "should"
 * 3. AAA Pattern: Arrange (setup), Act (execute), Assert (verify)
 * 4. Isolation: Each test should be independent
 * 5. Mocking: Use vi.fn() for mock functions, vi.mock() for modules
 * 6. Async: Use async/await with waitFor for async operations
 * 7. Accessibility: Query by role when possible (screen.getByRole)
 * 8. User Events: Use @testing-library/user-event for realistic interactions
 */
