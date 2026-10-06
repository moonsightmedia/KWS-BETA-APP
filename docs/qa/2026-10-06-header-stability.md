# Stabile Hauptnavigation – 6. Oktober 2026

## Ursache und Korrektur

Die gemeinsame Titelzeile hatte keine Mindesthöhe. Die 40px-Aktionen auf Home
und Boulder sowie der 44px-Button auf Statistiken bestimmten deshalb verschiedene
Headerhöhen. Auf Desktop vergrößerte zusätzlich Homes Begrüßungsuntertitel die Zeile.

`DashboardHeader` reserviert jetzt 44px für die mobile Titelzeile und 56px auf
Desktop, dort einschließlich einer 16px-Unterzeile. Titelposition, Aktionsmitte
und untere Trennlinie bleiben auf allen drei Routen identisch. Bestehende
Such-/Filterbereiche dürfen weiterhin unterhalb der stabilen Titelzeile wachsen.
Safe-Area-Padding, Farben, Icons und Navigation bleiben unverändert.

## Messungen der gerenderten Seiten

Ohne zusätzliche simulierte Safe Area:

| Viewport | Vorher: Home / Boulder / Statistik | Nachher: alle drei |
| --- | --- | --- |
| 375px | 69 / 69 / 73px | 73px |
| 768, 1280, 1920px | 87,40625 / 73 / 77px | 89px |

Nachher ist auch die Titelposition über alle Routen exakt gleich: oben
20,796875px. Die horizontale Titelposition bleibt je Viewport unverändert.

## Verifikation

- Loop 1: tatsächliche Home-, Boulder- und Statistikkomponenten im isolierten
  Browserfixture, Seitenwechsel über die echte Navigation; Screenshots bei
  375, 768, 1280 und 1920px geprüft. Keine neue horizontale Überbreite.
- Loop 2: dieselben vier Breiten mit zusätzlicher 32px-Safe-Area, reduziertem
  Bewegungsmodus, Scrollen, Benachrichtigungsmenü, Suche sowie Lade-, Fehler-
  und Leerzuständen. Titelzeile bleibt stabil, Suchbereich weiterhin bedienbar.
- `e2e/header-stability.spec.ts`: 8 Tests.
- `e2e/boulder-group-state.spec.ts`: 10 Regressionstests; gespeicherte
  Sektorgruppierung und Rücknavigation bleiben erhalten.
- Produktionsbundle: `npm run build:native` erfolgreich; vorhandene Warnungen
  zu Chunkgröße und gemischten statischen/dynamischen Imports bleiben bestehen.
- Screenshots: `test-results/header-stability-20261006/` (lokale QA-Artefakte,
  nicht für den Produktionsdeploy).

Die Prüfung nutzt isolierte Daten und schreibt nicht in die Live-Datenbank.
Stand vor der Veröffentlichung: Die auf dem S25 installierte APK 49,
TestFlight 75 und Webproduktion d765eff enthalten diese nachträgliche
Korrektur noch nicht. Die anschließende Release-Freigabe erfolgt getrennt.
