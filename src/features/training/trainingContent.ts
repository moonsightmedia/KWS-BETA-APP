import type { TrainingDose, TrainingExercise } from './types';

const dose: TrainingDose = { sets: 2, repetitions: '6–10', restSeconds: 120, restScope: 'sets', secondsPerRepetition: 4, setupMinutes: 2 };
const coreSource = { label: 'Mayo Clinic: Rumpfübungen', url: 'https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/core-strength/art-20546851', context: 'Offizielle Bewegungsinformation zu Bridge und Seitstütz; diese vereinfachte Variante und Dosierung sind redaktionell, kein geprüfter Bouldertransfer.' };
const kettleSource = { label: 'ACE: Kettlebell-Grundlagen', url: 'https://www.acefitness.org/resources/pros/expert-articles/5269/how-to-get-started-with-kettlebells/', context: 'Trainerinformation zu kontrolliertem Einstieg, Goblet Squat und Deadlift. Keine Primärstudie dieses Boulderprogramms; die Kartendosis ist redaktionell.' };
type Recipe = Pick<TrainingExercise, 'id' | 'title' | 'topic' | 'equipment' | 'goal' | 'steps' | 'cues' | 'mistakes' | 'easier' | 'harder' | 'selectionReason' | 'setupRequirements'> & Partial<TrainingExercise>;

/** Editorial instruction cards. Scientific sources support only their stated scope. */
export function additionalTrainingContent(generalSources: TrainingExercise['sources']): TrainingExercise[] {
  const recipes: Recipe[] = [
    {
      id: 'bodyweight-squat', title: 'Kniebeuge mit Körpergewicht', topic: 'Beine', equipment: 'Körpergewicht', goal: 'Beine mit Kniebeugen trainieren.',
      steps: ['Rutschfest und stabil stehen; Füße bequem auseinander. Bei Bedarf festhalten.', 'Hüfte und Knie beugen. Füße bleiben am Boden.', 'Nur so tief gehen, wie du stabil bleibst. Aufrichten und weiteratmen.', 'Bei Wackeln weniger tief gehen. Auf einer Bank langsam hinsetzen, nicht fallen lassen.'],
      cues: ['Stabiler Stand vor großer Tiefe.', 'Knie bewegen sich passend zu den Füßen.'], mistakes: ['Für mehr Tiefe das Gleichgewicht verlieren.', 'Knie oder Fuß in eine unbequeme Richtung zwingen.'], easier: 'Kürzerer Weg oder stabile Handunterstützung.', harder: 'Nach Einweisung eine passende Kettlebell vor der Brust halten.',
      setupRequirements: ['Rutschfester Boden; bei Bedarf stabile Haltemöglichkeit'], selectionReason: 'Beinkraft ohne zusätzliches Greifen. Bessere Boulderlandungen sind dadurch nicht nachgewiesen.',
    },
    {
      id: 'glute-bridge', title: 'Beckenheben · Glute Bridge', topic: 'Beine', equipment: 'Körpergewicht', goal: 'Das Becken vom Boden anheben.',
      steps: ['Auf den Rücken legen; Knie beugen und Füße aufstellen.', 'Becken ruhig anheben, nur so hoch, wie du es kontrollierst.', 'Weiteratmen. Nicht ins Hohlkreuz drücken.', 'Becken langsam ablegen. Beide Füße bleiben am Boden.'],
      cues: ['Ruhig anheben und ablegen.', 'Keine maximale Höhe nötig.'], mistakes: ['Für mehr Höhe ins Hohlkreuz drücken.', 'Die Luft anhalten.'], easier: 'Weniger hoch anheben.', harder: 'Etwas höher anheben, wenn du stabil bleibst. Kein Wechsel auf ein Bein nötig.',
      setupRequirements: ['Freie angenehme Bodenfläche'], selectionReason: 'Übt Hüfte und Rumpf ohne Handstütz. Ein Vorteil im Überhang ist nicht belegt.', sources: [...generalSources, coreSource],
    },
    {
      id: 'calf-raise', title: 'Fersenheben im Stand', topic: 'Beine', equipment: 'Körpergewicht', goal: 'Waden mit Fersenheben trainieren.',
      steps: ['Auf ebenem Boden stehen und stabil festhalten.', 'Beide Fersen ruhig heben. Nicht auf die Fußaußenkanten kippen.', 'Fersen langsam senken. Nicht federn.', 'Nur so weit bewegen, wie du stabil bleibst. Zum Einstieg keinen Treppenrand nutzen.'],
      cues: ['Festhalten ist erlaubt.', 'Langsam senken statt federn.'], mistakes: ['Bei Balanceverlust weiterzählen.', 'Nach außen abrollen.'], easier: 'Kleinerer Weg und mehr Handunterstützung.', harder: 'Etwas weiter heben. Ein Bein oder Zusatzgewicht erst nach Einweisung.',
      setupRequirements: ['Ebener Boden und stabile Haltemöglichkeit'], selectionReason: 'Trainiert die Waden. Bessere Reibungstritte oder Sprünge folgen daraus nicht automatisch.',
    },
    {
      id: 'side-plank', title: 'Seitstütz auf Knien · kurze Haltephasen', topic: 'Rumpf', equipment: 'Körpergewicht', goal: 'Seitlich auf Unterarm und Knien abstützen.',
      defaultDose: { ...dose, sets: 1, repetitions: '2', repetitionUnit: 'Haltephasen', restSeconds: 60, restScope: 'repetitions', secondsPerRepetition: 10, sideMultiplier: 2 },
      dose: 'Beispiel: 2 Haltephasen je Seite, jeweils bis etwa 10 Sekunden. Kürzer ist erlaubt.',
      steps: ['Seitlich liegen; Knie beugen und Unterarm unter die Schulter setzen.', 'Becken anheben. Unterarm und Knie tragen; stabil bleiben.', 'Bis etwa 10 Sekunden ruhig atmen. Früher aufhören ist erlaubt.', 'Langsam ablegen, Pause machen und Seite wechseln.'],
      cues: ['Knie und Unterarm tragen.', 'Atmen ist wichtiger als lange halten.'], mistakes: ['Schulterbeschwerden durch langes Halten testen.', 'Trotz Kontrollverlust weiterhalten.'], easier: 'Kürzer halten oder die Stellung im Liegen kennenlernen.', harder: 'Beine erst nach Einführung strecken. Dauer und Anzahl nicht zugleich erhöhen.',
      setupRequirements: ['Rutschfester Boden; Unterarmstütz ist schmerzfrei möglich'], selectionReason: 'Rumpfübung ohne Fingergriffe. Bessere Körperspannung an der Wand ist nicht garantiert.', sources: [...generalSources, coreSource],
    },
    {
      id: 'scapular-pullup', title: 'Kleine Schulterbewegung an der Stange', topic: 'Rücken', equipment: 'Klimmzugstange', goal: 'Im Hang die Schultern ein kleines Stück bewegen.',
      requiresCoach: true, planEligible: false, defaultDose: { ...dose, sets: 1, repetitions: '3–5', restSeconds: 120 },
      steps: ['Coach klärt Einstieg und Rückweg. Nur bei vertrautem Hang beginnen.', 'Arme gestreckt lassen; Schultern ein kleines Stück von den Ohren wegbewegen.', 'Langsam zurückkehren. Bewegung klein halten.', 'Vor Griffverlust oder Ausweichen über den geübten Rückweg absteigen.'],
      cues: ['Arme bleiben gestreckt.', 'Kleine Bewegung ohne Schwung.'], mistakes: ['Die Ellbogen zum Klimmzug beugen.', 'Unbekannte Hangfähigkeit im Maximaltest ausprobieren.'], easier: 'Mit Coach einen sicheren Aufbau mit Unterstützung kennenlernen.', harder: 'Zusatzgewicht oder einarmige Variante sind hier nicht vorgesehen.',
      setupRequirements: ['Coach, geprüfte Stange und vertrauter Hang', 'Sicherer Einstieg und Rückweg'], selectionReason: 'Für einen bereits vertrauten Hang nach Einweisung. Kein Einstieg bei unbekannter Klimmzugfähigkeit.',
    },
    {
      id: 'kettlebell-floor-press', title: 'Kettlebell-Floor-Press · einarmig', topic: 'Brust', equipment: 'Kettlebell', goal: 'Eine Kettlebell im Liegen hochdrücken.',
      defaultDose: { ...dose, sideMultiplier: 2, setupMinutes: 3 },
      steps: ['Passendes Gewicht, Griff und Ablegen zeigen lassen. Auf den Rücken legen; Füße aufstellen.', 'Kettlebell mit einem Arm über der Brust halten. Handgelenk stabil halten.', 'Oberarm sanft zum Boden senken und hochdrücken. Körper nicht verdrehen.', 'Kontrolliert ablegen, dann Seite wechseln. Die Anzahl gilt je Seite.'],
      cues: ['Ein Arm drückt; Körper bleibt ruhig.', 'Aufnehmen und Ablegen zeigen lassen.'], mistakes: ['Kettlebell unkontrolliert auf den Unterarm kippen lassen.', 'Mit dem Oberkörper stark verdrehen.'], easier: 'Erhöhte Liegestütze, wenn kein kontrollierbares Gewicht verfügbar ist.', harder: 'Gewicht nach Einweisung anpassen. Die App gibt keine Kilogrammzahl vor.',
      setupRequirements: ['Passend leichte Kettlebell und freie Bodenfläche', 'Griff, Aufnehmen und Ablegen zeigen lassen'], selectionReason: 'Drücken ohne Bank. Gewicht und Kettlebell-Handhabung müssen dir vertraut sein.',
    },
    {
      id: 'kettlebell-goblet-squat', title: 'Goblet Squat mit Kettlebell', topic: 'Beine', equipment: 'Kettlebell', goal: 'Kniebeugen mit einer Kettlebell vor der Brust.',
      steps: ['Gewicht und Aufnahme zeigen lassen. Kettlebell beidhändig nah vor der Brust halten.', 'Stabil stehen; Hüfte und Knie beugen.', 'Nur so tief gehen, wie du stabil bleibst. Ruhig aufrichten.', 'Weiteratmen. Kettlebell so abstellen, wie es dir gezeigt wurde.'],
      cues: ['Gewicht nah am Körper.', 'Erst sicher beugen, dann mehr Gewicht.'], mistakes: ['Unbekanntes Hallengewicht ungeprüft verwenden.', 'Für mehr Tiefe die Haltung verlieren.'], easier: 'Kniebeuge ohne Zusatzlast.', harder: 'Nach Einweisung Gewicht oder Tiefe einzeln erhöhen.',
      setupRequirements: ['Passende Kettlebell; Aufnahme und Kniebeuge sind vertraut'], selectionReason: 'Beinkraft mit Gewicht bei vertrauter Ausführung. Ein Nutzen für hohe Tritte oder Landungen ist nicht nachgewiesen.', sources: [...generalSources, kettleSource],
    },
    {
      id: 'kettlebell-row', title: 'Kettlebell-Rudern · Hand auf Bank', topic: 'Rücken', equipment: 'Kettlebell', goal: 'Abgestützt eine Kettlebell zum Körper ziehen.',
      requiredEquipment: ['Kettlebell', 'Trainingsbank'], defaultDose: { ...dose, sideMultiplier: 2, setupMinutes: 3 },
      steps: ['Stabile Bank und passendes Gewicht prüfen. Eine Hand aufstützen; Füße sicher stellen.', 'Kettlebell mit der freien Hand zum Körper ziehen. Ellbogen nach hinten führen.', 'Ruhig senken. Körper nicht verdrehen; keinen Schwung holen.', 'Kontrolliert ablegen und Seite wechseln. Die Anzahl gilt je Seite.'],
      cues: ['Handstütz und Füße bleiben stabil.', 'Ziehen ohne Oberkörperschwung.'], mistakes: ['Mit dem Oberkörper Schwung holen.', 'Zu viel Zuglast nach anstrengendem Bouldern ergänzen.'], easier: 'Nach Einweisung leichteres Gewicht wählen. Nur an einer stabilen Bank abstützen.', harder: 'Gewicht erst nach sicherer Ausführung und Rücksprache erhöhen.',
      setupRequirements: ['Stabile Trainingsbank und passende Kettlebell', 'Stand und Aufnehmen zeigen lassen'], selectionReason: 'Eine Zugübung statt freier Klimmzüge. Du brauchst eine stabile Trainingsbank.',
    },
    {
      id: 'kettlebell-deadlift', title: 'Kettlebell-Deadlift · kontrolliertes Anheben', topic: 'Beine', equipment: 'Kettlebell', goal: 'Eine Kettlebell anheben und wieder abstellen.',
      steps: ['Coach prüft Gewicht, Griff und erreichbare Ausgangshöhe.', 'Hüfte und Knie beugen; Griff mit beiden Händen fassen. Keine Tiefe erzwingen.', 'Ruhig aufrichten. Gewicht nah halten; beide Füße bleiben am Boden.', 'Langsam abstellen. Vor dem nächsten Anheben neu ausrichten; nicht schwingen.'],
      cues: ['Nah am Körper anheben.', 'Anheben und Abstellen kontrollieren.'], mistakes: ['Für Bodenkontakt eine unbequeme Rückenstellung erzwingen.', 'Mit Schwung anheben.'], easier: 'Bewegung ohne Gewicht lernen. Ausgangshöhe mit Coach klären.', harder: 'Gewicht nach Einweisung anpassen. Keine automatische Gewichtserhöhung.',
      setupRequirements: ['Passende Kettlebell; freie Fläche und erreichbare Ausgangshöhe', 'Beugen und Aufnehmen zeigen lassen'], selectionReason: 'Kraftübung für Hüfte und Beine. Der Ablauf ist kein geprüftes Boulder- oder Rehaprogramm.', sources: [...generalSources, kettleSource],
    },
    {
      id: 'ez-curl', title: 'Bizeps-Curl mit EZ-Stange', topic: 'Arme', equipment: 'EZ-Stange', goal: 'Die EZ-Stange durch Beugen der Ellbogen heben.',
      steps: ['Personal prüft Stange, Griff, Gesamtgewicht und Plattenverschlüsse.', 'Stabil stehen. Stange bequem greifen und Ellbogen beugen.', 'Ruhig senken und weiteratmen. Hüfte und Oberkörper bleiben ohne Schwung.', 'Stange so ablegen, wie es dir gezeigt wurde. Unbekanntes Gewicht nicht als leicht annehmen.'],
      cues: ['Gesamtgewicht zuerst klären.', 'Ellbogen beugen, nicht mit der Hüfte schwingen.'], mistakes: ['Stangengewicht oder Verschlüsse nicht prüfen.', 'Schwung aus Hüfte und Oberkörper holen.'], easier: 'Ist kein passendes Gewicht verfügbar? Andere Kraftübung wählen.', harder: 'Gewicht nur nach Einweisung mit passenden, geprüften Verschlüssen ändern.',
      setupRequirements: ['Stange, Griff und Platten vor Ort prüfen', 'Passende Platten, sichere Verschlüsse und bekanntes Gesamtgewicht'], selectionReason: 'Optionale Armübung nach größeren Bewegungen. Kein Pflichtteil und kein nachgewiesener Vorteil beim Bouldern.',
    },
  ];
  const exercises: TrainingExercise[] = recipes.map(recipe => ({
    area: 'strength', level: 'Redaktioneller Einstieg nach Einweisung', minutes: 0, keywords: [recipe.topic, recipe.title, recipe.equipment, 'kraft'],
    dose: '', rest: '', note: '', defaultDose: { ...dose }, planEligible: true, contentKind: 'exercise', sources: generalSources,
    ...recipe,
  }));
  exercises.push({
    id: 'fingerboard-feet-supported', title: 'Fingerboard · füßegestützte Einführung', topic: 'Fingerkraft', area: 'strength', equipment: 'Fingerboard', contentKind: 'orientation', planEligible: false, requiresCoach: true,
    level: 'Coachorientierung · kein automatischer Trainingsblock', minutes: 0, goal: 'Mit Coach Griff und Fußunterstützung kennenlernen.',
    steps: ['Als erwachsene Person Voraussetzungen mit Coach klären. Bei Beschwerden keinen Belastungstest machen.', 'Coach prüft Board, große erreichbare Griffe und feste Fußunterstützung. Keine Bank unter ein zu hohes Board improvisieren.', 'Fingerstellung und langsames Ziehen und Loslassen zeigen lassen. Füße bleiben unterstützt; kein freier Hang, kleine Kanten oder Zusatzgewicht.', 'Dauer, Pausen und Einbindung mit Coach klären. Diese Einführung ist kein eigenes Trainingsprogramm.'],
    cues: ['Füße bleiben unterstützt.', 'Keine automatische Haltedauer oder Last.'], mistakes: ['Fußunterstützung als Beweis einer passenden Fingerlast ansehen.', 'Maximal ziehen oder frei hängen.'],
    dose: 'Keine automatische Haltedauer, Satzanzahl oder Maximaltest. Diese Karte bereitet eine betreute Einführung vor.', rest: 'Coach bestimmt Umfang, Pausen und Einbindung in die vorhandene Wandlast.', easier: 'Nur Aufbau und Loslassen zeigen lassen; keinen ungeklärten Versuch machen.', harder: 'Ein Trainingsprogramm braucht eigene Voraussetzungen und passende Belastung. Keine automatische Steigerung.',
    setupRequirements: ['Erwachsene mit Coach und geklärten Voraussetzungen', 'Erreichbares, geprüftes Board und stabile Fußunterstützung'], selectionReason: 'Bereitet eine betreute Einführung vor. Kein nachgewiesenes Anfängerprogramm und keine automatisch einplanbare Dosis.',
    note: 'Fußstütze allein sagt nichts über passende Belastung. Bei neuem oder zunehmendem Schmerz, Kraft- oder Bewegungsverlust oder fehlender Kontrolle aufhören. Beschwerden und Rückkehr fachlich klären.', keywords: ['finger', 'fingerboard', 'hangboard', 'füßegestützt', 'einführung', 'fingerkraft'],
    sources: [{ label: 'Devise et al. 2022: Trainingsintensitäten', url: 'https://doi.org/10.3389/fspor.2022.862782', context: 'Primärstudie an fortgeschrittenen/Elite-Kletternden mit gemessener maximaler Fingerkraft; teils Füße am Boden zur Intensitätssteuerung. Kein Nachweis dieser Anfängerorientierung oder einer pauschalen sicheren Einsteigerdosis.' }],
  });
  return exercises;
}
