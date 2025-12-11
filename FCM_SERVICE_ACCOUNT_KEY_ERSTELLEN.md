# Service Account JSON-Key erstellen

## Status
✅ Firebase Cloud Messaging API ist aktiviert
✅ Service Account wurde erstellt (siehe Benachrichtigung unten)

## Nächste Schritte: JSON-Key erstellen

### Schritt 1: Zu Service Accounts navigieren
1. Klicke auf **"Anmeldedaten"** (Credentials) Tab oben
2. Oder gehe direkt zu: **IAM & Admin** > **Service Accounts**
   - Link: https://console.cloud.google.com/iam-admin/serviceaccounts

### Schritt 2: Service Account öffnen
1. Finde den erstellten Service Account (z.B. `fcm-push-service` oder ähnlich)
2. Klicke auf den Service Account Namen

### Schritt 3: JSON-Key erstellen
1. Im Service Account Detail-Fenster:
   - Klicke auf den Tab **"Schlüssel"** oder **"Keys"**
2. Klicke auf **"Schlüssel hinzufügen"** oder **"Add Key"**
3. Wähle **"Neuen Schlüssel erstellen"** oder **"Create new key"**
4. Wähle **JSON** als Format
5. Klicke auf **"Erstellen"** oder **"Create"**
6. Die JSON-Datei wird automatisch heruntergeladen

### Schritt 4: JSON-Inhalt kopieren
1. Öffne die heruntergeladene JSON-Datei (z.B. `kws-beta-app-xxxxx.json`)
2. Kopiere den **GESAMTEN Inhalt** der Datei
   - Sollte so aussehen:
   ```json
   {
     "type": "service_account",
     "project_id": "kws-beta-app",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "..."
   }
   ```

### Schritt 5: Als Supabase Secret setzen

**Wichtig:** Der gesamte JSON-String muss in Anführungszeichen stehen!

```bash
supabase secrets set FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"kws-beta-app","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

**Tipp:** In PowerShell musst du die Anführungszeichen escapen:
```powershell
supabase secrets set FCM_SERVICE_ACCOUNT_JSON="{\"type\":\"service_account\",...}"
```

Oder verwende einfache Anführungszeichen außen und doppelte innen:
```powershell
supabase secrets set FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

### Schritt 6: Edge Function deployen
```bash
supabase functions deploy send-push-notification
```

### Schritt 7: Android-Projekt neu bauen
```bash
cd android
.\gradlew.bat clean assembleDebug
```

## Troubleshooting

**Problem:** JSON-String zu lang für Terminal
- Lösung: Speichere den JSON-Inhalt in einer Datei und verwende:
  ```bash
  supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
  ```

**Problem:** PowerShell escapt Anführungszeichen falsch
- Lösung: Verwende einfache Anführungszeichen außen:
  ```powershell
  supabase secrets set FCM_SERVICE_ACCOUNT_JSON='{...}'
  ```

## Nach dem Setup

Die Edge Function sollte jetzt Push-Benachrichtigungen über die V1 API senden können!

