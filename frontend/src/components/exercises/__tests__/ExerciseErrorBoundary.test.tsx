import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseErrorBoundary } from '../ExerciseErrorBoundary';
import { describe, it, expect, vi } from 'vitest';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Working component</div>;
};

describe('ExerciseErrorBoundary', () => {
  // Suppress console.error during tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ExerciseErrorBoundary onSkip={vi.fn()}>
        <div>Test content</div>
      </ExerciseErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ExerciseErrorBoundary onSkip={vi.fn()}>
        <ThrowError shouldThrow={true} />
      </ExerciseErrorBoundary>
    );

    expect(screen.getByText('Exercise Error')).toBeInTheDocument();
    expect(screen.getByText(/This exercise encountered an error/)).toBeInTheDocument();
  });

  it('displays exercise type when provided', () => {
    render(
      <ExerciseErrorBoundary exerciseType="term_matching" onSkip={vi.fn()}>
        <ThrowError shouldThrow={true} />
      </ExerciseErrorBoundary>
    );

    expect(screen.getByText(/Type: term matching/)).toBeInTheDocument();
  });

  it('calls onSkip when Skip Exercise button is clicked', () => {
    const onSkip = vi.fn();

    render(
      <ExerciseErrorBoundary onSkip={onSkip}>
        <ThrowError shouldThrow={true} />
      </ExerciseErrorBoundary>
    );

    const skipButton = screen.getByText('Skip Exercise');
    fireEvent.click(skipButton);

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('resets error state when Try Again button is clicked', () => {
    // Use a ref-like object to control throwing behavior
    const throwControl = { shouldThrow: true };

    const TestComponent = () => {
      if (throwControl.shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Working component</div>;
    };

    render(
      <ExerciseErrorBoundary onSkip={vi.fn()}>
        <TestComponent />
      </ExerciseErrorBoundary>
    );

    // Verify error UI is shown
    expect(screen.getByText('Exercise Error')).toBeInTheDocument();

    // Change the condition so it won't throw next time BEFORE clicking
    throwControl.shouldThrow = false;

    // Click Try Again - this resets state and re-renders children
    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    // After reset with shouldThrow=false, the component should render successfully
    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ExerciseErrorBoundary onSkip={vi.fn()}>
        <ThrowError shouldThrow={true} />
      </ExerciseErrorBoundary>
    );

    // Check for development-only error details
    expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('renders both action buttons', () => {
    render(
      <ExerciseErrorBoundary onSkip={vi.fn()}>
        <ThrowError shouldThrow={true} />
      </ExerciseErrorBoundary>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Skip Exercise')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    render(
      <ExerciseErrorBoundary onSkip={vi.fn()}>
        <ThrowError shouldThrow={true} />
      </ExerciseErrorBoundary>
    );

    expect(screen.getByText(/You can try again or skip to continue practicing/)).toBeInTheDocument();
  });
});
