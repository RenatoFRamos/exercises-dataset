// Alternativas de exercício (T43) — consulta 100% local sobre o dataset já
// carregado em memória, sem tocar no banco.

export function findAlternatives(exercise, allExercises, { equipmentFilter = null, limit = 20 } = {}) {
  if (!exercise) return [];

  const sameTarget = [];
  const sameMuscleGroup = [];

  for (const candidate of allExercises) {
    if (candidate.id === exercise.id) continue;
    if (equipmentFilter && equipmentFilter.length && !equipmentFilter.includes(candidate.equipment)) continue;

    if (candidate.target === exercise.target) {
      sameTarget.push(candidate);
    } else if (candidate.muscle_group === exercise.muscle_group) {
      sameMuscleGroup.push(candidate);
    }
  }

  return [...sameTarget, ...sameMuscleGroup].slice(0, limit);
}
