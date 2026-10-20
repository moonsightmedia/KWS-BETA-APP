# Startgriffe: Service und Bestandsprüfung

Die App kann Startgriffe farbig erhalten und den Hintergrund entsättigen. Eine
Griffkontur ist ein Modellvorschlag, keine geprüfte Annotation. Mehrere getrennte
Startgriffe sind möglich. Zahlenschilder unterstützen die Zuordnung, ersetzen
keine Kontrolle. Keine Auswahl, unbekannte Farbe oder ein Dienstfehler verändert
das Original nicht.

## Lokal starten

Python 3.12 und Node entsprechend dem Hauptprojekt verwenden. In einer eigenen
virtuellen Umgebung `pip install -r services/thumbnail-focus/requirements.txt`
ausführen. Unter Linux zusätzlich die DejaVu-Sans-Systemschriften installieren.
Dann `python services/thumbnail-focus/download_models.py` ausführen. Das Skript
lädt ausschließlich die beiden offiziellen ONNX-Dateien der fixierten HAN-Lab-
Revision und prüft SHA-256. Gewichte und Nutzerdaten werden nicht eingecheckt.

PowerShell, vom Repository aus (eigene Pfade einsetzen):

```powershell
$env:THUMBNAIL_LOCAL_ONLY='true'
python services/thumbnail-focus/server.py
```

In einer zweiten Shell:

```powershell
python services/thumbnail-focus/collect.py --env-file <aktuelle-Produktionskonfiguration> --expected-backend https://beta-api.kletterwelt-sauerland.de --data-dir .thumbnail-data-live
$env:THUMBNAIL_ENV_FILE='<vorhandene-lokale-Produktionskonfiguration>'
npx vite --config vite.thumbnail-review.config.ts
```

Die lokale Oberfläche liegt unter `/thumbnail-review-local`, die echte Uploadseite
unter `/setter/create`. **Keine Auth-Stubs:** Lesen/Prüfen der lokalen Sammlung
geht ohne Anmeldung; Online-Übernahme verlangt eine echte Setter-/Adminsession
in dieser lokalen App. Vor dem Login alle Prüfungen auf demselben Origin belassen.
`THUMBNAIL_MODEL_DIR` kann auf bereits verifizierte Gewichte zeigen.

Vor jedem Bestandslauf den Backend-Origin unabhängig aus dem aktuellen Livebuild
prüfen. Am20.10.2026 ist das `https://beta-api.kletterwelt-sauerland.de`.
Eine alte lokale `.env.production` mit der früheren Supabase-Cloud-Adresse ist
kein Produktionsnachweis. `--expected-backend` ist deshalb Pflicht; eine
abweichende Konfiguration wird vor einem Download oder Katalogschreiben abgewiesen.
Der obige getrennte Datenordner schützt bereits geprüfte Altbestände. Erst nach
geprüfter Übernahme des passenden Katalogs in `.thumbnail-data` die lokale
Oberfläche damit starten; Browser-Entscheidungen nicht löschen oder blind umschlüsseln.

`collect.py` liest den aktuellen Bestand in Seiten zu100, ohne Gesamtlimit.
Es verarbeitet alle sichtbaren Statuswerte, speichert Originalbytes getrennt und
setzt unterbrochene Analysen über inhaltlich gebundene Cache-Schlüssel fort.
Downloadfehler und nicht unterstützte Farben verschwinden nicht aus der Liste.
Das Skript verwendet ausschließlich GET; es ändert weder DB noch Mediendateien.
Aus Sicherheitsgründen sind Bilddownloads auf die bestehenden KWS-CDN-/Video-
Hosts sowie den aktuellen App-/API-Origin (migrierte Medien/Storage) begrenzt.
Andere Hosts erscheinen als Fehler und müssen explizit geprüft
werden. Die Zahl der Datensätze hängt von den Leserechten der Konfiguration ab.

## Nutzung

- Nach der Farbauswahl zeigt der echte Bouldereditor die kompakte Griffvorschau.
  Antippen wählt Kandidaten an/ab; ein Tipp auf einen fehlenden Griff ergänzt eine
  SAM-Fläche. Rückgängig, Originalvergleich und Original verwenden sind verfügbar.
- `/setter/thumbnails` ist im geschützten Setterbereich erreichbar. Der Upload-
  Stapel verlinkt die Ansicht, sobald die Funktion aktiviert ist. Ohne lokalen
  Katalog liest die Ansicht den Livebestand und verarbeitet ihn seriell über den
  konfigurierten Dienst. Analysen liegen in IndexedDB und werden wiederverwendet.
- „Passt“ speichert die Auswahl lokal. Korrekturen werden auch vor der endgültigen
  Bestätigung als Entwurf gespeichert. „Überspringen“/„Original behalten“ lassen
  das Onlinebild unverändert. Pink/Mint haben vorerst keine Farbautomatik; die
  farbunabhängige Tippsegmentierung funktioniert auch dort.
- Große oder am Bildrand abgeschnittene Griffe sind bei bewussten Tipps zulässig.
  Bei Teilflächen/verbundenen Nachbargriffen „Kontur nachzeichnen“ wählen:
  sichtbare Randpunkte antippen, Kontur übernehmen. „Punkt zurück“, Abbrechen und
  Rückgängig bleiben erreichbar. Außerhalb des Fotos liegende Teile werden nicht
  rekonstruiert. Alte Masken desselben Fotos bleiben über manuelle Dienstrevisionen
  korrigierbar; automatische Cache-/Prüfschlüssel ändern sich dadurch nicht.
  Der Anmeldelink führt nach erfolgreichem Login zur Prüfung zurück.
- „Online übernehmen“ verlangt eine gesonderte Mengenbestätigung. Es werden
  ausschließlich bestätigte Varianten übertragen. Leere Auswahl ist gesperrt.
  Eine laufende Sitzung ist kontogebunden und Rollen werden vor Upload live geprüft.
  Eine neue, eindeutig benannte Mediendatei wird erstellt; danach wird genau
  `thumbnail_url` mit Filter auf ID, ursprüngliche URL, Farben und hängenden Status geändert.
  Die tatsächliche zurückgegebene Zeile muss die neue URL bestätigen.
- Alte Originaldateien werden nicht gelöscht/überschrieben. Die Prüfaufzeichnung
  enthält Original-/Varianten-URL, Modell, Maske und lokale Originaldatei. Ein vor
  dem Cloudschreiben angelegter Beleg erlaubt Wiederaufnahme nach Netzwerkfehlern.
  Ein verlorenes erfolgreiches PATCH wird durch Lesen der Varianten-URL erkannt.
  Bei Konflikten wird gestoppt; hochgeladene, noch nicht verknüpfte Varianten können
  als verwaiste Dateien verbleiben. Kein automatisches Löschen von Mediendateien.
- JSON-Export sichert Entscheidungen, Konturen und URLs. Originalbytes verbleiben
  im lokalen Datenordner/IndexedDB; JSON ist kein vollständiger Medienexport.
  Wiederaufnahme gilt für denselben Browser und Origin. Ein Gerätewechsel oder
  Browserdaten-Löschen benötigt eine gesonderte Datenübernahme.
- Ein Rücksetzen auf das Original erfolgt als bewusster Setter-Edit oder anhand
  des Belegs per bedingtem PATCH von Varianten-URL zu Original-URL. Kein Bulk-
  Rollback ohne Prüfung. Neu hochgeladene Boulder nutzen die bestehende Medien-
  Queue; deren Rohfoto verbleibt zunächst im lokalen Entwurf, nicht als separates
  neues serverseitiges Originalfeld.

## Rollout – nicht Teil dieses PRs

Der Standardbuild bleibt unverändert, solange `VITE_THUMBNAIL_FOCUS` nicht `true`
ist und `VITE_THUMBNAIL_API_PATH` nicht auf einen erlaubten relativen Pfad zeigt.
Beispiel: `/thumbnail-focus`. Keine Modelldateien im Browserbundle.

Für den Betrieb den Python-Service mit den verifizierten Gewichten auf dem
bestehenden Server bereitstellen. Er bindet ausschließlich127.0.0.1:5227.
**`THUMBNAIL_LOCAL_ONLY` darf im Serverbetrieb nicht aktiviert sein.** Stattdessen
`THUMBNAIL_AUTH_URL` und `THUMBNAIL_PUBLIC_KEY` aus dem Secret-/Konfigurationssystem
bereitstellen. Der Service prüft Bearer bei GoTrue und Setter/Admin über `has_role`.
Keine Service-Role nötig. Reverse Proxy unter dem gleichen App-Origin einrichten,
Bearer weiterreichen, Bodylimit17MB, Timeout mindestens60s, Rate-/Verbindungslimit
und HTTPS konfigurieren. Es gibt kein CORS und keinen HTTP-Dateiserver. Modell-
Aufrufe sind auf einen gleichzeitig begrenzt; belegte Kapazität liefert429.
Der Reverse Proxy darf die Authentifizierung nicht durch einen Local-Only-Dienst
ersetzen. Fallback/Abschalten funktioniert durch Entfernen des App-Flags.

Erst Servicezugriff, Rolle, Bilder-CORS, Thumbnail-Medienupload und DB-RLS in der
Zielumgebung prüfen, dann das Flag aktivieren. Der PR führt **keine** Migration,
kein Deployment und keine automatische Bestätigung bestehender Fotos aus.
Die erste lokale Bestandsprüfung am20.10.2026 verwendete versehentlich die alte
Cloud-DB; deren Schemazustand war kein Nachweis für das aktuelle Produktionsschema.
Vor dem Rollout `volume_only` am tatsächlich konfigurierten Ziel prüfen und
Volumen-Datensätze gesondert behandeln. „Nur Volumen“ im neuen Uploadeditor behält
das Original. Der Katalog liest kompatible Felder.

## Quellen und Tests

Modell und Referenzimplementierung: MIT HAN Lab EfficientViT (MIT-Lizenz),
https://github.com/mit-han-lab/efficientvit und
https://huggingface.co/mit-han-lab/efficientvit-sam/tree/main/onnx.
Fixierte Revision und Hashes stehen im Downloadskript. ONNX Runtime wird nur mit
CPUExecutionProvider verwendet; keine Fotos verlassen den konfigurierten Service.

`node --test test/thumbnailPublish.test.mjs` prüft Rollen, Bestätigung, Backend- und
Kontogrenzen, Originalbeleg, CAS-Rennen, Quotenfehler und verlorene Antworten.
`python -m unittest discover -s services/thumbnail-focus -p 'test_*.py'` prüft den
HTTP-Vertrag und lokale Bildsegmentierung. Gewichte müssen dafür verfügbar sein.
