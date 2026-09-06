import { putMany, getAll } from './db.js';
import { getSetting, setSetting } from './settings.js';
import exercises from './generated/exercises-embedded-webp-q30.json';

// O dataset é importado (não buscado via fetch) porque o app final é um
// único arquivo HTML aberto via file:// — fetch() de outro arquivo local
// falha nesse contexto. O bundler embute o JSON inteiro no bundle.
//
// exercises-embedded-webp-q30.json traz `image`/`gif_url` como data: URIs
// (gif convertido para WebP, gerado pelo processo de teste em scripts/) — o
// app final não depende de nenhuma pasta de mídia externa.
//
// Import ESTÁTICO (não dinâmico): um `import()` dinâmico obriga o Rollup a
// gerar código que referencia `import.meta.url`, que só é válido dentro de
// um script type="module" — e descobrimos que módulos ES podem falhar
// silenciosamente ao abrir o HTML via file:// em alguns navegadores móveis.
// Trocamos o build inteiro para gerar um script comum (build.rollupOptions.
// output.format: 'iife', ver vite.config.js), o que exige eliminar todo
// import() dinâmico do código-fonte. Custo: o dataset é decodificado a cada
// carregamento da página, mesmo quando já semeado — aceitável frente ao
// ganho de compatibilidade.

// Versão do seed — subir este número força recarregar o dataset embarcado
// (usado se um dia o exercises.json for atualizado dentro do app).
const CURRENT_SEED_VERSION = 1;

export async function seedIfNeeded() {
  const seededVersion = await getSetting('seed_version', 0);
  if (seededVersion >= CURRENT_SEED_VERSION) {
    return { seeded: false };
  }

  await putMany('exercises', exercises);
  await setSetting('seed_version', CURRENT_SEED_VERSION);

  return { seeded: true, count: exercises.length };
}

export async function exerciseCount() {
  const all = await getAll('exercises');
  return all.length;
}
