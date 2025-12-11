# FCM V1 API Setup - Einfache Lösung

## Problem
Die **Legacy API ist deaktiviert** und der Server Key ist nicht sichtbar. Die **V1 API ist aktiviert**, benötigt aber ein **Service Account** statt eines Server Keys.

## Lösung: Service Account erstellen

### Option 1: Service Account verwenden (Empfohlen für V1 API)

1. **Google Cloud Console öffnen:**
   - Gehe zu [Google Cloud Console](https://console.cloud.google.com/)
   - Wähle Projekt: **kws-beta-app**

2. **Service Account erstellen:**
   - Gehe zu **IAM & Admin > Service Accounts**
   - Klicke auf **"Service Account erstellen"** oder **"Create Service Account"**
   - Name: z.B. `fcm-push-service`
   - Klicke auf **"Erstellen und fortfahren"**

3. **Rolle zuweisen:**
   - Rolle: **"Firebase Cloud Messaging API Admin"** oder **"Firebase Cloud Messaging API Service Agent"**
   - Klicke auf **"Fertig"**

4. **JSON-Key erstellen:**
   - Klicke auf den erstellten Service Account
   - Tab: **"Schlüssel"** oder **"Keys"**
   - Klicke auf **"Schlüssel hinzufügen" > "Neuen Schlüssel erstellen"**
   - Wähle **JSON**
   - Die JSON-Datei wird heruntergeladen

5. **Service Account JSON als Secret setzen:**
   ```bash
   # Öffne die heruntergeladene JSON-Datei und kopiere den gesamten Inhalt
   supabase secrets set FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"kws-beta-app",...}'
   ```

### Option 2: Legacy API aktivieren (Einfacher, aber veraltet)

1. **Legacy API aktivieren:**
   - Firebase Console → Projekt-Einstellungen → Cloud Messaging
   - Klicke auf die drei Punkte bei **"Cloud Messaging API (Legacy)"**
   - Wähle **"Aktivieren"** oder **"Enable"**
   - Der Server Key sollte dann sichtbar sein

2. **Server Key kopieren:**
   - Unter "Cloud Messaging API (Legacy)" → **Server-Schlüssel** kopieren

3. **Als Secret setzen:**
   ```bash
   supabase secrets set FCM_SERVER_KEY=<dein-server-key>
   ```

## Empfehlung

**Option 1 (Service Account)** ist moderner und sicherer, aber etwas komplizierter.
**Option 2 (Legacy API aktivieren)** ist einfacher, aber die Legacy API wird 2024 eingestellt.

## Nach dem Setup

```bash
# Edge Function deployen
supabase functions deploy send-push-notification

# Android-Projekt neu bauen
cd android
.\gradlew.bat clean assembleDebug
```

Die Edge Function unterstützt beide Methoden automatisch!

