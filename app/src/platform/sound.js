// Bipe gerado por Web Audio API — não depende de nenhum arquivo .mp3
// (defeito #2 corrigido na revisão do plano de execução).

let ctx = null;

function getContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
  }
  return ctx;
}

function tone(frequency, startTime, duration) {
  const audioCtx = getContext();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function playRestEndBeep() {
  try {
    const audioCtx = getContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    tone(880, now, 0.15);
    tone(880, now + 0.22, 0.15);
  } catch (e) {
    // Web Audio indisponível (raro) — silencioso, não é crítico.
  }
}
