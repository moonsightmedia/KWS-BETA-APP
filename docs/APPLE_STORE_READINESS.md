# Apple App Store – Veröffentlichungsstand

Stand: 13. Oktober 2026. App-ID 6756424260, Bundle-ID `com.kletterwelt.beta`, Version 1.0. Die öffentliche Einreichung ist noch nicht erfolgt.

**Abschlussprüfungen vom 13. Oktober:** Alle sechs Store-Vorschauen vollständig verarbeitet. Routingfehler im Löschoperator korrigiert und echte Backend-Löschprobe gegen Auth, Storage und PostgreSQL bestanden, nur eigene generierte Wegwerf-Konten; 45 bestehende Konten und 2389 Storage-Objekte erhalten. Bestätigung lokal über TLS-SMTP aufgezeichnet, keine externe Zustellung behauptet. Frische verschlüsselte Sicherung tatsächlich restauriert und SHA256-identisch auf dem NAS gesichert; unabhängiger Entschlüsselungsschlüssel in Bitwarden verifiziert. Native Prüfung entdeckte einen tatsächlichen iOS-H.264-Absturz; die ungeeignete Einstellung ist entfernt, die Writer-Konfiguration wird geprüft und die korrigierte Frame-Zählung ergibt 30 fps. Bitratengrenze im großen Videotest weiterhin nicht bestanden: abschließender Lauf `38386196089` aus `e747da9` auf beiden Simulatoren zwei bestanden, ein Fehler. Keine Korrektur als signierter Build ausgeliefert. Ein vorheriger iPad-Gastdurchlauf scheiterte zusätzlich am Laden der Live-Boulder; Ursache offen. Apple-Zugang weiterhin während der Organisationsmigration deaktiviert. Händlerkontakt per E-Mail und SMS bestätigt, Dokumentennachweis noch offen. Details: `docs/qa/2026-10-13-store-final-checks.md`.

**Aktualisierte Herausgeberentscheidung:** Der Auftraggeber hat ausdrücklich entschieden, die erste Store-Version bereits unter Janosch Althoff als Verkäufer zu veröffentlichen. Auf die Anzeige von Moonsight muss für diesen Release nicht gewartet werden. Kletterwelt bleibt App-Betreiber und Impressumsträger. Diese Entscheidung beendet nicht die bereits laufende Apple-Organisationsmigration: Apple zeigt live weiterhin deaktivierte Mitgliedschaftsleistungen. Nach gesonderter Freigabe wurde die Anfrage zur Wiederfreigabe im bestehenden Apple-Supportfall 102994128035 abgesendet und von Apple bestätigt. Keine Migration zurückgezogen; Reaktivierung noch nicht bestätigt. Details: `docs/APPLE_PUBLISHING_ACCESS_REQUEST.md`.

## In App Store Connect gespeichert

- Name unverändert: KWS BETA APP.
- Untertitel: Boulder der Kletterwelt; Primärkategorie Sport.
- Deutsche Beschreibung, Werbetext und Suchbegriffe ausgefüllt. Die Beschreibung nennt Kletterwelt als App-Betreiber und Moonsight Media als digitalen Partner.
- Support: https://www.kletterwelt-sauerland.de/info/kontakt-anfahrt/
- Marketing: https://www.kletterwelt-sauerland.de/
- Copyright: 2026 Boulder- und Kletterwelt GmbH, entsprechend der Betreiberentscheidung des Auftraggebers.
- Kostenloser Download (0,00 EUR), Preisbasis Deutschland.
- Verfügbarkeit ausschließlich Deutschland, vom Auftraggeber ausdrücklich bestätigt. Keine automatische Erweiterung auf neue Länder.
- Öffentliche Verteilung bereits ausgewählt. Zusätzliche Verfügbarkeit auf Apple Silicon Macs und Vision Pro deaktiviert, da diese Plattformen nicht abgenommen sind.
- Altersfreigabe 16+ eingerichtet; Inhaltsrechte vom Auftraggeber bestätigt und bei Apple gespeichert.
- Dedizierter Prüfzugang ohne Mitarbeiterrechte sowie Prüfkontakt gespeichert. Private Kontaktangaben bleiben ausschließlich im freigegebenen Apple-Formular.
- Datenschutz-URL: https://beta.kletterwelt-sauerland.de/privacy. Das vollständige Datenschutzlabel wurde nach ausdrücklicher Freigabe veröffentlicht; dies veröffentlicht nicht die App selbst.
- Build 86 im Entwurf der öffentlichen Version 1.0 ausgewählt und gespeichert. Nachweis: `test-results/apple-store-2026-10-12/build-86-selected.jpg`. Das neue Kletterwelt-Icon ist im Quellcode vorbereitet; dessen Signierung ist während der Apple-Mitgliedschaftsmigration blockiert.
- Veröffentlichung am 12. Oktober auf manuelle Freigabe umgestellt und gespeichert, damit eine spätere Review-Genehmigung nicht automatisch unter dem noch persönlichen Verkäufer veröffentlicht. Die App ist weiterhin nicht eingereicht. Sichtnachweis: `test-results/apple-store-2026-10-12/manual-release-pending-moonsight.png`.

Die Angaben wurden nach Speichern und erneutem Aufrufen geprüft. Screenshots liegen in `test-results/apple-store-2026-10-12/`.

## Mitgliedschaft und Erklärungen

Die Apple-Mitgliedschaft zeigt noch **Einzelperson**, Janosch Althoff, jetzt mit dem ausdrücklichen Hinweis auf die laufende Organisationsmigration. Apple hat die Mitgliedschaftsleistungen dafür vorübergehend deaktiviert. Der am 8. Oktober gestellte Antrag gilt noch nicht als abgeschlossen; kein Termin bestätigt. Ohne erfolgreiche Umstellung darf Moonsight nicht als bestätigter rechtlicher Verkäufer ausgegeben werden. Siehe `APPLE_ORGANIZATION_MIGRATION.md` und Sichtnachweis `test-results/apple-store-2026-10-12/membership-migration-active.jpg`.

Ausgehend vom zuvor gespeicherten **Nicht-Händler**-Status wurde die DSA-Händlerverifizierung am 13. Oktober begonnen. Öffentliche Geschäftskontaktdaten und die bisher nur für Review freigegebene Mobilnummer wurden nach zusätzlicher ausdrücklicher öffentlicher Freigabe eingegeben. E-Mail-Adresse und Telefonnummer erfolgreich per Code bestätigt; Apple wechselte danach zu den Dokumentennachweisen. Dokumentensprache Deutsch ausgewählt. Aktueller Dialog **Nachweis des Namens** verlangt Geschäfts- oder Gerichtsunterlagen mit bestätigtem Namen (PDF, JPEG oder PNG, maximal 10 MB). Keine Dokumente hochgeladen, keine abschließende Händlerverifizierung oder neue Vereinbarung bestätigt. Codewerte und private Telefonnummern werden nicht in Git oder im Vault dokumentiert. Weitere Browsersteuerung und neuer Screenshot anschließend durch die geforderte Aktualisierung der Chrome-Erweiterung blockiert.

## Build und technische Verifikation

Build 86 wurde erfolgreich hochgeladen, von Apple verarbeitet und erscheint in TestFlight mit der internen Gruppe KWS Team (ein Tester). Eine konkrete Prüfliste ist gespeichert; die physische Installation und Abnahme auf dem iPhone sind noch nicht bestätigt. Build 86 ist im Entwurf der öffentlichen Storeversion ausgewählt. Ältere Builds bleiben erhalten. Zwischenbuild 83 wurde wegen eines in der Live-Abnahme gefundenen Auth-Header-Fehlers zurückgezogen und zeigt den Status Abgelaufen.

Live-Webstand `533960035fa08afc88301e952f70e172e53af4f3` enthält Meldungen, persönliche Sperren, Kommentarfreigabe, Moderation, öffentliche rechtliche Seiten, lokal ausgelieferte Schriften und die absichtlich deaktivierte iPhone-Push-Registrierung. Web und Videodienst dieses Stands sind live; 44 Bestandsnutzer, 104 Boulder und 2389 Storage-Objekte erhalten. Hinzu kommt ein synthetischer Apple-Prüfnutzer ohne Mitarbeiterrolle. Sein Login wurde über die öffentliche Produktions-API geprüft.

Build 86 aus `636c4ad` ersetzt im Willkommensdialog den Hinweis auf eine unfertige Beta-Version durch die Erklärung des Boulder-Begriffs. Die vorhandene Struktur bleibt erhalten; die Textänderung wurde an vier Breiten in zwei lokalen QA-Schleifen geprüft. Die signierte [Build-86-Pipeline](https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38252239773) hat erfolgreich zu Apple hochgeladen. IPA: Version 1.0, Build 86, korrekte Bundle-ID, neues Onboarding enthalten; 30 Assets auf geschützte Zugangsdaten geprüft, keine gefunden. Hostinger-API, Video-Endpunkt und Recovery vorhanden. NAS-Kopie unter `Releases/iOS/86` hashgleich: `5538933B7932AC3C1109E9C824689937FB4989FD22074A3DB682284F7819F852`. Apple hat ihn verarbeitet; im öffentlichen Entwurf ausgewählt und gespeichert, interne Gruppe KWS Team zugeordnet, keine Installation bestätigt. Details: `docs/qa/2026-10-12-public-onboarding.md`.

Dabei wurde das noch vorhandene Capacitor-Platzhalter-Icon entdeckt. Der Auftraggeber hat ausdrücklich das bestehende Kletterwelt-Logo per Bildskript gewählt. Commit `b0bdd46` enthält dieses Original unverzerrt auf weißem 1024px-Quadrat ohne Alphakanal, reproduzierbar mit `scripts/ios/generate-app-icon.py`. Lauf `38254807083` wurde durch die Endpunkt-/Recovery-Prüfung vor Signierung gestoppt, weil beim Dispatch der optionale Branch-Input fehlte und dadurch `main` ausgecheckt wurde. Der korrekt mit `branch=codex/hostinger-migration` und `backend=hostinger` gestartete Lauf `38255324161` bestand diese Prüfung, scheiterte aber beim Abruf des Signierungsprofils: Apple findet das Team derzeit nicht, passend zu den live bestätigten vorübergehend deaktivierten Mitgliedschaftsleistungen während der Organisationsmigration. Kein Icon-Build zu Apple hochgeladen; Build 86 bleibt gespeichert. Erst nach wieder aktivem Apple-Zugang erneut bauen/signieren.

- 166 Frontendtests, 26 Videodiensttests und isolierte SQL-Proben einschließlich Spamgrenzen bestanden. Neue Module lint-geprüft; Vite-Produktionsbuild erfolgreich. Der vollständige TypeScript-Check hat weiterhin bekannte Fehler in bestehenden Modulen.
- [Build-85-Pipeline](https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38241918109) erfolgreich. IPA: 30 Assets auf tatsächliche geschützte Zugangsdaten geprüft, keine gefunden. Neue API, Video-Endpunkt und Recovery vorhanden. Elf lokale WOFF2-Schriften, relative Fontpfade und Datenschutzmanifeste nachgewiesen. Keine physische Geräteabnahme damit ersetzt.
- IPA und Prüfberichte mit identischen SHA256-Prüfsummen zusätzlich im Kunden-NAS unter `KWS BETA APP/Releases/iOS/85` gespeichert.
- Verschlüsselte Produktionssätze `20261012T085928Z` und `20261012T104355Z` auf dem Kunden-NAS vollständig hashgeprüft, inklusive Wiederherstellungsnachweisen. Zweiter Satz zuvor auf dem VPS vollständig dateigeprüft und isoliert wiederhergestellt: 4258 Dateien, 2389 Storage-Objekte, 448 Medienreferenzen, 74 Tabellen, 17629 Zeilen, zwei Sequenzen und Vault. NAS-Bericht für den zweiten Satz vom 12. Oktober, 11:48:58 UTC. Regelmäßige unabhängige NAS-Sicherung bleibt separat einzurichten.

Capacitor Android, iOS, Core und CLI wurden von 7.4.4 auf exakt 7.6.9 aktualisiert. Damit wird das offizielle Advisory GHSA-rvm3-566m-v7fv berücksichtigt. Commit `1c106a1` liegt auf `codex/hostinger-migration` und wurde gepusht.

- 162 Node-Tests und neun Python-Tests bestanden.
- Hostinger-Webbuild erfolgreich, Version 1.0.230 unverändert.
- Hostinger-API und Passwort-Recovery in den Assets nachgewiesen; keine privaten Schlüsselmarker oder JWT mit `service_role` gefunden. Diese Prüfung ersetzt keine vollständige Sicherheitsabnahme.
- Neue macOS-Pipeline: https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38216753369, erfolgreich abgeschlossen, Buildnummer 82, Backend Hostinger.
- Das heruntergeladene IPA wurde mit `ops/hostinger/verify-android-artifact.ps1 -Platform ios -ArtifactPath` geprüft: 15 Assets, neue API, Video-Endpunkt und Recovery vorhanden; keine der geschützten privaten Zugangsdaten gefunden. Bericht: `output/hostinger-cutover/ios-82/IPA-VERIFIED.json`. Enthaltene SDK-Datenschutzmanifeste ersetzen nicht die vollständige Datenschutzabnahme.
- Aktueller Build 84: https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38226836397, Quellstand `f37d7bd`, ebenfalls erfolgreich. IPA und neue Konto-Funktionen geprüft; Nachweise in `output/hostinger-cutover/ios-84/`. Web-Release desselben Quellstands live. Neue verschlüsselte Gesamtsicherung inklusive isolierter DB-Wiederherstellung geprüft. Details: `docs/qa/2026-10-12-account-release.md`.

Die vorher begonnenen Android-Änderungen an SDK/Versionsnummer/Analytics bleiben lokal; auf Wunsch des Auftraggebers wird zunächst nur Apple bearbeitet.

## Noch offene Voraussetzungen

1. **Kontolöschung**: Antrag und private Adminwarteschlange implementiert; Marketing bearbeitet innerhalb von sieben Tagen. Echte Backend-Probe am 13. Oktober bestanden, bestehende Personen/Konten erhalten. Native Bedienabnahme und externe Mailzustellung bleiben getrennt unbestätigt. Betriebsablauf: `ops/hostinger/ACCOUNT_DELETION.md`.
2. **Nutzerinhalte**: Meldungen, persönliche Nutzersperren, Vorabfreigabe neuer/bearbeiteter Kommentare und Admin-Moderation implementiert, serverseitig abgesichert und live. Marketing ist zuständig; Ablauf unter `ops/hostinger/COMMUNITY_MODERATION.md`. Abschließende native Geräteabnahme und tägliche tatsächliche Bearbeitung durch Marketing sicherstellen.
3. **Datenschutz**: App-spezifische Erklärung, Impressum und Community-Regeln öffentlich sowie innerhalb der App erreichbar. Apple-Datenschutzlabel mit zehn Datenarten, App-Funktionalität, Nutzerbezug und ohne Tracking veröffentlicht. Bei Änderungen an Verarbeitung oder nativen SDKs erneut prüfen und aktualisieren.
4. **Screenshots**: Je drei originale native Ansichten für iPhone (1206 × 2622) und iPad (2064 × 2752) aus erfolgreichem Lauf `38254354855` erstellt, visuell/per SHA256 geprüft und auf dem NAS gesichert. Am 13. Oktober alle sechs tatsächlichen Apple-Vorschauen vollständig gerendert bestätigt, keine Platzhalter mehr. Nachweise unter `test-results/apple-store-2026-10-13/`.
5. **Review-Zugang**: In Produktion eingerichtet, gewöhnlicher Nutzer, Login öffentlich geprüft und mit ausdrücklicher Freigabe ausschließlich in Apples Prüfformular gespeichert. Bitwarden-Referenz `KWS_APPLE_REVIEW_ACCOUNT`. Keine Zugangsdaten in Dokumentation oder Logs.
6. **Pflichtformulare**: Altersfreigabe, Inhaltsrechte und Review-Kontakt gespeichert; Datenschutzlabel veröffentlicht. Eine endgültige App-Einreichung ist nicht erfolgt.
7. **Funktionsabnahme**: `Map`-Importkonflikt in `BoulderManagement.tsx` behoben und Komponente gerendert geprüft. Registrierung, Anmeldung, Reset, Konto-Löschung, Videos, Komprimierung, Kommentare und Moderation im finalen nativen Build prüfen. Der Auftraggeber hat iPhone-Push auf später verschoben. Die erste Version verwendet In-App-Mitteilungen und registriert auf iOS kein Push-Token; Android-Steuerung bleibt erhalten.
8. **Herausgeber**: Veröffentlichung unter Janosch Althoff ausdrücklich freigegeben. Für die Veröffentlichung muss der Mitgliedschafts-/Signierungszugang wieder aktiv und die DSA-Einordnung für den tatsächlichen Herausgeber geklärt sein. Moonsight wird erst nach bestätigter Umstellung als Verkäufer angegeben.

## Datenschutz-Angaben – veröffentlichtes Label

**Produktentscheidung vom 12. Oktober 2026:** Zum öffentlichen Start sind eigene App-Konten zunächst ab 16 Jahren vorgesehen. Konten für unter 16-Jährige werden als spätere Erweiterung geführt; sie sind keine Voraussetzung für den ersten Release.

Die Registrierung verlangt jetzt ein gültiges Geburtsdatum und prüft die Altersgrenze auch im Auth-Hook auf dem Hostinger-Server. Fehlende/ungültige Daten und unter 16-Jährige werden abgewiesen; exakt 16 am Kalendertag in Deutschland ist zulässig. Drei Kalender-/Zeitzonen-Tests, SQL-Grenzfälle und eine öffentliche Unter-16-Signup-Anfrage geprüft. Es handelt sich um Selbstauskunft, nicht um einen amtlichen Altersnachweis. Bestehende 44 Konten werden aufgrund dieser Entscheidung nicht automatisch gelöscht oder gesperrt. Neue Formularprüfung im Web live und in Build 84 enthalten; Geräteabnahme noch offen.

Artikel 8 DSGVO ist kein allgemeines Verbot von Konten unter 16: Die dortige Altersgrenze betrifft eine auf Einwilligung gestützte Verarbeitung bei direkt angebotenen Online-Diensten. Apples Inhaltsaltersfreigabe ist von der festgelegten Konto-Altersgrenze getrennt.

### Spätere Erweiterung: Konten unter 16

- [ ] Rechtsgrundlagen und altersgerechte Datennutzung prüfen; den erforderlichen Ablauf zur Zustimmung der Sorgeberechtigten festlegen.
- [ ] Elternablauf, verständliche Datenschutzhinweise und geeignete Schutzfunktionen für jüngere Nutzer umsetzen und prüfen.
- [ ] Erst nach Abnahme die Registrierung auf unter 16-Jährige erweitern.

Diese Erweiterung hat noch keine Deadline und wird nach dem ersten Release eingeplant. Die Aufgaben werden im bestehenden Notion-Projekt geführt.

Die folgenden Zuordnungen beruhen auf dem aktuellen Quellcode. Zweck überwiegend App-Funktionalität; Nutzerbezug bleibt bestehen. Optional eingegebene Daten sind nicht automatisch von Apples Deklaration befreit.

| Datenbestand | Apple-Kategorie / Prüfung | Codebeleg |
| --- | --- | --- |
| Vorname, Nachname, E-Mail | Name, E-Mail-Adresse; Nutzerbezug | `src/hooks/useAuth.tsx` |
| Benutzer-ID, Rollen | Benutzer-ID | Auth und nutzerbezogene REST-Abfragen |
| Geburtsdatum bei neuen Konten erforderlich | Weitere Datentypen; Altersprüfung, Nutzerbezug und Aufbewahrung angeben | `src/hooks/useAuth.tsx`, Auth-Hook |
| Avatar, Boulderbilder/-videos | Fotos oder Videos | Profilbearbeitung, Medien-Upload |
| Kommentare, Notizen | Andere Nutzerinhalte | `src/hooks/useBoulderCommunity.tsx` |
| Begehungen, Versuche, Trainingstage | Fitnessdaten und/oder passende Aktivitätskategorie prüfen | `boulder_ticks`, `boulder_tracking_sessions` |
| Bewertungen, Favoriten, Projekte | Andere Nutzerinhalte / Produktinteraktion entsprechend Zweck | Community-Hook |
| Push-Token und Plattform | In Build 85 auf iOS keine Registrierung; Android separat. Bei späterem iPhone-Push Apple-Kategorien neu prüfen | `src/utils/pushNotifications.ts`, `push_tokens` |
| Feedback | Kundensupport; mögliche optionale Ausnahme nur nach Apples vollständigen Kriterien | Feedback-Formulare |
| Serverzugriffe/Diagnosen | IP-Nutzung, Protokollinhalt und Aufbewahrung im Betrieb prüfen | VPS-/Proxy-/Auth-Konfiguration |

Für Hostinger-Builds sind eigene Telemetrie deaktiviert und Sentry-DSN leer. Die SDKs sind weiterhin eingebunden; finalen nativen Build und Datenschutz-Manifeste prüfen. Apple-Auswertungen im Store sind von selbst erhobenen App-Daten zu unterscheiden. Kein appübergreifendes Werbetracking im untersuchten Code nachgewiesen; keine pauschale Zusicherung ohne Prüfung des finalen Artefakts.

In Apple eingerichtet: Name, E-Mail-Adresse, Fitness, Fotos/Videos, Kundendienst, sonstige Benutzerinhalte, Benutzer-ID, Produktinteraktion, sonstige Diagnosedaten und sonstige Daten. Für jede Kategorie App-Funktionalität, mit Nutzeridentität verknüpft, kein Tracking. Die Diagnosen beziehen sich auf freiwillige Fehlerberichte und notwendige Betriebsdiagnosen; keine aktivierte Sentry- oder eigene Nutzungsanalyse. Geburtsdatum fällt unter sonstige Daten, gespeicherte Mitteilungs-Lesestände unter Produktinteraktion. Veröffentlichung der Angaben vom Auftraggeber ausdrücklich bestätigt; Apple zeigt den Veröffentlichungszeitpunkt.

## Quellen

- [Apple Review Guidelines](https://developer.apple.com/app-store/review/guidelines/): Funktionsreife, Nutzerinhalte, Zugang und Metadaten.
- [Apple: Kontolöschung in Apps](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
- [Apple: App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/).
- [Capacitor: Security Advisory und korrigierte Version](https://github.com/ionic-team/capacitor/security/advisories/GHSA-rvm3-566m-v7fv).
- [DSGVO, insbesondere Artikel 8](https://eur-lex.europa.eu/legal-content/DE/ALL/?uri=celex%3A32016R0679).
- Live App Store Connect, Apple Developer-Mitgliedschaft und aktueller Quellcode.

## Exakt nächster Schritt

Der Auftraggeber besitzt weder iPhone noch Mac und hat ausdrücklich entschieden, dass der Routenbauer nichts testen soll. Native Simulatorprüfungen und originale Store-Screenshots liefen deshalb über vorhandene GitHub-Mac-Runner; Anleitung und Grenzen: `docs/APPLE_DEVICE_ACCEPTANCE.md`. Lauf `38254354855` ist auf iPhone und iPad erfolgreich. Originale wurden geprüft, auf dem NAS gesichert und bei Apple hinzugefügt. Als Nächstes mit Apple klären, wie der deaktivierte Mitgliedschaftszugang für die jetzt freigegebene Veröffentlichung unter Janosch Althoff reaktiviert werden kann; die Organisationsmigration nicht ohne eigenen Auftrag zurückziehen. Supportanfrage unter `docs/APPLE_PUBLISHING_ACCESS_REQUEST.md` nach ausdrücklicher Freigabe im bestehenden Fall 102994128035 versendet und bestätigt; Apples Antwort auf die Wiederfreigabe ausstehend. Danach aktiven Zugang, tatsächlichen Verkäufer und zutreffende DSA-Angaben prüfen, Icon-Build mit ausdrücklich gesetzten Inputs `branch=codex/hostinger-migration` und `backend=hostinger` signieren/hochladen, IPA prüfen und verarbeiteten Build auswählen. Alle sechs Vorschauen sind am 13. Oktober vollständig gerendert; echte Backend-Löschprobe bestanden. Die korrigierte native Komprimierung muss erfolgreich geprüft und anschließend gemeinsam mit dem richtigen Icon im neuen signierten Build enthalten sein. Native Bedien-/Hardwarefunktionen bleiben separat unbestätigt. Die Veröffentlichung unter Janosch ist autorisiert; die manuelle Freigabe bleibt bis zur abgeschlossenen Prüfung gesetzt. Konten unter 16 und iPhone-Push folgen später. Die Storeversion ist noch nicht eingereicht.
