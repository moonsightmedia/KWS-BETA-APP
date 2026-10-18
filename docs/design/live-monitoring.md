# Live-Nutzung im bestehenden KWS-Cockpit

## Richtung und Referenzen

Ruhig und auf einen Blick beantworten: Wie viele nehmen gerade teil, welche
Boulder sind geöffnet? Bestehende Launch-Übersicht und Fehlerdetails dienen als
Flow- und Stilreferenz: Navigation erhalten, Live vor historischen Kennzahlen,
keine weitere Adminseite und keine technische Ereignisliste als Einstieg.

Übernommen werden KwsSurface, Poppins, vorhandene semantische Farben, Lucide,
4/8/12px-Radien, kompakte Listen und bestätigte statt geschätzte Kennzahlen.
Abgelehnt sind Weltkarten, Personenprofile, laufende Animationen und große
dekorative KPI-Wände. Keine neuen Bild- oder Komponentenbibliotheken.

## Darstellung und Zustände

- Übersicht: kompakte Live-Zahlen und zwei Boulder mit direktem Detailzugang,
  danach Fehlerprioritäten, erst danach historische Statistiken. Aktivität zeigt
  die vollständige Live-Ansicht mit nachgeordneter älterer Aktivität.
- Zwei dominante Zahlen, Online und Boulderbetrachter;
  Aufteilung in angemeldete Konten, Gäste und Geräte nachgeordnet.
- Mobil zwei Zahlen nebeneinander, Aufteilung darunter; absm drei Spalten.
  Lange Bouldernamen umbrechen. Erst acht Boulder, weitere explizit aufklappbar.
- Links öffnen echte vorhandene Boulder. Einladungs-, Lade-, Null-, Fehler-,
  abgelaufener, Hintergrund- und Wiederverbindungszustand sind unterscheidbar.
- „Live verbunden“ nur mit WebSocket-Abonnement und frischer RPC-Antwort.
  Ersatzabfragen alle15Sekunden heißen ausdrücklich „Verzögert“.
- Das historische Auto-Update schaltet die getrennte Live-Verbindung nicht ab.
  Tage gelten nicht für Jetzt; Plattform und Version gelten für beide.
- Keine Daueranimation, keine Farb-allein-Zustände, zugängliche Überschriften,
  Tastaturfokus und mindestens44px große Navigations-/Retry-Ziele.

## Vertrauensgrenzen und Datenvertrag

Clients dürfen nur ihren zufälligen Fensterstatus melden. Der Edgehandler prüft
das Auth-Bearer beim Authdienst; ein Konto kann nicht im Body behauptet werden.
Privilegierter RPC nimmt ausschließlich bereinigte Statusfelder an. Serverseitige
Zeit, sequenzielle Updates, Mengenlimits und ein45Sekunden-Lease verhindern
alte Offlineereignisse als neue Anwesenheit. Kein persistenter Offlinepuffer.
Es wird nur ein aktueller Zustand pro Fenster gespeichert, kein Live-Verlauf.

Die Rohstatustabelle ist weder anonym noch für normale Konten oder Adminclients
direkt lesbar. Ein nur für Admins RLS-lesbarer Einzelzeilen-Revisionsmarker
signalisiert Änderungen über Supabase Realtime; er enthält keine Identitäten.
Der separat autorisierte Snapshot liefert ausschließlich aggregierte Werte.
Keine DELETE-Abonnements: Die RLS-Besonderheiten solcher Ereignisse werden
dadurch nicht für Live-Daten verwendet.

Alte Statistikfreigabev1 wird nicht übernommen. Version2 erklärt die zusätzlichen
Live-Zahlen, bleibt freiwillig, auch für Gäste widerrufbar und gerätebezogen.
Kontolöschung entfernt zugeordnete Live-Zustände per Fremdschlüssel. Abgelaufene
Zustände werden bei weiteren Meldungen und über die vorhandene tägliche Wartung
entfernt. Bereits bestehende Diagnose-/Historienaufbewahrung bleibt unverändert.

## Prüfinventar

SQL: Rollen/Leserechte, Mehrfachfenster/-geräte, Gäste/Konten, Boulderwechsel,
serverseitiger Ablauf, verspätete Sequenzen, Test-/Adminausschluss, Kontolöschung,
Wartung und idempotente Migration. Client: unbekannte/alte Auswahl, Zustimmung,
Widerruf, Vorder-/Hintergrund, Netzwechsel und kein verspäteter Offline-Replay.

UI Loop1:375/768/1280/1920px, Hierarchie, Umbruch, Touchziele, kein Overflow.
Loop2: Push-Änderung, Abbruch/Wiederverbindung, Fehler statt0, bestätigte0,
Zeit-/Plattformfilter, Auf-/Zuklappen, Tastatur, Hintergrund und abgelaufene Werte.
Isolierte UI-Fixtures sind kein Beleg für produktive WebSocket-/Gerätetransporte.

## Quellen

- [Supabase Postgres Changes und RLS](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
- `docs/DESIGN.md` und vorhandenes Launchcockpit.
