# Push-Benachrichtigungen Debugging

## Problem: Keine Benachrichtigung am Handy

### Schritt 1: Console-Logs prüfen

Öffne die Browser-Console (F12) und klicke auf den Test-Button. Prüfe folgende Logs:

1. **`[PushNotifications] 🔔 sendPushNotification called`** - Wird der Service aufgerufen?
2. **`[PushNotifications] ✅ Session found`** - Ist eine Session vorhanden?
3. **`[PushNotifications] 📋 Preferences`** - Sind Push-Benachrichtigungen aktiviert?
4. **`[PushNotifications] 🔑 Tokens found: X`** - Wie viele Token sind registriert?
5. **`[PushNotifications] 📤 Calling Edge Function`** - Wird die Edge Function aufgerufen?
6. **`[PushNotifications] 📥 Edge Function response`** - Was antwortet die Edge Function?

### Schritt 2: Prüfe Push-Token

1. Gehe zu **Admin > Tests Tab**
2. Prüfe: **"Registrierte Token: X"**
3. Wenn **0 Token**: 
   - Öffne die App auf dem Handy
   - Gehe zu **Profil > Benachrichtigungen**
   - Aktiviere **Push-Benachrichtigungen**
   - Warte auf Token-Registrierung

### Schritt 3: Prüfe Push-Benachrichtigungen im Profil

1. Gehe zu **Profil > Benachrichtigungen**
2. Prüfe: **"Push-Benachrichtigungen"** muss **Aktiviert** sein
3. Wenn deaktiviert: Aktivieren und warten

### Schritt 4: Prüfe Edge Function

Die Edge Function muss deployed sein und `FCM_SERVER_KEY` als Secret haben:

```bash
# Prüfe ob Edge Function deployed ist
supabase functions list

# Prüfe Secrets
supabase secrets list
```

**Wichtig:** `FCM_SERVER_KEY` muss als Supabase Secret gesetzt sein!

### Schritt 5: Prüfe FCM Server Key

1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Wähle dein Projekt
3. Gehe zu **Projekteinstellungen > Cloud Messaging**
4. Prüfe: **"Legacy-Server-Schlüssel"** ist vorhanden
5. Falls nicht: Siehe `FCM_LEGACY_API_AKTIVIEREN.md`

### Schritt 6: Prüfe Edge Function Logs

```bash
# Logs der Edge Function anzeigen
supabase functions logs send-push-notification
```

### Häufige Probleme:

1. **Keine Token registriert**
   - Lösung: App auf Handy öffnen, Push-Benachrichtigungen aktivieren

2. **Push-Benachrichtigungen deaktiviert**
   - Lösung: Im Profil aktivieren

3. **FCM_SERVER_KEY nicht gesetzt**
   - Lösung: Als Supabase Secret setzen

4. **Edge Function nicht deployed**
   - Lösung: `supabase functions deploy send-push-notification`

5. **FCM Legacy API nicht aktiviert**
   - Lösung: In Firebase Console aktivieren

### Debug-Logs hinzufügen

Die Logs sollten zeigen:
- ✅ Session vorhanden
- ✅ Push-Benachrichtigungen aktiviert
- ✅ Token gefunden
- ✅ Edge Function aufgerufen
- ✅ Edge Function antwortet mit `success: true`

Wenn ein Schritt fehlt, ist dort das Problem!

