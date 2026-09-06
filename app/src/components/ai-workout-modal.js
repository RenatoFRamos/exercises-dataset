import { t } from '../i18n/index.js';
import { showModal } from './modal.js';
import { buildAiPrompt } from '../domain/ai-prompt.js';
import { exportFile, copyToClipboard } from '../platform/files.js';
import { getState } from '../state.js';
import { navigate } from '../router.js';
import { getAllExercises } from '../data/repo.js';
import { validate } from '../domain/workout-file.js';
import { importWorkoutFromFile } from '../domain/import-workout.js';
import { generateWorkoutJson, GeminiError } from '../domain/gemini-client.js';
import { renderWorkouts } from '../views/workouts.js';

// Checklist de perguntas -> ou (a) gera um prompt de texto pronto para
// colar em qualquer IA (ChatGPT, Gemini, Claude...), sem nenhuma chamada de
// rede; ou (b) chama a API gratuita do Google Gemini direto do navegador,
// usando a chave do próprio usuário (salva em Ajustes), e já mostra o
// treino pronto para revisão e importação.
export function openAiWorkoutModal(container) {
  showModal((modal, close) => {
    modal.innerHTML = `
      <div class="modal-header"><h2 class="text-lg font-bold">${t('ai.title')}</h2></div>
      <p class="text-secondary text-sm mb-4">${t('ai.explainer')}</p>

      <div id="ai-form">
        <div class="field">
          <label class="field-label">${t('ai.goal')}</label>
          <select class="select" id="ai-goal">
            <option value="${t('ai.goal.hypertrophy')}">${t('ai.goal.hypertrophy')}</option>
            <option value="${t('ai.goal.strength')}">${t('ai.goal.strength')}</option>
            <option value="${t('ai.goal.fatloss')}">${t('ai.goal.fatloss')}</option>
            <option value="${t('ai.goal.conditioning')}">${t('ai.goal.conditioning')}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">${t('ai.level')}</label>
          <select class="select" id="ai-level">
            <option value="${t('ai.level.beginner')}">${t('ai.level.beginner')}</option>
            <option value="${t('ai.level.intermediate')}">${t('ai.level.intermediate')}</option>
            <option value="${t('ai.level.advanced')}">${t('ai.level.advanced')}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">${t('ai.sex')} <span class="text-tertiary">(${t('common.optional')})</span></label>
          <select class="select" id="ai-sex">
            <option value="${t('ai.sex.unspecified')}" selected>${t('ai.sex.unspecified')}</option>
            <option value="${t('ai.sex.female')}">${t('ai.sex.female')}</option>
            <option value="${t('ai.sex.male')}">${t('ai.sex.male')}</option>
          </select>
        </div>
        <div class="flex gap-3">
          <div class="field" style="flex:1;">
            <label class="field-label">${t('ai.days_per_week')}</label>
            <input class="input" type="number" id="ai-days" min="1" max="7" value="3" />
          </div>
          <div class="field" style="flex:1;">
            <label class="field-label">${t('ai.session_minutes')}</label>
            <select class="select" id="ai-minutes">
              <option value="30">30</option>
              <option value="45" selected>45</option>
              <option value="60">60</option>
              <option value="90">90</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label class="field-label">${t('ai.equipment')}</label>
          <input class="input" id="ai-equipment" placeholder="${t('ai.equipment_placeholder')}" />
        </div>
        <div class="field">
          <label class="field-label">${t('ai.focus_areas')} <span class="text-tertiary">(${t('common.optional')})</span></label>
          <input class="input" id="ai-focus" placeholder="${t('ai.focus_areas_placeholder')}" />
        </div>
        <div class="field">
          <label class="field-label">${t('ai.restrictions')} <span class="text-tertiary">(${t('common.optional')})</span></label>
          <textarea class="textarea" id="ai-restrictions" placeholder="${t('ai.restrictions_placeholder')}"></textarea>
        </div>
        <button class="btn btn-primary btn-block" id="ai-generate-auto">${t('ai.generate_auto')}</button>
        <button class="btn btn-ghost btn-block mt-2" id="ai-generate">${t('ai.generate')}</button>
        <button class="btn btn-ghost btn-block mt-2" id="ai-form-back">${t('common.back')}</button>
      </div>

      <div id="ai-missing-key" class="hidden">
        <div class="card mb-3" style="border-color: var(--danger);">
          <div class="font-bold mb-2">${t('ai.missing_key_title')}</div>
          <p class="text-secondary text-sm">${t('ai.missing_key_body')}</p>
        </div>
        <button class="btn btn-primary btn-block" id="ai-open-settings">${t('ai.go_to_settings')}</button>
        <button class="btn btn-ghost btn-block mt-2" id="ai-missing-key-back">${t('common.back')}</button>
      </div>

      <div id="ai-loading" class="hidden">
        <p class="text-secondary text-sm text-center" style="padding: 2rem 0;">${t('ai.generating')}</p>
      </div>

      <div id="ai-auto-error" class="hidden">
        <div class="card mb-3" style="border-color: var(--danger);">
          <div class="font-bold text-danger mb-2">${t('ai.auto_error_title')}</div>
          <p class="text-secondary text-sm" id="ai-auto-error-text"></p>
        </div>
        <button class="btn btn-primary btn-block" id="ai-retry">${t('ai.try_again')}</button>
        <button class="btn btn-ghost btn-block mt-2" id="ai-auto-error-back">${t('common.back')}</button>
      </div>

      <div id="ai-auto-preview" class="hidden">
        <div class="card mb-3">
          <div class="font-bold mb-2">${t('ai.auto_preview_title')}</div>
          <p class="text-secondary text-sm mb-3">${t('ai.auto_preview_hint')}</p>
          <div id="ai-auto-preview-body"></div>
        </div>
        <button class="btn btn-primary btn-block" id="ai-import-auto">${t('ai.import_this')}</button>
        <button class="btn btn-ghost btn-block mt-2" id="ai-auto-preview-back">${t('common.back')}</button>
      </div>

      <div id="ai-result" class="hidden">
        <p class="text-secondary text-sm mb-2">${t('ai.result_explainer')}</p>
        <textarea class="textarea" id="ai-prompt-text" style="min-height: 12rem; font-family: monospace; font-size: 0.8rem;" readonly></textarea>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-block" id="ai-copy">${t('ai.copy')}</button>
          <button class="btn btn-secondary btn-block" id="ai-export">${t('ai.export_txt')}</button>
        </div>
        <button class="btn btn-ghost btn-block mt-2" id="ai-back">${t('common.back')}</button>
      </div>
    `;

    const panels = ['ai-form', 'ai-missing-key', 'ai-loading', 'ai-auto-error', 'ai-auto-preview', 'ai-result'];
    function showPanel(id) {
      panels.forEach((p) => modal.querySelector(`#${p}`).classList.toggle('hidden', p !== id));
    }

    function readAnswers() {
      const sexValue = modal.querySelector('#ai-sex').value;
      return {
        goal: modal.querySelector('#ai-goal').value,
        level: modal.querySelector('#ai-level').value,
        sex: sexValue === t('ai.sex.unspecified') ? '' : sexValue,
        daysPerWeek: modal.querySelector('#ai-days').value || '3',
        sessionMinutes: modal.querySelector('#ai-minutes').value,
        equipment: modal.querySelector('#ai-equipment').value.trim(),
        focusAreas: modal.querySelector('#ai-focus').value.trim(),
        restrictions: modal.querySelector('#ai-restrictions').value.trim()
      };
    }

    let generatedPrompt = '';
    let autoWorkoutData = null;

    modal.querySelector('#ai-generate').addEventListener('click', () => {
      generatedPrompt = buildAiPrompt(readAnswers());
      modal.querySelector('#ai-prompt-text').value = generatedPrompt;
      showPanel('ai-result');
    });

    modal.querySelector('#ai-back').addEventListener('click', () => showPanel('ai-form'));
    modal.querySelector('#ai-form-back').addEventListener('click', close);
    modal.querySelector('#ai-missing-key-back').addEventListener('click', () => showPanel('ai-form'));
    modal.querySelector('#ai-auto-error-back').addEventListener('click', () => showPanel('ai-form'));
    modal.querySelector('#ai-auto-preview-back').addEventListener('click', () => showPanel('ai-form'));

    modal.querySelector('#ai-open-settings').addEventListener('click', () => {
      close();
      navigate('/settings');
    });

    async function runAutoGenerate() {
      const apiKey = (getState().settings && getState().settings.gemini_api_key) || '';
      if (!apiKey) {
        showPanel('ai-missing-key');
        return;
      }

      showPanel('ai-loading');
      const prompt = buildAiPrompt(readAnswers());

      try {
        const data = await generateWorkoutJson({ apiKey, prompt });
        const allExercises = await getAllExercises();
        const validIds = new Set(allExercises.map((e) => e.id));
        const { valid, errors } = validate(data, validIds);

        if (!valid) {
          modal.querySelector('#ai-auto-error-text').innerHTML = errors.map((err) => `<div>${t(err.code, err.params)}</div>`).join('');
          showPanel('ai-auto-error');
          return;
        }

        autoWorkoutData = data;
        modal.querySelector('#ai-auto-preview-body').innerHTML = `
          <div class="mb-2 font-bold">${data.name}</div>
          ${data.days.map((d) => `<div class="text-secondary text-sm">${d.label} — ${d.exercises.length} ${t('nav.library').toLowerCase()}</div>`).join('')}
        `;
        showPanel('ai-auto-preview');
      } catch (e) {
        const message = e instanceof GeminiError ? t(`error.gemini.${e.code}`) : t('error.gemini.generic');
        modal.querySelector('#ai-auto-error-text').textContent = message;
        showPanel('ai-auto-error');
      }
    }

    modal.querySelector('#ai-generate-auto').addEventListener('click', runAutoGenerate);
    modal.querySelector('#ai-retry').addEventListener('click', runAutoGenerate);

    modal.querySelector('#ai-import-auto').addEventListener('click', async () => {
      if (!autoWorkoutData) return;
      await importWorkoutFromFile(autoWorkoutData);
      close();
      alert(t('import.success'));
      if (container) renderWorkouts(container);
    });

    modal.querySelector('#ai-copy').addEventListener('click', async () => {
      const btn = modal.querySelector('#ai-copy');
      const ok = await copyToClipboard(generatedPrompt);
      if (ok) {
        const original = btn.textContent;
        btn.textContent = t('ai.copied');
        setTimeout(() => { btn.textContent = original; }, 1500);
      } else {
        // Não deu para copiar automaticamente (raro) — seleciona o texto na
        // própria textarea para o usuário copiar pelo menu do celular/navegador.
        const promptEl = modal.querySelector('#ai-prompt-text');
        promptEl.focus();
        promptEl.select();
        alert(t('ai.copy_manual_fallback'));
      }
    });

    modal.querySelector('#ai-export').addEventListener('click', async () => {
      await exportFile('prompt-treino-ia.txt', generatedPrompt, 'text/plain');
    });
  });
}
