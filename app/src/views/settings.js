import { t, setLanguage } from '../i18n/index.js';
import { getState, updateSettingsCache } from '../state.js';
import { setSetting } from '../data/settings.js';
import { applyAppearance } from '../appearance.js';
import { rerender } from '../router.js';
import { exportAllData, restoreAllData } from '../data/repo.js';
import { pickFile, exportFile } from '../platform/files.js';
import { confirmDialog } from '../components/modal.js';
import { openPlatesCalculator } from '../components/plates-modal.js';
import { buildAiTemplate } from '../domain/ai-template.js';

const FONT_SCALES = [
  { value: 0.85, key: 'settings.font_scale.small' },
  { value: 1, key: 'settings.font_scale.default' },
  { value: 1.15, key: 'settings.font_scale.medium' },
  { value: 1.3, key: 'settings.font_scale.large' },
  { value: 1.6, key: 'settings.font_scale.xlarge' }
];

// Cores literais (espelham themes.css) só para pintar cada amostra com a SUA
// PRÓPRIA cor — usar var(--accent) aqui mostraria a cor atual nos 4 círculos.
const ACCENTS = [
  { id: 'orange', hex: '#ff5a1f' },
  { id: 'blue', hex: '#2f6fed' },
  { id: 'green', hex: '#1f9d55' },
  { id: 'purple', hex: '#7c4dff' }
];

async function apply(patch) {
  for (const [key, value] of Object.entries(patch)) {
    await setSetting(key, value);
  }
  const newSettings = { ...getState().settings, ...patch };
  updateSettingsCache(patch);
  applyAppearance(newSettings);
  if (patch.language) setLanguage(patch.language);
  rerender();
}

export function renderSettings(container) {
  const s = getState().settings;

  container.innerHTML = `
    <div class="view">
      <header class="view-header"><h1>${t('settings.title')}</h1></header>
      <div class="view-content">

        <section class="card mb-4">
          <div class="font-bold mb-3">${t('settings.section_appearance')}</div>

          <div class="field">
            <label class="field-label">${t('settings.font_scale')}</label>
            <div class="segmented" data-group="font_scale">
              ${FONT_SCALES.map((f) => `<button type="button" data-value="${f.value}" class="${s.font_scale == f.value ? 'active' : ''}">${t(f.key)}</button>`).join('')}
            </div>
            <p class="mt-3" style="font-size: 1rem;">${t('settings.preview_text')}</p>
          </div>

          <div class="field">
            <label class="field-label">${t('settings.theme')}</label>
            <div class="segmented" data-group="theme">
              <button type="button" data-value="light" class="${s.theme === 'light' ? 'active' : ''}">${t('settings.theme.light')}</button>
              <button type="button" data-value="dark" class="${s.theme === 'dark' ? 'active' : ''}">${t('settings.theme.dark')}</button>
              <button type="button" data-value="auto" class="${s.theme === 'auto' ? 'active' : ''}">${t('settings.theme.auto')}</button>
            </div>
          </div>

          <div class="field">
            <label class="flex items-center gap-3">
              <input type="checkbox" id="high-contrast" ${s.high_contrast ? 'checked' : ''} />
              <span>${t('settings.theme.high_contrast')}</span>
            </label>
          </div>

          <div class="field">
            <label class="field-label">${t('settings.accent')}</label>
            <div class="flex gap-2">
              ${ACCENTS.map((a) => `
                <button type="button" class="btn-icon" style="background: ${a.hex}; ${s.accent === a.id ? 'outline: 2px solid var(--text-primary);' : ''}" data-preview-accent="${a.id}" aria-label="${a.id}"></button>
              `).join('')}
            </div>
          </div>
        </section>

        <section class="card mb-4">
          <div class="font-bold mb-3">${t('settings.section_general')}</div>
          <div class="field">
            <label class="field-label">${t('settings.language')}</label>
            <select class="select" id="language">
              <option value="pt" ${s.language === 'pt' ? 'selected' : ''}>Português</option>
              <option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">${t('settings.unit')}</label>
            <select class="select" id="unit">
              <option value="kg" ${s.unit === 'kg' ? 'selected' : ''}>kg</option>
              <option value="lb" ${s.unit === 'lb' ? 'selected' : ''}>lb</option>
            </select>
          </div>
        </section>

        <section class="card mb-4">
          <div class="font-bold mb-3">${t('settings.section_workout')}</div>
          <div class="field">
            <label class="flex items-center gap-3">
              <input type="checkbox" id="sound_enabled" ${s.sound_enabled ? 'checked' : ''} />
              <span>${t('settings.sound')}</span>
            </label>
          </div>
          <div class="field">
            <label class="flex items-center gap-3">
              <input type="checkbox" id="vibration_enabled" ${s.vibration_enabled ? 'checked' : ''} />
              <span>${t('settings.vibration')}</span>
            </label>
          </div>
          <div class="field">
            <label class="flex items-center gap-3">
              <input type="checkbox" id="keep_awake" ${s.keep_awake ? 'checked' : ''} />
              <span>${t('settings.keep_awake')}</span>
            </label>
          </div>
          <div class="field">
            <label class="field-label">${t('settings.default_rest')}</label>
            <input class="input" type="number" id="default_rest_seconds" value="${s.default_rest_seconds}" min="0" step="5" />
          </div>
          <div class="field">
            <label class="field-label">${t('settings.bar_weight')}</label>
            <input class="input" type="number" id="bar_weight" value="${s.bar_weight}" min="0" step="0.5" />
          </div>
          <div class="field">
            <label class="field-label">${t('settings.plate_set')}</label>
            <input class="input" type="text" id="plate_set" value="${(s.plate_set || []).join(', ')}" />
          </div>
          <button class="btn btn-secondary btn-block" id="open-plates">${t('plates.title')}</button>
        </section>

        <section class="card mb-4">
          <div class="font-bold mb-2">${t('settings.section_ai')}</div>
          <p class="text-secondary text-sm mb-3">${t('settings.ai_explainer')}</p>
          <button class="btn btn-secondary btn-block mb-4" id="export-ai-template">${t('settings.export_ai_template')}</button>

          <div class="field">
            <label class="field-label">${t('settings.gemini_key')}</label>
            <input class="input" type="password" id="gemini-api-key" value="${s.gemini_api_key || ''}" placeholder="${t('settings.gemini_key_placeholder')}" autocomplete="off" />
            <p class="text-tertiary text-sm mt-1">${t('settings.gemini_key_hint')} <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a></p>
          </div>
        </section>

        <section class="card mb-4">
          <div class="font-bold mb-3">${t('settings.section_data')}</div>
          <button class="btn btn-secondary btn-block mb-2" id="export-backup">${t('backup.export_all')}</button>
          <button class="btn btn-secondary btn-block" id="restore-backup">${t('backup.restore')}</button>
        </section>

        <p class="attribution">${t('settings.attribution_notice')}</p>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-group="font_scale"] button').forEach((btn) => {
    btn.addEventListener('click', () => apply({ font_scale: parseFloat(btn.dataset.value) }));
  });
  container.querySelectorAll('[data-group="theme"] button').forEach((btn) => {
    btn.addEventListener('click', () => apply({ theme: btn.dataset.value }));
  });
  container.querySelector('#high-contrast').addEventListener('change', (e) => apply({ high_contrast: e.target.checked }));
  container.querySelectorAll('[data-preview-accent]').forEach((btn) => {
    btn.addEventListener('click', () => apply({ accent: btn.dataset.previewAccent }));
  });
  container.querySelector('#language').addEventListener('change', (e) => apply({ language: e.target.value }));
  container.querySelector('#unit').addEventListener('change', (e) => apply({ unit: e.target.value }));
  container.querySelector('#sound_enabled').addEventListener('change', (e) => apply({ sound_enabled: e.target.checked }));
  container.querySelector('#vibration_enabled').addEventListener('change', (e) => apply({ vibration_enabled: e.target.checked }));
  container.querySelector('#keep_awake').addEventListener('change', (e) => apply({ keep_awake: e.target.checked }));
  container.querySelector('#default_rest_seconds').addEventListener('change', (e) => apply({ default_rest_seconds: parseInt(e.target.value, 10) || 0 }));
  container.querySelector('#bar_weight').addEventListener('change', (e) => apply({ bar_weight: parseFloat(e.target.value) || 0 }));
  container.querySelector('#plate_set').addEventListener('change', (e) => {
    const plates = e.target.value.split(',').map((v) => parseFloat(v.trim())).filter((v) => !Number.isNaN(v) && v > 0);
    apply({ plate_set: plates });
  });

  container.querySelector('#open-plates').addEventListener('click', () => openPlatesCalculator({ settings: s }));

  container.querySelector('#gemini-api-key').addEventListener('change', (e) => apply({ gemini_api_key: e.target.value.trim() }));

  container.querySelector('#export-ai-template').addEventListener('click', async () => {
    const template = buildAiTemplate();
    await exportFile('meupersonal-modelo-para-ia.json', JSON.stringify(template, null, 2));
  });

  container.querySelector('#export-backup').addEventListener('click', async () => {
    const backup = await exportAllData();
    await exportFile(`meupersonal-backup-${Date.now()}.json`, JSON.stringify(backup, null, 2));
    alert(t('backup.export_success'));
  });

  container.querySelector('#restore-backup').addEventListener('click', async () => {
    const file = await pickFile();
    if (!file) return;
    let backup;
    try {
      backup = JSON.parse(file.text);
    } catch (e) {
      alert(t('error.invalid_json'));
      return;
    }
    const ok = await confirmDialog({
      title: t('backup.restore_confirm_title'),
      body: t('backup.restore_confirm_body'),
      confirmLabel: t('backup.restore')
    });
    if (!ok) return;
    await restoreAllData(backup);
    alert(t('backup.restore_success'));
    location.reload();
  });
}
