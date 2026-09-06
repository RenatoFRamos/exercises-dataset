import { t, setLanguage } from '../i18n/index.js';
import { getState, updateSettingsCache } from '../state.js';
import { setSetting } from '../data/settings.js';
import { applyAppearance } from '../appearance.js';
import { navigate } from '../router.js';
import { getAllExercises } from '../data/repo.js';
import { validate } from '../domain/workout-file.js';
import { importWorkoutFromFile } from '../domain/import-workout.js';
import fullbodyTemplate from '../data/templates/fullbody-iniciante.treino.json';
import pplTemplate from '../data/templates/push-pull-legs.treino.json';
import upperLowerTemplate from '../data/templates/upper-lower.treino.json';

// Templates importados diretamente (não via fetch) pelo mesmo motivo do
// dataset em seed.js: o app roda via file://, sem servidor.
const TEMPLATES = [
  { data: fullbodyTemplate, nameKey: 'template.fullbody' },
  { data: pplTemplate, nameKey: 'template.ppl' },
  { data: upperLowerTemplate, nameKey: 'template.upper_lower' }
];

let step = 0;
const draft = { language: 'pt', unit: 'kg', theme: 'light', font_scale: 1 };

export async function renderOnboarding(container) {
  const steps = [stepWelcome, stepLanguage, stepUnit, stepAppearance, stepTemplates];
  await steps[step](container);
}

function wrap(content, { showNext = true, nextLabel } = {}) {
  // min-height: 100% (não 100vh): 100vh é a altura da JANELA inteira, mas
  // este bloco já vive dentro de .app-main, que reserva padding-bottom para
  // a barra de navegação (mesmo com a nav oculta no onboarding). Pedir 100vh
  // aqui soma esse padding por cima da tela toda, sempre estourando um
  // pouco e criando uma barra de rolagem vertical desnecessária. 100% herda
  // a altura já descontada do padding do pai.
  return `
    <div class="view">
      <div class="view-content flex flex-col justify-between" style="min-height: 100%;">
        <div>${content}</div>
        ${showNext ? `<button class="btn btn-primary btn-block mt-4" id="onb-next">${nextLabel || t('onboarding.next')}</button>` : ''}
      </div>
    </div>
  `;
}

async function stepWelcome(container) {
  container.innerHTML = wrap(`
    <div style="text-align:center; padding-top: 3rem;">
      <div style="font-size: 3rem;">💪</div>
      <h1 class="text-2xl font-bold mt-3">${t('onboarding.welcome_title')}</h1>
      <p class="text-secondary mt-2">${t('onboarding.welcome_body')}</p>
    </div>
  `);
  container.querySelector('#onb-next').addEventListener('click', () => { step = 1; renderOnboarding(container); });
}

async function stepLanguage(container) {
  container.innerHTML = wrap(`
    <h1 class="text-xl font-bold mb-4">${t('onboarding.language_title')}</h1>
    <div class="segmented mb-3">
      <button type="button" data-lang="pt" class="${draft.language === 'pt' ? 'active' : ''}">Português</button>
      <button type="button" data-lang="en" class="${draft.language === 'en' ? 'active' : ''}">English</button>
    </div>
  `);
  container.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      draft.language = btn.dataset.lang;
      setLanguage(draft.language);
      renderOnboarding(container);
    });
  });
  container.querySelector('#onb-next').addEventListener('click', () => { step = 2; renderOnboarding(container); });
}

async function stepUnit(container) {
  container.innerHTML = wrap(`
    <h1 class="text-xl font-bold mb-4">${t('onboarding.unit_title')}</h1>
    <div class="segmented mb-3">
      <button type="button" data-unit="kg" class="${draft.unit === 'kg' ? 'active' : ''}">kg</button>
      <button type="button" data-unit="lb" class="${draft.unit === 'lb' ? 'active' : ''}">lb</button>
    </div>
  `);
  container.querySelectorAll('[data-unit]').forEach((btn) => {
    btn.addEventListener('click', () => { draft.unit = btn.dataset.unit; renderOnboarding(container); });
  });
  container.querySelector('#onb-next').addEventListener('click', () => { step = 3; renderOnboarding(container); });
}

async function stepAppearance(container) {
  container.innerHTML = wrap(`
    <h1 class="text-xl font-bold mb-4">${t('onboarding.appearance_title')}</h1>
    <div class="field">
      <label class="field-label">${t('settings.theme')}</label>
      <div class="segmented mb-3">
        <button type="button" data-theme="light" class="${draft.theme === 'light' ? 'active' : ''}">${t('settings.theme.light')}</button>
        <button type="button" data-theme="dark" class="${draft.theme === 'dark' ? 'active' : ''}">${t('settings.theme.dark')}</button>
      </div>
    </div>
    <div class="field">
      <label class="field-label">${t('settings.font_scale')}</label>
      <div class="segmented">
        <button type="button" data-font="0.85" class="${draft.font_scale == 0.85 ? 'active' : ''}">A</button>
        <button type="button" data-font="1" class="${draft.font_scale == 1 ? 'active' : ''}">A</button>
        <button type="button" data-font="1.3" class="${draft.font_scale == 1.3 ? 'active' : ''}">A</button>
        <button type="button" data-font="1.6" class="${draft.font_scale == 1.6 ? 'active' : ''}">A</button>
      </div>
    </div>
    <p class="mt-3" style="font-size: 1rem;">${t('settings.preview_text')}</p>
  `);
  document.documentElement.setAttribute('data-theme', draft.theme);
  document.documentElement.style.setProperty('--font-scale', String(draft.font_scale));

  container.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => { draft.theme = btn.dataset.theme; renderOnboarding(container); });
  });
  container.querySelectorAll('[data-font]').forEach((btn) => {
    btn.addEventListener('click', () => { draft.font_scale = parseFloat(btn.dataset.font); renderOnboarding(container); });
  });
  container.querySelector('#onb-next').addEventListener('click', () => { step = 4; renderOnboarding(container); });
}

async function stepTemplates(container) {
  container.innerHTML = wrap(`
    <h1 class="text-xl font-bold mb-2">${t('onboarding.templates_title')}</h1>
    <p class="text-secondary mb-4">${t('onboarding.templates_body')}</p>
    <div id="template-list">
      ${TEMPLATES.map((tpl, i) => `<button class="list-item" data-template="${i}"><div class="list-item-main">${t(tpl.nameKey)}</div></button>`).join('')}
    </div>
  `, { showNext: true, nextLabel: t('onboarding.skip') });

  container.querySelectorAll('[data-template]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tpl = TEMPLATES[parseInt(btn.dataset.template, 10)];
      const allExercises = await getAllExercises();
      const validIds = new Set(allExercises.map((e) => e.id));
      const { valid, data } = validate(tpl.data, validIds);
      if (valid) await importWorkoutFromFile(data);
      finish(container);
    });
  });

  container.querySelector('#onb-next').addEventListener('click', () => finish(container));
}

async function finish(container) {
  await setSetting('language', draft.language);
  await setSetting('unit', draft.unit);
  await setSetting('theme', draft.theme);
  await setSetting('font_scale', draft.font_scale);
  await setSetting('onboarding_done', true);

  const newSettings = { ...getState().settings, ...draft, onboarding_done: true };
  updateSettingsCache(newSettings);
  applyAppearance(newSettings);
  setLanguage(draft.language);

  navigate('/workouts');
}
