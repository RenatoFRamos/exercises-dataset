// Materializa um objeto .treino.json já validado (workout-file.js) em
// registros reais do banco (workouts / workout_days / workout_exercises).
// Usado pela importação manual (T28) e pelos treinos-modelo do onboarding (T50).

import { createWorkout, addDay, addExerciseToDay, getAllExercises } from './../data/repo.js';
import { matchExerciseByName } from './exercise-match.js';

// Quando um exercício vem só com "custom_name" (comum em treinos montados por
// IA, que nem sempre acerta o exercise_id do catálogo), tenta casar o nome
// com um exercício real por similaridade — assim a foto/gif real aparece na
// tela de treino mesmo sem o ID exato. O nome exibido continua o mesmo
// (custom_name tem prioridade na exibição), só o vínculo de mídia muda.
function resolveExerciseId(ex, allExercises) {
  if (ex.exercise_id) return ex.exercise_id;
  if (!ex.custom_name) return null;
  const match = matchExerciseByName(ex.custom_name, allExercises);
  return match ? match.id : null;
}

function resolveSubstituteIds(ex, allExercises) {
  if (!Array.isArray(ex.substitutes)) return [];
  const ids = [];
  for (const name of ex.substitutes) {
    if (typeof name !== 'string' || !name.trim()) continue;
    const match = matchExerciseByName(name, allExercises);
    if (match && !ids.includes(match.id)) ids.push(match.id);
  }
  return ids;
}

export async function importWorkoutFromFile(fileData) {
  const allExercises = await getAllExercises();
  const workout = await createWorkout({ name: fileData.name, description: fileData.description || '' });

  for (let i = 0; i < fileData.days.length; i++) {
    const dayData = fileData.days[i];
    const day = await addDay(workout.id, dayData.label, i);
    for (let j = 0; j < dayData.exercises.length; j++) {
      const ex = dayData.exercises[j];
      const exercise_id = resolveExerciseId(ex, allExercises);
      const substitute_ids = resolveSubstituteIds(ex, allExercises);
      await addExerciseToDay(day.id, { ...ex, exercise_id, substitute_ids, order_index: j });
    }
  }

  return workout;
}
