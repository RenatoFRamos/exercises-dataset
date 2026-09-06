import { pushBackHandler } from '../platform/back-button.js';
import { t } from '../i18n/index.js';

const MAX_SCALE_MULTIPLIER = 4; // pode ampliar até 4x a partir do tamanho inicial (T21)

// Abre um visualizador em tela cheia para a imagem/GIF do exercício.
// Suporta pinch-to-zoom (touch), scroll do mouse e botões +/- (desktop),
// arraste para mover, e mantém a atribuição sempre visível.
export function openImageZoom(src, alt) {
  const overlay = document.createElement('div');
  overlay.className = 'zoom-overlay';
  overlay.innerHTML = `
    <div class="zoom-toolbar">
      <button class="btn-icon" data-action="zoom-out" aria-label="-">−</button>
      <button class="btn-icon" data-action="close" aria-label="${t('common.close')}">✕</button>
      <button class="btn-icon" data-action="zoom-in" aria-label="+">+</button>
    </div>
    <div class="zoom-stage">
      <img src="${src}" alt="${alt || ''}" draggable="false" />
    </div>
    <div class="zoom-attribution">${t('exercise.attribution')}</div>
  `;
  document.body.appendChild(overlay);

  const img = overlay.querySelector('img');
  const stage = overlay.querySelector('.zoom-stage');

  // A mídia é só 180×180 — em tamanho "natural" (scale 1) ela aparece
  // minúscula no meio de uma tela cheia, obrigando o usuário a clicar em "+"
  // logo de cara. Em vez disso, a escala mínima/inicial já é a que faz a
  // imagem COBRIR o espaço disponível (como object-fit: cover), calculada
  // assim que soubermos o tamanho real da imagem e do palco.
  let coverScale = 1;
  let scale = 1;
  let tx = 0;
  let ty = 0;

  function computeCoverScale() {
    const stageRect = stage.getBoundingClientRect();
    const naturalW = img.naturalWidth || 180;
    const naturalH = img.naturalHeight || 180;
    return Math.max(stageRect.width / naturalW, stageRect.height / naturalH);
  }

  function initScale() {
    coverScale = computeCoverScale();
    scale = coverScale;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  // ResizeObserver, não requestAnimationFrame: o overlay acabou de ser
  // inserido no DOM e o .zoom-stage (flex:1) ainda não tem layout — medir
  // cedo demais dá 0x0 e a escala inicial de "cobrir a tela" vira scale(0)
  // (imagem invisível). RAF pareceria resolver isso, mas fica PAUSADO
  // indefinidamente se a aba estiver em segundo plano nesse instante — um
  // ResizeObserver dispara assim que o elemento tiver tamanho real, com ou
  // sem a aba visível.
  let sizeReady = false;
  const resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0].contentRect;
    if (rect.width > 0 && rect.height > 0 && !sizeReady) {
      sizeReady = true;
      if (img.complete && img.naturalWidth) initScale();
      resizeObserver.disconnect();
    }
  });
  resizeObserver.observe(stage);

  if (!img.complete || !img.naturalWidth) {
    img.addEventListener('load', () => { if (sizeReady) initScale(); }, { once: true });
  }

  function applyTransform() {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function clampScale(value) {
    return Math.min(coverScale * MAX_SCALE_MULTIPLIER, Math.max(coverScale, value));
  }

  function setScale(newScale) {
    scale = clampScale(newScale);
    if (scale === coverScale) { tx = 0; ty = 0; }
    applyTransform();
  }

  function close() {
    removeBackHandler();
    overlay.remove();
  }

  const removeBackHandler = pushBackHandler(() => { close(); return true; });

  overlay.querySelector('[data-action="close"]').addEventListener('click', close);
  // Incremento proporcional a coverScale, não um valor fixo: como a escala
  // inicial agora já é "cobrir a tela" (podendo ser 5x, 10x... dependendo do
  // tamanho da janela), um passo fixo de 0.5 ficaria imperceptível — poucos
  // cliques devem continuar levando do mínimo ao máximo, como antes.
  overlay.querySelector('[data-action="zoom-in"]').addEventListener('click', () => setScale(scale + coverScale * 0.5));
  overlay.querySelector('[data-action="zoom-out"]').addEventListener('click', () => setScale(scale - coverScale * 0.5));

  // Zoom com scroll do mouse (desktop)
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    setScale(scale - e.deltaY * 0.0015 * scale);
  }, { passive: false });

  // Arraste para mover (mouse e um dedo), quando ampliado
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function dragStart(x, y) {
    if (scale <= coverScale) return;
    dragging = true;
    lastX = x;
    lastY = y;
  }
  function dragMove(x, y) {
    if (!dragging) return;
    tx += x - lastX;
    ty += y - lastY;
    lastX = x;
    lastY = y;
    applyTransform();
  }
  function dragEnd() { dragging = false; }

  stage.addEventListener('mousedown', (e) => dragStart(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', dragEnd);

  // Pinch-to-zoom com dois dedos (mobile)
  let pinchStartDist = null;
  let pinchStartScale = 1;

  function touchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  stage.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pinchStartDist = touchDistance(e.touches);
      pinchStartScale = scale;
    } else if (e.touches.length === 1) {
      dragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinchStartDist) {
      e.preventDefault();
      const newDist = touchDistance(e.touches);
      setScale(pinchStartScale * (newDist / pinchStartDist));
    } else if (e.touches.length === 1) {
      dragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  stage.addEventListener('touchend', () => {
    pinchStartDist = null;
    dragEnd();
  });

  return { close };
}
