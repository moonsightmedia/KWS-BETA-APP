# Bestätigte Vorschauen und tatsächliches Produktionsziel

Die lokale Prüfliste basierte versehentlich auf einer alten Cloud-Konfiguration.
Die Produktions-App verwendet inzwischen `https://beta-api.kletterwelt-sauerland.de`.
Der frisch geladene Livebuild und Bitwarden-Konfiguration wurden abgeglichen.
Eine funktionierende historische DB ist kein Beleg für den aktuellen Livebestand.

Der echte abschließende UI-Export enthält103 Nutzerbestätigungen und1 Skip.
Alle vorherigen97 Bestätigungen inklusive51 geänderter Auswahlen sowie der Skip
blieben unverändert. Die letzten6 Bestätigungen stammen vom Nutzer. Alle103
Varianten wurden mit der App-Funktion `renderThumbnail` in einem separaten lokalen
Werkzeug gerendert und als PNG/ZIP gesichert. Keine Testfreigaben verwendet.

Der aktuelle Produktionsbestand enthält143 Boulder.32 der bestätigten IDs sind
vorhanden; deren neue migrierte Foto-URLs liefern exakt dieselben Originalbytes
(SHA-256) wie die vom Nutzer geprüften Bilder.71 bestätigte IDs existieren dort
nicht; auch kein Namensmatch. Für diese wurden keine Ersatzdatensätze angelegt
oder andere Boulder zugeordnet. Die alten Korrekturen bleiben lokal erhalten.

Auf ausdrücklichen Nutzerauftrag wurden ausschließlich die32 passenden Varianten
über den vorhandenen administrativen Zugang gespeichert: neue immutable PNGs im
vorhandenen öffentlichen `beta-videos`-Bucket, keine Rechte-/Bucketänderungen.
Vor jedem Write lokaler Originalbeleg, Liveprüfung von ID/Farben/Status/Foto,
danach bedingtes PATCH ausschließlich von `thumbnail_url`. Keine Originale gelöscht.
Die Foto-URL-Zuordnung zwischen Backends wurde erst nach exaktem Bytevergleich
zulässig. Kein Login umgangen oder neue Sitzung/Identität erzeugt.

Nachprüfung:32 neue öffentliche PNGs bytegenau zur gespeicherten Nutzervariante,
32 Original-URLs weiterhin erreichbar;111 andere Produktionszeilen unverändert.
An geänderten Zeilen ausschließlich `thumbnail_url` und automatisch `updated_at`
verändert. Kein App-Deployment oder Merge. Laufzeitgeheimnisse weder eingecheckt
noch in Nachweisen gespeichert. Die vollständigen Nutzerdaten, Belege und
Rücknahmezuordnungen bleiben außerhalb von Git.

`collect.py` verlangt jetzt einen unabhängig geprüften `--expected-backend` und
weist abweichende Konfigurationen vor Katalogänderungen zurück. Die KWS-App-/API-
Hosts sind für migrierte Fotos explizit erlaubt. Bestehende lokale Daten bleiben
unangetastet; ein neuer Livebestand muss separat gesammelt und geprüft werden.
Die übrigen111 aktuellen Live-Boulder haben durch diesen Lauf keine Nutzerfreigabe.
