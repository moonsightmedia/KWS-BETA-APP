# Community-Moderation – Betrieb

Marketing ist für Inhaltsmeldungen und Sonderfälle zuständig:
marketing@kletterwelt-sauerland.de. Das Hallenteam muss die Queue täglich
prüfen; technische Implementierung ersetzt nicht die tatsächliche Betreuung.

## Kommentarfreigabe

Unter **Admin → Feedback → Moderation** stehen neue und bearbeitete Kommentare.
Sie sind vor der Freigabe ausschließlich für Autor und Administration sichtbar.
Die Administration liest den vollständigen Text und prüft den zugehörigen Boulder.
Beleidigungen, Belästigung, gefährliche Anleitungen, Spam und unzulässige fremde
persönliche Daten ablehnen; passende Kommentare freigeben. Bei Bearbeitung durch
den Autor wird erneut eine Freigabe erforderlich. Bestätigte Serverfehler werden
als Fehler angezeigt und nicht als erfolgreicher Abschluss ausgegeben.

## Inhaltsmeldungen

Gemeldete Inhalte und Begründungen stehen nur für die meldende Person und die
berechtigte Administration bereit. Nicht an andere Mitglieder weitergeben.
Die Administration kann Inhalte ausblenden/wiederherstellen und die
Veröffentlichung missbräuchlicher Konten sperren/wieder zulassen. Nach Prüfung
den Vorgang als erledigt markieren. Ausblenden und Sperren sind reversibel;
es handelt sich nicht um eine Kontolöschung.

Persönliche Nutzersperren blendet die App für den jeweiligen Nutzer aus.
Dieser kann sie unter **Profil → Profil bearbeiten → Gesperrte Nutzer** aufheben.
Gäste erreichen den Marketingkontakt über die Meldeaktion und Community-Regeln.

## Grenzen und Kontolöschung

Serverseitige Spamgrenzen: höchstens zehn neue Kommentare in zehn Minuten
und zwanzig neue Inhaltsmeldungen pro Stunde je Konto. Eine wiederholte Meldung
desselben Inhalts erzeugt keinen neuen Vorgang. Gesperrte Veröffentlichungen
werden auch bei Uploads und asynchronen Videojobs geprüft.

Ein gesperrtes Konto ist nicht vollständig gelöscht. Löschanträge bearbeitet
Marketing spätestens binnen sieben Tagen gemäß `ACCOUNT_DELETION.md`.
Keine realen Tester zur Abnahme löschen. Eine vollständige Löschprobe und
das Berücksichtigen späterer Löschvermerke beim Restore sind separat zu prüfen.

## Abnahme

166 Frontendtests, 26 Videodiensttests und isolierte SQL-Proben bestanden.
Admin-, Melde-, Sperr- und Fehleransichten bei 375/768/1280/1920 px gerendert
geprüft. Live-Web und Videodienst verwenden Quellstand `5339600`; Build 85
enthält dieselben Appfunktionen. Die endgültige iPhone-Abnahme steht aus.
