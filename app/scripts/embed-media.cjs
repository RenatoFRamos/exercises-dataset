// Gera src/data/generated/exercises-embedded.json: o mesmo dataset de
// exercises.json, mas com `image` e `gif_url` trocados por data: URIs
// (base64) das mídias — para o app final não depender de nenhuma pasta
// externa, um único arquivo HTML mesmo. Rodar com: node scripts/embed-media.cjs
//
// Não é chamado automaticamente pelo `npm run build` (é lento e gera um
// artefato pesado) — rode manualmente quando quiser essa variante.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE_JSON = path.join(ROOT, 'src/data/generated/exercises.json');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT_JSON = path.join(ROOT, 'src/data/generated/exercises-embedded.json');

function toDataUri(relativePath) {
  const absPath = path.join(PUBLIC_DIR, relativePath);
  const buffer = fs.readFileSync(absPath);
  const ext = path.extname(relativePath).toLowerCase();
  const mime = ext === '.gif' ? 'image/gif' : ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function main() {
  const exercises = JSON.parse(fs.readFileSync(SOURCE_JSON, 'utf8'));
  const total = exercises.length;
  const startedAt = Date.now();

  for (let i = 0; i < total; i++) {
    const ex = exercises[i];
    ex.image = toDataUri(ex.image);
    ex.gif_url = toDataUri(ex.gif_url);
    if ((i + 1) % 200 === 0 || i === total - 1) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`  ${i + 1}/${total} embutidos (${elapsed}s)`);
    }
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(exercises));
  const sizeMB = (fs.statSync(OUT_JSON).size / (1024 * 1024)).toFixed(1);
  console.log(`OK: ${OUT_JSON} — ${sizeMB} MB`);
}

main();
