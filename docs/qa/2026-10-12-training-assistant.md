# Training – Übungen, Gesprächsassistent und dauerhaft auffindbare Woche

Stand: 12.10.2026. Branch `codex/training-ui`, lokale Vorschau auf Port5184.

Der Auftraggeber hat die vorige Gestaltung und den oberflächlichen Inhaltsstand erneut zurückgewiesen. Diese Iteration verbindet Bibliothek, konkrete Einheiten und Wochenplanung und ersetzt den Fragebogen durch einen geführten Dialog. Die Nutzerabnahme steht weiterhin aus.

## Umsetzung

- Mobil sichtbarer kompakter Einstieg zum Plan-Assistenten oberhalb der Hauptnavigation. Eine Frage je Dialogschritt, schnelle Antwortauswahl, sechs Phasen, bearbeitbare Antwortgeschichte und vollständige Reviewansicht vor der Erstellung. Kein verbundenes Sprachmodell und keine fingierte Freitextauswertung.
- Vorhandener Wochenplan steht ganz oben in der Trainingsübersicht. Ein Kalenderzugang führt auch aus den Bibliotheken und Einheiten zum Plan. Der Provider liegt weiterhin oberhalb der Hauptrouten.
- Plan, eigene Einheiten, Entwurf und Favoriten liegen lokal unter einer versionierten kontospezifischen Speicherung. Tabs, Reload und ein zweiter Browser-Tab mit demselben Ursprung behalten die Woche. Andere Konten sehen eigene Daten. Intakeantworten zu Alter und Einschränkungen werden nicht gespeichert. Defekte gespeicherte Strukturen werden verworfen; Speicherausfälle werden ausdrücklich angezeigt. Im Vorschau-Menü lassen sich lokale Trainingsdaten zurücksetzen.
- Filter als mobile Bottom-Sheet-/Desktop-Popover-Auswahl: Themen und Equipment als Buttons, Änderungen erst mit Übernehmen, Verwerfen beim Schließen, Reset und einzeln entfernbare aktive Filter. Suche nach Brust/Fußtechnik markiert das entsprechende Thema; Themenwechsel löst die abgeleitete Suche auf.
- 18 Kraft-/Boulderkarten mit lokal erzeugten Rasterillustrationen, konkreten Schritten, Voraussetzungen, Cues, typischen Fehlern, Varianten, konsistentem Umfang und Quellenkontext. Bankdrücken erhält eine Einzelgrafik, da die erste Atlaszelle missverständlich war. Heelhook wurde nach visueller Prüfung korrigiert. Grafiken sind schematisch, keine fachliche Ausführungsfreigabe.
- Vier Reha-/Wiedereinstiegskarten bieten konkrete Beobachtungs- und Gesprächsvorbereitung mit diagnosebezogenen Quellen. Sie werden nicht als selbstständig dosierbare Übungen eingeplant.
- Der deterministische Wochenentwurf berücksichtigt beide Lernfelder, Ziel, bekannte Kraftpraxis/Fähigkeiten, Equipment, getrennte Tage, vorhandene feste Termine und Budget. Technik kommt vor ermüdender Kraftarbeit. Vorbereitung, Aufbau, Seiten, Arbeit, Pausen und Abschluss gehören zur Zeitschätzung. Höchstens zwei neue/gesamte Termine beim neuen Einstieg beziehungsweise drei beim Aufbau sind konservative redaktionelle Regeln, keine individuelle Validierung.
- Pro Übung sieht man Umfang und Pausenbezug; Auswahlbegründung und Aufbau sind aufklappbar. Eigene Einheiten können auf freie Tage gelegt werden. Feste Termine werden nicht überschrieben. Änderungen berechnen Zeiten neu und zeigen Überschreitungen, ohne Pausen automatisch zu kürzen. Freitextumfang wird als Dauer offen behandelt.
- Minderjährige/unbekannte Altersgruppe, Einschränkungen, Wettkampfplanung und weitere offene Voraussetzungen führen zu einer Besprechungsansicht. Sie enthält keine neuen dosierten Einträge; feste Termine bleiben reserviert.

## Fachlicher Stand

ACSM2026 und Mayo unterstützen allgemeine Kraftprinzipien, nicht den optimalen KWS-Boulderplan. Seifert2018, Morenas2021 und Blagus geben begrenzten Technik-Lernkontext. Exakte Drills, Starterdosierung, Zeitmodelle und Wochenregeln sind redaktionelle Ableitungen. Ein vorher irreführend generischer Fingertrainings-Verweis wurde von den Technikdrills entfernt. Rehaquellen beziehen sich auf Rotatorenmanschetten-Tendinopathie, lateralen Ellenbogenschmerz, patellofemoralen Schmerz und Ringbandverletzungen; daraus wird keine Diagnose für eine ganze Körperregion abgeleitet. Trainer-/Physiotherapieprüfung, Hallen-/Equipmentprüfung und betreuter Pilot stehen aus.

Primärquellen direkt im Katalog; ergänzend geprüft:
- https://pubmed.ncbi.nlm.nih.gov/41843416/
- https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2018.00820/full

## Verifikation

Zwei Render-/Interaktionsloops bei375/768/1280/1920px; zusätzliche unabhängige Browserprüfungen von Bibliothek/Detail und Gespräch/Einheiten. Kein horizontaler Seitenüberlauf oder PageError im stabilen Endstand. Screenshotartefakte unter `test-results/training-ui` (nicht versioniert).

Erste Runde:12/14 Szenarien bestanden. Ein erwarteter Übungs-ID war falsch (Aufbau wählt Kantenvergleich statt Anfänger-Fußplatzierung); korrigiert. Terminauswahl war bei langen Tagesdetails problematisch; durch ein zugängliches Verschieben-Dialogfeld ersetzt. Zweite vollständige Runde:14/14 bestanden. Geprüft wurden unter anderem gemischte Einheit, Umfang offen, Tauschen/Reihenfolge, Einplanen, Reviewbearbeitung, beide Lernfelder, Tagesbudget, feste Termine, Tabwechsel, Reload, zweiter Tab, Kontoisolation, beschädigte Daten, Speicherausfall, Rehaabgrenzung, Filter-Apply/Cancel/Reset, Tastaturfokus und veraltete Kontextlinks.

12/12 Algorithmus-/Inhalts-/Zeittests bestanden (`npm run test:training-plan`). Gezielter ESLint ohne Fehler (zwei vorhandene Fast-Refresh-Warnungen in Provider/Fixture). Globaler TypeScript-Check hat weiterhin bestehende Diagnosen in anderen App-/Admin-/Uploadmodulen; keine Diagnose in Trainingdateien. Vite-Build mit Vorschauflag bestanden (8,78 Sekunden, Version1.0.230 bleibt unverändert); vorhandene Bundle-/Browserslist-Hinweise bleiben.

## Grenzen und nächster Schritt

Lokale UI-/Inhaltsvorschau, standardmäßig deaktivierter Feature-Schalter. Keine Cloud-/Backendplanung, keine native Geräteabnahme, kein Wirksamkeits-/Sicherheitsnachweis, keine klinische Freigabe und kein Produktionsrelease. Lokal gespeicherte Daten werden nicht geräteübergreifend synchronisiert. Alte bereits verworfene Sitzungsdaten können nicht rückwirkend rekonstruiert werden.

Nächster Schritt: Auftraggeber prüft die neue Vorschau mit einer Übungssuche, einem Dialogplan und einem Wechsel zwischen Haupttabs. Danach konkrete Gestaltungsbefunde einarbeiten und Fachreview für Katalog, Grafiken und Planregeln durchführen, bevor eine produktive Anbindung erfolgt.
