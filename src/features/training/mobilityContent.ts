import type { TrainingExercise } from './types';

const stretchSource = { label: 'Mayo Clinic: grundlegende Dehnübungen', url: 'https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/stretching/art-20546848', context: 'Offizielle Gesundheitsinformation zu Schulter-, Hüft-, Oberschenkel- und Wadendehnung. Beschreibt sanftes Halten, Aufwärmen und etwa 30 Sekunden; der kurze App-Beispielumfang ist redaktionell, kein individueller Therapieplan oder belegter Bouldertransfer.' };
const wristSource = { label: 'Cambridge University Hospitals: Hand und Handgelenk bewegen', url: 'https://www.cuh.nhs.uk/patient-information/wrist-range-of-movement-exercises/', context: 'Patienteninformation zur Bewegungsbeschreibung von Handgelenk und Fingern. Hier nur Grundlage für unbelastete Bewegungen; keine Übernahme einer Rehadose, keine Freigabe bei Verletzungen und kein nachgewiesenes Boulder-Aufwärmprogramm.' };
type Recipe = Pick<TrainingExercise, 'id' | 'title' | 'topic' | 'goal' | 'steps' | 'cues' | 'easier' | 'setupRequirements'> & { mobilityKind: 'movement' | 'stretch' };

/** Optional general movement/stretch cards; never automatically added to the adult week. */
export function additionalMobilityContent(): TrainingExercise[] {
  const recipes: Recipe[] = [
    { id: 'mobility-shoulder', title: 'Arm vor der Brust dehnen', topic: 'Schulter', mobilityKind: 'stretch', goal: 'Die Rückseite der Schulter sanft dehnen.',
      steps: ['Aufrecht stehen; einen Arm vor die Brust führen.', 'Andere Hand stützt den Oberarm. Nicht auf das Ellbogengelenk drücken.', 'Arm sanft näher ziehen, bis ein leichter Zug entsteht. Schultern locker lassen.', 'Ruhig atmen, lösen und Seite wechseln. Bei Schmerz aufhören.'], cues: ['Leichter Zug, kein Schmerz.', 'Nicht ruckartig ziehen.'], easier: 'Arm weniger weit vor den Körper führen.', setupRequirements: ['Vorher durch leichte Bewegung aufwärmen; zum Beispiel 5–10 Minuten gehen'] },
    { id: 'mobility-wrist', title: 'Handgelenk ruhig bewegen', topic: 'Finger und Hand', mobilityKind: 'movement', goal: 'Die Hand langsam nach oben und unten bewegen.',
      steps: ['Unterarm auf stabile Bank legen; Hand locker über die Kante halten.', 'Hand aus dem Handgelenk langsam heben. Unterarm bleibt liegen.', 'Langsam senken. Bewegung bleibt angenehm.', 'Wiederholen und Hand wechseln. Nicht mit der anderen Hand nachdrücken.'], cues: ['Ohne Gewicht bewegen.', 'Unterarm bleibt liegen.'], easier: 'Kleinere Bewegung machen.', setupRequirements: ['Stabile Bank mit freier Auflagefläche'] },
    { id: 'mobility-hand', title: 'Hand öffnen und locker schließen', topic: 'Finger und Hand', mobilityKind: 'movement', goal: 'Finger öffnen und locker schließen.',
      steps: ['Unterarm bequem auf die Bank legen; Hand locker halten.', 'Finger langsam zu einer lockeren Faust beugen.', 'Finger öffnen und sanft strecken. Nicht überstrecken.', 'Wiederholen und Hand wechseln. Bei Schmerz oder neuem Kribbeln aufhören.'], cues: ['Lockere Faust statt festem Griff.', 'Finger nicht mit Kraft nachziehen.'], easier: 'Finger weniger weit bewegen.', setupRequirements: ['Stabile Bank und entspannte Armauflage'] },
    { id: 'mobility-hip', title: 'Hüftvorderseite dehnen', topic: 'Hüfte', mobilityKind: 'stretch', goal: 'Die Vorderseite der Hüfte sanft dehnen.',
      steps: ['Ein Knie auf weiche, rutschfeste Unterlage setzen. Anderen Fuß vorne aufstellen.', 'Aufrecht bleiben; eine Hand am vorderen Bein abstützen.', 'Gewicht leicht nach vorne bringen, bis vorne an der hinteren Hüfte ein Zug entsteht. Kein Hohlkreuz.', 'Ruhig atmen, zurückkommen und Seite wechseln. Bei Knieschmerz abbrechen.'], cues: ['Knie weich unterlegen.', 'Kleine Gewichtsverlagerung genügt.'], easier: 'Weniger nach vorne gehen. Ist Kniestand unangenehm? Andere Übung wählen.', setupRequirements: ['Aufgewärmt beginnen; weiche, rutschfeste Knieunterlage'] },
    { id: 'mobility-thigh', title: 'Vorderen Oberschenkel dehnen', topic: 'Knie', mobilityKind: 'stretch', goal: 'Die Vorderseite des Oberschenkels sanft dehnen.',
      steps: ['Neben einer Wand stehen und mit einer Hand festhalten.', 'Ein Knie beugen; Knöchel fassen. Nicht mit Gewalt erreichen.', 'Ferse sanft zum Gesäß führen. Knie nah halten; Bauch leicht anspannen.', 'Ruhig atmen; Fuß absetzen und Seite wechseln. Bei Gelenkschmerz aufhören.'], cues: ['Stabil festhalten.', 'Kein Hohlkreuz und kein Zug im Kniegelenk.'], easier: 'Kürzer halten. Knöchel nicht bequem erreichbar? Andere Übung wählen.', setupRequirements: ['Aufgewärmt beginnen; stabile Wandstütze'] },
    { id: 'mobility-calf', title: 'Wade an der Wand dehnen', topic: 'Wade', mobilityKind: 'stretch', goal: 'Die Wade mit der Ferse am Boden dehnen.',
      steps: ['Mit beiden Händen an Wand abstützen. Einen Fuß zurückstellen.', 'Hinteres Bein gestreckt; beide Füße zeigen nach vorn. Hintere Ferse bleibt am Boden.', 'Vorderes Knie langsam beugen, bis ein leichter Zug in der hinteren Wade entsteht.', 'Ruhig atmen, lösen und Seite wechseln. Nicht federn oder die Ferse heben.'], cues: ['Hintere Ferse bleibt unten.', 'Sanft dehnen, nicht wippen.'], easier: 'Kleineren Schritt wählen; weniger nach vorne gehen.', setupRequirements: ['Aufgewärmt beginnen; stabile Wand und rutschfester Boden'] },
  ];
  return recipes.map(recipe => {
    const stretch = recipe.mobilityKind === 'stretch';
    return { ...recipe, area: 'mobility', format: 'drill', contentKind: 'exercise', planEligible: false,
      equipment: stretch ? 'Körpergewicht' : 'Trainingsbank', level: 'Sanft und ohne Zusatzgewicht', minutes: 0,
      defaultDose: { sets: 1, repetitions: stretch ? '1' : '6', repetitionUnit: stretch ? 'Haltephasen' : 'Wiederholungen', restSeconds: stretch ? 20 : 0, restScope: 'repetitions', secondsPerRepetition: stretch ? 30 : 4, sideMultiplier: 2, setupMinutes: 1 },
      dose: stretch ? 'Beispiel: einmal etwa 30 Sekunden je Seite. Kürzer ist erlaubt.' : 'Beispiel: 6 ruhige Wiederholungen je Hand. Kein Pflichtumfang.',
      rest: stretch ? 'Kurz lösen und etwa 20 Sekunden pausieren. Bei Bedarf länger erholen.' : 'Zwischen den ruhigen Bewegungen ist keine feste Pause nötig. Bei Bedarf jederzeit lösen und pausieren.',
      note: stretch ? 'Nur einen leichten Zug suchen, nicht in Schmerz hinein dehnen. Nicht federn. Bei Beschwerden oder einer Verletzung passende Übungen fachlich klären.' : 'Ohne Zusatzlast und ohne kräftiges Nachdrücken bewegen. Bei Schmerz, neuem Kribbeln oder Kontrollverlust aufhören; Beschwerden fachlich klären.',
      harder: 'Nur weiter bewegen, wenn es angenehm bleibt. Nichts erzwingen.',
      mistakes: stretch ? ['Ruckartig ziehen oder federn.', 'Für mehr Bewegung in Schmerzen hinein dehnen.'] : ['Mit Gewicht oder starkem Nachdrücken bewegen.', 'Trotz neuer Schmerzen oder Kribbeln weitermachen.'],
      selectionReason: stretch ? 'Freiwillig für Beweglichkeit; keine Pflicht nach jedem Krafttraining.' : 'Bewegen ohne Gewicht. Kein Fingerkrafttraining und kein vollständiges Aufwärmen.',
      keywords: [recipe.title, recipe.topic, 'mobilität', 'beweglichkeit', stretch ? 'dehnen stretching' : 'bewegen bewegung handgelenke finger'],
      sources: [stretch ? stretchSource : wristSource],
    };
  });
}
