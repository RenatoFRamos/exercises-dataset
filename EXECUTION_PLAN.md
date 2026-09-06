# Plano de Execução — App MeuPersonal

> **Para quem executa este plano:** siga as tarefas **na ordem**, uma por vez. Cada tarefa é pequena, tem arquivos explícitos e um critério de aceite verificável. **Não pule etapas, não invente funcionalidades, não refatore o que já está pronto e funcionando.**
>
> Documento de regras do produto: [APP_RULES.md](APP_RULES.md). Em caso de dúvida sobre *o que* construir, consulte-o. Este documento define *como* e *em que ordem*.
>
> Versão revisada — ver [changelog da revisão](#7-changelog-da-revisão) no fim do arquivo.

---

## 0. Regras permanentes de execução

Valem para **todas** as tarefas. Releia antes de cada fase.

1. **Uma tarefa por vez.** Conclua e valide o critério de aceite antes de ir para a próxima.
2. **Não adicione dependências** fora da lista da T02. Três delas são de instalação adiada e só podem ser instaladas quando a tarefa indicada chegar.
3. **Não altere** [APP_RULES.md](APP_RULES.md) nem este arquivo. São a fonte da verdade.
4. **Não altere** `data/`, `images/`, `videos/`, `README.md`, `LICENSE`, `NOTICE.md`, `index.html` ou `setup.html` **na raiz** — são o dataset original e suas ferramentas. O app novo vive inteiramente dentro de `app/`.
5. **Sem `px` em tamanho de texto.** Sempre `rem`, senão o controle de fonte (regra 5.6 do APP_RULES) não funciona.
6. **Sem cor hardcoded em componente.** Literais de cor (hex/rgb) só podem existir em `app/src/styles/tokens.css` e `app/src/styles/themes.css`. Em qualquer outro arquivo, use `var(--token)`.
7. **Sem rede externa.** Nenhuma requisição a servidor externo, nenhuma fonte via Google Fonts, nenhuma biblioteca por CDN, nenhuma telemetria. **`fetch` de arquivo local empacotado no app (ex.: `/data/exercises.json`) é permitido e esperado** — a proibição é de host externo, não de leitura de asset local.
8. **Acesso a dados só pelo módulo `app/src/data/db.js`.** Nenhuma view fala com o armazenamento diretamente.
9. **Acesso a recurso nativo só pelos módulos de `app/src/platform/`.** Nenhuma view importa plugin do Capacitor diretamente (motivo na T17).
10. **Unidade canônica é quilograma.** Toda carga é **gravada em kg** no banco, sempre. A preferência `unit` afeta **somente a exibição e a entrada** (converter na borda da UI). Nunca gravar libras no banco — isso corromperia o histórico quando o usuário trocasse de unidade.
11. **Comentários:** só quando o *porquê* não for óbvio. Não comente o que o código já diz.
12. **Ao terminar cada fase**, rode `npm run build` dentro de `app/` e garanta que não há erro.

---

## 1. Stack definida (não é para decidir, é para usar)

| Item | Escolha |
|---|---|
| Linguagem | JavaScript (ES Modules), sem TypeScript |
| UI | HTML + CSS puro, **sem framework** (sem React/Vue/Angular) |
| Build | Vite + `vite-plugin-singlefile` (saída: um único `dist/index.html`) |
| Empacotamento | Nenhum — o entregável é o `index.html` gerado, aberto direto via `file://` (ver seção 3 do APP_RULES) |
| Armazenamento | IndexedDB do navegador, único backend |
| Estilo | CSS com variáveis (tokens), sem Tailwind, sem Sass |

**Por que sem framework:** o app é majoritariamente listas, formulários e uma tela de execução. Vanilla mantém a superfície de erro pequena e o bundle leve.

**Por que sem Capacitor/wrapper nativo:** decisão revertida em 2026-09-05 — o pedido é um HTML que roda em qualquer lugar sem instalar nada; Capacitor exige build por plataforma (Node, Android Studio/JDK, Electron), o oposto disso. Ver seção 3 do APP_RULES para a troca aceita (aviso do timer sem garantia com tela bloqueada).

**Sobre o armazenamento:** IndexedDB é o único backend, do início ao fim — não há migração para outro banco. Isso é coerente com a decisão de entregável em HTML único (seção 3 do APP_RULES): sem camada nativa, não há SQLite disponível de qualquer forma.

---

## 2. Estrutura de pastas alvo

```
app/
├── index.html
├── package.json
├── vite.config.js
├── capacitor.config.json
├── public/
│   ├── data/exercises.json      # cópia do dataset da raiz
│   ├── images/                  # cópia de images/ da raiz (1324 arquivos)
│   ├── videos/                  # cópia de videos/ da raiz (1324 arquivos)
│   └── templates/               # treinos-modelo (.treino.json)
└── src/
    ├── main.js                  # ponto de entrada
    ├── router.js                # navegação entre telas
    ├── state.js                 # estado global em memória
    ├── data/
    │   ├── db.js                # ÚNICO módulo que fala com armazenamento
    │   ├── schema.js            # definição das coleções
    │   ├── seed.js              # carrega exercises.json para o banco
    │   └── settings.js          # leitura/escrita de configurações
    ├── domain/
    │   ├── metrics.js           # 1RM, volume, PR
    │   ├── alternatives.js      # exercícios alternativos
    │   ├── plates.js            # calculadora de anilhas
    │   ├── units.js             # conversão kg/lb (só exibição)
    │   └── workout-file.js      # validação/serialização do .treino.json
    ├── i18n/
    │   ├── index.js
    │   ├── pt.js
    │   └── en.js
    ├── platform/
    │   ├── capabilities.js      # detecta plataforma e disponibilidade
    │   ├── notifications.js     # notificação local (+ fallback web)
    │   ├── haptics.js           # vibração (+ fallback web)
    │   ├── keep-awake.js        # wake lock (+ fallback web)
    │   ├── sound.js             # bipe via Web Audio (sem arquivo de áudio)
    │   ├── back-button.js       # botão voltar do Android
    │   └── files.js             # importar/exportar arquivo
    ├── components/
    │   ├── exercise-card.js
    │   ├── image-zoom.js
    │   ├── rest-timer.js
    │   └── modal.js
    ├── views/
    │   ├── onboarding.js
    │   ├── library.js
    │   ├── exercise-detail.js
    │   ├── workouts.js
    │   ├── workout-edit.js
    │   ├── session-active.js
    │   ├── history.js
    │   ├── calendar.js
    │   ├── progress.js
    │   └── settings.js
    └── styles/
        ├── tokens.css           # variáveis: cores, escala de fonte
        ├── themes.css           # claro, escuro, alto contraste
        ├── base.css             # reset + tipografia
        └── components.css
```

---

## FASE 0 — Setup do projeto

### T01 — Criar o projeto Vite
- **Arquivos:** `app/package.json`, `app/vite.config.js`, `app/index.html`, `app/src/main.js`
- **Passos:** criar a pasta `app/` e inicializar um projeto Vite **vanilla** (sem framework). `index.html` com apenas `<div id="app"></div>` e import de `/src/main.js` como módulo.
- **Aceite:** `npm run dev` sobe o servidor e mostra a página sem erro no console.
- **Depende de:** —

### T02 — Instalar dependências (lista fechada)
- **Instalar agora — produção:** `@capacitor/core`, `@capacitor/android`, `@capacitor/app`, `@capacitor/local-notifications`, `@capacitor/haptics`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor-community/keep-awake`
- **Instalar agora — desenvolvimento:** `vite`, `@capacitor/cli`
- **Instalação adiada (autorizadas, mas só quando a tarefa chegar):**
  - `@capacitor-community/sqlite` → instalar na **T52**
  - `@capacitor-community/electron` → instalar na **T55**
- **Aceite:** `npm install` conclui sem erro e `package.json` contém exatamente as dependências de "instalar agora", nenhuma a mais.
- **Depende de:** T01

### T03 — Copiar dataset e mídia para `public/`
- **Passos:** copiar `data/exercises.json` → `app/public/data/exercises.json`; copiar `images/` e `videos/` da raiz → `app/public/images/` e `app/public/videos/`.
- **Aceite:** `app/public/images/` e `app/public/videos/` têm **exatamente 1324 arquivos cada** (verificar por contagem).
- **Atenção:** são ~139 MB duplicados. É intencional (o Vite serve e empacota a partir de `public/`). Se um dia o dataset da raiz for atualizado, **esta cópia precisa ser refeita** — as duas não se sincronizam sozinhas.
- **Depende de:** T01

### T04 — Inicializar o Capacitor
- **Arquivos:** `app/capacitor.config.json`
- **Passos:** `npx cap init` com appId `com.meupersonal.app`, appName `MeuPersonal`, webDir `dist`.
- **Aceite:** `capacitor.config.json` existe com esses valores.
- **Depende de:** T02

---

## FASE 1 — Design system (fonte e temas primeiro)

> Feito **antes** das telas, porque toda tela depende destes tokens. Regra 5.6 do APP_RULES.

### T05 — Tokens de cor e escala de fonte
- **Arquivos:** `app/src/styles/tokens.css`
- **Passos:** definir em `:root`: `--font-scale` (padrão `1`), `--bg-base`, `--bg-surface`, `--bg-elevated`, `--border`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--accent`, `--accent-contrast`, `--danger`, `--success`, `--radius-sm/md/lg`, `--space-1..6`.
- **Aceite:** o arquivo existe e nenhum literal de cor aparece em CSS fora de `tokens.css` e `themes.css`.
- **Depende de:** T01

### T06 — Tipografia baseada em escala
- **Arquivos:** `app/src/styles/base.css`
- **Passos:** reset básico. Definir **`html { font-size: calc(100% * var(--font-scale)); }`**.
  - **Use `100%`, nunca `16px`.** Com `100%`, a base herda o tamanho de fonte configurado no sistema operacional/navegador e o `--font-scale` multiplica por cima — que é exatamente o que o APP_RULES 5.6 exige ("respeitar o ajuste de fonte do sistema operacional como valor inicial"). Fixar em `px` anularia a preferência do usuário no SO.
  - Todos os tamanhos de texto em `rem`. Classes utilitárias `.text-sm`, `.text-base`, `.text-lg`, `.text-xl`.
- **Aceite:** mudar `--font-scale` para `1.6` no DevTools aumenta **todo** o texto proporcionalmente; aumentar a fonte padrão do navegador também aumenta o app.
- **Depende de:** T05

### T07 — Temas claro, escuro e alto contraste
- **Arquivos:** `app/src/styles/themes.css`
- **Passos:** redefinir os tokens de cor sob `[data-theme="light"]`, `[data-theme="dark"]` e `[data-theme="high-contrast"]`, aplicados por atributo `data-theme` no `<html>`. Cor de destaque por atributo separado `data-accent` (mínimo 4 opções).
- **Aceite:** trocar `data-theme` no DevTools muda toda a paleta; contraste texto/fundo ≥ 4.5:1 nos três temas.
- **Depende de:** T05

### T08 — Aplicar tema e fonte na inicialização, sem flash
- **Arquivos:** `app/index.html` (script inline no `<head>`)
- **Problema a resolver:** o IndexedDB é **assíncrono** — é impossível ler dele antes da primeira pintura. Ler as preferências do banco causaria flash de tema errado, proibido pelo APP_RULES 5.6.
- **Solução obrigatória:** manter um **espelho síncrono em `localStorage`** apenas para os dois valores críticos de boot: `theme` e `font_scale`.
  - Script inline no `<head>` (antes de qualquer CSS ou JS de app) lê `localStorage` e aplica `data-theme`, `data-accent` e `--font-scale` no `<html>`.
  - Se não houver valor salvo, usar `window.matchMedia('(prefers-color-scheme: dark)')`.
  - O `localStorage` aqui é só um cache de exibição descartável; a fonte da verdade continua sendo o IndexedDB. Se o cache sumir, o app relê do banco e o reescreve.
- **Aceite:** com tema escuro salvo, recarregar a página **não** mostra nenhum flash branco.
- **Depende de:** T07

---

## FASE 2 — Camada de dados

### T09 — Definir o schema
- **Arquivos:** `app/src/data/schema.js`
- **Passos:** declarar as coleções abaixo. IndexedDB com um object store por coleção; `id` como chave primária (string UUID via `crypto.randomUUID()`), exceto `exercises` (usa o `id` do dataset) e `settings` (usa `key`).

| Coleção | Campos |
|---|---|
| `exercises` | todos os campos do dataset (somente leitura após o seed) |
| `settings` | `key`, `value` |
| `favorites` | `exercise_id` |
| `exercise_notes` | `exercise_id`, `note` |
| `workouts` | `id`, `name`, `description`, `created_at`, `updated_at`, `archived` |
| `workout_days` | `id`, `workout_id`, `label`, `order_index` |
| `workout_exercises` | `id`, `day_id`, `exercise_id`, `custom_name`, `order_index`, `sets`, `reps`, `rest_seconds`, `warmup_sets`, `set_type`, `superset_group`, `notes` |
| `sessions` | `id`, `workout_id`, `day_id`, `name`, `started_at`, `finished_at`, `duration_seconds`, `notes`, `status` |
| `session_sets` | `id`, `session_id`, `exercise_id`, `custom_name`, `order_index`, `set_index`, `is_warmup`, `set_type`, `weight_kg`, `reps`, `completed_at` |
| `body_measurements` | `id`, `date`, `body_weight_kg`, `arm`, `chest`, `waist`, `thigh`, `notes` |

- **Nota:** os campos de peso se chamam `weight_kg` e `body_weight_kg` de propósito — o sufixo torna a regra 10 (sempre kg) impossível de esquecer.
- **Aceite:** arquivo exporta a definição das 10 coleções com seus campos.
- **Depende de:** T01

### T10 — Módulo de acesso a dados
- **Arquivos:** `app/src/data/db.js`
- **Passos:** implementar sobre IndexedDB e expor **apenas** esta interface:
  - `init()`
  - `get(collection, id)`
  - `getAll(collection)`
  - `query(collection, criteria)` — `criteria` é um **objeto simples de igualdade**, ex.: `query('workout_days', { workout_id: 'abc' })`
  - `put(collection, record)`
  - `putMany(collection, records)`
  - `remove(collection, id)`
  - `clear(collection)`
- **Regra crítica — por que `criteria` é objeto e não função:** manter a interface simples e previsível. Filtros mais complexos (busca por texto, faixas) são feitos em JavaScript **fora** do `db.js`, sobre o resultado de `getAll`/`query`.
- **Regra crítica:** nenhum detalhe de IndexedDB pode vazar deste arquivo (sem `IDBRequest`, sem `onsuccess`, sem transações expostas). Tudo retorna Promise de dados puros.
- **Aceite:** gravar e ler um registro em `workouts` pelo console; `query('workout_days', { workout_id: x })` retorna só os dias daquele treino.
- **Depende de:** T09

### T11 — Seed do dataset
- **Arquivos:** `app/src/data/seed.js`
- **Passos:** na primeira execução, `fetch('/data/exercises.json')` (asset local — permitido pela regra 7) e gravar os 1.324 registros em `exercises` usando **uma única transação em lote** (`putMany`). Gravar `seed_version` em `settings` para não repetir o seed.
- **Exibir tela de carregamento** durante o seed: são ~17 MB de JSON e 1.324 escritas; sem indicador, o primeiro uso parece travado.
- **Aceite:** após a primeira carga, `getAll('exercises')` retorna **1324** registros; recarregar a página **não** repete o seed (o segundo carregamento é visivelmente instantâneo).
- **Depende de:** T10

### T12 — Módulo de configurações
- **Arquivos:** `app/src/data/settings.js`, `app/src/domain/units.js`
- **Passos:**
  - `getSetting(key, default)` / `setSetting(key, value)` sobre a coleção `settings`. Chaves: `language`, `unit`, `theme`, `accent`, `font_scale`, `high_contrast`, `sound_enabled`, `vibration_enabled`, `keep_awake`, `default_rest_seconds`, `plate_set`, `onboarding_done`, `seed_version`.
  - Ao gravar `theme`, `accent` ou `font_scale`, **espelhar também em `localStorage`** (contrato da T08).
  - `units.js`: `toDisplay(kg, unit)` e `fromInput(value, unit)` — únicos pontos de conversão do app (regra 10). Fator: 1 kg = 2.20462 lb.
- **Aceite:** valores persistem após recarregar; trocar para `lb` muda os números exibidos mas **não** altera nada no banco (verificar que `weight_kg` continua idêntico).
- **Depende de:** T10

---

## FASE 3 — Shell do app

### T13 — Roteador
- **Arquivos:** `app/src/router.js`
- **Passos:** roteador por hash que renderiza a view em `#app`. Rotas: `library`, `exercise/:id`, `workouts`, `workout/:id/edit`, `session/:id`, `history`, `calendar`, `progress`, `settings`, `onboarding`.
- **Aceite:** navegar pelo hash troca o conteúdo sem recarregar a página.
- **Depende de:** T01

### T14 — Layout responsivo com navegação
- **Arquivos:** `app/src/styles/components.css`, `app/src/main.js`
- **Passos:** navegação inferior em telas < 768px, lateral em ≥ 768px. Itens: Treinos, Biblioteca, Histórico, Progresso, Ajustes.
- **Aceite:** redimensionar alterna os dois layouts sem quebra, testado a 320px, 768px e 1440px.
- **Depende de:** T13, T06

### T15 — Botão voltar do Android
- **Arquivos:** `app/src/platform/back-button.js`
- **Passos:** usando `@capacitor/app`, tratar o botão físico/gesto de voltar: fecha modal aberto → senão volta na navegação → senão, na tela raiz, pede confirmação antes de sair do app.
- **Por que é obrigatório:** sem isso, o botão voltar do Android fecha o app no meio do treino. É defeito grave de usabilidade, não refinamento.
- **Aceite:** no Android, voltar fecha o zoom/modal e navega para trás; só sai do app na raiz e com confirmação.
- **Depende de:** T13

### T16 — Tela de configurações
- **Arquivos:** `app/src/views/settings.js`
- **Passos:** controles para escala de fonte (5 níveis: `0.85`, `1`, `1.15`, `1.3`, `1.6`), tema (claro/escuro/automático/alto contraste), cor de destaque (≥4), idioma, unidade de peso, som, vibração, wake lock, descanso padrão e conjunto de anilhas. Aplicar **ao vivo**.
- **Aceite:** mudar a escala de fonte altera o app inteiro na hora e persiste após recarregar (sem flash na volta).
- **Depende de:** T12, T14

---

## FASE 4 — Camada de plataforma

### T17 — Wrappers nativos com fallback web (fazer antes de qualquer uso)
- **Arquivos:** `app/src/platform/capabilities.js`, `notifications.js`, `haptics.js`, `keep-awake.js`, `sound.js`
- **Problema a resolver:** os plugins do Capacitor **não funcionam no navegador nem no Electron**. Chamá-los direto quebra o `npm run dev`, que o APP_RULES (seção 3, "Desenvolvimento no navegador") exige que funcione.
- **Passos:**
  - `capabilities.js`: exporta `isNative()` usando `Capacitor.isNativePlatform()` e um mapa do que está disponível na plataforma atual.
  - Cada wrapper expõe uma API simples (`notify()`, `vibrate()`, `enable()/disable()`, `beep()`) e **decide internamente**: no nativo chama o plugin; fora dele usa o fallback web ou vira **no-op silencioso**. Nunca lançar exceção por indisponibilidade.
  - Fallbacks: notificação → `Notification` API se permitida, senão aviso dentro da tela; vibração → `navigator.vibrate` se existir, senão nada; wake lock → `navigator.wakeLock` se existir, senão nada.
  - `sound.js`: gerar o bipe com **Web Audio API** (`OscillatorNode`, ~880 Hz, 2 bipes curtos). **Não usar arquivo de áudio** — não há `.mp3` disponível no projeto e gerar o tom por código elimina essa dependência.
- **Aceite:** rodar `npm run dev` no navegador e acionar todos os quatro recursos **sem nenhum erro no console**; o bipe toca no navegador.
- **Depende de:** T02

---

## FASE 5 — Biblioteca de exercícios

### T18 — Lista de exercícios com carga incremental
- **Arquivos:** `app/src/views/library.js`, `app/src/components/exercise-card.js`
- **Passos:** grade de cards com thumbnail (`images/...`), nome e grupo muscular. **Scroll infinito com lotes fixos de 60 itens** (append ao chegar perto do fim). Imagens com `loading="lazy"`.
  - Use scroll infinito, **não** virtualização com altura calculada — é mais simples e suficiente para 1.324 itens.
- **Aceite:** a lista rola de forma fluida com os 1.324 exercícios; abre exibindo apenas o primeiro lote.
- **Depende de:** T11, T14

### T19 — Busca e filtros
- **Arquivos:** `app/src/views/library.js`
- **Passos:** busca por nome (case-insensitive) e filtros combináveis por `body_part`, `equipment` e `target`, com opções extraídas do próprio dataset. Filtragem em JavaScript sobre os exercícios já carregados (não no `db.js` — ver T10).
- **Aceite verificado contra os dados reais:** buscar `"bench"` retorna **73** exercícios; filtrar `equipment = "body weight"` retorna **325**.
- **Depende de:** T18

### T20 — Tela de detalhe do exercício
- **Arquivos:** `app/src/views/exercise-detail.js`
- **Passos:** exibir GIF, nome, categoria, equipamento, músculo-alvo, secundários, instruções passo a passo (`instruction_steps`) e a atribuição `© Gym visual — https://gymvisual.com/` sempre visível. Botão de favoritar e campo de nota fixa do exercício.
- **Aceite verificado:** o exercício `0025` mostra o GIF, exatamente **7 passos** e a atribuição.
- **Depende de:** T18

### T21 — Zoom na imagem/GIF
- **Arquivos:** `app/src/components/image-zoom.js`
- **Passos:** clicar na mídia abre visualizador em tela cheia. Suportar pinch-to-zoom (touch), scroll do mouse e botões +/- (desktop), arraste para mover, botão fechar sempre visível, atribuição visível também no modo ampliado.
  - **Limitar o zoom máximo a 4×.** A mídia é 180×180 — acima disso vira só borrão. Aplicar `image-rendering: auto` para suavizar.
  - **Não tente obter mídia em resolução maior.** O [NOTICE.md](NOTICE.md) licencia estritamente 180×180; buscar imagens melhores em outra fonte violaria a licença.
- **Aceite:** funciona por toque no Android e por mouse no desktop; o botão fechar nunca sai da tela; zoom para no limite de 4×.
- **Depende de:** T20, T15

### T22 — Favoritos e histórico por exercício
- **Arquivos:** `app/src/views/exercise-detail.js`, `app/src/views/library.js`
- **Passos:** favoritar/desfavoritar (coleção `favorites`), filtro "somente favoritos" na biblioteca e uma aba no detalhe listando todas as séries já executadas naquele exercício (de `session_sets`).
- **Aceite:** favoritar persiste após recarregar; o histórico do exercício lista sessões passadas.
- **Depende de:** T20

---

## FASE 6 — Treinos

### T23 — Lista de treinos
- **Arquivos:** `app/src/views/workouts.js`
- **Passos:** listar `workouts` (nome, descrição, nº de dias). Ações: criar, editar, duplicar, arquivar, excluir com confirmação. Treinos arquivados ficam ocultos por padrão.
- **Aceite:** criar um treino faz ele aparecer e persistir após recarregar.
- **Depende de:** T10, T14

### T24 — Editor de treino: dias
- **Arquivos:** `app/src/views/workout-edit.js`
- **Passos:** adicionar, renomear, remover e reordenar dias (`workout_days`, campo `order_index`).
- **Aceite:** criar "Treino A" com 3 dias, recarregar, os 3 dias continuam na ordem certa.
- **Depende de:** T23

### T25 — Editor de treino: exercícios
- **Arquivos:** `app/src/views/workout-edit.js`
- **Passos:** adicionar exercícios ao dia a partir da biblioteca (reaproveitar a busca da T19). Campos: séries, repetições, descanso, séries de aquecimento, tipo de série (`normal`/`drop_set`/`rest_pause`), grupo de super série, notas. Reordenar e remover.
- **Aceite:** montar um dia com 5 exercícios incluindo um bi-set (dois com o mesmo `superset_group`), e tudo persistir.
- **Depende de:** T24

### T26 — Exercício customizado
- **Arquivos:** `app/src/views/workout-edit.js`
- **Passos:** adicionar exercício fora do catálogo, com `exercise_id = null` e `custom_name` preenchido.
- **Aceite:** o exercício customizado aparece no treino e pode ser executado normalmente depois.
- **Depende de:** T25

---

## FASE 7 — Import e export de arquivo

### T27 — Validador do formato `.treino.json`
- **Arquivos:** `app/src/domain/workout-file.js`
- **Passos:** `validate(obj)` conforme a seção 6 do APP_RULES. Verificar `schema_version`, `type === "meupersonal.workout"`, presença de `name` e `days`, e cada exercício com `exercise_id` existente no dataset **ou** `custom_name` preenchido. Validar também `set_type` (valores permitidos) e `warmup_sets ≤ sets`. Retornar **lista de erros legíveis**, nunca lançar exceção para o usuário.
- **Aceite:** arquivo válido passa; arquivo com `exercise_id` inexistente retorna erro apontando qual exercício e em qual dia.
- **Depende de:** T11

### T28 — Importar treino
- **Arquivos:** `app/src/platform/files.js`, `app/src/views/workouts.js`
- **Passos:** botão "Importar" abre `<input type="file">` (funciona em Android WebView, Electron e navegador — mais simples e portátil que plugin de file picker). Validar com T27, exibir **preview** (nome, dias, exercícios) e só gravar após confirmação.
- **Aceite:** importar arquivo válido cria o treino; importar inválido mostra os erros e **não grava nada**.
- **Depende de:** T27, T23

### T29 — Exportar treino
- **Arquivos:** `app/src/platform/files.js`
- **Passos:** exportar no mesmo formato. No navegador/Electron: download via Blob. No Android: gravar com `@capacitor/filesystem` e abrir o menu compartilhar (`@capacitor/share`). Decisão pela `capabilities.js` da T17.
- **Aceite:** exportar um treino e reimportá-lo recria exatamente o mesmo treino (ciclo fechado).
- **Depende de:** T28

### T30 — Backup e restauração completos
- **Arquivos:** `app/src/platform/files.js`, `app/src/views/settings.js`
- **Passos:** exportar **todos** os dados locais (treinos, dias, exercícios do treino, sessões, séries, medidas, favoritos, notas, configurações) num único JSON; restaurar a partir dele com confirmação explícita (sobrescreve tudo).
- **Aceite:** exportar → limpar o banco → restaurar devolve todos os dados idênticos.
- **Depende de:** T29

---

## FASE 8 — Execução do treino

> Fase mais crítica do app. Faça com cuidado extra e teste cada tarefa antes de seguir.

### T31 — Iniciar sessão
- **Arquivos:** `app/src/views/session-active.js`
- **Passos:** ao iniciar um dia, criar `sessions` com `status = 'in_progress'` e `started_at`, montando a lista de exercícios/séries planejadas. Cronômetro de duração total visível.
- **Aceite:** iniciar um treino cria a sessão e exibe os exercícios na ordem correta.
- **Depende de:** T25

### T32 — Referência da última sessão (funcionalidade central)
- **Arquivos:** `app/src/views/session-active.js`, `app/src/domain/metrics.js`
- **Passos:** para cada exercício, buscar em `session_sets` a última execução e exibir em destaque (ex.: "última: 4×8 @ 60 kg"), pré-preenchendo carga e reps como sugestão editável.
  - **Casar exercícios corretamente:** se `exercise_id` for `null` (exercício customizado), casar pelo `custom_name`. Caso contrário, pelo `exercise_id`. Ignorar séries de aquecimento nessa referência.
- **Aceite:** ao executar um exercício pela segunda vez, o app mostra e pré-preenche os dados da vez anterior — inclusive para exercício customizado.
- **Depende de:** T31

### T33 — Registrar séries
- **Arquivos:** `app/src/views/session-active.js`
- **Passos:** marcar série concluída gravando em `session_sets` (`weight_kg` **sempre em kg**, `reps`, `is_warmup`, `set_type`). Séries de aquecimento visualmente distintas e **excluídas** de volume/PR.
- **Aceite:** concluir 4 séries grava 4 registros; com a unidade em `lb`, digitar `100` grava `45.36` kg (conversão na borda, conforme regra 10).
- **Depende de:** T32

### T34 — Cronômetro de descanso
- **Arquivos:** `app/src/components/rest-timer.js`
- **Passos:** ao concluir uma série, iniciar automaticamente a contagem com o descanso do exercício. Botões: pular, +15s, −15s. Em super série (mesmo `superset_group`), **não** descansar entre os exercícios do grupo — só ao fim do grupo.
  - Basear a contagem em **timestamp** (`Date.now()`), não em soma de `setInterval` — senão o tempo erra quando a aba fica em segundo plano.
- **Aceite:** o timer inicia sozinho, permanece preciso após o app ficar 1 minuto em segundo plano, e respeita a regra da super série.
- **Depende de:** T33

### T35 — Avisos de fim de descanso
- **Arquivos:** `app/src/views/session-active.js` (usando os wrappers da T17)
- **Passos:** ao zerar o cronômetro: bipe (`sound.js`), vibração (`haptics.js`) e notificação local (`notifications.js`), cada um respeitando sua preferência em configurações. **Agendar a notificação local no momento em que o descanso começa** (e cancelá-la se o usuário pular), para que ela dispare mesmo com a tela bloqueada.
- **Aceite:** no Android, com a tela bloqueada, o aviso chega no fim do descanso. No navegador, nada quebra.
- **Depende de:** T34, T17

### T36 — Manter tela ligada
- **Arquivos:** `app/src/views/session-active.js` (usando `keep-awake.js`)
- **Passos:** ativar ao entrar na sessão ativa e **desativar ao sair por qualquer caminho** (finalizar, abandonar, botão voltar, fechar o app). Respeitar a preferência do usuário.
- **Aceite:** durante o treino a tela não apaga; ao sair da sessão por qualquer via, o comportamento normal volta.
- **Depende de:** T31, T17

### T37 — Ajustes durante o treino
- **Arquivos:** `app/src/views/session-active.js`
- **Passos:** dentro da sessão ativa: pular exercício, reordenar, adicionar série extra, adicionar exercício não planejado e substituir por alternativa (usa T43).
- **Aceite:** as cinco ações funcionam sem sair do modo ativo e sem perder registros já feitos.
- **Depende de:** T33

### T38 — Retomada de sessão
- **Arquivos:** `app/src/main.js`, `app/src/views/session-active.js`
- **Passos:** ao abrir o app, se existir sessão com `status = 'in_progress'`, oferecer retomar ou descartar (com confirmação).
- **Aceite:** fechar o app no meio do treino e reabrir oferece retomar, com todas as séries já registradas intactas.
- **Depende de:** T31

### T39 — Finalizar sessão
- **Arquivos:** `app/src/views/session-active.js`
- **Passos:** gravar `finished_at`, `duration_seconds`, `status = 'completed'` e abrir resumo (volume total, duração, PRs batidos) com campo de nota da sessão.
- **Aceite:** finalizar mostra o resumo correto e a sessão aparece no histórico.
- **Depende de:** T33

---

## FASE 9 — Histórico, progresso e métricas

### T40 — Métricas de domínio
- **Arquivos:** `app/src/domain/metrics.js`
- **Passos:** funções puras:
  - `estimate1RM(weightKg, reps)` — fórmula de Epley: `weight * (1 + reps/30)`. **Tratar `reps <= 1` retornando o próprio peso**: a fórmula pura daria 103,3 kg para uma única repetição de 100 kg, o que é matematicamente errado — o 1RM de uma repetição máxima é a própria carga.
  - `weeklyVolumeByMuscle(sessions)` — séries válidas por `body_part`.
  - `detectPRs(exerciseId, newSets, history)` — recorde de carga e de repetições.
  - **Séries de aquecimento são sempre ignoradas em todas as três.**
- **Aceite:** `estimate1RM(100, 5)` ≈ **116.67**; `estimate1RM(100, 1)` === **100**; aquecimentos não entram em nenhuma métrica.
- **Depende de:** T33

### T41 — Tela de histórico
- **Arquivos:** `app/src/views/history.js`
- **Passos:** lista de sessões concluídas (data, nome, duração, volume), com detalhe expandindo as séries executadas.
- **Aceite:** sessões em ordem cronológica decrescente com dados corretos.
- **Depende de:** T39

### T42 — Tela de progresso
- **Arquivos:** `app/src/views/progress.js`
- **Passos:** evolução por exercício (carga máxima e 1RM estimado ao longo do tempo), volume semanal por grupo muscular, e registro de peso corporal e medidas com gráfico. **Gráficos em SVG escrito à mão — sem biblioteca externa** (regra 7).
- **Aceite:** com ao menos 3 sessões registradas, os gráficos renderizam corretamente e respeitam a unidade escolhida na exibição.
- **Depende de:** T40

---

## FASE 10 — Extras promovidos para a v1 (seção 8.1 do APP_RULES)

### T43 — Alternativas de exercício
- **Arquivos:** `app/src/domain/alternatives.js`
- **Passos:** dado um `exercise_id`, retornar exercícios com o mesmo `target` (prioridade) ou mesmo `muscle_group`, opcionalmente filtrados por equipamento. Consulta 100% local.
- **Aceite verificado:** alternativas para o supino `0025` (target `pectorals`) encontram candidatos entre os **157** exercícios do mesmo alvo, cobrindo **16** equipamentos diferentes.
- **Depende de:** T11

### T44 — Calculadora de anilhas
- **Arquivos:** `app/src/domain/plates.js`
- **Passos:** dada a carga alvo e o peso da barra, calcular as anilhas **de cada lado**, com conjunto configurável (`plate_set` das configurações). Indicar quando a carga exata é impossível e sugerir a mais próxima.
- **Aceite:** barra 20 kg + alvo 82,5 kg com anilhas padrão retorna a combinação correta por lado (31,25 kg de cada lado); alvo 83 kg informa que é impossível e sugere 82,5 kg.
- **Depende de:** T12

### T45 — Calendário de treinos
- **Arquivos:** `app/src/views/calendar.js`
- **Passos:** visão mensal marcando dias treinados, dias planejados não cumpridos e volume por dia. Clicar num dia abre a sessão daquele dia.
- **Aceite:** dias com sessão aparecem destacados e o clique abre o detalhe correto.
- **Depende de:** T41

### T46 — Notas de sessão e destaque de PR
- **Arquivos:** `app/src/views/session-active.js`, `app/src/views/history.js`
- **Passos:** nota livre ao finalizar a sessão; destacar visualmente no resumo e no histórico quando um PR foi batido (usa `detectPRs`).
- **Aceite:** bater recorde de carga mostra o destaque de PR no resumo.
- **Depende de:** T40, T39

---

## FASE 11 — Internacionalização

### T47 — Infraestrutura de i18n
- **Arquivos:** `app/src/i18n/index.js`, `pt.js`, `en.js`
- **Passos:** `t(key)` resolvendo pelo idioma ativo, com fallback para inglês se a chave faltar.
- **Aceite:** trocar o idioma nas configurações muda toda a interface sem recarregar.
- **Depende de:** T16

### T48 — Traduzir toda a interface
- **Arquivos:** `app/src/i18n/pt.js`, `en.js`, todas as views
- **Passos:** extrair todos os textos das views para chaves de tradução. Incluir o dicionário PT dos termos do dataset — as **10** categorias de `body_part` e os **28** valores de `equipment` (ex.: `chest` → "Peito", `barbell` → "Barra", `body weight` → "Peso corporal", `leverage machine` → "Máquina articulada").
- **Aceite:** nenhuma string de UI fora dos arquivos de i18n; com a UI em PT, os filtros não mostram termos em inglês.
- **Depende de:** T47

### T49 — Fallback das instruções do exercício
- **Arquivos:** `app/src/views/exercise-detail.js`
- **Passos:** conforme a regra 3.1 do APP_RULES, o dataset **não tem português**. Com a UI em PT, exibir as instruções em **inglês** com aviso discreto de que a tradução ainda não existe naquele idioma.
- **Aceite:** com a UI em PT, o exercício `0025` mostra os 7 passos em inglês com o aviso, sem erro nem espaço em branco.
- **Depende de:** T48

---

## FASE 12 — Onboarding

### T50 — Treinos-modelo embarcados
- **Arquivos:** `app/public/templates/*.treino.json`
- **Passos:** criar no mínimo 3 rotinas prontas no formato da seção 6 (Full Body iniciante, Push/Pull/Legs, Upper/Lower), usando `exercise_id` **reais** do dataset (conferir cada id).
- **Aceite:** todos os arquivos passam no validador da T27 sem nenhum erro.
- **Depende de:** T27

### T51 — Fluxo de primeira execução
- **Arquivos:** `app/src/views/onboarding.js`
- **Passos:** telas curtas para idioma, unidade, tema, escala de fonte e, opcionalmente, importar um treino-modelo. Ao fim, gravar `onboarding_done = true`. Sem cadastro nem login.
- **Aceite:** primeira abertura mostra o onboarding; aberturas seguintes vão direto para a tela principal.
- **Depende de:** T50, T16

---

## FASE 13 — Empacotamento como HTML único

> **Revisão de arquitetura (2026-09-05):** as fases 13/14 originais (SQLite nativo + empacotamento Android/Electron via Capacitor) foram **substituídas**. O pedido original era um entregável em HTML que abre em qualquer lugar sem instalar nada — Capacitor exige build por plataforma (Android Studio, JDK, Electron), o oposto disso. Ver seção 3 do [APP_RULES.md](APP_RULES.md) para a decisão completa e a troca aceita (aviso do timer de descanso não é garantido com a tela bloqueada, por não haver camada nativa).

### T52 — Bundler de arquivo único
- **Arquivos:** `app/vite.config.js`, `app/package.json`
- **Passos:** adicionar `vite-plugin-singlefile` ao build. Configurar `assetsInlineLimit` alto e `cssCodeSplit: false` para que `npm run build` produza **um único `dist/index.html`** com todo o JS e CSS inline — nenhum `<script src="...">` nem `<link>` externo no HTML final.
- **Aceite:** `dist/` contém **só** `index.html` (a mídia embutida na T56 elimina até as pastas).
- **Depende de:** todas as fases anteriores

### T53 — Remover tudo que só funciona com servidor
- **Arquivos:** `app/src/data/seed.js`, `app/src/views/onboarding.js`, todo componente/view que referencia mídia
- **Passos:**
  - Trocar `fetch('/data/exercises.json')` por `import` direto do JSON (o bundler embute o array no bundle) — `fetch` de arquivo local falha em `file://`.
  - Mesma troca para os treinos-modelo (`fetch(tpl.file)` → `import` de cada `.treino.json`).
  - Trocar todo `src="/${exercise.image}"` (caminho absoluto) por `src="${exercise.image}"` (relativo) — caminho absoluto resolve para a raiz do sistema de arquivos em `file://`, não para a pasta do HTML.
- **Aceite:** abrir `dist/index.html` sem nenhum servidor rodando funciona; nenhuma chamada de rede no console.
- **Depende de:** T52

### T54 — Remover a camada nativa (Capacitor)
- **Arquivos:** `app/src/platform/*.js`, `app/src/data/db.js`, `app/package.json`
- **Passos:** remover todas as dependências `@capacitor/*` e `@capacitor-community/*`. Cada wrapper de plataforma (`notifications.js`, `haptics.js`, `keep-awake.js`, `files.js`) mantém **só** a implementação web (que já existia como fallback) — sem branch de plataforma nativa. `db.js` volta a ser IndexedDB puro, sem escolha de backend.
- **Aceite:** `npm install` não instala nenhum pacote `@capacitor*`; `npm run build` funciona sem erro.
- **Depende de:** T53

### T55 — Verificação final de acessibilidade
- **Passos:** percorrer **todas** as telas com escala de fonte `1.6` + tema escuro; depois `1.6` + alto contraste; nas larguras 320px, 768px e 1440px.
- **Aceite:** nenhuma tela com texto cortado, botão inacessível, sobreposição ou contraste abaixo de 4.5:1.
- **Depende de:** T54

### T56 — Embutir a mídia como `data:` URI (elimina as pastas)
- **Arquivos:** `app/scripts/embed-media.cjs` (novo), `app/src/data/seed.js`, `app/vite.config.js`, `app/package.json`
- **Passos:**
  - Script Node que lê `exercises.json`, base64-codifica cada `image`/`gif_url` a partir de `public/images`/`public/videos`, e grava `src/data/generated/exercises-embedded.json` com esses campos já como `data:image/...;base64,...`. Rodar manualmente (`npm run embed-media`), não a cada build — é lento e pesado para rodar sempre.
  - `seed.js` importa `exercises-embedded.json` em vez de `exercises.json`.
  - Remover `app/public/images` e `app/public/videos` — não são mais referenciados por nada.
  - **`build.minify: false`** no `vite.config.js`: minificar uma string de dados de ~190 MB só gasta memória e tempo sem reduzir nada (não há espaço em branco/nomes de variável pra encurtar dentro de base64) — era exatamente isso que estourava o heap do Node no build.
  - **`npm run build` precisa rodar com mais heap:** `node --max-old-space-size=8192 node_modules/vite/bin/vite.js build` (colocar isso direto no script `build` do `package.json`) — o padrão do Node (~2 GB) não é suficiente para o Rollup processar um módulo desse tamanho, mesmo sem minificar.
- **Aceite:** `dist/` contém **somente** `index.html` (~190-200 MB), nenhuma pasta; abrir o app funciona identicamente, com todas as imagens/GIFs carregando.
- **Depende de:** T52, T53

Números reais observados (referência, vai variar por máquina):
| Etapa | Tempo |
|---|---|
| `embed-media.cjs` (2.648 arquivos) | ~10s |
| `npm run build` com mídia embutida | ~2-3 min |

**Cuidado ao mexer no zoom da imagem depois disso:** com a mídia embutida, o componente de zoom (`image-zoom.js`) calcula a escala inicial ("cobrir a tela", não o tamanho nativo 180×180) medindo o `.zoom-stage` com `ResizeObserver` — **não use `requestAnimationFrame`** para esse cálculo: RAF fica *pausado* (nunca dispara) enquanto a aba está em segundo plano, então se o usuário abrir o zoom bem no instante em que o app estava oculto, a imagem nunca apareceria. `ResizeObserver` dispara de forma confiável assim que o elemento tiver um tamanho real, com ou sem a aba visível.

---

## 3. Ordem resumida das dependências

```
Fase 0  T01 → T02 → T03/T04          setup
Fase 1  T05 → T06/T07 → T08          design system (antes das telas)
Fase 2  T09 → T10 → T11/T12          dados
Fase 3  T13 → T14 → T15/T16          shell
Fase 4  T17                          plataforma (wrappers com fallback web)
Fase 5  T18 → T19/T20 → T21/T22      biblioteca
Fase 6  T23 → T24 → T25 → T26        treinos
Fase 7  T27 → T28 → T29 → T30        arquivos
Fase 8  T31 → T32 → T33 → T34 → T35  execução
        T33 → T37/T39 · T31 → T36/T38
Fase 9  T40 → T41 → T42              métricas
Fase 10 T43/T44/T45/T46              extras da v1
Fase 11 T47 → T48 → T49              i18n
Fase 12 T50 → T51                    onboarding
Fase 13 T52 → T53 → T54 → T55        empacotar como HTML único
```

---

## 4. Números de referência verificados no dataset

Use como critério de aceite — foram conferidos diretamente em `data/exercises.json`:

| Verificação | Valor esperado |
|---|---|
| Total de exercícios | 1324 |
| Arquivos em `images/` e em `videos/` | 1324 cada |
| `equipment = "body weight"` | 325 |
| Nome contendo `"bench"` | 73 |
| Passos (EN) do exercício `0025` | 7 |
| Exercícios com `target = "pectorals"` (fora o `0025`) | 157 |
| Equipamentos distintos nesse alvo | 16 |
| Categorias distintas de `body_part` | 10 |
| Valores distintos de `equipment` | 28 |
| `estimate1RM(100, 5)` | ≈ 116.67 |
| `estimate1RM(100, 1)` | 100 (caso especial) |

---

## 5. Checklist de conclusão da v1

- [ ] Funciona 100% sem internet, do primeiro uso em diante
- [ ] Biblioteca com 1.324 exercícios, com busca, filtros, GIF e zoom (limitado a 4×)
- [ ] Criação de treino pela tela, com aquecimento, super série e drop set
- [ ] Importação e exportação de `.treino.json`, com ciclo fechado
- [ ] Execução com referência da última sessão, timer automático, bipe, vibração e wake lock
- [ ] Retomada de sessão interrompida
- [ ] Histórico, 1RM estimado, volume por grupo muscular, PR automático e calendário
- [ ] Alternativas de exercício e calculadora de anilhas
- [ ] PT e EN completos, com fallback das instruções para inglês
- [ ] 5 níveis de fonte e 4 temas, sem quebrar nenhuma tela
- [ ] Cargas sempre gravadas em kg, com conversão só na exibição
- [ ] Atribuição `© Gym visual` visível onde há mídia
- [ ] Backup manual e automático funcionando
- [ ] `dist/index.html` é um único arquivo (JS/CSS inline, sem `fetch` nem `import` externo)
- [ ] `dist/` não contém nenhuma pasta — mídia embutida como `data:` URI, zero dependências externas
- [ ] Abre corretamente via `file://` (duplo-clique), em qualquer sistema operacional
- [ ] Zoom da imagem já abre "cobrindo" a tela (não no tamanho nativo 180×180 exigindo zoom manual)

---

## 6. O que NÃO fazer nesta fase

- Não implementar iOS (adiado — sem Mac disponível; seção 3 do APP_RULES).
- Não implementar a integração com IA (Fase 2 do produto, seção 9 do APP_RULES).
- Não implementar os itens do backlog 8.2 (RPE/RIR, streak, CSV, periodização, timer inteligente, múltiplos perfis, widget, PDF).
- Não publicar a mídia em repositório online (proibido pela seção 4.2 do APP_RULES).
- Não buscar mídia em resolução maior que 180×180 (proibido pelo NOTICE.md).
- Não adicionar login, conta, nuvem ou telemetria.
- Não reintroduzir Capacitor/Electron/wrapper nativo — decisão revertida conscientemente (seção 3 do APP_RULES); só reconsiderar se o usuário pedir explicitamente de novo.

---

## 7. Changelog da revisão

Defeitos encontrados na primeira versão deste plano e corrigidos aqui:

| # | Defeito | Correção |
|---|---|---|
| 1 | **Bloqueador:** T08 mandava ler o tema do IndexedDB antes da primeira pintura — impossível, IndexedDB é assíncrono | Espelho síncrono em `localStorage` só para `theme`/`font_scale`, com a justificativa de por que isso não viola a regra de armazenamento |
| 2 | **Bloqueador:** exigia um arquivo `rest-end.mp3` que não existe no projeto e que o executor não teria como criar | Bipe gerado por Web Audio API (`sound.js`), sem arquivo de áudio |
| 3 | **Bloqueador:** views chamariam plugins do Capacitor direto, quebrando `npm run dev` no navegador (que o APP_RULES exige que funcione) | Nova fase 4 (T17) com wrappers e fallback web obrigatórios, antes de qualquer uso |
| 4 | `query(collection, filterFn)` recebia função JS — intraduzível para SQL, quebraria a migração da fase 13 | Trocado por `query(collection, criteria)` com objeto de igualdade, mapeável a `WHERE` |
| 5 | T06 fixava `font-size: 16px`, anulando o ajuste de fonte do SO exigido pelo APP_RULES 5.6 | Trocado para `calc(100% * var(--font-scale))` |
| 6 | T05 proibia literais de cor "fora de tokens.css", contradizendo T07 (themes.css precisa deles) | Regra 6 agora permite literais em `tokens.css` **e** `themes.css` |
| 7 | Regra "sem `fetch`" era ambígua e bloquearia o seed do dataset local | Regra 7 agora distingue host externo (proibido) de asset local (permitido) |
| 8 | T02 proibia novas dependências, mas T50/T53 mandavam instalar duas | Dependências de instalação adiada declaradas explicitamente na T02 |
| 9 | `@capacitor/preferences` estava na lista mas nunca era usado | Removido (é assíncrono, não resolveria o boot; `localStorage` resolve) |
| 10 | Fórmula de Epley retornaria 103,3 kg como 1RM de uma única repetição de 100 kg | Caso especial `reps <= 1` retorna o próprio peso, com aceite explícito |
| 11 | Nada garantia consistência de unidade — histórico corromperia ao trocar kg/lb | Regra 10 (sempre kg no banco), campos renomeados para `weight_kg`/`body_weight_kg`, módulo `units.js` |
| 12 | Botão voltar do Android não era tratado — fecharia o app no meio do treino | Nova tarefa T15 com `@capacitor/app` |
| 13 | A tarefa de referência da última sessão não cobria exercícios customizados (`exercise_id = null`) | T32 agora especifica casamento por `custom_name` nesse caso |
| 14 | Zoom sem limite numa mídia de 180×180, com risco de o executor tentar buscar imagens melhores | Zoom limitado a 4× e proibição explícita de buscar mídia de maior resolução (NOTICE.md) |
| 15 | A tarefa da lista de exercícios deixava a escolha entre "scroll infinito ou virtualização" — decisão aberta demais para o executor | T18 prescreve scroll infinito em lotes de 60 |

Melhorias adicionais: cronômetro baseado em timestamp (não em `setInterval` acumulado), notificação agendada no início do descanso para funcionar com tela bloqueada, tela de carregamento durante o seed, `getAll` do SQLite mantido só no Android (IndexedDB no Windows), tabela de números verificados contra o dataset real, e mapa de dependências resumido.
