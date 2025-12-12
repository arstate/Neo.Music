import React, { ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-neo-yellow p-4 text-center font-mono">
          <div className="w-full max-w-md border-4 border-black bg-white p-6 shadow-neo">
            <h1 className="mb-4 font-display text-4xl font-black uppercase text-red-600">SYSTEM CRASH</h1>
            <div className="mb-6 border-2 border-black bg-gray-100 p-2 text-left text-xs text-red-500 overflow-auto max-h-32">
              {this.state.error?.toString()}
            </div>
            <p className="mb-6 font-bold text-black">
              CRITICAL ERROR DETECTED. THE APPLICATION HAS STOPPED TO PREVENT DAMAGE.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full border-4 border-black bg-neo-blue px-6 py-3 font-display text-xl font-bold text-white shadow-neo-sm transition-transform active:translate-y-1 active:shadow-none hover:bg-blue-600"
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);