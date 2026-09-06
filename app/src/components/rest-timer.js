// Cronômetro de descanso baseado em timestamp (Date.now()), não em soma de
// intervalos — senão o tempo erra quando a aba fica em segundo plano (T34).

export function createRestTimer({ onTick, onDone }) {
  let endTime = null;
  let intervalId = null;
  let running = false;

  function tick() {
    const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    onTick(remaining);
    if (remaining <= 0) finish(false);
  }

  function finish(skipped) {
    clearInterval(intervalId);
    intervalId = null;
    running = false;
    onDone(skipped);
  }

  function start(seconds) {
    if (intervalId) clearInterval(intervalId);
    endTime = Date.now() + seconds * 1000;
    running = true;
    tick();
    intervalId = setInterval(tick, 250);
  }

  function addSeconds(delta) {
    if (!running) return;
    endTime += delta * 1000;
    tick();
  }

  function skip() {
    if (!running) return;
    finish(true);
  }

  function stop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    running = false;
  }

  function isRunning() {
    return running;
  }

  return { start, addSeconds, skip, stop, isRunning };
}

export function formatSeconds(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
