import type { SessionExercise, TrainingAnswers, TrainingArea, TrainingDose, TrainingEquipment, TrainingExercise, TrainingSession } from './types';
import { additionalTrainingContent } from './trainingContent';
import { additionalBoulderContent } from './boulderContent';
import { additionalKidsContent } from './kidsContent';
import { additionalMobilityContent } from './mobilityContent';

export const TRAINING_AREAS: { id: TrainingArea; title: string; description: string }[] = [
  { id: 'strength', title: 'Krafttraining', description: 'Nach Muskelbereich und Equipment auswählen.' },
  { id: 'boulder', title: 'Boulderübungen', description: 'Bewegungen üben und deine Technik verbessern.' },
  { id: 'mobility', title: 'Mobilität', description: 'Bewegen und sanft dehnen.' },
  { id: 'kids', title: 'Kinder', description: 'Betreute Spiele für den Kinderboulderbereich.' },
];
export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const KWS_AVAILABLE_EQUIPMENT: TrainingEquipment[] = ['Körpergewicht', 'Kettlebell', 'Trainingsbank', 'EZ-Stange', 'Klimmzugstange', 'Fingerboard', 'Boulderwand', 'Spraywall'];
export const TRAINING_EQUIPMENT: TrainingEquipment[] = [...KWS_AVAILABLE_EQUIPMENT, 'Kurzhanteln', 'Widerstandsband', 'Ohne Gerät'];
export const DEFAULT_ANSWERS: TrainingAnswers = {
  goal: 'Bouldern allgemein', experience: '6–12 Monate', grade: '3', strengths: [], weaknesses: [],
  pullUps: 'Weiß ich nicht', pushUps: 'Weiß ich nicht', strengthExperience: 'Wenig Erfahrung',
  days: [0, 2, 5], fixedDays: [], minutes: 60, equipment: [...KWS_AVAILABLE_EQUIPMENT], constraints: 'Keine', ageGroup: 'unknown',
};
const strengthSource = [{ label: 'ACSM Position Stand 2026', url: 'https://doi.org/10.1249/MSS.0000000000003897', context: 'Allgemeines Krafttraining gesunder Erwachsener, ausreichend anstrengend ohne Pflicht zum Versagen. Die konkrete Übung, Dosierung und Kombination sind redaktionell; kein nachgewiesener Bouldertransfer.' }, { label: 'Mayo Clinic: kontrollierte Kraftausführung', url: 'https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/weight-training/art-20045842', context: 'Offizielle Gesundheitsinformation zu Einweisung, kontrollierter Bewegung und Atmung. Keine Studie zu diesem Boulderprogramm; kein Rehabilitationsprotokoll.' }];
const techniqueSource = [{ label: 'Seifert et al. 2018: Lernen und Transfer', url: 'https://doi.org/10.3389/fpsyg.2018.00820', context: 'Kleine Lernstudie mit acht Kletternden an Seilrouten. Hintergrund für Lösungsvergleich und Transferbeobachtung; kein Nachweis dieses Boulderdrills oder seiner Dosierung.' }];
const STRENGTH_DOSE: TrainingDose = { sets: 2, repetitions: '6–10', restSeconds: 120, restScope: 'sets', secondsPerRepetition: 4, setupMinutes: 2 };
const TECHNIQUE_DOSE: TrainingDose = { sets: 1, repetitions: '2', restSeconds: 90, restScope: 'repetitions', secondsPerRepetition: 75, setupMinutes: 2 };
const STOP = 'Bei neuem oder zunehmendem Schmerz, ungewohntem Kraft- oder Bewegungsverlust oder fehlender Kontrolle aufhören.';
function strength(id: string, title: string, topic: string, equipment: TrainingEquipment, goal: string, steps: string[], easier: string, harder: string): TrainingExercise {
  return { id, title, topic, equipment, goal, steps, easier, harder, area: 'strength', level: 'Einstieg / Aufbau', minutes: 10, dose: 'Beispiel: 2 Sätze · 6–10 kontrollierte Wiederholungen', rest: 'Beispiel: 90 Sekunden zwischen den Sätzen', note: 'Bewegung kontrolliert ausführen. Die Beispieldosis ist noch nicht fachlich freigegeben.', keywords: [topic, 'kraft', title, equipment, topic === 'Brust' ? 'drücken liegestütz pushup' : ''], sources: strengthSource };
}
function technique(id: string, title: string, topic: string, goal: string, steps: string[], easier: string, harder: string): TrainingExercise {
  return { id, title, topic, goal, steps, easier, harder, area: 'boulder', equipment: 'Boulderwand', level: 'Einstieg / Aufbau', minutes: 10, dose: 'Beispiel: 3 leichte Boulder · je 2 bewusste Durchgänge', rest: 'Erholen, bis die nächste Bewegung wieder kontrolliert gelingt.', note: 'An leichten, vertrauten Bouldern in geringer Höhe üben. Qualität geht vor Anzahl.', keywords: [topic, title, 'technik', 'bouldern', topic === 'Fußtechnik' ? 'fuß füsse füße treten tritte' : ''], sources: techniqueSource };
}
const REHAB_ORIENTATION: Record<string, { observation: string; discussion: string; category: string; source: TrainingExercise['sources'][number] }> = {
  'rehab-shoulder': {
    observation: 'Notiere: Wo, seit wann und wobei schmerzt die Schulter? Verletzung oder ungewohnte Schwäche erwähnen.',
    discussion: 'Mit behandelnder Fachperson klären: Was darfst du im Alltag und beim Bouldern tun?',
    category: 'Bei einer festgestellten Erkrankung der Schultersehnen (Rotatorenmanschetten-Tendinopathie) können abgestimmte Bewegungs- und Kraftübungen zur Behandlung gehören. Sie passen nicht automatisch zu jedem Schulterschmerz.',
    source: { label: 'Schulter-Leitlinie 2025', url: 'https://doi.org/10.2519/jospt.2025.13182', context: 'Klinische Leitlinie für Erwachsene mit vermuteter Rotatorenmanschetten-Tendinopathie; unterstützt individuelle Aufklärung und aktive Rehabilitation, keine universelle Schulter- oder App-Dosis.' },
  },
  'rehab-fingers': {
    observation: 'Notiere Finger, Schmerzstelle, Beginn und Griffart. Schnappen, Schwellung oder fehlende Kraft und Beweglichkeit erwähnen.',
    discussion: 'Mit behandelnder Fachperson Ursache, erlaubte Griffe und Rückkehr klären. Tape allein erlaubt kein Training.',
    category: 'Bei Ringbandverletzungen entscheidet Art und Schwere über Schutz und langsamen Trainingsaufbau. Tape allein ist keine Freigabe zum Hängen oder Bouldern.',
    source: { label: 'Ringbandverletzungen: klinischer Überblick 2021', url: 'https://doi.org/10.1016/j.wem.2021.01.011', context: 'Klinischer Literaturüberblick zur Abklärung und Behandlung von Ringbandverletzungen beim Klettern; keine Leitlinie für alle Fingerschmerzen und kein belastbarer universeller Rehaplan.' },
  },
  'rehab-elbow': {
    observation: 'Notiere: Schmerz innen oder außen, seit wann und wobei? Letzte Trainingsänderungen erwähnen.',
    discussion: 'Mit behandelnder Fachperson Ursache sowie erlaubtes Greifen und Ziehen klären. Ellenbogenschmerz ist nicht immer Tennisellenbogen.',
    category: 'Bei einer festgestellten Sehnenerkrankung am äußeren Ellenbogen werden Kraft und Bewegung untersucht. Übungen und Gewicht hängen vom Befund ab; langsam senkende Kraftübungen passen nicht automatisch zu allen.',
    source: { label: 'Lateraler Ellenbogenschmerz: Leitlinie 2022', url: 'https://doi.org/10.2519/jospt.2022.0302', context: 'Diagnosebezogene physiotherapeutische Leitlinie zu lateraler Ellenbogen-Tendinopathie. Der hier zugängliche Abstract bestätigt den Anwendungsbereich; genaue Übungsprotokolle wurden für diese Karte nicht extrahiert.' },
  },
  'rehab-knee': {
    observation: 'Notiere: Wo, seit wann und wobei schmerzt das Knie? Verletzung, Schwellung oder Wegknicken erwähnen.',
    discussion: 'Mit behandelnder Fachperson Ursache und erlaubtes Training klären. Schmerz nach einer Landung kann andere Ursachen haben als länger bestehender Schmerz.',
    category: 'Bei festgestelltem Schmerz rund um die Kniescheibe (patellofemoraler Schmerz) können abgestimmte Hüft- und Knieübungen zur Behandlung gehören. Das erklärt keine akute Landungsverletzung und erlaubt kein Abspringen.',
    source: { label: 'Patellofemoraler Schmerz: Leitlinie 2019', url: 'https://doi.org/10.2519/jospt.2019.0302', context: 'Diagnosebezogene Leitlinie, unter anderem Hüft-/Knieübungen; optimale Dosierung nicht eindeutig. Kein allgemeines Knie-Rezept und keine Freigabe zum Abspringen.' },
  },
};
const rehab = (id: string, _title: string, topic: string): TrainingExercise => {
  const content = REHAB_ORIENTATION[id];
  return {
    id, title: `${topic} · Beschwerden besprechen`, topic, area: 'rehab', goal: 'Beschwerden notieren und das weitere Vorgehen besprechen.',
    equipment: 'Ohne Gerät', level: 'Orientierung · kein Übungsrezept', minutes: 0, planEligible: false,
    steps: [content.observation, content.discussion, 'Bei vereinbartem Training: Beschwerden währenddessen, danach und am Folgetag notieren. Änderungen fachlich abstimmen.'],
    dose: 'Keine Trainingsvorgabe. Anzahl und Dauer gehören zum persönlichen Behandlungsplan.', rest: 'Pausen und nächstes Training fachlich abstimmen.', easier: 'Verlauf und Fragen notieren. Keine ungeklärte Übung zum Testen beginnen.', harder: 'Training erst wie fachlich vereinbart steigern.',
    cues: ['Wo, seit wann und bei welcher Bewegung?', 'Beobachtung ersetzt keine Diagnose.'], mistakes: ['Von der Schmerzstelle auf eine Diagnose schließen.', 'Allgemeine Kraftübungen als Behandlung übernehmen.'], setupRequirements: ['Beschwerden und weiteres Vorgehen fachlich klären'], selectionReason: content.category,
    note: `Kein Übungsplan zur Selbstbehandlung. Plötzlichen deutlichen Funktionsverlust, sichtbare Fehlstellung oder schwere akute Beschwerden zeitnah medizinisch abklären. ${STOP}`, keywords: [topic, 'wiedereinstieg', 'reha', 'beschwerden'], sources: [content.source],
  };
};
const RAW_EXERCISES: TrainingExercise[] = [
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
// Authored movement cards. These instructions/doses are reviewable editorial
// choices; source links support only the explicitly described evidence context.
const GUIDANCE: Record<string, Partial<TrainingExercise>> = {
  'incline-pushup': {
    goal: 'Liegestütze leichter machen: Hände auf die Bank.',
    steps: ['Hände auf eine feste, rutschfreie Bank setzen. Füße zurückstellen; Körper gerade halten.', 'Brust langsam zur Bank senken. Hüfte und Schultern bewegen sich gemeinsam.', 'Ruhig wegdrücken und weiteratmen.', 'Hängt die Hüfte durch? Höhere Auflage wählen.'],
    cues: ['Körper gerade halten.', 'Höhere Auflage = leichter.'], mistakes: ['Hüfte durchhängen lassen.', 'Schmerzhafte Schulter- oder Handgelenkstellung.'],
    easier: 'Eine höhere, stabile Auflage wählen.', harder: 'Bei guter Kontrolle eine etwas niedrigere Auflage wählen.', setupRequirements: ['Stabile Bank, die beim Abstützen nicht rutscht'], selectionReason: 'Auf einer Bank sind Liegestütze leichter als am Boden. Je höher die Auflage, desto leichter.',
  },
  pushup: {
    steps: ['Hände etwa schulterbreit aufsetzen. Beine strecken; Bauch anspannen.', 'Brust zum Boden senken. Hüfte und Schultern bewegen sich gemeinsam.', 'Ruhig hochdrücken und weiteratmen. Nur so tief gehen, wie du stabil bleibst.', 'Satz beenden, bevor die Hüfte durchhängt oder du Schwung brauchst.'],
    cues: ['Hüfte und Schultern gemeinsam bewegen.', 'Ruhig weiteratmen.'], mistakes: ['Nur Kopf oder Hüfte senken.', 'Bis zum Kontrollverlust weitermachen.'],
    easier: 'Hände auf eine feste erhöhte Auflage setzen.', harder: 'Nach Einweisung eine schwierigere Variante wählen.', setupRequirements: ['Rutschfester Boden und vertrauter kontrollierter Stütz'], selectionReason: 'Wenn du Liegestütze am Boden schon kontrolliert kannst. Sonst beginnt der Plan mit den Händen auf einer Bank.',
    goal: 'Brust und Arme mit Liegestützen trainieren.',
  },
  'dumbbell-bench': {
    steps: ['Aufnehmen und Ablegen zeigen lassen. Auf die Bank legen; Füße aufsetzen.', 'Je eine Hantel über der Brust halten.', 'Hanteln neben die Brust senken und hochdrücken. Nur so tief gehen, wie es schmerzfrei geht.', 'Hanteln so ablegen, wie es dir gezeigt wurde.'],
    cues: ['Beide Hanteln kontrollieren.', 'Füße bleiben stabil.'], mistakes: ['Zu schwere Hanteln wählen.', 'Gewichte beim Ablegen nicht kontrollieren.'],
    setupRequirements: ['Stabile Bank und feste Fußauflage', 'Aufnehmen, Drücken und Ablegen zeigen lassen'], requiredEquipment: ['Kurzhanteln', 'Trainingsbank'], planEligible: true, selectionReason: 'Du brauchst eine Bank und Kurzhanteln. Kurzhanteln gehören bisher nicht zur KWS-Ausstattung.',
    goal: 'Zwei Hanteln auf der Bank hochdrücken.',
  },
  'dumbbell-floor': {
    steps: ['Aufnehmen und Ablegen zeigen lassen. Auf den Rücken legen; Füße aufstellen.', 'Je eine Hantel über der Brust halten.', 'Senken, bis die Oberarme sanft den Boden berühren. Wieder hochdrücken.', 'Hanteln so ablegen, wie es dir gezeigt wurde.'],
    cues: ['Oberarme sanft aufsetzen.', 'Beim Drücken weiteratmen.'], mistakes: ['Oberarme auf den Boden schlagen.', 'Last beim Ablegen nicht mehr kontrollieren.'],
    setupRequirements: ['Freie Bodenfläche', 'Aufnehmen und Ablegen zeigen lassen'], selectionReason: 'Hanteldrücken ohne Bank. Du brauchst passende Kurzhanteln und eine Einweisung.',
    goal: 'Zwei Hanteln vom Boden aus hochdrücken.',
  },
  'band-press': {
    steps: ['Band und dafür zugelassene Befestigung prüfen. Befestigung liegt hinter dir.', 'Stabil stehen; Griffe auf Brusthöhe halten.', 'Griffe nach vorn drücken. Rücken gerade halten.', 'Langsam zur Brust zurückführen. Band nicht zurückschnellen lassen.'],
    cues: ['Band und Befestigung prüfen.', 'Langsam drücken und zurückführen.'], mistakes: ['Band an einem ungeprüften Türgriff befestigen.', 'Band zurückschnellen lassen.'],
    setupRequirements: ['Geprüfte, geeignete Befestigung', 'Unbeschädigtes Band; Benutzung zeigen lassen'], selectionReason: 'Für diese Druckübung brauchst du ein Band und eine geprüfte Befestigung. Beides vorher vor Ort klären.',
    goal: 'Ein Band vor der Brust nach vorn drücken.',
  },
  'band-row': {
    steps: ['Band und dafür zugelassene Befestigung prüfen. Dorthin schauen und stabil stehen.', 'Griffe zum Körper ziehen; Ellbogen nach hinten führen.', 'Oberkörper ruhig halten und weiteratmen.', 'Arme langsam strecken, bis das Band locker ist.'],
    cues: ['Ellbogen nach hinten, Oberkörper ruhig.', 'Kein Ruck am Band.'], mistakes: ['Oberkörper ruckartig zurückwerfen.', 'Nach anstrengendem Bouldern weitere schwere Zugübungen anhängen.'],
    setupRequirements: ['Geprüfte Befestigung und unbeschädigtes Band', 'Stand, Griff und Loslassen zeigen lassen'], selectionReason: 'Eine Zugübung mit Band. Sie kann eine andere Zugübung ersetzen; du musst nicht alle Varianten machen.',
    goal: 'Ein Band zum Körper ziehen.',
  },
  pullup: {
    defaultDose: { ...STRENGTH_DOSE, repetitions: '4–6', restSeconds: 150 }, level: 'Vertraute Zug- und Gerätepraxis',
    steps: ['Einstieg und Rückweg klären. Stange greifen; nur bei vertrautem Hang beginnen.', 'Ohne Schwung hochziehen, so weit du es kontrollieren kannst.', 'Langsam absenken und weiteratmen.', 'Vor Schwung oder Griffverlust aufhören. Über den geübten Rückweg absteigen.'],
    cues: ['Ohne Schwung ziehen.', 'Vor Kontrollverlust aufhören.'], mistakes: ['Mit Beinschwung nachhelfen.', 'Unbekannte Fähigkeit durch einen Maximaltest ausprobieren.'],
    easier: 'Mit Coach eine unterstützte Variante kennenlernen.', harder: 'Zusatzlast nur nach Einweisung; keine automatische Steigerung.', setupRequirements: ['Geprüfte Stange; sicherer Einstieg und Rückweg', 'Hängen und Hochziehen sind bereits vertraut'], selectionReason: 'Freie Klimmzüge erscheinen im Plan nur bei regelmäßiger Kraftpraxis und bekannten Klimmzügen. Der Bouldergrad bestimmt kein Zusatzgewicht.',
    goal: 'Dich ohne Schwung an der Stange hochziehen.',
  },
  'split-squat': {
    defaultDose: { ...STRENGTH_DOSE, sideMultiplier: 2 },
    steps: ['Einen Fuß nach vorn, einen nach hinten stellen. Bei Bedarf festhalten.', 'Beide Knie beugen und den Körper ruhig senken.', 'Wieder aufrichten. Nur so tief gehen, wie du stabil bleibst.', 'Nach dem Satz Seite wechseln. Die Anzahl gilt je Seite.'],
    cues: ['Erst Gleichgewicht, dann Tiefe.', 'Festhalten ist erlaubt.'], mistakes: ['Zu tief gehen und das Gleichgewicht verlieren.', 'Knie oder Fuß in eine schmerzhafte Richtung zwingen.'],
    easier: 'Weniger tief gehen und stabil festhalten.', harder: 'Weniger Unterstützung nur bei sicherem Stand. Zusatzgewicht erst nach Einweisung.', setupRequirements: ['Rutschfester Boden; bei Bedarf stabile Haltemöglichkeit'], selectionReason: 'Trainiert die Beine. Dass die Übung hohe Tritte beim Bouldern verbessert, ist nicht nachgewiesen.',
    goal: 'Beine im versetzten Stand trainieren.',
  },
  'dead-bug': {
    defaultDose: { ...STRENGTH_DOSE, repetitions: '4–6', restSeconds: 60, secondsPerRepetition: 6, sideMultiplier: 2 },
    steps: ['Auf den Rücken legen. Arme nach oben; Hüfte und Knie rechtwinklig beugen.', 'Ein Bein Richtung Boden strecken und zurücknehmen. Rücken bleibt ruhig.', 'Klappt das gut? Den gegenüberliegenden Arm über Kopf mitstrecken.', 'Zurückkommen und Seite wechseln. Weiteratmen.'],
    cues: ['Gegenüberliegenden Arm und Bein bewegen.', 'Kleine Bewegung genügt.'], mistakes: ['Zu weit strecken und die Rückenposition verlieren.', 'Die Luft anhalten.'],
    easier: 'Nur ein Bein bewegen oder den Fuß gleiten lassen.', harder: 'Arm und Bein etwas weiter strecken; nicht zugleich mehr Wiederholungen.', setupRequirements: ['Freie angenehme Bodenfläche'], selectionReason: 'Du hältst den Rumpf ruhig, ohne Handstütz. Ein Vorteil im Überhang ist nicht nachgewiesen.',
    goal: 'Arme und Beine bewegen, den Rücken ruhig halten.',
  },
  'quiet-feet': {
    goal: 'Tritt anschauen, Fuß setzen, dann belasten.',
    steps: ['Kurze, leichte Passage mit guten Griffen und bekanntem Rückweg wählen.', 'Zieltritt anschauen und die Schuhspitze genau aufsetzen.', 'Gewicht auf den Fuß bringen. Nachsetzen ist erlaubt.', 'Am Boden vergleichen: Welcher Schritt war genau? Diesen Punkt erneut üben.'],
    cues: ['Ansehen → setzen → belasten.', 'Nachsetzen ist erlaubt.'], mistakes: ['Vor dem Aufsetzen schon wegschauen.', 'Trotz unsicherem Fuß sofort weiterziehen.'],
    harder: 'Denselben Punkt an einer anderen passenden, leichten Passage üben.', selectionReason: 'Übe, einen Tritt genau zu treffen. Dafür musst du den Boulder nicht bis oben schaffen.',
  },
  'foot-swap': {
    steps: ['Großen Tritt und gute Handgriffe wählen. Coach zeigt den Wechsel.', 'Über Hände und Standfuß stabil bleiben. Zweiten Fuß an den Tritt bringen.', 'Gewicht auf den neuen Fuß bringen; alten Fuß ruhig lösen.', 'Stabil stehen und kontrolliert zurückkehren.'],
    cues: ['Erst neuen Kontakt aufbauen, dann alten lösen.', 'Kein Sprungwechsel nötig.'], mistakes: ['Beide Füße gleichzeitig ohne Halt lösen.', 'Wechsel trotz instabiler Position erzwingen.'], harder: 'An einem anderen geeigneten Tritt üben; kein Sprungwechsel nötig.', selectionReason: 'Hilft, wenn du für den nächsten Zug den Standfuß wechseln möchtest. Fußplatzierung sollte schon vertraut sein.',
    goal: 'Auf einem Tritt den Standfuß wechseln.',
  },
  'edge-choice': {
    steps: ['Leichten seitlichen Zug mit großem Tritt wählen.', 'Mit der Schuhkante auf der Großzehenseite auftreten und den Zug probieren.', 'Fuß umsetzen und mit der Kleinzehenseite probieren. Knie nicht gegen den festen Schuh drehen.', 'Vergleichen: Welche Fußstellung macht den nächsten Zug leichter?'],
    cues: ['Innen = Großzehenseite. Außen = Kleinzehenseite.', 'Zum Drehen den Fuß umsetzen.'], mistakes: ['Knie drehen, während der Schuh festklemmt.', 'Eine Kante unabhängig von der nächsten Bewegung bevorzugen.'], selectionReason: 'Vergleiche an derselben Stelle, wie Fußkante und Körperposition zusammenpassen.',
    goal: 'Innen- und Außenkante am selben Tritt vergleichen.',
  },
  smearing: {
    steps: ['Hallenteam wählt passende leichte Platte mit guten Handgriffen.', 'Schuhsohle auf die geeignete Wandfläche setzen.', 'Gewicht langsam auf den Fuß bringen. Nicht absichtlich abrutschen.', 'Kontrolliert zurückkehren: In welcher Körperposition hielt der Fuß?'],
    cues: ['Langsam belasten.', 'Wandfläche vorher prüfen.'], mistakes: ['Abrutschen absichtlich testen.', 'Eine ungeeignete Wandfläche als Tritt nutzen.'], harder: 'Mit Hallenpersonal eine andere geeignete Fläche wählen.', selectionReason: 'Für das Bouldern an der Platte. Du brauchst eine Wandfläche, die sich zum Antreten eignet.',
    goal: 'Die Schuhsohle auf einer passenden Wandfläche belasten.',
  },
  'high-step': {
    sources: [{ label: 'Blagus et al.: Videoergänzung', url: 'https://doi.org/10.1177/17479541231152548', context: 'Kleine betreute Anfänger-Lernstudie, Zusatznutzen beim High Step, nicht jeder Bewegung. Statischer Aufbau und Dosis dieser Karte sind redaktionelle Varianten.' }],
    steps: ['Leichten Zug mit guten Händen und erreichbarem hohen Tritt wählen.', 'Fuß setzen und die Hüfte zum Tritt bewegen.', 'Über das Bein aufrichten. Hände dürfen unterstützen.', 'Kontrolliert zurückkehren. Bei Verdrehung niedrigeren Tritt wählen; bei Schmerz abbrechen.'],
    cues: ['Gewicht zum Fuß verlagern.', 'Hoch bedeutet erreichbar, nicht maximal.'], mistakes: ['Einen unerreichbaren Tritt erzwingen.', 'Knie gegen den feststehenden Fuß verdrehen.'], harder: 'Eine andere erreichbare Trittposition ausprobieren.', selectionReason: 'Du übst, dein Gewicht auf einen höheren Tritt zu bringen. Ein betreutes Video kann beim Beobachten helfen. Der Ablauf ist für die App zusammengestellt.',
    goal: 'Dein Gewicht auf einen höheren Tritt bringen.',
  },
  'hip-position': {
    steps: ['Kurzen seitlichen Zug mit guten Griffen und Tritten wählen.', 'Den Zug frontal zur Wand probieren.', 'Fuß umsetzen, eine Hüftseite zur Wand drehen und den Zug erneut probieren.', 'Vergleichen: Wo erreichst du den Griff leichter und bleibst stabil?'],
    cues: ['Frontal und seitlich vergleichen.', 'Fuß vor dem Drehen umsetzen.'], mistakes: ['Hüfte mit Gewalt an die Wand pressen.', 'Eine schmerzhafte Knieposition erzwingen.'], harder: 'Denselben Vergleich an einem anderen leichten Zug üben.', selectionReason: 'Du vergleichst zwei Körperpositionen an einem leichten Zug. Daraus folgt keine Bewertung deiner Technik im Überhang.',
    goal: 'Zwei Standpositionen zur Wand vergleichen.',
  },
  'heel-hook': {
    goal: 'Die Ferse als Halt nutzen und sicher wieder lösen.',
    requiresCoach: true, level: 'Coachbegleitete Einführung',
    steps: ['Coach wählt passende Fläche, Handgriffe und Rückweg.', 'Ferse aufsetzen. Andere Griffe und Tritte halten dich dabei.', 'Langsam über die Ferse ziehen und die Hüfte nachführen. Knie nicht verdrehen.', 'Erst andere Griffe und Tritte belasten, dann Ferse lösen und zurückkehren.'],
    cues: ['Ferse setzen → belasten → unterstützt lösen.', 'Bei rutschendem Kontakt nicht stärker ziehen.'], mistakes: ['Ferse lösen, bevor andere Kontakte tragen.', 'Bein verklemmen oder Knie verdrehen.'], harder: 'Mit Coach eine andere passende Heelhook-Bewegung üben.', selectionReason: 'Der Plan schlägt diesen Heelhook nur mit Coachbegleitung vor. Als Einstieg ins Bouldern ist er nicht erforderlich.',
  },
  'read-boulder': {
    sources: [{ label: 'Morenas et al. 2021: Modellpreview', url: 'https://doi.org/10.3390/ijerph182312594', context: 'Akuter Previewvergleich bei 21 fortgeschrittenen Kletternden, kein Langzeit-Apptraining. Die Lernfolge und Dosierung dieser Karte sind redaktionell.' }, ...techniqueSource],
    steps: ['Griffe, Tritte, Fallbereich und Rückweg vom Boden anschauen.', 'Hand- und Fußfolge überlegen. Sicherheitsfragen vor dem Start klären.', 'Kurze, leichte Passage ausprobieren. Deinen Weg bei Bedarf ändern.', 'Am Boden vergleichen: Was passte? Für den nächsten Versuch eine Idee ändern.'],
    cues: ['Hände und Füße mitdenken.', 'Deinen Plan anpassen ist erlaubt.'], mistakes: ['Nur die Handgriffe anschauen.', 'Dem Plan trotz unsicherer Position folgen.'], harder: 'Zwei Wege vergleichen; eine Idee an einem anderen leichten Boulder testen.', selectionReason: 'Übe, Griffe, Tritte und einen möglichen Weg vom Boden aus zu erkennen. Deine Technik wird dadurch nicht automatisch bewertet.',
    goal: 'Vor dem Start einen Weg mit Händen und Füßen überlegen.',
  },
  'controlled-move': {
    goal: 'Erst den Fuß belasten, dann die Hand bewegen.',
    steps: ['Bekannte leichte Passage ohne Sprünge wählen. Füße bleiben an der Wand.', 'Fuß belasten, dann die nächste Hand bewegen.', 'Bewegungen ruhig verbinden. Stoppen und Nachsetzen sind erlaubt.', 'Am Boden eine unklare Bewegung auswählen und nur diese erneut üben.'],
    cues: ['Erst Fuß belasten, dann Hand bewegen.', 'Ruhig ist wichtiger als schnell.'], mistakes: ['Jede Pause verbieten.', 'Für einen flüssigen Ablauf die Kontrolle verlieren.'], harder: 'Den Ablauf an einer anderen leichten Passage ausprobieren.', selectionReason: 'Übe einen ruhigen Bewegungsablauf. Diese Übung trainiert keine schnellen Sprünge.',
  },
};

/** Only plain numeric counts/ranges are estimated; descriptive/free-form doses stay unknown. */
export function repetitionUpperBound(value: string): number | null {
  const match = value.trim().match(/^(\d{1,3})(?:\s*[–—-]\s*(\d{1,3}))?$/);
  if (!match) return null;
  const first = Number(match[1]), last = Number(match[2] ?? match[1]);
  return first > 0 && last >= first && last <= 100 ? last : null;
}

function estimateItemMinutes(exercise: TrainingExercise, item: SessionExercise): number | null {
  const dose = exercise.defaultDose, repetitions = repetitionUpperBound(item.repetitions);
  if (!dose || repetitions === null || !Number.isInteger(item.sets) || item.sets < 1 || !Number.isFinite(item.restSeconds) || item.restSeconds < 0) return null;
  const scope = item.restScope ?? dose.restScope;
  const work = item.sets * repetitions * (dose.sideMultiplier ?? 1) * dose.secondsPerRepetition;
  const pauses = scope === 'repetitions' ? Math.max(0, item.sets * repetitions * (dose.sideMultiplier ?? 1) - 1) : Math.max(0, item.sets - 1);
  return Math.ceil((work + pauses * item.restSeconds + dose.setupMinutes * 60) / 60);
}

export function isKwsExerciseAvailable(exercise: TrainingExercise): boolean {
  if (exercise.area === 'rehab') return true;
  return (exercise.requiredEquipment ?? [exercise.equipment]).every(equipment => KWS_AVAILABLE_EQUIPMENT.includes(equipment) || equipment === 'Ohne Gerät');
}
export const TRAINING_EXERCISES: TrainingExercise[] = [...RAW_EXERCISES, ...additionalTrainingContent(strengthSource), ...additionalBoulderContent(techniqueSource), ...additionalKidsContent(), ...additionalMobilityContent()].map(raw => {
  if (raw.area === 'kids') return { ...raw, planEligible: false, kwsAvailable: isKwsExerciseAvailable(raw) };
  if (raw.area === 'rehab' || raw.contentKind === 'orientation') return { ...raw, planEligible: false, contentKind: 'orientation', kwsAvailable: isKwsExerciseAvailable(raw) };
  const guidance = GUIDANCE[raw.id] ?? {};
  const defaultDose = guidance.defaultDose ?? raw.defaultDose ?? (raw.area === 'boulder' ? { ...TECHNIQUE_DOSE } : { ...STRENGTH_DOSE });
  const perSide = defaultDose.sideMultiplier === 2 ? ' je Seite' : '';
  const exercise: TrainingExercise = {
    ...raw, ...guidance, defaultDose, planEligible: guidance.planEligible ?? raw.planEligible ?? true,
    alternativeEquipment: ['quiet-feet', 'foot-swap', 'edge-choice', 'hip-position', 'read-boulder', 'controlled-move'].includes(raw.id) ? ['Spraywall'] : raw.alternativeEquipment,
    dose: raw.format || raw.id === 'side-plank' ? raw.dose : raw.area === 'boulder' ? `Beispiel: ${defaultDose.repetitions} kurze Versuche an einer passenden Passage. Pro Versuch nur einen Punkt üben.`
      : `Beispiel: ${defaultDose.sets} Sätze · ${defaultDose.repetitions} Wiederholungen${perSide}.${raw.id === 'dead-bug' ? ' Nur so weit strecken, wie du die Haltung halten kannst.' : ' Bei vertrauter Variante aufhören, während noch etwa 2–3 saubere Wiederholungen möglich wären.'}`,
    rest: raw.area === 'mobility' ? raw.rest : `Etwa ${defaultDose.restSeconds} Sekunden Pause zwischen ${defaultDose.restScope === 'repetitions' ? defaultDose.repetitionUnit === 'Haltephasen' ? 'Haltephasen' : 'Versuchen' : 'Sätzen'}. Bei Bedarf länger erholen.`,
    note: raw.format ? raw.note : `${raw.area === 'boulder' ? 'Rückweg prüfen; Fallbereich frei halten. Auch leichte Übungen belasten die Finger.' : 'Gewicht und Variante müssen gut kontrollierbar sein.'} ${STOP}`,
    setupRequirements: guidance.setupRequirements ?? raw.setupRequirements ?? (raw.area === 'boulder' ? ['Passende Passage, freier Mattenbereich und kontrollierbarer Abstieg', 'Geeignete Hallen-/Bewegungseinweisung'] : []),
  };
  exercise.kwsAvailable = isKwsExerciseAvailable(exercise);
  exercise.minutes = estimateItemMinutes(exercise, { id: '', exerciseId: raw.id, sets: defaultDose.sets, repetitions: defaultDose.repetitions, restSeconds: defaultDose.restSeconds }) ?? 0;
  return exercise;
});
export const getExercise = (id: string) => TRAINING_EXERCISES.find(exercise => exercise.id === id);
export function makeSessionItem(exerciseId: string, index = 0): SessionExercise {
  const exercise = getExercise(exerciseId), dose = exercise?.defaultDose;
  if (!exercise || !dose || exercise.area === 'kids' || exercise.area === 'rehab' || exercise.contentKind === 'orientation') throw new Error('Diese Karte hat keine einplanbare Trainingsdosis.');
  return { id: `${exerciseId}-${index}`, exerciseId, sets: dose.sets, repetitions: dose.repetitions, restSeconds: dose.restSeconds, restScope: dose.restScope };
}
export const EMPTY_SESSION: TrainingSession = { id: 'new', title: 'Meine Einheit', focus: 'Selbst zusammengestellt', minutes: null, preparationMinutes: 10, cooldownMinutes: 3, exercises: [] };
export function getSessionEstimate(session: TrainingSession): { minutes: number | null; notes: string[] } {
  if (!session.exercises.length) return { minutes: null, notes: ['Noch kein konkreter Übungsumfang.'] };
  if ([session.preparationMinutes ?? 0, session.cooldownMinutes ?? 0].some(value => !Number.isFinite(value) || value < 0)) return { minutes: null, notes: ['Vorbereitungs-/Abschlusszeit offen.'] };
  let total = (session.preparationMinutes ?? 0) + (session.cooldownMinutes ?? 0);
  if (!Number.isFinite(total) || total < 0) return { minutes: null, notes: ['Vorbereitungs-/Abschlusszeit offen.'] };
  for (const item of session.exercises) {
    const exercise = getExercise(item.exerciseId), estimate = exercise ? estimateItemMinutes(exercise, item) : null;
    if (estimate === null) return { minutes: null, notes: ['Dauer offen: Übung oder Umfang nicht numerisch schätzbar.'] };
    total += estimate;
  }
  return { minutes: Math.ceil(total), notes: ['Planungsschätzung aus Aufbau, Bewegung, Pausen und Reflexion; kein gemessener Zeit-/Belastungswert. Längere notwendige Pausen verändern das Budget.'] };
}
export const getSessionMinutes = (session: TrainingSession): number | null => getSessionEstimate(session).minutes;
