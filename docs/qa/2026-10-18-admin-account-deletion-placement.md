# Kontolöschungen im Adminbereich

Die Benutzerliste beginnt wieder mit ihren Filtern. Die vollständige Warteschlange
liegt unter „Benutzer → Löschanträge“ (`/admin?tab=users&usersView=deletions`), mit
„Zur Benutzerliste“ als Rückweg. Nur bestätigte offene Anträge erzeugen oben einen
kompakten Hinweis mit Anzahl und Direktlink. In der Warteschlange erscheint dieser
Hinweis nicht zusätzlich. Beide Ansichten teilen dieselbe React-Query-Abfrage.

## Verifikation

- 15 Browserfälle in `e2e/account-deletion-placement.spec.ts`: leer/offen,
  Laden, Lesefehler, erneutes Laden, Rückweg, Tastatur, Einstieg aus anderem
  Adminbereich, gemeinsame Abfrage und Zugriffsschutz für Nicht-Admins.
- Zwei visuelle Runden bei 375/768/1280/1920px: Liste und Warteschlange,
  anschließend Fehler/Erholung und reduzierte Bewegung. Kein horizontaler
  Überlauf. Acht Aufnahmen aus beiden Runden visuell angesehen; lokale
  Einzelbilder in `test-results/account-deletion-placement-20261018/`.
- 10 Node-Tests für Kontolöschungs-API und Admin-Grundlagen bestanden.
- ESLint der geänderten Produktdateien und neuen Suite sowie direkter
  Hostinger-Vite-Build bestanden. Bestehende Build-Warnungen bleiben bestehen.
- Bestehende Profilentwurf-/Speichertests und Admin-Navigation zusätzlich geprüft.
  Der Navigationstest erwartete bei 768px noch die große Monitoring-Segmentgruppe;
  die bestehende Oberfläche verwendet dort eine Combobox. Die Erwartung folgt nun
  der vorhandenen 1024px-Umschaltung.

Die Browserfälle rendern die echten Admin-/Benutzer-/Queue-Komponenten mit
synthetischen Benutzern und Anträgen. Auth, Datenleser und fachfremde Adminansichten
sind isoliert; der Header ist ein vereinfachter Fixture-Header. Externe Anfragen
sind blockiert, produktive Schreibzugriffe finden nicht statt. Die eigentliche
Kontolöschung, API und Datenbank wurden nicht verändert.

Die neue Suite läuft im regulären Web-Release-Workflow mit. Veröffentlichung und
genauer Live-Stand werden über GitHub Actions und beide öffentlichen
`release.json`-Nachweise kontrolliert.
