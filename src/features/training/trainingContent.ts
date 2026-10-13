import type { TrainingDose, TrainingExercise } from './types';

const dose: TrainingDose = { sets: 2, repetitions: '6–10', restSeconds: 120, restScope: 'sets', secondsPerRepetition: 4, setupMinutes: 2 };
const coreSource = { label: 'Mayo Clinic: Rumpfübungen', url: 'https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/core-strength/art-20546851', context: 'Offizielle Bewegungsinformation zu Bridge und Seitstütz; diese vereinfachte Variante und Dosierung sind redaktionell, kein geprüfter Bouldertransfer.' };
const kettleSource = { label: 'ACE: Kettlebell-Grundlagen', url: 'https://www.acefitness.org/resources/pros/expert-articles/5269/how-to-get-started-with-kettlebells/', context: 'Trainerinformation zu kontrolliertem Einstieg, Goblet Squat und Deadlift. Keine Primärstudie dieses Boulderprogramms; die Kartendosis ist redaktionell.' };
type Recipe = Pick<TrainingExercise, 'id' | 'title' | 'topic' | 'equipment' | 'goal' | 'steps' | 'cues' | 'mistakes' | 'easier' | 'harder' | 'selectionReason' | 'setupRequirements'> & Partial<TrainingExercise>;

/** Editorial instruction cards. Scientific sources support only their stated scope. */
export function additionalTrainingContent(generalSources: TrainingExercise['sources']): TrainingExercise[] {
  const recipes: Recipe[] = [
    {
      id: 'bodyweight-squat', title: 'Kniebeuge mit Körpergewicht', topic: 'Beine', equipment: 'Körpergewicht', goal: 'Eine kontrollierte Knie-/Hüftbeuge ohne Zusatzlast kennenlernen.',
      steps: ['Angenehmen stabilen Stand auf rutschfestem Boden wählen; bei Bedarf leicht festhalten.', 'Hüfte und Knie gleichzeitig beugen; Füße bleiben belastbar, Tiefe angenehm.', 'Ruhig aufrichten und weiteratmen; weder Tempo noch Tiefe erzwingen.', 'Bei Ausweichen Bewegungsweg verkürzen. Bei Bankkontakt nur kontrolliert hinsetzen, nicht fallen lassen.'],
      cues: ['Beherrschbare Tiefe zählt.', 'Knie dürfen sich passend zum Fuß bewegen.'], mistakes: ['Tiefe gegen Kontrolle erzwingen.', 'Eine universelle Fußbreite oder starre Knierichtung fordern.'], easier: 'Kürzerer Weg oder stabile Handunterstützung.', harder: 'Nach Einführung Goblet Squat mit passend gewählter Kettlebell.',
      setupRequirements: ['Rutschfester Boden; bei Bedarf geprüfte Unterstützung'], selectionReason: 'Allgemeine Beinkraftoption ohne zusätzliche Griffbelastung; kein Nachweis verbesserter Boulderlandungen.',
    },
    {
      id: 'glute-bridge', title: 'Beckenheben · Glute Bridge', topic: 'Beine', equipment: 'Körpergewicht', goal: 'Hüftstreckung am Boden kontrolliert ausführen.',
      steps: ['Rückenlage mit angestellten Beinen einrichten, Füße stabil.', 'Becken ruhig anheben, soweit die Position angenehm kontrollierbar bleibt.', 'Weiteratmen und kontrolliert zurücklegen; kein erzwungenes Hohlkreuz.', 'Beide Füße belastbar halten und den Weg bei Ausweichen verkürzen.'],
      cues: ['Heben und Ablegen bleiben ruhig.', 'Kein maximaler Hüftweg nötig.'], mistakes: ['Höhe durch starkes Überstrecken erzwingen.', 'Als Therapie gegen ungeklärten Rückenschmerz verwenden.'], easier: 'Kürzerer kontrollierter Weg.', harder: 'Etwas längerer Weg bei gleicher Kontrolle, keine automatische Einbeinpflicht.',
      setupRequirements: ['Freie angenehme Bodenfläche'], selectionReason: 'Hüft-/Rumpfoption ohne Handlast; ein direkter Überhangtransfer ist nicht belegt.', sources: [...generalSources, coreSource],
    },
    {
      id: 'calf-raise', title: 'Fersenheben im Stand', topic: 'Beine', equipment: 'Körpergewicht', goal: 'Fuß-/Sprunggelenksbewegung unter kontrollierter Last ausführen.',
      steps: ['Auf ebenem rutschfestem Boden stehen; an stabiler Unterstützung leicht festhalten.', 'Beide Fersen ruhig anheben, ohne nach außen abzurollen.', 'Kontrolliert zum Boden zurückkehren; nicht federn.', 'Nur einen angenehmen Weg nutzen; kein Treppenrand für den Einstieg nötig.'],
      cues: ['Unterstützung ist erlaubt.', 'Ruhiger Rückweg statt Federn.'], mistakes: ['Balanceverlust für mehr Wiederholungen tolerieren.', 'Als Ringband-, Achillessehnen- oder Knie-Rehaprotokoll ausgeben.'], easier: 'Kleinerer Weg und mehr Handunterstützung.', harder: 'Eine etwas längere beherrschte Bewegung; Einbein-/Zusatzlastvariante erst nach Einweisung.',
      setupRequirements: ['Ebener Boden und stabile Haltemöglichkeit'], selectionReason: 'Allgemeine Unterschenkeloption; Reibungstritte und Sprungleistung werden dadurch nicht automatisch verbessert.',
    },
    {
      id: 'side-plank', title: 'Seitstütz auf Knien · kurze Haltephasen', topic: 'Rumpf', equipment: 'Körpergewicht', goal: 'Eine kurze seitliche Stützposition kontrollieren.',
      defaultDose: { ...dose, sets: 1, repetitions: '2', repetitionUnit: 'Haltephasen', restSeconds: 60, restScope: 'repetitions', secondsPerRepetition: 10, sideMultiplier: 2 },
      dose: 'Redaktioneller Einstieg: 1 Block · 2 kurze Haltephasen je Seite, jeweils bis etwa 10 Sekunden bei ruhiger Atmung. Kürzer ist erlaubt; keine Pflichtdauer.',
      steps: ['Seitlage mit gebeugten Knien wählen; Unterarm angenehm unter der Schulter abstützen.', 'Becken nur soweit anheben, wie Schulter, Rumpf und Atmung kontrollierbar bleiben.', 'Eine Wiederholung dieser Karte ist eine kurze Haltephase bis etwa 10 Sekunden; früher beenden ist erlaubt.', 'Geordnet ablegen, pausieren und die andere Seite vorbereiten.'],
      cues: ['Knievariante ist ein vollständiger Einstieg.', 'Atmung und Kontrolle vor Haltedauer.'], mistakes: ['Ungeklärte Schulterbeschwerden mit langem Halten testen.', 'Zittern oder Ausweichen als Pflichtziel ansehen.'], easier: 'Sehr kurz halten oder liegend Position kennenlernen.', harder: 'Längeren Hebel nur nach Einführung; nicht gleichzeitig Dauer und Umfang erhöhen.',
      setupRequirements: ['Rutschfeste angenehme Bodenfläche und kontrollierter Unterarmstütz'], selectionReason: 'Seitliche Rumpfkontrolle ohne Fingergriffe; keine garantierte bessere Körperspannung an der Wand.', sources: [...generalSources, coreSource],
    },
    {
      id: 'scapular-pullup', title: 'Kleine Schulterbewegung an der Stange', topic: 'Rücken', equipment: 'Klimmzugstange', goal: 'Eine kleine kontrollierte Schulterbewegung im vertrauten Hang unterscheiden.',
      requiresCoach: true, planEligible: false, defaultDose: { ...dose, sets: 1, repetitions: '3–5', restSeconds: 120 },
      steps: ['Mit Coach Stange, sicheren Einstieg und Rückweg prüfen; nur bei bereits vertrautem kontrolliertem Hang.', 'Ohne Armbeugung eine kleine beherrschte Schulter-/Schulterblattbewegung ausführen.', 'Ruhig in die Ausgangsposition zurückkehren; keinen maximalen Schulterweg erzwingen.', 'Vor Griffverlust oder Ausweichen mit dem eingeübten Rückweg absteigen.'],
      cues: ['Kleine Bewegung genügt.', 'Bekannter Hang ist Voraussetzung, kein Maximaltest.'], mistakes: ['Unbekannte Hangfähigkeit zum Einstieg testen.', 'Schultern in eine starre Endstellung ziehen oder passiv fallen lassen.'], easier: 'Betreute Variante mit geeignetem gesichertem Unterstützungsaufbau, separat einweisen.', harder: 'Kein automatischer Zusatzlast- oder Einarmweg.',
      setupRequirements: ['Coach, geprüfte Stange und vertrauter Hang', 'Sicherer Einstieg und Rückweg'], selectionReason: 'Vertiefende Bibliotheksoption nach Einweisung; kein allgemeiner Starter für unbekannte Zugfähigkeit.',
    },
    {
      id: 'kettlebell-floor-press', title: 'Kettlebell-Floor-Press · einarmig', topic: 'Brust', equipment: 'Kettlebell', goal: 'Eine eingewiesene Druckbewegung am Boden mit einer Kettlebell ausführen.',
      defaultDose: { ...dose, sideMultiplier: 2, setupMinutes: 3 },
      steps: ['Last, sichere Aufnahme und Ablage mit Trainer prüfen; mit einer beherrschbaren Kettlebell in Rückenlage einrichten.', 'Gewicht mit bekanntem Griff kontrollieren; Oberarm ruhig zum Boden führen.', 'Ohne Verdrehen des Rumpfs hochdrücken und weiteratmen; nicht auf den Boden aufprallen.', 'Geordnet ablegen und erst dann die Seite wechseln; Anzahl gilt je Seite.'],
      cues: ['Aufnahme und Ablage gehören zum Aufbau.', 'Ein Gewicht, zwei getrennte Seiten.'], mistakes: ['Kurzhantelgriff ungeprüft auf Kettlebell übertragen.', 'Einseitige Last durch starkes Rumpfverdrehen kompensieren.'], easier: 'Erhöhte Liegestütze, wenn kein kontrollierbares Gewicht verfügbar ist.', harder: 'Passende Last nach Einführung anpassen, keine App-Kilogrammvorgabe.',
      setupRequirements: ['Passend leichte Kettlebell und freie Bodenfläche', 'Einweisung in Griff, Aufnahme und Ablage'], selectionReason: 'Druckalternative zum Bodyweightstütz, wenn Kettlebell-Handhabung und tatsächliche Last vertraut sind; keine Bank nötig.',
    },
    {
      id: 'kettlebell-goblet-squat', title: 'Goblet Squat mit Kettlebell', topic: 'Beine', equipment: 'Kettlebell', goal: 'Vertraute Kniebeuge mit einer nah am Körper gehaltenen Last ergänzen.',
      steps: ['Passende Kettlebell und sicheren Aufnahmeweg einweisen lassen; mit beiden Händen vor dem Oberkörper halten.', 'Stabilen Stand wählen und kontrolliert Hüfte/Knie beugen.', 'Nur beherrschbare Tiefe nutzen, ruhig aufrichten und weiteratmen.', 'Gewicht mit eingeübtem Rückweg ablegen; kein Swing oder Clean zur Pflicht machen.'],
      cues: ['Last kontrollierbar nah halten.', 'Bekannte Beuge vor mehr Gewicht.'], mistakes: ['Unbekanntes Hallengewicht als passende Einstiegslast behandeln.', 'Tiefe oder Aufnahmetempo erzwingen.'], easier: 'Kniebeuge ohne Zusatzlast.', harder: 'Last oder Bewegungsweg einzeln nach Einweisung anpassen.',
      setupRequirements: ['Passende Kettlebell; vertraute Beuge und Aufnahme'], selectionReason: 'Belastete Beinkraftoption bei vertrauter Geräte-/Kraftpraxis; kein nachgewiesener High-Step- oder Landungsnutzen.', sources: [...generalSources, kettleSource],
    },
    {
      id: 'kettlebell-row', title: 'Kettlebell-Rudern · Hand auf Bank', topic: 'Rücken', equipment: 'Kettlebell', goal: 'Eine kontrollierte horizontale Zugbewegung mit stabiler Handunterstützung ausführen.',
      requiredEquipment: ['Kettlebell', 'Trainingsbank'], defaultDose: { ...dose, sideMultiplier: 2, setupMinutes: 3 },
      steps: ['Bank auf Stabilität prüfen, eine Hand abstützen und passenden Stand einrichten; Lastaufnahme vorher einweisen.', 'Kettlebell mit freier Hand ohne Rumpfschwung zum Körper führen.', 'Kontrolliert absenken, ohne den Oberkörper zu verdrehen oder Griffverlust abzuwarten.', 'Geordnet ablegen und dann Seite wechseln; Anzahl gilt je Seite.'],
      cues: ['Bankkontakt unterstützt; Stand bleibt stabil.', 'Zugweg statt Oberkörperschwung.'], mistakes: ['Bank allein aus Equipment Kettlebell ableiten.', 'Zusätzliche Zuglast nach erschöpfender Wandpraxis stapeln.'], easier: 'Geringere tatsächlich verfügbare Last nach Einweisung; keine improvisierte Stütze.', harder: 'Last nach wiederholter Kontrolle und individueller Abstimmung anpassen.',
      setupRequirements: ['Geprüfte Trainingsbank und passende Kettlebell', 'Eingewiesener stabiler Stand und Lastaufnahme'], selectionReason: 'Horizontale Zugalternative zu freien Klimmzügen; nur mit zusätzlich bestätigter Trainingsbank.',
    },
    {
      id: 'kettlebell-deadlift', title: 'Kettlebell-Deadlift · kontrolliertes Anheben', topic: 'Beine', equipment: 'Kettlebell', goal: 'Hüft-/Kniestreckung beim geordneten Anheben einer Last üben.',
      steps: ['Coach prüft Stand, Griff, Ausgangshöhe und passende tatsächlich verfügbare Last.', 'Hüfte und Knie kontrolliert beugen und Griff aufnehmen; Weg ohne erzwungene Rückenstellung wählen.', 'Ruhig aufrichten; Gewicht bleibt nahe und beide Füße belastbar.', 'Kontrolliert zurückstellen und vor erneutem Anheben neu ausrichten; kein Swing.'],
      cues: ['Aufnahmehöhe individuell einrichten.', 'Kontrolliert anheben und abstellen.'], mistakes: ['Bodentiefe unabhängig von Beweglichkeit erzwingen.', 'Schwung-/Explosivübung aus dem Anheben machen.'], easier: 'Ohne Last die Bewegung kennenlernen; geeignete Ausgangshöhe mit Trainer klären.', harder: 'Tatsächliche Last nach Einweisung anpassen; keine automatisch gesteigerte Kilogrammzahl.',
      setupRequirements: ['Passende Kettlebell, freie Fläche und geprüfte Ausgangshöhe', 'Einweisung in Hüftbeuge und Lastaufnahme'], selectionReason: 'Allgemeine belastete Hüft-/Beinoption; kein validiertes Boulder- oder Rehaprotokoll.', sources: [...generalSources, kettleSource],
    },
    {
      id: 'ez-curl', title: 'Stangen-Curl · Griff und Stangentyp prüfen', topic: 'Arme', equipment: 'EZ-Stange', goal: 'Eine kontrollierte Ellenbogenbeuge mit tatsächlich bestätigtem Gerät und bekannter Belastung ausführen.',
      steps: ['Stangentyp, Griff und Plattenlast vor Ort bestätigen; Eigengewicht, kompatible Platten und Verschlüsse mit Personal klären.', 'Passende Gesamtlast und sichere Aufnahme wählen; angenehme Griffposition nutzen und Ellenbogen kontrolliert beugen.', 'Ohne Hüftschwung langsam zurückführen und weiteratmen.', 'Geordnet ablegen; keine unbekannte Stange als garantiert leichte Einstiegslast behandeln.'],
      cues: ['Gesamtlast erst klären.', 'Kontrollierte Beuge statt Hüftschwung.'], mistakes: ['EZ-Stange mit zugesicherter Langhantel oder bekanntem Gewicht verwechseln.', 'Als allgemeine Behandlung von Ellenbogenschmerz verwenden.'], easier: 'Ohne passend kontrollierbare Last eine andere allgemeine Kraftoption wählen.', harder: 'Nur bekannte Last und geprüfte Verschlüsse nach Einweisung anpassen.',
      setupRequirements: ['Stangentyp, Griff und Plattenlast vor Ort bestätigen', 'Kompatible Platten, geprüfte Verschlüsse und geklärte tatsächliche Gesamtlast'], selectionReason: 'Optionale Armkraft-Ergänzung nach größeren Bewegungsaufgaben; kein Pflichtbaustein oder nachgewiesener Bouldertransfer.',
    },
  ];
  const exercises: TrainingExercise[] = recipes.map(recipe => ({
    area: 'strength', level: 'Redaktioneller Einstieg nach Einweisung', minutes: 0, keywords: [recipe.topic, recipe.title, recipe.equipment, 'kraft'],
    dose: '', rest: '', note: '', defaultDose: { ...dose }, planEligible: true, contentKind: 'exercise', sources: generalSources,
    ...recipe,
  }));
  exercises.push({
    id: 'fingerboard-feet-supported', title: 'Fingerboard · füßegestützte Einführung', topic: 'Fingerkraft', area: 'strength', equipment: 'Fingerboard', contentKind: 'orientation', planEligible: false, requiresCoach: true,
    level: 'Coachorientierung · kein automatischer Trainingsblock', minutes: 0, goal: 'Griff, Fußunterstützung und geordnetes Entlasten kennenlernen; anschließend individuelles Vorgehen mit Coach klären.',
    steps: ['Als erwachsene Person mit Coach bisherigen Finger-/Wandverlauf und geeignete Einführung klären; bei Beschwerden kein Belastungstest.', 'Coach prüft großes gut erreichbares Griffangebot, Boardbefestigung und stabilen Fußkontakt. Keine Bank improvisieren, um ein zu hohes Board zu erreichen.', 'Fingerposition und schrittweises Be-/Entlasten zeigen lassen. Füße bleiben unterstützt; weder frei hängen noch kleine Kanten, Zusatzgewicht oder maximales Ziehen als Einstieg fordern.', 'Coach legt fest, ob und wie danach geübt werden kann. Dauer, Umfang und Fußdruck sind individuell zu klären; Wand- und sonstige Zuglast gemeinsam berücksichtigen.'],
    cues: ['Füßegestützt ist keine bekannte Kraft in Prozent.', 'Kennenlernen ist noch kein dosiertes Fingerkraftprogramm.'], mistakes: ['Körpergewicht oder subjektiv leicht mit gemessener Fingerlast gleichsetzen.', 'Studien an Fortgeschrittenen als Anfängerfreigabe oder Verletzungsschutz verkaufen.'],
    dose: 'Keine automatische Haltedauer, Satzanzahl oder Maximaltest. Diese Karte bereitet eine betreute Einführung vor.', rest: 'Coach bestimmt Umfang, Pausen und Einbindung in die vorhandene Wandlast.', easier: 'Nur Aufbau und Entlasten erklären lassen; kein ungeklärter Versuch nötig.', harder: 'Ein Trainingsprotokoll braucht eigene Voraussetzungen und Laststeuerung; keine automatische Steigerung.',
    setupRequirements: ['Erwachsenenpfad, Coach und individuell geklärte Voraussetzungen', 'Geprüftes erreichbares Board mit stabiler Fußunterstützung'], selectionReason: 'Lesbare Einsteigerorientierung zur Handhabung; kein bewiesenes Anfänger-Trainingsrezept und keine automatisch einplanbare Dosis.',
    note: 'Stabile Fußunterstützung allein bestätigt keine passende individuelle Fingerlast. Diese Einführung wurde nicht als Anfängerintervention validiert. Bei neuem oder zunehmendem Schmerz, Funktionsverlust oder Kontrollverlust beenden; Beschwerden und Wiedereinstieg gehören in einen fachlich abgestimmten Pfad.', keywords: ['finger', 'fingerboard', 'hangboard', 'füßegestützt', 'einführung', 'fingerkraft'],
    sources: [{ label: 'Devise et al. 2022: Trainingsintensitäten', url: 'https://doi.org/10.3389/fspor.2022.862782', context: 'Primärstudie an fortgeschrittenen/Elite-Kletternden mit gemessener maximaler Fingerkraft; teils Füße am Boden zur Intensitätssteuerung. Kein Nachweis dieser Anfängerorientierung oder einer pauschalen sicheren Einsteigerdosis.' }],
  });
  return exercises;
}
