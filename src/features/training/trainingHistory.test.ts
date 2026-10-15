import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_SESSION, makeSessionItem } from './data';
import { completionOrigin, MAX_TRAINING_HISTORY, recordTrainingCompletion, repeatTrainingCompletion } from './trainingHistory';
import { emptyTraining, readTraining, trainingStorageKey, writeTraining } from './storage';
import type { TrainingSession, TrainingWeekPlan } from './types';

const session: TrainingSession = { ...EMPTY_SESSION, id: 'session-one', title: 'Füße und Kraft', exercises: [makeSessionItem('quiet-feet')], budgetMinutes: 30 };

test('completion snapshots survive later edits, deduplicate the same appointment and allow a new week', () => {
  const original = structuredClone(session);
  const first = recordTrainingCompletion([], original, 'week-one:entry', new Date('2026-10-13T09:00:00Z'));
  original.title = 'Später verändert'; original.exercises[0].sets = 4;
  assert.equal(first[0].session.title, session.title);
  assert.equal(first[0].session.exercises[0].sets, session.exercises[0].sets);
  assert.strictEqual(recordTrainingCompletion(first, session, 'week-one:entry'), first);
  const next = recordTrainingCompletion(first, session, 'week-two:entry');
  assert.equal(next.length, 2);
  assert.deepEqual(recordTrainingCompletion(next, { ...session, exercises: [] }), next);
});

test('double taps do not count as two completed units; repeats are independent editable copies', () => {
  const now = new Date('2026-10-13T09:00:00Z');
  const history = recordTrainingCompletion([], session, undefined, now);
  assert.strictEqual(recordTrainingCompletion(history, session, undefined, new Date(now.getTime() + 500)), history);
  assert.equal(recordTrainingCompletion(history, session, undefined, new Date(now.getTime() + 20000)).length, 2);
  const repeated = repeatTrainingCompletion(history[0]);
  assert.notEqual(repeated.id, session.id);
  assert.notEqual(repeated.exercises[0].id, session.exercises[0].id);
  assert.equal(repeated.exercises[0].exerciseId, session.exercises[0].exerciseId);
  assert.equal(repeated.budgetMinutes, undefined);
  repeated.exercises[0].sets = 5;
  assert.equal(history[0].session.exercises[0].sets, session.exercises[0].sets);
});

test('recent history stays bounded and appointment origins are stable across moving days', () => {
  let history = recordTrainingCompletion([], session, 'week:zero');
  for (let index = 1; index < 40; index++) history = recordTrainingCompletion(history, session, `week:${index}`);
  assert.equal(history.length, MAX_TRAINING_HISTORY);
  assert.equal(history[0].originKey, 'week:39');
  const plan: TrainingWeekPlan = { id: 'week-one', summary: 'Woche', entries: [] };
  assert.equal(completionOrigin(plan, 'entry'), 'week-one:entry');
  assert.equal(completionOrigin({ summary: 'Alte Woche', entries: [] }, 'entry'), 'legacy:entry');
});

test('v2 storage keeps older plans, validates history independently and isolates accounts', () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value) } });
  const saved = { ...emptyTraining(), sessions: [session], history: recordTrainingCompletion([], session, 'old-week:entry') };
  assert.ok(writeTraining('one', saved));
  assert.equal(readTraining('one').history[0].session.title, session.title);
  assert.equal(readTraining('two').history.length, 0);
  // Histories are snapshots, so regenerating a week need not preserve the source session.
  writeTraining('one', { ...saved, sessions: [] });
  assert.equal(readTraining('one').history.length, 1);
  const old = { ...saved, version: 2, history: undefined };
  memory.set(trainingStorageKey('one'), JSON.stringify(old));
  assert.equal(readTraining('one').sessions.length, 1);
  assert.equal(readTraining('one').history.length, 0);
  memory.set(trainingStorageKey('one'), JSON.stringify({ ...old, history: [{ id: 'bad', completedAt: 'invalid', session }] }));
  assert.equal(readTraining('one').sessions.length, 1);
  assert.equal(readTraining('one').history.length, 0);
  const previousRaw = memory.get(trainingStorageKey('one'));
  assert.equal(writeTraining('one', { ...saved, sessions: Array.from({ length: 101 }, (_, index) => ({ ...session, id: `session-${index}` })) }), false);
  assert.equal(memory.get(trainingStorageKey('one')), previousRaw);
});
