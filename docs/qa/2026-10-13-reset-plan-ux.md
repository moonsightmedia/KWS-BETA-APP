# Schraubplan – vier bestätigte UX-Verbesserungen

## Ergebnis

Arbeitskopie: `C:/Users/Janosch/.codex/worktrees/kws-optional-beta/KWS-BETA-APP`, weiterhin detached `84c153b`.
Remote origin frisch geprüft, 14 Commits hinter `origin/codex/hostinger-migration`; kein Merge, Commit, Push oder Deployment.
Bestehende Optional-Beta-/Schraubplan-Arbeit bleibt erhalten. Port 5182 ist die isolierte Vorschau, nicht die Live-App.

- Ansicht, angezeigter Monat und ausgewählter Tag bleiben bei Home-/Boulder-Navigation und beim Neuladen erhalten.
- Versionsgebundener LocalStorage-Schlüssel `kws.reset-plan.view.v1`, nur öffentliche UI-Präferenzen, keine Termine, Benutzer- oder Kontodaten. Ungültige, obsolete oder gesperrte Speicherwerte blockieren nicht die Bedienung.
- Die erstmalige automatische Auswahl des nächsten Schraubtags überschreibt keinen wiederhergestellten oder bewusst gewählten Zustand. Die Ansicht speichert keine Scrollposition.
- Öffentlicher Kalender nutzt nur tatsächlich benötigte Wochen, kompakte Tageszellen mindestens 44px, keine zusätzliche innere Scrollfläche. Die Setter-Arbeitsansicht verwendet weiterhin die bisherige große Variante.
- Heute: Unterstreichung; Schraubtage: leichter Tint plus Kalendericon; Auswahl: Aktionsgrün, Dunkelblau und Kontur. Kurze Legende, vorhandene DayPicker-Tastatursteuerung und Datumslabels bleiben erhalten.
- Heute/Morgen/Übermorgen richten sich nach Kalendertagen in Europe/Berlin, nicht nach 24-Stunden-Abständen. Vollständiges Datum bleibt als Zusatzinformation sichtbar. Der nächste Termin hat eine schmale grüne Kantenmarkierung.
- Im mobilen Kalender entfällt der doppelte Zähler über dem Monatsblock. Tagesdetailüberschrift und Terminfläche sind kompakter, Hinweise bleiben vollständig und scrollbar bei langem Inhalt.
- Im Oktober-Prüfviewport 375×812 schrumpft der Kalender von 472 auf 344px. Tagesdetails beginnen bei y=517 statt y=681 und enden bei y=721; der normale kurze Hinweis bleibt oberhalb der Bottom-Navigation sichtbar. Sechs-Wochen-Monate oder längere Hinweise benötigen weiterhin normalen Seitenscroll.
- Markenfarben und globale Tokens wurden nicht geändert. Kein Kalenderexport oder neuer Benachrichtigungsdienst in diesem Auftrag.

## Nachweise

Lokale QA-Konfiguration `test/reset-plan.vite.config.ts`: synthetische Auth-/Persönlichkeitsdaten, echte öffentliche Lese-Hooks gegen isolierte REST-Antworten. Keine echten Hallentermine verändert.

1. `node --test test/resetSchedule.test.mjs`: 6/6 bestanden. Gruppierung, ungültige Zeiten, fehlende Referenzen, Berlin-DST/Mitternacht, gespeicherte Ansicht und ungültiger/gesperrter Speicher.
2. `e2e/reset-plan.spec.ts`: erste vollständige Runde 12/12; erweiterte zweite Runde 14/14 bestanden. Beide Kalender-/Agenda-Runden 375/768/1280/1920px, echte Navigation, Retry/Loading/Empty, Gast, Pagination und Ablauf. Dazu Ansicht/Monat/Tag nach Home/Boulder und Reload auf Mobile/Desktop, blockierte Speicherlese-/Schreibzugriffe, echte sechs Wochen im Mai 2027, multiple Tagestermine, lange Hinweise, unveränderte Kalendergröße bei Tagesauswahl und >=4.5:1 Auswahl-Textkontrast.
3. Gemeinsame Setter-Komponente: `month and year boundaries, today, past days, keyboard movement and list view` sowie `schedule: valid date, physical IDs, pending lock, error retention and deletion`: beide bestanden.
4. Eine obsolete Setter-Test-Erwartung wurde korrigiert: vier statt drei logische Tagestermine, weil Bug A und Kurze Platte schon seit der bestätigten Oktober-Kartenkorrektur getrennt sind. Beide Namen explizit geprüft. Keine Änderung von Sektor- oder Termindaten zur Erfüllung des Tests.
5. Scoped ESLint, `git diff --check` und Produktionsbundle bestanden. Vorhandene große Bundle-/Mixed-Import-/Browserslist-Warnungen bleiben.
6. Projektweiter Typecheck bleibt wegen bekannter Altfehler rot; erneute Ausgabe hat keine Fehler für `ResetSchedule`, `resetSchedule`, `NextResetCard` oder `SetterScheduleCalendar`. Kein pauschales Typecheck-Grün behauptet.
7. Zusätzliche Prüfung im tatsächlich geöffneten In-App-Browser: November/17. November bleibt nach Home-Rückkehr und anschließendem Reload erhalten. Danach aktuelle Oktober-Auswahl wieder angezeigt; temporärer Viewport zurückgesetzt.

Screenshots: `test-results/reset-plan-20261013/loop{1,2}-{agenda,calendar}-{375,768,1280,1920}.png` und `browser-calendar-375.png`. E2E-Bilder haben bewusst eine feste Testuhr vom 12. Oktober; die laufende Browser-Vorschau zeigt Termine relativ zum heutigen Datum.

## Nächster Schritt

Nutzer prüft die geöffnete lokale Vorschau. Nach Freigabe kontrollierte Integration in den aktuellen Release-Stand und Verifikation mit echten öffentlichen Termindaten, bevor veröffentlicht wird.
