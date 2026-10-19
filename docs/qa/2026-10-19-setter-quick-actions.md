# Setter-Schnellaktionen – 19.10.2026

## Auftrag und Ergebnis

Nutzerfreigabe für DesignMotion-Themen 2, 3, 4, 6 und 7: direkte Namensänderung,
konkrete Löschrückfrage, sichtbares Aktionsmenü, hilfreicher Such-Leerzustand und
Ladefehler mit erhaltenem Kontext. Automatische Entwurfswiederherstellung und
Upload-Erweiterung bleiben Vorschläge; der Admin-Schnellzugriff ist abgelehnt.

Die Setter-Liste verwendet neue gemeinsame Schnellaktionen und den bestehenden
Editor, Mutationshook und Bestätigungsablauf. Die Namensänderung sendet nur
`{ id, name }`, bestätigt erst nach der Antwort und erhält Eingaben bei Fehlern.
Enter speichert, Escape/Abbrechen verwirft, Blur speichert nichts. Ein unveränderter
Name erzeugt keine Mutation. Der Formzustand liegt auf Seitenebene und überlebt
auch einen zwischenzeitlichen Lesefehler. Andere Listenaktionen sind während der
Bearbeitung gesperrt; die eigenen Formaktionen während des Schreibens ebenfalls.

Einzel-Löschen aus dem Menü übernimmt genau die Objekt-ID, unabhängig von der
Mehrfachauswahl. Name im Titel, konkrete Löschaktion, Unwiderruflichkeit,
Abbrechen, Fehlererhalt und Fokusrückgabe bleiben sichtbar. Menü und nachfolgender
Dialog wechseln nacheinander, damit sich deren Fokus-/Pointer-Sperren nicht
überlappen. Menüoberfläche und Ebene120 entsprechen dem gemeinsamen Profilmenü;
die Aktionszeilen bieten mindestens44px und liegen oberhalb der mobilen Navigation.

Such-Leerzustände erklären Suchbegriff/Auswahl und bieten direktes Zurücksetzen.
Ein wirklich leerer Bestand ist getrennt. Retry liest Boulder, Sektoren, Farben
und Merkmale parallel über die vorhandenen Abfragen, bleibt bis zum Abschluss
gesperrt und erhält Such-/Filterzustand. Fehler und unbekannter Bestand sind keine0.

## Umfang und Grenzen

Produktdateien: SetterEditPage, SetterBoulderQuickActions, SetterBoulderEditorDialog
und SetterControls. Keine neuen Serverendpunkte, Migrationen, Rollen oder
Speicherrechte. Bestehende Authentifizierung/RLS und serverbestätigte Mutationen
bleiben maßgeblich. Die negative Rollenprüfung betrifft den vorhandenen
UI-Routenschutz, keine neue vollständige serverseitige Berechtigungsabnahme.

Home, Wochenkarte, Foto-Beschriftungen und Beta-Logo-Startscreen bleiben
unverändert. Kein automatisches Sichern in Browser-/Gerätespeicher. Keine
produktiven Profil-/Boulder-/Medien-/Rollen-Schreibaktionen für die Prüfung.

## Verifikation

Neue Suite `e2e/setter-quick-actions.spec.ts`: Namensvalidierung/No-op/Blur/Escape,
Mutation nur für ID/Name, Pending-Deduplizierung, Fehler/Retry mit Eingabeerhalt,
Lesefehler während Bearbeitung, Menü→Editor→Menü, konkrete Löschrückfrage,
Abbruch/Fokus, Einzellöschung bei fremder Auswahl, Nulltreffer/Reset,
Retry/Such-/Filtererhalt, Mitglieder-/Abmelde-Routenschutz sowie zwei visuelle
Loops bei375/768/1280/1920px. Die neue Suite läuft auch im Web-Release-Workflow.

Die bestehenden Setter-Fixtures aktualisieren nach bestätigtem Schreiben nun
auch den Namen und verwenden für Sektoren denselben Query-Key wie die App.
Desktop-Assertions wurden auf die wirklich gespeicherte Bezeichnung angepasst.
Ältere Überlaufprüfungen vergleichen Scrollbreite mit Clientbreite, nicht mit
der Fensterbreite inklusive Windows-Scrollleiste. Die alte Kalenderannahme von
zwei physischen Bug-A-Flächen ist durch die bereits freigegebene Trennung der
Kurzen Platte überholt; geprüft wird jetzt die konkrete Atta-Höhle-ID.

Zwischenstände: Ein früher Rollencheck suchte einen Absatz als Überschrift;
Selektor korrigiert. Der Typecheck deckte einen nicht verfügbaren `refetch` an
transformierten Hooks auf; Retry nutzt deren vorhandene Query-Client-Abfragen.
Im breiteren Browserlauf war ein echter Menü→Dialog-Pointer-Lock reproduzierbar;
der Ablauf wird erst nach Menü-Cleanup fortgesetzt. Die 44px-Prüfung wartet auf
das Ende der kurzen Eintrittsbewegung statt deren skalierten Anfang zu messen.
Diese Zwischenläufe gelten nicht als bestandene Endprüfung.

Finale Ergebnisse und Belege werden vor Übergabe ergänzt. Keine Veröffentlichung
im Rahmen dieses Implementierungsauftrags behaupten.

## Lokale Sichtprüfung

Die echte Produktumsetzung ist mit isolierten Daten unter
`http://127.0.0.1:5203/output/setter-quick-actions/index.html?scene=implementation&after=1`
bedienbar. Keine Quellcode-Patches im Vorschau-Server, nur Datenaustausch.
Der frühere Vorher-/Nachher-Vergleich bleibt auf5199/5202 separat erhalten und
verwendet eine lokale unveränderte Quellkopie seines Ausgangsstands.

Belege und Startkonfiguration: `output/setter-quick-actions/`.
