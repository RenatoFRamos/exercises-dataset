// Único ponto de conversão de unidade de peso do app (regra 10 do plano).
// O banco SEMPRE guarda quilogramas (campos weight_kg / body_weight_kg).
// kg <-> lb só acontece na borda da UI (exibição e entrada de dados).

const KG_PER_LB = 1 / 2.20462;
const LB_PER_KG = 2.20462;

export function toDisplay(kg, unit) {
  if (kg == null || Number.isNaN(kg)) return null;
  const value = unit === 'lb' ? kg * LB_PER_KG : kg;
  return Math.round(value * 100) / 100;
}

export function fromInput(value, unit) {
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
  if (num == null || Number.isNaN(num)) return null;
  const kg = unit === 'lb' ? num * KG_PER_LB : num;
  return Math.round(kg * 100) / 100;
}

export function unitLabel(unit) {
  return unit === 'lb' ? 'lb' : 'kg';
}
