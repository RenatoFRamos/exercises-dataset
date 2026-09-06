// Wake Lock API do navegador — melhor esforço. Nem todo navegador/contexto
// suporta (ex.: exige HTTPS/localhost em alguns; pode não funcionar via
// file://). Quando indisponível, o app segue funcionando normalmente, só
// sem a garantia de tela sempre ligada durante o treino.

let lock = null;

export async function enable() {
  try {
    if ('wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen');
    }
  } catch (e) {
    // Sem suporte — a tela pode apagar sozinha, mas nada quebra.
  }
}

export async function disable() {
  try {
    if (lock) {
      await lock.release();
      lock = null;
    }
  } catch (e) {
    // no-op
  }
}
