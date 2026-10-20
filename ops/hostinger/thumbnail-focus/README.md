# Thumbnail-Focus – private Hostinger-Laufzeit

Dieser Ablauf ergänzt ausschließlich den explizit freigegebenen Dienst. Er
verändert keine Boulder, Fotos oder früheren Nutzerexporte. Das App-Flag bleibt
bis zum erfolgreichen Betriebsnachweis aus. Produktionsänderungen führt der
Release-Verantwortliche nach Prüfung der konkreten Dateien aus.

## Feste Grenzen

- Zwei UID10001-Container, kein privilegierter Modus, keine Hostports/Hostnetze.
  Produktion ausschließlich `supabase_default`, Review ausschließlich
  `kws-store-review-private` (bestehend, `internal=true`).
- Gateway bleibt ausschließlich in diesen beiden bisherigen Netzen. Die
  zusätzlichen DNS-Aliase `beta-api.kletterwelt-sauerland.de` im Produktionsnetz
  und `review-api.kletterwelt-sauerland.de` im Reviewnetz führen Auth-Anfragen
  über echtes HTTPS/SNI zum bestehenden Gateway. Kein zusätzlicher Review-Egress.
- Rootfs und gemeinsamer Modellmount sind read-only. Getrennte GoTrue-/Anon-Key-
  Konfigurationen; keine Service-Role oder gemeinsamen User-JWTs. Die Service-
  Startprüfung verwirft Local-Only im Serverbetrieb und nichtöffentliche Schlüssel.
- Ein Modellaufruf/Instanz, vier HTTP-Worker/Instanz,30Anfragen/Konto/Minute.
  Je1536MiB RAM,64 PIDs; Produktion maximal1CPU,Review maximal0,5CPU. CPU-only
  ONNX, begrenzte NumPy-/OpenCV-Threads; keine GPU. Diese Grenzen sind nach dem
  Start mit tatsächlicher RSS/CPU und einem synthetischen Foto zu prüfen.
- Keine HTTP-Bilddownloads oder Dateifreigabe, keine Bild-/Tokenlogs. Nur die
  beiden letzten Bild-Embeddings können im flüchtigen Prozessspeicher liegen;
  kein persistierter Fotosatz. Auswahl bleibt menschlich zu bestätigen.

## Modelle und Abhängigkeiten

Offizielle Quelle: [MIT HAN Lab EfficientViT-SAM](https://huggingface.co/mit-han-lab/efficientvit-sam/tree/e4668c026bd3743c6011cc5453dbe32d4d67cadf/onnx).
Revision `e4668c026bd3743c6011cc5453dbe32d4d67cadf`, am20.10.2026 direkt gegen
die offiziellen HuggingFace-LFS-Metadaten geprüft:

| Datei | Bytes | SHA256 |
| --- | ---: | --- |
| l0_encoder.onnx |123112917|7a37ebd16e65c31253416e33897e7e6b07699127765d538e99ecbfaa3ad1e727|
| l0_decoder.onnx |16470362|053e72c5703736a8a8a92482c9990c4a26dde9dcb7ff26b05843cf0bc433f42f|

Gesamt139583279Bytes. Download und jedes neue Modellladen prüfen **Größe und
Hash**. Download hat ein festes Größenmaximum und ersetzt Dateien erst nach
erfolgreicher Prüfung. Vorhandene partielle Dateien verlangen eine Operatorprüfung.
Keine Gewichte in Git, Docker-Buildkontext, Browserbundle oder regulärem Backup.

Alle vier in `requirements.txt` fixierten Pakete haben passende offizielle
CPython3.12/Linux-x86_64-Wheels: onnxruntime1.31.0, OpenCV-headless5.0.0.93,
NumPy2.3.5 und Pillow12.3.0. Basis: offizielles Python3.12-slim-bookworm,
**vor dem Build zu einem konkreten Repository-Digest auflösen**. Die installierten
Pakete und der Basis-Digest werden beim Betrieb dokumentiert, kein Floating-Tag
als Freigabenachweis. Modelle bleiben bei fehlender Kompatibilität unverändert;
keine automatische Lockerung der Versionen.

## Geprüfte Vorbereitung und Installation

1. Quellrevision committen/frieren und den exakt geprüften öffentlichen Quellstand
   auf den VPS übertragen. Root legt `/opt/kws/thumbnail-focus` mit0700 an.
   `compose.yaml` aus diesem Ordner kommt dorthin; beide vorhandenen Netzwerke
   müssen bereits existieren. Vorhandene Laufzeitkonfiguration zuerst sichern,
   niemals einen alten Stand blind überschreiben.
2. Jeweils root600 `production.env` und `review.env` vorbereiten. Diese Dateien
   enthalten nur die jeweiligen vorhandenen Werte, niemals in Git oder Logs:

   ```text
   THUMBNAIL_AUTH_URL=https://beta-api.kletterwelt-sauerland.de
   THUMBNAIL_PUBLIC_KEY=<bestehender Produktions-Anon-Key>
   THUMBNAIL_ALLOWED_ORIGINS=https://beta.kletterwelt-sauerland.de,https://localhost,capacitor://localhost,http://localhost
   ```

   Review erhält stattdessen `https://review-api.kletterwelt-sauerland.de` und
   seinen **eigenen** bestehenden Review-Anon-Key; dieselben ausdrücklich
   zugelassenen App-/Native-Origins. Compose erzwingt die getrennte Umgebung,
   Ports5227/5228, nichtlokale Auth-Prüfung und privaten Containerbind.
3. Mit dem öffentlichen, eingefrorenen Downloadskript als Root herunterladen:

   ```sh
   THUMBNAIL_MODEL_DIR=/opt/kws/thumbnail-focus/models python3 services/thumbnail-focus/download_models.py
   chmod 0444 /opt/kws/thumbnail-focus/models/l0_encoder.onnx /opt/kws/thumbnail-focus/models/l0_decoder.onnx
   chmod 0555 /opt/kws/thumbnail-focus/models
   ```

   Beide Hashes müssen stimmen; kein Bild wird heruntergeladen. UID10001 muss
   die Dateien über den schreibgeschützten Mount lesen können.
4. Offizielles Basisimage auflösen und nur den eingeschränkten Servicekontext
   bauen. Die neue `.dockerignore` schließt Modelle, lokale Daten, Secrets und
   Exporte aus. Beispiel mit vorher geprüftem Quellstand:

   ```sh
   docker pull python:3.12-slim-bookworm
   THUMBNAIL_PYTHON_IMAGE=$(docker image inspect python:3.12-slim-bookworm --format '{{index .RepoDigests 0}}')
   THUMBNAIL_SOURCE_REVISION=$(git rev-parse HEAD)
   docker build --build-arg PYTHON_IMAGE="$THUMBNAIL_PYTHON_IMAGE" --build-arg SOURCE_REVISION="$THUMBNAIL_SOURCE_REVISION" -t "kws-thumbnail-focus:$THUMBNAIL_SOURCE_REVISION" -f ops/hostinger/thumbnail-focus/Dockerfile services/thumbnail-focus
   THUMBNAIL_IMAGE_ID=$(docker image inspect "kws-thumbnail-focus:$THUMBNAIL_SOURCE_REVISION" --format '{{.Id}}')
   THUMBNAIL_IMAGE="$THUMBNAIL_IMAGE_ID" docker compose -f /opt/kws/thumbnail-focus/compose.yaml config --quiet
   THUMBNAIL_IMAGE="$THUMBNAIL_IMAGE_ID" docker compose -f /opt/kws/thumbnail-focus/compose.yaml up -d
   ```

   Den exakten Image-Identifier für Wiederholung/Restore geschützt dokumentieren.
   `docker compose config` nur mit `--quiet`; vollständige Env-/Inspect-Ausgaben
   enthalten Schlüssel und gehören weder in Chat noch Log.
5. Vor dem Gatewaywechsel private Container-Health, UID, readonlyMount,
   Ressourcen und Netzwerknamen prüfen. Kein `THUMBNAIL_LOCAL_ONLY=true`.
   Ein blockierter Auth-DNS-Zugriff vor Einbau der Gateway-Aliase ist noch kein
   Anlass, Review ans Produktions-/Internetnetz anzuschließen.

## Gateway: atomischer, rücksetzbarer Zweidateiwechsel

Bestätigte Ausgangsidentitäten am20.10.2026:

- `/opt/kws/public-gateway/Caddyfile`:
  `42153d21df3ff20b36e29fd97f5e739b62a62d94a13b6e3dc5525e390a961736`
- `/opt/kws/public-gateway/docker-compose.yml`:
  `61d57f6b11dedf54920f6f485c3de8e8f87826db97773729e66536c0bd10c610`

Abweichungen verlangen erneutes Lesen/Review, keine automatische Hashersetzung.
Der Operator ergänzt ausschließlich drei Hostblöcke um `/thumbnail-focus/*`
und wandelt genau die bestätigte Gateway-Netzwerkliste in ein Alias-Mapping um.
Andere Hosts, BasicAuth-Werte, Header, Medien-/Studio-/Authrouten bleiben bytegenau
erhalten. Pfad wird am Gateway entfernt; Bodylimit17000000Bytes, upstream timeout65s.

```sh
python3 ops/hostinger/thumbnail-focus/gateway-routes.py --expected-sha256 42153d21df3ff20b36e29fd97f5e739b62a62d94a13b6e3dc5525e390a961736 --expected-compose-sha256 61d57f6b11dedf54920f6f485c3de8e8f87826db97773729e66536c0bd10c610
```

Zuerst Dryrun und neue Hashes prüfen. Danach identischer Aufruf mit `--apply`.
Beide Originaldateien/Hashes werden rootprivat unter
`/opt/kws/thumbnail-focus/rollback/<UTC>/` gesichert. Der Schreibweg erhält
Datei-Inodes für die vorhandenen readonly Docker-Binds. **Vor** Aktivierung:
`docker compose config --quiet` und Caddyvalidate. Erst danach einmal Gateway-
Recreate; `admin off` erlaubt ausdrücklich keinen Caddy-API-Reload.
Fehlgeschlagene Validierung stellt die Dateien ohne Neustart zurück. Ein Fehler
beim Recreate/Livecheck stellt beide Dateien zurück und recreatet die alte
Gatewaykonfiguration. Noch währenddessen bleibt das App-Flag aus.

Nach Recreate müssen alle drei öffentlichen Healthziele, die beiden dynamisch
geprüften privaten Gateway-DNS-Aliase und die bisherigen Web-/GoTrue-Routen stimmen.
Kein MAC-/IP-Hardcoding. Unter Review erfolgt HTTPS-Auth innerhalb des privaten
Netzes; Zertifikatsprüfung bleibt aktiv.

## Runtime-/Authnachweis und Aktivierung

```sh
python3 ops/hostinger/thumbnail-focus/verify-runtime.py --source-revision "$THUMBNAIL_SOURCE_REVISION" --image-id "$THUMBNAIL_IMAGE_ID"
```

Rootgeschützter Nachweis: `/opt/kws/thumbnail-focus/VERIFIED.json`, root600.
Enthält Quellrevision, konkretes Image, Gatewayhash, verifizierte Modelle,
Container-/Netzgrenzen, getrennte Readiness und Auth-/CORS-Ergebnisse. Keine
Tokens/Fotoantworten/Keywerte. Der Aufruf prüft über Docker-DNS dynamisch, dass
die Auth-Domain im jeweiligen Container zum richtigen privaten Gateway führt.

Readiness: `GET /thumbnail-focus/api/health`, HTTP200 erst nach verifiziertem
CPU-Modellladen. Erwartet:

```json
{"ok":true,"version":"sam-number-cards-3.2","local_only":false,"provider":"CPUExecutionProvider","environment":"production","model_revision":"e4668c026bd3743c6011cc5453dbe32d4d67cadf"}
```

Review muss `environment:"review"` melden. Sonst kein Aktivierungsnachweis.
Die öffentlichen API- und App-Healthziele allein beweisen noch keinen Setterzugang.

Für eine vollständige Live-Rollenmatrix kann der Operator eine zusätzliche
root600-Datei mit **normal angemeldeten vorhandenen** Konto-Tokens übergeben:
`--auth-token-file <geschützter Pfad> --require-auth-matrix`. Schlüssel heißen
`production_setter`, `production_customer`, `review_setter`, `review_customer`.
Kein JWT-Minting, keine Service-Role-Impersonation. Dieses Werkzeug speichert
Tokens niemals im Beleg. Es sendet ausschließlich ein im Arbeitsspeicher erzeugtes
graues64×64-PNG zur Analyse, keine Medien-/Datenbankschreibaktion. Geprüft werden
positiver Setterzugang, normale Kundenverweigerung und beide Cross-Environment-
Verweigerungen. Fehlende Live-Tests bleiben `null`, niemals scheinbar bestanden.
Zusätzlich Prüfung im echten angemeldeten Editor mit isoliertem Testfoto, ohne
Veröffentlichen. Erst danach darf Root `ACTIVATION.json` samt Proof-/Gatewayhash
freigeben und Web-/Nativeflags über den regulären Release aktivieren.

## Sicherung und Rückfall

`verify-runtime.py` schreibt zusätzlich **root600**
`/opt/kws/integrations/thumbnail-focus-restore.json`. Diese reguläre Top-Level-
Datei liegt im bereits bestehenden täglichen age-Backup. Sie enthält Source- und
Basisimageidentität, Modelle mit offiziellen Downloadquellen/Größen/Hashes,
Compose und beide geschützten Envkonfigurationen, VERIFIED-Hash und den konkreten
Wiederherstellungsweg. Keine Fotos, Gewichte, Nutzer-Tokens oder Nutzerexporte.
Der Gateway-Top-Level wird bereits separat gesichert. Root ergänzt nach der
endgültigen Freischaltung den finalen ACTIVATION-Stand im Wiederherstellungsbeleg
und bestätigt ein neues verschlüsseltes Backup. Ohne diese Verifikation keine
Behauptung einer vollständigen Wiederherstellbarkeit.

Bei Betriebsfehlern zuerst Featureaktivierung deaktivieren und die originale
Bildwahl beibehalten. Keine bestehenden bestätigten Thumbnails zurückändern.
Für einen bewussten Gatewayrollback `gateway-routes.py --rollback-from <UTC-Ordner>`
mit **aktuellen** erwarteten Caddy-/Composehashes und `--apply` verwenden.
Der Backupbeleg muss genau zu diesem aktuellen Nachfolger passen; sonst Stopp.
Danach bisherige App-/GoTrue-Routen und deaktivierte Featureflags prüfen.
Dienstcontainer dürfen anschließend gestoppt werden; Gewichte und Rollbackbelege
bleiben erhalten. Keine automatischen Lösch-/Sammeländerungen an Medien.

## Tests ohne Modellinstallation

```sh
python -m unittest discover -s services/thumbnail-focus -p test_security.py -v
python -m unittest discover -s ops/hostinger/thumbnail-focus -p test_operations.py -v
```

14Service- und7Operatortests am20.10.2026 lokal bestanden, dazu Python-Syntaxcheck.
Nur Pillow12.3.0 nötig. Diese Tests prüfen Grenzen und Rollback mit synthetischen
Daten; tatsächlicher Linux-Dockerbetrieb, Modelldecode/Leistung, Authmatrix und
Live-Caddyvalidate werden beim geschützten Rollout separat belegt.
