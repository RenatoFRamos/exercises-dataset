// Casa um nome de exercício em texto livre (ex.: vindo de um custom_name
// digitado por uma IA externa, sem exercise_id) com um exercício real do
// catálogo, por similaridade de palavras — para que treinos montados por IA
// ganhem a foto/gif real do exercício mesmo sem o ID exato.
//
// Comparação puramente local (nenhuma chamada de rede), baseada em
// sobreposição de palavras (Jaccard) sobre o nome em inglês e em português
// de cada candidato — cobre o caso comum de a IA responder em português.

import exerciseNamesPt from '../data/generated/exercise-names-pt.json';

const STOPWORDS = new Set(['com', 'de', 'da', 'do', 'e', 'a', 'o', 'em', 'no', 'na', 'with', 'and', 'the', 'a', 'of']);

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

function tokenize(text) {
  return new Set(normalize(text).split(/\s+/).filter((w) => w && !STOPWORDS.has(w)));
}

function jaccard(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

// Score mínimo para aceitar um match — abaixo disso, é mais seguro deixar
// sem exercise_id (sem foto) do que arriscar mostrar o exercício errado.
const MIN_SCORE = 0.5;

export function matchExerciseByName(rawName, allExercises) {
  const nameTokens = tokenize(rawName);
  if (!nameTokens.size) return null;

  let best = null;
  let bestScore = 0;

  for (const candidate of allExercises) {
    const enScore = jaccard(nameTokens, tokenize(candidate.name));
    const ptName = exerciseNamesPt[candidate.id];
    const ptScore = ptName ? jaccard(nameTokens, tokenize(ptName)) : 0;
    const score = Math.max(enScore, ptScore);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return bestScore >= MIN_SCORE ? best : null;
}
