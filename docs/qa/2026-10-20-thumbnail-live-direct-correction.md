# Aktuellen öffentlichen Bestand vorbereiten und direkt korrigieren

Frischer Livebuild-/Produktionsabgleich am20.10.2026, zuletzt15:52:40UTC:
139 öffentlich sichtbare hängende Boulder auf `beta-api.kletterwelt-sauerland.de`.
Davon32 anhand der Publikationsbelege bereits online übernommen.107 weitere
werden ausschließlich lokal vorbereitet. Die4 zusätzlichen Betreiberzeilen aus
dem früheren143er-Abgleich sind öffentlich nicht abrufbar und nicht enthalten.
IDs, Foto-URLs, Farben, Status und32 publizierte Varianten sind beim letzten
Abgleich gegenüber dem vorbereiteten Katalog unverändert.

Alle107 Originalfotos separat lokal geladen und analysiert, ohne Produktionswrite.
99 Fotos mit unterstützter Farbautomatik,8 Pink-/Mint-Fotos mit leerer manueller
Auswahl. Schwarz-Gelb analysiert beide Farben.81 Fotos haben mindestens einen
automatischen Startgriffvorschlag,26 zunächst keine sichere Auswahl. Vorschläge
sind keine Bestätigungen.0 Foto-/Analysefehler; alle107 Foto-SHA/Ergebnis-SHA und
Auswahl-IDs gegen die Kandidaten geprüft. Die32 publizierten Bilder übersprungen.

`LocalLiveThumbnailReview` bindet dieselbe Griffkomponente und denselben lokalen
Prüfspeicher ein. Schlüssel verwenden explizit die aktuelle Produktionsquelle und
den konkreten Foto-/Farb-/Cachekontext, unabhängig von einer alten lokalen Env.
Alte103 Nutzerbestätigungen werden nicht übernommen oder umgeschlüsselt. Die neue
Ansicht hat keine Anmeldung und keinen Onlinewrite-Button. Automatische Ergebnisse
und lokale Änderungen werden beim Polling getrennt; neue Katalogstände ersetzen
keine aktuellen Entwürfe. Publizierte Zeilen bleiben außerhalb der offenen Prüfung.

Foto-/Korrigieren-Klick öffnet unmittelbar `initialView="edit"`; auch ohne Auswahl
ist das Canvas direkt bedienbar. Uploadeditor verwendet weiterhin den kompakten
Vorschaustart. „Auswahl passt · Weiter“ rendert, speichert dauerhaft und öffnet dann
den nächsten noch offenen Boulder im Auswahlmodus. Bei Fehlern bleibt der Dialog
erhalten. Entwürfe werden bei jeder Korrektur gespeichert. Der Produktions-Export
ist von den alten Backend-Einträgen getrennt; bereits publizierte IDs/URLs werden
als Belegmetadaten exportiert, ohne neue Nutzerbestätigungen anzulegen.

Manuell im isolierten Test-Origin `localhost:5228` geprüft, getrennt vom echten
Nutzer-Origin `127.0.0.1:5228`: Sprungfreudiger Gepard startet mit3 Vorschlägen
direkt im editierbaren Canvas(tabindex0), Griff1 abwählen ->2, schließen/neuladen ->
Entwurf mit2 wiederhergestellt, Griff1 ergänzen ->3, bestätigen ->nächster Boulder
Alter Uranus direkt im Auswahlmodus,1 lokale Testbestätigung nach Reload erhalten.
Mint-Foto Geheimer Böe ohne Auswahl direkt antippbar; Hinweis verlangt keinen
weiteren Moduswechsel. Diese einzelne Testbestätigung ist keine Nutzerfreigabe.
Sie bleibt ausschließlich im getrennten Test-Origin. Keine Produktdaten damit
publiziert. Echte Ansicht zeigt107offen/0bestätigt/32online; erster echter Dialog
Kriechender Specht nur geöffnet, keine Auswahl/Bestätigung im Nutzerkontext geändert.

Zwei visuelle Prüfdurchgänge für Grid und Korrekturdialog bei375/768/1280/1920:
direkte Auswahl sichtbar, Buttons erreichbar,0 horizontaler Überlauf. Der erste
Screenshotwechsel bei768 war noch eine Zwischenframeaufnahme; nach erneutem
Öffnen bei fester Breite geprüft und ersetzt. Viewport-Overrides zurückgesetzt.
Screenshots liegen außerhalb von Git. ESLint auf vier geänderten TSX-Modulen ohne
Befund, Typecheck unverändert67 bekannte Bestandsdiagnosen und keine in den
betroffenen Modulen; regulärer Releasebuild erfolgreich.12 Python-Tests bestanden.
Lokaler Einstieg und Nutzerdaten sind nicht Bestandteil des Produktionsbundles.

Keine App-Veröffentlichung, keine neue Online-Boulderänderung. Bestätigte neue
Auswahlen werden später als eigener bewusster Übernahmeschritt gegen den erneut
geprüften Livebestand gespeichert; ursprüngliche Medien bleiben erhalten.
