import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, RefreshCw, Send } from 'lucide-react';
import { reportError } from '@/utils/feedbackUtils';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showReportDialog: boolean;
  userDescription: string;
  isReporting: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showReportDialog: false,
      userDescription: '',
      isReporting: false,
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
      showReportDialog: true,
    });

    // Automatically report error in background
    reportError(error, errorInfo).catch(() => {
      // Silently fail
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showReportDialog: false,
      userDescription: '',
      isReporting: false,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportError = async () => {
    const { error, errorInfo, userDescription } = this.state;
    if (!error) return;

    this.setState({ isReporting: true });

    try {
      await reportError(error, errorInfo, userDescription);
      toast.success('Fehler wurde gemeldet. Vielen Dank!');
      this.setState({
        showReportDialog: false,
        userDescription: '',
      });
    } catch (err) {
      toast.error('Fehler beim Melden. Bitte versuche es später erneut.');
    } finally {
      this.setState({ isReporting: false });
    }
  };

  handleCloseReportDialog = () => {
    this.setState({
      showReportDialog: false,
      userDescription: '',
    });
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

    return (
      <>
        {this.props.children}
        {this.state.showReportDialog && (
          <Dialog open={this.state.showReportDialog} onOpenChange={this.handleCloseReportDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Fehler melden</DialogTitle>
                <DialogDescription>
                  Der Fehler wurde bereits automatisch gemeldet. Falls du zusätzliche Informationen hast, kannst du sie hier hinzufügen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="error-description">Zusätzliche Beschreibung (optional)</Label>
                  <Textarea
                    id="error-description"
                    placeholder="Was hast du gemacht, als der Fehler aufgetreten ist?"
                    value={this.state.userDescription}
                    onChange={(e) => this.setState({ userDescription: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={this.handleCloseReportDialog}>
                    Schließen
                  </Button>
                  <Button onClick={this.handleReportError} disabled={this.state.isReporting}>
                    <Send className="h-4 w-4 mr-2" />
                    {this.state.isReporting ? 'Wird gesendet...' : 'Zusätzliche Info senden'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }
}

