import type { TrainingAnswers, TrainingArea, TrainingEquipment, TrainingExercise, TrainingSession } from './types';

export const TRAINING_AREAS: { id: TrainingArea; title: string; description: string }[] = [
  { id: 'strength', title: 'Krafttraining', description: 'Nach Muskelbereich und Equipment auswählen.' },
  { id: 'boulder', title: 'Boulderübungen', description: 'Bewegungen üben und deine Technik verbessern.' },
  { id: 'rehab', title: 'Reha-Ideen', description: 'Nach Körperregion orientieren.' },
];
export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const TRAINING_EQUIPMENT: TrainingEquipment[] = ['Körpergewicht', 'Kurzhanteln', 'Widerstandsband', 'Klimmzugstange', 'Boulderwand', 'Ohne Gerät'];
export const DEFAULT_ANSWERS: TrainingAnswers = {
  goal: 'Bouldern allgemein', experience: '6–12 Monate', grade: '3', strengths: [], weaknesses: [],
  pullUps: 'Weiß ich nicht', pushUps: 'Weiß ich nicht', strengthExperience: 'Wenig Erfahrung',
  days: [0, 2, 5], fixedDays: [], minutes: 60, equipment: ['Körpergewicht', 'Boulderwand'], constraints: 'Keine',
};
const strengthSource = [{ label: 'ACSM: Krafttraining 2026', url: 'https://acsm.org/resistance-training-guidelines-update-2026/', context: 'Allgemeine Krafttrainingsprinzipien. Die hier gezeigte Dosierung ist ein redaktionelles Beispiel, kein geprüftes KWS-Programm.' }];
const techniqueSource = [{ label: 'Bouldertraining: Originalstudie 2024', url: 'https://doi.org/10.3389/fphys.2024.1461820', context: 'Forschungskontext zum Bouldertraining. Diese Technikaufgaben und ihre Dosierung wurden damit nicht einzeln nachgewiesen.' }];
function strength(id: string, title: string, topic: string, equipment: TrainingEquipment, goal: string, steps: string[], easier: string, harder: string): TrainingExercise {
  return { id, title, topic, equipment, goal, steps, easier, harder, area: 'strength', level: 'Einstieg / Aufbau', minutes: 10, dose: 'Beispiel: 2 Sätze · 6–10 kontrollierte Wiederholungen', rest: 'Beispiel: 90 Sekunden zwischen den Sätzen', note: 'Bewegung kontrolliert ausführen. Die Beispieldosis ist noch nicht fachlich freigegeben.', keywords: [topic, 'kraft', title, equipment, topic === 'Brust' ? 'drücken liegestütz pushup' : ''], sources: strengthSource };
}
function technique(id: string, title: string, topic: string, goal: string, steps: string[], easier: string, harder: string): TrainingExercise {
  return { id, title, topic, goal, steps, easier, harder, area: 'boulder', equipment: 'Boulderwand', level: 'Einstieg / Aufbau', minutes: 10, dose: 'Beispiel: 3 leichte Boulder · je 2 bewusste Durchgänge', rest: 'Erholen, bis die nächste Bewegung wieder kontrolliert gelingt.', note: 'An leichten, vertrauten Bouldern in geringer Höhe üben. Qualität geht vor Anzahl.', keywords: [topic, title, 'technik', 'bouldern', topic === 'Fußtechnik' ? 'fuß füsse füße treten tritte' : ''], sources: techniqueSource };
}
const rehab = (id: string, title: string, topic: string): TrainingExercise => ({
  id, title, topic, area: 'rehab', goal: `So könnte eine fachlich geprüfte Karte für ${topic} aussehen.`,
  equipment: 'Ohne Gerät', level: 'Musterkarte', minutes: 0, steps: ['Anlass und Voraussetzungen werden hier erklärt.', 'Eine fachlich geprüfte Anleitung mit Demonstration folgt.', 'Anpassung und Abbruchkriterien werden auf der Karte beschrieben.'],
  dose: 'Noch keine Therapievorgaben', rest: 'Wird nach fachlicher Freigabe ergänzt.', easier: 'Wird für den konkreten Anwendungsfall ergänzt.', harder: 'Wird für den konkreten Anwendungsfall ergänzt.', note: 'Musteraufbau für die UI. Keine Behandlungsempfehlung und noch keine Übung zum Einplanen.', keywords: [topic, title, 'reha'], sources: [],
});
export const TRAINING_EXERCISES: TrainingExercise[] = [
  strength('incline-pushup', 'Erhöhter Liegestütz', 'Brust', 'Körpergewicht', 'Eine kontrollierte Druckbewegung mit leichterem Einstieg.', ['Hände auf einer stabilen, erhöhten Fläche abstützen.', 'Körper in einer Linie halten und langsam absenken.', 'Kontrolliert zurückdrücken, ohne den Rücken durchhängen zu lassen.'], 'Höhere stabile Auflage wählen.', 'Auflage niedriger wählen.'),
  strength('pushup', 'Liegestütz', 'Brust', 'Körpergewicht', 'Brust, Arme und Rumpf gemeinsam beanspruchen.', ['Hände am Boden aufsetzen und einen stabilen Stütz aufbauen.', 'Brust zwischen den Händen kontrolliert absenken.', 'In einer Linie zurückdrücken.'], 'Erhöhter Liegestütz.', 'Langsamere Abwärtsbewegung bei gleicher Kontrolle.'),
  strength('dumbbell-bench', 'Kurzhantel-Bankdrücken', 'Brust', 'Kurzhanteln', 'Die Druckbewegung mit frei beweglichen Gewichten üben.', ['Auf einer stabilen Trainingsbank liegen; Füße aufsetzen.', 'Leichte Hanteln kontrolliert neben dem Brustkorb absenken.', 'Gewichte ruhig nach oben drücken.'], 'Leichteres Gewicht und betreute Einführung.', 'Gewicht nach fachlicher Lastwahl anpassen.'),
  strength('dumbbell-floor', 'Kurzhantel-Floor-Press', 'Brust', 'Kurzhanteln', 'Eine Druckbewegung mit durch den Boden begrenzter Tiefe.', ['Auf dem Rücken liegen, Knie anstellen.', 'Leichte Hanteln kontrolliert absenken, bis die Oberarme den Boden berühren.', 'Ruhig nach oben drücken.'], 'Leichtere Hanteln.', 'Last nach fachlicher Vorgabe anpassen.'),
  strength('band-press', 'Brustdrücken mit Band', 'Brust', 'Widerstandsband', 'Die Druckbewegung mit einem Widerstandsband üben.', ['Band an einem dafür geeigneten, sicheren Punkt befestigen.', 'Stabil stehen und Griffe auf Brusthöhe halten.', 'Arme kontrolliert vorwärts führen und zurücknehmen.'], 'Band mit geringerem Widerstand.', 'Widerstand nach fachlicher Vorgabe anpassen.'),
  strength('band-row', 'Rudern mit Band', 'Rücken', 'Widerstandsband', 'Eine kontrollierte Zugbewegung üben.', ['Band sicher befestigen und stabil aufstellen.', 'Ellenbogen zum Körper ziehen, ohne zurückzulehnen.', 'Arme langsam wieder strecken.'], 'Weniger Bandspannung.', 'Stärkeres Band bei gleichbleibender Kontrolle.'),
  strength('pullup', 'Klimmzug', 'Rücken', 'Klimmzugstange', 'Den Körper kontrolliert an einer Stange hochziehen.', ['Eine geeignete Stange sicher greifen.', 'Ohne Schwung hochziehen.', 'Kontrolliert absenken; nicht fallen lassen.'], 'Betreute, fußunterstützte Variante.', 'Keine Zusatzlast in dieser UI-Vorschau.'),
  strength('split-squat', 'Split Squat', 'Beine', 'Körpergewicht', 'Einseitige Beinkraft und stabile Positionen üben.', ['In einen stabilen versetzten Stand gehen.', 'Beide Knie kontrolliert beugen.', 'Über den vorderen Fuß ruhig aufrichten.'], 'Mit einer Hand an einer stabilen Stütze halten.', 'Größere kontrollierte Bewegung.'),
  strength('dead-bug', 'Dead Bug', 'Rumpf', 'Körpergewicht', 'Rumpfspannung bei bewegten Armen und Beinen halten.', ['Auf dem Rücken liegen und Arme sowie Beine anheben.', 'Gegengleichen Arm und ein Bein langsam verlängern.', 'Zurücknehmen, ohne den Rücken unkontrolliert zu bewegen.'], 'Nur die Beine einzeln bewegen.', 'Bewegung langsam verlängern.'),
  technique('quiet-feet', 'Präzise Fußplatzierung', 'Fußtechnik', 'Tritte bewusst treffen, ohne nachzukorrigieren.', ['Einen sehr leichten Boulder auswählen.', 'Vor jedem Schritt den Zieltritt ansehen.', 'Fuß einmal ruhig aufsetzen und danach belasten.'], 'Große Tritte und geringe Höhe.', 'Kleinere Tritte bei gleicher Kontrolle.'),
  technique('foot-swap', 'Fußwechsel', 'Fußtechnik', 'Auf einem Tritt ruhig zwischen den Füßen wechseln.', ['Einen großen Tritt in geringer Höhe wählen.', 'Gewicht über die Hände und den Standfuß kontrollieren.', 'Fußwechsel langsam ausführen und stabilisieren.'], 'Großer Tritt mit guten Handgriffen.', 'Kleinerer Tritt, ohne Dynamik zu erzwingen.'),
  technique('edge-choice', 'Innen- und Außenkante', 'Fußtechnik', 'Unterschiedliche Fußpositionen vergleichen.', ['Eine leichte Bewegung mit einem guten Tritt wählen.', 'Einmal mit Innenkante, einmal mit Außenkante ausführen.', 'Beobachten, welche Position die Hüfte besser ausrichtet.'], 'Bewegung am Boden besprechen.', 'Den Vergleich in einen leichten Boulder übertragen.'),
  technique('smearing', 'Reibungstritte', 'Fußtechnik', 'Den Fuß kontrolliert auf einer geeigneten Wandfläche belasten.', ['Eine leichte Platte mit sicherem Wandbereich wählen.', 'Fuß ruhig auf die Reibungsfläche setzen.', 'Gewicht langsam übertragen und die stabile Position merken.'], 'Große flache Tritte verwenden.', 'Geeignete kleinere Reibungsflächen nutzen.'),
  technique('high-step', 'Hoher Tritt und Gewichtswechsel', 'Fußtechnik', 'Mit dem Gewicht über einen höheren Tritt kommen.', ['Einen gut erreichbaren hohen Tritt wählen.', 'Fuß aufsetzen und Hüfte kontrolliert zum Fuß bringen.', 'Aus dem Bein aufrichten, statt nur mit den Armen zu ziehen.'], 'Niedrigerer Tritt.', 'Mehrere kontrollierte Gewichtswechsel verbinden.'),
  technique('hip-position', 'Hüftposition vergleichen', 'Körperposition', 'Die Wirkung von Körperpositionen spüren.', ['Eine leichte Sequenz wählen.', 'Mit frontaler und eingedrehter Position wiederholen.', 'Vergleichen, welche Stellung den nächsten Zug erleichtert.'], 'Nur eine einzelne Bewegung vergleichen.', 'Eine längere leichte Sequenz nutzen.'),
  technique('heel-hook', 'Heelhook aufbauen', 'Hooks', 'Einen Hook kontrolliert setzen und nutzen.', ['Eine betreut ausgewählte leichte Bewegung wählen.', 'Ferse ruhig auf eine geeignete Fläche setzen.', 'Zug langsam aufnehmen und die Hüfte nachführen.'], 'Geringe Höhe und sehr gute Handgriffe.', 'In eine leichte Bewegungsfolge übertragen.'),
  technique('read-boulder', 'Boulder vorher lesen', 'Boulder lesen', 'Vor dem Einstieg eine Bewegungsidee entwickeln.', ['Griffe und Tritte vom Boden aus anschauen.', 'Eine mögliche Reihenfolge und Fußpositionen benennen.', 'Leicht bouldern und anschließend die Idee vergleichen.'], 'Nur die ersten drei Bewegungen lesen.', 'Alternative Bewegungsfolgen vergleichen.'),
  technique('controlled-move', 'Kontrollierter Bewegungsfluss', 'Koordination', 'Leichte Bewegungen flüssig verbinden.', ['Eine vertraute, leichte Sequenz auswählen.', 'Eine Bewegung nach der anderen ruhig verbinden.', 'Unnötige Stopps erkennen und den Durchgang wiederholen.'], 'Kürzere Sequenz.', 'Neue leichte Sequenz mit demselben Fokus.'),
  rehab('rehab-shoulder', 'Schulter · Aufbau einer Übungskarte', 'Schulter'),
  rehab('rehab-fingers', 'Finger und Hand · Aufbau einer Übungskarte', 'Finger und Hand'),
  rehab('rehab-elbow', 'Ellenbogen · Aufbau einer Übungskarte', 'Ellenbogen'),
  rehab('rehab-knee', 'Knie · Aufbau einer Übungskarte', 'Knie'),
];
export const getExercise = (id: string) => TRAINING_EXERCISES.find(exercise => exercise.id === id);
export const makeSessionItem = (exerciseId: string, index = 0) => ({ id: `${exerciseId}-${index}`, exerciseId, sets: 2, repetitions: getExercise(exerciseId)?.area === 'boulder' ? '2' : '6–10', restSeconds: 90 });
export const EMPTY_SESSION: TrainingSession = { id: 'new', title: 'Meine Einheit', focus: 'Selbst zusammengestellt', minutes: 0, exercises: [] };
export const getSessionMinutes = (session: TrainingSession) => session.exercises.reduce((total, item) => {
  const exercise = getExercise(item.exerciseId);
  return total + (exercise?.area === 'boulder' ? 8 * item.sets : Math.ceil(item.sets * 45 / 60) + Math.ceil(Math.max(0, item.sets - 1) * item.restSeconds / 60) + 2);
}, 0);
