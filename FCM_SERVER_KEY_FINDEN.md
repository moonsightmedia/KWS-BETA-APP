# FCM Server Key finden - Schritt für Schritt

## ⚠️ Wichtig: Web-Push-Zertifikate ≠ FCM Server Key

Das Screenshot zeigt **Web-Push-Zertifikate** (für Browser-Push-Benachrichtigungen).
Für native Android-Push-Benachrichtigungen brauchst du den **FCM Server Key**.

## Wo findest du den FCM Server Key?

### Schritt 1: Firebase Console öffnen
- Gehe zu [Firebase Console](https://console.firebase.google.com/)
- Wähle dein Projekt: **kws-beta-app**

### Schritt 2: Zu Cloud Messaging navigieren
1. Klicke auf das **⚙️ Zahnrad-Symbol** oben links
2. Wähle **"Projekt-Einstellungen"** oder **"Project settings"**

### Schritt 3: Cloud Messaging Tab öffnen
1. Klicke auf den Tab **"Cloud Messaging"** (oben in den Einstellungen)
2. **NICHT** auf "Web-Push-Zertifikate" - das ist für Browser!

### Schritt 4: Server Key kopieren
Unter **"Cloud Messaging API (Legacy)"** findest du:
- **Server-Schlüssel** oder **Server Key**
- Das ist ein langer String, der mit `AAAA...` beginnt
- **Kopiere diesen Key** - das ist der FCM Server Key!

## Beispiel wie es aussieht:

```
Cloud Messaging API (Legacy)
┌─────────────────────────────────────────┐
│ Server-Schlüssel                        │
│ AAAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx │ ← Das ist der Key!
└─────────────────────────────────────────┘
```

## Was du mit dem Key machst:

```bash
supabase secrets set FCM_SERVER_KEY=AAAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Unterschied:

- **Web-Push-Zertifikate** (im Screenshot): Für Browser-Push-Benachrichtigungen
- **FCM Server Key**: Für native Android/iOS Push-Benachrichtigungen ← **Das brauchst du!**

## Falls der Server Key nicht sichtbar ist:

1. Stelle sicher, dass **Cloud Messaging API** aktiviert ist
2. Gehe zu [Google Cloud Console](https://console.cloud.google.com/)
3. Wähle dein Projekt: **kws-beta-app**
4. Gehe zu **APIs & Services > Enabled APIs**
5. Suche nach **"Cloud Messaging API"** oder **"FCM API"**
6. Aktiviere sie falls nicht aktiviert
7. Gehe zurück zu Firebase Console → Cloud Messaging Tab

