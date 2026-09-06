import { get, put } from './db.js';

// Chaves de configuração conhecidas e seus valores padrão (T12 do plano).
export const DEFAULTS = {
  language: 'pt',
  unit: 'kg',
  theme: 'light',
  accent: 'orange',
  font_scale: 1,
  high_contrast: false,
  sound_enabled: true,
  vibration_enabled: true,
  keep_awake: true,
  default_rest_seconds: 90,
  plate_set: [25, 20, 15, 10, 5, 2.5, 1.25],
  bar_weight: 20,
  onboarding_done: false,
  seed_version: 0,
  gemini_api_key: ''
};

// Chaves espelhadas em localStorage para o boot síncrono (contrato da T08).
const MIRRORED_KEYS = {
  theme: 'mp_theme',
  accent: 'mp_accent',
  font_scale: 'mp_font_scale'
};

export async function getSetting(key, fallback = DEFAULTS[key]) {
  const record = await get('settings', key);
  return record ? record.value : fallback;
}

export async function setSetting(key, value) {
  await put('settings', { key, value });
  const mirrorKey = MIRRORED_KEYS[key];
  if (mirrorKey) {
    try {
      localStorage.setItem(mirrorKey, String(value));
    } catch (e) {
      // localStorage indisponível (modo privado etc.) — não é fatal,
      // só significa que o próximo boot vai recalcular a partir do banco.
    }
  }
  return value;
}

export async function getAllSettings() {
  const result = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    result[key] = await getSetting(key, DEFAULTS[key]);
  }
  return result;
}
