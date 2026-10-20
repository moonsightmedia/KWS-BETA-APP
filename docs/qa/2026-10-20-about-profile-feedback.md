# App-Info und Profil-Bereichswechsel – 20.10.2026

Auftrag: Update-Endlosschleife beseitigen, installierte App-Version zeigen,
Kletterwelt-/Moonsight-Originalmarken mit Websites ergänzen und den berechtigten
Bereichswechsel per Avatar-Doppeltipp ermöglichen.

## Ergebnis

- Das Versionsplugin nutzt für App-Code und `version.json` denselben festen
  Buildzeitpunkt. Zuvor wurde am Buildende ein späterer Zeitpunkt geschrieben;
  derselbe Stand erschien deshalb wiederholt als neue Version. Der Build gibt
  Version, Zeitpunkt und vorhandene Release-Revision gemeinsam im gewählten
  Ausgabeverzeichnis aus. Web-Builds überschreiben keine Android-Assets mehr;
  Capacitor übernimmt das Manifest regulär beim Sync.
- Die Web-Prüfung unterscheidet nicht geprüft, laufend, aktuell, neue Version
  und Fehler. HTTP-/JSON-/Manifestfehler werden nie als aktuell ausgegeben.
  Nur eine bestätigte andere Web-Version bietet explizites Neuladen an.
- Native Installationen lesen Version und Build über `App.getInfo`; Fehler
  haben einen Wiederholungsweg. Die enthaltene Web-Oberfläche bleibt separat
  mit Version, Datum und gegebenenfalls Revision sichtbar. Native Updates führen
  zum bestehenden Play-Eintrag beziehungsweise TestFlight/App Store. Ein Reload
  wird nicht als Installation eines neuen Android-/iOS-Binaries ausgegeben.
- Beide unveränderten Logos stammen aus `public/landing`. Rollen als App der
  Kletterwelt und digitaler Partner Moonsight bleiben benannt; Website-, Rechts-
  und Kontaktlinks sind direkt erreichbar.
- Doppeltippen/-klicken auf den Profilavatar wechselt Home → Setter → Admin →
  Home, wobei nur die aktuell vom Server bestätigten Rollen berücksichtigt
  werden. Admin behält entsprechend bestehender App-Logik Setter-Zugriff.
  Der Schnellweg schreibt keine Rollen, erweitert keine Berechtigung und nutzt
  keine gecachten Rollen als endgültige Freigabe. Kontowechsel, gesperrte Sitzung,
  Abbruch, Timeout und fehlgeschlagene Abfrage lösen keinen privilegierten
  Wechsel aus. Einzeltipp, Tastatur, bestehende Menüpunkte und Hover bleiben
  als regulärer Profilzugang erhalten.

## Verifikation

- `node test/about-feedback.check.cjs`: **53 Assertions bestanden**. Gleiches
  Buildmanifest, neue Revision, HTTP-Fehler, ungültige Antwort, Wiederholen,
  expliziter Web-Reload ohne erneutes Scheinupdate, Original-Logo-Downloads,
  Native-Metadaten/Fehler und korrekte Store-Ziele sind geprüft.
- Touch-Doppelwechsel für Admin, Setter, veraltete Frontend-Rolle und fehlerhafte
  Serverabfrage; Einzeltipp und Escape, Tastatur-Enter sowie Desktop-Doppelklick
  geprüft. Es werden ausschließlich synthetische Konten auf localhost verwendet.
- Zwei gerenderte QA-Schleifen bei **375, 768, 1280 und 1920 px**: Hierarchie,
  Markenproportionen, Seitenränder, lange Kontaktadresse, Fehler-/Updatezustand,
  kein horizontaler Überlauf und keine JavaScript-Ausnahmen. Screenshots unter
  `output/about-feedback-20261020/loop1-*` und `loop2-*` visuell geprüft.
- Tatsächlicher Vite-Produktionsbuild in separatem Output erfolgreich. Manifest-
  Version, Buildzeitpunkt und Revision sind im erzeugten App-Bundle enthalten;
  Identitätsnachweis: `output/about-feedback-20261020/build-proof.json`.
- Scoped ESLint: 0 Fehler; eine Fast-Refresh-Warnung in der isolierten Testfixture.
- Vollständiger App-Typecheck bleibt wegen bestehender anderer Fehler rot;
  keine Diagnose in AboutApp, ProfileMenu, useProfileAreaShortcut oder version.ts.

Native Bridge-Antworten wurden ausschließlich simuliert. Kein physisches Android-
oder iPhone-Update und keine externe Store-Verfügbarkeit werden hiermit bestätigt.
Die zusätzliche manuelle CUA-Prüfansicht zeigte die neue Seite; ihre weitere
Viewport-Steuerung wurde durch eine pausierte Browserantwort blockiert. Der
eigene Tab wurde geschlossen. Die zwei gerenderten Regression-Loops sind davon
unabhängig vollständig durchgeführt.

## CI-Nacharbeit

Der Prüfaufruf startet und beendet seinen eigenen Vite-Server direkt über die
Vite-API. Er benötigt weder eine laufende Vorschau noch Edge: auf allen
Plattformen wird das von Playwright installierte Chromium verwendet. Browser und
Server werden auch bei einem Testfehler im `finally` geschlossen. Der lokale
Rerun mit `CI=true` bestätigt dieselben **53 Assertions**. Linux-Ausführung über
den GitHub-Workflow wird separat vom Release-Ablauf bestätigt.

Dieser Wechsel hat eine echte Touch-Abweichung aufgedeckt: Chromium meldet
Touch-Klicks als PointerEvent mit `detail=0`, während der frühere Edge-Test
`detail=1` lieferte. Der Avatar unterscheidet deshalb zusätzlich den tatsächlichen
Pointertyp. Ein Touch-Klick wird nicht mehr als Tastaturaktivierung behandelt;
normaler Keyboard-Zugang und echter Doppel-Touch sind mit Chromium erneut grün.
