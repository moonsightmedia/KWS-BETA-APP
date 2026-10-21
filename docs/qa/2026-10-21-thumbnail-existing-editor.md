# Vorhandenes Vorschaubild im Bouldereditor

„Boulder bearbeiten“ lädt über „Vorschaubild bearbeiten“ das zugeordnete
Farboriginal und öffnet die vorhandene Griffauswahl unmittelbar. Keine erneute
Dateiauswahl oder getrennte Prüfliste. Bestätigen und Boulder-Speichern sind
weiterhin ausdrücklich; nur die Bildänderung lässt sich getrennt verwerfen.
Öffnen/Laden schreibt nichts. Ein fehlendes Original ist ein sichtbarer,
wiederholbarer Fehler; ein entsättigtes Bild wird nicht als Farboriginal benutzt.

`boulder_thumbnail_sources` ist ausschließlich für Setter/Admin lesbar. Die
serverseitige Speicherfunktion prüft aktuelle Rolle, Bild-URL, Farben und
Volumentyp und schreibt Bild und Bearbeitungsquelle gemeinsam. Originale und
Varianten werden unveränderlich hochgeladen; Antwortenverlust wiederholt keine
Bildübertragung. Auswahlen speichern Geometrie und Foto-SHA256 ohne Base64-Bild.
Quellenprüfungen und Uploads bleiben am Konto und konfigurierten Backend gebunden.
Original-Uploads ohne Maske behalten die bestehende Komprimierung/Uploadqueue.
Unveränderte Medien werden beim Bearbeiten nicht erneut gepatcht. Auch die
Bestandsprüfung sichert neue Originalzuordnungen vor Erfolg und schützt bereits
im Editor bearbeitete Varianten geräteübergreifend vor erneuter Analyse.

## Verifikation

- 395 Nodeprüfungen erfolgreich, darunter Archiv-vor-Variante, verlorene
  Speicherantwort, exakte Upload-Ziele und Kontowechsel.
- Chromium und WebKit: Laden, direkte Auswahl, korrigieren/bestätigen/speichern,
  erneutes Öffnen mit derselben Auswahl, Verwerfen ohne Verlust anderer Felder,
  fehlendes Original, Speicherkonflikt/Wiederholung und Abbruch während Laden.
  Zusätzlicher Original-behalten-Fall und Abschlussdurchlauf gehören zum Release.
- Zwei tatsächlich gerenderte QA-Loops bei375/768/1280/1920: Einstieg, große
  Griffauswahl, feste Aktionen, bestätigte Auswahl. Screenshots unter
  `output/thumbnail-existing/`, keine Überläufe oder Laufzeitfehler beobachtet.
- Bisherige zwölf Griffeditorfälle, Flag-off, acht Katalogschutzfälle und33
  Setter-/Dialogregressionen erfolgreich. Scoped ESLint ohne neue Fehler;
  TypeScript weiterhin61 bekannte Bestandsdiagnosen, keine in geänderten Modulen.
  Produktionsbuild erfolgreich.
- SQL-Rollen-/CAS-Test in der getrennten Reviewdatenbank erfolgreich. Anonyme
  und Kunden dürfen Quellen weder lesen noch schreiben; Setter-Direktwrites
  auf die Quellentabelle gesperrt. Stales Bild/Farbe und Fremd-URL abgewiesen,
  gültige Transaktion und Antwortenverlust-Wiederholung bestätigt. Alle
  synthetischen Änderungen zurückgerollt.

## Datenvorbereitung und Release

Sicherung `20261020T145122Z.tar.age`: ausschließlich Boulder-Dump im Speicher
gelesen, keine alten Konten/Datenbankstände wiederhergestellt.140 Originale per
ID, Farben und unveränderter aktueller Bild-URL eindeutig zugeordnet und per
HTTP/Dateityp/Größe/SHA geprüft.32 alte App-Foto-URLs besitzen keinen nativen
CORS-Zugriff; bytegleiche Kopien liegen unveränderlich im vorhandenen öffentlichen
Bildbucket. Bisherige Originale bleiben erhalten.

Migration `20261021160000_editable_boulder_thumbnails.sql` am21.10.14:30UTC mit
bestehendem Schemaeigentümer `supabase_admin` produktiv angewendet; vorheriger
Versuch mit eingeschränktem `postgres` vollständig zurückgerollt. Keine Grants
erweitert, um diesen Eigentümerunterschied zu umgehen. Exakter Migrations-SHA256:
`1da5d22d4e336d4d50bdb3ae225cdc260572c15bd7b39f708747f0804994ad96`.
140 Quellen eingetragen, darunter alle139 veröffentlichten Griffvarianten.
Sämtliche143 Boulder-Datensätze vollständig unverändert nachgewiesen;
Snapshot-SHA256 `ba83716626f6e26d99d9b39c232f831f4d1839671881d0db9b7c7b5a0237bf32`.
Private Zuordnung/Belege unter `/opt/kws/tools/thumbnail-editor-recovery`;
keine Fotos oder Nutzerexporte in Git.

Web1.0.258 und interne iPhone-Version werden über den regulären PR-/CI-Ablauf
veröffentlicht. CI-/Live-/TestFlight-Ergebnisse werden erst nach deren tatsächlichem
Erfolg im Projektstatus und der gerätebezogenen Übergabe festgehalten.
Kein Austausch einer öffentlichen Store-Einreichung gehört zu diesem Auftrag.
