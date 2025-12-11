# Legacy API in Google Cloud Console aktivieren

## Schritt-für-Schritt Anleitung

### Schritt 1: Google Cloud Console öffnen
1. Klicke auf **"API in der Google Cloud Console verwalten"** im Popup-Menü
   - Oder gehe direkt zu: [Google Cloud Console](https://console.cloud.google.com/)
2. Stelle sicher, dass das Projekt **kws-beta-app** ausgewählt ist

### Schritt 2: Cloud Messaging API (Legacy) aktivieren
1. In der Google Cloud Console:
   - Gehe zu **"APIs & Services"** > **"Bibliothek"** (Library)
   - Oder direkt zu: [API Library](https://console.cloud.google.com/apis/library)
2. Suche nach: **"Cloud Messaging API (Legacy)"** oder **"FCM Legacy API"**
3. Klicke auf die API
4. Klicke auf **"AKTIVIEREN"** oder **"ENABLE"**

### Schritt 3: Zurück zu Firebase Console
1. Gehe zurück zur [Firebase Console](https://console.firebase.google.com/)
2. Projekt: **kws-beta-app**
3. Gehe zu **⚙️ Projekt-Einstellungen** > **Cloud Messaging**
4. Die **"Cloud Messaging API (Legacy)"** sollte jetzt **"Aktiviert"** sein
5. Der **Server-Schlüssel** sollte jetzt sichtbar sein!

### Schritt 4: Server Key kopieren
1. Unter **"Cloud Messaging API (Legacy)"** findest du jetzt:
   - **Server-Schlüssel** oder **Server Key**
   - Kopiere diesen Key (beginnt meist mit `AAAA...`)

### Schritt 5: Als Supabase Secret setzen
```bash
supabase secrets set FCM_SERVER_KEY=<dein-server-key>
```

## Alternative: Direkter Link

Falls der Popup-Link nicht funktioniert:
1. Gehe zu: [Google Cloud Console APIs](https://console.cloud.google.com/apis/library)
2. Suche nach: `Cloud Messaging API (Legacy)`
3. Klicke auf die API
4. Klicke auf **"AKTIVIEREN"**

## Nach der Aktivierung

```bash
# Edge Function deployen
supabase functions deploy send-push-notification

# Android-Projekt neu bauen
cd android
.\gradlew.bat clean assembleDebug
```

## Troubleshooting

**Problem:** API ist nicht sichtbar
- Stelle sicher, dass das richtige Projekt ausgewählt ist
- Suche nach "FCM" oder "Firebase Cloud Messaging"

**Problem:** "Aktivieren" Button ist nicht klickbar
- Prüfe ob du die nötigen Berechtigungen hast
- Versuche es mit einem anderen Browser oder im Inkognito-Modus

