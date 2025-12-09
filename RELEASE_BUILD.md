# Release Build für Play Store

## Unterschied: Debug vs. Release

### Debug APK (aktuell)
- ✅ Zum Testen auf Geräten
- ❌ Nicht für Play Store
- ❌ Nicht signiert
- ❌ Nicht optimiert

### Release AAB (für Play Store)
- ✅ Für Play Store
- ✅ Signiert mit Keystore
- ✅ Optimiert (kleiner, schneller)
- ✅ Production-ready

## Schritt 1: Keystore erstellen

Ein Keystore ist ein Signing-Key, der Ihre App signiert. **WICHTIG**: Bewahren Sie diesen sicher auf!

```powershell
keytool -genkey -v -keystore kws-beta-release.keystore -alias kws-beta -keyalg RSA -keysize 2048 -validity 10000
```

Sie werden gefragt nach:
- Passwort (merken Sie sich das!)
- Name, Organisation, etc.

**WICHTIG**: 
- Keystore sicher aufbewahren!
- Passwort nicht vergessen!
- Ohne Keystore können Sie keine Updates veröffentlichen!

## Schritt 2: Keystore konfigurieren

Erstellen Sie `android/keystore.properties`:

```properties
storeFile=../kws-beta-release.keystore
storePassword=IHRE_PASSWORT
keyAlias=kws-beta
keyPassword=IHRE_PASSWORT
```

**WICHTIG**: Fügen Sie `keystore.properties` zu `.gitignore` hinzu!

## Schritt 3: build.gradle anpassen

Die Datei `android/app/build.gradle` muss angepasst werden, um den Keystore zu verwenden.

Ich kann das für Sie machen, wenn Sie möchten.

## Schritt 4: Release AAB erstellen

```powershell
npm run cap:build:android:release
```

Das erstellt ein AAB in:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Schritt 5: AAB hochladen

1. Google Play Console öffnen
2. App erstellen oder öffnen
3. "Production" → "Create new release"
4. AAB hochladen
5. Zur Überprüfung einreichen

## Alternative: Release APK (nicht empfohlen)

Falls Sie ein APK statt AAB wollen:

```powershell
cd android
.\gradlew.bat assembleRelease
```

APK liegt in: `android/app/build/outputs/apk/release/app-release.apk`

**Aber**: Play Store bevorzugt AAB (kleinere Dateigröße, bessere Optimierung).

## Wichtige Hinweise

- **Keystore sicher aufbewahren**: Ohne ihn können Sie keine Updates veröffentlichen!
- **Passwort nicht vergessen**: Ohne Passwort ist der Keystore nutzlos
- **Backup erstellen**: Kopieren Sie den Keystore an einen sicheren Ort
- **Nicht in Git**: Keystore und Passwort niemals ins Repository committen!



