# Trainingsillustrationen – Herkunft und Zuordnung

Aktuelle Ergänzung14.10.2026: `boulder-grip-atlas.png` ersetzt die unpassende Wiederholung des Hüftbildes bei Seitgriff, Untergriff, Hände-Matchen und Flagging. Vier eigene passende Grundpositionen, 2×2gleiches Raster. Bild-/Dateinachweis und vollständiger Imagegen-Prompt: [boulder-grip-atlas.prompt.md](boulder-grip-atlas.prompt.md). Zwei-Lösungen-Spiel verwendet die Körperpositionsgrafik statt des zu engen Schuhkantenmotivs. Vorhandene übrige Bilder bleiben; Spielbilder zeigen eine Situation, keine vollständige Gruppen-/Bewegungsfolge.

Erstellt am12.10.2026 mit dem eingebauten imagegen-Werkzeug. Lokale projektspezifische Originale, keine Stockbilder, keine externen Bildaufrufe. Die ursprünglichen drei Assets1254×1254px, deckende PNGs; schematische Orientierung, Coachabnahme ausstehend.

Dateien:
- strength-atlas.png: 3×3 gleich große Felder. Zeilenweise incline-pushup,pushup,dumbbell-bench(unbenutzte Zelle),dumbbell-floor,band-press,band-row,pullup,split-squat,dead-bug.
- boulder-atlas.png: quiet-feet,foot-swap,edge-choice,smearing,high-step,hip-position,heel-hook,read-boulder,controlled-move.
- dumbbell-bench.png: separates Einzelbild; ersetzt die Atlaszelle nach Sichtprüfung.

CSS zeigt jeweils ein Atlasfeld (background-size300% und Position0/50/100%). Die Detailseite hat eine Bildunterschrift; die barrierefreie Bezeichnung sagt ausdrücklich schematische Illustration zur Orientierung.

## Generationsvorgaben

Strength: Square3×3 atlas, exactly9 equalcells, no gutters/margins/borders/text/numbers. Restrained editorial sports illustration, navy anatomy outlines, green sports clothes, warmwhite background, plausible adult anatomy/apparatus and generous padding. Row1: hands waistheight bench inclinepushup, floorpushup, two-dumbbell flatbenchpress with plantedfeet. Row2: supine floorpress kneesbent upperarmsfloor, standing chestbandpress anchoredbehind, standing bandrow anchoredinfront. Row3: pullup, staggered split squat, supine deadbug opposite arm/leg reaching. No arrows/logos/effects/extra limbs.

Boulder: Matching square3×3 atlas. Palegray wall, green/navy holds, climbing shoes, safe lowwall and paddedground. Row1: precise shoetip placementcloseup, twofeet exchangingonehold, inner/outeredges two smallcloseups. Row2: smearsole onslabwithoutfoothold, lowwallhighstep hipoverfoot, hipturnedsideclosewall. Row3: heelontopbigroundedhold, groundroutepreview, controlledbalancedlowwallmovement. No text/arrows/clinicalclaims.

Corrections: Firststrengthatlas had stray weight inbenchcell; edited to remove it and clarifyoppositedeadbuglimbs. Heelhook initially showedmissleadingcontact; edited bottomleftonly to heelrestingontop with toeawayhorizontal. Benchcell remained ambiguous, so replacedwith dedicated asset.

Dedicatedbench: ONE square professional sports illustration, adultlyingonflatbench, head/shoulders/hipssupported, feetplanted, TWO separate darkdumbbells ONEinEACHhand, handsshoulderwidthapart, elbowsbent70–90degrees besidechest and forearmsnearlyvertical. Threequarter viewfromfootend seesbothhands/weights, no thirdweight. Navyoutlines/darkgreenclothes/warmwhite, no text/arrows/logos. Staticsetupschematic.

Originals remain in the Codex generated_images threaddirectory; delivered assets are this directory. Illustrations explain identity/setup; text and suitable instruction govern movement. Anatomical and exercise-specific approval by a qualified reviewer is still required before production.

## Revision12.–13.10.2026 – KWS-Grün, Hallenmaterial und Bereichbilder

Die drei bisherigen Übungs-PNGs wurden per imagegen farblich auf die KWS-Vorgabe#36B531(RGB54/181/49) ausgerichtet, bei unverändertem Aufbau. Schattierungen bleiben; keine pixelgenaue Flächenpalette behauptet. Die gesamte Farbkorrektur erfolgte über das Bildwerkzeug, nicht per Code-Recolor.

Neue Assets:
- areas.png2172×724: drei quadratische Bereiche. Kraft mit Kettlebell/Bank; Bouldern Person und Griffe isoliert auf hellem Grund; Reha einzelne Person beim lockeren Arm-/Schulterdehnen. Vollflächige Wand und Matte sowie therapeutisches Gespräch nach Nutzerkommentaren entfernt.
- equipment-atlas.png1086×1448,3Spalten×4Zeilen: bodyweight-squat,glute-bridge,calf-raise / side-plank(unbenutzteZelle),scapular-pullup,kettlebell-floor-press / kettlebell-goblet-squat,kettlebell-row,kettlebell-deadlift / ez-curl,fingerboard-feet-supported,Leerfeld.
- side-plank-knees.png1254×1254: separate Knie-Seitstütz-Grafik; ersetzt die anfänglich unpassende Langhebelvariante. Nach Sichtprüfung Hüfte vom Boden gelöst; Knie/Unterarm als Stützen.

Neue Generationsvorgaben: genaue3×4Rasterstruktur, erwachsene plausible Anatomie mit2Armen/2Beinen, echte Kettlebells mit rundem Gewicht/Griff statt Kurzhanteln, gedeckte navyLinien und helle Hintergründe. Row-Zelle nach Sichtprüfung auf Handstütze an einer stabilen Bank geändert. Fingerboard-Zelle zeigt beide Füße unterstützend am Boden, keinen freien Maximalhang. Knie-Seitstütz mit gebeugten Knien und sichtbar angehobenem Becken statt Bodenkontakt der Hüfte.

Bereichbild-Edit: linke Kraftszene erhalten. In mittlerer Szene komplette Wand-/Bodenfläche entfernen, Person und grüne/navyGriffe behalten. Rechte Szene durch eine einzelne stehende Person beim entspannten Armstrecken ersetzen, ohne Therapeut/Bank/Clipboard/Heilungsversprechen. Das Bild ist eine Kategorieillustration, kein Rehaprotokoll.

Originale verbleiben im Codex-generated_images-Threadordner; Projekt verwendet ausschließlich diese lokalen Kopien. Fachreview der Ausführungsdarstellungen weiterhin offen.

## Individuelle Motive und Kinderbereich – 13.10.2026

`src/components/training/training-glyphs.ts` enthält 69 eigens gezeichnete SVG-Motive. Die zunächst eingeführte Verwendung als große Ersatzbilder wurde nach Nutzerkorrektur zurückgenommen: kleine Symbole nur an passenden Themen-/Orientierungsstellen. Die 24 zusätzlichen Boulder-Lernaufgaben nutzen wieder die passende Raster-Grundbewegung über `illustrationId`. Kinderspiele zeigen eigene Szenen aus `kids-atlas.png`. SVGs sind symbolische Identifikationshilfen, keine anatomischen Anleitungen.

`kids-area.png` ist das ursprüngliche 1254px-Kategoriebild. Original: `C:/Users/Janosch/.codex/generated_images/01a12f73-a24e-7412-94ac-ae2e3f44f18f/exec-60cafd33-0c4f-4611-adb9-6e152bdac33c.png`. Der folgende Audit erkannte das zweite Kind zu nah am Fallbereich; die aktive UI verwendet deshalb `kids-area-v2.png` ohne dieses wartende Kind. Keine Darstellung der tatsächlichen Halle, kein Nachweis einer Aufsichts- oder Technikfreigabe.

Finaler Bildprompt (eingebautes Werkzeug, deckender Hintergrund):

> Create a square editorial illustration for the Kletterwelt Sauerland climbing app's children's bouldering category tile. Clean hand-painted sports instruction illustration, realistic readable proportions, warm off-white background, softly shaded like a high quality illustrated exercise catalogue, navy trousers and climbing shoes, brand vivid KWS green #36B531 shirts and climbing holds. Two primary-school-aged children: one child taking a small supported sideways step on very low large positive footholds with BOTH hands on large holds and the face looking at the next foothold; the second child on the ground to one side pointing out a large green target hold, outside the climber's landing area. Include a calm adult instructor standing to the side clearly supervising, no contact or grabbing. Low reachable passage, not climbing up to a summit. A few isolated green and navy climbing holds suggest the kids' bouldering area; NO wall panels or broad floor plane, no full climbing gym rendering. Full characters with comfortable whitespace all around, clean balanced composition that remains recognizable at a 160 pixel square thumbnail. Adults/children visibly different in size; smiling engaged natural expressions. No text, no logo, no numbers, no UI, no border, no photorealistic photo, no jumping, no blindfold, no rope, no harness. The illustration is a generic motif, not a rendering of the actual KWS hall. Opaque background.

## Audit und finale Bildkorrekturen – 13.10.2026

Alle folgenden Rasterdateien wurden mit dem eingebauten `image_gen.imagegen` erstellt/bearbeitet, nach Sichtprüfung ins Projekt kopiert und unabhängig nochmals in echten Komponenten geprüft. Deckender Hintergrund, bestehender Illustrationsstil, KWS-Grün #36B531 mit Schattierungen. Keine Code-/Python-Bildretusche. Originale bleiben unter `C:/Users/Janosch/.codex/generated_images/01a12f73-a24e-7412-94ac-ae2e3f44f18f/`; die Dateinamen in der Tabelle bezeichnen dort die vollständigen Generationsoriginale.

| Aktive Projektdatei | Original | Korrektur/Zweck |
| --- | --- | --- |
| `dead-bug-v3.png` | `exec-8dc7361d-1f2d-4320-97f8-15da021b2d69.png` | Zwei nachvollziehbare Arme; Vordergrundarm ausgestreckt/Vordergrundbein gebeugt, Hintergrundarm aufrecht/Hintergrundbein ausgestreckt |
| `band-press-v2.png` | `exec-2614a87b-4d8e-4028-8480-3b4c3af6e07f.png` | Zwei durchgängige Bandverbindungen vom hinteren Anker zu beiden Handgriffen |
| `equipment-atlas-v2.png` | `exec-60bed205-ee7e-4e41-b93e-8f3645863b59.png` | Elf Geräte-/Eigengewichtsszenen mit mehr Rand; Köpfe, Board, Stange und Bank vollständig |
| `kids-area-v2.png` | `exec-04d50e7a-a695-4ce3-833c-6189cf424b16.png` | Zweites wartendes Kind aus dem Fallbereich entfernt, seitliche Betreuung erhalten |
| `kids-atlas.png` | `exec-ab4bfe27-9516-4663-940a-eb3d5fed8a80.png` | Zwölf betreute Spielszenen; Spiegelspiel als kleine Armidee, Gespräch außerhalb der Wand auf Hockern |

Generations-/Editvorgaben, inhaltlich zusammengefasst:

- Kinderatlas neu: passender editorialer Sportillustrationsstil, zwölf Szenen in drei Spalten/vier Reihen, warme helle Gründe, grüne Shirts/Griffe, navy Hosen/Schuhe; plausible Kinder-/Erwachsenenproportionen, zwei Arme/zwei Beine, kleine unterstützte Handlungen, keine Sprünge, Blindspiele, Tempo-/Maximallast oder Gegenstände im Fallraum. Reihenfolge: Farbenpost, Tierwege, Schatzhinweise / Fußkarte, Griff-Detektive, Geschichtenstationen / freundlicher Spiegel, Routenbauer, Bewegungs-Memory / Wahlwerkstatt, Helferinterview, Heimweg-Mission. Erstgenerierung `exec-5dfeacac-437c-4739-b76c-efb19c8ca649.png`.
- Kinderatlas erste Korrektur: nur untere mittlere Gesprächsszene; Sitzen am Wandfuß durch zwei stabile Hocker auf freiem hellem Gesprächsgrund außerhalb der Wand ersetzen. Andere elf Szenen erhalten. Zwischenfassung `exec-d4af9d7e-02ca-4431-81c4-0507deaadd13.png`.
- Kinderatlas finale Korrektur: nur dritte Reihe links; erwachsene Person mit beiden Füßen unten und entspannten Armen beobachtet. Kind beide Füße unten und eine kleine Armbewegung. Alle übrigen Szenen, Stil und Raster erhalten; keine gemeinsame instabile Einbeinpose.
- Dead Bug: erste Korrektur macht beide Arme sichtbar. Danach nur Beine korrigieren: vorderer Arm bleibt über Kopf bodennah ausgestreckt, hinterer Arm bleibt aufrecht. Vorderes Bein gebeugt/angehoben, hinteres Bein gerade ausgestreckt; gegenüberliegende Arm-/Beinbewegung eindeutig. Zwei Arme/zwei Beine und Stil erhalten. Zwischenfassung `exec-cb8a3355-ff5b-4e87-a82b-2335dd74800c.png` ist nicht aktiv.
- Geräteatlas: alle elf bestehenden Posen/Geräte beibehalten, vollständig innerhalb ihrer Zellen mit Rand; keine Nachbarfiguren, keine zusätzlich erfundenen Gliedmaßen. Fingerboard mit beiden Händen und bodenunterstützten Füßen, EZ-Stange komplett, Rudern an stabiler Bank. Visuell erkennbaren Fehler der ursprünglichen abgeschnittenen Reihen korrigieren.
- Kinderbereichskachel: ausschließlich das wartende zweite Kind entfernen, aktive Kletterin, Betreuung seitlich, freie Landefläche und sonstigen Stil beibehalten.
- Bandpress: übrige Person/Körperhaltung/Umgebung erhalten, beide Bänder durchgehend von hinterem Anker zu den separaten Griffen zeigen. Kein schwebendes Bandende.

**Aktive Zuschnitte:** Die generierten 1086×1448px-Atlanten haben trotz Rasterprompt ungleich hohe Bildreihen. Deshalb keine angenommene 300%×400%-Gleichaufteilung. `training-illustrations.ts` dokumentiert geprüfte quadratische Pixelregionen; Renderer berechnet Größe/Position anhand tatsächlicher Bildmaße ohne Seitenverhältnisverzerrung. Geräte: Top0/362/724/1054, Größe362/362/330/362. Kinder: Top0/350/700/1043, Größe350/350/345/362. Alle elf Geräte- und zwölf Kinderdetails erneut auf echte CSS-Zuschnitte geprüft. Bestehende 3×3-Atlanten bleiben gleich geteilt. Einzelbilder überschreiben Dead Bug, Bandpress, Knie-Seitstütz und Zwei-Kurzhantel-Bankdrücken.

Auditbeleg: `docs/qa/2026-10-13-training-graphics-preferences.md` und lokale Screenshots unter `test-results/training-raster-audit-20261013/`. Keine weiteren eindeutigen Bildfehler im Endstand erkannt. Dies ist keine fachliche Ausführungs-/Kinderbereichsfreigabe; schematische Illustrationen und tatsächliche Betreuung/Technik müssen vor Veröffentlichung gemeinsam geprüft werden.
