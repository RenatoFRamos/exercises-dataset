import { t, tBodyPart, tExerciseName } from '../i18n/index.js';
import { getState } from '../state.js';
import { getAllSessionSets, getAllExercises, listMeasurements, addMeasurement } from '../data/repo.js';
import { estimate1RM, weeklyVolumeByMuscle, isoWeekKey, matchKey } from '../domain/metrics.js';
import { toDisplay, unitLabel, fromInput } from '../domain/units.js';
import { showModal } from '../components/modal.js';

function svgLineChart(points, { width = 320, height = 140, unit = '' } = {}) {
  if (points.length < 2) {
    return `<p class="text-secondary text-sm">${t('progress.no_data')}</p>`;
  }
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 12;
  const stepX = (width - pad * 2) / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((p.value - min) / range) * (height - pad * 2);
    return [x, y];
  });

  const pathD = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const dots = coords.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--accent)"><title>${points[i].label}: ${points[i].value}${unit}</title></circle>`).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto;">
      <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="2" />
      ${dots}
    </svg>
    <div class="flex justify-between text-tertiary text-xs mt-1">
      <span>${points[0].label}</span>
      <span>${points[points.length - 1].label}</span>
    </div>
  `;
}

export async function renderProgress(container) {
  const settings = getState().settings;
  const allSets = await getAllSessionSets();
  const allExercises = await getAllExercises();
  const exerciseById = new Map(allExercises.map((e) => [e.id, e]));

  // Só exercícios com histórico real aparecem no seletor.
  const exerciseOptions = new Map();
  for (const s of allSets) {
    if (s.is_warmup) continue;
    const key = matchKey(s);
    if (!exerciseOptions.has(key)) {
      const exercise = exerciseById.get(s.exercise_id);
      const name = s.custom_name || (exercise ? tExerciseName(exercise) : key);
      exerciseOptions.set(key, name);
    }
  }

  const measurements = await listMeasurements();

  container.innerHTML = `
    <div class="view">
      <header class="view-header"><h1>${t('progress.title')}</h1></header>
      <div class="view-content">

        <div class="card mb-4">
          <div class="font-bold mb-2">${t('progress.by_exercise')}</div>
          <select class="select mb-3" id="exercise-select">
            <option value="">${t('progress.select_exercise')}</option>
            ${[...exerciseOptions.entries()].map(([key, name]) => `<option value="${key}">${name}</option>`).join('')}
          </select>
          <div id="exercise-chart"></div>
        </div>

        <div class="card mb-4">
          <div class="font-bold mb-2">${t('progress.weekly_volume')}</div>
          <div id="volume-bars"></div>
        </div>

        <div class="card mb-4">
          <div class="flex justify-between items-center mb-2">
            <div class="font-bold">${t('progress.body_measurements')}</div>
            <button class="btn btn-secondary btn-sm" id="add-measurement">+ ${t('progress.add_measurement')}</button>
          </div>
          <div id="weight-chart"></div>
        </div>

      </div>
    </div>
  `;

  // ---- Volume semanal (semana atual) ----
  const setsWithDate = allSets.filter((s) => !s.is_warmup);
  const volumeByWeek = weeklyVolumeByMuscle(setsWithDate, exerciseById);
  const currentWeek = isoWeekKey(new Date());
  const currentWeekVolume = volumeByWeek[currentWeek] || {};
  const sortedParts = Object.entries(currentWeekVolume).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(1, ...sortedParts.map(([, c]) => c));

  container.querySelector('#volume-bars').innerHTML = sortedParts.length
    ? sortedParts.map(([part, count]) => `
      <div class="mb-2">
        <div class="flex justify-between text-sm mb-1"><span>${tBodyPart(part)}</span><span>${count}</span></div>
        <div style="background: var(--bg-elevated); border-radius: 999px; height: 0.5rem;">
          <div style="background: var(--accent); width: ${(count / maxCount) * 100}%; height: 100%; border-radius: 999px;"></div>
        </div>
      </div>
    `).join('')
    : `<p class="text-secondary text-sm">${t('progress.no_data')}</p>`;

  // ---- Evolução por exercício ----
  container.querySelector('#exercise-select').addEventListener('change', (e) => {
    const key = e.target.value;
    const chartEl = container.querySelector('#exercise-chart');
    if (!key) { chartEl.innerHTML = ''; return; }

    const sets = allSets.filter((s) => !s.is_warmup && matchKey(s) === key);
    const bySession = new Map();
    for (const s of sets) {
      const best = estimate1RM(s.weight_kg, s.reps) || 0;
      if (!bySession.has(s.session_id) || bySession.get(s.session_id).value < best) {
        bySession.set(s.session_id, { value: best, date: s.completed_at });
      }
    }
    const points = [...bySession.values()]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((p) => ({ value: Math.round(toDisplay(p.value, settings.unit)), label: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }));

    chartEl.innerHTML = `<div class="text-secondary text-sm mb-2">${t('progress.estimated_1rm')} (${unitLabel(settings.unit)})</div>` + svgLineChart(points, { unit: unitLabel(settings.unit) });
  });

  // ---- Peso corporal ----
  const weightPoints = measurements
    .filter((m) => m.body_weight_kg != null)
    .map((m) => ({ value: Math.round(toDisplay(m.body_weight_kg, settings.unit) * 10) / 10, label: new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }));
  container.querySelector('#weight-chart').innerHTML = svgLineChart(weightPoints, { unit: unitLabel(settings.unit) });

  container.querySelector('#add-measurement').addEventListener('click', () => {
    showModal((modal, close) => {
      modal.innerHTML = `
        <div class="modal-header"><h2 class="text-lg font-bold">${t('progress.add_measurement')}</h2></div>
        <div class="field"><label class="field-label">${t('progress.body_weight')} (${unitLabel(settings.unit)})</label><input class="input" id="m-weight" type="number" step="0.1" /></div>
        <div class="field"><label class="field-label">${t('progress.measurement.arm')} (cm)</label><input class="input" id="m-arm" type="number" step="0.1" /></div>
        <div class="field"><label class="field-label">${t('progress.measurement.chest')} (cm)</label><input class="input" id="m-chest" type="number" step="0.1" /></div>
        <div class="field"><label class="field-label">${t('progress.measurement.waist')} (cm)</label><input class="input" id="m-waist" type="number" step="0.1" /></div>
        <div class="field"><label class="field-label">${t('progress.measurement.thigh')} (cm)</label><input class="input" id="m-thigh" type="number" step="0.1" /></div>
        <button class="btn btn-primary btn-block" id="save-measurement">${t('common.save')}</button>
      `;
      modal.querySelector('#save-measurement').addEventListener('click', async () => {
        const weightVal = modal.querySelector('#m-weight').value;
        await addMeasurement({
          date: new Date().toISOString(),
          body_weight_kg: weightVal ? fromInput(weightVal, settings.unit) : null,
          arm: parseFloat(modal.querySelector('#m-arm').value) || null,
          chest: parseFloat(modal.querySelector('#m-chest').value) || null,
          waist: parseFloat(modal.querySelector('#m-waist').value) || null,
          thigh: parseFloat(modal.querySelector('#m-thigh').value) || null,
          notes: ''
        });
        close();
        renderProgress(container);
      });
    });
  });
}
