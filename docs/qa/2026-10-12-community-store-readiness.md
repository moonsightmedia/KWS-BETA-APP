# Community-Schutz und Apple-Vorbereitung

Die Änderungen ergänzen die aktive Detailansicht um private Inhaltsmeldungen,
persönliche Kommentarsperren und eine Freigabe neuer/bearbeiteter Kommentare.
Die Datenbank schützt diese Regeln auch gegenüber alten installierten Builds.
Eine Veröffentlichungssperre schützt außerdem Storage, Video-Uploads und die
asynchrone Veröffentlichung durch den Videodienst.

## Verifikation

- 166 Node-Frontendtests bestanden, einschließlich bestätigter Meldungen,
  serverseitiger Fehler und der absichtlich deaktivierten iOS-Push-Registrierung.
- 26 Tests des Videodiensts bestanden, einschließlich echter FFmpeg-Verarbeitung,
  Queue-Wiederherstellung und gesperrter Eigentümer bei Veröffentlichung.
- Die vollständige SQL-Migration wurde auf der isolierten Wiederherstellung
  `kws_backup_restore_20261012_105302` angewendet. Transaktionstests mit drei
  synthetischen Konten prüfen Freigabe, Blockieren, Meldeprivatsphäre,
  Admin-Berechtigung, Spamgrenze, Elterninhalt-Sichtbarkeit und Bereinigung.
  Die Testdaten wurden durch ROLLBACK verworfen; keine Produktionstestdaten.
- Vite-Produktionsbuild erfolgreich. ESLint für neue Module erfolgreich.
  Der vollständige TypeScript-Check hat weiterhin bekannte Fehler in bestehenden
  Modulen; die neu eingeführten Module erzeugen keine neuen Diagnosen.

## Gerenderte Prüfungen

Die lokale Fixture zeigt die tatsächlichen neuen React-Komponenten mit
ausschließlich synthetischen Daten. Keine Verbindung zu Produktionskonten.
Prüfbreiten: 375, 768, 1280 und 1920 Pixel.

Loop 1: Meldedialog, Moderation, gesperrte Nutzer, öffentliche Datenschutzseite,
Impressum, Community-Regeln, iPhone-Mitteilungen und externe Video-Freigabe.
Konturen, Typografie, Abstände und horizontale Viewportgrenzen geprüft.
Die anfänglich zu breite Desktop-Meldeansicht wurde auf den gemeinsamen
kompakten Dialog korrigiert; mobil bleibt das randbündige Bottom-Sheet.

Loop 2: bestätigter Versand, Fehler ohne falsche Erfolgsmeldung, Entwurfserhalt,
Escape und Fokusrückgabe, Freigeben/Erledigen, Aufheben einer Nutzersperre,
getrennte Fehler-/Leerzustände und Gast-Meldekontakt geprüft.
Externe Videos: null iframes vor dem Klick, ein iframe danach; ausschließlich
example.invalid als Testziel. Android-Gerätesteuerung bleibt erreichbar.
Browserkonsole ohne neue Fehler. Screenshots und Prüfprotokolle liegen lokal
unter `test-results/apple-store-2026-10-12/` und werden wegen privater
Store-Kontexte nicht pauschal in das öffentliche Repository aufgenommen.

## Betrieb und Abnahme

Der verschlüsselte vollständige Sicherungssatz `20261012T085928Z` liegt zusätzlich
auf dem Kunden-NAS, mit verifizierten Dateiprüfsummen und Wiederherstellungsbeleg.
Ein weiterer Produktionssatz `20261012T104355Z` wurde auf dem VPS isoliert
wiederhergestellt: 4258 Dateien, 2389 Storage-Objekte, 448 Medienreferenzen,
74 Tabellen und 17629 Zeilen. NAS-Kopie ist bislang ein einzelner Export;
regelmäßige unabhängige NAS-Sicherung bleibt separat einzurichten.

Der Apple-Prüfzugang ist ein normales synthetisches Konto ohne Mitarbeiterrechte.
Sein Passwort bleibt ausschließlich unter Bitwarden `KWS_APPLE_REVIEW_ACCOUNT`
und im ausdrücklich freigegebenen Apple-Prüfformular. Private Prüfkontaktangaben
werden nicht in Git oder im Wissens-Vault gespeichert.

Native iPhone-Abnahme, native Store-Screenshots, vollständiger Löschdurchlauf
eines separat freigegebenen Wegwerfkontos und das Berücksichtigen späterer
Löschungen bei Wiederherstellung sind noch keine abgeschlossenen Gerätetests.
iPhone-Push folgt später; Mitteilungen innerhalb der App bleiben aktiv.
Apple-Organisationsumstellung und zutreffende DSA-Anbieterangaben sind vor
einer Veröffentlichung unter Moonsight zu klären. Kein öffentlicher Store-Release.

## Schriften

Poppins/Teko aus den offiziellen npm-Paketen @fontsource/poppins und
@fontsource/teko 5.3.0; Material Symbols Outlined aus
@fontsource/material-symbols-outlined 5.3.9. Die jeweiligen Lizenzen liegen
bei den selbst gehosteten WOFF2-Dateien in `public/fonts/`.
