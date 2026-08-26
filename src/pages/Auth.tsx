import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KwsSegmentedControl } from '@/components/ui/kws-segmented-control';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

type AuthMode = 'login' | 'signup';
type PendingAction = 'login' | 'signup' | 'reset' | null;

const AUTH_MODES = [
  { value: 'login', label: 'Anmelden' },
  { value: 'signup', label: 'Registrieren' },
] as const;

const MONTHS = [
  { value: '1', label: 'Januar' },
  { value: '2', label: 'Februar' },
  { value: '3', label: 'März' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Dezember' },
] as const;

const fieldClassName =
  'h-12 rounded-kws-control border-border bg-[#F9FAF9] text-[#192436] shadow-none placeholder:text-muted-foreground/75 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-offset-0';

const selectClassName =
  'h-12 min-w-0 rounded-kws-control border-border bg-[#F9FAF9] px-2.5 text-[#192436] shadow-none focus:ring-primary/20 focus:ring-offset-0 [&>span]:line-clamp-none [&>span]:text-left';

const getDaysInMonth = (month: number, year: number): number =>
  new Date(year, month, 0).getDate();

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialMode: AuthMode = location.pathname.endsWith('/register') ? 'signup' : 'login';

  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendPending, setResendPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const {
    signIn,
    signUp,
    resetPassword,
    resendConfirmation,
    user,
  } = useAuth();

  useEffect(() => {
    setAuthMode(location.pathname.endsWith('/register') ? 'signup' : 'login');
  }, [location.pathname]);

  useEffect(() => {
    console.log('[Auth] mounted');

    if (user) {
      try {
        const preserveRoute = sessionStorage.getItem('preserveRoute');
        if (preserveRoute && preserveRoute !== '/auth' && preserveRoute !== window.location.pathname) {
          console.log('[Auth] User logged in, restoring preserved route:', preserveRoute);
          sessionStorage.removeItem('preserveRoute');
          navigate(preserveRoute);
          return;
        }
      } catch (error) {
        console.warn('[Auth] Error checking preserved route:', error);
      }

      navigate('/');
      return;
    }

    try {
      const preserveRoute = sessionStorage.getItem('preserveRoute');
      if (preserveRoute) {
        console.log('[Auth] Clearing preserved route on auth page:', preserveRoute);
        sessionStorage.removeItem('preserveRoute');
      }
    } catch (error) {
      console.warn('[Auth] Error clearing preserved route:', error);
    }
  }, [user, navigate]);

  const validDays = useMemo(() => {
    if (!birthMonth || !birthYear) return 31;
    return getDaysInMonth(Number(birthMonth), Number(birthYear));
  }, [birthMonth, birthYear]);

  useEffect(() => {
    if (birthDay && Number(birthDay) > validDays) setBirthDay('');
  }, [birthDay, validDays]);

  const changeMode = (nextMode: AuthMode) => {
    setAuthMode(nextMode);
    setShowResetPassword(false);
    setShowResendConfirmation(false);
    navigate(nextMode === 'signup' ? '/app/register' : '/app/login', { replace: true });
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      sessionStorage.removeItem('preserveRoute');
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }

    setPendingAction('login');
    try {
      await signIn(email, password);
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setPendingAction(null);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setPendingAction('signup');
    try {
      let birthDateString = '';
      if (birthDay && birthMonth && birthYear) {
        const day = Number(birthDay);
        const month = Number(birthMonth);
        const year = Number(birthYear);
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          birthDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }

      await signUp(email, password, { firstName, lastName, birthDate: birthDateString });
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setBirthDay('');
      setBirthMonth('');
      setBirthYear('');
    } catch (error) {
      console.error('Sign up error:', error);
    } finally {
      setPendingAction(null);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPendingAction('reset');
    try {
      await resetPassword(resetEmail);
      setResetEmail('');
      setShowResetPassword(false);
    } catch (error) {
      console.error('Reset password error:', error);
    } finally {
      setPendingAction(null);
    }
  };

  const handleResendConfirmation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resendEmail.trim()) return;
    setResendPending(true);
    try {
      await resendConfirmation(resendEmail.trim());
      setResendEmail('');
      setShowResendConfirmation(false);
    } catch (error) {
      console.error('Resend confirmation error:', error);
    } finally {
      setResendPending(false);
    }
  };

  const handleMonthChange = (value: string) => {
    setBirthMonth(value);
    if (birthDay && birthYear && Number(birthDay) > getDaysInMonth(Number(value), Number(birthYear))) {
      setBirthDay('');
    }
  };

  const handleYearChange = (value: string) => {
    setBirthYear(value);
    if (birthDay && birthMonth && Number(birthDay) > getDaysInMonth(Number(birthMonth), Number(value))) {
      setBirthDay('');
    }
  };

  const isLogin = authMode === 'login';
  const headline = isLogin ? 'Willkommen zurück' : 'Konto erstellen';
  const intro = isLogin
    ? 'Melde dich an und finde deine Boulder, Betas und Fortschritte.'
    : 'Ein Konto verbindet deine Boulder, Sessions und persönlichen Statistiken.';

  return (
    <main className="min-h-[100svh] min-h-[100dvh] overflow-x-clip bg-[#F9FAF9] text-[#192436]">
      <div className="mx-auto grid min-h-[100svh] min-h-[100dvh] w-full max-w-[1180px] content-start lg:grid-cols-[minmax(0,0.9fr)_minmax(440px,0.72fr)] lg:content-stretch">
        <section className="relative px-4 pb-5 pt-[calc(1rem+var(--app-safe-area-top))] sm:px-8 sm:pb-7 sm:pt-[calc(1.5rem+var(--app-safe-area-top))] lg:flex lg:min-h-[100dvh] lg:flex-col lg:justify-between lg:px-12 lg:pb-12 lg:pt-[calc(3rem+var(--app-safe-area-top))]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-kws-control bg-white shadow-[0_3px_14px_rgba(19,17,43,0.10)]">
              <img
                src="/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png"
                alt=""
                aria-hidden="true"
                className="h-8 w-8 object-contain"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                Kletterwelt Sauerland
              </p>
              <p className="text-sm font-semibold text-[#192436]">Beta App</p>
            </div>
          </div>

          <div className="mt-5 max-w-xl lg:mt-0">
            <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary">
              Dein Boulderbegleiter
            </p>
            <h1 className="font-heading text-[2.7rem] font-semibold leading-[0.92] text-[#192436] sm:text-[3.25rem] lg:text-[4.5rem]">
              {headline}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
              {intro}
            </p>
          </div>

          <div className="mt-8 hidden max-w-md border-l-2 border-primary pl-4 lg:block">
            <p className="text-sm font-semibold text-[#192436]">Weniger suchen. Mehr klettern.</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Aktuelle Boulder, hilfreiche Betas und dein Fortschritt an einem Ort.
            </p>
          </div>
        </section>

        <section className="mobile-page-bottom-safe px-4 sm:px-8 lg:flex lg:min-h-[100dvh] lg:items-center lg:px-10 lg:pt-[calc(2.5rem+var(--app-safe-area-top))]">
          <div className="mx-auto w-full max-w-[480px] rounded-kws-card bg-white p-4 shadow-[0_5px_18px_rgba(19,17,43,0.08)] sm:p-6">
            <KwsSegmentedControl
              value={authMode}
              options={AUTH_MODES}
              onValueChange={changeMode}
              ariaLabel="Zwischen Anmeldung und Registrierung wechseln"
              className="mb-6"
            />

            {isLogin ? (
              !showResetPassword ? (
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-semibold text-[#192436]">E-Mail</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input id="login-email" type="email" inputMode="email" autoComplete="email" placeholder="deine@email.de" value={email} onChange={(event) => setEmail(event.target.value)} required className={`${fieldClassName} pl-10`} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="login-password" className="text-sm font-semibold text-[#192436]">Passwort</Label>
                      <button type="button" onClick={() => { setResetEmail(email); setShowResetPassword(true); }} className="rounded-kws-badge text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                        Vergessen?
                      </button>
                    </div>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Dein Passwort" value={password} onChange={(event) => setPassword(event.target.value)} required className={`${fieldClassName} px-10`} />
                      <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-kws-control text-muted-foreground transition-colors hover:bg-secondary hover:text-[#192436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label={showPassword ? 'Passwort ausblenden' : 'Passwort anzeigen'}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" size="lg" disabled={pendingAction !== null} className="h-12 w-full font-semibold">
                    {pendingAction === 'login' ? 'Anmeldung läuft…' : 'Anmelden'}
                    {pendingAction !== 'login' && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div>
                    <p className="text-base font-semibold text-[#192436]">Passwort zurücksetzen</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Wir senden dir einen sicheren Link an deine E-Mail-Adresse.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-semibold text-[#192436]">E-Mail</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input id="reset-email" type="email" inputMode="email" autoComplete="email" placeholder="deine@email.de" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required className={`${fieldClassName} pl-10`} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" size="lg" onClick={() => setShowResetPassword(false)} className="h-12">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Zurück
                    </Button>
                    <Button type="submit" size="lg" disabled={pendingAction !== null} className="h-12 px-3">
                      {pendingAction === 'reset' ? 'Wird gesendet…' : 'Link senden'}
                    </Button>
                  </div>
                </form>
              )
            ) : (
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname" className="text-sm font-semibold text-[#192436]">Vorname</Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input id="signup-firstname" type="text" autoComplete="given-name" placeholder="Max" value={firstName} onChange={(event) => setFirstName(event.target.value)} className={`${fieldClassName} pl-10`} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname" className="text-sm font-semibold text-[#192436]">Nachname</Label>
                    <Input id="signup-lastname" type="text" autoComplete="family-name" placeholder="Mustermann" value={lastName} onChange={(event) => setLastName(event.target.value)} className={fieldClassName} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-[#192436]">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Geburtsdatum
                  </Label>
                  <div className="grid grid-cols-[0.8fr_1.25fr_1fr] gap-2">
                    <Select value={birthDay} onValueChange={setBirthDay}>
                      <SelectTrigger className={selectClassName} aria-label="Geburtstag"><SelectValue placeholder="Tag" /></SelectTrigger>
                      <SelectContent className="rounded-kws-control border-border text-[#192436]">
                        {Array.from({ length: validDays }, (_, index) => index + 1).map((day) => <SelectItem key={day} value={String(day)} className="rounded-kws-badge">{day}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={birthMonth} onValueChange={handleMonthChange}>
                      <SelectTrigger className={selectClassName} aria-label="Geburtsmonat"><SelectValue placeholder="Monat" /></SelectTrigger>
                      <SelectContent className="rounded-kws-control border-border text-[#192436]">
                        {MONTHS.map((month) => <SelectItem key={month.value} value={month.value} className="rounded-kws-badge">{month.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={birthYear} onValueChange={handleYearChange}>
                      <SelectTrigger className={selectClassName} aria-label="Geburtsjahr"><SelectValue placeholder="Jahr" /></SelectTrigger>
                      <SelectContent className="rounded-kws-control border-border text-[#192436]">
                        {Array.from({ length: new Date().getFullYear() - 1899 }, (_, index) => new Date().getFullYear() - index).map((year) => <SelectItem key={year} value={String(year)} className="rounded-kws-badge">{year}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-semibold text-[#192436]">E-Mail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input id="signup-email" type="email" inputMode="email" autoComplete="email" placeholder="deine@email.de" value={email} onChange={(event) => setEmail(event.target.value)} required className={`${fieldClassName} pl-10`} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-semibold text-[#192436]">Passwort</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input id="signup-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Mindestens 6 Zeichen" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} className={`${fieldClassName} px-10`} />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-kws-control text-muted-foreground transition-colors hover:bg-secondary hover:text-[#192436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label={showPassword ? 'Passwort ausblenden' : 'Passwort anzeigen'}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" size="lg" disabled={pendingAction !== null} className="h-12 w-full font-semibold">
                  {pendingAction === 'signup' ? 'Konto wird erstellt…' : 'Konto erstellen'}
                  {pendingAction !== 'signup' && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </form>
            )}

            <div className="mt-6 border-t border-border pt-5">
              {!showResendConfirmation ? (
                <button type="button" onClick={() => setShowResendConfirmation(true)} className="w-full rounded-kws-badge text-center text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  Keine Bestätigungsmail erhalten?
                </button>
              ) : (
                <form onSubmit={handleResendConfirmation} className="space-y-3 rounded-kws-control bg-secondary p-3">
                  <Label htmlFor="resend-email" className="text-xs font-semibold text-[#192436]">Bestätigungslink erneut senden</Label>
                  <Input id="resend-email" type="email" inputMode="email" autoComplete="email" placeholder="deine@email.de" value={resendEmail} onChange={(event) => setResendEmail(event.target.value)} required className={`${fieldClassName} h-11 bg-white text-sm`} />
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={() => { setShowResendConfirmation(false); setResendEmail(''); }} className="h-10 bg-white text-xs">Abbrechen</Button>
                    <Button type="submit" disabled={resendPending} className="h-10 px-2 text-xs">{resendPending ? 'Wird gesendet…' : 'Link senden'}</Button>
                  </div>
                </form>
              )}

              <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/guest')} className="mt-4 h-12 w-full text-[#192436]">
                Als Gast fortfahren <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Auth;
