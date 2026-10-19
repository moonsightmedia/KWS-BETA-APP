# Onboarding – App-Integration, 19.10.2026

Freigegebener Entwurf in die regulären App-Komponenten übernommen. Kein Release
und keine Änderung an produktiven Konten oder Datenbanken in diesem Schritt.

## Quelle und Arbeitsstand

- Frischer Fetch am 19.10.2026, 18:28:48 +02:00: ursprünglicher gemeinsamer
  Arbeitsordner `main` 0 voraus / 11 zurück, mit fremden offenen Playeränderungen.
- Isolierter angehängter Arbeitsstand `codex/onboarding-integration` auf
  `4b763e5c13751d09163dd4d4b4af3f701b9a72ec` (`origin/main`) angelegt.
  Erneuter Fetch 18:50:02 +02:00: Basis unverändert aktuell, 0 / 0.
- Der ursprüngliche Arbeitsbaum und seine laufenden Änderungen bleiben erhalten.
- Freigabe: echte verankerte Führung, natürliche Texte, runder SVG-Ausschnitt,
  fortlaufende Filterführung, Konto-Vorteilsicons Bookmark / Play /
  StatisticsIcon / Star und die bestätigten Bezeichnungen.

## Umsetzung

- `OnboardingProvider` steuert reale Gastliste, Detail und Filter über explizite
  Oberflächenmeldungen und stabile `data-onboarding`-Ziele.
- Grad, Farbe, Bereich und Ergebnisbutton bleiben während der Erklärung bedienbar.
  Erst tatsächliches „Boulder anzeigen“ führt zum Ergebnishinweis.
- Persönliche Funktionen sind separate, klar benannte Kontovorschauen.
  Markierungen und Tracking verwenden ausschließlich lokalen React-Zustand;
  die gemeinsame `WeeklyProgressCard` erhält eine Beispielwoche.
- Die Konto-Vorteilsseite führt zum bestehenden Formular `/app/register`.
  Keine Entwurfs- oder Entwicklungsinformationen im Produktfluss.
- Automatisch nur beim ersten geladenen Gastbesuch. Altstatus
  `hasSeenOnboarding` bleibt wirksam; neue Abschlüsse verwenden die versionierte,
  nach Backend getrennte Kennung. Wiederholung im Gastkopf möglich.
- Fehlende Videos werden ehrlich benannt. Datenfehler und leere Listen zeigen
  keine verwaisten Hinweise. Kein erzwungener Neustart auf Auth-Seiten.
- Fokus, Gastfilter und der reale Rückweg bleiben erhalten, auch bei asynchronem
  Browser-Zurück und Filtern ohne Treffer. Kurze Displays verwenden einen
  kompakten, vom sichtbaren Ziel getrennten Hinweis.
- Die freiwillige Statistikabfrage bleibt während der Führung und ihrer
  Kontovorschauseiten zurückgestellt. Bestehende Entscheidung und freiwillige
  Auswahl bleiben unverändert; danach erscheint sie nur bei unbekanntem Status.

## Visueller Loop 1 – Layout

Tatsächlich gerenderte produktive Seiten und Komponenten mit isolierten Lesedaten
in Microsoft Edge geprüft: 375, 768, 1280 und 1920 × 900 px. Alle Schritte
inklusive Konto-Vorteilen und bestehender Registrierung durchlaufen.

Kontrolliert: KWS-Tokens, Header, Poppins/Teko, Innenabstände, Icons, identische
Geometrie von Aufhellung und Kontur, sichtbare Ziele und Viewportgrenzen.
Zusätzlich 375 × 667 und 812 × 375 für Detailmedium und Filter geprüft.
Die Detail-Scrollebene hält die Videosteuerung erreichbar; flache Filter nutzen
nur den tatsächlich verfügbaren Auswahlbereich. Kein horizontaler Überlauf.

Lokale Bildbelege: `output/playwright/onboarding/` (bewusst nicht im Git).

## Visueller Loop 2 – Verhalten und Zustände

- Vier vollständige Durchläufe im echten App-Rahmen mit BrowserRouter:
  Liste → Detail → Filter einschließlich echter Auswahl → Ergebnis →
  Speichern → Tracking → Wochenbeispiel → Kontovorteile → Registrierungsformular.
- 43 zusätzliche Prüfungen: 375 × 667, 812 × 375 und die drei größeren Breiten,
  Tastaturfokus, Escape, Filter-X, keine Überdeckung zwischen Hinweis und
  sichtbarer Auswahl, Alt-/Neustatus, erneuter Start, fehlendes Video,
  direkte Auth-Routen, angemeldete Nutzer, leere/fehlerhafte Daten und gesperrter
  Browserspeicher.
- Erster Start über `/` im echten App-Router: Weiterleitung nach `/guest`,
  Abschluss über Neuladen erhalten, Gastfilter und identischer Kartenknoten beim
  Detailbesuch erhalten. Statistikabfrage während der Tour verborgen und nach
  Überspringen wieder erreichbar. Keine persönlichen Schreibanfragen.
- Filter ohne Treffer: Zurück zum echten zuletzt besuchten Detail und erneut
  zurück zur leeren Auswahl, ohne Filterverlust oder verschwundenen Hinweis.
- Keine unerwarteten Browserfehler in den vollständigen Durchläufen.

## Technische Prüfung

- Direkter Vite-Produktionsbuild erfolgreich; kein Versionsbump ausgeführt.
  Bestehende Bundlegrößen-/Importhinweise und `fonts.css`-Hinweis bleiben.
- ESLint für die geänderten Feature-Komponenten ohne Fehler/Warnungen.
  Die vorhandene Hook-Warnung im übrigen `App.tsx` wurde nicht verändert.
- Projektweiter TypeScript-Check hat bereits auf unverändertem Basiscode
  69 Diagnosen. Abgleich von Datei, Diagnosecode und Meldung: keine zusätzlichen
  Diagnosen durch diese Integration. Bekannte Fehler liegen u. a. in den
  Supabase-Typen, `colorHex` und der bestehenden Detailtab-Typisierung.
- Kein echtes Konto registriert; persönliche Schreibpfade und ein physisches
  Android-/iOS-Gerät sind nicht Teil dieser lokalen UI-Prüfung.

## Reproduktion

Mit vorhandenen Projektabhängigkeiten unter Windows:

```powershell
node node_modules/vite/bin/vite.js --config test/onboarding.vite.config.ts
# In einer zweiten Sitzung:
$env:ONBOARDING_REAL_APP='1'
node test/onboarding.check.cjs
node test/onboarding-edges.cjs
node test/onboarding-app.check.cjs
node test/onboarding-empty.check.cjs
```

Der QA-Server läuft ausschließlich lokal auf Port 5220, ersetzt öffentliche
Lesedaten und Auth für die Prüfung und verwendet eine lokale Backendadresse.
Prüfskripte sperren externe Browseranfragen. Der normale Produktionsbuild
verwendet diese Aliase und Fixtures nicht.
