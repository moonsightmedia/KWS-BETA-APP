# Verständliche Übungen, Spiele und passende Bilder

14.10.2026 · `codex/training-ui` · lokale Vorschau5184. Nutzerauftrag: alle Spiele und Übungen auf Sinn, Bildpassung und unnötig lange KI-Texte prüfen, sodass die wichtigsten Handlungen schnell verständlich sind.

## Ergebnis und Prüfkriterien

Alle69Karten redaktionell durchgesehen und überarbeitet:16Kraft-/Fingerboardkarten,33Boulderaufgaben inklusive10Spielen,4Wiedereinstiegsorientierungen,12Kinderspiele mit6Kita-Varianten. Prüfung nach konkreter Aufgabe, Ausgangsposition, Bewegungs-/Spielreihenfolge, Rückkehr/Ende, sinnvollen Rollen und Regeln, passenden Bildkontakten und verständlichen Begriffen. Bewegungs-/Spielabläufe haben vier Schritte; Wiedereinstiegs-Gesprächshilfen drei. Keine fachliche Coach-/Kinderbereichsfreigabe und kein Nachweis eines Lern- oder Trainingsgewinns durch die einzelnen Spiele.

- Ausgangspositionen und Körperteile konkret statt allgemeiner Fachformulierungen: Innen-/Außenkante als Großzehen-/Kleinzehenseite; Dead Bug mit Ausgangsposition und gegenüberliegendem Arm; Bandanker vorn/hinten; Gewicht aufnehmen und ablegen. Ein bis zwei kurze Merksätze.
- Begriffe Cue/Hauptcue, hypothetischer Transfer und Methoden-/Freigabewiederholungen aus primären Bewegungsschritten entfernt. Auswahlbegründungen und fachlicher Entwurfsstatus bleiben unter Hintergrund & Quellen. Quellenkontexte behalten ihre Aussagegrenzen.
- Alle10Boulderspiele mit eindeutiger Aufgabe, Rollenfolge und Rundenende: Mini-Add-on wächst2→3→höchstens4Bewegungen; Memorypunkt für erklärte Übereinstimmung oder hilfreiche Korrektur; Farben geben erreichbare Ziele, verbieten keine hilfreichen Kontakte. Beobachtende warten außerhalb des Fallbereichs. Keine Tempo-/Top-/Mutpflicht.
- Kinderspiele erklären eine gedachte Nachricht, zwei Suchhinweise, Fußplätze, ein Merkmal, kurze Geschichte oder Rollenwechsel konkret. Keine zu transportierenden Schatz-/Postgegenstände, Blind-, Sprung- oder Auffangspiele. Spiegelspiel zeitversetzt statt gleichzeitig. Sechs Kita-Varianten als Einzelhandlung mit direkter Begleitung und Bodenalternative; Schulfolge keine Pflicht. Betreuung, örtliche Regeln und passend gewählter Aufbau bleiben wesentlich.
- Lange Alters-/Gruppen-/Zeitangaben aufklappbar nach dem Spielablauf, kurze Angaben und Betreuung direkt sichtbar. Direkte Sprünge zur Anleitung, zum Spielablauf und zur Kita-Idee mit Headerabstand. Quellen und Varianten bleiben per Tastatur erreichbar.
- Vier vorher unpassend generisch bebilderte Techniken haben eigene Grafiken: Seitgriff, Untergriff, Matchen und Flagging. Beim Zwei-Lösungen-Spiel Körperposition statt reinem Schuhkantenvergleich. Andere Aufgaben teilen passende Grundbewegungs-/Planungsszenen; Bilder zeigen keine komplette Gruppe oder jede Bewegungsphase. Aufbau und tatsächliche Kontakte vor Ort prüfen.

## Quellenabgleich

Erhaltenes Quellenregister bleibt gültig; die konkreten Abläufe und Beispielumfänge sind redaktionell. Aktuell nachgelesen: [Mayo Clinic Krafttechnik](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/weight-training/art-20045842), [Mayo Clinic Rumpfübungen](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/core-strength/art-20546851), [ACE Kettlebell-Grundlagen](https://www.acefitness.org/resources/pros/expert-articles/5269/how-to-get-started-with-kettlebells/), [BMC Technikbegriffe](https://www.thebmc.co.uk/en/climbing-how-to-talk-the-talk) und [BMC Routenlesen](https://www.thebmc.co.uk/en/get-to-grips-with-route-reading). Verbands-/Trainerinformationen erklären Bewegungen; sie validieren keine individuellen Appdosen oder Spielwirkungen. Medizinische Diagnosekategorien bleiben nachgeordnet; Wiedereinstieg bleibt eine Gesprächshilfe.

## Verifikation und Grenzen

Ausgewertete Anleitungstextfelder (Ziel, Schritte, Merksätze, Fehler, Varianten, Aufbau, Hinweis, Kinderbegleitung; ohne Quellen und Auswahlbegründung): vorher12.573Wörter, nachher9.589, etwa24%weniger. Das ist eine transparente Textmengenmessung, kein Verständlichkeits- oder Usabilitynachweis. Laufzeitvergleich aller69Karten gegen `d7fa032`: IDs, Bereiche, Gerätelisten, numerische Dosen, Coach-/Eligibility-Grenzen, Quellenkontexte, Verfügbarkeit und Minuten unverändert. Einzelne Kartentitel und Bildreferenzen bewusst verständlicher.

Alle69echten Detailseiten geladen:65Illustrationen und vier bewusst bildfreie Wiedereinstiegsorientierungen, keine PageErrors/375px-Überbreiten. Zwei gerenderte QA-Loops bei375/768/1280/1920px: Bildpassung/Layout/Lesereihenfolge; danach Anleitungssprünge, Kita-/Schulablauf, Tastatur-Details, Quellen und Collapse. Vier neue Griffbilder in tatsächlichen Komponenten geprüft. Lokale Belege in `test-results/training-raster-audit-20261014/` (Routen-, Vertrags-/Textmengenmatrix und Screenshots).

29UI-Szenarien im vollständigen Lauf bestanden,23Inhalts-/Plan-/Historyprüfungen bestanden. Ein zuerst gefundener Such-Seiteneffekt wurde behoben: „Brust“ im Kniebeugenziel ließ eine Beinkarte bei Brustsuche erscheinen; Ziel benennt nun Beine, genaue Halteposition bleibt in der Anleitung. ScopedLint und diff-check sauber. AppTSC76bestehende Diagnosen außerhalb neuer Trainingsmodule; Build mit Vorschauflag bestanden, Version1.0.230 unverändert. Abschließende Buttonpositionskorrektur zusätzlich auf den betroffenen sechs UI-Fällen geprüft.

Nur lokale Fixture-/Browserabnahme; keine produktive Cloud-/Native-Abnahme, kein Push/Merge/Deploy. Vor Veröffentlichung Hallen-/Kinderbereichsverantwortliche praktische Abläufe und Grafiken mit passenden Teilnehmenden gegenprüfen. Nächster Schritt: Auftraggeber liest und probiert einen kurzen Erwachsenenablauf sowie eine betreute Kinderidee lokal; dabei konkret beobachten, ob Aufbau, erste Handlung und Rückkehr ohne Rückfrage verstanden werden.

## Katalogmatrix

Die folgende Matrix dokumentiert geprüften Bestand und zugeordnete Bildreferenzen. Sie ersetzt keine unabhängige praktische Bewegungsfreigabe.

| Karte | Bereich | Schritte | Bildreferenz |
| --- | --- | --- | --- |
| incline-pushup | strength | 4 | incline-pushup |
| pushup | strength | 4 | pushup |
| dumbbell-bench | strength | 4 | dumbbell-bench |
| dumbbell-floor | strength | 4 | dumbbell-floor |
| band-press | strength | 4 | band-press |
| band-row | strength | 4 | band-row |
| pullup | strength | 4 | pullup |
| split-squat | strength | 4 | split-squat |
| dead-bug | strength | 4 | dead-bug |
| quiet-feet | boulder | 4 | quiet-feet |
| foot-swap | boulder | 4 | foot-swap |
| edge-choice | boulder | 4 | edge-choice |
| smearing | boulder | 4 | smearing |
| high-step | boulder | 4 | high-step |
| hip-position | boulder | 4 | hip-position |
| heel-hook | boulder | 4 | heel-hook |
| read-boulder | boulder | 4 | read-boulder |
| controlled-move | boulder | 4 | controlled-move |
| rehab-shoulder | rehab | 3 | Orientierungssymbol |
| rehab-fingers | rehab | 3 | Orientierungssymbol |
| rehab-elbow | rehab | 3 | Orientierungssymbol |
| rehab-knee | rehab | 3 | Orientierungssymbol |
| bodyweight-squat | strength | 4 | bodyweight-squat |
| glute-bridge | strength | 4 | glute-bridge |
| calf-raise | strength | 4 | calf-raise |
| side-plank | strength | 4 | side-plank |
| scapular-pullup | strength | 4 | scapular-pullup |
| kettlebell-floor-press | strength | 4 | kettlebell-floor-press |
| kettlebell-goblet-squat | strength | 4 | kettlebell-goblet-squat |
| kettlebell-row | strength | 4 | kettlebell-row |
| kettlebell-deadlift | strength | 4 | kettlebell-deadlift |
| ez-curl | strength | 4 | ez-curl |
| fingerboard-feet-supported | strength | 4 | fingerboard-feet-supported |
| start-position-lab | boulder | 4 | hip-position |
| sidepull-lab | boulder | 4 | sidepull-lab |
| undercling-lab | boulder | 4 | undercling-lab |
| hand-match-order | boulder | 4 | hand-match-order |
| flagging-basics | boulder | 4 | flagging-basics |
| foot-unloading | boulder | 4 | quiet-feet |
| downclimb-path | boulder | 4 | controlled-move |
| pause-point-choice | boulder | 4 | hip-position |
| movement-chunking | boulder | 4 | controlled-move |
| transfer-check | boulder | 4 | controlled-move |
| beta-model-compare | boulder | 4 | read-boulder |
| video-cue-check | boulder | 4 | read-boulder |
| slab-weight-shift | boulder | 4 | smearing |
| heel-hook-release | boulder | 4 | heel-hook |
| game-beta-detective | boulder | 4 | read-boulder |
| game-foot-memory | boulder | 4 | quiet-feet |
| game-two-solutions | boulder | 4 | hip-position |
| game-cue-bingo | boulder | 4 | controlled-move |
| game-mini-addon | boulder | 4 | controlled-move |
| game-spraywall-designer | boulder | 4 | read-boulder |
| game-observer-interview | boulder | 4 | read-boulder |
| game-colour-journey | boulder | 4 | read-boulder |
| game-observation-guess | boulder | 4 | quiet-feet |
| game-beta-exchange | boulder | 4 | hip-position |
| kids-colour-post | kids | 4 | kids-colour-post |
| kids-animal-path | kids | 4 | kids-animal-path |
| kids-treasure-clues | kids | 4 | kids-treasure-clues |
| kids-footprint-map | kids | 4 | kids-footprint-map |
| kids-shape-detectives | kids | 4 | kids-shape-detectives |
| kids-story-stations | kids | 4 | kids-story-stations |
| kids-friendly-mirror | kids | 4 | kids-friendly-mirror |
| kids-route-builders | kids | 4 | kids-route-builders |
| kids-move-memory | kids | 4 | kids-move-memory |
| kids-choice-lab | kids | 4 | kids-choice-lab |
| kids-helper-interview | kids | 4 | kids-helper-interview |
| kids-homeward-mission | kids | 4 | kids-homeward-mission |
