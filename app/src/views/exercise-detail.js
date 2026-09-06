import { t, tBodyPart, tEquipment, tMuscle, tExerciseName } from '../i18n/index.js';
import { getState } from '../state.js';
import {
  getExerciseById, getAllExercises, getFavoriteIds, toggleFavorite,
  getExerciseNote, setExerciseNote, getHistoryForExercise
} from '../data/repo.js';
import { findAlternatives } from '../domain/alternatives.js';
import { toDisplay, unitLabel } from '../domain/units.js';
import { openImageZoom } from '../components/image-zoom.js';
import { navigate } from '../router.js';

export async function renderExerciseDetail(container, params) {
  const exercise = await getExerciseById(params.id);
  if (!exercise) {
    container.innerHTML = `<div class="empty-state">${t('error.exercise_not_found', { id: params.id })}</div>`;
    return;
  }

  const settings = getState().settings;
  const favorites = await getFavoriteIds();
  const isFav = favorites.has(exercise.id);
  const note = await getExerciseNote(exercise.id);
  const exerciseHistory = await getHistoryForExercise({ exerciseId: exercise.id });
  const allExercises = await getAllExercises();
  const alternatives = findAlternatives(exercise, allExercises);

  // Regra 3.1 do APP_RULES: o dataset não tem português — sempre inglês
  // como conteúdo, com aviso quando a UI está em PT (T49).
  const instructionSteps = exercise.instruction_steps?.en || [];
  const showPtFallbackNotice = settings.language === 'pt';
  const exerciseName = tExerciseName(exercise);

  container.innerHTML = `
    <div class="view">
      <header class="view-header">
        <button class="btn-icon" id="back-btn">←</button>
        <h1 class="text-lg" style="flex:1;">${exerciseName}</h1>
        <button class="btn-icon" id="fav-btn">${isFav ? '★' : '☆'}</button>
      </header>
      <div class="view-content">
        <div class="favorite-star mb-3" style="cursor: zoom-in;" id="media-wrap">
          <img src="${exercise.gif_url}" alt="${exerciseName}" style="width:100%; border-radius: var(--radius-md); background: var(--bg-elevated);" />
        </div>
        <p class="text-tertiary text-xs mb-4" style="text-align:center;">${t('exercise.tap_to_zoom')} · ${t('exercise.attribution')}</p>

        <div class="flex gap-2 mb-4" style="flex-wrap: wrap;">
          <span class="badge">${tBodyPart(exercise.body_part)}</span>
          <span class="badge">${tEquipment(exercise.equipment)}</span>
          <span class="badge badge-accent">${tMuscle(exercise.target)}</span>
        </div>

        <div class="card mb-4">
          <div class="font-bold mb-2">${t('exercise.secondary_muscles')}</div>
          <div class="text-secondary">${(exercise.secondary_muscles || []).map(tMuscle).join(', ') || '—'}</div>
        </div>

        <div class="card mb-4">
          <div class="font-bold mb-2">${t('exercise.instructions')}</div>
          ${showPtFallbackNotice ? `<p class="text-tertiary text-sm mb-2">⚠️ ${t('exercise.instructions_missing_pt')}</p>` : ''}
          <ol style="padding-left: 1.25rem; list-style: decimal; display: flex; flex-direction: column; gap: 0.5rem;">
            ${instructionSteps.map((step) => `<li>${step}</li>`).join('')}
          </ol>
        </div>

        <div class="card mb-4">
          <div class="font-bold mb-2">${t('exercise.my_notes')}</div>
          <textarea class="textarea" id="note-input" placeholder="${t('exercise.notes_placeholder')}">${note}</textarea>
        </div>

        <div class="card mb-4">
          <div class="font-bold mb-2">${t('exercise.history_tab')}</div>
          <div id="history-list">
            ${exerciseHistory.length ? exerciseHistory.slice(-10).reverse().map((s) => `
              <div class="flex justify-between text-sm" style="padding: var(--space-1) 0; border-bottom: 1px solid var(--border);">
                <span class="text-secondary">${new Date(s.completed_at).toLocaleDateString()}</span>
                <span>${s.reps} × ${toDisplay(s.weight_kg, settings.unit)}${unitLabel(settings.unit)}${s.is_warmup ? ` (${t('session.warmup')})` : ''}</span>
              </div>
            `).join('') : `<p class="text-secondary text-sm">${t('exercise.history_empty')}</p>`}
          </div>
        </div>

        <div class="card mb-4">
          <div class="font-bold mb-2">${t('exercise.alternatives')}</div>
          <div class="exercise-grid" id="alternatives-grid">
            ${alternatives.length ? alternatives.slice(0, 6).map((alt) => `
              <button class="exercise-card" data-open-alt="${alt.id}">
                <img class="exercise-card-thumb" src="${alt.image}" alt="${tExerciseName(alt)}" loading="lazy" />
                <div class="exercise-card-body">
                  <div class="exercise-card-name">${tExerciseName(alt)}</div>
                  <div class="exercise-card-muscle">${tEquipment(alt.equipment)}</div>
                </div>
              </button>
            `).join('') : `<p class="text-secondary text-sm">${t('exercise.alternatives_empty')}</p>`}
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#back-btn').addEventListener('click', () => window.history.back());
  container.querySelector('#media-wrap').addEventListener('click', () => openImageZoom(exercise.gif_url, exerciseName));

  container.querySelector('#fav-btn').addEventListener('click', async (e) => {
    const nowFav = await toggleFavorite(exercise.id);
    e.target.textContent = nowFav ? '★' : '☆';
  });

  let noteSaveTimeout = null;
  container.querySelector('#note-input').addEventListener('input', (e) => {
    clearTimeout(noteSaveTimeout);
    noteSaveTimeout = setTimeout(() => setExerciseNote(exercise.id, e.target.value), 500);
  });

  container.querySelector('#alternatives-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-alt]');
    if (btn) navigate(`/exercise/${btn.dataset.openAlt}`);
  });
}
