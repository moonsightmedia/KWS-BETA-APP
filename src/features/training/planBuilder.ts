import { getExercise, getSessionMinutes, makeSessionItem } from './data';
import type { SessionExercise, TrainingAnswers, TrainingPlanIssue, TrainingPlanResult, TrainingSession } from './types';

const GOALS = ['Bouldern allgemein', 'Technik verbessern', 'Kraft aufbauen', 'Wettkampf vorbereiten'];
const dayDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 7 - Math.abs(a - b));
const uniqueDays = (days: number[]) => [...new Set(days)].sort((a, b) => a - b);

/** A deterministic editorial week draft, not a validated optimisation or medical plan. */
export function buildTrainingPlan(answers: TrainingAnswers): TrainingPlanResult {
  const issues: TrainingPlanIssue[] = [];
  const notes = ['Redaktioneller Wochenentwurf: Auswahl und Dosierung sind nicht als individuell optimales Programm validiert.', 'Zeit enthält Vorbereitung, Aufbau, obere Wiederholungszahl, Pausen und kurze Reflexion. Notwendige längere Pausen können den Entwurf verändern.'];
  const issue = (code: string, severity: TrainingPlanIssue['severity'], message: string) => {
    if (!issues.some(value => value.code === code)) issues.push({ code, severity, message });
  };
  const validDay = (day: number) => Number.isInteger(day) && day >= 0 && day <= 6;
  const fixed = uniqueDays((answers.fixedDays ?? []).filter(validDay));
  const sessions: TrainingSession[] = fixed.map(day => ({ id: `preview-${day}`, title: 'Bestehender Termin', focus: 'Vorhandenes Training zuerst abstimmen', minutes: null, exercises: [], budgetMinutes: answers.minutes, rationale: 'Dieser feste Termin bleibt erhalten. Umfang und Belastung des vorhandenen Trainings sind unbekannt; es werden keine Zusatzübungen angehängt.' }));
  const entries = fixed.map(day => ({ id: `entry-${day}`, day, sessionId: `preview-${day}`, completed: false, fixed: true }));
  const result = (): TrainingPlanResult => {
    const review = issues.some(value => value.severity !== 'note');
    // A review path carries existing appointments only, never unapproved recipes.
    const visibleSessions = review ? sessions.filter(session => !session.exercises.length) : sessions;
    const visibleEntries = review ? entries.filter(entry => entry.fixed) : entries;
    return { sessions: visibleSessions, issues, plan: { entries: [...visibleEntries].sort((a, b) => a.day - b.day), status: review ? 'needs-review' : 'draft', notes: [...notes, ...issues.map(value => value.message)], summary: `${visibleSessions.filter(session => session.exercises.length).length} vorgeschlagene Einheiten · ${fixed.length} bestehende Termine. Vor dem Übernehmen Voraussetzungen und Gesamtlast prüfen.` } };
  };
  if (answers.ageGroup !== 'adult') issue('adult-confirmation', 'blocking', answers.ageGroup === 'minor' ? 'Für Minderjährige ist ein eigener fachlich betreuter Trainingspfad erforderlich. Keine automatische Erwachsenendosis.' : 'Altersgruppe offen: Erwachsene bestätigen oder den betreuten Jugendpfad wählen.');
  if (answers.constraints !== 'Keine') issue('constraints-review', 'blocking', 'Einschränkungen, Beschwerden oder unklare Angaben benötigen vor neuen Trainingsvorgaben eine individuelle Abklärung. Bestehende Termine bleiben als Orientierung erhalten.');
  if (answers.goal === 'Wettkampf vorbereiten') issue('competition-review', 'blocking', 'Wettkampfplanung benötigt den bestehenden Coachplan, Wettkampftermin und Belastungsverlauf. Hier wird kein automatischer Peak- oder Wettkampfplan erstellt.');
  if (!GOALS.includes(answers.goal)) issue('goal-open', 'blocking', 'Ein unterstütztes Trainingsziel fehlt.');
  if (!['Ich fange gerade an', 'Unter 6 Monate', '6–12 Monate', '1–3 Jahre', 'Über 3 Jahre'].includes(answers.experience)) issue('experience-open', 'blocking', 'Boulder-Erfahrung offen: einen bekannten Erfahrungsbereich wählen, damit der Einstieg nicht stillschweigend als vertraute Praxis behandelt wird.');
  if (![...(answers.days ?? []), ...(answers.fixedDays ?? [])].every(validDay)) issue('invalid-days', 'blocking', 'Trainingstage müssen gültige Wochentage sein.');
  if (!Number.isFinite(answers.minutes) || answers.minutes < 20 || answers.minutes > 120) issue('invalid-budget', 'blocking', 'Für diesen Entwurf wird ein Zeitbudget von 20 bis 120 Minuten benötigt.');
  if (issues.some(value => value.severity === 'blocking')) return result();

  const novice = ['Ich fange gerade an', 'Unter 6 Monate'].includes(answers.experience);
  const familiarStrength = answers.strengthExperience === 'Regelmäßig';
  const equipment = new Set(answers.equipment ?? []);
  const bodyweight = equipment.has('Körpergewicht') || equipment.has('Ohne Gerät');
  const wall = equipment.has('Boulderwand');
  const learningFields = [...new Set((answers.weaknesses ?? []).filter(value => value !== 'Weiß ich nicht'))];
  const skillCandidates: { id: string; reason: string }[] = [];
  for (const field of learningFields) {
    let id: string | undefined;
    if (field === 'Fußtechnik') id = novice ? 'quiet-feet' : 'edge-choice';
    if (field === 'Körperposition' || field === 'Überhang') id = 'hip-position';
    if (field === 'Boulder lesen') id = 'read-boulder';
    if (field === 'Koordination') id = 'controlled-move';
    if (field === 'Platte') id = 'smearing';
    if (field === 'Hooks') {
      if (answers.coachGuided) id = 'heel-hook';
      else issue('hook-introduction', 'review', 'Hooks gewählt: eine Coachbegleitung für Setzen, Nutzen und Lösen bestätigen. Es wird keine Hookübung automatisch ersetzt oder verordnet.');
    }
    if (field === 'Ausdauer') issue('endurance-content-open', 'review', 'Ausdauer gewählt: ein separat geprüftes Ausdauerprotokoll fehlt noch. Statische Lernversuche werden nicht als Ausdauertraining ausgegeben.');
    if (!['Fußtechnik', 'Körperposition', 'Überhang', 'Boulder lesen', 'Koordination', 'Platte', 'Hooks', 'Ausdauer'].includes(field)) issue('learning-field-open', 'review', 'Ein Lernfeld lässt sich noch keiner geprüften Auswahlregel zuordnen. Es wird nicht stillschweigend ignoriert.');
    if (field === 'Überhang') issue('overhang-foundation', 'note', 'Der Positionsvergleich startet senkrecht als Grundlage. Er ersetzt weder eine Überhanganalyse noch ein Überhang-Kraftrezept.');
    if (id && !skillCandidates.some(value => value.id === id)) skillCandidates.push({ id, reason: `Gewähltes Lernfeld: ${field}. ${getExercise(id)?.selectionReason ?? ''}` });
    else if (id) skillCandidates.find(value => value.id === id)!.reason += ` Auch dem Lernfeld ${field} zugeordnet; kein separater Wirkungsnachweis.`;
  }
  if (!wall && (learningFields.length || answers.goal !== 'Kraft aufbauen')) issue('wall-required', 'review', 'Boulderziele brauchen eine geeignete Wand und passende Einführung. Ohne ausgewählte Boulderwand werden nur verfügbare allgemeine Kraftoptionen skizziert.');
  if (!skillCandidates.length && wall) skillCandidates.push({ id: novice ? 'quiet-feet' : 'read-boulder', reason: 'Ein grundlegender Lernblock zum gewählten Boulderziel; bei unbekannten Lernfeldern wird kein Defizit diagnostiziert.' });
  const strengthCandidates: { id: string; reason: string }[] = [];
  const addStrength = (id: string, reason: string) => strengthCandidates.push({ id, reason });
  if (bodyweight) addStrength(['6–10', 'Mehr als 10'].includes(answers.pushUps) && familiarStrength ? 'pushup' : 'incline-pushup', `Druckoption anhand bekannter Liegestütz- und Kraftpraxis (${answers.pushUps}; ${answers.strengthExperience}); Auflage und Ausführung vor Ort prüfen.`);
  else if (equipment.has('Kurzhanteln')) addStrength('dumbbell-floor', 'Kurzhanteln vorhanden; Bodenvariante benötigt keine stillschweigend vorausgesetzte Trainingsbank. Lastaufnahme und Ablage einweisen lassen.');
  else if (equipment.has('Widerstandsband')) addStrength('band-press', 'Band vorhanden; zugelassenen Anker zusätzlich vor Ort prüfen.');
  if (equipment.has('Klimmzugstange') && familiarStrength && ['4–8', 'Mehr als 8'].includes(answers.pullUps)) addStrength('pullup', `Freie Zugvariante nur aufgrund bekannter Fähigkeit (${answers.pullUps}) und regelmäßiger Kraftpraxis; keine Zusatzlast oder Maximaltests.`);
  else if (equipment.has('Widerstandsband')) addStrength('band-row', 'Verfügbare horizontale Zugoption statt unbekannte freie Klimmzüge zu erzwingen; Bandanker prüfen.');
  else if (equipment.has('Klimmzugstange')) issue('pullup-prerequisite', 'note', 'Stange vorhanden, freie Zugfähigkeit oder Kraftpraxis unklar: keine automatischen freien Klimmzüge. Eine betreute Assistenz braucht einen eigenen Aufbau.');
  if (bodyweight) {
    addStrength('split-squat', 'Allgemeine Beinkraft mit Körpergewicht; kontrollierter Stand vor Tiefe. Kein garantierter High-Step-Transfer.');
    addStrength('dead-bug', 'Rumpfkontrolle ohne zusätzliche Griffbelastung; kein nachgewiesener direkter Überhangtransfer.');
  }
  if (!familiarStrength && strengthCandidates.length) notes.push('Wenig, gelegentliche oder unbekannte Kraftpraxis: zunächst ein kurzer Kennenlern-Satz. Dies ist eine redaktionelle Einführung, kein validiertes Mindest- oder Optimalvolumen.');
  if (answers.goal === 'Kraft aufbauen' && !strengthCandidates.length) issue('strength-equipment', 'review', 'Für das Kraftziel fehlt eine verfügbare eingeführte Kraftoption. Equipment oder Einweisung klären; Boulderdrills ersetzen kein geprüftes Kraftprogramm.');
  notes.push('Bouldergrad und selbst benannte Stärken sind Orientierung, keine Lastdiagnose. Aus ihnen werden keine Gewichts-, Fingerkraft- oder Versagensvorgaben abgeleitet.');
  notes.push('Nicht belegte Zeit im gewählten Budget bleibt frei; der Entwurf ergänzt keine ungezählten Boulder- oder Zugversuche, um den Termin künstlich zu füllen.');
  if (fixed.length) notes.push('Feste Termine bleiben einschließlich bereits belegter Tage erhalten; deren unbekannte Last muss vor zusätzlichen Einheiten abgestimmt werden.');
  const days = uniqueDays(answers.days ?? []).filter(day => !fixed.includes(day));
  const newDays: number[] = [];
  const cap = Math.max(0, (novice ? 2 : 3) - fixed.length);
  for (const day of days) if (newDays.length < cap && [...fixed, ...newDays].every(other => dayDistance(day, other) > 1)) newDays.push(day);
  if (days.length > newDays.length) issue('days-reduced', 'note', 'Neue Einheiten werden hier konservativ auf getrennte Tage und insgesamt höchstens zwei (neuer Einstieg) bzw. drei Termine begrenzt. Das ist eine redaktionelle Planregel; vorhandene Termine werden nicht gelöscht.');
  if (!newDays.length && !fixed.length) issue('no-available-day', 'review', 'Kein geeigneter verfügbarer Trainingstag für diesen Entwurf.');
  const makeItem = (id: string, reason: string, day: number, index: number): SessionExercise => {
    const item = makeSessionItem(id, index);
    item.id = `preview-${day}-${id}-${index}`;
    item.reason = reason;
    if (getExercise(id)?.area === 'strength') {
      if (!familiarStrength) { item.sets = 1; item.repetitions = '4–6'; }
      if (id === 'pullup' && answers.pullUps === '4–8') item.repetitions = '2–3';
      if (id === 'pushup' && answers.pushUps === '6–10') item.repetitions = '3–4';
    }
    return item;
  };
  const covered = new Set<string>();
  for (const [dayIndex, day] of newDays.entries()) {
    const session: TrainingSession = { id: `preview-${day}`, title: 'Lernen & Aufbau', focus: answers.goal, minutes: null, exercises: [], preparationMinutes: novice ? 10 : 8, cooldownMinutes: 3, budgetMinutes: answers.minutes, rationale: 'Leichte bekannte Bewegung und Aufbau vorbereiten, dann Lernblöcke vor ermüdender Kraftarbeit. Kein Finger-Maximaltraining, kein automatischer Reha- oder Wettkampfplan.' };
    const skills = wall ? [...skillCandidates].sort((a, b) => Number(covered.has(a.id)) - Number(covered.has(b.id))) : [];
    // Both selected learning fields are considered before optional third strength blocks.
    const strengthOrder = dayIndex % 2 ? [...strengthCandidates.slice(1), ...strengthCandidates.slice(0, 1)] : strengthCandidates;
    const candidates = [...skills, ...strengthOrder.slice(0, answers.goal === 'Kraft aufbauen' ? 3 : answers.goal === 'Technik verbessern' ? 1 : 2)];
    for (const candidate of candidates) {
      const item = makeItem(candidate.id, candidate.reason, day, session.exercises.length);
      const next = { ...session, exercises: [...session.exercises, item] };
      const duration = getSessionMinutes(next);
      if (duration !== null && duration <= answers.minutes) {
        session.exercises.push(item);
        if (getExercise(candidate.id)?.area === 'boulder') covered.add(candidate.id);
      } else issue(`budget-${candidate.id}`, 'note', `${getExercise(candidate.id)?.title}: nicht in jedem Termin untergebracht. Das Budget wird einschließlich Pausen geprüft; Umfang nicht durch verkürzte Erholung erzwingen.`);
    }
    if (!session.exercises.length) { issue('empty-session', 'review', 'Im gewählten Budget und Equipment bleibt kein konkreter einführbarer Block. Zeit oder Voraussetzungen klären.'); continue; }
    session.minutes = getSessionMinutes(session);
    session.title = session.exercises.some(item => getExercise(item.exerciseId)?.area === 'boulder') ? 'Boulder lernen & ergänzen' : 'Allgemeine Kraft & Kontrolle';
    sessions.push(session);
    entries.push({ id: `entry-${day}`, day, sessionId: session.id, completed: false, fixed: false });
  }
  for (const skill of skillCandidates) if (wall && !covered.has(skill.id) && newDays.length) issue(`uncovered-${skill.id}`, 'review', `${getExercise(skill.id)?.title}: gewähltes Lernfeld passt noch nicht in diese Woche. Budget oder Tagesauswahl überprüfen.`);
  return result();
}
