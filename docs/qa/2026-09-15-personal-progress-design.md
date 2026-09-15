# Persönlicher Fortschritt – Design- und Datenvertrag

Ziel: Auf einen Blick verstehen, was ich geklettert habe und was ich als Nächstes klettern möchte. Bestehende KWS-Farben, Typografie, Radien und Navigation bleiben erhalten.

## Struktur

- Statistiken: „Fortschritt / Meine Boulder“. Fortschritt mit 7 Tagen, 30 Tagen und Gesamt; abgeschraubte Boulder bleiben Teil der persönlichen Historie. Kein Vermischen von Zeitraum und Wandstatus.
- Kennzahlen: einzigartige getoppte Boulder einschließlich Flashes, Flashes als Teilmenge, eindeutige Klettertage aus Tagesprotokollen und höchster erfolgreich gekletterter Grad. Versuche aus Tagesprotokollen, keine geschätzten Besuche oder erfundenen Trends.
- Gradverteilung und Tagesaktivität aus denselben gefilterten Daten. Wiederholte Tops desselben Boulders nicht doppelt zählen. Unbekannter Grad bleibt unbekannt.
- Meine Boulder: offene Projekte getrennt von gespeicherten Bouldern; abgeschlossene Projekte ausdrücklich sichtbar, entfernte Boulder gekennzeichnet. Suche und Wandstatus gelten nur hier, nicht für historische Statistik. Entfernen einer Markierung verändert weder Tagesprotokoll noch Erfolg.
- Home: vollständige Trackingdaten, korrekter Zeitraum, vollständige transformierte Boulder für Karten; fehlende Daten haben einen sicheren Fallback. Fehler und Laden niemals als 0 oder leere Sammlung ausgeben.
- Fehlerseiten: deutsch, KWS-Flächen, klare sichere Rückwege, explizites Wiederholen. Kein zeitgesteuertes Verwerfen einer Fehlerbeschreibung.

## Technische Regeln

Eigene Trackingdaten vollständig paginieren, stabil nach ID; Metadaten in begrenzten ID-Paketen. Nur lesende Abfragen. Persönliche Query-Keys enthalten das Konto. Sessions-Mutationen invalidieren die persönliche Zusammenfassung. Tagesdatum ist ein lokaler Kalendertag, nicht updated_at eines Favoriten.

## Gestaltung und Abnahme

Mobile einspaltig, Desktop sinnvolle Zweispaltenanordnung für Verteilung/Aktivität und kompakte Sammlung. Gemeinsame 44px-Controls, 4/8/12px-Radien, Markengrün mit dunkelblauem Text, klare Beschriftungen und Tastaturfokus. Kein neuer Font, keine neue Library, keine dekorative KPI-Wand. Zwei QA-Loops bei 375/768/1280/1920, reine Kennzahltests, Pagination, Fehler/Leerzustände, Markierungen und Links mit isolierten Daten. Vorher-/Nachherbelege getrennt halten. Kein Produktionswrite oder Release ohne Auftrag.
