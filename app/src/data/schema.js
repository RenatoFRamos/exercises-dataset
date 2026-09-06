// Definição das coleções do app (T09). Cada entrada descreve o object store
// do IndexedDB (fase 2-12) e a tabela equivalente no SQLite (fase 13).
// `keyPath` é o campo usado como chave primária.

export const DB_NAME = 'meupersonal';
export const DB_VERSION = 1;

export const COLLECTIONS = {
  exercises: { keyPath: 'id' },
  settings: { keyPath: 'key' },
  favorites: { keyPath: 'exercise_id' },
  exercise_notes: { keyPath: 'exercise_id' },
  workouts: { keyPath: 'id' },
  workout_days: { keyPath: 'id', indexes: ['workout_id'] },
  workout_exercises: { keyPath: 'id', indexes: ['day_id'] },
  sessions: { keyPath: 'id', indexes: ['workout_id', 'status'] },
  // plan_exercise_id referencia workout_exercises.id — identifica de forma
  // estável QUAL linha do treino gerou a série, mesmo que o mesmo exercício
  // apareça duas vezes no mesmo dia (ex.: exercise_id repetido).
  session_sets: { keyPath: 'id', indexes: ['session_id', 'exercise_id', 'plan_exercise_id'] },
  body_measurements: { keyPath: 'id' }
};

export const COLLECTION_NAMES = Object.keys(COLLECTIONS);
