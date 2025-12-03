import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Helper function to get days in a month
const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate();
};

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDay, setBirthDay] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');
  const [resetEmail, setResetEmail] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const {
    signIn,
    signUp,
    resetPassword,
    user
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    console.log('[Auth] mounted');
    
    if (user) {
      // Try to restore the original route if it was preserved
      try {
        const preserveRoute = sessionStorage.getItem('preserveRoute');
        if (preserveRoute && preserveRoute !== '/auth' && preserveRoute !== window.location.pathname) {
          console.log('[Auth] User logged in, restoring preserved route:', preserveRoute);
          sessionStorage.removeItem('preserveRoute');
          navigate(preserveRoute);
          return;
        }
      } catch (error) {
        // Ignore storage errors
        console.warn('[Auth] Error checking preserved route:', error);
      }
      
      // Default: navigate to home
      navigate('/');
    } else {
      // Clear any preserved route when explicitly on auth page (only if no user)
      try {
        const preserveRoute = sessionStorage.getItem('preserveRoute');
        if (preserveRoute) {
          console.log('[Auth] Clearing preserved route on auth page:', preserveRoute);
          sessionStorage.removeItem('preserveRoute');
        }
      } catch (error) {
        // Ignore storage errors
        console.warn('[Auth] Error clearing preserved route:', error);
      }
    }
  }, [user, navigate]);
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any preserved route before attempting login
    try {
      sessionStorage.removeItem('preserveRoute');
    } catch (error) {
      // Ignore storage errors
    }
    
    try {
      await signIn(email, password);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Combine day, month, year into date string (yyyy-MM-dd)
      let birthDateString = '';
      if (birthDay && birthMonth && birthYear) {
        // Validate date and format as yyyy-MM-dd
        const day = parseInt(birthDay, 10);
        const month = parseInt(birthMonth, 10);
        const year = parseInt(birthYear, 10);
        const date = new Date(year, month - 1, day);
        // Check if date is valid (handles invalid dates like Feb 30)
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          birthDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
      await signUp(email, password, { firstName, lastName, birthDate: birthDateString } as any);
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setBirthDay('');
      setBirthMonth('');
      setBirthYear('');
    } catch (error) {
      console.error('Sign up error:', error);
    }
  };
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(resetEmail);
      setResetEmail('');
      setShowResetPassword(false);
    } catch (error) {
      console.error('Reset password error:', error);
    }
  };
  const handleContinueAsGuest = () => {
    navigate('/guest');
  };

  // Calculate valid days based on selected month and year
  const validDays = useMemo(() => {
    if (!birthMonth || !birthYear) {
      return 31; // Default to 31 if month/year not selected
    }
    const month = parseInt(birthMonth, 10);
    const year = parseInt(birthYear, 10);
    return getDaysInMonth(month, year);
  }, [birthMonth, birthYear]);

  // Reset day if it's invalid for the selected month/year
  useEffect(() => {
    if (birthDay && birthMonth && birthYear) {
      const day = parseInt(birthDay, 10);
      const maxDays = validDays;
      if (day > maxDays) {
        setBirthDay('');
      }
    }
  }, [birthDay, birthMonth, birthYear, validDays]);

  // Handle month change - reset day if invalid
  const handleMonthChange = (value: string) => {
    setBirthMonth(value);
    if (birthDay && birthYear) {
      const month = parseInt(value, 10);
      const year = parseInt(birthYear, 10);
      const maxDays = getDaysInMonth(month, year);
      const day = parseInt(birthDay, 10);
      if (day > maxDays) {
        setBirthDay('');
      }
    }
  };

  // Handle year change - reset day if invalid
  const handleYearChange = (value: string) => {
    setBirthYear(value);
    if (birthDay && birthMonth) {
      const month = parseInt(birthMonth, 10);
      const year = parseInt(value, 10);
      const maxDays = getDaysInMonth(month, year);
      const day = parseInt(birthDay, 10);
      if (day > maxDays) {
        setBirthDay('');
      }
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-[#F9FAF9] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-heading font-bold tracking-wide text-[#13112B] mb-2">Willkommen bei der Kletterwelt Sauerland Beta App</h1>
          <p className="text-[#13112B]/60">Sieh dir die Beta Videos zu deinem Projekt an!</p>
        </div>
        
        <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
          <CardHeader className="space-y-1">
            <CardDescription className="text-[#13112B]/60">Melde dich an oder erstelle ein neues Konto</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-[#F9FAF9] p-1 rounded-xl">
                <TabsTrigger value="login" className="h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Anmelden</TabsTrigger>
                <TabsTrigger value="signup" className="h-11 rounded-xl data-[state=active]:bg-[#36B531] data-[state=active]:text-white">Registrieren</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-0">
                {!showResetPassword ? <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium text-[#13112B]">E-Mail</Label>
                      <Input 
                        id="login-email" 
                        type="email" 
                        placeholder="deine@email.de" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium text-[#13112B]">Passwort</Label>
                      <Input 
                        id="login-password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                        className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                      />
                      <button type="button" onClick={() => setShowResetPassword(true)} className="text-xs text-[#36B531] hover:underline">
                        Passwort vergessen?
                      </button>
                    </div>
                    <Button type="submit" className="w-full mt-6 h-11 rounded-xl bg-[#36B531] hover:bg-[#2DA029] text-white">
                      Anmelden
                    </Button>
                  </form> : <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-sm font-medium text-[#13112B]">E-Mail</Label>
                      <Input 
                        id="reset-email" 
                        type="email" 
                        placeholder="deine@email.de" 
                        value={resetEmail} 
                        onChange={e => setResetEmail(e.target.value)} 
                        required 
                        className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                      />
                      <p className="text-xs text-[#13112B]/60">
                        Wir senden dir einen Link zum Zurücksetzen deines Passworts
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowResetPassword(false)} 
                        className="flex-1 h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
                      >
                        Zurück
                      </Button>
                      <Button type="submit" className="flex-1 h-11 rounded-xl bg-[#36B531] hover:bg-[#2DA029] text-white">
                        Link senden
                      </Button>
                    </div>
                  </form>}
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname" className="text-sm font-medium text-[#13112B]">Vorname</Label>
                      <Input 
                        id="signup-firstname" 
                        type="text" 
                        placeholder="Max" 
                        value={firstName} 
                        onChange={e => setFirstName(e.target.value)} 
                        className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname" className="text-sm font-medium text-[#13112B]">Nachname</Label>
                      <Input 
                        id="signup-lastname" 
                        type="text" 
                        placeholder="Mustermann" 
                        value={lastName} 
                        onChange={e => setLastName(e.target.value)} 
                        className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#13112B]">Geburtsdatum</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={birthDay} onValueChange={setBirthDay}>
                          <SelectTrigger className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]">
                            <SelectValue placeholder="Tag" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: validDays }, (_, i) => i + 1).map((day) => (
                              <SelectItem key={day} value={day.toString()}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={birthMonth} onValueChange={handleMonthChange}>
                          <SelectTrigger className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]">
                            <SelectValue placeholder="Monat" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
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
                            ].map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={birthYear} onValueChange={handleYearChange}>
                          <SelectTrigger className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]">
                            <SelectValue placeholder="Jahr" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: new Date().getFullYear() - 1899 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-[#13112B]">E-Mail</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="deine@email.de" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required 
                      className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-[#13112B]">Passwort</Label>
                    <Input 
                      id="signup-password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      minLength={6} 
                      className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
                    />
                    <p className="text-xs text-[#13112B]/60">
                      Mindestens 6 Zeichen
                    </p>
                  </div>
                  <Button type="submit" className="w-full mt-6 h-11 rounded-xl bg-[#36B531] hover:bg-[#2DA029] text-white">
                    Registrieren
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="mt-4 pt-4 border-t border-[#E7F7E9]">
              <Button 
                variant="outline" 
                onClick={handleContinueAsGuest} 
                className="w-full h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
              >
                Als Gast fortfahren
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Auth;