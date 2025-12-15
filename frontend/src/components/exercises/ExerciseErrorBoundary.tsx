// CONCEPT: Error boundary specifically for exercise components
// WHY: Gracefully handles exercise failures without crashing the entire practice session
// PATTERN: React error boundary with skip and retry functionality

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  exerciseType?: string;
  onSkip: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ExerciseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('Exercise error boundary caught an error:', {
      error,
      errorInfo,
      exerciseType: this.props.exerciseType,
      componentStack: errorInfo.componentStack
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleSkip = () => {
    // Reset error state and call skip callback
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    this.props.onSkip();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-red-100 p-6">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-50 rounded-full">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <h3 className="mt-4 text-lg font-semibold text-gray-900 text-center">
              Exercise Error
            </h3>

            <p className="mt-2 text-sm text-gray-600 text-center">
              This exercise encountered an error and couldn't load properly.
              {this.props.exerciseType && (
                <span className="block mt-1 text-xs text-gray-500">
                  Type: {this.props.exerciseType.replace(/_/g, ' ')}
                </span>
              )}
            </p>

            {/* Development-only error details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 space-y-2">
                  <p className="font-mono text-red-600 break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="overflow-auto text-gray-600 text-[10px] max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
              >
                Try Again
              </button>
              <button
                onClick={this.handleSkip}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                Skip Exercise
              </button>
            </div>

            {/* Helper Text */}
            <p className="mt-3 text-xs text-center text-gray-500">
              You can try again or skip to continue practicing
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
