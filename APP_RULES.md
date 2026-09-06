# Regras e Requisitos do App — MeuPersonal

> Documento de referência para orientar todas as decisões de produto, design e arquitetura do app de treino de musculação construído sobre a base de dados deste repositório ([data/exercises.json](data/exercises.json), 1.324 exercícios, 10 idiomas, mídia própria).

---

## 1. Visão do produto

Um app pessoal de treino de musculação que funciona como um **personal trainer digital offline-first**: permite montar, seguir e acompanhar treinos com uma biblioteca robusta de exercícios, sem depender de internet para o uso diário. Treinos podem ser criados manualmente ou importados de arquivos preparados previamente. Numa fase futura, o app poderá se conectar a uma IA para gerar treinos personalizados.

---

## 2. Princípios não-negociáveis

Todo recurso construído deve respeitar estes princípios, nessa ordem de prioridade quando houver conflito:

1. **Funcional antes de bonito** — nenhuma tela vai ao ar quebrando o fluxo principal (montar treino → executar treino → registrar progresso).
2. **Offline-first** — o app precisa funcionar 100% sem internet. Rede é usada apenas quando explicitamente disponível e é sempre um *enhancement*, nunca um requisito para a operação básica.
3. **Intuitivo** — qualquer usuário deve conseguir criar e executar um treino sem tutorial. Ações destrutivas (excluir treino, apagar histórico) exigem confirmação.
4. **Responsivo** — a mesma base de código se adapta a celular (retrato/paisagem), tablet e desktop, sem telas cortadas ou elementos inacessíveis.
5. **Consistente entre plataformas** — mesma lógica de negócio e mesmos dados nas plataformas ativas (Android e Windows nesta fase, iOS quando entrar); diferenças só na camada de UI nativa quando fizer sentido (ex.: gestos, atalhos de teclado no Windows).

---

## 3. Plataformas-alvo (Fase 1)

**Decisão final de formato: um único arquivo HTML autocontido, sem nenhuma pasta ao lado.** O entregável é só `index.html` (~200 MB) — JS, CSS, dataset e **toda a mídia** (imagens e GIFs dos 1.324 exercícios, como `data:` URIs base64) embutidos no próprio arquivo. O usuário abre com duplo-clique em qualquer sistema, **sem instalar nada, sem servidor, sem Node, sem loja de aplicativos, e sem depender de nenhuma outra pasta/arquivo estar junto** — pode mover ou copiar só esse arquivo para qualquer lugar (decisão revisada em 2026-09-05; a versão anterior deste documento mantinha `images/`/`videos/` como pastas ao lado — descartada a pedido do usuário em favor de zero dependências externas).

| Plataforma | Como se usa |
|---|---|
| Windows / macOS / Linux | Duplo-clique no `index.html`, abre no navegador padrão |
| Android / iOS | Abrir o `index.html` pelo navegador do celular (compartilhar o arquivo, ou colocar numa pasta local/nuvem); opcionalmente "Adicionar à tela inicial" para um atalho com ícone |

**Regra de paridade:** o mesmo arquivo roda em todas as plataformas acima — não há build separado por plataforma, não há projeto nativo, não há loja.

**Por que não Capacitor/wrapper nativo:** essa era a arquitetura anterior deste documento, mas ela troca "abrir um arquivo" por "instalar Node, rodar build, compilar projeto Android/Windows separado" — o oposto do que foi pedido. A troca consciente é:

| Recurso | Com HTML único (escolhido) |
|---|---|
| Abrir o app | Duplo-clique, roda na hora, em qualquer SO |
| Timer de descanso, com o app aberto na tela | Funciona normalmente (som + vibração, quando o navegador suportar) |
| Aviso do timer com a tela bloqueada/app em segundo plano | **Não garantido.** Sem camada nativa não há como acordar o aparelho de forma confiável. Ver seção 5.3. |
| Armazenamento local | IndexedDB do navegador (persiste normalmente; sem a robustez de um banco nativo, mas suficiente para uso de um único usuário na própria máquina/aparelho) |
| Distribuição/atualização | Copiar o arquivo/pasta; sem loja, sem assinatura, sem processo de build |

**Regras técnicas decorrentes:**
- **Tudo num arquivo só, sem depender de servidor:** nada de `fetch()` para outro arquivo local (`.json`) nem `import` de módulo ES em arquivo separado — ambos falham ao abrir via `file://` no Chrome. O dataset de exercícios e os treinos-modelo são **embutidos como código JavaScript inline** dentro do próprio HTML, exatamente como o [index.html](index.html) original já faz com `const EXERCISES = [...]`.
- **Mídia também embutida, como `data:` URI base64** — cada exercício carrega `image`/`gif_url` já como `data:image/...;base64,...` em vez de caminho de arquivo. Isso infla o total em ~33% (139 MB → ~186 MB), mas elimina a última dependência externa do arquivo. Gerado por um script de build dedicado (não por importação direta), porque processar ~190 MB de string em um único módulo é pesado — ver observações de implementação no plano de execução.
- **Sem dependência de build para o usuário final:** quem só quer *usar* o app recebe um arquivo pronto. Build (bundler) é uma ferramenta interna de desenvolvimento para gerar esse arquivo a partir do código-fonte organizado em módulos — não é algo que o usuário final precisa rodar.
- **Sem Node/Capacitor/Electron no runtime do app.** Ferramentas de build são passo de desenvolvimento, descartável depois de gerar o `index.html` final.

### 3.1 Idiomas suportados (Fase 1)

| Idioma | Papel |
|---|---|
| **Português (PT-BR)** | Idioma padrão da interface |
| **English (EN)** | Idioma secundário / fallback |

- Toda a interface (menus, botões, mensagens, telas de treino) deve existir em **português e inglês** desde o lançamento, com seletor de idioma nas configurações.
- **Atenção ao gap de dados:** o dataset local ([data/exercises.json](data/exercises.json)) já traz instruções de exercício em 10 idiomas (en, es, it, tr, ru, zh, hi, pl, ko, fr) — **português não é um deles**. Regra de fallback obrigatória: quando o idioma da interface for PT, as instruções do exercício exibem a versão em **inglês** (idioma mais completo/confiável do dataset) até que uma tradução PT própria seja produzida e embarcada pelo app (trabalho de conteúdo, fora do dataset original).
- Nomes de campos fixos da UI (categoria, equipamento, grupo muscular etc.) devem ser traduzidos pelo próprio app — não dependem do dataset e podem ser exibidos em PT nativamente por um dicionário de tradução mantido internamente.
- Estrutura de i18n deve ser preparada para adicionar mais idiomas depois sem refatoração (reaproveitando os outros 9 já existentes no dataset).

---

## 4. Dados e biblioteca de exercícios

- O app deve embarcar localmente uma cópia da base de exercícios (`data/exercises.json`) — sem necessidade de baixar nada na primeira execução.
- Estrutura de dados do app deve ser **compatível com o schema já existente** ([data/exercises.schema.json](data/exercises.schema.json)): `id`, `name`, `category`, `body_part`, `equipment`, `instructions` (10 idiomas), `muscle_group`, `secondary_muscles`, `target`, `image`, `gif_url`, `attribution`.
- **Atribuição obrigatória:** toda tela que exibir imagem ou GIF de exercício deve manter visível ou acessível o texto `© Gym visual — https://gymvisual.com/` (ver [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE)). A mídia não pode ser redistribuída fora do escopo do app nem re-hospedada publicamente sem essa atribuição.
- Atualizações futuras da base de exercícios (novos exercícios, correções de tradução) devem poder ser aplicadas via atualização do app, sem exigir migração manual de dados do usuário.

### 4.1 Exemplo real de exercício (dado extraído da base)

Para servir de referência ao design da tela de detalhe, este é um registro real de `data/exercises.json` (id `0025`):

| Campo | Valor |
|---|---|
| Nome (EN) | Barbell Bench Press |
| Nome (PT, a traduzir pelo app) | Supino reto com barra |
| Categoria / Grupo | Chest / Peito |
| Equipamento | Barbell / Barra |
| Músculo-alvo | Pectorals / Peitorais |
| Músculos secundários | Triceps, Shoulders / Tríceps, Ombros |
| Imagem | `images/0025-EIeI8Vf.jpg` |
| GIF | `videos/0025-EIeI8Vf.gif` |
| Atribuição | `© Gym visual — https://gymvisual.com/` |

**Instruções (EN — original do dataset):**
1. Lie flat on a bench with your feet flat on the ground and your back pressed against the bench.
2. Grasp the barbell with an overhand grip slightly wider than shoulder-width apart.
3. Lift the barbell off the rack and hold it directly above your chest with your arms fully extended.
4. Lower the barbell slowly towards your chest, keeping your elbows tucked in.
5. Pause for a moment when the barbell touches your chest.
6. Push the barbell back up to the starting position by extending your arms.
7. Repeat for the desired number of repetitions.

**Instruções (PT — exemplo de tradução a ser produzida pelo app, não vem do dataset):**
1. Deite-se em um banco com os pés apoiados no chão e as costas pressionadas contra o banco.
2. Segure a barra com pegada pronada, um pouco mais aberta que a largura dos ombros.
3. Retire a barra do suporte e a mantenha diretamente acima do peito com os braços totalmente estendidos.
4. Abaixe a barra lentamente em direção ao peito, mantendo os cotovelos próximos ao corpo.
5. Faça uma pausa breve quando a barra tocar o peito.
6. Empurre a barra de volta à posição inicial estendendo os braços.
7. Repita pelo número de repetições desejado.

Este par EN/PT ilustra exatamente a regra de fallback e tradução descrita na seção 3.1, e deve guiar como cada card de exercício exibe nome, categoria, imagem/GIF e instruções na tela de detalhe.

### 4.2 Hospedagem da mídia — decisão: embarcada, nunca pública

**Regra:** a mídia (`images/` e `videos/`) é distribuída **junto com o app** — embutida como `data:` URI dentro do próprio `index.html` (seção 3), nunca buscada de um servidor. É proibido publicá-la em repositório público, CDN aberta ou bucket público.

Tamanho real medido:

| Conteúdo | Arquivos | Tamanho bruto | Embutido (base64, +33%) |
|---|---|---|---|
| Thumbnails (`images/`, ~6 KB cada) | 1.324 | 12 MB | ~16 MB |
| GIFs de animação (`videos/`, ~92 KB cada) | 1.324 | 127 MB | ~169 MB |
| **Total** | 2.648 | **~139 MB** | **~186 MB** |

Justificativa:

1. **Jurídica (decisiva):** publicar a mídia num repositório público é **redistribuição** — o [LICENSE](LICENSE) é explícito ao dizer que clonar este repositório não concede licença sobre a mídia, e que ela deve ser licenciada diretamente com a Gym visual. A permissão vale para *este* repositório e **não é transferível**. Um repositório público é a forma mais exposta de redistribuição (download em massa e hotlink por qualquer um).
2. **Técnica:** hospedar online contraria o princípio nº 2 (offline-first) — exigiria internet no primeiro uso, justamente na academia, onde o sinal costuma ser ruim.
3. **Viabilidade:** ~186 MB num único arquivo `.html` é perfeitamente copiável/compartilhável (pendrive, nuvem, e-mail com limite maior, etc.), em qualquer sistema operacional, sem nenhuma outra pasta junto.

**Plano B (só se o tamanho virar problema real):** abordagem híbrida — embutir só as thumbnails (biblioteca inteira navegável offline na hora) e baixar os GIFs sob demanda de armazenamento **privado e já licenciado**. Só é legalmente viável **após** obter licença própria da Gym visual, e sacrifica parte do offline-first e do "arquivo único". É contingência, não padrão.

---

## 5. Funcionalidades core (MVP)

> **Escopo do primeiro corte funcional:** todas as funcionalidades desta seção 5 **mais** os extras promovidos na seção 8.1 (PR automático, calendário de treinos, alternativas de exercício, calculadora de anilhas e notas por sessão). Esses deixam de ser "nice to have" e fazem parte da primeira versão entregável.

### 5.1 Biblioteca de exercícios
- Busca por nome, filtro por grupo muscular, equipamento e músculo-alvo (usando os campos já existentes no dataset).
- Detalhe do exercício com GIF, instruções passo a passo no idioma do usuário (fallback para inglês se a tradução não existir — ver seção 3.1).
- **Zoom na imagem/GIF do exercício:** na tela de detalhe, a imagem/GIF deve poder ser ampliada para inspeção mais próxima da execução do movimento. Requisitos mínimos:
  - Toque/clique na miniatura abre um visualizador em tela cheia.
  - Mobile: pinch-to-zoom (dois dedos) e arraste para navegar pela imagem ampliada.
  - Windows/desktop: zoom via scroll do mouse ou botões +/- , com arraste pelo mouse.
  - Botão de fechar sempre visível/acessível; atribuição `© Gym visual` permanece visível mesmo no modo ampliado.
- Marcar exercícios como favoritos para acesso rápido.

### 5.2 Criação de treinos
- **Via tela:** montar um treino do zero escolhendo exercícios da biblioteca, definindo séries, repetições, carga, tempo de descanso e ordem dos exercícios. Editar e duplicar treinos existentes.
- **Via importação de arquivo:** importar um treino pronto a partir de um arquivo (formato definido na seção 6). O fluxo de importação deve validar o arquivo, mostrar um preview do treino antes de confirmar, e apontar erros de forma clara (exercício não encontrado na base, campo obrigatório ausente etc.), sem travar o app.
- Organização de treinos em **planos/rotinas** (ex.: "Treino A/B/C", "Push/Pull/Legs"), com dias da semana sugeridos.
- **Tipos de série** (precisam existir desde a v1, pois mudam a estrutura de dados e o formato de arquivo):
  - **Aquecimento vs. série válida** — séries de aquecimento são registradas mas **não contam** para volume, PR ou métricas de progresso.
  - **Super série / bi-set** — dois ou mais exercícios agrupados, executados sem descanso entre eles; o descanso só ocorre ao fim do grupo.
  - **Drop set** e **rest-pause** — marcáveis na série, para o histórico refletir a intensidade real.
- **Notas fixas por exercício dentro do treino** (ex.: "banco na posição 4, pegada 75 cm") — persistem entre sessões, diferente da nota da sessão.

### 5.3 Execução do treino
- Modo "treino ativo": tela otimizada para uso durante o treino (fonte grande, poucos toques), com cronômetro de descanso entre séries, marcação de série concluída, e registro de carga/repetições realmente executadas (pode diferir do planejado).
- **Referência da última sessão (obrigatório):** ao executar cada exercício, o app mostra o que foi feito na última vez naquele mesmo exercício (ex.: "última: 4×8 @ 60 kg"). Esta é a funcionalidade central para sobrecarga progressiva — sem ela o app vira só um bloco de notas. Deve vir pré-preenchida como sugestão editável dos campos de carga/reps.
- **Descanso automático:** o cronômetro inicia sozinho ao marcar uma série como concluída, usando o descanso configurado no exercício, com opção de pular ou adicionar tempo (+15s/-15s).
- **Aviso de fim de descanso:** som **e** vibração, com o app aberto na tela (ambiente de academia). Silenciável nas configurações.
  - **Limitação aceita (decisão registrada em 2026-09-05):** por o app ser um único arquivo HTML sem camada nativa, **não há garantia de aviso com a tela bloqueada ou o app em segundo plano** — isso exigiria um wrapper nativo (Capacitor ou similar), que foi conscientemente descartado em favor de "abrir um arquivo, sem instalar nada". Tentar uma notificação do navegador (`Notification`/Web Push) mesmo assim, como melhor esforço, mas sem depender dela: o usuário deve manter a tela do app visível durante o descanso para ter certeza do aviso.
- **Manter a tela ligada** durante o treino ativo, usando a Wake Lock API do navegador quando disponível (best-effort — nem todo navegador/contexto suporta). Deve ser desativável.
- **Duração da sessão:** cronômetro do treino total, exibido durante a execução e salvo no histórico.
- **Ajustes durante o treino:** substituir um exercício por uma alternativa (ver 8.1), pular exercício, reordenar, adicionar série extra ou exercício não planejado — sem precisar sair do modo ativo nem perder o registro.
- **Retomada de sessão:** se a aba for fechada no meio do treino, ao reabrir o arquivo o app deve oferecer retomar a sessão em andamento sem perder os dados já registrados (dados vêm do IndexedDB do navegador, local à máquina/aparelho onde o arquivo foi aberto).
- Funciona 100% offline — nenhuma chamada de rede em nenhum momento, nem para carregar o próprio app (tudo já está no arquivo).

### 5.4 Histórico e progresso
- Registro automático de cada sessão de treino concluída (data, exercícios, séries, cargas, duração).
- Visualização de evolução por exercício (ex.: carga máxima ao longo do tempo) e por métricas gerais (frequência semanal, volume total).
- **Histórico por exercício acessível da biblioteca:** ao abrir qualquer exercício, ver todo o desempenho passado nele, não só a partir do treino.
- **1RM estimado:** cálculo automático (fórmula Epley ou Brzycki) a partir de carga × repetições, exibido na evolução do exercício — é matemática local, sem custo de rede.
- **Volume semanal por grupo muscular:** número de séries válidas por grupo (peito, costas, pernas etc.) por semana, usando `body_part`/`target` do dataset. É a métrica que mostra desequilíbrios de treino.
- **Peso corporal e medidas:** registro opcional de peso corporal e medidas (braço, peito, cintura, coxa), com gráfico de evolução — contextualiza o progresso de carga.
- Dados 100% locais por padrão — nenhuma informação de treino sai do dispositivo sem ação explícita do usuário (ex.: exportar/backup).

### 5.5 Perfil e configurações
- Unidade de peso (kg/lb), idioma da interface e das instruções.
- Configuração de som/vibração, wake lock e tempo padrão de descanso.
- Backup/exportação e restauração dos dados locais (treinos + histórico) em um único arquivo, para o usuário migrar entre dispositivos ou plataformas manualmente.
- **Backup automático local periódico** (arquivo mantido no próprio dispositivo, via download automático do navegador), protegendo contra perda de histórico por falha ou por o usuário limpar os dados do navegador.

### 5.6 Aparência: tamanho de fonte e temas

Requisito de primeira classe, não um "ajuste fino" — a tela é lida de longe, suada, com o celular apoiado no banco, e o app precisa se adaptar a quem enxerga bem e a quem não enxerga.

**Controle de tamanho da fonte:**
- Escala de fonte ajustável nas configurações, com no mínimo 5 níveis: **Pequena, Padrão, Média, Grande, Extra grande** (aprox. 85% a 160% do tamanho base).
- Implementado via variável CSS de escala (ex.: `--font-scale`) aplicada em unidades relativas (`rem`) — **nunca usar `px` fixo em texto**, senão o controle não funciona.
- Deve respeitar também o ajuste de fonte do sistema operacional (Android/Windows) como valor inicial, permitindo que o usuário sobrescreva dentro do app.
- **Nenhum layout pode quebrar no nível máximo:** botões, cards de exercício e a tela de treino ativo precisam continuar utilizáveis com fonte extra grande — texto quebra em mais linhas, o container cresce, nada é cortado nem fica inacessível. Isso deve ser verificado como critério de aceite de cada tela.
- Prévia ao vivo na tela de configurações: o usuário vê o efeito enquanto ajusta.

**Temas (cores):**
- Mínimo de três modos: **Claro**, **Escuro** e **Automático** (segue o tema do sistema operacional).
- Além dos modos, oferecer **temas de cor de destaque** (accent) selecionáveis — o app não deve ficar preso a uma única cor de marca.
- Incluir um tema de **alto contraste** para leitura em ambiente com luz forte (academia com claraboia/sol) e para baixa visão.
- Toda a paleta deve ser definida por **variáveis CSS** (tokens de design: fundo, superfície, borda, texto primário/secundário, destaque), permitindo trocar de tema sem tocar em nenhum componente. Proibido cor "chumbada" (hardcoded) dentro de componente.
- A preferência de tema e de escala de fonte é persistida localmente e aplicada imediatamente ao abrir o app, **sem flash** de tema errado na inicialização.
- **Contraste mínimo WCAG AA** (4.5:1 para texto normal) em todos os temas — incluindo os GIFs e cards de exercício, onde a legenda/atribuição precisa continuar legível sobre a mídia.

### 5.7 Onboarding (primeira execução)
- Fluxo curto de boas-vindas: escolher idioma (PT/EN), unidade de peso, tema e tamanho de fonte (ver 5.6) e, opcionalmente, um treino inicial.
- **Treinos-modelo embarcados:** o app já vem com algumas rotinas prontas (ex.: Full Body iniciante, Push/Pull/Legs, Upper/Lower), distribuídas **no mesmo formato de arquivo da seção 6** — servem de exemplo funcional do formato e evitam que o usuário encare uma tela vazia no primeiro uso.
- Nenhum cadastro, login ou conta é exigido para usar o app.

---

## 6. Formato de importação de treinos

Definir um formato de arquivo próprio (JSON, versionado) para representar um treino completo, permitindo compartilhar treinos entre usuários/plataformas sem depender de um backend.

Regras:
- Extensão sugerida: `.treino.json` (ou `.json` com um campo de assinatura interna, ex. `"type": "meupersonal.workout"`).
- Deve referenciar exercícios pelo `id` do dataset (compatibilidade garantida) e permitir também exercícios customizados que não existam na base (com nome e instruções livres), para não travar quem quer registrar movimentos fora do catálogo.
- Deve conter um campo `schema_version` para permitir evolução do formato sem quebrar arquivos antigos.
- Importação deve ser possível tanto por seleção de arquivo (todas as plataformas) quanto por "abrir com" (associação de tipo de arquivo no SO), quando suportado.
- Exportação do próprio app deve gerar arquivos nesse mesmo formato, fechando o ciclo criar → exportar → compartilhar → importar.

Esboço de estrutura (referência, não definitivo):

```json
{
  "schema_version": 1,
  "type": "meupersonal.workout",
  "name": "Treino A - Peito e Tríceps",
  "description": "Foco em força, 4 semanas",
  "days": [
    {
      "label": "Segunda-feira",
      "exercises": [
        {
          "exercise_id": "0025",
          "custom_name": null,
          "sets": 4,
          "reps": "8-10",
          "rest_seconds": 90,
          "warmup_sets": 2,
          "set_type": "normal",
          "superset_group": null,
          "notes": "Pegada média"
        },
        {
          "exercise_id": "0294",
          "custom_name": null,
          "sets": 3,
          "reps": "12",
          "rest_seconds": 0,
          "warmup_sets": 0,
          "set_type": "normal",
          "superset_group": "A",
          "notes": "Bi-set com o próximo"
        },
        {
          "exercise_id": null,
          "custom_name": "Exercício específico da fisio",
          "sets": 3,
          "reps": "15",
          "rest_seconds": 60,
          "warmup_sets": 0,
          "set_type": "drop_set",
          "superset_group": null,
          "notes": ""
        }
      ]
    }
  ]
}
```

Campos de estrutura de série:
- `warmup_sets` — quantas das séries são de aquecimento (não contam para volume/PR).
- `set_type` — `normal`, `drop_set`, `rest_pause`.
- `superset_group` — exercícios que compartilham a mesma etiqueta (`"A"`, `"B"`…) são executados em sequência sem descanso entre eles; `null` = exercício isolado.

---

## 7. Requisitos não-funcionais

- **Performance:** listas com 1.324+ exercícios e GIFs devem rolar suavemente (virtualização de lista, lazy loading de imagens/GIFs).
- **Armazenamento:** app deve funcionar em dispositivos com espaço limitado — avaliar compressão/otimização de mídia sem violar a resolução mínima licenciada (180×180).
- **Acessibilidade:** contraste mínimo WCAG AA, escala de fonte ajustável e temas conforme a seção 5.6, além de suporte a leitores de tela nos textos de instrução. Toda tela nova deve ser validada nos extremos (fonte extra grande + tema escuro + alto contraste) antes de ser considerada pronta.
- **Internacionalização:** interface do app preparada para múltiplos idiomas desde o início, aproveitando os 10 idiomas já presentes nas instruções dos exercícios.
- **Resiliência a falhas:** erros (arquivo de importação inválido, dado corrompido) nunca devem derrubar o app — sempre mensagem clara + opção de continuar.
- **Privacidade:** dados de treino/saúde do usuário permanecem no dispositivo por padrão; qualquer sincronização ou envio a serviço externo (incluindo a IA da fase 2) exige consentimento explícito.

---

## 8. Funcionalidades adicionais

### 8.1 Promovidas para o primeiro corte (obrigatórias na v1)

Decidido: estes três entram junto com o MVP, não depois.

- **Recorde pessoal (PR) automático:** o app detecta e destaca quando o usuário bate um recorde de carga ou repetições num exercício, comparando contra todo o histórico local daquele `exercise_id`.
- **Calendário de treinos:** visão mensal mostrando dias treinados, dias planejados não cumpridos e volume por dia, servindo como principal painel de constância.
- **Alternativas de exercício:** sugerir substitutos quando o equipamento estiver indisponível (ex.: barra ocupada → variante com halteres), usando `target` e `muscle_group` do dataset para encontrar equivalentes — funciona 100% offline, é só consulta local. Deve estar disponível tanto no planejamento quanto durante o treino ativo.
- **Calculadora de anilhas:** dada a carga alvo e o peso da barra, mostrar quais anilhas colocar de cada lado (com o conjunto de anilhas configurável pelo usuário) — resolve uma conta mental recorrente na academia, é matemática local.
- **Notas por sessão:** campo livre para anotar sensação, dor, energia ao fim do treino — útil para ajustar treino ao longo do tempo.

### 8.2 Backlog (pós-v1)

Ideias que agregam valor sem comprometer o princípio offline-first — priorizar conforme capacidade de desenvolvimento:

- **Timer de descanso inteligente:** ajusta sugestão de descanso conforme tipo de exercício (isolado vs. composto) e intensidade.
- **Modo "treino rápido":** gera um treino curto (15–20 min) a partir de exercícios já favoritados ou de um grupo muscular escolhido, sem precisar montar do zero.
- **RPE / RIR por série:** registro de esforço percebido / repetições em reserva, base para autorregulação de carga.
- **Sequência de constância (streak):** dias/semanas consecutivos treinando conforme o plano, como reforço de aderência.
- **Exportação do histórico em CSV:** para quem quiser analisar os próprios dados em planilha.
- **Gráficos comparativos entre períodos:** ex.: volume deste mês vs. mês anterior por grupo muscular.
- **Ciclos e periodização:** semanas de descarga (deload) e progressão planejada de carga ao longo de um mesociclo.
- **Widget/atalho rápido (Android/iOS):** iniciar o treino do dia direto da tela inicial, sem abrir o app inteiro.
- **Suporte a múltiplos perfis no mesmo dispositivo:** útil para quem treina em família ou é personal trainer administrando treinos de terceiros.
- **Exportação de relatório em PDF/imagem:** para compartilhar evolução com um profissional (nutricionista, educador físico) fora do app.
- **Modo escuro automático** e **modo "não perturbe"** que silencia notificações não essenciais durante o treino.

---

## 9. Fase 2 — Integração com IA para treinos personalizados

**Status: implementado parcialmente em 2026-09-05** (adiantado em relação ao escopo original, a pedido do usuário). Duas camadas coexistem, ambas acessadas pelo botão 🤖 em Treinos e pela seção "Treino com IA" em Ajustes:

1. **Camada offline (sempre disponível)**: checklist de perguntas (objetivo, nível, dias/semana, equipamento, restrições) gera um texto-prompt pronto para colar em QUALQUER IA de texto externa (ChatGPT, Gemini, Claude, etc., usada fora do app). Nenhuma chamada de rede, nenhum custo, nenhuma chave necessária. Implementado em `domain/ai-prompt.js` + `domain/ai-template.js` (o modelo/exemplo de JSON) + `components/ai-workout-modal.js`. Há também um botão em Ajustes para exportar só o arquivo-modelo `.json` de referência.
2. **Camada online opcional (Google Gemini)**: o mesmo checklist pode, em vez de gerar um texto para copiar, chamar diretamente a API gratuita do Google Gemini (`generativelanguage.googleapis.com`) usando `fetch()` do navegador com a chave de API do próprio usuário (gratuita, sem cartão, obtida em aistudio.google.com/apikey). Implementado em `domain/gemini-client.js`. Escolhido Gemini entre os provedores por ser o único com tier gratuito genuíno e utilizável direto do navegador sem custo — OpenAI/Anthropic não têm tier gratuito contínuo equivalente.

Regras seguidas na implementação (mantidas para qualquer extensão futura):

- **Opcional e desacoplada**: o app continua 100% funcional offline sem essa integração. A camada online só ativa se o usuário colar sua própria chave em Ajustes; sem chave, o app oferece a camada offline (prompt para copiar) automaticamente.
- **Consentimento explícito por ação**: a chave de API só é usada quando o usuário aperta "Gerar treino automaticamente (Gemini)" dentro do checklist — nenhuma chamada de rede acontece em segundo plano ou automaticamente.
- **Dado mínimo enviado**: só as respostas do checklist (objetivo, nível, dias/semana, equipamento, áreas de foco, restrições) vão no prompt — não o histórico de treino nem dados pessoais do usuário.
- **Chave nunca embutida no HTML**: a chave de API fica salva apenas no IndexedDB local do navegador do usuário (`settings.gemini_api_key`, via `data/settings.js`), nunca no código-fonte nem no arquivo `.html` distribuído.
- **Modo de revisão obrigatório**: a resposta da IA é validada contra o schema (`domain/workout-file.js` `validate()`) e mostrada em uma prévia (nome do treino + dias/exercícios) antes de qualquer gravação — o usuário confirma a importação manualmente; a IA nunca sobrescreve um treino existente sem essa confirmação.
- **Falhas tratadas explicitamente**: sem internet, chave inválida, limite de uso gratuito atingido, resposta bloqueada por segurança ou JSON inválido devolvido pela IA são todos estados de erro distintos e traduzidos (pt/en), com opção de tentar novamente ou voltar ao formulário.

Ainda não implementado (possível extensão futura, não solicitada): usar o histórico/métricas já calculados localmente (volume semanal, 1RM estimado, PRs) como contexto adicional enviado à IA, e suporte a outros provedores (OpenAI/Anthropic) como alternativa configurável.

---

## 10. Fora de escopo (por ora)

- Rede social / compartilhamento público de treinos entre usuários.
- Sincronização em nuvem multi-dispositivo automática (fase 1 usa exportação/importação manual de backup).
- Monetização, assinaturas ou compras dentro do app.
- Empacotamento nativo (app de loja, instalador, ícone no sistema) — descartado conscientemente em favor do arquivo HTML único; reavaliar apenas se um dia a confiabilidade do aviso de descanso em segundo plano (seção 5.3) se tornar um problema real no uso.
