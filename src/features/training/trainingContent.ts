import type { TrainingDose, TrainingExercise } from './types';

const dose: TrainingDose = { sets: 2, repetitions: '6–10', restSeconds: 120, restScope: 'sets', secondsPerRepetition: 4, setupMinutes: 2 };
const coreSource = { label: 'Mayo Clinic: Rumpfübungen', url: 'https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/core-strength/art-20546851', context: 'Offizielle Bewegungsinformation zu Bridge und Seitstütz; diese vereinfachte Variante und Dosierung sind redaktionell, kein geprüfter Bouldertransfer.' };
const kettleSource = { label: 'ACE: Kettlebell-Grundlagen', url: 'https://www.acefitness.org/resources/pros/expert-articles/5269/how-to-get-started-with-kettlebells/', context: 'Trainerinformation zu kontrolliertem Einstieg, Goblet Squat und Deadlift. Keine Primärstudie dieses Boulderprogramms; die Kartendosis ist redaktionell.' };
type Recipe = Pick<TrainingExercise, 'id' | 'title' | 'topic' | 'equipment' | 'goal' | 'steps' | 'cues' | 'mistakes' | 'easier' | 'harder' | 'selectionReason' | 'setupRequirements'> & Partial<TrainingExercise>;

/** Editorial instruction cards. Scientific sources support only their stated scope. */
export function additionalTrainingContent(generalSources: TrainingExercise['sources']): TrainingExercise[] {
  const recipes: Recipe[] = [
    {
      id: 'bodyweight-squat', title: 'Kniebeuge mit Körpergewicht', topic: 'Beine', equipment: 'Körpergewicht', goal: 'Beine mit Kniebeugen ohne Zusatzgewicht trainieren.',
      steps: ['Auf rutschfestem Boden stabil stehen, Füße bequem auseinander. Bei Bedarf festhalten.', 'Hüfte und Knie beugen. Füße bleiben am Boden.', 'Nur so tief gehen, wie du stabil bleibst. Ruhig wieder aufrichten und weiteratmen.', 'Bei Ausweichen weniger tief gehen. An einer Bank kontrolliert hinsetzen, nicht fallen lassen.'],
      cues: ['Stabiler Stand vor großer Tiefe.', 'Knie bewegen sich passend zu den Füßen.'], mistakes: ['Für mehr Tiefe das Gleichgewicht verlieren.', 'Knie oder Fuß in eine unbequeme Richtung zwingen.'], easier: 'Kürzerer Weg oder stabile Handunterstützung.', harder: 'Nach Einführung Goblet Squat mit passend gewählter Kettlebell.',
      setupRequirements: ['Rutschfester Boden; bei Bedarf stabile Haltemöglichkeit'], selectionReason: 'Allgemeine Beinkraftoption ohne zusätzliche Griffbelastung; kein Nachweis verbesserter Boulderlandungen.',
    },
    {
      id: 'glute-bridge', title: 'Beckenheben · Glute Bridge', topic: 'Beine', equipment: 'Körpergewicht', goal: 'Das Becken aus Rückenlage kontrolliert anheben.',
      steps: ['Auf den Rücken legen, Knie beugen und Füße stabil aufstellen.', 'Becken ruhig anheben. Nur so hoch, wie du die Haltung kontrollieren kannst.', 'Weiteratmen; nicht ins Hohlkreuz drücken.', 'Becken langsam ablegen. Beide Füße bleiben am Boden.'],
      cues: ['Ruhig anheben und ablegen.', 'Keine maximale Höhe nötig.'], mistakes: ['Für mehr Höhe ins Hohlkreuz drücken.', 'Die Luft anhalten.'], easier: 'Kürzerer kontrollierter Weg.', harder: 'Etwas längerer Weg bei gleicher Kontrolle, keine automatische Einbeinpflicht.',
      setupRequirements: ['Freie angenehme Bodenfläche'], selectionReason: 'Hüft-/Rumpfoption ohne Handlast; ein direkter Überhangtransfer ist nicht belegt.', sources: [...generalSources, coreSource],
    },
    {
      id: 'calf-raise', title: 'Fersenheben im Stand', topic: 'Beine', equipment: 'Körpergewicht', goal: 'Waden durch kontrolliertes Fersenheben trainieren.',
      steps: ['Auf ebenem Boden stehen und an einer stabilen Stütze festhalten.', 'Beide Fersen ruhig anheben. Nicht auf die Fußaußenkanten kippen.', 'Fersen langsam zum Boden senken. Nicht federn.', 'Nur einen gut kontrollierbaren Weg nutzen; kein Treppenrand für den Einstieg.'],
      cues: ['Festhalten ist erlaubt.', 'Langsam senken statt federn.'], mistakes: ['Bei Balanceverlust weiterzählen.', 'Nach außen abrollen.'], easier: 'Kleinerer Weg und mehr Handunterstützung.', harder: 'Eine etwas längere beherrschte Bewegung; Einbein-/Zusatzlastvariante erst nach Einweisung.',
      setupRequirements: ['Ebener Boden und stabile Haltemöglichkeit'], selectionReason: 'Allgemeine Unterschenkeloption; Reibungstritte und Sprungleistung werden dadurch nicht automatisch verbessert.',
    },
    {
      id: 'side-plank', title: 'Seitstütz auf Knien · kurze Haltephasen', topic: 'Rumpf', equipment: 'Körpergewicht', goal: 'Rumpf im knienden Seitstütz kurz stabil halten.',
      defaultDose: { ...dose, sets: 1, repetitions: '2', repetitionUnit: 'Haltephasen', restSeconds: 60, restScope: 'repetitions', secondsPerRepetition: 10, sideMultiplier: 2 },
      dose: 'Beispiel: 2 Haltephasen je Seite, jeweils bis etwa 10 Sekunden. Kürzer ist erlaubt.',
      steps: ['Seitlich liegen und Knie beugen. Unterarm unter der Schulter aufsetzen.', 'Becken anheben. Unterarm und Knie tragen; nur so hoch, wie du stabil bleibst.', 'Bis etwa 10 Sekunden ruhig atmen. Früher aufhören ist erlaubt.', 'Kontrolliert ablegen, Pause machen und Seite wechseln.'],
      cues: ['Knie und Unterarm tragen.', 'Atmen ist wichtiger als lange halten.'], mistakes: ['Schulterbeschwerden durch langes Halten testen.', 'Trotz Kontrollverlust weiterhalten.'], easier: 'Sehr kurz halten oder liegend Position kennenlernen.', harder: 'Längeren Hebel nur nach Einführung; nicht gleichzeitig Dauer und Umfang erhöhen.',
      setupRequirements: ['Rutschfeste Bodenfläche und beschwerdefrei kontrollierbarer Unterarmstütz'], selectionReason: 'Seitliche Rumpfkontrolle ohne Fingergriffe; keine garantierte bessere Körperspannung an der Wand.', sources: [...generalSources, coreSource],
    },
    {
      id: 'scapular-pullup', title: 'Kleine Schulterbewegung an der Stange', topic: 'Rücken', equipment: 'Klimmzugstange', goal: 'Im vertrauten Hang eine kleine Schulterblattbewegung üben.',
      requiresCoach: true, planEligible: false, defaultDose: { ...dose, sets: 1, repetitions: '3–5', restSeconds: 120 },
      steps: ['Mit Coach sicheren Einstieg und Rückweg klären. Nur bei bereits vertrautem Hang beginnen.', 'Arme gestreckt lassen und Schultern kontrolliert ein kleines Stück vom Ohr wegbewegen.', 'Langsam zur Ausgangsposition zurückkehren. Kein maximaler Schulterweg.', 'Vor Griffverlust oder Ausweichen mit dem eingeübten Rückweg absteigen.'],
      cues: ['Arme bleiben gestreckt.', 'Kleine Bewegung ohne Schwung.'], mistakes: ['Die Ellbogen zum Klimmzug beugen.', 'Unbekannte Hangfähigkeit im Maximaltest ausprobieren.'], easier: 'Betreute Variante mit geeignetem gesichertem Unterstützungsaufbau, separat einweisen.', harder: 'Kein automatischer Zusatzlast- oder Einarmweg.',
      setupRequirements: ['Coach, geprüfte Stange und vertrauter Hang', 'Sicherer Einstieg und Rückweg'], selectionReason: 'Vertiefende Bibliotheksoption nach Einweisung; kein allgemeiner Starter für unbekannte Zugfähigkeit.',
    },
    {
      id: 'kettlebell-floor-press', title: 'Kettlebell-Floor-Press · einarmig', topic: 'Brust', equipment: 'Kettlebell', goal: 'Eine Kettlebell aus Rückenlage einarmig hochdrücken.',
      defaultDose: { ...dose, sideMultiplier: 2, setupMinutes: 3 },
      steps: ['Griff, leichte Last, Aufnehmen und Ablegen zeigen lassen. Auf den Rücken legen und Füße aufstellen.', 'Kettlebell mit einem Arm über der Brust kontrollieren; Handgelenk stabil halten.', 'Oberarm langsam zum Boden senken, sanft aufsetzen und wieder hochdrücken. Rumpf nicht verdrehen.', 'Kontrolliert ablegen, erst dann Seite wechseln. Die Anzahl gilt je Seite.'],
      cues: ['Ein Arm arbeitet; Rumpf bleibt ruhig.', 'Aufnehmen und Ablegen mitlernen.'], mistakes: ['Kettlebell unkontrolliert auf den Unterarm kippen lassen.', 'Mit dem Oberkörper stark verdrehen.'], easier: 'Erhöhte Liegestütze, wenn kein kontrollierbares Gewicht verfügbar ist.', harder: 'Passende Last nach Einführung anpassen, keine App-Kilogrammvorgabe.',
      setupRequirements: ['Passend leichte Kettlebell und freie Bodenfläche', 'Griff, Aufnahme und Ablage vorher zeigen lassen'], selectionReason: 'Druckalternative zum Bodyweightstütz, wenn Kettlebell-Handhabung und tatsächliche Last vertraut sind; keine Bank nötig.',
    },
    {
      id: 'kettlebell-goblet-squat', title: 'Goblet Squat mit Kettlebell', topic: 'Beine', equipment: 'Kettlebell', goal: 'Beine mit Kettlebell-Kniebeugen trainieren.',
      steps: ['Passende Last und Aufnahme zeigen lassen. Kettlebell mit beiden Händen nah vor der Brust halten.', 'Stabil stehen; Hüfte und Knie kontrolliert beugen.', 'Nur so tief gehen, wie du Haltung und Gewicht kontrollierst. Ruhig wieder aufrichten.', 'Weiteratmen und Kettlebell mit dem eingeübten Rückweg abstellen.'],
      cues: ['Gewicht nah am Körper halten.', 'Erst die Kniebeuge, dann mehr Last.'], mistakes: ['Unbekanntes Hallengewicht ungeprüft verwenden.', 'Für mehr Tiefe die Haltung verlieren.'], easier: 'Kniebeuge ohne Zusatzlast.', harder: 'Last oder Bewegungsweg einzeln nach Einweisung anpassen.',
      setupRequirements: ['Passende Kettlebell; Aufnahme und Kniebeuge sind vertraut'], selectionReason: 'Belastete Beinkraftoption bei vertrauter Geräte-/Kraftpraxis; kein nachgewiesener High-Step- oder Landungsnutzen.', sources: [...generalSources, kettleSource],
    },
    {
      id: 'kettlebell-row', title: 'Kettlebell-Rudern · Hand auf Bank', topic: 'Rücken', equipment: 'Kettlebell', goal: 'Mit Handstütz auf der Bank eine Kettlebell zum Körper ziehen.',
      requiredEquipment: ['Kettlebell', 'Trainingsbank'], defaultDose: { ...dose, sideMultiplier: 2, setupMinutes: 3 },
      steps: ['Stabile Bank und passende Last prüfen. Eine Hand abstützen, Füße sicher aufstellen.', 'Mit freier Hand die Kettlebell zum Körper ziehen; Ellbogen nach hinten führen.', 'Ruhig absenken. Oberkörper nicht verdrehen und nicht mit Schwung ziehen.', 'Kontrolliert ablegen und Seite wechseln. Die Anzahl gilt je Seite.'],
      cues: ['Handstütz und Füße bleiben stabil.', 'Ziehen ohne Oberkörperschwung.'], mistakes: ['Mit dem Oberkörper Schwung holen.', 'Zu viel Zuglast nach anstrengendem Bouldern ergänzen.'], easier: 'Geringere tatsächlich verfügbare Last nach Einweisung; keine improvisierte Stütze.', harder: 'Last nach wiederholter Kontrolle und individueller Abstimmung anpassen.',
      setupRequirements: ['Stabile Trainingsbank und passende Kettlebell', 'Stand und Lastaufnahme vorher zeigen lassen'], selectionReason: 'Horizontale Zugalternative zu freien Klimmzügen; nur mit zusätzlich bestätigter Trainingsbank.',
    },
    {
      id: 'kettlebell-deadlift', title: 'Kettlebell-Deadlift · kontrolliertes Anheben', topic: 'Beine', equipment: 'Kettlebell', goal: 'Eine Kettlebell kontrolliert anheben und abstellen.',
      steps: ['Mit Coach passende Last, Griff und erreichbare Ausgangshöhe prüfen.', 'Hüfte und Knie beugen und Griff mit beiden Händen fassen. Keine Tiefe erzwingen.', 'Ruhig aufrichten, Gewicht nah halten und beide Füße am Boden lassen.', 'Kontrolliert zurückstellen. Vor dem nächsten Anheben neu ausrichten; nicht schwingen.'],
      cues: ['Nah am Körper anheben.', 'Anheben und Abstellen kontrollieren.'], mistakes: ['Für Bodenkontakt eine unbequeme Rückenstellung erzwingen.', 'Mit Schwung anheben.'], easier: 'Ohne Last die Bewegung kennenlernen; geeignete Ausgangshöhe mit Trainer klären.', harder: 'Tatsächliche Last nach Einweisung anpassen; keine automatisch gesteigerte Kilogrammzahl.',
      setupRequirements: ['Passende Kettlebell, freie Fläche und geprüfte Ausgangshöhe', 'Einweisung in Hüftbeuge und Lastaufnahme'], selectionReason: 'Allgemeine belastete Hüft-/Beinoption; kein validiertes Boulder- oder Rehaprotokoll.', sources: [...generalSources, kettleSource],
    },
    {
      id: 'ez-curl', title: 'Bizeps-Curl mit EZ-Stange', topic: 'Arme', equipment: 'EZ-Stange', goal: 'Die Stange durch Beugen der Ellbogen anheben.',
      steps: ['Mit Personal Stangentyp, Griff, Gesamtgewicht und Plattenverschlüsse prüfen.', 'Stabil stehen. Stange mit bequemem Griff halten und Ellbogen beugen.', 'Ruhig wieder senken und weiteratmen. Hüfte und Oberkörper bleiben ohne Schwung.', 'Mit dem eingeübten Rückweg ablegen. Unbekanntes Stangengewicht nicht als leichte Last annehmen.'],
      cues: ['Gesamtgewicht zuerst klären.', 'Ellbogen beugen, nicht mit der Hüfte schwingen.'], mistakes: ['Stangengewicht oder Verschlüsse nicht prüfen.', 'Schwung aus Hüfte und Oberkörper holen.'], easier: 'Ohne passend kontrollierbare Last eine andere allgemeine Kraftoption wählen.', harder: 'Nur bekannte Last und geprüfte Verschlüsse nach Einweisung anpassen.',
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
    level: 'Coachorientierung · kein automatischer Trainingsblock', minutes: 0, goal: 'Mit Coach Griff, Fußunterstützung und Entlasten kennenlernen.',
    steps: ['Als erwachsene Person mit Coach Voraussetzungen klären. Bei Beschwerden keinen Belastungstest machen.', 'Coach prüft Befestigung, große erreichbare Griffe und stabile Fußunterstützung. Keine improvisierte Bank für ein zu hohes Board.', 'Fingerposition und langsames Be- und Entlasten zeigen lassen. Füße bleiben unterstützt; kein freier Hang, kleine Kanten oder Zusatzgewicht.', 'Coach klärt Dauer, Pausen und Einbindung ins Bouldern. Diese Einführung gibt kein selbstständiges Trainingsprogramm vor.'],
    cues: ['Füße bleiben unterstützt.', 'Keine automatische Haltedauer oder Last.'], mistakes: ['Fußunterstützung als Beweis einer passenden Fingerlast ansehen.', 'Maximal ziehen oder frei hängen.'],
    dose: 'Keine automatische Haltedauer, Satzanzahl oder Maximaltest. Diese Karte bereitet eine betreute Einführung vor.', rest: 'Coach bestimmt Umfang, Pausen und Einbindung in die vorhandene Wandlast.', easier: 'Nur Aufbau und Entlasten erklären lassen; kein ungeklärter Versuch nötig.', harder: 'Ein Trainingsprotokoll braucht eigene Voraussetzungen und Laststeuerung; keine automatische Steigerung.',
    setupRequirements: ['Erwachsene mit Coach und geklärten Voraussetzungen', 'Erreichbares, geprüftes Board und stabile Fußunterstützung'], selectionReason: 'Lesbare Einsteigerorientierung zur Handhabung; kein bewiesenes Anfänger-Trainingsrezept und keine automatisch einplanbare Dosis.',
    note: 'Fußunterstützung garantiert keine passende Fingerlast. Bei neuem oder zunehmendem Schmerz, Funktions- oder Kontrollverlust aufhören; Beschwerden und Wiedereinstieg fachlich klären.', keywords: ['finger', 'fingerboard', 'hangboard', 'füßegestützt', 'einführung', 'fingerkraft'],
    sources: [{ label: 'Devise et al. 2022: Trainingsintensitäten', url: 'https://doi.org/10.3389/fspor.2022.862782', context: 'Primärstudie an fortgeschrittenen/Elite-Kletternden mit gemessener maximaler Fingerkraft; teils Füße am Boden zur Intensitätssteuerung. Kein Nachweis dieser Anfängerorientierung oder einer pauschalen sicheren Einsteigerdosis.' }],
  });
  return exercises;
}
