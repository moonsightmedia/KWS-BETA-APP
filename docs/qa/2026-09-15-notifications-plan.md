# Benachrichtigungen – Arbeitsrahmen

Ziel: Meldung finden, vollständig lesen, zum richtigen Inhalt wechseln und selbst bestimmen, was ankommt. Bestehende KWS-Farben, 4/8/12px-Radien und gemeinsame Controls bleiben unverändert.

- Ein gemeinsamer Posteingang statt zweier voneinander abweichender Listen. Desktop als Hover-/Klick-Popover, mobil als randbündiges Bottom-Sheet. Alle/Ungelesen, Themen, ältere Meldungen, vollständige Texte und feste Kopf-/Fußaktionen.
- Kontoabhängige Query-Keys, serverseitige Filter und stabile Pagination. Fehler sind keine Nullwerte. Gelesen-Änderungen werden bestätigt, Fehler bleiben bedienbar; bloßes Öffnen markiert nichts.
- Einstellungen unterscheiden Kontopräferenzen und Geräteberechtigung. Laden/Fehler/Speichern sind ausdrücklich sichtbar. Browser-Push bleibt deaktiviert, Markengrün bleibt unverändert.
- Empfang darf keinen erneuten Push-Versand auslösen. Eine zentrale, kontogebundene Realtime-Anbindung aktualisiert den Posteingang, Polling/Refokus decken Unterbrechungen ab. Sichere interne Linkauflösung für In-App- und native Push-Aktionen.
- Push-Registrierung gilt erst nach Registrierungsevent und bestätigter Speicherung als erfolgreich, nicht schon nach Aufruf von register(). Keine Tokens im Log. Produktivversand/Backend-Konfiguration bleibt unangetastet; tatsächliche Hintergrundzustellung benötigt Geräte-/Backend-Abnahme.

Prüfung: isolierte Testdaten; vor/nach bei 375/768/1280/1920px; Layout-Loop, Interaktions-/Fehler-Loop, Daten-/Hookregressionen, Produktionsbuild ohne Versionsbump.
