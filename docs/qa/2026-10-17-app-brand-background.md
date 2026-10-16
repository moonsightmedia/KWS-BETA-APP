# Gemeinsamer Beta-Hintergrund – 17.10.2026

Der bisher nur in der Boulderliste sichtbare Hallenakzent wird als BrandWatermark wiederverwendet. Home, DashboardPageLayout (Statistik, Profil/Unterseiten, Details, Sektoren, Schraubplan und Setter), Gastuebersicht, Auth, Passwort-Neuvergabe, Rechtstexte, Admin und Fehlerseiten erhalten das identische dekorative Zeichen.

Das Zeichen bleibt mit 8% Deckkraft horizontal im Inhaltsbereich und vertikal in der sichtbaren Bildschirmmitte. Groesse: mobil 22rem/maximal 90%, ab md 30rem. Hintergrund und Inhalte liegen in einem isolierten Ebenenbereich; Karten, Formulare und Fotos behalten ihre eigenen deckenden Flaechen. Keine neuen Events, Datenabfragen oder Abhaengigkeiten. Header bleiben ohne Produktlogo. In Boulder-Hallenkarte und Admin-Zeicheneditor entfaellt die Ebene; Dialoge und Medien haben kein eigenes Wasserzeichen. Training bleibt in Produktionsbuilds gesperrt.

## Pruefung

- Aktualitaetscheck: origin gefetcht; separater Worktree basiert ohne Divergenz auf main d0e5a6efabaef96519cca0fbc6e7deef6a982f29. Vorherige Vorschau mit lokalen Aenderungen blieb unangetastet.
- Loop 1: 12 gerenderte Ansichten bei je 375/768/1280/1920 px: Home, Boulder, Statistik, Profil, Ueber die App, Sektoren, Schraubplan, Gast, Login, Registrierung, Datenschutz und kurzer Dashboard-Rahmen. Zentrierung zu Beginn und beim Scrollen, Opazitaet, exaktes Gruen rgb(54,181,49), aria-hidden, pointer-events und horizontaler Overflow geprueft. 48 Faelle bestanden. Geladene sichtbare Bilder vor Screenshots abgewartet.
- Loop 2: Suche, Filterdialog/Escape, Liste/Grid, Statistikzeitraum/Sammlungsreiter, Passwortsichtbarkeit/Reset/Registrierung an vier Breiten. Zusaetzlich Sidebar einklappen/Zentrierung, kurzer mobiler Viewport, Reduced Motion, Home leer/Fehler/Laden und Tastatur. Keine pageerror-Ereignisse. Dialogbilder erst nach abgeschlossener Einblendung beurteilt.
- Visuelle Sichtpruefung: mobile Home/Statistik/Profil, Tablet-Boulderliste, Desktopprofil/Login, breite Statistik, eingeklappte Sidebar und Filter.
- Vite-Produktionsbuild erfolgreich. Bestehender Hinweis zur Chunkgroesse bleibt.
- TypeScript: 74 Fehler im unveraenderten Ausgangsstand und 74 im geaenderten Stand, keine eingefuehrten Diagnosen. Gesamter Typecheck ist wegen bestehender Fehler nicht gruen.
- ESLint fuer neue BrandWatermark und gemeinsame DashboardPageLayout/AppErrorView bestanden; git diff --check bestanden. React-Review: reine Praesentationskomponente, kein Hook-/State-/Effect-Zuwachs, dekorative SVG-Semantik bleibt erhalten.

## Grenzen

Lokale Designpruefung mit synthetischen Kontodaten und bestehenden Hallen-Thumbnails. Keine neuen Produktionsdaten geschrieben. Admin und Passwort-Neuvergabe wurden kompiliert, aber ihre echten Backendablaeufe nicht erneut getestet. Ebenso kein vollstaendiger nativer Geraete-, Detail-Medien- oder TV-Test fuer diesen Stand. Kein Deployment oder nativer Release; Galaxy S25 bleibt auf dem zuvor installierten Android 1.0.63. Der native Versionsbranch codex/android-logo-63 ist separat und beim naechsten Android-Release zu beruecksichtigen.

Lokale Nachweise: output/brand-background/loop1.json, loop2.json und Screenshots; output/typecheck-comparison.json; output/brand-build.log. Die isolierte Vorschau auf http://127.0.0.1:5191 verwendet nur unversionierte Vorschau-Fixtures; sie sind kein Bestandteil des Produktbuilds.
