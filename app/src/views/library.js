import { t, tBodyPart, tEquipment, tMuscle, exerciseMatchesSearch } from '../i18n/index.js';
import { getAllExercises, getFavoriteIds, toggleFavorite } from '../data/repo.js';
import { exerciseCardHtml } from '../components/exercise-card.js';
import { navigate } from '../router.js';

const BATCH_SIZE = 60;

const localState = {
  search: '',
  bodyPart: '',
  equipment: '',
  target: '',
  favoritesOnly: false,
  visibleCount: BATCH_SIZE
};

function matches(exercise, favorites) {
  if (localState.favoritesOnly && !favorites.has(exercise.id)) return false;
  if (localState.bodyPart && exercise.body_part !== localState.bodyPart) return false;
  if (localState.equipment && exercise.equipment !== localState.equipment) return false;
  if (localState.target && exercise.target !== localState.target) return false;
  if (localState.search && !exerciseMatchesSearch(exercise, localState.search)) return false;
  return true;
}

export async function renderLibrary(container) {
  const [allExercises, favorites] = await Promise.all([getAllExercises(), getFavoriteIds()]);

  const bodyParts = [...new Set(allExercises.map((e) => e.body_part))].sort();
  const equipments = [...new Set(allExercises.map((e) => e.equipment))].sort();
  const targets = [...new Set(allExercises.map((e) => e.target))].sort();

  container.innerHTML = `
    <div class="view">
      <header class="view-header"><h1>${t('library.title')}</h1></header>
      <div class="view-content" style="padding-bottom: 0;">
        <div class="search-bar">
          <span>🔎</span>
          <input type="text" id="search" placeholder="${t('library.search_placeholder')}" value="${localState.search}" />
        </div>
        <div class="chip-row" id="body-part-chips">
          <button type="button" class="chip ${!localState.bodyPart ? 'active' : ''}" data-body-part="">${t('library.clear_filters')}</button>
          ${bodyParts.map((bp) => `<button type="button" class="chip ${localState.bodyPart === bp ? 'active' : ''}" data-body-part="${bp}">${tBodyPart(bp)}</button>`).join('')}
        </div>
        <div class="flex gap-2 mb-3 filter-row">
          <select class="select" id="equipment-filter">
            <option value="">${t('library.filter_equipment')}</option>
            ${equipments.map((eq) => `<option value="${eq}" ${localState.equipment === eq ? 'selected' : ''}>${tEquipment(eq)}</option>`).join('')}
          </select>
          <select class="select" id="target-filter">
            <option value="">${t('library.filter_target')}</option>
            ${targets.map((tg) => `<option value="${tg}" ${localState.target === tg ? 'selected' : ''}>${tMuscle(tg)}</option>`).join('')}
          </select>
        </div>
        <label class="flex items-center gap-2 mb-3">
          <input type="checkbox" id="favorites-only" ${localState.favoritesOnly ? 'checked' : ''} />
          <span class="text-sm">${t('library.favorites_only')}</span>
        </label>
        <p class="text-secondary text-sm mb-3" id="result-count"></p>
      </div>
      <div class="view-content" style="padding-top: 0;">
        <div class="exercise-grid" id="exercise-grid"></div>
        <div class="spinner hidden" id="load-more-spinner"></div>
      </div>
    </div>
  `;

  const grid = container.querySelector('#exercise-grid');
  const resultCount = container.querySelector('#result-count');

  function computeFiltered() {
    return allExercises.filter((e) => matches(e, favorites));
  }

  function updateGrid(resetScroll = false) {
    const filtered = computeFiltered();
    resultCount.textContent = t('library.results_count', { count: filtered.length });
    const visible = filtered.slice(0, localState.visibleCount);
    grid.innerHTML = visible.length
      ? visible.map((e) => exerciseCardHtml(e, { isFavorite: favorites.has(e.id) })).join('')
      : `<div class="empty-state" style="grid-column: 1/-1;"><span class="empty-icon">🔍</span>${t('library.no_results')}</div>`;
    if (resetScroll) {
      const mainEl = document.querySelector('.app-main');
      if (mainEl) mainEl.scrollTop = 0;
    }
  }

  grid.addEventListener('click', async (e) => {
    const favBtn = e.target.closest('[data-toggle-favorite]');
    if (favBtn) {
      e.stopPropagation();
      const id = favBtn.dataset.toggleFavorite;
      const nowFav = await toggleFavorite(id);
      if (nowFav) favorites.add(id); else favorites.delete(id);
      favBtn.textContent = nowFav ? '★' : '☆';
      return;
    }
    const openBtn = e.target.closest('[data-open-exercise]');
    if (openBtn) {
      navigate(`/exercise/${openBtn.dataset.openExercise}`);
    }
  });

  // O card é um <div role="button"> (não um <button> nativo, para não
  // aninhar com o botão de favoritar por dentro — HTML inválido fecharia o
  // elemento externo cedo demais), então Enter/Espaço não disparam clique
  // sozinhos como aconteceria com um <button> de verdade.
  grid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const openBtn = e.target.closest('[data-open-exercise]');
    if (openBtn) {
      e.preventDefault();
      navigate(`/exercise/${openBtn.dataset.openExercise}`);
    }
  });

  container.querySelector('#search').addEventListener('input', (e) => {
    localState.search = e.target.value;
    localState.visibleCount = BATCH_SIZE;
    updateGrid(true);
  });

  container.querySelectorAll('[data-body-part]').forEach((chip) => {
    chip.addEventListener('click', () => {
      localState.bodyPart = chip.dataset.bodyPart;
      localState.visibleCount = BATCH_SIZE;
      container.querySelectorAll('[data-body-part]').forEach((c) => c.classList.toggle('active', c === chip));
      updateGrid(true);
    });
  });

  container.querySelector('#equipment-filter').addEventListener('change', (e) => {
    localState.equipment = e.target.value;
    localState.visibleCount = BATCH_SIZE;
    updateGrid(true);
  });
  container.querySelector('#target-filter').addEventListener('change', (e) => {
    localState.target = e.target.value;
    localState.visibleCount = BATCH_SIZE;
    updateGrid(true);
  });
  container.querySelector('#favorites-only').addEventListener('change', (e) => {
    localState.favoritesOnly = e.target.checked;
    localState.visibleCount = BATCH_SIZE;
    updateGrid(true);
  });

  const mainEl = document.querySelector('.app-main');
  function onScroll() {
    if (!mainEl) return;
    const nearBottom = mainEl.scrollTop + mainEl.clientHeight >= mainEl.scrollHeight - 400;
    if (nearBottom) {
      const filtered = computeFiltered();
      if (localState.visibleCount < filtered.length) {
        localState.visibleCount += BATCH_SIZE;
        updateGrid(false);
      }
    }
  }
  if (mainEl) mainEl.addEventListener('scroll', onScroll);

  updateGrid();

  return () => {
    if (mainEl) mainEl.removeEventListener('scroll', onScroll);
  };
}
