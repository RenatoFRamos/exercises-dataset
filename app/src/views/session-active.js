import { t, tExerciseName, exerciseMatchesSearch } from '../i18n/index.js';
import { getState } from '../state.js';
import {
  getSession, updateSession, getFullWorkout, getSetsForSession, addSessionSet,
  removeSessionSet, getHistoryForExercise, getAllExercises, reorderExercises,
  addExerciseToDay, updateWorkoutExercise
} from '../data/repo.js';
import { toDisplay, fromInput, unitLabel } from '../domain/units.js';
import { estimate1RM, detectPRs, sessionVolume, matchKey } from '../domain/metrics.js';
import { findAlternatives } from '../domain/alternatives.js';
import { createRestTimer, formatSeconds } from '../components/rest-timer.js';
import { openImageZoom } from '../components/image-zoom.js';
import { showModal, confirmDialog } from '../components/modal.js';
import { openPlatesCalculator } from '../components/plates-modal.js';
import { exerciseCardHtml } from '../components/exercise-card.js';
import * as keepAwake from '../platform/keep-awake.js';
import * as notifications from '../platform/notifications.js';
import * as sound from '../platform/sound.js';
import * as haptics from '../platform/haptics.js';
import { navigate } from '../router.js';

export async function renderSessionActive(container, params) {
  const sessionId = params.id;
  const session = await getSession(sessionId);
  if (!session || session.status !== 'in_progress') {
    navigate('/workouts');
    return;
  }

  const settings = getState().settings;
  const full = await getFullWorkout(session.workout_id);
  const day = full.days.find((d) => d.id === session.day_id);
  const allExercises = await getAllExercises();
  const exerciseById = new Map(allExercises.map((e) => [e.id, e]));

  let plannedExercises = [...day.exercises];
  let sessionSets = await getSetsForSession(sessionId);
  // Preenche o campo com o valor antigo assim que uma série é desmarcada
  // (ver [data-toggle-set]), em vez de deixá-lo em branco.
  let pendingReopen = null;

  const restTimer = createRestTimer({
    onTick: (remaining) => updateTimerDom(remaining),
    onDone: (skipped) => {
      hideTimerBar();
      if (!skipped) {
        if (settings.sound_enabled) sound.playRestEndBeep();
        if (settings.vibration_enabled) haptics.vibrate('medium');
      }
    }
  });

  await keepAwake.enable();

  let durationInterval = setInterval(updateDuration, 1000);

  function updateDuration() {
    const el = container.querySelector('#session-duration');
    if (!el) return;
    const elapsed = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
    el.textContent = formatSeconds(elapsed);
  }

  function labelFor(ex) {
    if (ex.custom_name) return ex.custom_name;
    const exercise = exerciseById.get(ex.exercise_id);
    return exercise ? tExerciseName(exercise) : '?';
  }

  function lastSessionSummary(history) {
    const valid = history.filter((s) => !s.is_warmup);
    if (!valid.length) return null;
    const lastSessionId = valid[valid.length - 1].session_id;
    const fromLast = valid.filter((s) => s.session_id === lastSessionId);
    return { count: fromLast.length, reps: fromLast[0].reps, weight_kg: fromLast[0].weight_kg };
  }

  function getSetsFor(planExId) {
    return sessionSets.filter((s) => s.plan_exercise_id === planExId).sort((a, b) => a.set_index - b.set_index);
  }

  function isLastExerciseOfGroup(ex) {
    if (!ex.superset_group) return true;
    const group = plannedExercises.filter((e) => e.superset_group === ex.superset_group);
    return group[group.length - 1].id === ex.id;
  }

  async function paint() {
    // Consome pendingReopen uma única vez (não deve reaparecer em re-renders
    // seguintes, ex.: depois de marcar outra série).
    const reopenSnapshot = pendingReopen;
    pendingReopen = null;

    const blocksHtml = await Promise.all(plannedExercises.map(async (ex, idx) => {
      const exercise = ex.exercise_id ? exerciseById.get(ex.exercise_id) : null;
      const history = await getHistoryForExercise(
        { exerciseId: ex.exercise_id, customName: ex.custom_name },
        { excludeSessionId: sessionId }
      );
      const lastSummary = lastSessionSummary(history);
      const done = getSetsFor(ex.id);
      const totalSets = Math.max(ex.sets, done.length);

      const rows = [];
      for (let i = 0; i < totalSets; i++) {
        const existing = done.find((s) => s.set_index === i);
        const isWarmup = i < (ex.warmup_sets || 0);
        const reopened = reopenSnapshot && reopenSnapshot.planId === ex.id && reopenSnapshot.setIndex === i ? reopenSnapshot : null;
        const defaultWeight = existing
          ? toDisplay(existing.weight_kg, settings.unit)
          : reopened ? toDisplay(reopened.weightKg, settings.unit)
          : (lastSummary ? toDisplay(lastSummary.weight_kg, settings.unit) : '');
        const defaultReps = existing ? existing.reps : reopened ? reopened.reps : (lastSummary ? lastSummary.reps : '');
        rows.push(`
          <div class="set-row ${isWarmup ? 'is-warmup' : ''} ${existing ? 'is-completed' : ''}" data-plan="${ex.id}" data-set-index="${i}">
            <div class="set-index">${isWarmup ? t('session.warmup_short') : i - (ex.warmup_sets || 0) + 1}</div>
            <input type="number" inputmode="decimal" class="input-weight" placeholder="${unitLabel(settings.unit)}" value="${defaultWeight}" ${existing ? 'disabled' : ''} />
            <input type="number" inputmode="numeric" class="input-reps" placeholder="reps" value="${defaultReps}" ${existing ? 'disabled' : ''} />
            <button class="set-check ${existing ? 'checked' : ''}" data-toggle-set>${existing ? '✓' : ''}</button>
          </div>
        `);
      }

      return `
        <div class="exercise-block" data-exercise-block="${ex.id}">
          <div class="exercise-block-header">
            ${exercise ? `<img class="exercise-block-thumb" src="${exercise.image}" data-zoom="${exercise.gif_url}" alt="${tExerciseName(exercise)}" />` : '<div class="exercise-block-thumb" style="display:flex;align-items:center;justify-content:center;">🏋️</div>'}
            <div style="flex:1;">
              <div class="font-bold">${labelFor(ex)}</div>
              ${lastSummary
                ? `<div class="last-session-ref">${t('session.last_time', { sets: lastSummary.count, reps: lastSummary.reps, weight: toDisplay(lastSummary.weight_kg, settings.unit), unit: unitLabel(settings.unit) })}</div>`
                : `<div class="last-session-ref">${t('session.no_history')}</div>`}
            </div>
            ${exercise ? `<button class="btn-icon btn-sm" data-zoom="${exercise.gif_url}" data-zoom-alt="${tExerciseName(exercise)}" title="${t('session.view_gif')}">🎬</button>` : ''}
            <button class="btn-icon btn-sm" data-exercise-menu="${ex.id}">⋮</button>
          </div>
          <div data-rows="${ex.id}">${rows.join('')}</div>
          <div class="flex gap-2" style="padding: var(--space-2) var(--space-3) var(--space-3);">
            <button class="btn btn-secondary btn-sm" data-add-set="${ex.id}">+ ${t('session.add_set')}</button>
          </div>
        </div>
      `;
    }));

    container.innerHTML = `
      <div class="view">
        <header class="view-header session-header">
          <div>
            <div class="font-bold">${full.workout.name}</div>
            <div class="text-secondary text-sm">${day.label}</div>
          </div>
          <div class="session-duration" id="session-duration">00:00</div>
        </header>
        <div class="view-content">
          ${blocksHtml.join('')}
          <button class="btn btn-secondary btn-block mb-3" id="add-unplanned-btn">+ ${t('session.add_exercise')}</button>
          <button class="btn btn-danger btn-block mb-3" id="abandon-btn">${t('session.abandon')}</button>
          <button class="btn btn-primary btn-block" id="finish-btn">${t('session.finish')}</button>
        </div>
        <div class="rest-timer hidden" id="rest-timer-bar">
          <div>
            <div class="text-sm">${t('common.minutes_short')}</div>
            <div class="rest-timer-time" id="rest-timer-time">0:00</div>
          </div>
          <div class="rest-timer-actions">
            <button data-rest-sub>${t('session.rest_sub')}</button>
            <button data-rest-add>${t('session.rest_add')}</button>
            <button data-rest-skip>${t('session.rest_skip')}</button>
          </div>
        </div>
      </div>
    `;
    updateDuration();
    wireEvents();
  }

  function updateTimerDom(remaining) {
    const bar = container.querySelector('#rest-timer-bar');
    const timeEl = container.querySelector('#rest-timer-time');
    if (!bar || !timeEl) return;
    bar.classList.remove('hidden');
    timeEl.textContent = formatSeconds(remaining);
  }

  function hideTimerBar() {
    const bar = container.querySelector('#rest-timer-bar');
    if (bar) bar.classList.add('hidden');
  }

  async function startRestIfNeeded(ex) {
    if (!isLastExerciseOfGroup(ex)) return; // super série: sem descanso entre exercícios do grupo
    const seconds = ex.rest_seconds || 0;
    if (seconds <= 0) return;
    restTimer.start(seconds);
    await notifications.scheduleRestEnd(seconds, t('nav.workouts'), t('session.rest_skip'));
  }

  function wireEvents() {
    container.querySelectorAll('[data-zoom]').forEach((el) => {
      el.addEventListener('click', () => openImageZoom(el.dataset.zoom, el.dataset.zoomAlt || el.alt));
    });

    container.querySelectorAll('[data-toggle-set]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.set-row');
        const planId = row.dataset.plan;
        const setIndex = parseInt(row.dataset.setIndex, 10);
        const ex = plannedExercises.find((e) => e.id === planId);

        // Já marcada: o clique DESMARCA — apaga o registro e reabilita os
        // campos para corrigir o valor. Sem isso, um erro de digitação fica
        // impossível de corrigir depois de marcado. Guarda o valor antigo em
        // pendingReopen para o campo reabrir PREENCHIDO com ele (editar em
        // vez de redigitar do zero).
        if (row.classList.contains('is-completed')) {
          const existingSet = getSetsFor(planId).find((s) => s.set_index === setIndex);
          if (existingSet) {
            pendingReopen = { planId, setIndex, weightKg: existingSet.weight_kg, reps: existingSet.reps };
            await removeSessionSet(existingSet.id);
          }
          sessionSets = await getSetsForSession(sessionId);
          await paint();
          return;
        }

        const weightInput = row.querySelector('.input-weight');
        const repsInput = row.querySelector('.input-reps');
        const weightKg = fromInput(weightInput.value, settings.unit) || 0;
        const reps = parseInt(repsInput.value, 10) || 0;
        const isWarmup = setIndex < (ex.warmup_sets || 0);

        await addSessionSet({
          session_id: sessionId,
          plan_exercise_id: planId,
          exercise_id: ex.exercise_id || null,
          custom_name: ex.custom_name || null,
          order_index: plannedExercises.indexOf(ex),
          set_index: setIndex,
          is_warmup: isWarmup,
          set_type: ex.set_type,
          weight_kg: weightKg,
          reps
        });
        sessionSets = await getSetsForSession(sessionId);

        await startRestIfNeeded(ex);
        await paint();
      });
    });

    container.querySelectorAll('[data-add-set]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ex = plannedExercises.find((e) => e.id === btn.dataset.addSet);
        await updateWorkoutExercise(ex.id, { sets: ex.sets + 1 });
        ex.sets += 1;
        await paint();
      });
    });

    container.querySelectorAll('[data-exercise-menu]').forEach((btn) => {
      btn.addEventListener('click', () => openExerciseMenu(btn.dataset.exerciseMenu));
    });

    container.querySelector('#add-unplanned-btn').addEventListener('click', openAddUnplannedModal);

    container.querySelector('[data-rest-skip]')?.addEventListener('click', async () => {
      restTimer.skip();
      await notifications.cancelRestEnd();
    });
    container.querySelector('[data-rest-add]')?.addEventListener('click', () => restTimer.addSeconds(15));
    container.querySelector('[data-rest-sub]')?.addEventListener('click', () => restTimer.addSeconds(-15));

    container.querySelector('#abandon-btn').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: t('session.abandon_confirm_title'),
        body: t('session.abandon_confirm_body'),
        confirmLabel: t('session.abandon'),
        danger: true
      });
      if (ok) {
        await updateSession(sessionId, { status: 'abandoned', finished_at: new Date().toISOString() });
        cleanup();
        navigate('/workouts');
      }
    });

    container.querySelector('#finish-btn').addEventListener('click', finishSession);
  }

  function openExerciseMenu(planId) {
    const ex = plannedExercises.find((e) => e.id === planId);
    showModal((modal, close) => {
      modal.innerHTML = `
        <div class="modal-header"><h2 class="text-lg font-bold">${labelFor(ex)}</h2></div>
        <button class="list-item" data-action="skip">${t('session.skip_exercise')}</button>
        <button class="list-item" data-action="replace">${t('session.replace_exercise')}</button>
        <button class="list-item" data-action="plates">${t('plates.title')}</button>
      `;
      modal.querySelector('[data-action="skip"]').addEventListener('click', () => {
        close();
        const block = container.querySelector(`[data-exercise-block="${planId}"]`);
        const next = block?.nextElementSibling;
        if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      modal.querySelector('[data-action="replace"]').addEventListener('click', () => {
        close();
        openReplaceModal(ex);
      });
      modal.querySelector('[data-action="plates"]').addEventListener('click', () => {
        close();
        const lastRow = getSetsFor(ex.id).slice(-1)[0];
        openPlatesCalculator({ settings, defaultTargetKg: lastRow ? lastRow.weight_kg : null });
      });
    });
  }

  function openReplaceModal(ex) {
    const exercise = ex.exercise_id ? exerciseById.get(ex.exercise_id) : null;
    const alternatives = exercise ? findAlternatives(exercise, allExercises) : [];
    showModal((modal, close) => {
      modal.innerHTML = `
        <div class="modal-header"><h2 class="text-lg font-bold">${t('session.replace_exercise')}</h2></div>
        <div class="exercise-grid">
          ${alternatives.length ? alternatives.slice(0, 12).map((alt) => exerciseCardHtml(alt)).join('') : `<p class="text-secondary">${t('exercise.alternatives_empty')}</p>`}
        </div>
      `;
      modal.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-open-exercise]');
        if (!btn) return;
        await updateWorkoutExercise(ex.id, { exercise_id: btn.dataset.openExercise, custom_name: null });
        ex.exercise_id = btn.dataset.openExercise;
        ex.custom_name = null;
        close();
        await paint();
      });
    });
  }

  function openAddUnplannedModal() {
    showModal((modal, close) => {
      modal.innerHTML = `
        <div class="modal-header"><h2 class="text-lg font-bold">${t('session.add_exercise')}</h2></div>
        <div class="search-bar"><span>🔎</span><input type="text" id="ex-search" /></div>
        <div class="exercise-grid" id="ex-results" style="max-height: 50vh; overflow-y: auto;"></div>
      `;
      const resultsEl = modal.querySelector('#ex-results');
      function search(term) {
        const matches = allExercises.filter((e) => exerciseMatchesSearch(e, term)).slice(0, 30);
        resultsEl.innerHTML = matches.map((e) => exerciseCardHtml(e)).join('');
      }
      search('');
      modal.querySelector('#ex-search').addEventListener('input', (e) => search(e.target.value));
      resultsEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-open-exercise]');
        if (!btn) return;
        const newEx = await addExerciseToDay(day.id, { exercise_id: btn.dataset.openExercise, rest_seconds: settings.default_rest_seconds });
        plannedExercises.push(newEx);
        close();
        await paint();
      });
    });
  }

  async function finishSession() {
    const allSets = await getSetsForSession(sessionId);
    const volume = sessionVolume(allSets);

    const prResults = [];
    const byExercise = new Map();
    for (const s of allSets) {
      const key = matchKey(s);
      if (!byExercise.has(key)) byExercise.set(key, []);
      byExercise.get(key).push(s);
    }
    for (const [key, sets] of byExercise) {
      const sample = sets[0];
      const history = await getHistoryForExercise({ exerciseId: sample.exercise_id, customName: sample.custom_name }, { excludeSessionId: sessionId });
      const pr = detectPRs(sets, history);
      if (pr.weightPR || pr.repsPR) {
        const exercise = sample.exercise_id ? exerciseById.get(sample.exercise_id) : null;
        prResults.push({ name: exercise?.name || sample.custom_name, ...pr });
      }
    }

    showModal((modal, close) => {
      modal.innerHTML = `
        <div class="modal-header"><h2 class="text-lg font-bold">${t('session.summary_title')}</h2></div>
        <p>${t('session.summary_volume')}: <strong>${Math.round(volume)} kg</strong></p>
        ${prResults.length ? `
          <div class="mt-3">
            <div class="font-bold mb-2">${t('session.summary_prs')} 🏆</div>
            ${prResults.map((pr) => `<div class="badge badge-success mb-1">${pr.name} ${t('session.pr_badge')}</div>`).join('')}
          </div>
        ` : ''}
        <div class="field mt-3">
          <label class="field-label">${t('session.summary_note')}</label>
          <textarea class="textarea" id="summary-note" placeholder="${t('session.summary_note_placeholder')}"></textarea>
        </div>
        <button class="btn btn-primary btn-block mt-3" id="confirm-finish">${t('common.done')}</button>
      `;
      modal.querySelector('#confirm-finish').addEventListener('click', async () => {
        const notes = modal.querySelector('#summary-note').value;
        const durationSeconds = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
        await updateSession(sessionId, {
          status: 'completed',
          finished_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          notes
        });
        close();
        cleanup();
        navigate('/history');
      });
    });
  }

  function cleanup() {
    clearInterval(durationInterval);
    restTimer.stop();
    keepAwake.disable();
    notifications.cancelRestEnd();
  }

  await paint();

  return cleanup;
}
