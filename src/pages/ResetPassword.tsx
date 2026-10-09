import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { completeEmailSession } from '@/lib/emailAuth';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialization = useRef<Promise<boolean> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    initialization.current ??= completeEmailSession(supabase.auth, location.search, location.hash);
    initialization.current.then(() => {
      if (!active) return;
      // Remove tokens before subsequent navigation or accidental link sharing.
      window.history.replaceState(null, '', '/reset-password');
      setReady(true);
    }).catch((failure: unknown) => {
      if (!active) return;
      window.history.replaceState(null, '', '/reset-password');
      setError(failure instanceof Error ? failure.message : 'Der Link konnte nicht verarbeitet werden.');
    });
    return () => { active = false; };
  }, [location.hash, location.search]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || !ready) return;
    if (password.length < 6) { setError('Bitte verwende mindestens 6 Zeichen.'); return; }
    if (password !== confirmation) { setError('Die Passwörter stimmen nicht überein.'); return; }
    setPending(true);
    setError('');
    try {
      const { error: failure } = await supabase.auth.updateUser({ password });
      if (failure) {
        setError(failure.code === 'same_password'
          ? 'Bitte wähle ein anderes Passwort als dein bisheriges.'
          : 'Das Passwort konnte nicht geändert werden. Bitte fordere bei Bedarf einen neuen Link an.');
        return;
      }
      setPassword('');
      setConfirmation('');
      toast.success('Dein Passwort wurde geändert.');
      navigate('/', { replace: true });
    } catch {
      setError('Die Verbindung ist fehlgeschlagen. Bitte versuche es erneut.');
    } finally { setPending(false); }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-kws-card border border-border bg-card p-6 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-primary">Kletterwelt Sauerland</p>
        <h1 className="text-2xl font-bold">Neues Passwort festlegen</h1>
        {!ready && !error && <p role="status" className="mt-4 text-muted-foreground">Dein Link wird geprüft …</p>}
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        {ready && <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2"><Label htmlFor="new-password">Neues Passwort</Label>
            <Input id="new-password" type="password" autoComplete="new-password" minLength={6} required disabled={pending} value={password} onChange={event => setPassword(event.target.value)} />
          </div>
          <div className="space-y-2"><Label htmlFor="confirm-password">Passwort wiederholen</Label>
            <Input id="confirm-password" type="password" autoComplete="new-password" minLength={6} required disabled={pending} value={confirmation} onChange={event => setConfirmation(event.target.value)} />
          </div>
          <Button type="submit" disabled={pending} className="w-full">{pending ? 'Wird gespeichert …' : 'Passwort speichern'}</Button>
        </form>}
        <Link to="/auth" className="mt-5 inline-block text-sm text-primary underline">Zur Anmeldung</Link>
      </section>
    </main>
  );
}
