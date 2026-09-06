// Fullscreen API do navegador — some a barra de endereço/UI do navegador
// sem precisar de um wrapper nativo ou do atalho --app (que só funciona no
// desktop via o .bat). Funciona em Chrome Android e na maioria dos
// navegadores desktop; iPhone/iOS Safari não suporta Fullscreen API para a
// página inteira (limitação da Apple) — nesses casos o botão fica oculto e
// a alternativa é "Adicionar à Tela de Início" (modo standalone via manifest,
// já configurado em index.html).

function isSupported() {
  return !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
}

function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

async function enter() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch (e) {
    // Bloqueado pelo navegador (ex.: sem gesto do usuário) — botão só não reage.
  }
}

async function exit() {
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch (e) {
    // no-op
  }
}

export function initFullscreenToggle(button, labels) {
  if (!isSupported()) {
    button.classList.add('hidden');
    return;
  }

  const iconEl = button.querySelector('.nav-icon') || button;

  function update() {
    const active = isFullscreen();
    iconEl.textContent = active ? '⤢' : '⛶';
    button.setAttribute('aria-label', active ? labels.exit : labels.enter);
    button.title = active ? labels.exit : labels.enter;
  }

  button.addEventListener('click', () => {
    if (isFullscreen()) exit();
    else enter();
  });

  document.addEventListener('fullscreenchange', update);
  document.addEventListener('webkitfullscreenchange', update);
  update();
}
