# Setterbereich – Desktop-Prüfung vom 15.09.2026

## Ergebnis

Alle vier Setterseiten wurden mit vollständiger Desktop-Navigation geprüft: 1280 × 720 und 1920 × 1080 CSS-Pixel. Die 14 neu angelegten, isolierten Desktop-Tests bestehen (letzter Lauf: 36,1 Sekunden). Die reale, lokal laufende App wurde zusätzlich mit vorhandenen Daten bedient, ohne Boulder oder Termine zu speichern, hochzuladen oder zu löschen.

**Keine uneingeschränkte Fehlerfrei-Freigabe:** Ein abgelaufener Anmeldezustand blockierte mehrere Datenabrufe. Nach einem normalen Neuladen waren alle vier Seiten und die Karte wieder verwendbar. Das Neuladen ist ein beobachteter Workaround, keine Fehlerbehebung.

Geprüfter Stand: Worktree `KWS-BETA-APP-desktop-nav`, Branch `codex/desktop-navigation-refresh`, HEAD `ce817e3`, App 1.0.226, einschließlich bereits vorhandener uncommitteter Änderungen. HEAD und Remote-Branch waren nach Fetch gleichauf (0/0). Nicht mit einem veröffentlichten Build gleichsetzen.

## Abdeckung

| Bereich | Echte App, nur Lesen/Öffnen/Abbrechen | Isolierte Funktionsprüfung, beide Desktopgrößen |
| --- | --- | --- |
| Navigation | Alle vier Seiten, Sidebar eingeklappt/ausgeklappt, kein horizontaler Überlauf | Aktive Route, 256/80-px-Sidebar und passende Inhaltsabstände, Tastaturnavigation, Profilmenü per Hover und Klick, Mausübergang zum Menü, Escape |
| Erstellen | Stammdaten, FAB, leerer Stapel, Formular und Scroll-Ende mit erreichbaren Aktionen | Zwei Entwürfe samt Medien/Sektor/Farbe, Stapelstart, gesperrter FAB während Upload, zwei getrennte Boulder-Anfragen und vier Medienoperationen, Abschlussmeldung |
| Bearbeiten | 104 echte Boulder, Editor mit vorausgefüllten Daten, Scroll-Ende, Abbrechen | 125 Ergebnisse über 50/100/125 nachladen, Farbauswahl und Filterchip, Suche, Speichern, Fehler mit erhaltenen Eingaben, erneutes Speichern, Löschrückfrage ohne Ausführung |
| Status | 104 Boulder, 17 nichtleere Gruppen, Ein-/Ausklappen, Sektorfilter und reale Karte | Auswahl trotz eingeklappter Gruppen, sichtbare Sammelaktion, bestätigte Statusänderung, Leerzustand, Zurücksetzen, Kartenmarker als Sektorfilter |
| Planung | Kalender, Tag anklicken → korrekt vorbelegtes Datum, Teilbereichsauswahl, Dialog-Scrollen, Verwerfen-Rückfrage | Datepicker, vorbelegter Tag, Zeit/Teilbereich, Termin anlegen und in Tagesliste sehen, bestätigtes Löschen, Liste und vergangene Termine |
| Zugang | Vorhandene Administrator-Sitzung | Setter/Admin dürfen hinein; Mitglied sieht Zugriffsverweigerung; ausgeloggter Zustand führt zur Anmeldung. Dies prüft UI-Routing, nicht die serverseitige Rechteprüfung. |

## Bestätigte Befunde

### D-01 · Major · Abgelaufene Sitzung blockiert die Arbeit

- **Beobachtung:** Die Hallenkarte meldete `PGRST303 / JWT expired`. Gleichzeitig zeigte Erstellen „Stammdaten konnten nicht geladen werden“, Bearbeiten „Boulder konnten nicht geladen werden“ und Planung „Planung konnte nicht geladen werden“; die Neuanlage war deaktiviert. Die Statusliste zeigte weiterhin bereits verfügbare Boulder.
- **Reproduktion in dieser Sitzung:** Status → Hallenkarte öffnen; anschließend Bearbeiten, Erstellen und Planung über die Sidebar öffnen. „Erneut versuchen“ in Bearbeiten endete erneut mit einem Fehler.
- **Wiederherstellung:** Ein normales Neuladen auf Planung genügte. Danach geladen: Kalender, Stammdaten, 104 bearbeitbare Boulder und die interaktive Karte. Kein erneutes Anmelden und kein Codeeingriff wurden benötigt.
- **Einordnung:** Kein belegter Desktop-Layoutfehler. Der konkrete Ablauf des Token-Refreshs ist noch nicht abschließend diagnostiziert; nur der Kartenabruf lieferte den expliziten JWT-Fehler. Die übrigen gleichzeitigen Ladefehler passen dazu, ihre Einzelursache ist nicht separat bewiesen.
- **UI-Teilproblem:** Der Kartenfehler zeigt rohes Backend-JSON statt einer verständlichen Wiederanmelde-/Wiederherstellungsaktion. In `src/hooks/useHallMaps.tsx:85` wird der innerhalb des JSON-Parsing-`try` geworfene Fehler direkt wieder vom eigenen `catch` gefangen; dadurch landet wieder der rohe Antworttext in der Fehlermeldung.
- **Empfohlene Folgearbeit:** Token-Erneuerung und Query-Recovery gemeinsam untersuchen; abgelaufene Sitzungen verständlich anzeigen und kontrolliert wiederherstellen. Keine Berechtigungen abschwächen.
- **Belege:** `live-map-session-error-1280.png`, `live-create-error-1280.png`, `live-edit-error-1280.png`, `live-schedule-error-1280.png`, `live-map-recovered-1280.png`.

### D-02 · Minor · Irreführende Ergebniszahlen im Fehlerzustand

- **Beobachtung:** Bearbeiten zeigte während des Ladefehlers „104 Boulder · 50 angezeigt“ sowie „Weitere Boulder anzeigen (54)“, obwohl keine Ergebnisliste sichtbar war.
- **Ursache im Rendering:** Zähler und Nachladebutton werden unabhängig vom gemeinsamen Fehlerzustand aus den noch vorhandenen Boulder-Daten berechnet. Quellen: `SetterEditPage.tsx:377`, Fehlerzweig `:413`, Nachladebutton `:515`.
- **Empfehlung:** Bei blockierender Datenquelle Zähler und Nachladen ausblenden oder ausdrücklich als zuletzt geladene Daten kennzeichnen; erfolgreiche Teildaten nicht als aktuelle sichtbare Ergebnisse ausgeben.
- **Beleg:** `live-edit-error-1280.png`.

### D-03 · Minor · Singularbeschriftungen

- **Beobachtung:** Nach Auswahl von Bug A steht „1 Sektoren“; im Terminformular mit einem gewählten Teilbereich „1 Teilbereiche ausgewählt“.
- **Empfehlung:** Singular/Plural korrekt unterscheiden.
- **Quellen:** `SetterStatusPage.tsx:245`, `SetterSchedulePage.tsx:472`. Screenshots: `live-status-filter-1280.png` und `live-schedule-form-1280.png`; für den Status wurde der Singular zusätzlich in der gerenderten Ansicht nach Kartenfilterung bestätigt.

## Designempfehlung, kein bestätigter Funktionsfehler

**Karte auf niedrigen Desktopfenstern kompakter anbieten.** Bei 1280 × 720 nimmt die ausgeklappte Karte fast die gesamte sichtbare Inhaltshöhe ein; Ergebnisgruppen liegen darunter. Eine begrenzte Vorschauhöhe bzw. eine optionale größere Kartenansicht würde den Wechsel zwischen Karte und Treffern verkürzen. Die Karte ist scrollbar und verwendbar; die passende Darstellung sollte vor einer Änderung festgelegt werden. Beleg: `live-map-recovered-1280.png`.

## Grenzen und Sicherheit

- Keine produktiven Schreib-, Upload-, Lösch- oder Statusänderungen. Auch der reale Testtermin wurde vor dem Speichern verworfen.
- Schreibabläufe nur mit lokalen Fixtures: externe Ziele werden im Browser-Test abgebrochen; Boulder-Anfragen werden lokal abgefangen, Medienübertragung und Datenmutationen simuliert.
- Daher keine Aussage über tatsächliche Uploadgeschwindigkeit, Video-Codecs, Komprimierung, VPS-Verarbeitung, Datenbankpersistenz, Push oder iOS-/Android-Hintergrundbetrieb.
- Echte Datenprüfung und Fixture-Screenshots sind getrennt beschriftet. Fixture-Farben, Vorschaubilder und Mengen sind Testwerte, keine Aussage über produktive Stammdaten oder Markenfarbänderungen.
- Chromium/Desktop geprüft; kein neuer Safari-/Firefox-, Touch-, Screenreader-, Kontrast- oder Langzeittest. Keine Messung der Animations-Framerate.
- Kein neuer Build, Commit, Push oder Deploy. Produktcode und Markenfarben wurden in dieser Prüfaufgabe nicht geändert. Frühere Arbeitsbaumänderungen bleiben unangetastet.

## Reproduzierbarer Test

```powershell
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5173'
node node_modules/@playwright/test/cli.js test e2e/setter-desktop-audit.spec.ts --workers=1 --output=test-results/setter-desktop-audit-20260915/final-run --timeout=20000
```

Testdateien: `e2e/setter-desktop-audit.spec.ts`, `test/fixtures/setter-desktop.html`, `test/fixtures/setter-desktop.tsx`. Die vorhandenen Setter-Hook-Fixtures werden wiederverwendet. Initiale Fehlläufe betrafen Test-Selektoren/Erwartungen, nicht dadurch bewiesene Produktdefekte; der abschließende Lauf besteht vollständig.

Screenshots/Galerie: `test-results/setter-desktop-audit-20260915/preview.html`. Die Galerie ist rein lokal und enthält Screenshots der realen Sitzung; nicht ungeprüft veröffentlichen.

**Exakt nächster Schritt:** D-01 gezielt beheben, anschließend den Ablauf „Sitzung abgelaufen → Abruf → Wiederherstellung ohne Seitenreload“ als Regressionstest absichern.
