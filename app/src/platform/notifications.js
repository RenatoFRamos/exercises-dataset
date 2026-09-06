// Notificação do navegador — melhor esforço, sem garantia. Sem camada
// nativa, não há como acordar o app com a tela bloqueada/em segundo plano
// de forma confiável (limitação aceita, ver seção 5.3 do APP_RULES). Som e
// vibração (sound.js/haptics.js) continuam funcionando com o app na tela.

let webTimeoutId = null;
let permissionRequested = false;

async function ensurePermission() {
  if (permissionRequested) return;
  permissionRequested = true;
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch (e) {
    // Permissão negada ou indisponível — os avisos sonoro/vibração continuam.
  }
}

export async function scheduleRestEnd(delaySeconds, title, body) {
  await ensurePermission();
  cancelRestEnd();
  try {
    webTimeoutId = setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    }, delaySeconds * 1000);
  } catch (e) {
    // Sem notificação — som e vibração ainda cobrem o aviso.
  }
}

export async function cancelRestEnd() {
  if (webTimeoutId) {
    clearTimeout(webTimeoutId);
    webTimeoutId = null;
  }
}
