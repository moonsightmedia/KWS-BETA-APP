import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrainingPlan } from './planBuilder';
import { DEFAULT_ANSWERS, KWS_AVAILABLE_EQUIPMENT, TRAINING_EXERCISES, getExercise, getSessionMinutes, isKwsExerciseAvailable, makeSessionItem, repetitionUpperBound } from './data';
import type { TrainingAnswers, TrainingSession } from './types';
import { TRAINING_GLYPHS } from '../../components/training/training-glyphs';

const profile = (overrides: Partial<TrainingAnswers> = {}): TrainingAnswers => ({ ...DEFAULT_ANSWERS, ageGroup: 'adult', weaknesses: ['Fußtechnik', 'Körperposition'], ...overrides });
const ids = (answers: TrainingAnswers) => buildTrainingPlan(answers).sessions.flatMap(session => session.exercises.map(item => item.exerciseId));

test('adult draft covers both learning fields, orders skill before strength and stays inside budget', () => {
  const result = buildTrainingPlan(profile({ minutes: 30 }));
  assert.equal(result.plan.status, 'draft');
  assert.ok(result.sessions.length > 0);
  for (const session of result.sessions) {
    assert.ok(session.exercises.some(item => item.exerciseId === 'edge-choice'));
    assert.ok(session.exercises.some(item => item.exerciseId === 'hip-position'));
    assert.equal(session.minutes, getSessionMinutes(session));
    assert.ok(session.minutes! <= session.budgetMinutes!);
    let strengthStarted = false;
    for (const item of session.exercises) {
      assert.ok(item.reason);
      if (getExercise(item.exerciseId)?.area === 'strength') strengthStarted = true;
      else assert.equal(strengthStarted, false);
    }
  }
});

test('all review paths retain fixed appointments and discard every generated prescription', () => {
  const cases: Partial<TrainingAnswers>[] = [
    { ageGroup: undefined }, { ageGroup: 'unknown' }, { ageGroup: 'minor' },
    { constraints: 'Wiedereinstieg nach Pause' }, { constraints: 'Belastung aktuell eingeschränkt' }, { constraints: 'Möchte ich überspringen' },
    { goal: 'Wettkampf vorbereiten', coachGuided: true }, { goal: 'Unbekannt' }, { experience: '' }, { weaknesses: ['Unbekanntes Lernfeld'] }, { minutes: 10 }, { days: [-1] },
    { weaknesses: ['Hooks'] }, { weaknesses: ['Ausdauer'] }, { equipment: ['Körpergewicht'] },
    { goal: 'Kraft aufbauen', equipment: ['Klimmzugstange'], pullUps: '0' },
    { minutes: 20, days: [0], weaknesses: ['Fußtechnik', 'Körperposition'] },
  ];
  for (const overrides of cases) {
    const result = buildTrainingPlan(profile({ fixedDays: [5], ...overrides }));
    assert.equal(result.plan.status, 'needs-review', JSON.stringify(overrides));
    assert.ok(result.sessions.every(session => session.exercises.length === 0), JSON.stringify(overrides));
    assert.deepEqual(result.plan.entries.map(entry => entry.day), [5]);
    assert.ok(result.plan.entries.every(entry => entry.fixed));
    assert.ok(result.issues.some(issue => issue.severity !== 'note'));
  }
});

test('no day and no feasible block are explicit review cases', () => {
  assert.equal(buildTrainingPlan(profile({ days: [] })).plan.status, 'needs-review');
  const empty = buildTrainingPlan(profile({ goal: 'Kraft aufbauen', equipment: ['Klimmzugstange'], pullUps: '0', fixedDays: [] }));
  assert.equal(empty.plan.status, 'needs-review');
  assert.equal(empty.sessions.length, 0);
});

test('confirmed coaching makes hooks eligible, without changing competition blocking', () => {
  assert.ok(ids(profile({ weaknesses: ['Hooks', 'Fußtechnik'], coachGuided: true })).includes('heel-hook'));
  assert.equal(ids(profile({ goal: 'Wettkampf vorbereiten', coachGuided: true })).length, 0);
});

test('fixed days outside availability survive; new days avoid adjacent existing training including week boundary', () => {
  const result = buildTrainingPlan(profile({ fixedDays: [6], days: [0, 2, 4], minutes: 45 }));
  assert.ok(result.plan.entries.some(entry => entry.day === 6 && entry.fixed));
  assert.ok(!result.plan.entries.some(entry => entry.day === 0));
  assert.ok(result.sessions.find(session => session.id === 'preview-6')?.minutes === null);
  assert.equal(result.plan.entries.filter(entry => !entry.fixed).length, 2);
});

test('experience controls introduction scope, without grade-derived loads', () => {
  const novice = buildTrainingPlan(profile({ experience: 'Ich fange gerade an' }));
  assert.ok(novice.sessions.length <= 2);
  assert.ok(novice.sessions.every(session => session.preparationMinutes === 10));
  assert.ok(ids(profile({ experience: 'Ich fange gerade an' })).includes('quiet-feet'));
  const intro = buildTrainingPlan(profile({ strengthExperience: 'Wenig Erfahrung' }));
  const regular = buildTrainingPlan(profile({ strengthExperience: 'Regelmäßig' }));
  assert.ok(intro.sessions.flatMap(session => session.exercises).filter(item => getExercise(item.exerciseId)?.area === 'strength').every(item => item.sets === 1));
  assert.ok(regular.sessions.flatMap(session => session.exercises).filter(item => getExercise(item.exerciseId)?.area === 'strength').every(item => item.sets === 2));
  assert.deepEqual(ids(profile({ grade: '1' })), ids(profile({ grade: '9' })));
});

test('known push ability and regular practice select a different variant; low/unknown does not test to failure', () => {
  assert.ok(ids(profile({ strengthExperience: 'Regelmäßig', pushUps: '6–10' })).includes('pushup'));
  for (const pushUps of ['0', 'Weiß ich nicht', '1–5', 'Erhöhte Variante']) {
    assert.ok(ids(profile({ strengthExperience: 'Regelmäßig', pushUps })).includes('incline-pushup'));
    assert.ok(!ids(profile({ strengthExperience: 'Regelmäßig', pushUps })).includes('pushup'));
  }
  const known = buildTrainingPlan(profile({ strengthExperience: 'Regelmäßig', pushUps: '6–10' }));
  assert.ok(known.sessions.flatMap(session => session.exercises).filter(item => item.exerciseId === 'pushup').every(item => item.repetitions === '3–4'));
});

test('free pullups need known capacity and regular practice, with submaximal editorial counts', () => {
  const base: Partial<TrainingAnswers> = { equipment: ['Boulderwand', 'Körpergewicht', 'Klimmzugstange'], goal: 'Kraft aufbauen' };
  for (const pullUps of ['0', 'Weiß ich nicht', '1–3', 'Mit Unterstützung']) assert.ok(!ids(profile({ ...base, strengthExperience: 'Regelmäßig', pullUps })).includes('pullup'));
  assert.ok(!ids(profile({ ...base, strengthExperience: 'Wenig Erfahrung', pullUps: '4–8' })).includes('pullup'));
  const known = buildTrainingPlan(profile({ ...base, strengthExperience: 'Regelmäßig', pullUps: '4–8' }));
  assert.ok(known.sessions.flatMap(session => session.exercises).some(item => item.exerciseId === 'pullup' && item.repetitions === '2–3'));
});

test('strict equipment selection does not invent a bench or dumbbells and uses available alternatives', () => {
  const dumbbells = ids(profile({ goal: 'Kraft aufbauen', equipment: ['Kurzhanteln', 'Boulderwand'] }));
  assert.ok(dumbbells.includes('dumbbell-floor'));
  assert.ok(!dumbbells.includes('dumbbell-bench'));
  assert.ok(!dumbbells.includes('split-squat'));
  const bands = ids(profile({ goal: 'Kraft aufbauen', equipment: ['Widerstandsband', 'Boulderwand'] }));
  assert.ok(bands.includes('band-row'));
  assert.ok(bands.includes('band-press'));
  const bodyOnly = ids(profile({ goal: 'Kraft aufbauen', equipment: ['Ohne Gerät'], weaknesses: [] }));
  assert.ok(bodyOnly.length);
  assert.ok(bodyOnly.every(id => ['incline-pushup', 'split-squat', 'dead-bug', 'glute-bridge', 'calf-raise'].includes(id)));
});

test('goal changes selected strength volume; input is unchanged and output deterministic', () => {
  const input = profile();
  const snapshot = structuredClone(input);
  assert.deepEqual(buildTrainingPlan(input), buildTrainingPlan(input));
  assert.deepEqual(input, snapshot);
  const count = (goal: string) => buildTrainingPlan(profile({ goal })).sessions[0].exercises.filter(item => getExercise(item.exerciseId)?.area === 'strength').length;
  assert.ok(count('Kraft aufbauen') > count('Technik verbessern'));
});

test('all active cards have coherent defaults; rehab has useful orientation and stays unplannable', () => {
  assert.equal(TRAINING_EXERCISES.filter(exercise => exercise.defaultDose).length, 58);
  for (const exercise of TRAINING_EXERCISES) {
    assert.ok(exercise.steps.length >= 3);
    assert.ok(exercise.cues?.length);
    assert.ok(exercise.mistakes?.length);
    assert.ok(exercise.sources.length);
    if (exercise.area === 'rehab' || exercise.area === 'kids' || exercise.contentKind === 'orientation') {
      assert.equal(exercise.planEligible, false);
      assert.throws(() => makeSessionItem(exercise.id));
    } else {
      const item = makeSessionItem(exercise.id);
      assert.equal(item.sets, exercise.defaultDose?.sets);
      assert.equal(item.repetitions, exercise.defaultDose?.repetitions);
      assert.equal(item.restSeconds, exercise.defaultDose?.restSeconds);
    }
  }
});

test('authored icons remain distinct where used; kids guides cannot become adult prescriptions', () => {
  assert.equal(TRAINING_EXERCISES.length, 75);
  const motifs = Object.values(TRAINING_GLYPHS).map(glyph => JSON.stringify(glyph));
  assert.equal(new Set(motifs).size, motifs.length);
  const children = TRAINING_EXERCISES.filter(exercise => exercise.area === 'kids');
  assert.equal(children.length, 12);
  const nursery = children.filter(child => child.kidsGuide?.audience === 'both');
  assert.equal(nursery.length, 6);
  assert.ok(nursery.every(child => child.kidsGuide?.preschoolVariant));
  for (const child of children) {
    assert.equal(child.format, 'game'); assert.equal(child.planEligible, false); assert.equal(child.defaultDose, undefined);
    assert.ok(child.kidsGuide?.ages && child.kidsGuide.duration && child.kidsGuide.players && child.kidsGuide.supervision);
    assert.equal(child.steps.length, 4); assert.ok(child.setupRequirements?.length);
    assert.ok(child.sources.some(source => source.label.includes('DAV')));
    assert.throws(() => makeSessionItem(child.id));
  }
  const generated = ids(profile());
  assert.ok(children.every(child => !generated.includes(child.id)));
});

test('boulder games remain manually selectable learning tasks with real topics and bounded rules', () => {
  const boulder = TRAINING_EXERCISES.filter(exercise => exercise.area === 'boulder');
  assert.equal(boulder.length, 33);
  const games = boulder.filter(exercise => exercise.format === 'game');
  assert.equal(games.length, 10);
  assert.ok(games.some(exercise => exercise.topic === 'Fußtechnik'));
  assert.ok(games.some(exercise => exercise.topic === 'Boulder lesen'));
  for (const exercise of boulder.filter(item => item.format)) {
    assert.equal(exercise.planEligible, false);
    assert.ok(exercise.illustrationId && getExercise(exercise.illustrationId));
    assert.equal(exercise.defaultDose?.repetitions, '2');
    assert.equal(exercise.defaultDose?.restScope, 'repetitions');
    assert.ok(exercise.sources.every(source => source.context.includes('kein') || source.context.includes('nicht')));
    assert.ok(makeSessionItem(exercise.id));
  }
  assert.equal(getExercise('game-mini-addon')?.alternativeEquipment, undefined);
  const generated = ids(profile());
  assert.ok(games.every(exercise => !generated.includes(exercise.id)));
});

test('KWS inventory uses actual equipment and never infers dumbbells from the bank', () => {
  assert.deepEqual(DEFAULT_ANSWERS.equipment, KWS_AVAILABLE_EQUIPMENT);
  assert.ok(!KWS_AVAILABLE_EQUIPMENT.includes('Kurzhanteln'));
  assert.ok(!KWS_AVAILABLE_EQUIPMENT.includes('Widerstandsband'));
  assert.ok(isKwsExerciseAvailable(getExercise('kettlebell-row')!));
  assert.ok(!isKwsExerciseAvailable(getExercise('dumbbell-bench')!));
  assert.ok(!isKwsExerciseAvailable(getExercise('band-row')!));
  assert.ok(TRAINING_EXERCISES.every(exercise => exercise.kwsAvailable === isKwsExerciseAvailable(exercise)));
  const result = buildTrainingPlan(profile({ goal: 'Kraft aufbauen', strengthExperience: 'Regelmäßig' }));
  assert.equal(result.plan.status, 'draft');
  for (const id of result.sessions.flatMap(session => session.exercises.map(item => item.exerciseId))) assert.ok(isKwsExerciseAvailable(getExercise(id)!));
});

test('kettlebell alternatives appear in a familiar strength week, with bank requirements and realistic time', () => {
  const result = buildTrainingPlan(profile({ goal: 'Kraft aufbauen', strengthExperience: 'Regelmäßig', minutes: 60 }));
  const selected = result.sessions.flatMap(session => session.exercises.map(item => item.exerciseId));
  for (const id of ['kettlebell-row', 'kettlebell-goblet-squat', 'kettlebell-floor-press', 'kettlebell-deadlift', 'ez-curl']) assert.ok(selected.includes(id), id);
  assert.ok(result.sessions.every(session => session.minutes !== null && session.minutes <= 60));
  const noBank = ids(profile({ goal: 'Kraft aufbauen', strengthExperience: 'Regelmäßig', equipment: ['Kettlebell', 'Boulderwand'] }));
  assert.ok(noBank.includes('kettlebell-floor-press'));
  assert.ok(noBank.includes('kettlebell-goblet-squat'));
  assert.ok(!noBank.includes('kettlebell-row'));
  assert.ok(!ids(profile({ goal: 'Kraft aufbauen', strengthExperience: 'Regelmäßig', equipment: ['Kurzhanteln', 'Boulderwand'] })).includes('dumbbell-bench'));
  assert.ok(ids(profile({ goal: 'Kraft aufbauen', strengthExperience: 'Regelmäßig', equipment: ['Kurzhanteln', 'Trainingsbank', 'Boulderwand'] })).includes('dumbbell-bench'));
});

test('bodyweight introduction and fingerboard orientation do not become loaded prescriptions', () => {
  const newcomer = profile({ experience: 'Ich fange gerade an', goal: 'Kraft aufbauen' });
  const selected = ids(newcomer);
  assert.ok(selected.includes('bodyweight-squat'));
  assert.ok(!selected.some(id => id.startsWith('kettlebell-') || id === 'ez-curl' || id === 'fingerboard-feet-supported'));
  const orientation = getExercise('fingerboard-feet-supported')!;
  assert.equal(orientation.contentKind, 'orientation');
  assert.equal(orientation.defaultDose, undefined);
  assert.equal(orientation.planEligible, false);
  assert.equal(orientation.requiresCoach, true);
  assert.throws(() => makeSessionItem(orientation.id));
  assert.ok(!ids(profile({ strengthExperience: 'Regelmäßig', coachGuided: true })).includes(orientation.id));
});

test('Spraywall can supply suitable learning passages without inventing a separate endurance recipe', () => {
  const result = buildTrainingPlan(profile({ equipment: ['Körpergewicht', 'Spraywall'] }));
  assert.equal(result.plan.status, 'draft');
  assert.ok(result.sessions.some(session => session.exercises.some(item => item.exerciseId === 'edge-choice')));
  assert.ok(result.plan.notes?.some(note => note.includes('Spraywall')));
  assert.ok(getExercise('edge-choice')?.alternativeEquipment?.includes('Spraywall'));
  assert.ok(!getExercise('smearing')?.alternativeEquipment?.includes('Spraywall'));
  const unsupported = buildTrainingPlan(profile({ equipment: ['Körpergewicht', 'Spraywall'], weaknesses: ['Platte'], fixedDays: [5] }));
  assert.equal(unsupported.plan.status, 'needs-review');
  assert.ok(unsupported.issues.some(issue => issue.code === 'spraywall-specific-setup'));
  assert.ok(unsupported.sessions.every(session => !session.exercises.length));
});

test('short side-plank holds preserve their unit and count per-side pauses', () => {
  const exercise = getExercise('side-plank')!;
  assert.ok(exercise.dose.includes('Haltephasen'));
  assert.equal(exercise.defaultDose?.repetitionUnit, 'Haltephasen');
  assert.ok(exercise.rest.includes('zwischen Haltephasen'));
  assert.ok(!exercise.rest.includes('zwischen Versuchen'));
  assert.ok(exercise.dose.includes('10 Sekunden'));
  const item = makeSessionItem(exercise.id);
  assert.equal(item.sets, 1);
  assert.equal(item.repetitions, '2');
  assert.equal(getSessionMinutes({ id: 'test', title: '', focus: '', minutes: 0, exercises: [item] }), 6);
});

test('time estimate responds to repetitions and rest, counts sides, and leaves freeform unknown', () => {
  assert.equal(getSessionMinutes({ id: 'fixed', title: 'Bestehender Termin', focus: '', minutes: null, exercises: [] }), null);
  assert.equal(getSessionMinutes({ id: 'empty', title: 'Neue Einheit', focus: '', minutes: 0, exercises: [] }), null);
  const session = (id: string): TrainingSession => ({ id, title: '', focus: '', minutes: 0, preparationMinutes: 8, cooldownMinutes: 3, exercises: [makeSessionItem(id)] });
  const strength = session('pushup');
  assert.equal(getSessionMinutes(strength), 17);
  strength.exercises[0].restSeconds = 300;
  assert.equal(getSessionMinutes(strength), 20);
  assert.equal(getSessionMinutes(session('split-squat')), 18);
  const technique = session('quiet-feet');
  assert.equal(getSessionMinutes(technique), 17);
  technique.exercises[0].repetitions = '4';
  assert.equal(getSessionMinutes(technique), 23);
  technique.exercises[0].repetitions = '4 je Seite';
  assert.equal(getSessionMinutes(technique), null);
  assert.equal(getSessionMinutes({ ...session('pushup'), preparationMinutes: -2, cooldownMinutes: 5 }), null);
  for (const value of ['', '0', '-3', '10–2', '101', '1 minute']) assert.equal(repetitionUpperBound(value), null);
  assert.equal(repetitionUpperBound('4–6'), 6);
});


test('optional mobility cards have manual doses, correct side timing and never enter the automatic week', () => {
  const mobility = TRAINING_EXERCISES.filter(exercise => exercise.area === 'mobility');
  assert.equal(mobility.length, 6);
  assert.equal(mobility.filter(exercise => exercise.mobilityKind === 'stretch').length, 4);
  assert.equal(mobility.filter(exercise => exercise.mobilityKind === 'movement').length, 2);
  for (const exercise of mobility) {
    assert.equal(exercise.planEligible, false);
    assert.equal(exercise.defaultDose?.sideMultiplier, 2);
    const item = makeSessionItem(exercise.id);
    const session: TrainingSession = { id: 'mobility-test', title: 'Mobilität', focus: 'Selbst gewählt', minutes: null, exercises: [item] };
    assert.equal(getSessionMinutes(session), exercise.mobilityKind === 'stretch' ? 3 : 2);
    assert.equal(item.restSeconds, exercise.mobilityKind === 'stretch' ? 20 : 0);
  }
  for (const minutes of [30, 60, 90]) {
    const planned = ids(profile({ minutes }));
    assert.ok(planned.every(id => getExercise(id)?.area !== 'mobility'));
  }
});
