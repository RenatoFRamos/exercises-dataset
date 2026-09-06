import { tMuscle, tExerciseName } from '../i18n/index.js';

// Retorna o HTML de um card de exercício. Eventos de clique (abrir detalhe,
// favoritar) são tratados por delegação no container pai — este componente
// só sabe desenhar, não conhece navegação.
export function exerciseCardHtml(exercise, { isFavorite = false } = {}) {
  const name = tExerciseName(exercise);
  return `
    <div class="exercise-card favorite-star" data-open-exercise="${exercise.id}" role="button" tabindex="0">
      <button class="favorite-btn" data-toggle-favorite="${exercise.id}" aria-label="favorito">
        ${isFavorite ? '★' : '☆'}
      </button>
      <img class="exercise-card-thumb" src="${exercise.image}" alt="${name}" loading="lazy" />
      <div class="exercise-card-body">
        <div class="exercise-card-name">${name}</div>
        <div class="exercise-card-muscle">${tMuscle(exercise.target)}</div>
      </div>
    </div>
  `;
}
