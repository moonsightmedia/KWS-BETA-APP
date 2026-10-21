# Direkte Griffauswahl in der echten lokalen App

Nachsteuerung vom 21.10.2026: die vollständige App mit den tatsächlichen Setterformularen zeigen. Die frühere Begrenzung auf lokale Entwicklung bleibt bestehen. Branch `codex/thumbnail-inline-ux-local`, eigener `feed-playback-diagnosis`-Worktree; der ursprüngliche schmutzige Checkout bleibt unverändert. Keine Versionserhöhung, kein Push/PR/Deployment/Nativebuild.

## Implementierung

`SetterBoulderEditorDialog` und `SetterThumbnailFocus` zeigen die direkt bearbeitbare Vorschau unter den Farben. Neue Fotos wählen alle vom Farberkenner vorgeschlagenen Regionen. Antippen, zusammenhängende Freihandkontur, Undo, Originalvergleich und Vergrößern benötigen keine zusätzliche Vorschau-Bestätigung. Der bestehende Formular-/Stapelabschluss speichert Original, Geometrie und Variante gemeinsam.

Beim Bearbeiten sofort das gespeicherte Bild anzeigen, automatisch seine zugeordnete Quelle/Geometrie laden, keine neue Erkennung. Unveränderte Bilder werden bei Metadaten-Speicherung nicht erneut hochgeladen. Fehlende Quelle und Konflikte erhalten den Entwurf und bieten Wiederholung. Vorhandene Auswahl hat Vorrang. Bei historischen Varianten ohne gespeicherte Maske bleiben die tatsächlichen veröffentlichten Pixel die Grundlage; Korrekturen betreffen nur explizit gewählte Regionen. Durable JSON enthält keine Bildpixel, sondern Geometrie, Modus und gegebenenfalls den unveränderlichen Basisbildverweis. Rollen, Quellvalidierung und atomare Konflikterkennung unverändert.

WebKit-Abnahme fand zwei echte Probleme: fehlende Unterstützung des Canvas-Grayscale-Filters und ein Bilddecode über dokumentgebundene Blob-URLs beim schnellen Seitenwechsel. Explizite Pixelluminanz sowie datengebundene Bilddekodierung und Abbruch beim Schließen/Seitenwechsel beheben beide. Frühere fehlgeschlagene Testläufe bleiben in den lokalen Logs erhalten; die finale Suite besteht ohne Fehlerausnahmen.

## Vollständige App mit echten Datenwegen

`vite.app-local.config.ts` startet den normalen App-Root auf `http://127.0.0.1:5343`. Entwicklungsmodus und `VITE_LOCAL_REVIEW_ONLY` binden ihn an die bereits bestehende isolierte Store-Review-Umgebung. Keine Auth-/API-/Uploadfixtures und keine Rollenfreischaltung. Öffentliche Frontendkonfiguration aus dem aktuellen Serverstand in ignorierter `output/app-inline/frontend.env`; keine privaten Serverwerte. Authentifizierter Thumbnail-Proxy zur Review-API mit regulärer TLS-Prüfung. Produktive und native Konfiguration unverändert.

Mit bestehendem Review-Setter normal angemeldet. Öffentliches echtes Boulderfoto ausgewählt, Farbe Grün/Grad4/DemowandA/Beta später, echte Analyse liefert drei Regionen. Fehlenden oberen Griff über tatsächliche Punktkorrektur ergänzt; vier ausgewählte Regionen. Über die normale Stapelverarbeitung gespeichert, anschließend aus der tatsächlichen Bearbeiten-Liste wieder geöffnet: vier Regionen unverändert wiederhergestellt, keine erneute Analyse. `Griffeditor · lokale Prüfung` bleibt als klar benannter Review-Boulder zur Sichtabstimmung erhalten. Keine produktiven Boulder/Medien/Konten verändert. Regionenzahl ist keine garantierte Zahl physischer Griffe; manuelle Korrektur bleibt notwendig.

Der vorhandene In-App-Browser wurde vom separaten HTML-Entwurf auf die vollständige App umgestellt, regulär als Review-Setter angemeldet und mit diesem Boulder geöffnet. KWS-Chrome parallel für responsive Sichtprüfung. Keine browserübergreifende Tokenkopie; temporäre geschützte Review-Zugangsdaten nach Formulareingabe gelöscht.

## Verifikation

- 396 Nodefälle bestanden (`output/app-inline/node-tests.log`).
- 20 Bestandseditorfälle in Chromium/WebKit bestanden: automatisches Öffnen, dauerhafte Auswahl, Konflikt/Retry, Bildverwurf, fehlendes Original, expliziter Originalmodus, Abbruch, keine Schreibaktion ohne Bildänderung, historische Pixelbasis mit Entsättigung und dauerhaftem Basisverweis ohne Bilddaten.
- 13 Setterfälle bestanden, einschließlich aller Vorschläge beim Erstellen, echter zusammenhängender Pointerkontur mit Übernahme beim Loslassen, gemeinsamem Speichern, unvollständiger Kontur, Fehlerfall, Volumen, Undo und bisheriger separater Freigabe.
- Flag-off1/1 bestanden: normaler Editor/Originalupload ohne Griffvorschau.
- Zwei gerenderte QA-Runden375/768/1280/1920 in Chromium/WebKit, zusätzlich vollständige App im KWS-Profil bei denselben vier Breiten. Kein horizontaler Dialogüberlauf; Speicherfuß im Viewport. Screenshots `output/app-inline/loop1-*`, `loop2-*` und Abschlussansicht. Keine physische Geräteabnahme.
- Scoped ESLint null Fehler, drei bestehende Fast-Refresh-Warnungen. TypeScript insgesamt61 bekannte Diagnosen, keine in den geänderten Produktdateien. Normaler Produktionsbuild erfolgreich; vorhandene Chunk-/Browserslist-/Importhinweise. Kein versionsänderndes npm-prebuild aufgerufen.

Offen: lokale Sichtabstimmung durch den Nutzer. Keine Veröffentlichung behauptet; live bleibt der vorherige Stand Web258/TestFlight111. Größere Modell-/Erkennungsqualität und die separate Bestandsprüfung sind durch diesen UI-Auftrag nicht allgemein abgenommen.

## Freigabe zur Veröffentlichung

Nutzer hat anschließend ausdrücklich den Live-Release des neuen Griffeditors beauftragt. Vorprüfung unverändert erfolgreich; Ausgabeversion1.0.259. Veröffentlichung über regulären PR-/CI-/Hostinger-Ablauf sowie bestehenden internen TestFlight-Kanal. Keine neue Datenmigration oder Änderung des Modell-/API-Dienstes nötig. Produktive Datenkorrekturen werden nicht als Nebenwirkung des Releases ausgeführt. Exakte Release- und Paketnachweise werden nach Abschluss im Geräte-Handoff dokumentiert.

## Nachprüfung des produktiven HTTP-Caches

Web259 und TestFlight112 wurden nach vollständig erfolgreicher Prüfung regulär ausgeliefert. In der tatsächlichen Live-Abnahme lädt Kühner Wurm seine drei gespeicherten Regionen direkt; Antippen3→2, Undo→3, Originalvergleich und Vergrößern erfolgreich, anschließend Entwurf verworfen. Ein zweiter Boulder aus dem historischen Bestand zeigte dagegen reproduzierbar `Failed to fetch`.

Netzwerkdiagnose: Der öffentliche PNG-Cacheeintrag stammt von einem normalen `<img>`-Abruf ohne Origin. Diese Antwort hat `max-age=31536000, immutable`, aber weder CORS-Freigabe noch Vary. Der spätere Fetch für die Bearbeitung verwendet diesen bestehenden Cacheeintrag und scheitert mit `MissingAllowOriginHeader`. Ein tatsächlicher Netzabruf mit Origin liefert200 und korrekte CORS-/Vary-Header. Einmalig im DevTools-Protokoll deaktivierter Cache bestätigt die Ursache: derselbe Editor lädt sofort die gespeicherte Version ohne neue Analyse. Cacheeinstellung und Netzwerkdiagnose anschließend wieder zurückgesetzt; keine Bilder gespeichert.

Folgekorrektur260: sowohl veröffentlichte Pixelgrundlage als auch Farboriginal mit `cache: no-store` laden. Dies umgeht bereits vorhandene und weiterhin gültige alte No-CORS-Cacheeinträge, erhält URL-/Hashprüfung, Abbruch und `credentials: omit`. Keine Browsercache-Löschung beim Nutzer, keine Änderung an Rollen, TLS oder Server-CORS. Erneute Abnahme mit normal aktivem Browsercache nach Veröffentlichung erforderlich. Browser-/Funktionsprüfungen und regulärer PR-/Main-Release bleiben verpflichtend.

Lokale Nachprüfung260: alle20 Bestandseditorfälle in Chromium/WebKit erneut bestanden, Produktionsbuild erfolgreich, Scoped ESLint für editableThumbnail ohne Fehler oder Warnungen. Ein dauerhafter Browsercache-Regressionstest wird nicht durch einen Fetch-Options-Stringtest ersetzt; die relevante Cachebedingung wurde im echten Browser reproduziert. Die abschließende Live-Abnahme muss mit normal aktivem Cache erfolgen.
