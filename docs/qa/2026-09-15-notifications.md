# Benachrichtigungen – Umsetzung und Abnahme

Stand: 15.09.2026. Lokal im Worktree `KWS-BETA-APP-desktop-nav`, Branch
`codex/desktop-navigation-refresh`, Ausgangscommit `ce9aeae`, Version `1.0.226`.
Keine Commits, Pushes, Deployments, produktiven Datenänderungen oder echten
Testmitteilungen im Rahmen dieser Umsetzung. Bestehende andere Änderungen erhalten.

## Umsetzung

- Gemeinsame Liste statt getrennten Center-/List-Implementierungen. Mobile Bottom-
  Sheet 92dvh, Desktop-Popover mit Hover-Vorschau, Klick-Fixierung und korrektem
  Fokus. Bestehende KWS-Controls/Farben, keine neue Iconbibliothek oder Fonts.
- Serverseitige Alle/Ungelesen-/Themenfilter; stabile Cursor-Pagination nach
  Zeitstempel und ID. Kein Limit auf acht sichtbare oder 50 zugängliche Meldungen.
- Vollständige Texte, Datumsgruppen, lesbare Aktionen, genau ein innerer Scrollbereich.
- Kontoabhängige Query-Keys. GETs verwenden die vorhandene Session-Recovery und
  ein 15s-Abbruchsignal. Schreibvorgänge werden nicht automatisch wiederholt.
- Einzelstatus wird mit Rückgabe der geänderten Zeile bestätigt. Sammelstatus ist
  nach Konto/ungelesen/Zeitpunkt begrenzt und wird mit einer Folgeabfrage geprüft.
  Keine optimistische Erfolgsmeldung, die einen fehlgeschlagenen Write verdeckt.
- Fehlende Einstellungen sind ein Einrichtungszustand. Aktivierung legt explizit
  Präferenzen an (Push zunächst aus). Dies ist wichtig: Boulder-Empfänger werden
  derzeit aus vorhandenen Präferenzzeilen ermittelt, nicht aus allen Profilen.
- Der Master-Schalter entspricht der vorhandenen Backend-Kopplung: In-App aus
  verhindert neue Benachrichtigungszeilen und damit auch daraus erzeugte Pushes.
  Pausieren setzt deshalb beide Kanalflags zurück, behält Themen und Historie.
- Realtime einmal in Root, alle Änderungsarten aktualisieren Liste/Zähler.
  Empfang sendet keine weitere Push-Nachricht. Duplikate werden unterdrückt,
  kontobezogene Toasts beim Kontextwechsel entfernt. Polling/Refokus als Fallback.
- Native Registrierung: Listener vor register(), Erfolg erst nach Registrierungsevent
  UND bestätigtem Token-Upsert; Timeout, Fehler und Abbruch liefern keinen Erfolg.
  Keine Token-Logs. Deaktivieren löscht nicht mehr die Tokens aller Kontogeräte.
- Sichere bekannte lokale Ziele für In-App/native Aktionen. Versandservice ergänzt
  notification_id für Push-Aktionen, wo die gespeicherte Mitteilung bekannt ist.

## Prüfungen

- `node --test test/notifications.test.mjs test/pushRegistration.test.mjs`:
  11/11 bestanden. Owner/Filter/Cursor, Links, Zähler, Kalenderdatum, native
  Registrierung mit Plugin-Mocks, Speicherung, Zusammenfassen paralleler Aufrufe,
  Fehler, Timeout, Abbruch, verspätete Events und reine Empfangsaktualisierung.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 npx playwright test e2e/notifications.spec.ts --workers=1`:
  18/18 bestanden. Zwei visuelle Loops mit 375/768/1280/1920px; 67 Meldungen inkl.
  identischer Zeitstempel; Filter/Leerzustände; Fehler/Retry für Laden, ältere Seiten,
  Einzel-/Sammeländerung und Präferenzen; Einrichtung; Hover/Fokus/Klick/Escape;
  mobile Scroll-/Footer-Geometrie; Realtime ohne Versand; internes Öffnen ohne Reload.
- Scoped ESLint der neuen/geänderten Benachrichtigungskomponenten, Hooks, Utils,
  Fixture und E2E-Datei: keine Fehler oder Warnungen im Abschlusslauf.
- Gemeinsame Menüregression `e2e/app-chrome.spec.ts --grep 'hover|touch'`:
  3/3 bestanden (Profil und Glocke, Maus/Tastatur/Touch). Bestehende Fixture um
  QueryClientProvider ergänzt; eindeutiger Glockenselektor, neues Footer-Label,
  mobile nur obere Radien und nicht vom Popover verdecktes Außenziel angepasst.
- Produktionsbuild über `test-results/notifications-20260915/build-check.mjs`:
  erfolgreich, 3223 Module, Version bleibt 1.0.226. Helper entfernt ausschließlich
  den versionsschreibenden closeBundle-Hook und schreibt in eigenes Artefaktverzeichnis.
  Bestehende Warnungen zu Chunkgröße, gemischten Imports und Browserslist bleiben.
- Globales `tsc --noEmit -p tsconfig.app.json`: NICHT grün (80 Diagnosen in anderen
  Bereichen, unter anderem generierte DB-Typen, Query-API, Kalender, Ref-Typen).
  Keine Diagnose in NotificationCenter/List/Item/Settings, den Notification-Hooks,
  notificationRequest/notifications, Push-Utils/Service oder useHoverMenu. Keine
  pauschale Typfehlerfreiheit der App behaupten.
- Screenshots zeigen echte gerenderte Komponenten mit isolierten Testdaten und
  abgefangenen Backendzugriffen. Sie sind keine Live-/APNs-/FCM-Abnahme.

## Visuelle QA

Loop 1: vollständige Texte, neutraler Aufbau, feste Footer, mobile Außenkanten und
Desktopbreite geprüft. Test-CORS-Header für exakten Zähler korrigiert; Screenshot
wartet nun ausdrücklich auf 44 ungelesene Testmeldungen statt eines Ladezustands.
Loop 2: bestätigte Zähler, Desktop-Hover, Fokus-Rückgabe, leere Auswahl, Fehler und
gescrolltes mobiles Sheet geprüft. Kein horizontaler Overflow bei vier Zielbreiten.
Settings nutzt denselben Dashboard-Rahmen wie die App (Sidebar in isolierter Fixture
nicht gerendert). Vergleich: `test-results/notifications-20260915/comparison.html`.

## Noch vor Release zu erledigen

1. `supabase/migrations/20260915170000_notification_competition_preferences.sql`
   lokal vorbereitet, NICHT eingespielt: erweitert allein die Themenprüfung in
   create_notification auf competition_result/competition_leaderboard_change.
   Rollenprüfung und Service-Role-Beschränkung bleiben unverändert. Mit bestehender
   Datenbankversion vergleichen und in Testumgebung prüfen, dann gezielt anwenden.
2. Produktiven Dispatcher nachweisen: der im Repository definierte Trigger
   send_push_notification_for_notification ist nur ein No-op; ein Live-Webhook
   ist damit weder bewiesen noch ausgeschlossen. Der bestehende Boulder-Versand
   wurde nicht umgestellt. Für andere Typen entfällt der unzuverlässige Versand
   durch die gerade geöffnete Empfänger-App. Ohne separat funktionierenden Server-
   Dispatcher kommen diese weiterhin in die Inbox, aber kein Push ist garantiert.
   Kein blindes zusätzliches Webhook anlegen: erst vorhandene Zustellwege prüfen,
   sonst drohen doppelte Pushes. Authentifizierung und Idempotenz serverseitig prüfen.
3. Abnahme mit eigenen iPhone-/Android-Testgeräten: Erlauben/Ablehnen, Token speichern,
   gesperrtes Gerät/geschlossene App, Push antippen, Netzverlust, Berechtigung widerrufen,
   Konto deaktivieren/aktivieren und mehrere Geräte. Registrierung alleine reicht nicht.
4. Bei dieser Geräteabnahme auch Logout/Kontowechsel prüfen: Listener-Cleanup allein
   löscht keine serverseitige Tokenzuordnung. Das Verhalten des bestehenden Token-RLS
   beim Kontowechsel und OS-Zustellung nach Logout ist nicht hier nachgewiesen.
   Vor Freigabe gegebenenfalls gerätebezogene Abmeldung vor Auth-Abmeldung ergänzen.

## Quellen

Repository: Notification-/Push-Hooks und -Services, aktuelle Notification-Migrationen,
send-push-notification Edge Function, docs/DESIGN.md. Native API-Vertrag:
[offizielle Capacitor-Push-Dokumentation](https://github.com/ionic-team/capacitor-plugins/blob/main/push-notifications/README.md)
und [Typdefinitionen](https://github.com/ionic-team/capacitor-plugins/blob/main/push-notifications/src/definitions.ts).
