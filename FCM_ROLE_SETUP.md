# Firebase Cloud Messaging - Rolle hinzufügen

## Schritt-für-Schritt Anleitung

### 1. Im Dialog "Bearbeitungszugriff auf „KWS BETA APP""
- Du siehst bereits den Service Account: `com-kletterwelt-beta@kws-beta-app.iam.gserviceaccount.com`
- Klicke auf **"+ Rolle hinzufügen"**

### 2. Rolle suchen
Im Suchfeld eingeben:
- `Firebase Cloud Messaging API Service Agent`
- ODER: `firebasemessaging.serviceAgent`
- ODER: `Firebase Cloud Messaging Admin`
- ODER: `firebasemessaging.admin`

### 3. Falls die Rolle nicht erscheint
Die Firebase Cloud Messaging API muss aktiviert sein:

1. Gehe zu: **APIs & Services** > **Library**
2. Suche nach: `Firebase Cloud Messaging API`
3. Klicke auf **"Enable"** oder **"Aktivieren"**
4. Warte bis die API aktiviert ist
5. Gehe zurück zum Service Account Dialog
6. Versuche erneut, die Rolle hinzuzufügen

### 4. Rolle auswählen
- Wähle eine der folgenden Rollen:
  - **Firebase Cloud Messaging API Service Agent** (empfohlen)
  - **Firebase Cloud Messaging Admin** (mehr Berechtigungen)

### 5. Speichern
- Klicke auf **"Speichern"**
- Warte 1-2 Minuten, bis die Berechtigungen propagiert sind

### 6. Testen
- Klicke den Test-Button in der App erneut
- Die Push-Benachrichtigung sollte jetzt am Handy ankommen!

## Alternative: Über Firebase Console
1. Öffne: https://console.firebase.google.com/
2. Wähle Projekt: **kws-beta-app**
3. Gehe zu: **Project Settings** > **Service Accounts**
4. Stelle sicher, dass der Service Account die richtigen Berechtigungen hat

