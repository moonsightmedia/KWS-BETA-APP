# Apple App Store – Veröffentlichungsstand

Stand: 12. Oktober 2026. App-ID 6756424260, Bundle-ID `com.kletterwelt.beta`, Version 1.0. Die öffentliche Einreichung ist noch nicht erfolgt.

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
- Build 85 im Entwurf der öffentlichen Version 1.0 ausgewählt und gespeichert.

Die Angaben wurden nach Speichern und erneutem Aufrufen geprüft. Screenshots liegen in `test-results/apple-store-2026-10-12/`.

## Mitgliedschaft und Erklärungen

Die Apple-Mitgliedschaft zeigt weiterhin **Einzelperson**, Janosch Althoff. Der am 8. Oktober gestellte Organisationsantrag gilt noch nicht als umgesetzt. Ohne erfolgreiche Umstellung darf Moonsight nicht als bestätigter rechtlicher Verkäufer ausgegeben werden. Siehe `APPLE_ORGANIZATION_MIGRATION.md`.

App Store Connect zeigt aktuell den Status **Nicht-Händler** für diese App. Für die kommerziell betriebene Kletterwelt-App muss die korrekte DSA-Einordnung mit dem tatsächlichen Herausgeber geklärt und gegebenenfalls die Händlerverifizierung abgeschlossen werden. Kostenloser Download entscheidet diese Frage nicht allein. Keine Händlererklärung oder neue Vereinbarung in dieser Sitzung akzeptiert.

## Build und technische Verifikation

Build 85 wurde erfolgreich hochgeladen, von Apple verarbeitet und erscheint in TestFlight mit der internen Gruppe KWS Team (ein Tester). Eine konkrete Prüfliste ist gespeichert; die Installation und Abnahme auf dem iPhone sind noch nicht bestätigt. Build 85 ist im Entwurf der öffentlichen Storeversion ausgewählt. Build 84 bleibt erhalten. Zwischenbuild 83 wurde wegen eines in der Live-Abnahme gefundenen Auth-Header-Fehlers zurückgezogen und zeigt den Status Abgelaufen.

Aktueller Quellstand `533960035fa08afc88301e952f70e172e53af4f3` enthält Meldungen, persönliche Sperren, Kommentarfreigabe, Moderation, öffentliche rechtliche Seiten, lokal ausgelieferte Schriften und die absichtlich deaktivierte iPhone-Push-Registrierung. Web und Videodienst dieses Stands sind live; 44 Bestandsnutzer, 104 Boulder und 2389 Storage-Objekte erhalten. Hinzu kommt ein synthetischer Apple-Prüfnutzer ohne Mitarbeiterrolle. Sein Login wurde über die öffentliche Produktions-API geprüft.

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

1. **Kontolöschung**: Antrag im Profil und private Adminwarteschlange implementiert. Marketing übernimmt die Bearbeitung spätestens innerhalb von sieben Tagen. Geschützter Operatorablauf für Dateien, DB und Bestätigung ergänzt; Rollen-/FK-Probe zurückgerollt, keine echten Konten entfernt. Vollständige Geräte-/Ende-zu-Ende-Abnahme noch offen. Betriebsablauf: `ops/hostinger/ACCOUNT_DELETION.md`.
2. **Nutzerinhalte**: Meldungen, persönliche Nutzersperren, Vorabfreigabe neuer/bearbeiteter Kommentare und Admin-Moderation implementiert, serverseitig abgesichert und live. Marketing ist zuständig; Ablauf unter `ops/hostinger/COMMUNITY_MODERATION.md`. Abschließende native Geräteabnahme und tägliche tatsächliche Bearbeitung durch Marketing sicherstellen.
3. **Datenschutz**: App-spezifische Erklärung, Impressum und Community-Regeln öffentlich sowie innerhalb der App erreichbar. Apple-Datenschutzlabel mit zehn Datenarten, App-Funktionalität, Nutzerbezug und ohne Tracking veröffentlicht. Bei Änderungen an Verarbeitung oder nativen SDKs erneut prüfen und aktualisieren.
4. **Screenshots**: In der geprüften iPhone-Gruppe 0 Bildschirmfotos. Echte App-Ansichten für die von Apple verlangten Gerätegrößen erstellen; iPad-Unterstützung ist im Projekt aktiviert und erfordert ebenfalls Prüfung. Optionale Kopfzeile ist kein Ersatz für Screenshots.
5. **Review-Zugang**: In Produktion eingerichtet, gewöhnlicher Nutzer, Login öffentlich geprüft und mit ausdrücklicher Freigabe ausschließlich in Apples Prüfformular gespeichert. Bitwarden-Referenz `KWS_APPLE_REVIEW_ACCOUNT`. Keine Zugangsdaten in Dokumentation oder Logs.
6. **Pflichtformulare**: Altersfreigabe, Inhaltsrechte und Review-Kontakt gespeichert; Datenschutzlabel veröffentlicht. Eine endgültige App-Einreichung ist nicht erfolgt.
7. **Funktionsabnahme**: `Map`-Importkonflikt in `BoulderManagement.tsx` behoben und Komponente gerendert geprüft. Registrierung, Anmeldung, Reset, Konto-Löschung, Videos, Komprimierung, Kommentare und Moderation im finalen nativen Build prüfen. Der Auftraggeber hat iPhone-Push auf später verschoben. Die erste Version verwendet In-App-Mitteilungen und registriert auf iOS kein Push-Token; Android-Steuerung bleibt erhalten.
8. **Herausgeber**: Moonsight-Organisationsumstellung und zutreffende DSA-Angaben abschließen, bevor mit Moonsight als Store-Herausgeber veröffentlicht wird.

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

Der Routenbauer muss Build 85 über TestFlight aktualisieren und die gespeicherte Prüfliste auf dem iPhone abarbeiten; echte native Store-Screenshots bereitstellen. Anleitung: `docs/APPLE_DEVICE_ACCEPTANCE.md`. Vollständige Kontolöschprobe mit separat freigegebenem Wegwerf-Testkonto und Bestätigungsempfänger abschließen. Parallel Apples Organisationsumstellung und zutreffende öffentliche DSA-Kontaktdaten verifizieren. Konten unter 16 und iPhone-Push folgen später. Die Storeversion bleibt in Vorbereitung.
