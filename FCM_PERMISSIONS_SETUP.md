# Firebase Cloud Messaging - Berechtigungen einrichten

## Problem
Der Service Account hat nicht die richtigen Berechtigungen für FCM V1 API:
```
Permission 'cloudmessaging.messages.create' denied
```

## Lösung

### Schritt 1: Google Cloud Console öffnen
1. Öffne: https://console.cloud.google.com/
2. Wähle das Projekt: **kws-beta-app**

### Schritt 2: Service Account finden
1. Gehe zu **IAM & Admin** > **Service Accounts**
2. Suche nach: `com-kletterwelt-beta@kws-beta-app.iam.gserviceaccount.com`

### Schritt 3: Berechtigungen hinzufügen
1. Klicke auf den Service Account
2. Gehe zum Tab **"PERMISSIONS"** oder **"BEREchtigungen"**
3. Klicke auf **"GRANT ACCESS"** oder **"Zugriff gewähren"**
4. Füge folgende Rolle hinzu:
   - **Firebase Cloud Messaging API Service Agent**
   - ODER: **Firebase Cloud Messaging Admin**

### Schritt 4: Alternative - Firebase Console
1. Öffne: https://console.firebase.google.com/
2. Wähle das Projekt: **kws-beta-app**
3. Gehe zu **Project Settings** > **Service Accounts**
4. Stelle sicher, dass der Service Account die richtigen Berechtigungen hat

### Schritt 5: Testen
Nach dem Setzen der Berechtigungen:
1. Warte 1-2 Minuten (Berechtigungen müssen propagiert werden)
2. Klicke den Test-Button erneut
3. Die Push-Benachrichtigung sollte jetzt am Handy ankommen!

## Wichtige Rollen für FCM
- `roles/firebasemessaging.admin` - Vollzugriff auf Firebase Cloud Messaging
- `roles/firebasemessaging.serviceAgent` - Service Agent für FCM API

## Troubleshooting
Falls die Berechtigungen nicht sofort wirken:
- Warte 2-5 Minuten
- Prüfe die IAM-Berechtigungen erneut
- Stelle sicher, dass das richtige Projekt ausgewählt ist

