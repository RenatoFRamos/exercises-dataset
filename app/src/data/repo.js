// Consultas compostas sobre db.js (ex.: "treino com seus dias e exercícios").
// Views chamam este módulo ou settings.js — nunca db.js diretamente, e nunca
// IndexedDB diretamente. Mantém a regra 8 do plano de execução.

import * as db from './db.js';
import { matchKey } from '../domain/metrics.js';

// ===================== Exercícios (dataset) =====================

let exerciseCache = null;
let exerciseByIdCache = null;

export async function getAllExercises() {
  if (!exerciseCache) {
    exerciseCache = await db.getAll('exercises');
    exerciseByIdCache = new Map(exerciseCache.map((e) => [e.id, e]));
  }
  return exerciseCache;
}

export async function getExerciseById(id) {
  await getAllExercises();
  return exerciseByIdCache.get(id) || null;
}

export async function getExerciseByIdMap() {
  await getAllExercises();
  return exerciseByIdCache;
}

// ===================== Favoritos =====================

export async function getFavoriteIds() {
  const rows = await db.getAll('favorites');
  return new Set(rows.map((r) => r.exercise_id));
}

export async function toggleFavorite(exerciseId) {
  const existing = await db.get('favorites', exerciseId);
  if (existing) {
    await db.remove('favorites', exerciseId);
    return false;
  }
  await db.put('favorites', { exercise_id: exerciseId });
  return true;
}

// ===================== Notas fixas por exercício =====================

export async function getExerciseNote(exerciseId) {
  const row = await db.get('exercise_notes', exerciseId);
  return row ? row.note : '';
}

export async function setExerciseNote(exerciseId, note) {
  if (!note) {
    await db.remove('exercise_notes', exerciseId);
    return;
  }
  await db.put('exercise_notes', { exercise_id: exerciseId, note });
}

// ===================== Treinos =====================

export async function listWorkouts({ includeArchived = false } = {}) {
  const all = await db.getAll('workouts');
  const filtered = includeArchived ? all : all.filter((w) => !w.archived);
  return filtered.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
}

export async function getFullWorkout(workoutId) {
  const workout = await db.get('workouts', workoutId);
  if (!workout) return null;
  const days = (await db.query('workout_days', { workout_id: workoutId })).sort((a, b) => a.order_index - b.order_index);
  for (const day of days) {
    day.exercises = (await db.query('workout_exercises', { day_id: day.id })).sort((a, b) => a.order_index - b.order_index);
  }
  return { workout, days };
}

export async function createWorkout({ name, description = '' }) {
  const now = new Date().toISOString();
  const workout = { id: db.newId(), name, description, created_at: now, updated_at: now, archived: false };
  await db.put('workouts', workout);
  return workout;
}

export async function updateWorkoutMeta(workoutId, patch) {
  const workout = await db.get('workouts', workoutId);
  if (!workout) return null;
  const updated = { ...workout, ...patch, updated_at: new Date().toISOString() };
  await db.put('workouts', updated);
  return updated;
}

export async function deleteWorkout(workoutId) {
  const days = await db.query('workout_days', { workout_id: workoutId });
  for (const day of days) {
    const exercises = await db.query('workout_exercises', { day_id: day.id });
    for (const ex of exercises) await db.remove('workout_exercises', ex.id);
    await db.remove('workout_days', day.id);
  }
  await db.remove('workouts', workoutId);
}

export async function duplicateWorkout(workoutId) {
  const full = await getFullWorkout(workoutId);
  if (!full) return null;
  const newWorkout = await createWorkout({ name: `${full.workout.name} (cópia)`, description: full.workout.description });
  for (const day of full.days) {
    const newDay = await addDay(newWorkout.id, day.label, day.order_index);
    for (const ex of day.exercises) {
      await addExerciseToDay(newDay.id, { ...ex, id: undefined, day_id: undefined });
    }
  }
  return newWorkout;
}

// ---- Dias ----

export async function addDay(workoutId, label, orderIndex) {
  const days = await db.query('workout_days', { workout_id: workoutId });
  const day = {
    id: db.newId(),
    workout_id: workoutId,
    label,
    order_index: orderIndex ?? days.length
  };
  await db.put('workout_days', day);
  await touchWorkout(workoutId);
  return day;
}

export async function updateDay(dayId, patch) {
  const day = await db.get('workout_days', dayId);
  if (!day) return null;
  const updated = { ...day, ...patch };
  await db.put('workout_days', updated);
  await touchWorkout(day.workout_id);
  return updated;
}

export async function removeDay(dayId) {
  const day = await db.get('workout_days', dayId);
  if (!day) return;
  const exercises = await db.query('workout_exercises', { day_id: dayId });
  for (const ex of exercises) await db.remove('workout_exercises', ex.id);
  await db.remove('workout_days', dayId);
  await touchWorkout(day.workout_id);
}

export async function reorderDays(workoutId, orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    await updateDay(orderedIds[i], { order_index: i });
  }
}

// ---- Exercícios do treino ----

export async function addExerciseToDay(dayId, data) {
  const existing = await db.query('workout_exercises', { day_id: dayId });
  const record = {
    id: db.newId(),
    day_id: dayId,
    exercise_id: data.exercise_id ?? null,
    custom_name: data.custom_name ?? null,
    order_index: data.order_index ?? existing.length,
    sets: data.sets ?? 3,
    reps: data.reps ?? '10',
    rest_seconds: data.rest_seconds ?? 90,
    warmup_sets: data.warmup_sets ?? 0,
    set_type: data.set_type ?? 'normal',
    superset_group: data.superset_group ?? null,
    notes: data.notes ?? ''
  };
  await db.put('workout_exercises', record);
  const day = await db.get('workout_days', dayId);
  if (day) await touchWorkout(day.workout_id);
  return record;
}

export async function updateWorkoutExercise(id, patch) {
  const record = await db.get('workout_exercises', id);
  if (!record) return null;
  const updated = { ...record, ...patch };
  await db.put('workout_exercises', updated);
  return updated;
}

export async function removeWorkoutExercise(id) {
  await db.remove('workout_exercises', id);
}

export async function reorderExercises(dayId, orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    await updateWorkoutExercise(orderedIds[i], { order_index: i });
  }
}

async function touchWorkout(workoutId) {
  const workout = await db.get('workouts', workoutId);
  if (workout) await db.put('workouts', { ...workout, updated_at: new Date().toISOString() });
}

// ===================== Sessões =====================

export async function getInProgressSession() {
  const rows = await db.query('sessions', { status: 'in_progress' });
  return rows[0] || null;
}

export async function createSession({ workoutId, dayId, name }) {
  const session = {
    id: db.newId(),
    workout_id: workoutId,
    day_id: dayId,
    name,
    started_at: new Date().toISOString(),
    finished_at: null,
    duration_seconds: 0,
    notes: '',
    status: 'in_progress'
  };
  await db.put('sessions', session);
  return session;
}

export async function getSession(id) {
  return db.get('sessions', id);
}

export async function updateSession(id, patch) {
  const session = await db.get('sessions', id);
  if (!session) return null;
  const updated = { ...session, ...patch };
  await db.put('sessions', updated);
  return updated;
}

export async function listCompletedSessions() {
  const rows = await db.query('sessions', { status: 'completed' });
  return rows.sort((a, b) => (b.finished_at || '').localeCompare(a.finished_at || ''));
}

// ===================== Séries executadas =====================

export async function addSessionSet(set) {
  const record = { id: db.newId(), completed_at: new Date().toISOString(), ...set };
  await db.put('session_sets', record);
  return record;
}

export async function updateSessionSet(id, patch) {
  const record = await db.get('session_sets', id);
  if (!record) return null;
  const updated = { ...record, ...patch };
  await db.put('session_sets', updated);
  return updated;
}

export async function removeSessionSet(id) {
  await db.remove('session_sets', id);
}

export async function getSetsForSession(sessionId) {
  return db.query('session_sets', { session_id: sessionId });
}

// Todas as séries já registradas (em sessões concluídas) para o MESMO
// exercício, casando por exercise_id ou por custom_name (T32) — usado para
// a referência da última sessão, histórico do exercício e detecção de PR.
export async function getHistoryForExercise({ exerciseId, customName }, { excludeSessionId } = {}) {
  const targetKey = exerciseId ? `id:${exerciseId}` : `name:${(customName || '').trim().toLowerCase()}`;
  const all = await db.getAll('session_sets');
  return all
    .filter((s) => matchKey(s) === targetKey)
    .filter((s) => s.session_id !== excludeSessionId)
    .sort((a, b) => (a.completed_at || '').localeCompare(b.completed_at || ''));
}

export async function getAllSessionSets() {
  return db.getAll('session_sets');
}

// ===================== Medidas corporais =====================

export async function listMeasurements() {
  const rows = await db.getAll('body_measurements');
  return rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

export async function addMeasurement(data) {
  const record = { id: db.newId(), ...data };
  await db.put('body_measurements', record);
  return record;
}

// ===================== Backup completo (T30) =====================

export const BACKUP_COLLECTIONS = [
  'favorites', 'exercise_notes', 'workouts', 'workout_days',
  'workout_exercises', 'sessions', 'session_sets', 'body_measurements', 'settings'
];

export async function exportAllData() {
  const data = {};
  for (const collection of BACKUP_COLLECTIONS) {
    data[collection] = await db.getAll(collection);
  }
  return { schema_version: 1, type: 'meupersonal.backup', exported_at: new Date().toISOString(), data };
}

export async function restoreAllData(backup) {
  if (!backup || backup.type !== 'meupersonal.backup' || !backup.data) {
    throw new Error('invalid_backup');
  }
  for (const collection of BACKUP_COLLECTIONS) {
    await db.clear(collection);
    const records = backup.data[collection] || [];
    if (records.length) await db.putMany(collection, records);
  }
}
