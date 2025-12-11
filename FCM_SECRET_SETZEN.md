# FCM Service Account JSON als Supabase Secret setzen

## Voraussetzungen

1. **Bei Supabase eingeloggt sein:**
   ```bash
   npx supabase login
   ```

2. **Projekt verlinken:**
   ```bash
   npx supabase link --project-ref <dein-project-ref>
   ```
   Den Project Ref findest du in deinem Supabase Dashboard unter Settings > General > Reference ID

## Secret setzen

### Option 1: Mit PowerShell (Empfohlen)

```powershell
$json = Get-Content "android/app/kws-beta-app-3ddf3b22c180.json" -Raw
npx supabase secrets set FCM_SERVICE_ACCOUNT_JSON=$json
```

### Option 2: Über Supabase Dashboard (Web)

1. Gehe zu: https://supabase.com/dashboard
2. Wähle dein Projekt aus
3. Gehe zu: **Settings** → **Edge Functions** → **Secrets**
4. Klicke auf **"Add new secret"**
5. Name: `FCM_SERVICE_ACCOUNT_JSON`
6. Value: Kopiere den **GESAMTEN Inhalt** der JSON-Datei
7. Klicke auf **"Save"**

## Prüfen ob Secret gesetzt wurde

```bash
npx supabase secrets list
```

Du solltest `FCM_SERVICE_ACCOUNT_JSON` in der Liste sehen.

## Nach dem Setzen

```bash
# Edge Function deployen
npx supabase functions deploy send-push-notification

# Android-Projekt neu bauen
cd android
.\gradlew.bat clean assembleDebug
```

## Troubleshooting

**Problem:** "Not logged in"
- Lösung: `npx supabase login`

**Problem:** "Project not linked"
- Lösung: `npx supabase link --project-ref <dein-project-ref>`

**Problem:** "Secret too long"
- Lösung: Verwende die Web-Oberfläche (Option 2)

