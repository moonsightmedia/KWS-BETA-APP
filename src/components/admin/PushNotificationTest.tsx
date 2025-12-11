import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { sendPushNotification } from '@/services/pushNotifications';
import { toast } from 'sonner';
import { Bell, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const PushNotificationTest = () => {
  const { user, session } = useAuth();
  const { data: notificationPreferences } = useNotificationPreferences();
  const [title, setTitle] = useState('Test-Benachrichtigung');
  const [body, setBody] = useState('Dies ist eine Test-Push-Benachrichtigung');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch push tokens for current user
  const { data: pushTokens } = useQuery({
    queryKey: ['push_tokens', user?.id],
    queryFn: async () => {
      if (!user || !session) return [];
      
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Supabase-Konfiguration fehlt');
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${user.id}&select=token,platform,created_at`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user && !!session,
  });

  const handleSendTest = async () => {
    if (!user) {
      toast.error('Bitte melde dich an');
      return;
    }

    if (!notificationPreferences?.push_enabled) {
      toast.error('Push-Benachrichtigungen sind nicht aktiviert', {
        description: 'Bitte aktiviere Push-Benachrichtigungen in deinem Profil.',
      });
      return;
    }

    if (!pushTokens || pushTokens.length === 0) {
      toast.error('Kein Push-Token gefunden', {
        description: 'Bitte aktiviere Push-Benachrichtigungen in deinem Profil, um ein Token zu registrieren.',
      });
      return;
    }

    setSending(true);
    setLastResult(null);

    try {
      console.log('[PushNotificationTest] Sending test notification...');
      await sendPushNotification(user.id, {
        title: title || 'Test-Benachrichtigung',
        body: body || 'Dies ist eine Test-Push-Benachrichtigung',
        data: {
          test: true,
          timestamp: new Date().toISOString(),
        },
        action_url: '/',
      }, session);

      setLastResult({
        success: true,
        message: `Push-Benachrichtigung erfolgreich gesendet an ${pushTokens.length} Token(s)`,
      });
      toast.success('Test-Benachrichtigung gesendet!', {
        description: `Gesendet an ${pushTokens.length} Token(s)`,
      });
    } catch (error: any) {
      console.error('[PushNotificationTest] Error:', error);
      setLastResult({
        success: false,
        message: error.message || 'Unbekannter Fehler',
      });
      toast.error('Fehler beim Senden', {
        description: error.message || 'Unbekannter Fehler',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-heading font-bold text-[#13112B] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#36B531]" />
            Push-Benachrichtigungen Test
          </CardTitle>
          <CardDescription className="text-sm text-[#13112B]/60">
            Sende eine Test-Push-Benachrichtigung an dein Gerät
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Info */}
          <div className="space-y-2 p-4 rounded-xl bg-[#F9FAF9] border border-[#E7F7E9]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#13112B]">Push-Benachrichtigungen:</span>
              <span className={`text-sm font-semibold ${notificationPreferences?.push_enabled ? 'text-[#36B531]' : 'text-red-500'}`}>
                {notificationPreferences?.push_enabled ? 'Aktiviert' : 'Deaktiviert'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#13112B]">Registrierte Token:</span>
              <span className="text-sm font-semibold text-[#13112B]">
                {pushTokens ? pushTokens.length : 'Lädt...'}
              </span>
            </div>
            {pushTokens && pushTokens.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[#E7F7E9]">
                <p className="text-xs text-[#13112B]/60 mb-1">Token-Details:</p>
                {pushTokens.map((token: any, index: number) => (
                  <div key={index} className="text-xs text-[#13112B]/60 font-mono">
                    {token.platform}: {token.token.substring(0, 20)}...
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-title">Titel</Label>
              <Input
                id="test-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Test-Benachrichtigung"
                className="h-11 border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-body">Nachricht</Label>
              <Input
                id="test-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Dies ist eine Test-Push-Benachrichtigung"
                className="h-11 border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]"
              />
            </div>
          </div>

          {/* Result */}
          {lastResult && (
            <div className={`p-4 rounded-xl border-2 ${
              lastResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {lastResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${
                    lastResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {lastResult.success ? 'Erfolg' : 'Fehler'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    lastResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {lastResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleSendTest}
            disabled={sending || !notificationPreferences?.push_enabled || !pushTokens || pushTokens.length === 0}
            className="w-full h-11 rounded-xl bg-[#36B531] hover:bg-[#2da029] text-white"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sende...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Test-Benachrichtigung senden
              </>
            )}
          </Button>

          {(!notificationPreferences?.push_enabled || !pushTokens || pushTokens.length === 0) && (
            <p className="text-xs text-[#13112B]/60 text-center">
              {!notificationPreferences?.push_enabled 
                ? 'Bitte aktiviere Push-Benachrichtigungen in deinem Profil.'
                : 'Bitte aktiviere Push-Benachrichtigungen in deinem Profil, um ein Token zu registrieren.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
