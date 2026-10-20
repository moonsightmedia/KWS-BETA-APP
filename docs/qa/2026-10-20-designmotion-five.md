# Fünf freigegebene DesignMotion-Ergänzungen

Auftrag: Alle fünf Entwürfe aus `output/designmotion-next-five` umsetzen und
nach Prüfung veröffentlichen. Grundlage: `4335418`, keine neue Mehrfachauswahl.

## Ergebnis

- Mobile Standard-Profilfläche 44×44px; Avatar und Desktop-Menü bleiben gleich.
- Kontodatenüberschrift, Änderungsstatus und unabhängige Name-/E-Mail-Resets.
  Reset schreibt nichts, erhält das jeweils andere Feld und fokussiert den Eingang.
  Lade-/Speichersperren und vorhandener Verwerfenschutz bleiben aktiv.
- Passwortvorgabe am Registrierungsfeld, dynamisch nur die erreichte Mindestlänge.
  Bestehende Sechs-Zeichen-Regel, Passwortmanager, Einfügen und Auge bleiben.
- Datumsnormalisierung bei Blur sowie beim ausdrücklichen Absenden, auch per Enter.
  Acht Ziffern und getrennte Angaben werden angenommen, Kalender und Zukunftsgrenze
  weiterhin geprüft. Optionales Leeren und datumstreue Speicherung bleiben.
- Such-Leerzustand mit Suchtext sowie Suchreset bzw. vollständigem Filterreset.
  Ein zuvor geschlossenes Suchfeld wird für die Fokusrückgabe wieder geöffnet.
  Mitteilungsansichten behalten ihren eigenen Rückweg.

## Verifikation

- 339 Node-Funktionstests erfolgreich, zusätzlich Kalendergrenzen und kompakte
  Datumsangaben. Nach der Regex-Lintkorrektur erneut die betroffenen Node-Tests.
- 40 Browserfälle erfolgreich: Profil-/Avatar-/Verwerfenschutz, unabhängige Resets,
  Auth-Layout/Passwortanzeige, Such-/Filtererhalt, Datumseingabe per Enter und
  fehlgeschlagenes Speichern. Die neue Datums-Suite ist Teil der Web-production-CI.
- ESLint aller sechs geänderten Produktdateien ohne Fehler oder Warnungen.
- Produktions-Vitebuild erfolgreich ohne Versionsbump. Kein global grüner
  TypeScript-, vollständiger Screenreader- oder nativer Gerätetest behauptet.
- Loop 1: fünf echte Oberflächen auf 375/768/1280/1920px mit isolierten Daten.
  Keine neue Geometrie, kein Dokumentüberlauf oder sichtbare defekte Bilder.
- Loop 2: Profilresets, Fokus, Passwortanzeige/Autocomplete, Suchrückweg und
  ungültiges/gültiges Datum auf vier Breiten bedient. 44×44px Profilfläche gemessen;
  bestätigte lokale Datumsspeicherung über die echte Benutzerverwaltung geprüft.
- Die lokale Seite verwendet die tatsächlichen Produktquellen, keine Entwurfs-
  Quelltextpatches. Nur Daten-/Kontoquellen sind isolierte Fixtures; CSP und
  Fetchguard sperren externe Zugriffe. Keine produktiven Konten/Mails verändert.

Der erste lokale Profiltestlauf scheiterte auch mit den unveränderten
Produktkomponenten: fehlende lokale Supabase-Konfiguration. Mit expliziter
Fixture-Konfiguration entsprechend CI sind alle 40 Fälle grün. Keine Produkt-
oder Prüfaussage abgeschwächt. Ein Zeichenmengen-Heuristikfehler bei der kompakten
mobilen Such-Leerfläche wurde durch Prüfung der benannten Inhalte ersetzt;
Layout und Ergebnis waren bereits korrekt.

Belege: `output/designmotion-five-release/qa`, `browser-tests.log`, `build.log`,
`lint.log`. Historische Entwürfe bleiben unverändert. Freigabe erfolgt über
regulären PR/main-Workflow mit exaktem HTTPS-App-/Landing-Proof.
