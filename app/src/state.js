// Estado global mínimo em memória — preferências já resolvidas (evita reler
// o banco toda hora) e um pequeno barramento de eventos para as views
// reagirem a mudanças (ex.: troca de tema/idioma) sem precisar de framework.

const state = {
  settings: null, // preenchido por main.js após getAllSettings()
  activeSessionId: null
};

const listeners = new Map();

export function getState() {
  return state;
}

export function setSettingsCache(settings) {
  state.settings = settings;
}

export function updateSettingsCache(patch) {
  state.settings = { ...state.settings, ...patch };
  emit('settings-changed', state.settings);
}

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => listeners.get(event).delete(handler);
}

export function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  for (const handler of set) handler(payload);
}
