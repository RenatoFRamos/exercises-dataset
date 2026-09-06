// Materializa um objeto .treino.json já validado (workout-file.js) em
// registros reais do banco (workouts / workout_days / workout_exercises).
// Usado pela importação manual (T28) e pelos treinos-modelo do onboarding (T50).

import { createWorkout, addDay, addExerciseToDay } from './../data/repo.js';

export async function importWorkoutFromFile(fileData) {
  const workout = await createWorkout({ name: fileData.name, description: fileData.description || '' });

  for (let i = 0; i < fileData.days.length; i++) {
    const dayData = fileData.days[i];
    const day = await addDay(workout.id, dayData.label, i);
    for (let j = 0; j < dayData.exercises.length; j++) {
      const ex = dayData.exercises[j];
      await addExerciseToDay(day.id, { ...ex, order_index: j });
    }
  }

  return workout;
}
