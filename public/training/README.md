# Trainingsillustrationen – Herkunft und Zuordnung

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

`src/components/training/training-glyphs.ts` enthält 69 eigens gezeichnete SVG-Motive, eines pro Übungs-/Spielkarte. Die Zuordnung ist explizit, ohne gehashte Formen, Emojis oder Nummernvarianten. `TrainingTopicIcon` verwendet das konkrete Übungs-ID-Motiv; Themenreiter verwenden ein zugeordnetes Themenmotiv. Die bislang wiederverwendeten Erwachsenen-Boulderbilder entfallen bei den 24 neuen Lernaufgaben zugunsten ihres eigenen SVG-Motivs. Die zwölf Kinderspiele erhalten ebenfalls individuelle Motive. Bestehende Übungs-PNGs bleiben jeweils ihrem eigenen Originalrezept zugeordnet. SVGs sind symbolische Identifikationshilfen, keine anatomischen Anleitungen.

`kids-area.png` ist eine neue eigenständige 1254px-Kategorieillustration, erstellt mit dem eingebauten Imagegen-Werkzeug. Original: `C:/Users/Janosch/.codex/generated_images/01a12f73-a24e-7412-94ac-ae2e3f44f18f/exec-60cafd33-0c4f-4611-adb9-6e152bdac33c.png`. Projektkopie: `public/training/kids-area.png`. Nach Sichtprüfung zwei Kinder, Betreuung, zwei Hände/unterstützte Füße und freie seitliche Beobachterposition erkennbar. Keine Darstellung der tatsächlichen Halle, kein Nachweis einer Aufsichts- oder Technikfreigabe.

Finaler Bildprompt (eingebautes Werkzeug, deckender Hintergrund):

> Create a square editorial illustration for the Kletterwelt Sauerland climbing app's children's bouldering category tile. Clean hand-painted sports instruction illustration, realistic readable proportions, warm off-white background, softly shaded like a high quality illustrated exercise catalogue, navy trousers and climbing shoes, brand vivid KWS green #36B531 shirts and climbing holds. Two primary-school-aged children: one child taking a small supported sideways step on very low large positive footholds with BOTH hands on large holds and the face looking at the next foothold; the second child on the ground to one side pointing out a large green target hold, outside the climber's landing area. Include a calm adult instructor standing to the side clearly supervising, no contact or grabbing. Low reachable passage, not climbing up to a summit. A few isolated green and navy climbing holds suggest the kids' bouldering area; NO wall panels or broad floor plane, no full climbing gym rendering. Full characters with comfortable whitespace all around, clean balanced composition that remains recognizable at a 160 pixel square thumbnail. Adults/children visibly different in size; smiling engaged natural expressions. No text, no logo, no numbers, no UI, no border, no photorealistic photo, no jumping, no blindfold, no rope, no harness. The illustration is a generic motif, not a rendering of the actual KWS hall. Opaque background.
