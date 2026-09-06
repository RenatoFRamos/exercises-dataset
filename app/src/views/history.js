import { t, tExerciseName } from '../i18n/index.js';
import { listCompletedSessions, getAllSessionSets, getAllExercises } from '../data/repo.js';
import { sessionVolume } from '../domain/metrics.js';
import { toDisplay, unitLabel } from '../domain/units.js';
import { getState } from '../state.js';
import { formatSeconds } from '../components/rest-timer.js';
import { navigate } from '../router.js';

export async function renderHistory(container) {
  const settings = getState().settings;
  const sessions = await listCompletedSessions();
  const allSets = await getAllSessionSets();
  const allExercises = await getAllExercises();
  const exerciseById = new Map(allExercises.map((e) => [e.id, e]));

  const setsBySession = new Map();
  for (const s of allSets) {
    if (!setsBySession.has(s.session_id)) setsBySession.set(s.session_id, []);
    setsBySession.get(s.session_id).push(s);
  }

  container.innerHTML = `
    <div class="view">
      <header class="view-header">
        <h1 style="flex:1;">${t('history.title')}</h1>
        <button class="btn-icon" id="open-calendar" title="${t('calendar.title')}">🗓️</button>
      </header>
      <div class="view-content" id="history-list">
        ${sessions.length ? '' : `<div class="empty-state"><span class="empty-icon">🗓️</span>${t('history.empty')}</div>`}
      </div>
    </div>
  `;

  container.querySelector('#open-calendar').addEventListener('click', () => navigate('/calendar'));

  const list = container.querySelector('#history-list');
  for (const session of sessions) {
    const sets = setsBySession.get(session.id) || [];
    const volume = sessionVolume(sets);
    const item = document.createElement('details');
    item.className = 'card mb-3';
    item.innerHTML = `
      <summary class="flex justify-between items-center">
        <div>
          <div class="font-bold">${session.name}</div>
          <div class="text-secondary text-sm">${new Date(session.finished_at).toLocaleDateString()}</div>
        </div>
        <div class="text-right text-sm text-secondary">
          <div>${t('history.duration', { value: formatSeconds(session.duration_seconds || 0) })}</div>
          <div>${t('history.volume', { value: Math.round(volume) })}</div>
        </div>
      </summary>
      <div class="mt-3">
        ${sets.sort((a, b) => a.order_index - b.order_index || a.set_index - b.set_index).map((s) => {
          const exercise = s.exercise_id ? exerciseById.get(s.exercise_id) : null;
          const name = s.custom_name || (exercise ? tExerciseName(exercise) : '?');
          return `<div class="flex justify-between text-sm" style="padding: var(--space-1) 0; border-top: 1px solid var(--border);">
            <span>${name}${s.is_warmup ? ` (${t('session.warmup')})` : ''}</span>
            <span>${s.reps} × ${toDisplay(s.weight_kg, settings.unit)}${unitLabel(settings.unit)}</span>
          </div>`;
        }).join('')}
        ${session.notes ? `<p class="text-secondary text-sm mt-2">"${session.notes}"</p>` : ''}
      </div>
    `;
    list.appendChild(item);
  }
}
