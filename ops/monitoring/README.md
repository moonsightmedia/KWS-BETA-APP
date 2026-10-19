# Externe KWS-Erreichbarkeitsprüfung

Die KWS-Produktion läuft auf dem eigenen Hostinger-VPS. Die drei Prüfungen
laufen jede Minute auf einem anderen Server. Seit der ausdrücklichen Freigabe
am 19.10.2026 ist für alle drei Prüfungen die bestehende Telegram-Alarmroute
aktiv. Es wurde kein neuer kostenpflichtiger Dienst eingerichtet.

| Prüfbereich | Öffentliche Adresse | Manifest |
| --- | --- | --- |
| KWS Beta App | https://beta.kletterwelt-sauerland.de/ | ../../moonsight.monitoring.yaml |
| KWS Beta API | https://beta-api.kletterwelt-sauerland.de/auth/v1/health | api/moonsight.monitoring.yaml |
| KWS Beta Videodienst | https://video.kletterwelt-sauerland.de/health | video/moonsight.monitoring.yaml |

Jede Adresse hat einen eigenen Hub-Projekteintrag, weil das sichere
Website-Onboarding genau eine URL pro Projekt registriert. Alle drei Einträge
wurden am 18.10.2026 durch die serverseitige Vorschau und Bestätigung angelegt.
Die lokalen Manifeste übernehmen die dabei vergebenen stabilen Projektkennungen
und die tatsächlich registrierte Konfiguration, nicht einen neuen Zufallswert.
Zieladressen werden serverseitig verwaltet; das Manifest enthält nur Referenzen.

## Freigabe am 19.10.2026

Die serverautoritative Vorschau und Bestätigung änderte je Projekt ausschließlich
`alertMode` von `shadow` auf `live`. Die Prüfungen und Integrationen zeigen
ebenfalls effektiv `live`; Projektkennungen, Ziele, Route und Aufbewahrung
blieben unverändert. Alle drei Komponenten hatten frische gesunde Messungen,
der Hub war bereit, die Warteschlangen leer und das Backup aktuell. Der externe
Google-Apps-Script-Wächter hat genau einen aktiven Minuten-Trigger und aktuell
erfolgreiche Ausführungen. Eine klar bezeichnete Telegram-Zustellprobe wurde
mit echtem Provider-Receipt angenommen. Dafür wurde kein Kundendienst gestoppt
und kein künstlicher KWS-Ausfall erzeugt. Ein echter KWS-Ausfall-/Recovery-Zyklus
wurde in dieser Abnahme nicht provoziert.

Bei bestätigtem Ausfall folgen die bestehende Störungsmeldung und bei Erholung
die Entwarnung über Telegram. Das ist getrennt von den bestehenden E-Mail-
Benachrichtigungen für kritische App-Fehler. Der Google-Wächter überwacht die
Betriebsbereitschaft des Hubs und hat einen eigenen E-Mail-/Telegram-Weg.

## Was die Messung belegt

- HTTP 200, öffentliches DNS, gültiges TLS und rechtzeitige Antwort der Adresse.
- Zwei aufeinanderfolgende Fehlmessungen eröffnen eine Störung; zwei Erfolge
  schließen eine bestehende Störung wieder. Einzelwerte bleiben sichtbar.
- Der API-Check deckt den Auth-Gesundheitsendpunkt ab, nicht jede Datenbankabfrage.
- Der Video-Check deckt den Gesundheitsendpunkt ab, nicht eine Videowiedergabe.
- Keine Nutzerbeobachtung, Store-Downloads, Rohlogs oder native Crash-Erfassung.
- Getrennter Prüfserver, aber derselbe Hostinganbieter: kein vollständiger
  Schutz gegen einen Ausfall des gesamten Anbieters. Der Google-Wächter liegt
  außerhalb dieses Anbieters und prüft den Hub, nicht sämtliche App-Funktionen.

Der generische Hub-Anschluss liefert keine Framework-/Hosting-Telemetrie;
deshalb bleiben dessen Runtime-Felder bewusst `unknown`. Das bedeutet fehlende
Metadaten, nicht fehlgeschlagenes Hosting und auch keinen vollständigen
Gesundheitsnachweis. Das lokale Erkennungswerkzeug kennt Vite nicht und findet
historische Vercel-Dateien. Daraus darf keine Vercel-Produktionsanbindung
abgeleitet werden. Hostinger ist durch Betrieb und Nutzerfreigabe bestätigt.

## Reproduzierbare Kontrolle

Im Moonsight-Monitoring-Workspace mit dessen vorhandener CLI für jeden der drei
Manifestordner ausführen:

```text
pnpm moonmon validate --offline --strict --cwd <Manifestordner> --json
pnpm moonmon plan --offline --cwd <Manifestordner> --json
pnpm moonmon init --mode adopt --confirm-detection --cwd <Manifestordner> --write
```

Erwartet: gültig, keine lokalen Aktionen und keine neue Dateiänderung.
Eine Offline-Prüfung bestätigt nicht den aktuellen Serverzustand. Diesen im
Hub-Dashboard über die anklickbaren Projekte und frische tatsächliche Checks
prüfen. Neue Ressourcen, Zieländerungen oder Alarmfreigaben brauchen erneut
einen serverautoritativen Plan und die passende Bestätigung; niemals Tabellen
direkt ändern oder ein Offline-Planfile als Freigabe verwenden.
