export async function vibrate(pattern = 'medium') {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern === 'heavy' ? 200 : pattern === 'light' ? 30 : 80);
    }
  } catch (e) {
    // Sem vibração disponível — no-op silencioso, nunca deve quebrar o app.
  }
}
