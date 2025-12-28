'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { captureError } from '@/lib/error-monitoring';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to error monitoring
    const errorId = captureError(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });

    this.setState({ errorId });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                We encountered an unexpected error. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm font-mono text-muted-foreground break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              {this.state.errorId && (
                <p className="text-xs text-center text-muted-foreground">
                  Error ID: {this.state.errorId}
                </p>
              )}
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={this.handleReset}>
                  Try Again
                </Button>
                <Button onClick={this.handleReload}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureException = React.useCallback((err: Error) => {
    setError(err);
    captureError(err);
  }, []);

  if (error) {
    throw error;
  }

  return { resetError, captureException };
}
