# Kontolöschungen – Betrieb

Entscheidung vom 12.10.2026: Marketing bearbeitet Nutzerinhalte und Löschsonderfälle. Ein bestätigter Löschantrag muss spätestens innerhalb von sieben Tagen vollständig erledigt sein. Der Nutzer beantragt die Löschung unter **Profil → Bearbeiten → Konto löschen**, ohne E-Mail oder Supportgespräch als zusätzliche Voraussetzung. Der Antrag ist nach Bestätigung verbindlich; Mehrfachklicks verschieben seine Frist nicht.

## Zuständigkeit und tägliche Bearbeitung

Marketing prüft täglich **Admin → Benutzer → Kontolöschungen**. Dort stehen offene Vorgänge und die genaue Frist; überfällige Vorgänge erscheinen rot. Die Queue aktualisiert sich minütlich, solange der Bereich offen ist. Zugriff nur mit bestehenden App-Adminrechten. Es wurde kein zusätzliches Administratorkonto angelegt und keine Berechtigung erweitert.

Marketing koordiniert Sonderfälle mit dem technischen Administrator. Die eigentliche Entfernung führt dieser über die geschützte Hostinger-Konsole aus. Es gibt bewusst keinen allgemeinen Löschknopf mit Serverberechtigung im App-Bundle. Zu diesem Implementierungsstand wurden keine echten Konten gelöscht und keine Löschbestätigung an echte Personen verschickt.

## Technischer Ablauf pro Vorgang

1. Die **vollständige Vorgangs-ID** aus der Queue übernehmen. Nur vorhandene, vom angemeldeten Kontoinhaber bestätigte Anträge können verarbeitet werden. Ein beliebiger Benutzername oder eine fremde E-Mail ist kein Löschauftrag.
2. Als root auf `srv2044594` einen Prüfplan erstellen:

   ```sh
   python3 /opt/kws/release-readiness/account-deletion.py --request VORGANGS_UUID
   ```

   Standardmäßig werden weder Daten entfernt noch Mails gesendet. Die Ausgabe enthält Mengen, Blocker und einen Plan-Hash. Personenbezogene Angaben und konkrete Pfade liegen ausschließlich in der geschützten Datei `/var/lib/kws-account-deletion/VORGANGS_UUID.plan.json`. Diese Datei nicht in Tickets, Chat oder den Vault kopieren.
3. Jeden Blocker bearbeiten, bevor die Frist abläuft: aktive Videojobs abschließen; gemeinsame Hallenmedien in den Hallendatensätzen entfernen oder ihre rechtmäßige betriebliche Zuordnung klären; geschäftliche Kunden-/Projekt-/Aufgabendaten von persönlichem Konto trennen; fehlende Eigentumsnachweise für alte Dateien gezielt prüfen. Nicht pauschal alle Dateien eines Ordners entfernen. Dateien ohne nachvollziehbare Zuordnung werden nicht automatisch gelöscht. Der letzte Administrator benötigt einen gesondert autorisierten Nachfolger.
4. Für die eigentliche Bearbeitung den Videodienst kurz stoppen, damit sein Auth-Cache und Uploadjobs keine neuen Dateien für das Konto erzeugen. Anschließend einen **frischen** Plan erstellen und prüfen:

   ```sh
   docker stop kws-video-production
   python3 /opt/kws/release-readiness/account-deletion.py --request VORGANGS_UUID
   ```

   Der Stopp unterbricht kurz Videozugriff/-Uploads für alle Nutzer. Er gehört in ein angekündigtes Wartungsfenster. Die Web-App und Datenbank laufen weiter.
5. Nur bei null Blockern den Hash des gerade geprüften Plans übergeben:

   ```sh
   python3 /opt/kws/release-readiness/account-deletion.py --request VORGANGS_UUID --execute --confirmed-plan-sha256 GEPRUEFTER_HASH
   docker start kws-video-production
   ```

   Den Videodienst **auch nach einem Fehler** wieder starten. Der Prozess sperrt neue Anmeldungen des betroffenen Kontos, entfernt eindeutig zugeordnete Storage-Dateien über die Storage-API sowie persönliche Video-/Temporärdateien. Danach entfernt er Feedback, Upload-/Telemetrie-/Operationsdaten und das Auth-Konto. FK-Kaskaden entfernen Profil, Rollen, Aktivitäten, Kommentare, Bewertungen, Push-Token und andere personenbezogene Kontodatensätze. Storage-RLS verhindert neue Dateien durch ein noch nicht abgelaufenes JWT eines bereits gelöschten Kontos.
6. Die Vollzugsmeldung lautet `ACCOUNT_ERASED_AND_CONFIRMATION_ACCEPTED_BY_SMTP`. Eine Bestätigung wird an die bisherige Konto-E-Mail verschickt, mit Antworten an `marketing@kletterwelt-sauerland.de`. SMTP-Annahme ist kein Nachweis der Posteingangszustellung. Bei Mailfehler bleibt eine geschützte `.notice.json`; denselben Vorgang mit `--execute` erneut aufrufen, um ausschließlich die Bestätigung erneut zu versuchen. Ein vollzogener Datenbank-Löschvorgang wird nicht wiederholt. Ein Status `processing` bedeutet ausdrücklich noch keinen erfolgreichen Abschluss.

Der Hash verhindert die Ausführung eines zwischenzeitlich geänderten Plans. Zugriffsrechte für die endgültige SQL-Löschung sind für `anon`, `authenticated` und `service_role` entzogen. UI-Admins können die Queue lesen, aber diesen Ablauf nicht durch eine frei gewählte Client-ID auslösen.

## Sicherungen und Wiederherstellung

Vor der ersten irreversiblen Aktion schreibt der Ablauf einen minimalen Löschvermerk (`.tombstone.json`: Vorgangs-ID, Konto-ID, Datum), ohne Namen, Passwort oder E-Mail. Die aktualisierte verschlüsselte Gesamtsicherung nimmt diese Vermerke und noch ausstehende Mailbestätigungen auf. Ein bereits bestehendes Archiv wird nicht nachträglich als bereinigt ausgegeben.

**Ein älteres Backup darf erst wieder öffentlich verwendet werden, nachdem alle seit seinem Zeitpunkt beantragten/vollzogenen Löschungen auf Datenbank und wiederhergestellte Dateien angewendet und geprüft wurden.** Aktuelle Löschvermerke vor dem Restore unabhängig sichern; die Fassung im alten Archiv allein reicht nicht. Auch das alte Supabase-Cloudprojekt und alte Migrationsexporte enthalten Datenstände vor der Löschung: gesperrt halten und in den Ablauf zur Aufbewahrung/Stilllegung aufnehmen. Keine Wiederveröffentlichung daraus ohne Löschabgleich.

Unabhängige tägliche Offsite-Sicherung und der vollständige Restore mit Löschabgleich bleiben eigene offene Betriebsprüfungen. Die Datenschutzbeschreibung muss die tatsächliche Archivaufbewahrung nennen. Keine Zusage einer sofortigen physikalischen Entfernung aus sämtlichen älteren verschlüsselten Sicherungen.

## Bisherige Prüfung

- Private Queue/RPC, Frist, Idempotenz, fremde Zugriffe, direkte Clientänderungen, Berechtigung zur endgültigen Löschung und gelöschte JWT-Identität im tatsächlichen PostgreSQL geprüft.
- Storage-Sperre und synthetische Kontolöschung mit FK-Kaskaden in einer zurückgerollten Transaktion geprüft; bestehende 44 Konten und 2.389 Storage-Dateien erhalten.
- Operatorablauf mit synthetischen SQL/API/SMTP-Adaptern geprüft: Standard-Prüflauf ohne Löschung, nur eigene Dateien entfernen, fremde Datei erhalten, Hash-/Business-/Legacy-/Upload-Blocker, Bestätigung erst nach Vollzug und SMTP-Wiederholung ohne erneute Löschung.
- Profil und Queue in isolierter Browserprüfung bei 375/768/1280/1920 px geprüft, einschließlich Abbruch, Antrag, sichtbarer Frist und Fehlerzuständen.
- Noch offen vor endgültiger Storeabnahme: vollständige Geräteprüfung sowie eine echte Ende-zu-Ende-Probe mit einem eigens freigegebenen Wegwerf-Testkonto und Bestätigungsempfänger; keine Löschung bestehender Tester zu Prüfzwecken.

Apple erlaubt einen manuellen Abschluss innerhalb einer angemessenen, angekündigten Zeit und verlangt die Möglichkeit, die Löschung in der App anzustoßen: [Apple, Account deletion](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion).
