# Push Notifications Setup Guide

## Übersicht

Das Benachrichtigungssystem unterstützt sowohl In-App- als auch Push-Benachrichtigungen. Push-Benachrichtigungen erfordern zusätzliche Konfiguration für native Apps (Android/iOS).

## Aktueller Status

- ✅ In-App-Benachrichtigungen: Vollständig implementiert
- ✅ Push-Token-Registrierung: Implementiert für native Apps
- ⚠️ Push-Versand: Basis-Implementierung vorhanden, benötigt Konfiguration

## Push-Notification Versand

### Option 1: Supabase Edge Function (Empfohlen)

1. Erstelle eine Supabase Edge Function `send-push-notification`:

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { tokens, payload } = await req.json()
  
  // Implementiere FCM/APNs Versand hier
  // Verwende Firebase Admin SDK oder OneSignal
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
```

2. Konfiguriere Firebase Cloud Messaging (FCM) für Android
3. Konfiguriere Apple Push Notification Service (APNs) für iOS

### Option 2: Firebase Admin SDK

1. Installiere Firebase Admin SDK in einer Edge Function oder separatem Backend
2. Konfiguriere Firebase-Projekt mit FCM/APNs Credentials
3. Implementiere `sendPushNotification` in `src/services/pushNotifications.ts`

### Option 3: Externer Service (OneSignal, Pusher, etc.)

1. Registriere bei einem Push-Notification-Service
2. Integriere SDK in `src/services/pushNotifications.ts`
3. Aktualisiere Token-Registrierung entsprechend

## Android Setup

### Firebase Cloud Messaging (FCM)

1. Erstelle ein Firebase-Projekt unter https://console.firebase.google.com
2. Füge Android-App zum Projekt hinzu
3. Lade `google-services.json` nach `android/app/`
4. Konfiguriere `android/build.gradle`:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

5. Konfiguriere `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'
```

## iOS Setup

### Apple Push Notification Service (APNs)

1. Erstelle App ID in Apple Developer Portal
2. Aktiviere Push Notifications Capability
3. Generiere APNs Auth Key oder Certificate
4. Konfiguriere `ios/App/App.xcodeproj` mit Push Notifications Capability

## Datenbank-Webhook für Push-Versand

Optional: Erstelle einen Database Webhook, der automatisch Push-Benachrichtigungen sendet:

```sql
-- Beispiel: Webhook-Funktion (muss in Supabase Dashboard konfiguriert werden)
-- Trigger: AFTER INSERT ON notifications
-- Action: Call Edge Function 'send-push-notification'
```

## Testing

1. Teste In-App-Benachrichtigungen: Erstelle eine Test-Benachrichtigung über Admin-Bereich
2. Teste Push-Token-Registrierung: Öffne App auf nativen Gerät, prüfe `push_tokens` Tabelle
3. Teste Push-Versand: Sende Test-Benachrichtigung und prüfe Gerät

## Nächste Schritte

1. Wähle Push-Notification-Service (FCM, OneSignal, etc.)
2. Implementiere Versand-Logik in Edge Function oder Backend
3. Konfiguriere Android/iOS Credentials
4. Teste auf echten Geräten
5. Aktiviere Push-Benachrichtigungen für Benutzer

