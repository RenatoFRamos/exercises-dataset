// Calculadora de anilhas (T44). Estratégia gulosa (maior anilha primeiro) —
// suficiente para conjuntos padrão de academia, onde funciona de forma ótima.
// Trabalha em centigramas (inteiros) para evitar erro de ponto flutuante
// com valores como 1.25 kg.

export function calculatePlates(targetKg, barKg, plateSet) {
  const perSideTarget = (targetKg - barKg) / 2;

  if (perSideTarget <= 0) {
    return { exact: targetKg === barKg, perSide: [], perSideWeight: 0, achievedTotal: barKg };
  }

  const sorted = [...plateSet].filter((p) => p > 0).sort((a, b) => b - a);
  let remainingCents = Math.round(perSideTarget * 100);
  const used = [];

  for (const plate of sorted) {
    const plateCents = Math.round(plate * 100);
    const count = Math.floor(remainingCents / plateCents);
    for (let i = 0; i < count; i++) used.push(plate);
    remainingCents -= count * plateCents;
  }

  const achievedPerSideCents = Math.round(perSideTarget * 100) - remainingCents;
  const achievedPerSide = achievedPerSideCents / 100;
  const achievedTotal = Math.round((barKg + achievedPerSide * 2) * 100) / 100;

  return {
    exact: remainingCents === 0,
    perSide: used,
    perSideWeight: achievedPerSide,
    achievedTotal
  };
}
