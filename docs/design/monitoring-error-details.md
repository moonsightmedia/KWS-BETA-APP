# Fehler verstehen statt Rohdaten lesen

Nutzerauftrag18.10.2026: Die bisherige Fehleransicht ist für normale Admins
nicht handlungsfähig. Referenz ist der vom Nutzer bereitgestellte Screenshot;
Stil und Dialoggeometrie folgen `docs/DESIGN.md` und dem Feedback-Arbeitsplatz.

## Richtung

Eine ruhige, kompakte Ansicht beantwortet zuerst: Was ist passiert, wie groß ist
der beobachtete Umfang und was kann ich als Admin jetzt tun?

- Verständlicher Titel, bestätigter Status und letzter Zeitpunkt im festen Kopf.
- Auswirkung und belegter Hinweis getrennt; keine vermutete Fehlerursache als Fakt.
- Lesbare Plattform und Versionsnummer statt technischer Releasekette.
- Handlungsanleitung und kopierbarer Bericht mit Supportreferenz. Keine Konten-/
  Gerätekennungen, willkürlichen Zusatzfelder oder ungeprüften Stacks im Export.
- Bearbeitung ist ein Entwurf mit bestätigtem Speichern und Verwerfenschutz.
  Nach dem Speichern wird der bestätigte Entwurf die neue Vergleichsbasis.
- Vollständige Meldung, Buildkennung und Einzelberichte erst auf Anforderung.
- KWS-Tokens, 44px-Aktionen, genau ein Scrollbereich, feste Kopf-/Fußaktionen.
  Mobile randbündiges Sheet, Desktop höchstens672px breiter Dialog.

## Verifikation

`e2e/launchMonitoring.spec.ts` prüft die unveränderten Cockpit-Flüsse und beide
Dialog-QA-Loops bei375/768/1280/1920px, zusätzlich375×568px. Enthalten sind
Kopiererfolg/-fehler, fehlende Berichte samt erneutem Laden, lange Meldungen,
Statusbestätigung, Fixversion, Verwerfenschutz, Rückfokus und nur lesende Sentry-
Bearbeitung. Screens mit isolierten Beispieldaten:
`test-results/launch-monitoring-optimized-20261018/issue-*`.

Die erste Prüfung fand nur zwei Testprobleme: Messung während der Einblendung
und eine mehrdeutige Textsuche im Kopierfallback. Diese wurden ohne Abschwächung
der44px-Anforderung korrigiert. Die erneute Produktprüfung ergänzte den
bestätigten Status als Entwurfsbasis und kürzte die mobile Erklärung.

`test/monitoringIssueGuide.test.mjs` sichert Versionsdarstellung, begrenzte
Diagnoseaussagen, sichere nächste Schritte und den Export ohne Identitäten ab.
Das ist keine Abnahme physischer nativer Geräte oder neuer Providerdaten.
