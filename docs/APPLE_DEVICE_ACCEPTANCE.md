# Apple Build 86 – Abnahmestand und spätere Geräteprüfung

## Aktualisierter Auftrag vom 12. Oktober 2026

Der Auftraggeber hat weder iPhone noch Mac und möchte den Routenbauer ausdrücklich nicht mit Tests beauftragen. Die folgende Geräteprüfliste beschreibt mögliche spätere Prüfungen; sie ist kein aktueller Auftrag an den Routenbauer. Native Simulatorprüfungen und unveränderte Screenshots der iOS-App werden mit GitHub-Mac-Runnern erstellt. Das erfordert keinen eigenen Mac und kein physisches iPhone. Kamera, konkrete Geräteberechtigungen und tatsächliche TestFlight-Installation bleiben damit unbestätigt.

Apples aktuelle Live-Validierung verlangt Screenshots für iPhone Dynamic Island (mittleres Display, Hochformat 1179 × 2556 oder 1206 × 2622) und iPad 13 Zoll (2048 × 2732 oder 2064 × 2752). Der native Simulatorlauf `38254354855` aus `5884e22` hat auf beiden Plattformen bestanden: Willkommensablauf, geladene Gastübersicht, Öffnen/Schließen des Filters, Detail und Rückkehr. Sechs Originalbilder wurden visuell, auf Abmessungen und SHA256 geprüft und auf dem NAS gesichert. Details: `docs/qa/2026-10-12-public-onboarding.md`. Dies ist keine vollständige Konten-, Upload- oder Löschabnahme.

Die App ist noch nicht öffentlich im App Store. Der bestehende interne Tester
kann in **TestFlight → KWS BETA APP → Aktualisieren** Build **1.0 (86)** installieren.
Falls 86 nicht erscheint: TestFlight aktualisieren und unter vorherigen Builds
nachsehen. Keine erneute Einladung anfordern, solange das bestehende Konto
Zugriff auf die KWS-Team-Gruppe hat. Eine Installation wurde noch nicht bestätigt.

## Prüfliste

- iPhone-Modell, iOS-Version und tatsächlich installierten Build dokumentieren.
- Ohne Konto: Boulderübersicht, Filter, Bilder, Detailansicht, Video und Navigation.
- Mit bestehendem eigenen Konto: Anmeldung, Abmeldung, erneute Anmeldung und
  Passwort-Reset. Keine fremden Konten verwenden.
- Projekt/Favorit, Begehung, Versuche und private Notiz speichern; nach erneutem
  Öffnen wiederfinden. Private Werte dürfen für andere Nutzer nicht erscheinen.
- Testkommentar absenden: zunächst nur Autor/Administration sichtbar, nach
  Adminfreigabe öffentlich; eine Bearbeitung erfordert erneute Freigabe.
- Inhaltsmeldung bestätigen; selbst gewählten Nutzer sperren und die persönliche
  Sperre unter Profil → Profil bearbeiten → Gesperrte Nutzer wieder aufheben.
- Glocke/In-App-Mitteilungen und Lesestände prüfen. Diese Version hat absichtlich
  kein iPhone-Push; eine Betriebssystem-Pushmeldung ist kein Abnahmekriterium.
- Datenschutz, Impressum und Community-Regeln aus der App öffnen; Links testen.
- Als berechtigter Mitarbeiter einen eigenen vereinbarten Test-Upload mit
  Kameraberechtigung/Medienauswahl prüfen. Verarbeitung abschließen lassen,
  Thumbnail und Wiedergabe kontrollieren. Keine realen Hallenmedien überschreiben.
- Registrierung mit eigenem separatem Testkonto: unter 16 und fehlendes/falsches
  Geburtsdatum werden abgewiesen; ab 16 Registrierung und Bestätigung prüfen.
- Offline-/Verbindungsfehler: verständliche Fehlermeldung, kein vorgetäuschter
  erfolgreicher Versand, Wiederholung nach Rückkehr der Verbindung.

## Löschprobe

Für den vollständigen Durchlauf ein ausdrücklich als Wegwerf-Testkonto
freigegebenes Konto und einen freigegebenen Bestätigungsempfänger verwenden.
Persönliche Testdaten/Dateien anlegen, Löschantrag in der App bestätigen,
Adminqueue/Frist prüfen und den technischen Betreiber `ACCOUNT_DELETION.md`
ausführen lassen. Danach Auth-Zugang, zugeordnete Daten/Dateien und
Bestätigungsmail prüfen; fremde Daten müssen erhalten bleiben. Niemals das
Konto des Routenbauers oder den benötigten Apple-Prüfzugang dafür entfernen.

## Store-Screenshots

Die aktuelle App unterstützt iPhone und iPad. Für die in App Store Connect
verlangten Gerätegruppen echte Ansichten der finalen nativen App in passenden
Abmessungen aufnehmen und ohne private Namen, Mails, Notizen oder Meldungen
bereitstellen. Sinnvolle Ansichten: Boulderübersicht, Boulder-Detail mit Video,
persönliche Projekte und Aktivitätsübersicht mit eigens angelegten Testdaten.
Eine Aufnahme auf einem iPhone ersetzt nicht automatisch die geforderte
iPad-Gruppe. Die tatsächlichen Ansichten dürfen nicht durch die lokale
synthetische Browser-QA-Fixture oder erfundene App-Screens ersetzt werden.

## Abschluss

Ergebnis pro Prüfschritt mit Gerät/Build und gegebenenfalls Screenshot melden;
Auffälligkeiten über das App-Feedbackformular erfassen. Marketing muss den
Moderations- und Löschablauf tatsächlich übernehmen. Apple-Organisationsumstellung
und öffentliche DSA-Angaben sind ein separater Freigabeschritt. Build 86 bleibt
bis zur Abnahme und den vollständigen Store-Angaben ein Release-Entwurf.
