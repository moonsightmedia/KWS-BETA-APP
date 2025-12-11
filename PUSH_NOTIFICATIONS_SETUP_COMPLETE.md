# Push-Benachrichtigungen Setup - Vollständig

## ✅ Was wurde implementiert:

1. **Supabase Edge Function** (`supabase/functions/send-push-notification/index.ts`)
   - Sendet Push-Benachrichtigungen über Firebase Cloud Messaging (FCM) für Android
   - Unterstützt iOS (benötigt APNs Setup)

2. **Frontend Service** (`src/services/pushNotifications.ts`)
   - `sendPushNotification()` ruft die Edge Function auf
   - `sendPushNotificationForNotification()` sendet Push nach Notification-Erstellung

3. **Automatischer Versand**
   - Push-Benachrichtigungen werden automatisch gesendet, wenn:
     - Eine Notification in der Datenbank erstellt wird
     - Der Benutzer Push-Benachrichtigungen aktiviert hat
     - Push-Tokens für den Benutzer vorhanden sind

## 🔧 Setup-Schritte:

### 1. Firebase Cloud Messaging (FCM) konfigurieren

1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Erstelle ein neues Projekt oder wähle ein bestehendes
3. Gehe zu **Project Settings > Cloud Messaging**
4. Kopiere den **Server Key** (Legacy Server Key)

### 2. Supabase Edge Function deployen

```bash
# Installiere Supabase CLI falls noch nicht installiert
npm install -g supabase

# Login zu Supabase
supabase login

# Linke dein Projekt
supabase link --project-ref <your-project-ref>

# Setze FCM Server Key als Secret
supabase secrets set FCM_SERVER_KEY=<your-fcm-server-key>

# Deploye die Edge Function
supabase functions deploy send-push-notification
```

### 3. Android Firebase Setup

1. In Firebase Console: **Add App > Android**
2. Package Name: `com.kletterwelt.beta`
3. Lade `google-services.json` herunter
4. Platziere es in `android/app/google-services.json`
5. Füge Firebase Plugin zu `android/app/build.gradle` hinzu:

```gradle
// Top of file
apply plugin: 'com.google.gms.google-services'

dependencies {
    // ... existing dependencies
    implementation 'com.google.firebase:firebase-messaging:23.0.0'
}
```

6. Füge zu `android/build.gradle` hinzu:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

### 4. Testen

1. **Push-Token registrieren:**
   - Öffne die App auf einem Android-Gerät
   - Gehe zu Profil > Benachrichtigungen
   - Aktiviere "Push-Benachrichtigungen"
   - Erlaube Berechtigungen
   - Token sollte in `push_tokens` Tabelle erscheinen

2. **Push-Benachrichtigung senden:**
   - Erstelle eine neue Notification (z.B. neuer Boulder)
   - Push sollte automatisch gesendet werden

## 📝 Wichtige Hinweise:

- **FCM Server Key:** Muss als Supabase Secret gesetzt werden
- **Edge Function:** Muss deployed sein, bevor Push-Benachrichtigungen funktionieren
- **Android:** Benötigt `google-services.json` und Firebase Plugin
- **iOS:** Benötigt zusätzliches APNs Setup (nicht implementiert)

## 🐛 Troubleshooting:

- **Keine Push-Benachrichtigungen:**
  - Prüfe ob FCM_SERVER_KEY gesetzt ist: `supabase secrets list`
  - Prüfe Edge Function Logs: `supabase functions logs send-push-notification`
  - Prüfe ob Token in `push_tokens` Tabelle vorhanden ist

- **Token wird nicht registriert:**
  - Prüfe ob Berechtigungen erteilt wurden
  - Prüfe Android Logs für Fehler
  - Prüfe ob `google-services.json` korrekt platziert ist

