# Lokal mit vorhandenen App-Daten starten

Im UI-Worktree `KWS-BETA-APP-desktop-nav`:

```sh
npm run dev:connected
```

Öffnet den lokalen Vite-Entwicklungsserver unter `http://127.0.0.1:5173` und
lädt die vorhandene `.env.production`. Der Vite-Modus wählt hier die
Konfiguration; dieser Befehl baut oder veröffentlicht keine App.

Wichtig: Die lokale Oberfläche verwendet damit die konfigurierten echten
Backend-Dienste. Speichern, Uploads und Löschen können echte Daten verändern.
Für automatisierte Tests weiterhin isolierte Fixtures und gesperrte externe
Anfragen verwenden.

`npm run dev` bleibt für eine separat eingerichtete Entwicklungsumgebung bzw.
isolierte UI-Tests bestehen. Es lädt `.env.production` nicht automatisch.
Keine Schlüssel aus Env-Dateien in Dokumentation, Logs oder Code kopieren.

Nach einem Start nicht nur HTTP 200 prüfen: Die Boulder müssen sichtbar geladen
sein. Bei einer bestehenden Anmeldung führt `/guest` nach `/boulders` weiter.
