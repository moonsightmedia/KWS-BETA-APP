# Push-Benachrichtigungen Debug-Guide

## 🔍 Schritt-für-Schritt Debugging

### 1. Prüfe, ob Push-Benachrichtigungen aktiviert sind

**Im Browser (Chrome DevTools):**
```javascript
// Prüfe ob Token registriert ist
fetch('https://pkzzxtsyxwxoraytyjau.supabase.co/rest/v1/push_tokens?select=*', {
  headers: {
    'apikey': 'YOUR_API_KEY',
    'Authorization': 'Bearer YOUR_SESSION_TOKEN'
  }
}).then(r => r.json()).then(console.log);

// Prüfe ob push_enabled aktiviert ist
fetch('https://pkzzxtsyxwxoraytyjau.supabase.co/rest/v1/notification_preferences?select=push_enabled', {
  headers: {
    'apikey': 'YOUR_API_KEY',
    'Authorization': 'Bearer YOUR_SESSION_TOKEN'
  }
}).then(r => r.json()).then(console.log);
```

### 2. Prüfe, ob die Edge Function deployed ist

```bash
# Prüfe ob die Edge Function existiert
supabase functions list

# Prüfe die Logs der Edge Function
supabase functions logs send-push-notification
```

### 3. Prüfe, ob FCM Service Account JSON gesetzt ist

```bash
# Prüfe ob das Secret gesetzt ist (ohne Wert anzuzeigen)
supabase secrets list | grep FCM
```

### 4. Teste die Edge Function manuell

**Im Browser (Chrome DevTools):**
```javascript
// Teste die Edge Function direkt
fetch('https://pkzzxtsyxwxoraytyjau.supabase.co/functions/v1/send-push-notification', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tokens: [
      {
        token: 'YOUR_FCM_TOKEN',
        platform: 'android'
      }
    ],
    payload: {
      title: 'Test-Benachrichtigung',
      body: 'Dies ist eine Test-Nachricht',
      data: {
        test: true
      }
    }
  })
}).then(r => r.json()).then(console.log);
```

### 5. Prüfe die Browser-Konsole-Logs

Suche nach folgenden Logs:
- `[PushNotifications] 🔑 registerPushToken called` - Token wird registriert
- `[PushNotifications] ✅ Token registered successfully` - Token wurde erfolgreich registriert
- `[PushNotifications] 🔔 sendPushNotification called` - Push wird gesendet
- `[PushNotifications] 📤 Calling Edge Function` - Edge Function wird aufgerufen
- `[PushNotifications] 📥 Edge Function response` - Edge Function Antwort

### 6. Häufige Probleme

#### Problem: Kein Token registriert
**Lösung:**
1. Öffne die App auf dem Handy
2. Gehe zu Profil → Push-Benachrichtigungen
3. Aktiviere den Switch
4. Prüfe die Browser-Konsole auf `[PushNotifications] ✅ Token registered successfully`

#### Problem: Token registriert, aber keine Benachrichtigungen
**Lösung:**
1. Prüfe ob `push_enabled` in `notification_preferences` auf `true` ist
2. Prüfe ob die Edge Function deployed ist: `supabase functions list`
3. Prüfe die Edge Function Logs: `supabase functions logs send-push-notification`
4. Prüfe ob FCM Service Account JSON gesetzt ist: `supabase secrets list | grep FCM`

#### Problem: Edge Function Fehler
**Lösung:**
1. Prüfe die Edge Function Logs: `supabase functions logs send-push-notification`
2. Prüfe ob FCM Service Account JSON korrekt formatiert ist
3. Prüfe ob `FCM_PROJECT_ID` korrekt gesetzt ist (Standard: `kws-beta-app`)

#### Problem: FCM Token ungültig (UNREGISTERED)
**Lösung:**
1. Das Token wurde gelöscht oder ist abgelaufen
2. Deaktiviere und aktiviere Push-Benachrichtigungen erneut im Profil
3. Das Token wird automatisch neu registriert

## 📋 Checkliste

- [ ] Push-Benachrichtigungen sind im Profil aktiviert (`push_enabled = true`)
- [ ] Token ist in der `push_tokens` Tabelle vorhanden
- [ ] Edge Function ist deployed (`supabase functions list`)
- [ ] FCM Service Account JSON ist als Secret gesetzt (`supabase secrets list`)
- [ ] `FCM_PROJECT_ID` ist korrekt (Standard: `kws-beta-app`)
- [ ] Browser-Konsole zeigt keine Fehler
- [ ] Edge Function Logs zeigen keine Fehler

## 🚀 Manuelle Tests

### Test 1: Token-Registrierung
1. Öffne die App auf dem Handy
2. Gehe zu Profil → Push-Benachrichtigungen
3. Aktiviere den Switch
4. Prüfe Browser-Konsole: `[PushNotifications] ✅ Token registered successfully`
5. Prüfe Datenbank: `SELECT * FROM push_tokens WHERE user_id = 'YOUR_USER_ID';`

### Test 2: Push-Benachrichtigung senden
1. Verwende den Test-Button im Admin-Dashboard (Tests-Tab)
2. Oder erstelle einen neuen Boulder
3. Prüfe Browser-Konsole: `[PushNotifications] ✅ Push notification sent successfully`
4. Prüfe Edge Function Logs: `supabase functions logs send-push-notification`
5. Prüfe ob Benachrichtigung am Handy ankommt

### Test 3: Edge Function direkt testen
Siehe Schritt 4 oben.

