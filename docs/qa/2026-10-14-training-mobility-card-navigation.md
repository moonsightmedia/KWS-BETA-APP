# Mobilität, verständliche Texte und ganze Karten

Stand: 14.10.2026. Worktree training-ui, Branch codex/training-ui. Lokale Vorschau Port5184, Version1.0.230. Keine Veröffentlichung oder fachliche Freigabe.

## Ergebnis

Hauptbereiche Kraft, Bouldern, Mobilität, Kinder. Der bisherige Name Wiedereinstieg beschrieb die gewünschte Ergänzung zu Kraft/Bouldern nicht. Mobilität enthält sechs tatsächliche Übungen: Arm vor der Brust dehnen, Handgelenk ruhig bewegen, Hand öffnen und locker schließen, Hüftvorderseite dehnen, vorderen Oberschenkel dehnen, Wade an der Wand dehnen. Filter Alle / Bewegen / Dehnen; vier Dehnübungen, zwei Bewegungsübungen. Beschwerden sind eine nachgeordnete Orientierung; die alten vier IDs und Reha-URLs bleiben gültig.

75Karten insgesamt, 71mit KWS-Ausstattung verfügbar. 58Karten mit bearbeitbarem Erwachsenen-Beispielumfang; Kinder und medizinische Orientierung bleiben ohne einplanbare Erwachsenendosis. Neue Mobilität freiwillig manuell auswählbar, nicht automatisch in die Beispielwoche eingefügt. Einseitige Aufgaben zählen beide Seiten. Bewegungen starten ohne feste Pause und werden als Pause bei Bedarf angezeigt; Haltephasen bewahren Sekundenangabe und Seitenbezug.

Bibliothekskarten öffnen über Bild, Text und freie Fläche. Ein nativer gestreckter Link liegt neben den eigenständigen Buttons Merken und Hinzufügen; keine Buttons in einem Link. Tastaturfokus bleibt sichtbar. Explizite Grid-Spalten und umbrechende Titel beheben den während der Prüfung entdeckten Kartenüberstand bei375px. Schulter, Hand, Ellbogen und Knie erhalten eigene gemeinsame Körpersymbole; übrige Karten behalten die Rastergrafiken.

Erhöhter Liegestütz: Ein leichterer Liegestütz mit den Händen auf einer Bank. Hintergrund: Mit den Händen auf einer Bank ist der Liegestütz leichter als am Boden. Je höher die Auflage, desto leichter die Übung. 16weitere Begründungen sind vereinfacht. Auch Vorbereitung und Abschluss eigener Einheiten sind in Alltagssprache formuliert. Die vollständige69Karten-Vorprüfung bleibt im separaten Bericht training-content-review dokumentiert.

## Quellen und Bilder

[Mayo Clinic, grundlegende Dehnübungen](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20546848) wurde am14.10.2026 geöffnet und gegen Schulter/Hüfte/Oberschenkel/Wade abgeglichen. [Mayo Clinic, Stretching](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20047931) zusätzlich für Aufwärmen, sanftes Halten und Schmerzgrenze. Etwa30Sekunden als allgemeine Orientierung; ein einmaliger kurzer App-Beispielumfang und20Sekunden Pause sind redaktionell, nicht eine wissenschaftlich optimale Trainingsdosis. Keine Dehnpflicht nach Krafttraining und kein Versprechen verhinderter Verletzungen.

[Cambridge University Hospitals, wrist movement](https://www.cuh.nhs.uk/patient-information/wrist-range-of-movement-exercises/) beschreibt die Handgelenk- und Fingerbewegungen. Klinische Patienteninformation wird nur für die Beschreibung herangezogen; sechs Wiederholungen und Zeitannahmen sind App-Beispiele, keine übernommene Rehaverordnung und kein Wirksamkeitsbeleg bei gesunden Bouldernden.

Sechs neue Rasterillustrationen via eingebautem Imagegen, KWS-grüne Kleidung und neutrale Hintergründe. Original sowie alle sechs realen Detailausschnitte angesehen: keine offensichtlichen zusätzlichen Hände/Beine, anatomische Kontaktpunkte und beschriebene Stellung plausibel. Handgelenk zeigt die Abwärtsphase; Anleitung bewegt auf und ab. Bilder zeigen eine Phase, nicht den vollständigen Ablauf. Prompt und unveränderter Originalpfad in public/training/mobility-atlas.prompt.md. Eine Trainer-/Physiotherapie-Abnahme ist weiterhin offen.

## Prüfung

- 24Plan-/Inhalts-/Historyprüfungen PASS, einschließlich sechs optionaler Mobilitätskarten, Seitenzeit, manueller Auswahl und Ausschluss aus der automatischen Woche.
- Vollständiger Browserlauf35/35PASS. Nach abschließender Vereinfachung der Einheitenhinweise zwei betroffene Ablaufprüfungen erneut PASS.
- Zwei gerenderte Durchgänge bei375/768/1280/1920px: Bibliotheken, Mobilitätsdetails, neue Körperregionen, Auswahlzustand, Filter, Tasten und Tastaturöffnung. Bilder und finale Dehnansichten visuell angesehen. Button-/Titelgrenzen ausdrücklich geprüft, nicht nur scrollWidth, da globales overflow clipping Überstände verdecken kann.
- Zusätzlicher375pxTouch-Kontext: tatsächlicher Tap auf das Bild öffnet jeweils Kraft/Boulder/Mobilität/Kinder-Detail. Beschreibungstext-Klick in vier Breiten geprüft; Favorit/Add navigieren nicht ungewollt.
- Bewegung2/Dehnen4, Reload der Filter, Einheit speichern und Reload, eigene Einheit in Woche einplanen samt Pause bei Bedarf PASS. Bestehende Pläne, Anzeigeeinstellungen, Kontotrennung und Kindergrenzen in Regression erhalten.
- ScopedESLint PASS. TypeScript76bestehende Diagnosen außerhalb Training/DashboardHeader; keine neue Diagnose in den bearbeiteten Produktdateien. Preview-Build PASS; bekannte große Chunks/Browserslist-/fonts.css-Hinweise bleiben.
- Zwischenlauf: falscher Testlistenname Übungen statt Körperregionen korrigiert. Ein weiterer Zwischenlauf wurde während einer laufenden Codeänderung durch HMR zurückgesetzt; DOM-Abtrennung und Rückkehr zu Schritt1 sichtbar. Abschließender stabiler Volltest35/35PASS. Keine Produktkorrektur oder Cachebehauptung daraus abgeleitet.

Screenshots lokal: test-results/training-ui/mobility-*.png, mobility-loop2-*.png, regions-loop2-*.png. Prüflogs: test-results/training-raster-audit-20261014/mobility-typecheck-final.txt und mobility-build-final.txt. Diese Dateien sind nicht Bestandteil der Veröffentlichung.

## Nächster Schritt

Die Mobilitätskarten und Körpersymbole in der lokalen Vorschau mit Janosch prüfen; danach praktische Ausführung und Beschwerdegrenzen mit geeigneten KWS-Fachpersonen abnehmen. Keine UI-Prüfung ersetzt diesen fachlichen Review. Produktions-KI/Cloudspeicherung und Native-Abnahme bleiben eigenständige Aufgaben.
