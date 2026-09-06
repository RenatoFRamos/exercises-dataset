import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Com build.rollupOptions.output.format:'iife', o JS embutido já não usa
// mais sintaxe de módulo ES (import/export/import.meta) — mas o Vite ainda
// emite a tag <script type="module" crossorigin> por padrão, hardcoded,
// independente do formato do conteúdo. Esses dois atributos foram a causa
// real do app não abrir em alguns navegadores via file:// (módulos ES têm
// regras de CORS mais rígidas; file:// vira uma origem opaca/nula, o que
// quebra a checagem). Como o conteúdo já é um IIFE comum, é seguro removê-los.
function stripModuleAttrsPlugin() {
  return {
    name: 'strip-module-attrs',
    apply: 'build',
    closeBundle() {
      const outFile = path.join(process.cwd(), 'dist', 'index.html');
      if (!fs.existsSync(outFile)) return;
      let html = fs.readFileSync(outFile, 'utf8');
      html = html.replace(/<script\s+type="module"\s+crossorigin>/, '<script>');
      html = html.replace(/<style\s+rel="stylesheet"\s+crossorigin>/, '<style>');
      fs.writeFileSync(outFile, html);
    }
  };
}

// Saída final: UM arquivo index.html autocontido (JS/CSS inline, dataset E
// mídia embutidos como data: URIs) — abre com duplo-clique via file://, sem
// servidor, sem pastas ao lado. O dataset com mídia embutida (~190 MB) é
// gerado por scripts/embed-media.cjs antes deste build.
//
// minify:false é proposital: minificar uma string JSON de ~190 MB só gasta
// memória e tempo sem reduzir nada de verdade (não há espaço em branco ou
// nomes de variável para encurtar dentro de uma string de dados) — foi o que
// estourava o heap do Node no build.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile(), stripModuleAttrsPlugin()],
  server: {
    port: 5173
  },
  // json.stringify: por padrão, o Vite transforma um JSON importado em um
  // literal de objeto/array JAVASCRIPT (`{ id: "...", gif_url: "..." }`) —
  // para um dataset de ~190MB isso vira um trecho de CÓDIGO gigante que o
  // motor JS precisa interpretar como programa, não como dado. Com
  // stringify:true, o Vite gera `JSON.parse("...")` em vez disso — a mesma
  // informação, mas como uma STRING que passa pelo parser de JSON nativo
  // (muito mais rápido e mais leve que interpretar como JS). Suspeita de
  // ser a causa real do travamento no Safari/iOS mesmo depois de reduzir a
  // mídia embutida — nenhum import de JSON no projeto usa named exports
  // (todos usam `import x from '...json'`), então essa mudança é segura em
  // todo o app.
  json: {
    stringify: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    minify: false,
    // format: 'iife' — por padrão o Vite gera um script ES module
    // (<script type="module" crossorigin>). Descobrimos que isso pode
    // travar a execução ao abrir o HTML via file:// em alguns navegadores
    // (módulos ES têm regras de CORS mais rígidas, e file:// costuma virar
    // uma origem "opaca"/nula, o que quebra a checagem). IIFE gera um script
    // COMUM (sem type="module", sem crossorigin) que roda sem essas regras.
    // main.js já espera o DOMContentLoaded antes de chamar boot(), então a
    // mudança de timing de execução (módulo adia por padrão, script comum
    // não) não quebra nada.
    rollupOptions: {
      output: {
        format: 'iife'
      }
    }
  }
});
