# Firebase Cloud Messaging (FCM) Setup - Schritt für Schritt

## Übersicht

Diese Anleitung zeigt dir, wie du Firebase Cloud Messaging für Push-Benachrichtigungen einrichtest.

## Schritt 1: Firebase-Projekt erstellen

1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Klicke auf **"Projekt hinzufügen"** oder **"Add project"**
3. Gib einen Projektnamen ein (z.B. "KWS Beta App")
4. Optional: Google Analytics aktivieren/deaktivieren
5. Klicke auf **"Projekt erstellen"**

## Schritt 2: Android-App zu Firebase hinzufügen

1. Im Firebase Dashboard: Klicke auf das **Android-Symbol** (oder "Add app" > Android)
2. **Paketname eingeben:** `com.kletterwelt.beta`
   - ⚠️ **WICHTIG:** Dieser muss genau mit deinem `appId` in `capacitor.config.ts` übereinstimmen!
3. **App-Nickname:** (optional) z.B. "KWS Beta Android"
4. **Debug-Signing-Zertifikat-SHA-1:** (optional, für später)
5. Klicke auf **"App registrieren"**

## Schritt 3: google-services.json herunterladen

1. Nach der Registrierung wird `google-services.json` angeboten
2. **Lade die Datei herunter**
3. **Platziere sie hier:** `android/app/google-services.json`
   - ⚠️ **WICHTIG:** Muss genau in diesem Ordner sein!

## Schritt 4: Android-Projekt konfigurieren

### 4.1: android/build.gradle (Projekt-Level)

Öffne `android/build.gradle` und füge die Google Services Klasse hinzu:

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
        classpath 'com.google.gms:google-services:4.4.0'  // ← Diese Zeile hinzufügen
    }
}
```

### 4.2: android/app/build.gradle (App-Level)

Öffne `android/app/build.gradle` und füge am **Anfang der Datei** hinzu:

```gradle
// Top of file (ganz oben!)
apply plugin: 'com.google.gms.google-services'
```

Und in den `dependencies` Block:

```gradle
dependencies {
    // ... existing dependencies ...
    
    // Firebase Cloud Messaging
    implementation 'com.google.firebase:firebase-messaging:23.4.0'
    implementation 'com.google.firebase:firebase-analytics:21.5.0'
}
```

## Schritt 5: FCM Server Key holen

1. Im Firebase Dashboard: Gehe zu **⚙️ Projekt-Einstellungen** (oben links)
2. Gehe zum Tab **"Cloud Messaging"**
3. Unter **"Cloud Messaging API (Legacy)"** findest du den **"Server-Schlüssel"**
4. **Kopiere diesen Schlüssel** - du brauchst ihn gleich!

## Schritt 6: Supabase Edge Function konfigurieren

### 6.1: Supabase CLI installieren (falls noch nicht installiert)

```bash
npm install -g supabase
```

### 6.2: Bei Supabase einloggen

```bash
supabase login
```

### 6.3: Projekt verlinken

```bash
supabase link --project-ref <dein-project-ref>
```

Den Project Ref findest du in deinem Supabase Dashboard unter Settings > General > Reference ID

### 6.4: FCM Server Key als Secret setzen

```bash
supabase secrets set FCM_SERVER_KEY=<dein-fcm-server-key>
```

Ersetze `<dein-fcm-server-key>` mit dem Server Key aus Schritt 5.

### 6.5: Edge Function deployen

```bash
supabase functions deploy send-push-notification
```

## Schritt 7: Android-Projekt neu bauen

Nach allen Änderungen musst du das Android-Projekt neu bauen:

```bash
cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
cd ..
```

## Schritt 8: Testen

1. **APK installieren** auf einem Android-Gerät
2. **App öffnen** und einloggen
3. **Profil öffnen** > Benachrichtigungen
4. **"Push-Benachrichtigungen" aktivieren**
5. **Berechtigung erlauben** (Android fragt nach)
6. **Token sollte registriert werden** - prüfe in Supabase Dashboard:
   - Gehe zu Table Editor > `push_tokens`
   - Du solltest einen Eintrag mit deinem Token sehen

7. **Test-Benachrichtigung senden:**
   - Erstelle einen neuen Boulder (als Setter/Admin)
   - Oder erstelle eine Admin-Benachrichtigung
   - Push-Benachrichtigung sollte auf dem Gerät ankommen!

## Troubleshooting

### Problem: "google-services.json not found"
**Lösung:** Stelle sicher, dass die Datei in `android/app/google-services.json` liegt (nicht `android/google-services.json`!)

### Problem: "Plugin with id 'com.google.gms.google-services' not found"
**Lösung:** Stelle sicher, dass die `classpath` in `android/build.gradle` hinzugefügt wurde

### Problem: "FCM_SERVER_KEY not set"
**Lösung:** Prüfe mit `supabase secrets list` ob der Key gesetzt ist

### Problem: Push-Benachrichtigungen kommen nicht an
**Lösung:**
1. Prüfe Edge Function Logs: `supabase functions logs send-push-notification`
2. Prüfe ob Token in `push_tokens` Tabelle vorhanden ist
3. Prüfe ob `push_enabled` in `notification_preferences` auf `true` steht

### Problem: App crasht beim Start
**Lösung:** 
1. Prüfe ob `google-services.json` korrekt platziert ist
2. Prüfe ob alle Gradle-Dependencies korrekt sind
3. Clean Build: `.\gradlew.bat clean`

## Nächste Schritte

Nach erfolgreichem Setup:
- ✅ Push-Benachrichtigungen sollten automatisch funktionieren
- ✅ Neue Notifications werden automatisch als Push gesendet
- ✅ Funktioniert auch wenn App geschlossen ist

## Wichtige Dateien

- `android/app/google-services.json` - Firebase-Konfiguration
- `android/build.gradle` - Google Services Plugin
- `android/app/build.gradle` - Firebase Dependencies
- `supabase/functions/send-push-notification/index.ts` - Edge Function
- `src/utils/pushNotifications.ts` - Frontend Push-Logik

