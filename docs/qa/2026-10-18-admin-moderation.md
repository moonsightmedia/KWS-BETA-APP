# Moderation als eigener Adminbereich

Moderation steht direkt in Desktop- und Mobilnavigation. Feedback enthält wieder
nur Feedback. Die Moderation beginnt mit den beiden Ansichten „Kommentare“ und
„Meldungen“, bestätigten Anzahlen und Aktualisieren. Hinweise und Community-Regeln
sind als kompakte aufklappbare Hilfe erreichbar. Andere Adminseiten zeigen nur bei
bekannten offenen Aufgaben einen Hinweis mit Direktlink zur passenden Ansicht.

Queue und Hinweis teilen die bisherigen, nutzerbezogenen Query-Keys. Die vorhandenen
Moderationsaktionen und ihre API-Payloads bleiben erhalten. Nach Aktionen werden
Listen und Hinweis gemeinsam invalidiert; Doppelaufrufe sind während einer Aktion
gesperrt. Die Serverberechtigungen und Datenbank werden nicht verändert.

## Nachweise

- 31 Browserfälle bestanden: 14 neue Moderationsfälle, 15 Kontolöschungsfälle und
  zwei bestehende Admin-Navigationsfälle einschließlich aller sieben Mobilziele.
- Zwei visuelle Runden bei 375/768/1280/1920px: offene/leere Kommentare und Meldungen,
  Hilfe, kompakter Hinweis, Lesefehler und Erholung. Lange Texte und alle Aktionen
  passen ohne horizontalen Überlauf. Aufnahmen unter
  `test-results/moderation-placement-20261018/`; endgültige Aufnahmen beenden
  Farbtransitionen vor dem Screenshot.
- Alle sieben Moderationsaktionen mit synthetischen Daten und ihren Ziel-IDs
  geprüft, einschließlich Speicherfehler, Sperrzustand und Query-Aktualisierung.
  Teilfehler bleiben explizit; Laden erzeugt keine erfundene Null. Nicht-Admins
  lösen keine Queue-Abfragen aus. Keyboard-Einstieg und native Hilfe bedienbar.
- 10 gezielte Node-Tests (Admin-Grundlagen und Community-Safety-API), scoped ESLint
  und direkter Hostinger-Vite-Build bestanden. TypeScript meldet weiterhin 73
  bestehende Diagnosen; keine in den geänderten Produktdateien.

Browser-QA rendert echte Admin-, Sidebar-, Moderations- und Hinweis-Komponenten.
Header, Auth und Datenleser sind isolierte Fixtures; Schreibfälle betreffen nur
synthetische Testdaten. Externe Anfragen sind blockiert, keine Live-Moderation.
Die neue Suite gehört zum automatischen Web-Release-Workflow.
