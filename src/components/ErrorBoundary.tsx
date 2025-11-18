import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });

    // In production, you might want to log to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Ein Fehler ist aufgetreten</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-4">
                  Es tut uns leid, aber etwas ist schiefgelaufen. Bitte versuche es erneut.
                </p>
                {import.meta.env.DEV && this.state.error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium mb-2">
                      Fehlerdetails (nur in Entwicklung)
                    </summary>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
                <div className="flex gap-2 mt-4">
                  <Button onClick={this.handleReset} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Zurücksetzen
                  </Button>
                  <Button onClick={this.handleReload} size="sm">
                    Seite neu laden
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

