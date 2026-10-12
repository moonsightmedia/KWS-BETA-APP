# Training – zweite UI-Iteration

## Anlass und Richtung

Der Nutzer hat die erste Oberfläche am 12.10.2026 ausdrücklich als zu wenig
durchdacht und qualitativ unzureichend zurückgewiesen. Die damaligen funktionalen
Tests ersetzen diese Produktbewertung nicht.

Richtung: eine kompakte Boulder-App, in der man Übungen findet, Kraft und Technik
kombiniert und seine Woche überblickt. Die Aufgaben bestimmen die Oberfläche.
Die vorhandene KWS-Marke mit Teko-Seitentiteln, Poppins, neutralen Flächen,
grünen Aktionen und 4/8/12-px-Radien bleibt die Grundlage.

Als Referenz dienen die vorhandene KWS-Navigation und ihre Segmented-Control-
Komponente sowie die beobachteten Bedienwege in der laufenden Vorschau. Übernommen
werden die Hauptnavigation und Kontextwechsel. Angepasst werden Informationsdichte
und mobile Reihenfolge. Verworfen werden wiederholte Seitentitel, dauerhafte
Warnleisten, ständig offene Filter, die vorzeitig erzeugte Wochenvorschau und
sieben gleichwertige, hohe Tageskarten. Keine fremden Grafiken oder Vorlagen.

## Ansichten und primäre Aufgaben

| Ansicht | Aufgabe | Primärer Weg |
| --- | --- | --- |
| Einstieg | Bereich oder Planung wählen | drei gleichwertige Bibliotheken, direkte Themen |
| Bibliothek | passende Übung finden und auswählen | Suche, Themen, direkter Add-Status, Auswahlleiste |
| Detail | Ausführung verstehen | Zusammenfassung, Anleitung, Umfang; Quellen aufklappbar |
| Eigene Einheit | Auswahl ordnen und anpassen | kompakte Übungsliste, Umfang bei Bedarf öffnen |
| Fragebogen | eine Fragegruppe beantworten | ein Schritt mit Fortschritt, Rückweg und Fokusführung |
| Woche | Termin ansehen und abhaken | Tagesleiste, Tagesdetails, weitere Termine |
| Reha | Körperregion entdecken | bewusst vorbereitete Regionen, keine Therapievorgaben |

Mobil: Bibliotheken nebeneinander, Themen horizontal scrollbar, Übungen
untereinander und Auswahlleiste oberhalb der Hauptnavigation. Desktop:
mehrspaltige Übungslisten und Woche mit Tagesdetails neben weiteren Terminen.
Formulare behalten begrenzte Lesebreite. Keine zusätzlichen Animationen.

## QA-Inventar vor Abnahme

- Vier Breiten: 375, 768, 1280 und 1920 px; Einstieg, Bibliotheken, Detail,
  Fragebogen, Woche, Einheiten und leere Favoriten. Kein horizontaler Seitenüberlauf.
- Übungen erscheinen mobil ohne vorher alle Filter durchlaufen zu müssen.
- Brust/Fußtechnik liefern fünf Beispiele; Filter öffnen/schließen, Equipment,
  Themen, leere Suche und Zurücksetzen funktionieren.
- Direktes Hinzufügen verhindert Duplikate; Auswahlleiste führt zur gemischten
  Einheit. Bereits übernommene Einheiten lassen sich um weitere Übungen ergänzen.
- Umfang öffnen, Reihenfolge ändern, speichern und Übung ersetzen funktionieren.
- Schrittvalidierung, Antworterhalt, Fokuswechsel, Wochenvorschau, freie/belegte
  Tage, feste Termine und Erledigt-Zustände funktionieren.
- Reha ohne Therapieanleitung oder Add-Aktion; Region statt falschem Übungsnamen.
- Tastatur, Fokus, Quellen-Disclosure, Vorschauinformation und Reduced Motion.
- Fehlende Übung, ungültiger Ergänzungs-/Ersatzlink, Konto- und Neuladen-Reset.
- Keine echten Accountdaten, externen Anfragen oder Änderung am Release-Checkout.

## Abnahme

15 Training-Playwright-Szenarien bestanden. Sie decken das obige Inventar ab,
einschließlich der neuen Direkt-Auswahl, kontogebundenem Vorschau-Reset,
Ergänzen übernommener Einheiten, Kontext-Rückwegen und ungültigen Ergänzungs- /
Ersatzlinks. Externe Anfragen in dieser Suite sind gesperrt.

Loop 1: Einstieg, Bibliotheken, Detail, Formular, Einheit und Woche bei
375/768/1280/1920 px gerendert geprüft. Hinweise in das Vorschau-Popover verlegt;
Regionen auf zwei Spalten verdichtet; wiederholte grüne Add-Aktionen sekundär
gestaltet; nicht aussagekräftige Übungsnummern entfernt; Tablet-Tageslabels gekürzt.
Die Sidebar-Transition wurde vor der abschließenden Tablet-Bewertung abgewartet.
Keine horizontalen Seitenüberläufe oder Pageerrors in den Layoutszenarien.

Loop 2: echte Navigation, direkte Auswahl, Reihenfolge und Umfang,
Ergänzen/Ersetzen, Formvalidierung, Erledigt/Verschieben, leere Listen,
Tastatur-Auswahl und Quellen-Disclosure geprüft. Eine unabhängige Browserrunde
prüfte dieselben Kernwege und alle vier Breiten ohne Pageerrors oder HTTP-Fehler.
Sie fand zwei Minor-Defekte: Fokusverlust durch nativ deaktivierte Add-Buttons und
scheinbar vollständige Zusammenfassung bei leeren Wiederholungen. Beide behoben:
fokusstabiler `aria-disabled`-Status mit Duplikatschutz und Live-Bestätigung;
„Wiederholungen offen“ mit Eingabehinweis und Speichersperre im neuen Entwurf.
Beide Fälle sind in der abschließenden Suite enthalten.

Normaler App-Build mit `VITE_TRAINING_UI_PREVIEW=true` bestanden, ohne Versionsbump,
neue Abhängigkeiten oder Veröffentlichung. Bestehende Bundle-/Browserslist-
Hinweise bleiben. Scoped ESLint: keine Fehler, eine vorhandene Fast-Refresh-
Warnung im Training-Context. Globaler TypeScript-Check bleibt wegen vorhandener
Bestandsfehler rot; keine Diagnose in den geänderten Training-Dateien.
`git diff --check` bestanden. Screenshots unter `test-results/training-ui/`.

Die Oberfläche ist weiter eine lokale Vorschau mit Beispieldaten. Wissenschaftliche
Freigabe, echte Demonstrationsmedien, persistente Trainingsdaten und eine physische
iOS-/Android-Abnahme bleiben offen. Die gestalterische Nutzerabnahme ist nicht
durch technische Tests ersetzt. Nächster Schritt: diese neue Oberfläche mit dem
Nutzer anhand der laufenden Vorschau beurteilen.
