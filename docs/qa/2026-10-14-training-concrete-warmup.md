# Konkretes Aufwärmen, kein pauschaler Abschluss

Nutzerkommentare kritisieren den generischen Abschluss und verlangen vorgegebene Aufwärmübungen. Die gemeinsame Komponente `TrainingWarmup` ersetzt die bisherige Vorbereitungsbeschreibung in Einheitsentwurf, gespeicherter Einheit und Wochenplan. Der Abschluss-Platzhalter entfällt vollständig.

Inhalt und Grenzen:

- Erwärmen durch Gehen/Marschieren, konkrete Schulter-/Hand-/Beinbewegungen, danach sehr leichte Boulder bei Boulderaufgaben und eine einfache Vorbereitung der ersten Kraftübung. Wiederholungen, Pausen und kurze Handlungsschritte sichtbar. Kraftvarianten folgen der gewählten Übung: z.B. erhöhte/Knie-Liegestütze, Kniebeugen ohne Last, leichtere eingewiesene Last/Bandspannung; Klimmzüge nur bei vertrauter leichter Einzelwiederholung, sonst unterstützte Einführung. Kein automatisch eingeführtes Fingerboardtraining oder Zusatzgerät.
- Beispielemengen und Daueraufteilung sind eigene redaktionelle Vorschläge. Die Abfolge kann mehr Zeit benötigen und validiert keine individuelle Trainingsbereitschaft. Allgemeine Mobilität erhält eine kürzere Bewegungsfolge; Kinder/Orientierung/leere Einheiten werden ausgeschlossen. Es ist kein neues fachlich freigegebenes Erwachsenentrainingsprogramm.
- Die Quellen stehen im Info-Icon unter „Aufwärmen: Hinweise & Quellen“, auch im Wochenplan. Keine Präventionsgarantie.

Quellenprüfung14.10.2026:

- [DAV, Auer2022/2023: Aufwärm- und Präventionsprogramm](https://www.alpenverein.de/artikel/besser-klettern-verletzungen-vorbeugen_abb076b0-bc4c-4570-966f-b3d7368fd036), Volltext gelesen. Stützt die praktische Struktur aus allgemeiner Bewegung und Einklettern; sein vollständiges dreiteiliges Programm dauert deutlich länger. Die kurze Appfolge übernimmt dessen Präventionsaussagen nicht und ist kein gleichwertiger Ersatz.
- [McCrary etal.2015, DOI10.1136/bjsports-2014-094228](https://pubmed.ncbi.nlm.nih.gov/25694615/), PubMed-Abstract gelesen.31 Studien zu unterschiedlichen Oberkörper-Aufwärmformen und Leistungsgrößen, keine gefundenen Studien zu Verletzungsprävention. Stützt keine exakten Appmengen, keine validierte Individualisierung und kein spezifisches Boulderprogramm. Die Befunde zu hochbelastetem dynamischem Aufwärmen werden nicht pauschal auf Einsteiger übertragen.
- DAV-Boulderempfehlungen und Lattice-Warmup-Artikel zur Einordnung geöffnet. BMC-Seite und Grundlagen-PDF lieferten403, wurden nicht als gelesene Volltextbasis ausgegeben.

Zeitmodell:

Die Phasen kommen aus demselben Modell wie die angezeigte Abfolge; ihre Zeit wird genau einmal addiert. Neue Einheiten und Generator enthalten keinen cooldownMinutes-Wert. Altdaten bleiben kompatibel, ihr damaliger Platzhalter zählt nicht mehr. Im gezeigten Drei-Übungen-Entwurf sind es28 statt31Minuten. Hauptübungsdosen wurden nicht geändert. Das frei gewordene Budget kann bei neuen Generierungen weitere Kandidaten zulassen; keine unbekannte Pause wird dafür verkürzt.

Prüfung:

-25 Plan-/Inhalts-/HistorytestsPASS, inklusive Misch-/Kraft-/Mobilitätsphasen, Mengen/Zeitkonsistenz, fehlender Vorgaben und ignorierter alter Abschlussminuten. Eine bisherige Review-Fixture mit zwei Lernfeldern in20Minuten ist nach Entfernen der3Minuten tatsächlich machbar: separat als positiver Budgetfall geprüft. Der Überbudget-Reviewfall verwendet jetzt drei Lernfelder, um die ursprüngliche Grenze sinnvoll weiterzuprüfen.
-46/46UI-TestsPASS. Neuer Fall prüft konkrete Schritte im Entwurf und Wochenplan, fehlenden Abschluss und zugängliche Quellen. Nach Kürzung der Texte Kernszenario erneutPASS. ScopedESLint ohne Fehler. BuildPASS Version1.0.230. AppTSC76 bekannte Diagnosen außerhalb geänderter Trainingsdateien.
- Zwei Sichtloops375/768/1280/1920: zunächst gemischter Entwurf(4Screenshots), anschließend gespeicherte Einheit und Wochenplan mit kürzeren Texten(8Screenshots), keine Laufzeitfehler/Dokumentüberbreite. ActualInAppUserTab read-only geprüft: Entwurfname „test“ unverändert,28Minuten, vier konkrete Aufwärmhandlungen, kein Abschluss; keine Eingaben oder Übungen des Nutzers verändert.
- Lokale Belege `test-results/training-help-loop1/warmup/`, `training-help-loop2/warmup/`, `training-intro-warmup-*`. Nur lokaleVorschau, keinPush/Release.

Nächster Schritt: Auftraggeber prüft die konkret sichtbaren Handlungen und deren Nachmachbarkeit; KWS-Praxis-/Trainerreview der redaktionellen Dosierung bleibt offen.
