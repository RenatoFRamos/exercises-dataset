// Variante EXPERIMENTAL #2 de exercises-embedded.json: usa os gifs
// convertidos para WebP lossy q30 (mais agressivo que o teste anterior, q80)
// — testando se um corte maior no tamanho da mídia é o que falta pra abrir
// no Safari/iOS. Não mexe em nenhum arquivo já existente.
// Rodar manualmente: node scripts/embed-media-webp-q30-test.cjs

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPO_ROOT = path.join(ROOT, '..');
const SOURCE_JSON = path.join(ROOT, 'src/data/generated/exercises.json');
const IMAGES_DIR = path.join(REPO_ROOT, 'images');
const WEBP_DIR = 'C:/Users/ramos/AppData/Local/Temp/claude/C--Users-ramos-OneDrive-Documents-repo-MeuPersonal/45a86a2b-e701-4c46-a186-1e2ed47df579/scratchpad/webp-test/videos-webp-q30';
const OUT_JSON = path.join(ROOT, 'src/data/generated/exercises-embedded-webp-q30.json');

function toDataUri(absPath, mime) {
  const buffer = fs.readFileSync(absPath);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function main() {
  const exercises = JSON.parse(fs.readFileSync(SOURCE_JSON, 'utf8'));
  const total = exercises.length;
  const startedAt = Date.now();

  for (let i = 0; i < total; i++) {
    const ex = exercises[i];
    const imageAbs = path.join(IMAGES_DIR, path.basename(ex.image));
    ex.image = toDataUri(imageAbs, 'image/jpeg');

    const webpName = path.basename(ex.gif_url).replace(/\.gif$/, '.webp');
    const webpAbs = path.join(WEBP_DIR, webpName);
    ex.gif_url = toDataUri(webpAbs, 'image/webp');

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
