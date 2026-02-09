# Supabase E-Mail-Fehler beheben

Wenn du den Fehler "Error sending confirmation email" (HTTP 500) bei der Registrierung erhältst, liegt das Problem auf der Supabase-Seite.

## Mögliche Ursachen

1. **E-Mail-Service nicht konfiguriert**
   - Supabase verwendet standardmäßig einen eingebauten E-Mail-Service
   - Dieser kann in der kostenlosen Version limitiert sein

2. **E-Mail-Vorlage hat ein Problem**
   - Die E-Mail-Vorlage könnte ungültiges HTML enthalten
   - Variablen könnten falsch verwendet werden

3. **Rate Limiting**
   - Zu viele E-Mail-Anfragen in kurzer Zeit
   - Supabase blockiert temporär weitere Anfragen

4. **Supabase-Service-Problem**
   - Temporäres Problem auf Supabase-Seite
   - Server-Überlastung

## Lösungen

### Lösung 1: E-Mail-Konfiguration in Supabase prüfen

1. **Gehe zum Supabase Dashboard**
   - https://supabase.com/dashboard
   - Wähle dein Projekt aus

2. **Prüfe Authentication Settings**
   - Gehe zu: `Authentication` → `Settings`
   - Prüfe die E-Mail-Konfiguration:
     - `Enable email confirmations` sollte aktiviert sein
     - `Site URL` sollte korrekt sein
     - `Redirect URLs` sollte deine Domain enthalten

3. **Prüfe E-Mail-Vorlage**
   - Gehe zu: `Authentication` → `Email Templates`
   - Wähle "Confirm signup"
   - Stelle sicher, dass die Vorlage gültiges HTML enthält
   - Prüfe, ob alle Variablen korrekt verwendet werden:
     - `{{ .Email }}`
     - `{{ .ConfirmationURL }}`
     - `{{ .SiteURL }}`
     - `{{ .RedirectTo }}`

### Lösung 2: E-Mail-Bestätigung temporär deaktivieren (nur für Tests)

**WICHTIG:** Nur für Entwicklung/Testing verwenden, nicht für Production!

1. **Im Supabase Dashboard:**
   - Gehe zu: `Authentication` → `Settings`
   - Deaktiviere: `Enable email confirmations`
   - Speichere die Änderungen

2. **Nach dem Test wieder aktivieren:**
   - Aktiviere: `Enable email confirmations`
   - Speichere die Änderungen

### Lösung 3: Custom E-Mail-Service konfigurieren

Wenn der eingebaute E-Mail-Service Probleme hat, kannst du einen eigenen E-Mail-Service verwenden:

1. **SMTP konfigurieren**
   - Gehe zu: `Authentication` → `Settings` → `SMTP Settings`
   - Konfiguriere deinen SMTP-Server (z.B. SendGrid, Mailgun, etc.)
   - Teste die Konfiguration

2. **Edge Function für E-Mails**
   - Erstelle eine Supabase Edge Function
   - Verwende einen E-Mail-Service wie Resend, SendGrid, etc.
   - Rufe die Function nach der Registrierung auf

### Lösung 4: Fehlerbehandlung verbessern

Die App zeigt jetzt bessere Fehlermeldungen:
- Bei E-Mail-Versandfehler: "Fehler beim Senden der Bestätigungs-E-Mail..."
- Bei ungültiger E-Mail: "Ungültige E-Mail-Adresse..."
- Bei bereits registrierter E-Mail: "Diese E-Mail-Adresse ist bereits registriert..."

## Debugging

### Logs prüfen

1. **Supabase Dashboard Logs**
   - Gehe zu: `Logs` → `Auth Logs`
   - Prüfe die Fehlerdetails

2. **Browser Console**
   - Öffne die Browser-Entwicklertools (F12)
   - Prüfe die Console auf Fehlermeldungen
   - Prüfe das Network-Tab für HTTP-Status-Codes

### Häufige Fehler

- **HTTP 500**: Server-seitiges Problem bei Supabase
- **HTTP 422**: Ungültige Daten (z.B. E-Mail-Format)
- **HTTP 429**: Zu viele Anfragen (Rate Limiting)

## Kontakt

Wenn das Problem weiterhin besteht:
1. Prüfe die Supabase Status-Seite: https://status.supabase.com
2. Kontaktiere den Supabase Support
3. Prüfe die Supabase-Dokumentation: https://supabase.com/docs/guides/auth
