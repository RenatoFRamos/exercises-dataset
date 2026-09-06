import { t } from '../i18n/index.js';
import { calculatePlates } from '../domain/plates.js';
import { showModal } from './modal.js';
import { toDisplay, fromInput, unitLabel } from '../domain/units.js';

// Modal da calculadora de anilhas (T44) — usada tanto durante o treino ativo
// (menu do exercício) quanto isolada a partir dos Ajustes.
export function openPlatesCalculator({ settings, defaultTargetKg = null }) {
  showModal((modal) => {
    const defaultDisplay = defaultTargetKg != null ? toDisplay(defaultTargetKg, settings.unit) : '';
    modal.innerHTML = `
      <div class="modal-header"><h2 class="text-lg font-bold">${t('plates.title')}</h2></div>
      <div class="field">
        <label class="field-label">${t('plates.target_weight')} (${unitLabel(settings.unit)})</label>
        <input class="input" id="plates-target" type="number" step="0.5" value="${defaultDisplay}" />
      </div>
      <div id="plates-result" class="mt-3"></div>
    `;

    const resultEl = modal.querySelector('#plates-result');
    const targetInput = modal.querySelector('#plates-target');

    function recalc() {
      const targetKg = fromInput(targetInput.value, settings.unit);
      if (!targetKg) { resultEl.innerHTML = ''; return; }
      const result = calculatePlates(targetKg, settings.bar_weight, settings.plate_set);
      resultEl.innerHTML = `
        <div class="card">
          <div class="text-secondary text-sm mb-2">${t('plates.per_side')}</div>
          <div class="text-xl font-bold mb-2">${result.perSide.length ? result.perSide.join(' + ') : '—'} kg</div>
          ${result.exact
            ? `<span class="badge badge-success">${t('common.done')}</span>`
            : `<div class="text-secondary text-sm">${t('plates.impossible')}<br/>${t('plates.closest', { value: result.achievedTotal })}</div>`}
        </div>
      `;
    }

    targetInput.addEventListener('input', recalc);
    recalc();
  });
}
