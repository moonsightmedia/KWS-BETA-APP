# E-Mail-Vorlage für Registrierung anpassen

Die E-Mail-Vorlage für die Registrierung wird in Supabase konfiguriert. Du kannst sie über das Supabase Dashboard anpassen.

## Schritte zur Anpassung:

1. **Öffne das Supabase Dashboard**
   - Gehe zu https://supabase.com/dashboard
   - Wähle dein Projekt aus

2. **Navigiere zu Authentication > Email Templates**
   - Im linken Menü: `Authentication` → `Email Templates`
   - Oder direkt: `https://supabase.com/dashboard/project/[PROJECT_ID]/auth/templates`

3. **Wähle die Vorlage "Confirm signup"**
   - Diese Vorlage wird verwendet, wenn sich ein neuer Benutzer registriert

4. **Passe die Vorlage an**
   - Du kannst HTML verwenden
   - Verfügbare Variablen:
     - `{{ .Email }}` - Die E-Mail-Adresse des Benutzers
     - `{{ .ConfirmationURL }}` - Der Bestätigungslink
     - `{{ .Token }}` - Der Bestätigungstoken (falls benötigt)
     - `{{ .TokenHash }}` - Hash des Tokens (falls benötigt)
     - `{{ .SiteURL }}` - Die URL deiner App
     - `{{ .RedirectTo }}` - Die Redirect-URL nach Bestätigung

5. **Beispiel-Vorlage (bereits vorhanden)**
   - Eine Beispiel-Vorlage findest du in `email-template-confirm-signup.html`
   - Du kannst diese als Basis verwenden

## Aktuelle Vorlage

Die aktuelle Vorlage enthält:
- Header mit Logo/Branding
- Persönliche Begrüßung
- Klarer Call-to-Action Button
- Alternativer Link (falls Button nicht funktioniert)
- Sicherheitshinweise

## Weitere E-Mail-Vorlagen

Du kannst auch andere Vorlagen anpassen:
- **Magic Link** - Für Magic Link Anmeldung
- **Change Email Address** - Für E-Mail-Änderungen
- **Reset Password** - Für Passwort-Zurücksetzung
- **Invite User** - Für Benutzereinladungen (Admin)

## Tipps

- Verwende responsive HTML (funktioniert auf Desktop und Mobile)
- Teste die E-Mail-Vorlage nach Änderungen
- Stelle sicher, dass Links korrekt funktionieren
- Verwende klare, freundliche Sprache
- Füge dein Branding hinzu (Farben, Logo, etc.)

## Beispiel-Anpassungen

### Text ändern:
```html
<p>schön, dass du dabei bist! Um dein Konto zu aktivieren...</p>
```
Kann geändert werden zu:
```html
<p>Willkommen in der Kletterwelt Sauerland Beta App! Bestätige deine E-Mail...</p>
```

### Button-Text ändern:
```html
<a href="{{ .ConfirmationURL }}">E-Mail bestätigen</a>
```
Kann geändert werden zu:
```html
<a href="{{ .ConfirmationURL }}">Konto aktivieren</a>
```

### Farben anpassen:
Die grünen Farben (`#22c55e`, `#16a34a`) können durch deine Brand-Farben ersetzt werden.

