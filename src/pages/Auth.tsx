import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(email, password);
      setEmail('');
      setPassword('');
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
    navigate('/');
  };
  return <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold font-teko tracking-wide text-foreground mb-2">Willkommen bei der Kletterwelt Sauerland Beta App</h1>
          <p className="text-muted-foreground">Sieh dir die Beta Videos zu deinem Projekt an!</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardDescription>Melde dich an oder erstelle ein neues Konto</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="signup">Registrieren</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-0">
                {!showResetPassword ? <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-Mail</Label>
                      <Input id="login-email" type="email" placeholder="deine@email.de" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Passwort</Label>
                      <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                      <button type="button" onClick={() => setShowResetPassword(true)} className="text-xs text-primary hover:underline">
                        Passwort vergessen?
                      </button>
                    </div>
                    <Button type="submit" className="w-full mt-6">
                      Anmelden
                    </Button>
                  </form> : <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">E-Mail</Label>
                      <Input id="reset-email" type="email" placeholder="deine@email.de" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                      <p className="text-xs text-muted-foreground">
                        Wir senden dir einen Link zum Zurücksetzen deines Passworts
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowResetPassword(false)} className="flex-1">
                        Zurück
                      </Button>
                      <Button type="submit" className="flex-1">
                        Link senden
                      </Button>
                    </div>
                  </form>}
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-Mail</Label>
                    <Input id="signup-email" type="email" placeholder="deine@email.de" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Passwort</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    <p className="text-xs text-muted-foreground">
                      Mindestens 6 Zeichen
                    </p>
                  </div>
                  <Button type="submit" className="w-full mt-6">
                    Registrieren
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" onClick={handleContinueAsGuest} className="w-full">
                Als Gast fortfahren
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Auth;