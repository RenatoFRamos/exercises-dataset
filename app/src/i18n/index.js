import { pt } from './pt.js';
import { en } from './en.js';
import exerciseNamesPt from '../data/generated/exercise-names-pt.json';

const DICTS = { pt, en };
let currentLang = 'pt';

export function setLanguage(lang) {
  currentLang = DICTS[lang] ? lang : 'pt';
}

export function getLanguage() {
  return currentLang;
}

export function t(key, vars = {}) {
  const dict = DICTS[currentLang] || DICTS.pt;
  let str = dict[key] ?? DICTS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

// Dicionários auxiliares para termos que vêm do dataset (não têm PT nativo —
// regra 3.1 do APP_RULES). Usados pela biblioteca/filtros/detalhe.
export function tBodyPart(value) {
  return t(`body_part.${value}`) !== `body_part.${value}` ? t(`body_part.${value}`) : value;
}

export function tEquipment(value) {
  return t(`equipment.${value}`) !== `equipment.${value}` ? t(`equipment.${value}`) : value;
}

export function tMuscle(value) {
  return t(`muscle.${value}`) !== `muscle.${value}` ? t(`muscle.${value}`) : value;
}

// Nome do exercício (título do card/detalhe) traduzido — o dataset original
// só traz nomes em inglês. Tradução gerada por dicionário de termos +
// regras (scripts/translate-names.cjs), não é uma tradução profissional
// palavra por palavra; cobre ~98% dos 1.324 registros de forma compreensível.
// Cai para o nome em inglês quando o idioma é EN ou quando não há entrada.
export function tExerciseName(exercise) {
  if (!exercise) return '';
  if (currentLang === 'pt' && exerciseNamesPt[exercise.id]) {
    return exerciseNamesPt[exercise.id];
  }
  return exercise.name;
}

// Busca por nome funciona digitando em inglês OU português, já que o nome
// exibido muda com o idioma mas o usuário pode estar acostumado com o outro.
export function exerciseMatchesSearch(exercise, term) {
  const needle = term.toLowerCase();
  if (exercise.name.toLowerCase().includes(needle)) return true;
  const ptName = exerciseNamesPt[exercise.id];
  return ptName ? ptName.toLowerCase().includes(needle) : false;
}
