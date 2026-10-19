# DesignMotion: gezielte Verbesserungen in der echten Beta-Oberfläche

Freigabe: Janosch, 19.10.2026. Ausgangsstand: a88fa8c (origin/main).
Die zehn vorhandenen Vorschläge werden in den echten App-Komponenten umgesetzt.
Die zusätzliche Nutzerentscheidung ersetzt den Statistik-Vorzeitraumvergleich
und begrenzt größere Fotokartennamen ausdrücklich auf eine Zeile.

## Ergebnis

1. Statistik: standardmäßig letzte sieben Kalendertage, Pfeile für gleich lange
   Fenster und Rückkehr zu heute. Freie Von–Bis-Auswahl mit Kalender und
   „Letzte 20 Tage“. Beginn/Ende inklusive; Zukunft und ungültige URL-Daten
   werden abgefangen. Zeitraum und Gradfilter bleiben in der URL.
2. Filter: Mehrfachauswahl-Hinweis auch bei Auswahl; sofortige Wirkung erläutert.
3. Profil: Inlinefehler, Fokus auf erstes ungültiges Feld, Autofill und Werteerhalt.
4. Editor: Name/Ungespeichert im originalen Kopf; vorhandener Dirty Guard bleibt.
5. Fotoübergang beim ausdrücklichen Öffnen. Rücknavigation sofort, inklusive
   erhaltener Liste, Filter, Fokus und Scrollposition. Ohne geladene Bildquelle,
   Browser-API oder bei Reduced Motion direkte Navigation. Kein zweiter Fade.
6. Tracking: Bestätigung nach beiden bestätigten Schreibvorgängen, keine
   Erfolgsmeldung beim simulierten Fehler; Retry und optimistische Rücknahme.
7. Gemeinsame Statusbadges auf Home und in Meine Boulder; Metadaten als Untertitel.
8. Home-/Boulder-Fotokarten mobil12/11px, Name einzeilig mit Ellipse. Desktop-
   Typografie und Gradientengeometrie bleiben erhalten. Keine angehängten Grade;
   tatsächliche gespeicherte Namen werden nicht verändert.
9. Benutzerverwaltung: E-Mail-Umbruch/Kopieren im bestehenden geöffneten Eintrag.
10. Glocke: zugänglicher Name mit Anzahl bzw. Lade-/Fehlerstatus, visuell unverändert.

Die Wochenkarte bleibt oben. Der Beta-Logo-Startscreen bleibt erhalten.
Keine Datenmigration, neue Rechte oder Änderung des Videoabrufs.

## Verifikation

- Alle296 Node-Regressionstests bestanden, einschließlich vier neuer Tests für
  Zeitfenster, inklusive Grenzen, Sommerzeit, ungültige Daten und Top-Deduplizierung.
- Produktionsbuild mit npx vite build erfolgreich; kein Versionsbump durch prebuild.
- Neue Komponenten/Helper: ESLint ohne Befund. TypeScript-Vergleich gegen den
  eingefrorenen Ausgangsstand: jeweils71 bestehende Diagnosen, keine neuen.
- Browserprüfungen für Home, Statistik, Sammlung, Profil, Mitteilungen und
  Boulder-Rücknavigation; zusätzliche Fälle für20-Tage-Auswahl, Abbrechen,
  ungültige Bereiche, Inlinevalidierung ohne Schreibzugriff und ersten Fehlerfokus.
- Gezielter Editor-Regressionstest mit Pflichtfeldern, Namenerhalt, Scrollen und
  Verwerfenschutz bestanden. Zusätzlicher Foto-Test auf allen vier Breiten belegt
  echten nativen Übergang und unterdrückten doppelten Eintrittseffekt.
- Zwei gerenderte QA-Loops bei375/768/1280/1920: alle zehn Themen im Layoutloop;
  zusätzlich aktive Filter, Kalender/20-Tage-Auswahl, Formularfehler,
  Ungespeichert und bestätigtes Tracking im Zustandsloop. Keine horizontale
  Überbreite; Fotokartennamen nowrap. Erfolg erst nach Antwort; Fehler zeigt
  keine Erfolgsbestätigung. Navigation/Reduced Motion/Tastatur gesondert geprüft.
- Lokale Belege: output/design-review-10/implementation-qa/ und
  test-results/designmotion-*.log. Konsolenprüfung ohne neue Anwendungsfehler;
  erwartete Testfehler werden nur in der isolierten Fixture ausgelöst.
- Beispieldaten/API-Antworten sind isoliert; keine echten Session-, Profil-,
  Rollen-, E-Mail- oder Benachrichtigungsänderungen als Teil der Prüfung.

## Lokaler Vergleich und Releasegrenze

Die Galerie auf127.0.0.1:5199/output/design-review-10/index.html zeigt Vorher
von eingefrorenem a88fa8c auf5200 und Nachher aus den Produktquellen auf5201.
Beide verwenden dieselben lokalen Daten. Die früher angehängten Ziffern in den
Fotokarten waren Fixture-Zähler und wurden aus diesen Beispieldaten entfernt.
Die produktiven Namen werden nicht bearbeitet.

Diese Änderung ist auf codex/designmotion-improvements vorbereitet. Noch keine
Veröffentlichung: ein Merge nach main würde App und Landing gemeinsam über den
bestehenden CI-/Hostinger-Releaseweg ausliefern.
