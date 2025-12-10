# Push Notifications Setup Guide

## Übersicht

Das Benachrichtigungssystem unterstützt sowohl In-App- als auch Push-Benachrichtigungen. Push-Benachrichtigungen erfordern zusätzliche Konfiguration für native Apps.

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

2. Konfiguriere Firebase Cloud Messaging (FCM) oder Apple Push Notification Service (APNs)

### Option 2: Firebase Admin SDK

1. Installiere Firebase Admin SDK in einer Edge Function oder separatem Backend
2. Konfiguriere Firebase-Projekt mit FCM/APNs Credentials
3. Implementiere `sendPushNotification` in `src/services/pushNotifications.ts`

### Option 3: Externer Service (OneSignal, Pusher, etc.)

1. Registriere bei einem Push-Notification-Service
2. Integriere SDK in `src/services/pushNotifications.ts`
3. Aktualisiere Token-Registrierung entsprechend


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
3. Konfiguriere Credentials für den gewählten Service
4. Teste auf echten Geräten
5. Aktiviere Push-Benachrichtigungen für Benutzer

