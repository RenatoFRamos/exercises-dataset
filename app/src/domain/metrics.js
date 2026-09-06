// Métricas de domínio (T40). Funções puras — sem acesso a banco, sem I/O.
// Séries de aquecimento (is_warmup) são sempre ignoradas, em todas as três.

// Fórmula de Epley, com caso especial: o 1RM de uma única repetição máxima
// é a própria carga, não weight * (1 + 1/30) — a fórmula pura erraria isso
// (defeito #10 corrigido na revisão do plano).
export function estimate1RM(weightKg, reps) {
  if (weightKg == null || reps == null) return null;
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

function validSets(sets) {
  return sets.filter((s) => !s.is_warmup);
}

// Retorna a chave de semana ISO (ano-semana) de uma data, para agrupar volume.
export function isoWeekKey(dateInput) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

// sets: session_sets já unidos com a sessão (precisam de completed_at) e o
// exercício (precisam de body_part). exerciseById: Map<id, exercise>.
export function weeklyVolumeByMuscle(sets, exerciseById) {
  const result = {};
  for (const s of validSets(sets)) {
    const exercise = exerciseById.get(s.exercise_id);
    const bodyPart = exercise ? exercise.body_part : 'other';
    const week = isoWeekKey(s.completed_at);
    result[week] = result[week] || {};
    result[week][bodyPart] = (result[week][bodyPart] || 0) + 1;
  }
  return result;
}

// Identifica o exercício de forma estável mesmo quando é customizado
// (exercise_id null) — casando por custom_name, conforme T32.
export function matchKey(set) {
  return set.exercise_id ? `id:${set.exercise_id}` : `name:${(set.custom_name || '').trim().toLowerCase()}`;
}

// history: session_sets anteriores do MESMO exercício (já filtrado por matchKey).
export function detectPRs(newSets, history) {
  const prevMaxWeight = Math.max(0, ...validSets(history).map((s) => s.weight_kg || 0));
  const prevMaxReps = Math.max(0, ...validSets(history).map((s) => s.reps || 0));

  let weightPR = false;
  let repsPR = false;
  let bestWeight = 0;
  let bestReps = 0;

  for (const s of validSets(newSets)) {
    if ((s.weight_kg || 0) > prevMaxWeight && (s.weight_kg || 0) > bestWeight) {
      weightPR = true;
      bestWeight = s.weight_kg;
    }
    if ((s.reps || 0) > prevMaxReps && (s.reps || 0) > bestReps) {
      repsPR = true;
      bestReps = s.reps;
    }
  }

  return { weightPR, repsPR, bestWeight, bestReps, prevMaxWeight, prevMaxReps };
}

// Volume total de uma sessão = soma de (peso x reps) das séries válidas.
export function sessionVolume(sets) {
  return validSets(sets).reduce((total, s) => total + (s.weight_kg || 0) * (s.reps || 0), 0);
}

export function lastValidSets(history) {
  return validSets(history);
}
