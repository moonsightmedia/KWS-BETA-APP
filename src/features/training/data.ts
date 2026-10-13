import type { SessionExercise, TrainingAnswers, TrainingArea, TrainingDose, TrainingEquipment, TrainingExercise, TrainingSession } from './types';
import { additionalTrainingContent } from './trainingContent';
import { additionalBoulderContent } from './boulderContent';

export const TRAINING_AREAS: { id: TrainingArea; title: string; description: string }[] = [
  { id: 'strength', title: 'Krafttraining', description: 'Nach Muskelbereich und Equipment auswählen.' },
  { id: 'boulder', title: 'Boulderübungen', description: 'Bewegungen üben und deine Technik verbessern.' },
  { id: 'rehab', title: 'Wiedereinstieg', description: 'Beschwerden einordnen und fachliche Begleitung vorbereiten.' },
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
const STOP = 'Bei neuem oder zunehmendem Schmerz, ungewöhnlichem Funktionsverlust oder fehlender Kontrolle die Aufgabe beenden. Die App gibt keine verletzungsbezogene Wiederaufnahme frei.';
function strength(id: string, title: string, topic: string, equipment: TrainingEquipment, goal: string, steps: string[], easier: string, harder: string): TrainingExercise {
  return { id, title, topic, equipment, goal, steps, easier, harder, area: 'strength', level: 'Einstieg / Aufbau', minutes: 10, dose: 'Beispiel: 2 Sätze · 6–10 kontrollierte Wiederholungen', rest: 'Beispiel: 90 Sekunden zwischen den Sätzen', note: 'Bewegung kontrolliert ausführen. Die Beispieldosis ist noch nicht fachlich freigegeben.', keywords: [topic, 'kraft', title, equipment, topic === 'Brust' ? 'drücken liegestütz pushup' : ''], sources: strengthSource };
}
function technique(id: string, title: string, topic: string, goal: string, steps: string[], easier: string, harder: string): TrainingExercise {
  return { id, title, topic, goal, steps, easier, harder, area: 'boulder', equipment: 'Boulderwand', level: 'Einstieg / Aufbau', minutes: 10, dose: 'Beispiel: 3 leichte Boulder · je 2 bewusste Durchgänge', rest: 'Erholen, bis die nächste Bewegung wieder kontrolliert gelingt.', note: 'An leichten, vertrauten Bouldern in geringer Höhe üben. Qualität geht vor Anzahl.', keywords: [topic, title, 'technik', 'bouldern', topic === 'Fußtechnik' ? 'fuß füsse füße treten tritte' : ''], sources: techniqueSource };
}
const REHAB_ORIENTATION: Record<string, { observation: string; discussion: string; category: string; source: TrainingExercise['sources'][number] }> = {
  'rehab-shoulder': {
    observation: 'Ort, Beginn und Verlauf beschreiben: etwa nach Zugbewegung, beim Stützen oder im Alltag; ungewohnte Schwäche und vorherige Verletzungen erwähnen.',
    discussion: 'Mit der behandelnden Person klären, ob Schulter-/Rotatorenmanschettenbeschwerden vorliegen und welche Wand-, Zug- oder Druckbelastung aktuell passt.',
    category: 'Bei diagnostizierter Rotatorenmanschetten-Tendinopathie können Bewegungs-/Motorikkontrolle und dosierte Widerstandsübungen Teil aktiver Rehabilitation sein. Daraus folgt keine passende Übung für jeden Schulterschmerz.',
    source: { label: 'Schulter-Leitlinie 2025', url: 'https://doi.org/10.2519/jospt.2025.13182', context: 'Klinische Leitlinie für Erwachsene mit vermuteter Rotatorenmanschetten-Tendinopathie; unterstützt individuelle Aufklärung und aktive Rehabilitation, keine universelle Schulter- oder App-Dosis.' },
  },
  'rehab-fingers': {
    observation: 'Betroffenen Finger und Ort, Beginn, Griffart und Ereignis beschreiben; ein plötzliches Schnappen, Schwellung oder Funktionsverlust gehören ins fachliche Gespräch.',
    discussion: 'Fingerbeschwerden können unterschiedliche Strukturen betreffen. Diagnose, erlaubte Griffe, Wandlast und Wiedereinstieg mit einer entsprechend qualifizierten Person klären.',
    category: 'Bei Ringbandverletzungen hängt das Vorgehen von Art und Schwere ab; Schutz und stufenweise Wiederbelastung sind mögliche fachliche Kategorien. Taping ist keine automatische Freigabe für Hängen oder Bouldern.',
    source: { label: 'Ringbandverletzungen: klinischer Überblick 2021', url: 'https://doi.org/10.1016/j.wem.2021.01.011', context: 'Klinischer Literaturüberblick zur Abklärung und Behandlung von Ringbandverletzungen beim Klettern; keine Leitlinie für alle Fingerschmerzen und kein belastbarer universeller Rehaplan.' },
  },
  'rehab-elbow': {
    observation: 'Ort innen/außen, zeitlichen Verlauf und Zusammenhang mit Greifen, Ziehen, Drücken oder Alltag beschreiben; Änderungen von Umfang und Equipment notieren.',
    discussion: 'Nicht jeden Ellenbogenschmerz als Tennisellenbogen behandeln. Mit der behandelnden Person Diagnose, relevante Funktion und erlaubte Hand-/Zugbelastung klären.',
    category: 'Die Leitlinie für laterale Ellenbogen-Tendinopathie behandelt untersuchte Muskel-/Funktionsdefizite und individuell ausgewählte Interventionen. Konkrete Übungskategorie und Last bleiben diagnoseabhängig; ein pauschales Exzentrikrezept folgt daraus nicht.',
    source: { label: 'Lateraler Ellenbogenschmerz: Leitlinie 2022', url: 'https://doi.org/10.2519/jospt.2022.0302', context: 'Diagnosebezogene physiotherapeutische Leitlinie zu lateraler Ellenbogen-Tendinopathie. Der hier zugängliche Abstract bestätigt den Anwendungsbereich; genaue Übungsprotokolle wurden für diese Karte nicht extrahiert.' },
  },
  'rehab-knee': {
    observation: 'Ort, Beginn und Verlauf bei Treppen, Hocken, hohen Tritten oder Landungen beschreiben; Verletzungsereignis, Schwellung oder Wegknicken erwähnen.',
    discussion: 'Beschwerden nach einer Landung und länger bestehender vorderer Knieschmerz brauchen unterschiedliche Einordnung. Diagnose und derzeit passende Alltags-/Sportbelastung klären.',
    category: 'Bei diagnostiziertem patellofemoralem Schmerz können individuell ausgewählte Kraftübungen für Hüfte und Knie Bestandteil der Behandlung sein. Diese Kategorie erklärt keinen akuten Landeschaden und gibt keine Landungsfreigabe.',
    source: { label: 'Patellofemoraler Schmerz: Leitlinie 2019', url: 'https://doi.org/10.2519/jospt.2019.0302', context: 'Diagnosebezogene Leitlinie, unter anderem Hüft-/Knieübungen; optimale Dosierung nicht eindeutig. Kein allgemeines Knie-Rezept und keine Freigabe zum Abspringen.' },
  },
};
const rehab = (id: string, _title: string, topic: string): TrainingExercise => {
  const content = REHAB_ORIENTATION[id];
  return {
    id, title: `${topic} · Orientierung zum Wiedereinstieg`, topic, area: 'rehab', goal: 'Ein fachliches Gespräch vorbereiten und einen bereits abgestimmten Verlauf nachvollziehbar beobachten.',
    equipment: 'Ohne Gerät', level: 'Orientierung · kein Übungsrezept', minutes: 0, planEligible: false,
    steps: [content.observation, content.discussion, content.category, 'Einen bereits vereinbarten Belastungsblock und die Reaktion währenddessen, danach und am Folgetag dokumentieren; Änderungen mit der behandelnden Person abstimmen. Keine Schmerzgrenze oder Freigabe selbst aus der App ableiten.'],
    dose: 'Kein selbstständig dosierbares Trainingsrezept; Umfang gehört zum individuell abgestimmten Behandlungsplan.', rest: 'Pausen und nächste Belastung individuell abstimmen.', easier: 'Verlauf und Fragen zuerst dokumentieren; keine ungeklärte Belastung zum Testen hinzufügen.', harder: 'Steigerung und Rückkehr zur Wand erst nach dem vereinbarten fachlichen Vorgehen.',
    cues: ['Ort, Anlass und Verlauf konkret beschreiben.', 'Eine Beobachtung ist keine Diagnose oder Freigabe.'], mistakes: ['Eine Körperregion mit einer bestimmten Diagnose gleichsetzen.', 'Allgemeine Kraftkarten unverändert als Reha-Dosis übernehmen.'], setupRequirements: ['Individuelle Abklärung und vereinbartes Vorgehen für konkrete Beschwerden'], selectionReason: 'Gesprächs- und Beobachtungshilfe; wird nicht automatisch einem Trainingsplan zugeordnet.',
    note: `Redaktionelle Orientierung, noch nicht fachlich freigegeben. Bei plötzlichem deutlichem Funktionsverlust, sichtbarer Fehlstellung oder schweren akuten Beschwerden zeitnah medizinisch abklären. ${STOP}`, keywords: [topic, 'wiedereinstieg', 'reha', 'beschwerden'], sources: [content.source],
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
    goal: 'Eine Druckbewegung über die Auflagehöhe passend skalieren.',
    steps: ['Feste rutschfreie erhöhte Fläche wählen; Hände angenehm setzen und Füße stabil aufstellen.', 'Brust und Becken gemeinsam kontrolliert zur Auflage absenken; Ellbogen folgen einer angenehmen Richtung.', 'Ruhig wegdrücken und weiteratmen, statt eine letzte Wiederholung zu erzwingen.', 'Bei Ausweichen eine höhere Auflage oder kürzeren angenehmen Weg wählen.'],
    cues: ['Brust und Becken bewegen sich gemeinsam.', 'Die passende Höhe ist wichtiger als die Pflichtzahl.'], mistakes: ['Zu niedrige Auflage durch Durchhängen kompensieren.', 'Schultern oder Handgelenke in eine unangenehme Position zwingen.'],
    easier: 'Höhere geprüfte Auflage und zunächst wenige Kennenlern-Wiederholungen.', harder: 'Nach wiederholter Kontrolle die Auflage etwas niedriger wählen; Umfang dabei beibehalten.', setupRequirements: ['Stabile rutschfeste erhöhte Fläche'], selectionReason: 'Druckkraft kann unabhängig vom Bouldergrad skaliert werden; mögliche Variante bei unbekannter Bodenliegestützerfahrung.',
  },
  pushup: {
    steps: ['Auf rutschfestem Boden einen kontrollierten Stütz aufbauen; Hände angenehm platzieren.', 'Rumpf und Beine gemeinsam absenken, ohne Schulterstellung oder Tiefe zu erzwingen.', 'Kontrolliert zurückdrücken und dabei weiteratmen.', 'Satz beenden, bevor nur noch Schwung oder Ausweichen möglich ist.'],
    cues: ['Ein zusammenhängender Körper bewegt sich.', 'Nutze einen beherrschbaren Bewegungsumfang.'], mistakes: ['Nur Kopf oder Hüfte bewegen.', 'Bekannte Maximalzahl als Pflichtumfang übernehmen.'],
    easier: 'Erhöhte Liegestütze statt erzwungener Bodenwiederholungen.', harder: 'Eine passende Variante ändern; langsamere Ausführung ist nicht automatisch besser.', setupRequirements: ['Rutschfester Boden und vertrauter kontrollierter Stütz'], selectionReason: 'Für bereits vertraute Bodenliegestütze. Bei geringer oder unbekannter Fähigkeit wird die erhöhte Variante gewählt.',
  },
  'dumbbell-bench': {
    steps: ['Auf einer geprüften Bank einrichten; Aufnehmen und Ablegen leichter Hanteln vorher einweisen lassen.', 'Füße stabil unterstützen und Hanteln kontrolliert über dem Oberkörper halten.', 'In angenehmem Weg absenken und ruhig wieder hochdrücken; kein Aufprallen.', 'Mit dem bekannten Rückweg ablegen; keine erschöpfte Wiederholung erzwingen.'],
    cues: ['Auch Aufnehmen und Ablegen gehören zur Übung.', 'Beide Gewichte bleiben kontrollierbar.'], mistakes: ['Eine Bank allein aus „Kurzhanteln vorhanden“ ableiten.', 'Zu große Last oder erzwungene Schultertiefe.'],
    setupRequirements: ['Geprüfte Trainingsbank und stabile Fußauflage', 'Einweisung in Aufnehmen, Ausführen und Ablegen'], requiredEquipment: ['Kurzhanteln', 'Trainingsbank'], planEligible: true, selectionReason: 'Option bei tatsächlich vorhandener Bank UND Kurzhanteln. Die KWS-Bank allein macht diese zusätzliche Equipmentoption nicht verfügbar.',
  },
  'dumbbell-floor': {
    steps: ['Mit eingewiesenem Aufnahmeweg auf dem Rücken einrichten; leichte Hanteln kontrollieren.', 'Gewichte absenken, bis Oberarme den Boden kontrolliert erreichen; nicht fallen oder federn lassen.', 'Ruhig hochdrücken und weiteratmen, ohne mit der Last auszuweichen.', 'Mit bekanntem kontrolliertem Rückweg ablegen.'],
    cues: ['Bodenkontakt kontrolliert erreichen.', 'Der verkürzte Weg ist eine Variante, keine Schutzgarantie.'], mistakes: ['Oberarme auf den Boden schlagen.', 'Last wählen, die beim Ablegen nicht beherrschbar ist.'],
    setupRequirements: ['Freie Bodenfläche', 'Einweisung in sichere Lastaufnahme und Ablage'], selectionReason: 'Kurzhantel-Druckoption ohne stillschweigend vorausgesetzte Bank; persönliche Eignung und Lastwahl bleiben zu prüfen.',
  },
  'band-press': {
    steps: ['Unbeschädigtes Band an dafür zugelassenem Anker befestigen und Befestigung prüfen.', 'Stabil stehen und Griffe auf angenehmer Brusthöhe aufnehmen.', 'Kontrolliert nach vorne drücken, ohne mit dem Rumpf gegen die Spannung auszuweichen.', 'Langsam zurückführen; Band nicht zurückschnellen lassen.'],
    cues: ['Band und Anker vor Belastung prüfen.', 'Hin- und Rückweg gehören zur Wiederholung.'], mistakes: ['Improvisierten Türgriff als sicheren Anker behandeln.', 'Band zurückschnellen lassen oder stark ins Hohlkreuz ausweichen.'],
    setupRequirements: ['Geeigneter geprüfter Bandanker', 'Unbeschädigtes Band und Geräteeinweisung'], selectionReason: 'Druckalternative bei Bandzugang; der Anker muss zusätzlich zur Equipmentwahl vor Ort bestätigt werden.',
  },
  'band-row': {
    steps: ['Band und zugelassenen Anker prüfen; stabilen Stand mit mäßiger Vorspannung wählen.', 'Griffe zum Körper ziehen, ohne den Oberkörper ruckartig zurückzuwerfen.', 'Ellbogen dem angenehmen Griffweg folgen lassen; Schultern nicht in eine starre Endstellung zwingen.', 'Kontrolliert zurückführen, Spannung lösen und geordnet ablegen.'],
    cues: ['Ziehen, ohne den ganzen Körper zurückzuwerfen.', 'Griff-/Zuglast zählt zur heutigen Gesamtlast.'], mistakes: ['Schwung statt kontrollierter Lastbewegung.', 'Nach erschöpfender Wandpraxis weitere Zugblöcke stapeln.'],
    setupRequirements: ['Geprüfter Bandanker und unbeschädigtes Band', 'Einweisung in Stand, Griff und Entlasten'], selectionReason: 'Horizontale Zugoption; ersetzt eine zusätzliche Zugübung, statt zwingend zum Klimmzug dazuzukommen.',
  },
  pullup: {
    defaultDose: { ...STRENGTH_DOSE, repetitions: '4–6', restSeconds: 150 }, level: 'Vertraute Zug- und Gerätepraxis',
    steps: ['Geprüfte Stange mit bekanntem sicherem Einstieg greifen; Variante und Rückweg klären.', 'Ohne Kipping hochziehen, soweit die strikte Bewegung beherrscht wird.', 'Kontrolliert absenken und weiteratmen; nicht passiv herunterfallen.', 'Vor Ausweichschwung oder erzwungener letzter Wiederholung beenden und sicher zurückkehren.'],
    cues: ['Die bekannte Maximalzahl ist keine Pflicht.', 'Assistenz braucht einen eigenen geprüften Aufbau.'], mistakes: ['Unbekannte Fähigkeit durch einen Test bis zum Versagen ermitteln.', 'Griff-/Schulterproblem mit Schwung umgehen.'],
    easier: 'Bei unbekannter Fähigkeit Einweisung; passende Band-Ruderoption oder betreute Assistenz statt freier Klimmzüge.', harder: 'Keine automatische Zusatzlast aus Bouldergrad oder Wiederholungszahl.', setupRequirements: ['Geprüfte Stange, kontrollierter Einstieg und Rückweg', 'Vertraute Geräte-/Zugpraxis'], selectionReason: 'Automatischer Kandidat nur mit regelmäßigem Krafttraining und bekannten freien Klimmzügen; keine Grad-basierte Lastvorgabe.',
  },
  'split-squat': {
    defaultDose: { ...STRENGTH_DOSE, sideMultiplier: 2 },
    steps: ['Auf rutschfestem Boden angenehmen versetzten Stand wählen; bei Bedarf stabil festhalten.', 'Hüfte und Knie kontrolliert beugen, nur im beherrschbaren angenehmen Bewegungsbereich.', 'Über beide stabilen Fußkontakte wieder aufrichten; keine starre Knie-/Fußrichtung erzwingen.', 'Nach dem Satz ruhig Seite wechseln; die Anzahl gilt je Seite.'],
    cues: ['Gleichgewicht vor Tiefe.', 'Unterstützung darf beim Kennenlernen helfen.'], mistakes: ['Tiefe oder Last vor kontrolliertem Stand erzwingen.', 'Die Beinkraftübung als Nachweis eines High-Step-Defizits behandeln.'],
    easier: 'Kürzerer Weg und stabile Haltemöglichkeit.', harder: 'Kontrolle oder Unterstützung anpassen; Zusatzlast erst nach Einweisung.', setupRequirements: ['Rutschfester Boden; bei Bedarf stabile Haltemöglichkeit'], selectionReason: 'Allgemeine Beinkraftoption. Ein direkter Transfer auf High Steps ist nicht nachgewiesen.',
  },
  'dead-bug': {
    defaultDose: { ...STRENGTH_DOSE, repetitions: '4–6', restSeconds: 60, secondsPerRepetition: 6, sideMultiplier: 2 },
    steps: ['In angenehmer Rückenlage beginnen und ruhig atmen; Arme/Beine passend positionieren.', 'Zunächst einen Fuß langsam zum Boden bewegen und zurücknehmen.', 'Bei kontrollierter Variante gegenüberliegenden Arm ergänzen; Reichweite bleibt angenehm.', 'Zwischen Seiten neu ausrichten; keine Rückenposition gegen Beschwerden erzwingen.'],
    cues: ['Kleine Bewegung und ruhige Atmung sind ein gültiger Einstieg.', 'Hebel nur so weit verlängern, wie die Position kontrolliert bleibt.'], mistakes: ['Langen Hebel trotz Ausweichen erzwingen.', 'Wiederholungen mit bewiesener Körperspannung im Überhang gleichsetzen.'],
    easier: 'Nur ein Bein bewegen oder den Fuß gleiten lassen.', harder: 'Einen etwas längeren Hebel kontrollieren; nicht gleichzeitig mehr Wiederholungen.', setupRequirements: ['Freie angenehme Bodenfläche'], selectionReason: 'Rumpfkontrolle ohne zusätzliche Handlast; kein getesteter direkter Überhangtransfer.',
  },
  'quiet-feet': {
    goal: 'Erstes Platzieren und anschließendes Belasten eines Tritts bewusst unterscheiden.',
    steps: ['Kurze kontrollierbare Passage mit guten Händen, Tritten und Rückweg wählen.', 'Den gewünschten Kontaktpunkt ansehen und den Fuß gezielt setzen.', 'Erst danach Gewicht übertragen und beobachten, ob der Kontakt bleibt; nötiges Korrigieren ist erlaubt.', 'Am Boden eine Beobachtung nennen und im nächsten Versuch nur diesen Cue prüfen.'],
    cues: ['Ansehen, setzen, dann belasten.', 'Nicht „lautlos um jeden Preis“: die Aufgabe bestimmt die Lösung.'], mistakes: ['Blick zu früh vom Zieltritt nehmen.', 'Jede Fußkorrektur als Fehler bewerten.'],
    harder: 'Gleichen Cue an einer anderen passenden leichten Passage prüfen, statt sofort kleinere Tritte zu fordern.', selectionReason: 'Grundlegender Fuß-Lernblock für neue Bouldernde und das Lernfeld Fußtechnik; beobachtete Platzierung statt Pflicht-Top.',
  },
  'foot-swap': {
    steps: ['Großen Tritt und gute Hände in kontrollierbarer Position wählen.', 'Vor dem Wechsel klären, welche Kontakte unterstützen; Coach zeigt die Variante.', 'Neuen Fuß passend annähern, Last übertragen und alten Fuß kontrolliert lösen.', 'Stabilisieren, zurückkehren und erklären, wann der Wechsel hier geholfen hat.'],
    cues: ['Unterstützung vor dem Wechsel klären.', 'Eine andere Fußfolge darf besser sein.'], mistakes: ['Dynamischen Wechsel ohne passenden Aufbau erzwingen.', 'Beide Füße ohne kontrollierte Unterstützung gleichzeitig lösen.'], harder: 'An anderem geeigneten Tritt prüfen; keine automatische Sprungvariante.', selectionReason: 'Nach vertrauter Fußplatzierung, wenn die nächste Hand-/Hüftposition einen Wechsel sinnvoll macht.',
  },
  'edge-choice': {
    steps: ['Guten Tritt und kurzen seitlichen Handzug mit großen Griffen wählen.', 'Eine frontale bzw. innenkantenbetonte Lösung kontrolliert ausprobieren.', 'Fuß passend umsetzen und außenkantenbetonte Lösung prüfen; Knie nicht gegen blockierten Schuh drehen.', 'Reichweite und Kontrolle vergleichen; keine Variante muss grundsätzlich gewinnen.'],
    cues: ['Fuß darf beim Positionswechsel umgesetzt werden.', 'Der konkrete nächste Zug entscheidet.'], mistakes: ['Knie bei festgeklemmtem Fuß verdrehen.', 'Außenkante oder Wandnähe zur immer richtigen Lösung erklären.'], selectionReason: 'Verbindet Fußtechnik und Körperposition; zwei entsprechende Lernfelder können an einer Passage verglichen werden.',
  },
  smearing: {
    steps: ['Mit Hallenpersonal geeignete leichte Platte, gute Hände und kontrollierten Rückweg wählen.', 'Fuß auf passende Fläche setzen; angenehme Kontakt-/Körperposition erkunden.', 'Gewicht schrittweise übertragen; kein absichtliches Abrutschen oder Fallen provozieren.', 'Am Boden beschreiben, welche Position den Kontakt kontrollierbar machte.'],
    cues: ['Schrittweise belasten.', 'Nicht jede Wandfläche ist ein geeigneter Reibungstritt.'], mistakes: ['Kontakt durch absichtliches Abrutschen testen.', 'Fersenhöhe unabhängig von Wand und Schuh erzwingen.'], harder: 'Neue geeignete Fläche nach Vor-Ort-Prüfung; keine automatische kleinere Kontaktfläche.', selectionReason: 'Kandidat für das Lernfeld Platte; verlangt tatsächlich passende Reibungsbedingungen.',
  },
  'high-step': {
    sources: [{ label: 'Blagus et al.: Videoergänzung', url: 'https://doi.org/10.1177/17479541231152548', context: 'Kleine betreute Anfänger-Lernstudie, Zusatznutzen beim High Step, nicht jeder Bewegung. Statischer Aufbau und Dosis dieser Karte sind redaktionelle Varianten.' }],
    steps: ['Coach wählt erreichbaren angenehmen Tritt, gute Hände und kontrollierten Rückweg.', 'Fuß gezielt setzen, ohne das Knie mit der Hand hochzuziehen.', 'Eine passende Position zum belasteten Fuß finden und aus dem Bein aufrichten; Armhilfe ist erlaubt.', 'Fußkontakt und Gewichtswechsel besprechen; optional eine passende Demonstration vergleichen.'],
    cues: ['„Hoch“ heißt individuell erreichbar, nicht maximal.', 'Armhilfe ist erlaubt.'], mistakes: ['Tritthöhe mit Qualität gleichsetzen.', 'Knie gegen festen Fuß verdrehen oder Hüftposition erzwingen.'], harder: 'Andere passende Trittposition, keine automatische Maximalhöhe.', selectionReason: 'Fuß-/Positionsvergleich mit begrenztem Lernbefund zur betreuten Videoergänzung; dieses Rezept ist redaktionell.',
  },
  'hip-position': {
    steps: ['Kurzen seitlichen Zug mit guten Händen/Tritten wählen; zunächst senkrecht üben.', 'Frontale Lösung erproben und notwendige Korrekturen beobachten.', 'Mit passend umgesetztem Fuß Hüfte drehen und denselben Zug prüfen; keine tiefe Knieposition erzwingen.', 'Reichweite, Kontrolle und Aufwand vergleichen, dann zurückkehren.'],
    cues: ['Die Aufgabe entscheidet, welche Position hilft.', 'Mehr Wandnähe ist kein universelles Qualitätsmaß.'], mistakes: ['Hüfte pauschal zur Wand pressen.', 'Drop Knee oder Verdrehung trotz Beschwerden erzwingen.'], harder: 'Anderer Griffzug; Überhang erst nach geeigneter Einführung und eigener Lastprüfung.', selectionReason: 'Grundlagenvergleich für Körperposition; kann späteren Überhangansatz vorbereiten, ersetzt keine Überhangdiagnose.',
  },
  'heel-hook': {
    requiresCoach: true, level: 'Coachbegleitete Einführung',
    steps: ['Coach prüft Heelkontakt, angenehme Knie-/Hüftposition, Hände und Rückweg.', 'Heel aus unterstützter Position gezielt setzen; Belastung nur schrittweise aufnehmen.', 'Passenden Handzug ausführen, ohne Knieposition oder maximale Zugkraft zu erzwingen.', 'Andere Unterstützung herstellen, Hook bewusst lösen und zurückkehren.'],
    cues: ['Setzen, nutzen und lösen gehören zusammen.', 'Toe Hook braucht eine eigene Einführung.'], mistakes: ['Hook lösen, bevor andere Kontakte tragen.', 'Auf rutschendem Kontakt stärker ziehen oder das Bein verklemmen.'], harder: 'Gleiche Hookart an anderer coachgeprüfter Passage, keine automatische Maximalvariante.', selectionReason: 'Nur mit bestätigter Coachbegleitung automatisch als Hooks-Lernblock wählen; kein Pflichtdrill für neue Bouldernde.',
  },
  'read-boulder': {
    sources: [{ label: 'Morenas et al. 2021: Modellpreview', url: 'https://doi.org/10.3390/ijerph182312594', context: 'Akuter Previewvergleich bei 21 fortgeschrittenen Kletternden, kein Langzeit-Apptraining. Die Lernfolge und Dosierung dieser Karte sind redaktionell.' }, ...techniqueSource],
    steps: ['Griffe, Tritte, Landebereich und Rückweg vom Boden ansehen.', 'Eine Hand-/Fußfolge nennen und eine unsichere Stelle markieren; Sicherheitsfragen vor Start klären.', 'Kontrollierbare kurze Passage ausprobieren; Anpassung oder Abbruch sind erlaubt.', 'Erste Idee und Ablauf vergleichen. Optional eine passende Beta ansehen und nur einen Hinweis prüfen.'],
    cues: ['Eine Hypothese und eine Unsicherheit genügen.', 'Eine erfolgreiche andere Beta ist kein Fehler.'], mistakes: ['Nur Hände lesen oder dem Plan blind folgen.', 'Besseres Wiederholen automatisch als Video- oder Transferwirkung zählen.'], harder: 'Zwei Lösungen vergleichen und eine Idee an neuer Aufgabe prüfen.', selectionReason: 'Für Boulder lesen oder einen Analysefokus mit wenig zusätzlicher Handlast; kein automatischer Technikbefund.',
  },
  'controlled-move': {
    goal: 'In einer bekannten kurzen Passage das Timing von Fußdruck und Handbewegung beobachten.',
    steps: ['Vertraute kurze Passage mit guten Kontakten wählen; keine Sprung-/Campusaufgabe.', 'Einen Timingcue festlegen, etwa Fuß belasten, bevor die Hand weiterzieht.', 'Bewegungen kontrolliert verbinden; sinnvolle Pause oder Korrektur sind erlaubt.', 'Einen gelungenen/unklaren Zeitpunkt beschreiben und nur diesen Aspekt erneut prüfen.'],
    cues: ['Flüssig bedeutet zweckmäßig, nicht möglichst schnell.', 'Timing wird an dieser Aufgabe beobachtet.'], mistakes: ['Alle Stopps verbieten.', 'Ermüdung mit Koordinations- oder Ausdauerwirkung gleichsetzen.'], harder: 'Neue leichte Passage mit gleichem Cue; dynamische Aufgaben brauchen einen eigenen Coachpfad.', selectionReason: 'Statische Timingaufgabe; kein Explosivkraft-, Intervall- oder Wettkampfrezept.',
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
export const TRAINING_EXERCISES: TrainingExercise[] = [...RAW_EXERCISES, ...additionalTrainingContent(strengthSource), ...additionalBoulderContent(techniqueSource)].map(raw => {
  if (raw.area === 'rehab' || raw.contentKind === 'orientation') return { ...raw, planEligible: false, contentKind: 'orientation', kwsAvailable: isKwsExerciseAvailable(raw) };
  const guidance = GUIDANCE[raw.id] ?? {};
  const defaultDose = guidance.defaultDose ?? raw.defaultDose ?? (raw.area === 'boulder' ? { ...TECHNIQUE_DOSE } : { ...STRENGTH_DOSE });
  const perSide = defaultDose.sideMultiplier === 2 ? ' je Seite' : '';
  const exercise: TrainingExercise = {
    ...raw, ...guidance, defaultDose, planEligible: guidance.planEligible ?? raw.planEligible ?? true,
    alternativeEquipment: ['quiet-feet', 'foot-swap', 'edge-choice', 'hip-position', 'read-boulder', 'controlled-move'].includes(raw.id) ? ['Spraywall'] : raw.alternativeEquipment,
    dose: raw.format || raw.id === 'side-plank' ? raw.dose : raw.area === 'boulder' ? `Redaktioneller Lernblock: ${defaultDose.sets} Block · ${defaultDose.repetitions} kurze Versuche insgesamt an einer passenden Passage; ein Hauptcue.`
      : `Redaktioneller Einstieg: ${defaultDose.sets} Sätze · ${defaultDose.repetitions} Wiederholungen${perSide}.${raw.id === 'dead-bug' ? ' Kontrolle bestimmt den Hebel; kein Versagenstest.' : ' Bei vertrauter Variante etwa 2–3 saubere Wiederholungen Reserve.'}`,
    rest: `Etwa ${defaultDose.restSeconds} Sekunden zwischen ${defaultDose.restScope === 'repetitions' ? defaultDose.repetitionUnit === 'Haltephasen' ? 'Haltephasen' : 'Versuchen' : 'Sätzen'}; länger, wenn Kontrolle noch nicht zurückkehrt.`,
    note: raw.format ? raw.note : `${raw.area === 'boulder' ? 'Passage, Griffe und Rückweg vor Ort prüfen; Techniklabel bedeutet keine geringe Fingerlast.' : 'Allgemeine Kraft-/Kontrollübung; kein garantierter Bouldertransfer oder Verletzungsschutz.'} Konkretes Rezept noch nicht fachlich freigegeben. ${STOP}`,
    setupRequirements: guidance.setupRequirements ?? raw.setupRequirements ?? (raw.area === 'boulder' ? ['Passende Passage, freier Mattenbereich und kontrollierbarer Abstieg', 'Geeignete Hallen-/Bewegungseinweisung'] : []),
  };
  exercise.kwsAvailable = isKwsExerciseAvailable(exercise);
  exercise.minutes = estimateItemMinutes(exercise, { id: '', exerciseId: raw.id, sets: defaultDose.sets, repetitions: defaultDose.repetitions, restSeconds: defaultDose.restSeconds }) ?? 0;
  return exercise;
});
export const getExercise = (id: string) => TRAINING_EXERCISES.find(exercise => exercise.id === id);
export function makeSessionItem(exerciseId: string, index = 0): SessionExercise {
  const exercise = getExercise(exerciseId), dose = exercise?.defaultDose;
  if (!exercise || !dose || exercise.area === 'rehab' || exercise.contentKind === 'orientation') throw new Error('Diese Karte hat keine einplanbare Trainingsdosis.');
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
