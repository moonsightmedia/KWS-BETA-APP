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
- In der Bestandskorrektur öffnet „Korrigieren“ unmittelbar die große Griffauswahl.
  Der zusätzliche Klick auf „Griffe antippen“ entfällt. Im Uploadeditor bleibt
  der kompakte Vorschau-Einstieg erhalten. Die lokale Operatoransicht unter
  `/test/thumbnail-live-review.html` verwendet ausschließlich den separat frisch
  vorbereiteten `.thumbnail-data/live-review/catalog.json` mit festem aktuellem
  Produktions-Origin. Sie übernimmt keine alten Backend-Entscheidungen auf neue
  Bilder. Lokale Entwürfe/Bestätigungen bleiben in derselben IndexedDB, mit
  getrennten Schlüsseln für Produktionsquelle, Bild-URL, Farbe und Cacheidentität.
  „Auswahl passt · Weiter“ speichert vor dem Wechsel zum nächsten offenen Foto.
  Der Export `live-thumbnail-pruefung.json` enthält nur die aktuelle Produktions-
  quelle; die32 bereits publizierten IDs/URLs werden als Belegmetadaten exportiert,
  nicht als neue künstliche Bestätigungen. Diese explizite lokale Einstiegsdatei
  ist kein Produktionsroute und erscheint nicht im regulären Build.
  Die lokale Vorbereitung kann aus einem frisch verifizierten öffentlichen
  Katalog (`source`, `verified_at`, `rows`, einschließlich `published`-Belegen)
  fortgesetzt werden, ohne bestätigte oder bereits publizierte Bilder neu zu
  analysieren:

  ```powershell
  python services/thumbnail-focus/prepare_local_review.py --catalog .thumbnail-data/live-catalog.json --expected-backend https://beta-api.kletterwelt-sauerland.de
  ```

  Das Werkzeug lädt nur öffentliche Fotos und schreibt lokale Ergebnisse. Es
  überspringt belegte `published`-Zeilen. Unbekannte Farben erhalten ein leeres,
  direkt korrigierbares Ergebnis. `Schwarz-Gelb` verarbeitet beide Farben. Optional
  kann `--references <Nutzerexport>` eine bestätigte Auswahl desselben Foto-Hashes
  als Vorschlag wiederverwenden; daraus entsteht keine Bestätigung für eine neue ID.
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

## Geschützter Serverbetrieb

Der Standardbuild bleibt unverändert, solange `VITE_THUMBNAIL_FOCUS` nicht `true`
ist und `VITE_THUMBNAIL_API_PATH` nicht auf einen erlaubten relativen Pfad zeigt.
Beispiel: `/thumbnail-focus`. Keine Modelldateien im Browserbundle.

Für den Betrieb den Python-Service mit den verifizierten Gewichten auf dem
bestehenden Server bereitstellen. Standard ist ausschließlich127.0.0.1:5227.
Für die verifizierte Hostinger-Docker-Topologie gibt es zwei getrennte,
unprivilegierte Container ohne veröffentlichte Hostports: Produktion ausschließlich
im bestehenden `supabase_default`, Store-Review ausschließlich im bestehenden
`kws-store-review-private`. Nur dort erlaubt der explizite Container-Guard
`THUMBNAIL_BIND=0.0.0.0`; der öffentliche Gateway-Proxy erreicht die privaten
Containernamen auf5227 beziehungsweise5228. Kein Hostnetz und kein neues
Egressnetz. Die Modellgewichte dürfen beide Instanzen ausschließlich lesend teilen;
Sitzungen, Auth-Konfiguration und Bild-Zwischenspeicher bleiben getrennt.
**`THUMBNAIL_LOCAL_ONLY` darf im Serverbetrieb nicht aktiviert sein.** Stattdessen
`THUMBNAIL_AUTH_URL` und `THUMBNAIL_PUBLIC_KEY` aus dem Secret-/Konfigurationssystem
bereitstellen. Der Service prüft den Bearer bei GoTrue und fragt anschließend
`user_roles` ausschließlich für die dort bestätigte UUID mit derselben JWT über
die bestehende RLS ab (`select=role`, Filter Setter/Admin, `limit=1`). Nur eine
explizite Rolle `setter` oder `admin` gibt den Modellaufruf frei; die überladene
RPC `has_role` wird nicht verwendet. Keine Policy-/Datenbankänderung erforderlich.
ONNX-Telemetrie wird vor Erzeugung der CPU-Sitzungen explizit deaktiviert.
Konfiguration mit einer Service-Role/Secret-Key wird zurückgewiesen. Auth-Redirects
werden nicht mit Bearer verfolgt. Reverse Proxy unter dem gleichen App-Origin und
den jeweiligen API-Origins einrichten, Bearer weiterreichen, Bodylimit17MB und
Timeout mindestens60s. Native Apps und die Web-Demo nutzen den jeweiligen
API-Origin; die normale Web-App ihren relativen Pfad. `THUMBNAIL_ALLOWED_ORIGINS`
nennt ausschließlich den App-Origin sowie `https://localhost`,
`capacitor://localhost`, `http://localhost`. CORS erlaubt nur POST/OPTIONS und
Authorization/Content-Type, keine Cookies/Wildcards. Es gibt keinen HTTP-Dateiserver.
Vier HTTP-Anfragen und ein Modellaufruf sind gleichzeitig möglich; überzählige
Anfragen erhalten429. Pro verifiziertem Konto sind30 Anfragen je60Sekunden erlaubt;
der Rate-Zustand ist auf4096Konten begrenzt und verfällt. JSON ist auf17MB,
dekodierte JPG/PNG/WebP auf12MB/30Megapixel begrenzt. Andere Bildformate werden
auch serverseitig abgelehnt.
Der Reverse Proxy darf die Authentifizierung nicht durch einen Local-Only-Dienst
ersetzen. Fallback/Abschalten funktioniert durch Entfernen des App-Flags.

Verifizierbare Deployment-/Rollbackschritte, Ressourcenlimits, Readiness und der
über die vorhandene verschlüsselte Sicherung erfasste Wiederherstellungsbeleg
stehen in `ops/hostinger/thumbnail-focus/README.md`. Noch vor dem ersten CPU-Laden
werden Größe und SHA256 der beiden fixierten ONNX-Dateien erneut geprüft. Nur
CPUExecutionProvider wird akzeptiert. Das Gesundheitsziel gibt erst danach200 aus.

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
`python -m unittest discover -s services/thumbnail-focus -p test_security.py`
prüft den HTTP-/Auth-/Origin-/Payload-/Ressourcen-/Modellidentitätsvertrag mit
ausschließlich Pillow12.3.0; keine Gewichte, OpenCV oder ONNX nötig.
`python -m unittest discover -s services/thumbnail-focus -p 'test_*.py'` prüft den
HTTP-Vertrag und lokale Bildsegmentierung. Gewichte müssen dafür verfügbar sein.
