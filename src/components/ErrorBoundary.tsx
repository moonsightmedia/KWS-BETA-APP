import React, { Component, type ReactNode } from 'react';
import { AppErrorView } from '@/components/AppErrorView';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, RefreshCw, Send } from 'lucide-react';
import { reportError, type ReportErrorUserContext } from '@/utils/feedbackUtils';
import { captureSentryException } from '@/utils/sentry';
import { toast } from 'sonner';

interface Props { children: ReactNode; fallback?: ReactNode; userContext?: ReportErrorUserContext | null }
interface State {
  hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null;
  showReportDialog: boolean; userDescription: string; isReporting: boolean; reportFailure: boolean;
}
const initialState: State = { hasError: false, error: null, errorInfo: null, showReportDialog: false, userDescription: '', isReporting: false, reportFailure: false };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { ...initialState };
  private mounted = false;
  componentDidMount() { this.mounted = true; }
  componentWillUnmount() { this.mounted = false; }
  static getDerivedStateFromError(error: Error): Partial<State> { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
    captureSentryException(error, { tags: { source: 'error_boundary' }, extra: { componentStack: errorInfo.componentStack } });
    void reportError(error, errorInfo, undefined, this.props.userContext).catch(() => {});
    // No timed reset: the user keeps control, including their unsent description.
  }
  handleReset = () => this.setState({ ...initialState });
  handleReport = async () => {
    if (!this.state.error || this.state.isReporting) return;
    this.setState({ isReporting: true, reportFailure: false });
    try {
      const result = await reportError(this.state.error, this.state.errorInfo, this.state.userDescription, this.props.userContext);
      if (!result.success) throw new Error('Versand nicht bestätigt');
      if (this.mounted) {
        this.setState({ showReportDialog: false, userDescription: '' });
        toast.success('Fehlerbericht gesendet. Vielen Dank!');
      }
    } catch {
      if (this.mounted) this.setState({ reportFailure: true });
    } finally {
      if (this.mounted) this.setState({ isReporting: false });
    }
  };
  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return <>
      <AppErrorView code="Ups" title="Kurz den Halt verloren." description="Diese Ansicht konnte nicht geöffnet werden. Versuche es erneut oder kehre zur Startseite zurück.">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={this.handleReset}><RefreshCw aria-hidden="true" />Erneut versuchen</Button>
          <Button variant="secondary" asChild><a href="/">Zur Startseite</a></Button>
        </div>
        <Button variant="ghost" onClick={() => this.setState({ showReportDialog: true })}><MessageSquare aria-hidden="true" />Fehler beschreiben</Button>
      </AppErrorView>
      <Dialog open={this.state.showReportDialog} onOpenChange={open => { if (!this.state.isReporting) this.setState({ showReportDialog: open }); }}>
        <DialogContent className="space-y-5 p-5 sm:max-w-lg sm:p-6">
          <DialogHeader><DialogTitle>Was ist passiert?</DialogTitle><DialogDescription>Deine Beschreibung hilft uns, den Fehler nachzustellen.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <Label htmlFor="error-description">Deine Beschreibung</Label>
            <Textarea id="error-description" placeholder="Was hast du gerade in der App gemacht?" value={this.state.userDescription} onChange={event => this.setState({ userDescription: event.target.value })} rows={5} maxLength={4000} disabled={this.state.isReporting} />
            {this.state.reportFailure ? <p role="alert" className="text-sm text-destructive">Der Versand wurde nicht bestätigt. Deine Beschreibung bleibt hier erhalten. Bitte versuche es später erneut.</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" disabled={this.state.isReporting} onClick={() => this.setState({ showReportDialog: false })}>Schließen</Button>
              <Button disabled={this.state.isReporting || !this.state.userDescription.trim()} onClick={() => void this.handleReport()}><Send aria-hidden="true" />{this.state.isReporting ? 'Wird gesendet …' : 'Beschreibung senden'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>;
  }
}
