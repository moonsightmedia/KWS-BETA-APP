import { useRef, useState, type FormEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SessionRecoveryDialog({ email, onReconnect, onSignOut }: {
  email: string;
  onReconnect: (password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const passwordInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError('');
    try { await onReconnect(password); }
    catch { setError('Anmeldung nicht möglich. Prüfe dein Passwort und deine Verbindung.'); }
    finally { setPassword(''); setPending(false); }
  };
  return <Dialog open>
    <DialogContent scrollLayout="contained" overlayClassName="z-[200]" className="z-[210] flex flex-col p-5 sm:p-6 md:!max-w-md"
      onOpenAutoFocus={event => { event.preventDefault(); passwordInput.current?.focus(); }}
      onEscapeKeyDown={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()} onInteractOutside={event => event.preventDefault()}>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-5">
        <header className="space-y-3">
          <LockKeyhole aria-hidden="true" className="h-6 w-6 text-primary-ink" />
          <DialogTitle>Bitte erneut anmelden</DialogTitle>
          <DialogDescription>Deine Sitzung ist abgelaufen. Die offene Seite und deine Entwürfe bleiben erhalten, solange du sie nicht neu lädst.</DialogDescription>
        </header>
        <div className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-1">
          <div className="space-y-1.5"><label htmlFor="session-email" className="text-sm font-medium">Konto</label><Input id="session-email" type="email" autoComplete="username" value={email} readOnly /></div>
          <div className="space-y-1.5"><label htmlFor="session-password" className="text-sm font-medium">Passwort</label><Input ref={passwordInput} id="session-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required disabled={pending} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <footer className="shrink-0 space-y-2">
          <Button type="submit" className="w-full" disabled={pending || !password}>{pending ? 'Anmeldung wird geprüft …' : 'Erneut anmelden'}</Button>
          <Button type="button" variant="ghost" className="h-auto min-h-11 w-full whitespace-normal text-destructive" disabled={pending} onClick={() => void onSignOut()}>Abmelden und Entwürfe verwerfen</Button>
        </footer>
      </form>
    </DialogContent>
  </Dialog>;
}
