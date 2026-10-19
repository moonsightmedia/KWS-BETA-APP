# Drei freigegebene mobile Verbesserungen – 19.10.2026

Ausgangspunkt: Live-/main-Revision `1339484ff1d82821c4621e343815b1ef06feaf4d`.
Der Nutzer hat die drei Vorher-/Nachher-Entwürfe ausdrücklich zur Umsetzung
und Veröffentlichung nach Prüfung freigegeben.

## Verhalten

- Setter-Bearbeiten, -Status und -Planung verwenden die bestehende
  Upload-Übersicht als 44px-Headeraktion. Anzahl und zugänglicher Status bleiben
  sichtbar bzw. hörbar. Die globale schwebende Instanz entfällt; Erstellen
  behält seinen eigenen Upload-/Aktionsdock. Dadurch ist die untere
  Sammellöschaktion über ihre gesamte Breite erreichbar.
- Sechs Eingabestellen verwenden unter 768px 16px statt 14px: Suche für
  angemeldete Nutzer und Gäste, Kommentar, private Tracking-Notiz,
  Bestätigungslink-E-Mail und HEX-Farbwert. Ab 768px bleiben 14px erhalten.
- Home-Abschnittsaktionen und die kleinen Auth-Aktionen haben mobil 44px
  Touchfläche. Die Passwortanzeige erhält passenden Freiraum im Feld;
  „Vergessen?“ überlappt keine benachbarte Eingabe. Desktopmaße bleiben erhalten.
- Statscard bleibt auf Home oben; der Beta-Logo-Startlader bleibt unverändert.
  Keine Uploadpipeline-, Daten-, Rollen- oder Speicherlogik geändert.

## Prüfung

- 330 Node-Tests bestanden. Produktionsbuild erfolgreich, ohne Versionsbump.
- Alle 151 Browserfälle des aktuellen Web-Workflow-Befehls bestanden, darunter
  vier neue echte Treffer-/Geometrie-/Dialog-/Fokusfälle bei 375/768/1280/1920.
  Sie klicken den früher überdeckten linken Bereich von „Löschen“, brechen
  anschließend ab und öffnen die Upload-Übersicht über die Tastatur.
- Zwei gerenderte QA-Loops: 44 Layoutzustände (11 Beispiele x vier Breiten),
  danach Upload-/Löschdialoge und Abbruch an allen vier Breiten, alle sechs
  Eingaben editieren/zurücksetzen, Passwortanzeige, Vergessen/Zurück und
  Home-Fortschritt. Kein Dokumentoverflow, keine gebrochenen Bilder oder
  Überdeckung in den vermessenen Zuständen. Alle sechs mobilen Eingaben 16px;
  mobile Home-/Auth-Aktionen 44px. Kontaktbögen visuell geprüft.
- ESLint für geänderte Dateien: 0 Fehler, zwei bestehende Warnungen
  (App-useEffect-Abhängigkeit und SetterAreaLayout-Fast-Refresh-Export).
- TypeScript: 69 Diagnosen vor und nach der Änderung, gleiche Diagnosen bei
  normalisierten Zeilennummern. Ausgangsstand aus Git separat geprüft.
  Der globale Typecheck ist weiterhin nicht grün.
- React-Review: keine neuen Hooks, Seiteneffekte, Fetches oder duplizierten
  Datenzustände; typisierte Placement-Variante, bestehender Dialog und
  vorhandene Auth-/Uploadprovider bleiben Grundlage.

Alle lokalen Schreib-/Interaktionstests verwenden synthetische Fixtures und
sperren produktive Verbindungen. Die Vorschau lädt aktuelle Produktkomponenten;
Quellpatches setzen nur Anfangszustände (Suche/Notiz/Farbeditor/Auswahl), keine
Produktdarstellung. Native iPhone-Zoom-/Tastaturtests, vollständige
Screenreader-/Backend-Abnahme sind nicht Bestandteil dieser UI-Korrektur.

Beim ersten lokalen Teststart fehlte die CI-Backendkonfiguration; dieser Lauf
wurde gestoppt. Zwei Diagnoseversuche teilten versehentlich den Testserver und
Artefaktordner, wodurch beim Beenden Verbindungs-/Artefaktfehler entstanden.
Der vollständige abschließende 151er-Lauf lief separat mit expliziter
CI-Konfiguration erfolgreich. Frühe Dialogscreens während des Eintritts wurden
nach stabiler Deckkraft erneut aufgenommen.

Lokale Belege: `output/mobile-implementation/qa/` mit Layoutmessungen,
Interaktionen, Kontaktbögen, Build-/Lint-/Testlogs und Typevergleich.
Freigabe über normalen PR-/Web-production-Ablauf gemäß
`docs/GITHUB_WEB_AUTODEPLOY.md`; app- und landingseitige HTTPS-Revisionsnachweise
sowie anschließender Live-Smokecheck bestätigen den tatsächlich veröffentlichten
Stand. Kein separater nativer Store-Release durch diesen Webauftrag.
