# Sitzung, Zähler und Einzahl – 15.09.2026

## Umfang und Befund

Arbeitskopie: `KWS-BETA-APP-desktop-nav`, Branch `codex/desktop-navigation-refresh`,
Basis `ce817e3`, App-Version unverändert `1.0.226`. Vorhandene andere Änderungen
bleiben erhalten. Kein Commit, Push, Deployment, Datenbankumbau oder echter Testupload.

- **Bestätigter Fehler, major:** Der bisherige Auth-Callback wartete selbst auf
  Supabase-Abfragen. Der installierte SDK hält dabei seine Auth-Sperre und wartet
  auf den Callback. Ein isolierter Test mit echtem SDK und diesem Muster bleibt
  hängen; die korrigierte Variante beendet Refresh und anschließendes getSession.
  Das belegt den Mechanismus, nicht rückwirkend jede einzelne Live-Störung.
- **Bestätigter Fehler, major:** Frische Tokens desselben Benutzers wurden beim
  Zurückkehren nicht zuverlässig in den React-Kontext übernommen. REST-Aufrufe
  konnten noch den alten Token verwenden. Ein HTTP-Fehler bei Rollenabfragen
  durfte zudem keine vermeintliche Rollenentziehung in den Navigationscache schreiben.
- **Bestätigter Fehler, minor:** Bei fehlerhaften/teilweise geladenen Daten blieben
  Ergebniszahlen, Schnellfilterzahlen und Pagination sichtbar. Einzahl fehlte
  bei Sektoren und ausgewählten Teilbereichen.

## Umsetzung

- Auth-Callback synchron; Netzwerk-Arbeit in einen späteren Task ausgelagert.
  Keine Profil-Synchronisierung bei TOKEN_REFRESHED; doppelte initiale bzw.
  unveränderte Profil-Synchronisierung beim Tab-Wechsel vermieden.
- Zentraler, zeitlich begrenzter Session-Koordinator für authentifizierte REST-
  Aufrufe. Verwendet die aktuelle SDK-Sitzung; bündelt parallele Erneuerungen.
  Ein eindeutig mit JWT expired abgelehnter GET/HEAD wird höchstens einmal
  wiederholt. Keine Wiederholung von RPCs oder POST/PATCH/DELETE durch diesen
  Mechanismus; globale automatische Mutation-Retries abgeschaltet.
- Konto-Grenzen geprüft. Öffentliche Requests bleiben öffentlich, andere Origins,
  Storage-/Upload- und Auth-Endpunkte werden unverändert weitergereicht. Offline-
  und Serverfehler erzwingen keinen Logout. Backend-RLS bleibt unverändert führend.
- Bei endgültig ungültiger Sitzung gesperrte erneute Anmeldung für dasselbe Konto
  über der bestehenden Seite. Editor und Eingabe bleiben gemountet. Falsches
  Passwort verwirft keinen Entwurf. Explizites Abmelden benennt den Datenverlust.
  Dies ist keine Zusicherung einer Wiederherstellung nach Reload/App-Abschuss.
- Setter-Zähler, Nachladen und Sammelaktionen nur bei gültigen Daten; Retry zeigt
  einen gesperrten Ladezustand. „1 Sektor“ / „1 Teilbereich“ statt falscher Mehrzahl.
- Zusätzlich im Regressionstest gefunden: schnelles Escape/Focus-Rückkehr der
  Upload-Übersicht instabil, besonders bei 375/768px. Explizite Trigger-/Schließen-
  Fokusführung und lokaler Escape-Fallback, mit bestehender Dateiauswahl-Sperre.

## Prüfung

- `node --test test/sessionRecovery.test.mjs`: **22 bestanden**. Parallelität,
  Ablauf, Timeout, Abbruch während Refresh, Konto-Wechsel, Offline, nicht-authentische
  Fehler, ausbleibende Mutations-/RPC-Wiederholung und öffentliche Requests.
- Echte SDK-/AuthProvider-Fixture: **9 bestanden**, einschließlich Legacy-
  Gegenprobe, Token-Wechsel beim Resume, Rollenfehler, tatsächlicher Karten-/
  Planungshooks und erneuter Anmeldung über offenem Editor bei 375/768/1280/1920px.
- Setter-Regression: Erstellen, Bearbeiten, Status, Planung, Navigation,
  Berechtigungs-Routing, zwei Entwürfe, Filter, Statusgruppen, Kalender,
  Ladefehler/echte Leerzustände und die gemeinsame FAB-/Upload-Leiste.
  Abschließender kombinierter Lauf: **31/31 bestanden (1,3 Minuten)**,
  `test-results/session-recovery-20260915/accepted`.
- Erster Gesamtlauf war **29/31**, danach gezielt die Escape-/Fokusfehler behoben;
  erneuter isolierter Upload-Leisten-Lauf **4/4 bestanden**. Fehler nicht durch
  Abschwächen der Assertions oder Entfernen der Fälle umgangen.
- Visuelle Schleife 1: Reauth-Dialog in vier Breiten; Fokus auf Passwort gelegt.
  Schleife 2: abgeschnittenen Fokusring behoben und alle vier Breiten erneut
  angesehen. Fehleranzeigen zusätzlich mobil/desktop geprüft. App-Tokens unverändert.
- Production-Build per isoliertem Vite-Aufruf erfolgreich, ohne Versionsbump.
  Bekannte Warnungen zu großen Bundles, gemischten Imports und alter Browserslist.
- Gezieltes ESLint: keine Fehler, zwei vorhandene Auth-Hook/Refresh-Warnungen.
  Strikter Typecheck des neuen Session-Kerns erfolgreich. Projektweiter Typecheck
  weiterhin nicht grün: bestehende Schema-/React-Query-/Komponententypfehler u.a.
  in UploadContext, useAuth, App und Admin-Komponenten; kein vollständiger Typ-Cleanup.
- Laufende App im vorhandenen Browser **nur lesend** geprüft: Planung erreichbar,
  Status zeigt 104 Boulder / 17 Sektoren, ohne sichtbaren Sitzungsfehler. Zur
  Planung zurückgekehrt. Vorhandene Uploads nicht gestartet, gelöscht oder geändert.

Alle Fehler-/Schreibtests nutzen isolierte Fixtures mit blockierten externen
Requests, Fake-Sitzung und gemocktem Backend. Keine echten Credentials, kein
echter Ablauf der Benutzersitzung künstlich herbeigeführt. Browser-Desktop und
emulierte Größen sind **kein** iPhone-/Android-Hintergrundtest.

Screenshots: `test-results/session-recovery-20260915/{375,768,1280,1920}-reauth.png`,
entsprechende `-counter-error.png` und `-singular.png`.

## Vor Veröffentlichung

Auf echtem iPhone und Android mit Testkonto: App länger im Hintergrund lassen,
zurückkehren, Netzwerk unterbrechen/wiederherstellen und einen offenen Entwurf
erneut anmelden. Danach den geprüften Arbeitsstand getrennt committen/veröffentlichen.

Quellen: installierter `@supabase/auth-js`-Quellcode (`_acquireLock`,
`_notifyAllSubscribers`), [Supabase Auth-Callback-Dokumentation](https://supabase.com/docs/reference/javascript/auth-onauthstatechange),
[Supabase: nicht zurückkehrende API-Aufrufe](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0).
