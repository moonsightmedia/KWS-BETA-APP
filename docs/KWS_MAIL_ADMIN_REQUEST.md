# App-Mail: Anforderung an die Mailadministration

Beschlossen am 8. Oktober 2026:

- Absender: **Kletterwelt Sauerland <app@kletterwelt-sauerland.de>**.
- Eingehende Antworten an diese Adresse sollen bei **marketing@kletterwelt-sauerland.de** ankommen, etwa über einen Alias am bestehenden Marketing-Postfach.
- Zweck: ausschließlich App-Kontobestätigung und Passwort-Zurücksetzen. Keine Marketingaussendungen.

Bitte für die neue App klären/bereitstellen:

1. Existiert `app@` bereits im tatsächlichen Maildienst? Falls nicht, Empfang/Alias auf `marketing@` einrichten. Die Domain empfängt laut MX über Microsoft 365; ein zusätzliches All-Inkl-Postfach allein würde dort keinen Alias anlegen.
2. Einen mit self-hosted Supabase Auth kompatiblen Versandweg bereitstellen: eigener SMTP-Zugang mit TLS oder abgestimmte OAuth/API-Anbindung über einen Send-Email-Hook. Für SMTP brauchen wir Host, Port, TLS-Modus, Benutzername und erlaubte Absenderadresse; das Geheimnis ausschließlich in Bitwarden hinterlegen. Kein persönliches Marketing-Passwort im Chat senden. Eine OAuth/API-Anbindung erfordert zusätzliche Implementierung und eigene Abnahme.
3. SPF/DKIM für den tatsächlich verwendeten Versanddienst prüfen; vorhandenen MX und bestehende Mailzustellung erhalten. Reply-To `marketing@` verwenden, soweit der Versandweg dies unterstützt; der Alias sichert zusätzlich Antworten an die sichtbare Absenderadresse ab.
4. Kontrollierten Zustelltest an eine vereinbarte Testadresse ermöglichen: Bestätigung und Reset, korrekte HTTPS-Zieladresse, Absender, Antwortweg und Spam-Einstufung prüfen. Keine Tests an bestehende App-Nutzer.

Die zuständige Mailadministration liegt bei einer anderen Person. Diese Anforderung wurde vorbereitet, **nicht versendet**. Noch kein Mailkonto/Alias/Versandzugang eingerichtet und kein SMTP-Test durchgeführt.

Live-Befund: KAS enthält alte Kletterwelt-Postfächer und warnt, dass lokale Zustellung die externe Microsoft-365-Zustellung übergehen kann. Diese Konten bleiben unverändert; deren weitere Behandlung ist eine getrennte Mailadministrationsaufgabe.

Technische Referenzen: [Supabase Auth-Konfiguration](https://supabase.com/docs/guides/self-hosting/auth/config), [Send-Email-Hook](https://supabase.com/docs/guides/self-hosting/self-hosted-auth-hooks), [Microsoft SMTP AUTH](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission).
