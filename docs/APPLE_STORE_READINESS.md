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

Die Angaben wurden nach Speichern und erneutem Aufrufen geprüft. Screenshots liegen in `test-results/apple-store-2026-10-12/`.

## Mitgliedschaft und Erklärungen

Die Apple-Mitgliedschaft zeigt weiterhin **Einzelperson**, Janosch Althoff. Der am 8. Oktober gestellte Organisationsantrag gilt noch nicht als umgesetzt. Ohne erfolgreiche Umstellung darf Moonsight nicht als bestätigter rechtlicher Verkäufer ausgegeben werden. Siehe `APPLE_ORGANIZATION_MIGRATION.md`.

App Store Connect zeigt aktuell den Status **Nicht-Händler** für diese App. Für die kommerziell betriebene Kletterwelt-App muss die korrekte DSA-Einordnung mit dem tatsächlichen Herausgeber geklärt und gegebenenfalls die Händlerverifizierung abgeschlossen werden. Kostenloser Download entscheidet diese Frage nicht allein. Keine Händlererklärung oder neue Vereinbarung in dieser Sitzung akzeptiert.

## Build und technische Verifikation

Build 82 wurde erfolgreich hochgeladen und erscheint in TestFlight mit der internen Gruppe KWS Team (ein Tester). Die Testhinweise sind gespeichert. Eine Installation auf einem Gerät oder die Auswahl als öffentliche Releaseversion ist noch nicht verifiziert.

Capacitor Android, iOS, Core und CLI wurden von 7.4.4 auf exakt 7.6.9 aktualisiert. Damit wird das offizielle Advisory GHSA-rvm3-566m-v7fv berücksichtigt. Commit `1c106a1` liegt auf `codex/hostinger-migration` und wurde gepusht.

- 156 Node-Tests bestanden.
- Hostinger-Webbuild erfolgreich, Version 1.0.230 unverändert.
- Hostinger-API und Passwort-Recovery in den Assets nachgewiesen; keine privaten Schlüsselmarker oder JWT mit `service_role` gefunden. Diese Prüfung ersetzt keine vollständige Sicherheitsabnahme.
- Neue macOS-Pipeline: https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38216753369, erfolgreich abgeschlossen, Buildnummer 82, Backend Hostinger.
- Das heruntergeladene IPA wurde mit `ops/hostinger/verify-android-artifact.ps1 -Platform ios -ArtifactPath` geprüft: 15 Assets, neue API, Video-Endpunkt und Recovery vorhanden; keine der geschützten privaten Zugangsdaten gefunden. Bericht: `output/hostinger-cutover/ios-82/IPA-VERIFIED.json`. Enthaltene SDK-Datenschutzmanifeste ersetzen nicht die vollständige Datenschutzabnahme.

Die vorher begonnenen Android-Änderungen an SDK/Versionsnummer/Analytics bleiben lokal; auf Wunsch des Auftraggebers wird zunächst nur Apple bearbeitet.

## Noch offene Voraussetzungen

1. **Kontolöschung in der App**: Registrierung vorhanden, Löschmöglichkeit im aktuellen Profil fehlt. Auth-Konto, Profil, Uploads, Kommentare und Sicherungskopien müssen in einem zusammenhängenden Löschkonzept behandelt werden. Reine Kontodeaktivierung reicht nicht.
2. **Nutzerinhalte**: Kommentare und Uploads vorhanden. Filter, Meldungen, zeitnahe Moderation, Sperren missbräuchlicher Nutzer und sichtbarer Kontakt müssen umgesetzt und getestet sein. Zuständigkeit und Regeln sind festzulegen.
3. **Datenschutz**: App-spezifische öffentlich erreichbare Erklärung und In-App-Zugriff fehlen; App-Datenschutzformular ist leer. Bestehende Website-Erklärung deckt App-Daten nicht ausreichend ab. Datenschutzauskunft muss dem finalen Artefakt und Serverbetrieb entsprechen.
4. **Screenshots**: In der geprüften iPhone-Gruppe 0 Bildschirmfotos. Echte App-Ansichten für die von Apple verlangten Gerätegrößen erstellen; iPad-Unterstützung ist im Projekt aktiviert und erfordert ebenfalls Prüfung. Optionale Kopfzeile ist kein Ersatz für Screenshots.
5. **Review-Zugang**: Ein dediziertes Testkonto ohne Administratorrechte und ohne Zugang zu fremden privaten Daten vorbereiten. Zugang nur geschützt speichern und gezielt an Apple freigeben; keine Passwörter in Dokumentation oder Logs.
6. **Pflichtformulare**: Altersfreigabe und Inhaltsrechte noch nicht eingerichtet. Review-Kontakt fehlt. Factual declarations erst passend zur fertigen App; keine erfundenen Angaben.
7. **Funktionsabnahme**: Bekannter `Map`-Importkonflikt in `BoulderManagement.tsx` beheben. Registrierung, Anmeldung, Reset, Konto-Löschung, Videos, Komprimierung, Kommentare und Moderation im finalen nativen Build prüfen. iOS-Push ist noch nicht vollständig eingerichtet; nicht als funktionierend bewerben.
8. **Herausgeber**: Moonsight-Organisationsumstellung und zutreffende DSA-Angaben abschließen, bevor mit Moonsight als Store-Herausgeber veröffentlicht wird.

## Datenschutz-Angaben vorbereiten – noch kein veröffentlichtes Label

Ein Mindestalter für eigene Konten ist noch nicht entschieden. Artikel 8 DSGVO ist kein allgemeines Verbot von Konten unter 16: Die dortige Altersgrenze betrifft eine auf Einwilligung gestützte Verarbeitung bei direkt angebotenen Online-Diensten. In diesem Fall ist unter 16 in Deutschland die Einwilligung beziehungsweise Autorisierung durch die Sorgeberechtigten erforderlich. Die tatsächlichen Rechtsgrundlagen und ein geeigneter Ablauf sind vor Umsetzung zu klären. Apples Inhaltsaltersfreigabe ist davon getrennt. Es wurde noch keine Registrierungssperre eingerichtet.

Die folgenden Zuordnungen beruhen auf dem aktuellen Quellcode. Zweck überwiegend App-Funktionalität; Nutzerbezug bleibt bestehen. Optional eingegebene Daten sind nicht automatisch von Apples Deklaration befreit.

| Datenbestand | Apple-Kategorie / Prüfung | Codebeleg |
| --- | --- | --- |
| Vorname, Nachname, E-Mail | Name, E-Mail-Adresse; Nutzerbezug | `src/hooks/useAuth.tsx` |
| Benutzer-ID, Rollen | Benutzer-ID | Auth und nutzerbezogene REST-Abfragen |
| Optionales Geburtsdatum | Weitere Datentypen; Zweck/Notwendigkeit klären | `src/hooks/useAuth.tsx` |
| Avatar, Boulderbilder/-videos | Fotos oder Videos | Profilbearbeitung, Medien-Upload |
| Kommentare, Notizen | Andere Nutzerinhalte | `src/hooks/useBoulderCommunity.tsx` |
| Begehungen, Versuche, Trainingstage | Fitnessdaten und/oder passende Aktivitätskategorie prüfen | `boulder_ticks`, `boulder_tracking_sessions` |
| Bewertungen, Favoriten, Projekte | Andere Nutzerinhalte / Produktinteraktion entsprechend Zweck | Community-Hook |
| Push-Token und Plattform | Geräte-ID bzw. passende Kennung nach endgültiger Implementierung prüfen | Push-Registrierung und `push_tokens` |
| Feedback | Kundensupport; mögliche optionale Ausnahme nur nach Apples vollständigen Kriterien | Feedback-Formulare |
| Serverzugriffe/Diagnosen | IP-Nutzung, Protokollinhalt und Aufbewahrung im Betrieb prüfen | VPS-/Proxy-/Auth-Konfiguration |

Für Hostinger-Builds sind eigene Telemetrie deaktiviert und Sentry-DSN leer. Die SDKs sind weiterhin eingebunden; finalen nativen Build und Datenschutz-Manifeste prüfen. Apple-Auswertungen im Store sind von selbst erhobenen App-Daten zu unterscheiden. Kein appübergreifendes Werbetracking im untersuchten Code nachgewiesen; keine pauschale Zusicherung ohne Prüfung des finalen Artefakts.

## Quellen

- [Apple Review Guidelines](https://developer.apple.com/app-store/review/guidelines/): Funktionsreife, Nutzerinhalte, Zugang und Metadaten.
- [Apple: Kontolöschung in Apps](https://developer.apple.com/support/offering-account-deletion-in-your-app/).
- [Apple: App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/).
- [Capacitor: Security Advisory und korrigierte Version](https://github.com/ionic-team/capacitor/security/advisories/GHSA-rvm3-566m-v7fv).
- [DSGVO, insbesondere Artikel 8](https://eur-lex.europa.eu/legal-content/DE/ALL/?uri=celex%3A32016R0679).
- Live App Store Connect, Apple Developer-Mitgliedschaft und aktueller Quellcode.

## Exakt nächster Schritt

Kontolöschung und Moderation umsetzen und im nativen Build abnehmen. Die Registrierung für Minderjährige nach einer begründeten Produktentscheidung vorbereiten. Parallel muss Apple die beantragte Organisationsumstellung abschließen. Die aktuelle Storeversion bleibt bis dahin in Vorbereitung.
