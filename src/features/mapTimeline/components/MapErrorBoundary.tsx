import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('Map error boundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Map error boundary - error:', error.message);
    console.error('Map error boundary - component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    // Reset error state to try rendering again
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 p-8">
          <div className="text-center max-w-2xl">
            <svg
              className="w-16 h-16 mx-auto text-red-400 mb-4"
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
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Map Failed to Load
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              There was an error loading the map timeline. This could be due to:
            </p>
            <ul className="text-start text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-2">
              <li>• Missing or invalid Mapbox API key</li>
              <li>• Network connectivity issues</li>
              <li>• Invalid location coordinates</li>
              <li>• Browser WebGL support disabled</li>
            </ul>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm font-mono text-red-800 dark:text-red-200">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
