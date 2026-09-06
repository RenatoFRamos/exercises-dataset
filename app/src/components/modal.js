import { pushBackHandler } from '../platform/back-button.js';
import { t } from '../i18n/index.js';

// Modal genérico. `render(container, close)` monta o conteúdo; chamar
// `close()` fecha o modal de qualquer lugar (botão, submit, etc.).
export function showModal(render) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div');
  modal.className = 'modal';
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  let removeBackHandler = null;

  function close() {
    if (removeBackHandler) removeBackHandler();
    backdrop.remove();
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  removeBackHandler = pushBackHandler(() => {
    close();
    return true;
  });

  render(modal, close);
  return { close, modal };
}

// Diálogo de confirmação — usado antes de qualquer ação destrutiva (regra
// nº 3 do APP_RULES: ações destrutivas exigem confirmação).
export function confirmDialog({ title, body, confirmLabel, danger = false }) {
  return new Promise((resolve) => {
    const { close } = showModal((modal, closeFn) => {
      modal.innerHTML = `
        <div class="modal-header"><h2 class="text-lg font-bold">${title}</h2></div>
        <p class="text-secondary">${body || ''}</p>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-block" data-action="cancel">${t('common.cancel')}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-block" data-action="confirm">${confirmLabel || t('common.confirm')}</button>
        </div>
      `;
      modal.querySelector('[data-action="cancel"]').addEventListener('click', () => { closeFn(); resolve(false); });
      modal.querySelector('[data-action="confirm"]').addEventListener('click', () => { closeFn(); resolve(true); });
    });
  });
}

export function confirmDelete(bodyText) {
  return confirmDialog({
    title: t('common.confirm_delete_title'),
    body: bodyText || t('common.confirm_delete_body'),
    confirmLabel: t('common.delete'),
    danger: true
  });
}
