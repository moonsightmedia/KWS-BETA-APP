# E-Mail-Vorlage für die Registrierung anpassen

Die Registrierungs-Mail wird in Supabase gepflegt. Im Repo liegen die Vorlagen als saubere Quelle, damit wir Änderungen versionieren und später leichter wiederverwenden können.

## Welche Datei du in Supabase einfügst

- Für Supabase `Authentication > Email Templates > Confirm signup`:
  - nutze in der Regel `email-template-supabase-body-only.html`
- Die vollständige Vorschau mit `html`, `head` und `body` findest du in:
  - `email-template-confirm-signup.html`

## So passt du die Vorlage an

1. Öffne das Supabase Dashboard.
2. Gehe zu `Authentication` → `Email Templates`.
3. Wähle `Confirm signup`.
4. Ersetze den HTML-Inhalt durch die Vorlage aus `email-template-supabase-body-only.html`.
5. Speichere die Vorlage und teste den Flow mit einer echten Registrierung.

## Verfügbare Variablen

- `{{ .Email }}` – E-Mail-Adresse des Benutzers
- `{{ .ConfirmationURL }}` – Bestätigungslink
- `{{ .Token }}`
- `{{ .TokenHash }}`
- `{{ .SiteURL }}`
- `{{ .RedirectTo }}`

## Was an der aktuellen Vorlage verbessert wurde

- ruhigeres Layout, näher an der App-Sprache
- nur ein aktives Grün: `#36B531`
- robuster CTA-Button ohne Verlauf, damit Mail-Clients den Button zuverlässiger darstellen
- klarere Textführung
- kompaktere Fallback-Link-Box
- konsistente Formulierungen mit echten Umlauten

## Empfohlene Betreffzeile

- `Bitte bestätige deine E-Mail-Adresse`

Oder etwas persönlicher:

- `Willkommen bei Kletterwelt Sauerland Beta – bestätige jetzt dein Konto`

## Hinweise für Tests

- Prüfe die Mail in mindestens einem Desktop- und einem mobilen Client.
- Achte besonders darauf, dass der grüne Button sichtbar ist und nicht als weiße Fläche erscheint.
- Prüfe, ob `{{ .ConfirmationURL }}` korrekt auf eure Live-Domain zurückführt.
- Teste auch den Fallback-Link in der grauen Box.

## Weitere Vorlagen, die wir danach angleichen sollten

- `Reset Password`
- `Magic Link`
- `Change Email Address`

So bleibt die komplette Mail-Kommunikation visuell konsistent.
