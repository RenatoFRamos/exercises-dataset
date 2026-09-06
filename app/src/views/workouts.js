import { t } from '../i18n/index.js';
import {
  listWorkouts, createWorkout, deleteWorkout, duplicateWorkout,
  updateWorkoutMeta, getFullWorkout, createSession, getAllExercises
} from '../data/repo.js';
import { navigate } from '../router.js';
import { showModal, confirmDelete } from '../components/modal.js';
import { pickFile } from '../platform/files.js';
import { parseAndValidate } from '../domain/workout-file.js';
import { importWorkoutFromFile } from '../domain/import-workout.js';
import { openAiWorkoutModal } from '../components/ai-workout-modal.js';

let showArchived = false;

export async function renderWorkouts(container) {
  const workouts = await listWorkouts({ includeArchived: showArchived });

  container.innerHTML = `
    <div class="view">
      <header class="view-header">
        <h1 style="flex:1;">${t('workouts.title')}</h1>
        <button class="btn-icon" id="ai-workout-btn" title="${t('ai.title')}">🤖</button>
        <button class="btn-icon" id="import-btn" title="${t('common.import')}">📥</button>
      </header>
      <div class="view-content">
        <label class="flex items-center gap-2 mb-3">
          <input type="checkbox" id="show-archived" ${showArchived ? 'checked' : ''} />
          <span class="text-sm text-secondary">${t('workouts.show_archived')}</span>
        </label>

        <div id="workout-list">
          ${workouts.length ? '' : `<div class="empty-state"><span class="empty-icon">🏋️</span><div class="font-bold mb-2">${t('workouts.empty_title')}</div><p>${t('workouts.empty_body')}</p></div>`}
        </div>
      </div>
      <button class="fab" id="new-workout-fab">+</button>
    </div>
  `;

  const list = container.querySelector('#workout-list');
  for (const w of workouts) {
    const full = await getFullWorkout(w.id);
    const item = document.createElement('div');
    item.className = 'list-item';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'stretch';
    item.innerHTML = `
      <div class="flex justify-between items-center">
        <div class="list-item-main">
          <div class="list-item-title">${w.name} ${w.archived ? `<span class="badge">${t('workouts.archive')}</span>` : ''}</div>
          <div class="list-item-sub">${t('workouts.days_count', { count: full.days.length })}</div>
        </div>
      </div>
      <div class="flex gap-2 mt-3" style="flex-wrap: wrap;">
        <button class="btn btn-primary btn-sm" data-start="${w.id}">${t('workouts.start_session')}</button>
        <button class="btn btn-secondary btn-sm" data-edit="${w.id}">${t('common.edit')}</button>
        <button class="btn btn-secondary btn-sm" data-duplicate="${w.id}">${t('common.duplicate')}</button>
        <button class="btn btn-secondary btn-sm" data-archive="${w.id}">${w.archived ? t('workouts.unarchive') : t('workouts.archive')}</button>
        <button class="btn btn-danger btn-sm" data-delete="${w.id}">${t('common.delete')}</button>
      </div>
    `;
    list.appendChild(item);
  }

  list.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) return navigate(`/workout/${editBtn.dataset.edit}/edit`);

    const startBtn = e.target.closest('[data-start]');
    if (startBtn) return startWorkoutFlow(startBtn.dataset.start);

    const dupBtn = e.target.closest('[data-duplicate]');
    if (dupBtn) { await duplicateWorkout(dupBtn.dataset.duplicate); return renderWorkouts(container); }

    const archiveBtn = e.target.closest('[data-archive]');
    if (archiveBtn) {
      const w = workouts.find((x) => x.id === archiveBtn.dataset.archive);
      await updateWorkoutMeta(archiveBtn.dataset.archive, { archived: !w.archived });
      return renderWorkouts(container);
    }

    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) {
      const ok = await confirmDelete();
      if (ok) { await deleteWorkout(deleteBtn.dataset.delete); renderWorkouts(container); }
    }
  });

  container.querySelector('#show-archived').addEventListener('change', (e) => {
    showArchived = e.target.checked;
    renderWorkouts(container);
  });

  container.querySelector('#new-workout-fab').addEventListener('click', () => openNewWorkoutModal(container));
  container.querySelector('#import-btn').addEventListener('click', () => openImportModal(container));
  container.querySelector('#ai-workout-btn').addEventListener('click', () => openAiWorkoutModal());
}

function openNewWorkoutModal(container) {
  showModal((modal, close) => {
    modal.innerHTML = `
      <div class="modal-header"><h2 class="text-lg font-bold">${t('workouts.new')}</h2></div>
      <div class="field">
        <input class="input" id="w-name" placeholder="${t('workouts.name_placeholder')}" />
      </div>
      <div class="field">
        <textarea class="textarea" id="w-desc" placeholder="${t('workouts.description_placeholder')}"></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-block" data-cancel>${t('common.cancel')}</button>
        <button class="btn btn-primary btn-block" data-save>${t('common.save')}</button>
      </div>
    `;
    modal.querySelector('[data-cancel]').addEventListener('click', close);
    modal.querySelector('[data-save]').addEventListener('click', async () => {
      const name = modal.querySelector('#w-name').value.trim();
      if (!name) return alert(t('error.missing_name'));
      const description = modal.querySelector('#w-desc').value.trim();
      const workout = await createWorkout({ name, description });
      close();
      navigate(`/workout/${workout.id}/edit`);
    });
  });
}

async function startWorkoutFlow(workoutId) {
  const full = await getFullWorkout(workoutId);
  if (!full.days.length) {
    alert(t('workout_edit.no_days'));
    return;
  }
  if (full.days.length === 1) {
    const session = await createSession({ workoutId, dayId: full.days[0].id, name: `${full.workout.name} — ${full.days[0].label}` });
    return navigate(`/session/${session.id}`);
  }
  showModal((modal, close) => {
    modal.innerHTML = `
      <div class="modal-header"><h2 class="text-lg font-bold">${full.workout.name}</h2></div>
      ${full.days.map((d) => `<button class="list-item" data-day="${d.id}"><div class="list-item-main">${d.label}</div></button>`).join('')}
    `;
    modal.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-day]');
      if (!btn) return;
      const day = full.days.find((d) => d.id === btn.dataset.day);
      const session = await createSession({ workoutId, dayId: day.id, name: `${full.workout.name} — ${day.label}` });
      close();
      navigate(`/session/${session.id}`);
    });
  });
}

function openImportModal(container) {
  showModal((modal, close) => {
    modal.innerHTML = `
      <div class="modal-header"><h2 class="text-lg font-bold">${t('import.title')}</h2></div>
      <button class="btn btn-primary btn-block mb-3" id="pick-file">${t('import.select_file')}</button>
      <div class="text-tertiary text-sm text-center mb-3">${t('import.or')}</div>
      <div class="field">
        <label class="field-label">${t('import.paste_label')}</label>
        <textarea class="textarea" id="paste-json" style="min-height: 8rem; font-family: monospace; font-size: 0.8rem;" placeholder="${t('import.paste_placeholder')}" autocorrect="off" autocapitalize="off" autocomplete="off" spellcheck="false"></textarea>
      </div>
      <button class="btn btn-secondary btn-block mb-3" id="validate-pasted">${t('import.validate_pasted')}</button>
      <div id="import-result"></div>
    `;

    async function processText(rawText) {
      const resultEl = modal.querySelector('#import-result');
      const allExercises = await getAllExercises();
      const validIds = new Set(allExercises.map((e) => e.id));
      const { valid, errors, data } = parseAndValidate(rawText, validIds);

      if (!valid) {
        resultEl.innerHTML = `
          <div class="card" style="border-color: var(--danger);">
            <div class="font-bold text-danger mb-2">${t('import.errors_title')}</div>
            <ul style="padding-left: 1.25rem; list-style: disc;">
              ${errors.map((err) => `<li>${t(err.code, err.params)}</li>`).join('')}
            </ul>
          </div>
        `;
        return;
      }

      resultEl.innerHTML = `
        <div class="card mb-3">
          <div class="font-bold mb-2">${t('import.preview_title')}</div>
          <div class="mb-2">${data.name}</div>
          ${data.days.map((d) => `<div class="text-secondary text-sm">${d.label} — ${d.exercises.length} ${t('nav.library').toLowerCase()}</div>`).join('')}
        </div>
        <button class="btn btn-primary btn-block" id="confirm-import">${t('import.confirm')}</button>
      `;
      modal.querySelector('#confirm-import').addEventListener('click', async () => {
        await importWorkoutFromFile(data);
        close();
        alert(t('import.success'));
        renderWorkouts(container);
      });
    }

    modal.querySelector('#pick-file').addEventListener('click', async () => {
      const file = await pickFile();
      if (!file) return;
      processText(file.text);
    });

    modal.querySelector('#validate-pasted').addEventListener('click', () => {
      const rawText = modal.querySelector('#paste-json').value.trim();
      if (!rawText) {
        alert(t('import.paste_empty'));
        return;
      }
      processText(rawText);
    });
  });
}
