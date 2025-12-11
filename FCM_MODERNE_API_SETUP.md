# FCM Setup - Moderne API (V1)

## Was du siehst

Die Google Cloud Console zeigt drei FCM APIs:
1. **FCM Registration API** - Für Token-Registrierung
2. **Firebase Cloud Messaging API** ← **Das ist die moderne V1 API!**
3. **Firebase Cloud Messaging Data API** - Für Statistiken

Die **Legacy API** ist nicht mehr direkt sichtbar (wird 2024 eingestellt).

## Lösung: Moderne V1 API verwenden

### Option 1: Service Account Setup (Empfohlen)

Die V1 API nutzt **Service Accounts** statt Server Keys (sicherer und moderner).

#### Schritt 1: Firebase Cloud Messaging API aktivieren
1. Klicke auf **"Firebase Cloud Messaging API"** (die zweite Option)
2. Klicke auf **"AKTIVIEREN"** oder **"ENABLE"**

#### Schritt 2: Service Account erstellen
1. Gehe zu **IAM & Admin** > **Service Accounts**
   - Oder direkt: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Klicke auf **"Service Account erstellen"**
3. Name: z.B. `fcm-push-service`
4. Klicke auf **"Erstellen und fortfahren"**

#### Schritt 3: Rolle zuweisen
1. Rolle: **"Firebase Cloud Messaging API Service Agent"**
   - Oder: **"Firebase Cloud Messaging API Admin"**
2. Klicke auf **"Fertig"**

#### Schritt 4: JSON-Key erstellen
1. Klicke auf den erstellten Service Account
2. Tab: **"Schlüssel"** oder **"Keys"**
3. Klicke auf **"Schlüssel hinzufügen"** > **"Neuen Schlüssel erstellen"**
4. Wähle **JSON**
5. Die JSON-Datei wird heruntergeladen

#### Schritt 5: Service Account JSON als Secret setzen
```bash
# Öffne die heruntergeladene JSON-Datei
# Kopiere den GESAMTEN Inhalt (alles zwischen { und })

supabase secrets set FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"kws-beta-app","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**Wichtig:** Der gesamte JSON-String muss in Anführungszeichen stehen!

### Option 2: Legacy API finden (Falls verfügbar)

Falls du die Legacy API doch finden willst:
1. Suche nach: **"Cloud Messaging API"** (ohne "Firebase")
2. Oder gehe direkt zu: https://console.cloud.google.com/apis/api/fcm.googleapis.com
3. Falls verfügbar, aktiviere sie dort

## Edge Function aktualisieren

Die Edge Function unterstützt bereits beide Methoden:
- **Service Account JSON** (V1 API) - Moderner
- **FCM_SERVER_KEY** (Legacy API) - Fallback

## Nach dem Setup

```bash
# Edge Function deployen
supabase functions deploy send-push-notification

# Android-Projekt neu bauen
cd android
.\gradlew.bat clean assembleDebug
```

## Empfehlung

**Nutze Option 1 (Service Account)** - das ist die moderne, zukunftssichere Lösung!

Die Edge Function funktioniert mit beiden Methoden, aber Service Account ist besser.

