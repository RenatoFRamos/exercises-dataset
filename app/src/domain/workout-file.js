// Validação e serialização do formato .treino.json (seção 6 do APP_RULES, T27).
// Erros são retornados como {code, params} — quem chama traduz via i18n.
// Este módulo nunca lança exceção para quem chama; sempre retorna um objeto.

export const SCHEMA_VERSION = 1;
export const FILE_TYPE = 'meupersonal.workout';
export const SET_TYPES = ['normal', 'drop_set', 'rest_pause'];

function err(code, params) {
  return { code, params };
}

export function parseAndValidate(rawText, validExerciseIds) {
  let obj;
  try {
    obj = JSON.parse(rawText);
  } catch (e) {
    return { valid: false, errors: [err('error.invalid_json')], data: null };
  }
  return validate(obj, validExerciseIds);
}

export function validate(obj, validExerciseIds) {
  const errors = [];

  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: [err('error.invalid_json')], data: null };
  }
  if (obj.type !== FILE_TYPE) {
    errors.push(err('error.invalid_type'));
  }
  if (typeof obj.schema_version !== 'number' || obj.schema_version > SCHEMA_VERSION) {
    errors.push(err('error.invalid_schema_version'));
  }
  if (!obj.name || typeof obj.name !== 'string' || !obj.name.trim()) {
    errors.push(err('error.missing_name'));
  }
  if (!Array.isArray(obj.days) || obj.days.length === 0) {
    errors.push(err('error.missing_days'));
  } else {
    obj.days.forEach((day, dayIndex) => {
      const exercises = Array.isArray(day.exercises) ? day.exercises : [];
      exercises.forEach((ex, exIndex) => {
        const hasCatalogId = ex.exercise_id != null && ex.exercise_id !== '';
        const hasCustomName = ex.custom_name != null && String(ex.custom_name).trim() !== '';

        if (!hasCatalogId && !hasCustomName) {
          errors.push(err('error.missing_exercise_reference', { day: dayIndex + 1, exercise: exIndex + 1 }));
        } else if (hasCatalogId && validExerciseIds && !validExerciseIds.has(ex.exercise_id)) {
          errors.push(err('error.exercise_not_found', { id: ex.exercise_id }));
        }

        if (ex.set_type && !SET_TYPES.includes(ex.set_type)) {
          errors.push(err('error.invalid_set_type', { type: ex.set_type }));
        }
        const sets = Number(ex.sets) || 0;
        const warmup = Number(ex.warmup_sets) || 0;
        if (warmup > sets) {
          errors.push(err('error.warmup_exceeds_sets', { day: dayIndex + 1, exercise: exIndex + 1 }));
        }
      });
    });
  }

  return { valid: errors.length === 0, errors, data: obj };
}

// Constrói o objeto de arquivo a partir dos registros do banco (usado pela
// exportação, T29/T30). `days` já vem ordenado, cada um com seus `exercises`.
export function buildFileObject(workout, days) {
  return {
    schema_version: SCHEMA_VERSION,
    type: FILE_TYPE,
    name: workout.name,
    description: workout.description || '',
    days: days.map((day) => ({
      label: day.label,
      exercises: (day.exercises || []).map((ex) => ({
        exercise_id: ex.exercise_id ?? null,
        custom_name: ex.custom_name ?? null,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        warmup_sets: ex.warmup_sets || 0,
        set_type: ex.set_type || 'normal',
        superset_group: ex.superset_group ?? null,
        notes: ex.notes || ''
      }))
    }))
  };
}
