import { t, tExerciseName, exerciseMatchesSearch } from '../i18n/index.js';
import {
  getFullWorkout, updateWorkoutMeta, addDay, updateDay, removeDay, reorderDays,
  addExerciseToDay, updateWorkoutExercise, removeWorkoutExercise, reorderExercises,
  getAllExercises, deleteWorkout
} from '../data/repo.js';
import { showModal, confirmDelete } from '../components/modal.js';
import { buildFileObject } from '../domain/workout-file.js';
import { exportFile } from '../platform/files.js';
import { exerciseCardHtml } from '../components/exercise-card.js';
import { navigate } from '../router.js';

const SET_TYPES = ['normal', 'drop_set', 'rest_pause'];

export async function renderWorkoutEdit(container, params) {
  const workoutId = params.id;

  // No escopo de renderWorkoutEdit (não dentro de paint()) para ser
  // acessível também por openEditExerciseModal, que fica fora de paint.
  function exerciseNameOf(ex) {
    if (ex.custom_name) return ex.custom_name;
    const exercise = exerciseCache.get(ex.exercise_id);
    return exercise ? tExerciseName(exercise) : '?';
  }

  async function refresh() {
    const full = await getFullWorkout(workoutId);
    if (!full) { navigate('/workouts'); return; }
    paint(full);
  }

  function paint(full) {
    const { workout, days } = full;

    container.innerHTML = `
      <div class="view">
        <header class="view-header">
          <button class="btn-icon" id="back-btn">←</button>
          <h1 class="text-lg" style="flex:1;">${workout.name}</h1>
          <button class="btn-icon" id="export-btn" title="${t('common.export')}">📤</button>
        </header>
        <div class="view-content">
          <div id="days-list">
            ${days.length ? '' : `<p class="text-secondary mb-3">${t('workout_edit.no_days')}</p>`}
          </div>
          <button class="btn btn-secondary btn-block mt-3" id="add-day-btn">+ ${t('workout_edit.add_day')}</button>
          <button class="btn btn-danger btn-block mt-4" id="delete-workout-btn">${t('common.delete')}</button>
        </div>
      </div>
    `;

    const daysList = container.querySelector('#days-list');
    days.forEach((day, dayIdx) => {
      const dayEl = document.createElement('div');
      dayEl.className = 'card mb-3';
      dayEl.innerHTML = `
        <div class="flex justify-between items-center mb-3 day-header-row">
          <input class="input font-bold day-label-input" style="border:none; background:none; padding:0; font-size:1.1rem;" value="${day.label}" data-day-label="${day.id}" />
          <div class="flex gap-1">
            <button class="btn-icon btn-sm" data-day-up="${day.id}" ${dayIdx === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn-icon btn-sm" data-day-down="${day.id}" ${dayIdx === days.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="btn-icon btn-sm" data-day-remove="${day.id}">🗑</button>
          </div>
        </div>
        <div class="exercises-in-day" data-day-exercises="${day.id}">
          ${day.exercises.length ? '' : `<p class="text-secondary text-sm mb-2">${t('workout_edit.no_exercises_in_day')}</p>`}
        </div>
        <button class="btn btn-secondary btn-sm btn-block" data-add-exercise="${day.id}">+ ${t('workout_edit.add_exercise')}</button>
      `;
      const exContainer = dayEl.querySelector(`[data-day-exercises="${day.id}"]`);
      day.exercises.forEach((ex, exIdx) => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.innerHTML = `
          <div class="list-item-main">
            <div class="list-item-title">${exerciseNameOf(ex)} ${ex.superset_group ? `<span class="badge">${ex.superset_group}</span>` : ''} ${ex.set_type !== 'normal' ? `<span class="badge">${t('workout_edit.set_type.' + ex.set_type)}</span>` : ''}</div>
            <div class="list-item-sub">${ex.sets}× ${ex.reps} · ${ex.rest_seconds}s${ex.warmup_sets ? ` · ${ex.warmup_sets} ${t('workout_edit.warmup_sets').toLowerCase()}` : ''}</div>
          </div>
          <div class="flex gap-1">
            <button class="btn-icon btn-sm" data-ex-up="${ex.id}" ${exIdx === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn-icon btn-sm" data-ex-down="${ex.id}" ${exIdx === day.exercises.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="btn-icon btn-sm" data-ex-edit="${ex.id}" data-day="${day.id}">✎</button>
            <button class="btn-icon btn-sm" data-ex-remove="${ex.id}">🗑</button>
          </div>
        `;
        exContainer.appendChild(row);
      });
      daysList.appendChild(dayEl);
    });

    wireEvents(full);
  }

  function wireEvents(full) {
    const { workout, days } = full;

    container.querySelector('#back-btn').addEventListener('click', () => navigate('/workouts'));

    container.querySelector('#export-btn').addEventListener('click', async () => {
      const fileObj = buildFileObject(workout, days);
      await exportFile(`${workout.name.replace(/[^a-z0-9]+/gi, '_')}.treino.json`, JSON.stringify(fileObj, null, 2));
    });

    container.querySelector('#delete-workout-btn').addEventListener('click', async () => {
      const ok = await confirmDelete();
      if (ok) { await deleteWorkout(workoutId); navigate('/workouts'); }
    });

    container.querySelector('#add-day-btn').addEventListener('click', async () => {
      await addDay(workoutId, t('workout_edit.day_default_name', { n: days.length + 1 }), days.length);
      refresh();
    });

    container.querySelectorAll('[data-day-label]').forEach((input) => {
      input.addEventListener('change', async (e) => {
        await updateDay(input.dataset.dayLabel, { label: e.target.value });
      });
    });

    container.querySelectorAll('[data-day-up]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ids = days.map((d) => d.id);
        const i = ids.indexOf(btn.dataset.dayUp);
        if (i > 0) { [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; await reorderDays(workoutId, ids); refresh(); }
      });
    });
    container.querySelectorAll('[data-day-down]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ids = days.map((d) => d.id);
        const i = ids.indexOf(btn.dataset.dayDown);
        if (i < ids.length - 1) { [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; await reorderDays(workoutId, ids); refresh(); }
      });
    });
    container.querySelectorAll('[data-day-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDelete();
        if (ok) { await removeDay(btn.dataset.dayRemove); refresh(); }
      });
    });

    container.querySelectorAll('[data-add-exercise]').forEach((btn) => {
      btn.addEventListener('click', () => openAddExerciseModal(btn.dataset.addExercise, refresh));
    });

    container.querySelectorAll('[data-ex-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const day = days.find((d) => d.id === btn.dataset.day);
        const ex = day.exercises.find((x) => x.id === btn.dataset.exEdit);
        openEditExerciseModal(ex, refresh);
      });
    });
    container.querySelectorAll('[data-ex-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = await confirmDelete();
        if (ok) { await removeWorkoutExercise(btn.dataset.exRemove); refresh(); }
      });
    });
    container.querySelectorAll('[data-ex-up], [data-ex-down]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const exId = btn.dataset.exUp || btn.dataset.exDown;
        const day = days.find((d) => d.exercises.some((x) => x.id === exId));
        const ids = day.exercises.map((x) => x.id);
        const i = ids.indexOf(exId);
        const swapWith = btn.dataset.exUp ? i - 1 : i + 1;
        if (swapWith >= 0 && swapWith < ids.length) {
          [ids[i], ids[swapWith]] = [ids[swapWith], ids[i]];
          await reorderExercises(day.id, ids);
          refresh();
        }
      });
    });
  }

  let exerciseCache = new Map();
  const allExercises = await getAllExercises();
  exerciseCache = new Map(allExercises.map((e) => [e.id, e]));

  await refresh();

  function openAddExerciseModal(dayId, onDone) {
    showModal((modal, close) => {
      modal.innerHTML = `
        <div class="modal-header"><h2 class="text-lg font-bold">${t('workout_edit.add_exercise')}</h2></div>
        <div class="segmented mb-3">
          <button type="button" class="active" data-tab="catalog">${t('nav.library')}</button>
          <button type="button" data-tab="custom">${t('workout_edit.custom_exercise')}</button>
        </div>
        <div id="tab-catalog">
          <div class="search-bar"><span>🔎</span><input type="text" id="ex-search" placeholder="${t('library.search_placeholder')}" /></div>
          <div class="exercise-grid" id="ex-search-results" style="max-height: 50vh; overflow-y: auto;"></div>
        </div>
        <div id="tab-custom" class="hidden">
          <div class="field">
            <input class="input" id="custom-name" placeholder="${t('workout_edit.custom_exercise_name')}" />
          </div>
          <button class="btn btn-primary btn-block" id="add-custom-btn">${t('common.add')}</button>
        </div>
      `;

      modal.querySelectorAll('[data-tab]').forEach((tabBtn) => {
        tabBtn.addEventListener('click', () => {
          modal.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === tabBtn));
          modal.querySelector('#tab-catalog').classList.toggle('hidden', tabBtn.dataset.tab !== 'catalog');
          modal.querySelector('#tab-custom').classList.toggle('hidden', tabBtn.dataset.tab !== 'custom');
        });
      });

      const resultsEl = modal.querySelector('#ex-search-results');
      function search(term) {
        const matches = allExercises.filter((e) => exerciseMatchesSearch(e, term)).slice(0, 30);
        resultsEl.innerHTML = matches.map((e) => exerciseCardHtml(e)).join('');
      }
      search('');
      modal.querySelector('#ex-search').addEventListener('input', (e) => search(e.target.value));
      resultsEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-open-exercise]');
        if (!btn) return;
        await addExerciseToDay(dayId, { exercise_id: btn.dataset.openExercise });
        close();
        onDone();
      });

      modal.querySelector('#add-custom-btn').addEventListener('click', async () => {
        const name = modal.querySelector('#custom-name').value.trim();
        if (!name) return;
        await addExerciseToDay(dayId, { custom_name: name });
        close();
        onDone();
      });
    });
  }

  function openEditExerciseModal(ex, onDone) {
    showModal((modal, close) => {
      modal.innerHTML = `
        <div class="modal-header"><h2 class="text-lg font-bold">${exerciseNameOf(ex)}</h2></div>
        <div class="flex gap-3">
          <div class="field" style="flex:1;">
            <label class="field-label">${t('workout_edit.sets')}</label>
            <input class="input" type="number" id="f-sets" value="${ex.sets}" min="1" />
          </div>
          <div class="field" style="flex:1;">
            <label class="field-label">${t('workout_edit.reps')}</label>
            <input class="input" id="f-reps" value="${ex.reps}" />
          </div>
        </div>
        <div class="flex gap-3">
          <div class="field" style="flex:1;">
            <label class="field-label">${t('workout_edit.rest')}</label>
            <input class="input" type="number" id="f-rest" value="${ex.rest_seconds}" min="0" step="5" />
          </div>
          <div class="field" style="flex:1;">
            <label class="field-label">${t('workout_edit.warmup_sets')}</label>
            <input class="input" type="number" id="f-warmup" value="${ex.warmup_sets || 0}" min="0" />
          </div>
        </div>
        <div class="field">
          <label class="field-label">${t('workout_edit.set_type')}</label>
          <div class="segmented" id="f-set-type">
            ${SET_TYPES.map((s) => `<button type="button" data-value="${s}" class="${ex.set_type === s ? 'active' : ''}">${t('workout_edit.set_type.' + s)}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label class="field-label">${t('workout_edit.superset_group')}</label>
          <input class="input" id="f-superset" value="${ex.superset_group || ''}" placeholder="${t('workout_edit.superset_none')} (A, B, C...)" maxlength="2" />
        </div>
        <div class="field">
          <label class="field-label">${t('workout_edit.notes')}</label>
          <textarea class="textarea" id="f-notes">${ex.notes || ''}</textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-block" data-cancel>${t('common.cancel')}</button>
          <button class="btn btn-primary btn-block" data-save>${t('common.save')}</button>
        </div>
      `;

      let selectedType = ex.set_type || 'normal';
      modal.querySelectorAll('#f-set-type button').forEach((b) => {
        b.addEventListener('click', () => {
          selectedType = b.dataset.value;
          modal.querySelectorAll('#f-set-type button').forEach((x) => x.classList.toggle('active', x === b));
        });
      });

      modal.querySelector('[data-cancel]').addEventListener('click', close);
      modal.querySelector('[data-save]').addEventListener('click', async () => {
        const sets = parseInt(modal.querySelector('#f-sets').value, 10) || 1;
        const warmup = parseInt(modal.querySelector('#f-warmup').value, 10) || 0;
        await updateWorkoutExercise(ex.id, {
          sets,
          reps: modal.querySelector('#f-reps').value,
          rest_seconds: parseInt(modal.querySelector('#f-rest').value, 10) || 0,
          warmup_sets: Math.min(warmup, sets),
          set_type: selectedType,
          superset_group: modal.querySelector('#f-superset').value.trim() || null,
          notes: modal.querySelector('#f-notes').value
        });
        close();
        onDone();
      });
    });
  }
}
