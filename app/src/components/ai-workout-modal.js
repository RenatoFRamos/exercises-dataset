import { t } from '../i18n/index.js';
import { showModal } from './modal.js';
import { buildAiPrompt } from '../domain/ai-prompt.js';
import { exportFile, copyToClipboard } from '../platform/files.js';

// Checklist de perguntas -> gera um prompt de texto pronto para colar em
// qualquer IA (ChatGPT, Gemini, Claude...). Nenhuma chamada de rede daqui —
// é só um gerador de texto; a IA roda fora do app, o usuário cola a
// resposta e importa o .treino.json de volta pela tela de Treinos.
export function openAiWorkoutModal() {
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
        <button class="btn btn-primary btn-block" id="ai-generate">${t('ai.generate')}</button>
        <button class="btn btn-ghost btn-block mt-2" id="ai-form-back">${t('common.back')}</button>
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

    const panels = ['ai-form', 'ai-result'];
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

    modal.querySelector('#ai-generate').addEventListener('click', () => {
      generatedPrompt = buildAiPrompt(readAnswers());
      modal.querySelector('#ai-prompt-text').value = generatedPrompt;
      showPanel('ai-result');
    });

    modal.querySelector('#ai-back').addEventListener('click', () => showPanel('ai-form'));
    modal.querySelector('#ai-form-back').addEventListener('click', close);

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
