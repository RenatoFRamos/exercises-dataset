// Traduz os 1.324 nomes de exercícios (inglês -> português) usando um
// dicionário de termos + regras de reordenação gramatical simples, já que
// traduzir cada um manualmente não é viável. Gera
// src/data/generated/exercise-names-pt.json: { "<id>": "<nome em pt>" }.
//
// Estratégia:
// 1. Normaliza sufixos (male)/(female)/(pov) etc.
// 2. Aplica substituições de FRASE conhecidas (ex.: "bench press" -> "supino"),
//    da mais longa para a mais curta, para pegar termos compostos antes de
//    quebrar em palavras soltas.
// 3. Extrai o equipamento (se houver) e vira "com <equipamento>" no fim.
// 4. Reordena modificadores de postura/ângulo comuns (incline, seated...)
//    para DEPOIS do termo já traduzido (adjetivos em PT vêm depois).
// 5. O que sobra é traduzido palavra a palavra pelo dicionário; palavras sem
//    tradução conhecida (nomes próprios como "Zottman", "Arnold") permanecem
//    como estão — é o padrão até em português falado (“rosca Zottman”).

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '../src/data/generated/exercises.json');
const OUT = path.join(__dirname, '../src/data/generated/exercise-names-pt.json');

// ===== 1. Substituições de frase (da mais específica para a mais genérica) =====
const PHRASES = [
  ['bench press', 'supino'],
  ['chest press', 'supino'],
  ['shoulder press', 'desenvolvimento'],
  ['overhead press', 'desenvolvimento'],
  ['military press', 'desenvolvimento militar'],
  ['leg press', 'leg press'],
  ['leg curl', 'flexora'],
  ['leg extension', 'extensora'],
  ['leg raise', 'elevação de pernas'],
  ['lateral raise', 'elevação lateral'],
  ['front raise', 'elevação frontal'],
  ['rear raise', 'elevação posterior'],
  ['calf raise', 'panturrilha'],
  ['lat pulldown', 'puxada'],
  ['pulldown', 'puxada'],
  ['pull up', 'barra fixa'],
  ['pull-up', 'barra fixa'],
  ['chin up', 'barra fixa (pegada supinada)'],
  ['chin-up', 'barra fixa (pegada supinada)'],
  ['push up', 'flexão'],
  ['push-up', 'flexão'],
  ['sit up', 'abdominal'],
  ['sit-up', 'abdominal'],
  ['bent over row', 'remada curvada'],
  ['seated row', 'remada sentada'],
  ['upright row', 'remada alta'],
  ['face pull', 'face pull'],
  ['hip thrust', 'elevação de quadril'],
  ['hack squat', 'agachamento hack'],
  ['front squat', 'agachamento frontal'],
  ['back squat', 'agachamento livre'],
  ['goblet squat', 'agachamento goblet'],
  ['sumo squat', 'agachamento sumô'],
  ['jump squat', 'agachamento com salto'],
  ['romanian deadlift', 'levantamento terra romeno'],
  ['stiff leg deadlift', 'levantamento terra pernas rígidas'],
  ['sumo deadlift', 'levantamento terra sumô'],
  ['good morning', 'good morning'],
  ['hyperextension', 'hiperextensão'],
  ['russian twist', 'giro russo'],
  ['mountain climber', 'escalador'],
  ['jumping jack', 'polichinelo'],
  ['side bend', 'flexão lateral de tronco'],
  ['skull crusher', 'tríceps testa'],
  ['skullcrusher', 'tríceps testa'],
  ['triceps extension', 'extensão de tríceps'],
  ['triceps pushdown', 'tríceps na polia'],
  ['triceps kickback', 'tríceps coice'],
  ['biceps curl', 'rosca bíceps'],
  ['bicep curl', 'rosca bíceps'],
  ['hammer curl', 'rosca martelo'],
  ['preacher curl', 'rosca scott'],
  ['concentration curl', 'rosca concentrada'],
  ['drag curl', 'rosca drag'],
  ['spider curl', 'rosca spider'],
  ['zottman curl', 'rosca zottman'],
  ['wrist curl', 'rosca de punho'],
  ['reverse curl', 'rosca inversa'],
  ['pec deck', 'peck deck'],
  ['chest fly', 'crucifixo'],
  ['chest dip', 'mergulho'],
  ['tricep dip', 'mergulho para tríceps'],
  ['triceps dip', 'mergulho para tríceps'],
  ['glute bridge', 'ponte de glúteo'],
  ['donkey kick', 'coice'],
  ['fire hydrant', 'fire hydrant'],
  ['clamshell', 'clamshell'],
  ['box jump', 'salto na caixa'],
  ['broad jump', 'salto em distância'],
  ['battle rope', 'corda naval'],
  ['farmers walk', 'caminhada do fazendeiro'],
  ['farmer\'s walk', 'caminhada do fazendeiro'],
  ['turkish get up', 'turkish get-up'],
  ['bear crawl', 'urso (bear crawl)'],
  ['bird dog', 'bird dog'],
  ['dead bug', 'dead bug'],
  ['ab wheel', 'roda abdominal'],
  ['ab rollout', 'rollout abdominal'],
  ['wood chop', 'lenhador'],
  ['woodchopper', 'lenhador'],
  ['pallof press', 'pallof press'],
  ['arnold press', 'desenvolvimento arnold'],
  ['bradford press', 'desenvolvimento bradford'],
  ['landmine press', 'press landmine'],
  ['bulgarian split squat', 'agachamento búlgaro'],
  ['split squat', 'agachamento afundo'],
  ['step up', 'subida no step'],
  ['step-up', 'subida no step'],
  ['calf stretch', 'alongamento de panturrilha'],
  ['hamstring stretch', 'alongamento de posterior de coxa'],
  ['quad stretch', 'alongamento de quadríceps'],
  ['glute stretch', 'alongamento de glúteo'],
  ['shoulder stretch', 'alongamento de ombro'],
  ['chest stretch', 'alongamento de peito'],
  ['neck stretch', 'alongamento de pescoço'],
  ['hip flexor', 'flexor de quadril'],
  ['toe touch', 'toque nos pés'],
  ['knee raise', 'elevação de joelhos'],
  ['knee tuck', 'flexão de joelhos'],
  ['flutter kick', 'flutter kick (tesoura)'],
  ['scissor kick', 'tesoura'],
  ['high knees', 'joelho alto'],
  ['jack knife', 'canivete'],
  ['superman', 'super-homem'],
  ['cat cow', 'gato-vaca'],
  ['cobra stretch', 'alongamento cobra'],
  ['downward dog', 'cachorro olhando para baixo'],
  ['world greatest stretch', 'alongamento mundial'],
  ['figure 8', 'oito (figura 8)'],
  ['around the world', 'volta ao mundo'],

  // Pegadas — como frase para concordar certo com "pegada" (feminino),
  // em vez de virar "aberto pegada"/"fechado pegada".
  ['wide grip', 'pegada aberta'], ['wide-grip', 'pegada aberta'],
  ['close grip', 'pegada fechada'], ['close-grip', 'pegada fechada'],
  ['narrow grip', 'pegada fechada'], ['narrow-grip', 'pegada fechada'],
  ['reverse grip', 'pegada invertida'], ['reverse-grip', 'pegada invertida'],
  ['underhand grip', 'pegada supinada'], ['overhand grip', 'pegada pronada'],
  ['neutral grip', 'pegada neutra'], ['parallel grip', 'pegada paralela'],
  ['mixed grip', 'pegada mista'], ['hook grip', 'pegada gancho'],

  // Lateralidade — mais natural como "unilateral"/"bilateral" do que a
  // tradução literal "um braço"/"dois braços".
  ['one arm', 'unilateral'], ['single arm', 'unilateral'], ['one hand', 'unilateral'],
  ['two arm', 'bilateral'], ['both arms', 'bilateral'],
  ['one leg', 'unilateral'], ['single leg', 'unilateral'],

  ['full squat', 'agachamento completo'], ['full sit-up', 'abdominal completo'],
  ['full range of motion', 'amplitude completa'],
  ['behind the neck', 'atrás da nuca'], ['behind neck', 'atrás da nuca'],
  ['behind head', 'atrás da cabeça'],
  ['on stability ball', 'na bola suíça'], ['on exercise ball', 'na bola suíça'],
  ['stability ball', 'bola suíça'], ['exercise ball', 'bola suíça'],
  ['medicine ball', 'bola medicinal'],
  ['arm blaster', 'arm blaster']
];

// ===== 2. Equipamentos (extraídos e viram "com <termo>") — SEM "com" aqui
//    dentro: quem concatena decide o conector, senão duplica ("com com X"). =====
const EQUIPMENT = {
  barbell: 'barra', dumbbell: 'halteres', dumbbells: 'halteres', cable: 'cabo',
  band: 'faixa elástica', kettlebell: 'kettlebell', machine: 'máquina',
  smith: 'smith', lever: 'máquina articulada', ez: 'barra w', olympic: 'barra olímpica',
  resistance: 'faixa de resistência', medicine: 'bola medicinal', stability: 'bola suíça',
  bosu: 'bosu', sled: 'trenó', weighted: 'peso adicional', bodyweight: 'peso corporal',
  assisted: 'assistido', trap: 'barra hexagonal', hammer: 'hammer', rope: 'corda',
  plate: 'anilha', bar: 'barra'
};

// ===== 3. Modificadores que em português viram adjetivo DEPOIS do
//    substantivo (postura, pegada, lateralidade, contagem de membros...).
//    { m: forma masculina, f: forma feminina } para concordância com o
//    termo-base (ver GENDER/MOVEMENT_KEYWORDS mais abaixo). =====
const POSTURE = {
  incline: { m: 'inclinado', f: 'inclinada' }, decline: { m: 'declinado', f: 'declinada' },
  seated: { m: 'sentado', f: 'sentada' }, standing: { m: 'em pé', f: 'em pé' },
  lying: { m: 'deitado', f: 'deitada' }, kneeling: { m: 'ajoelhado', f: 'ajoelhada' },
  prone: { m: 'de bruços', f: 'de bruços' }, supine: { m: 'deitado', f: 'deitada' },
  bent: { m: 'curvado', f: 'curvada' }, bentover: { m: 'curvado', f: 'curvada' },
  hanging: { m: 'suspenso', f: 'suspensa' }, suspended: { m: 'suspenso', f: 'suspensa' },
  reclining: { m: 'reclinado', f: 'reclinada' }, squatting: { m: 'agachado', f: 'agachada' },
  alternate: { m: 'alternado', f: 'alternada' }, alternating: { m: 'alternado', f: 'alternada' },
  reverse: { m: 'invertido', f: 'invertida' }, straight: { m: 'reto', f: 'reta' },
  weighted: { m: 'com peso adicional', f: 'com peso adicional' },
  assisted: { m: 'assistido', f: 'assistida' }, single: { m: 'único', f: 'única' },
  wide: { m: 'aberto', f: 'aberta' }, narrow: { m: 'fechado', f: 'fechada' },
  close: { m: 'fechado', f: 'fechada' }, high: { m: 'alto', f: 'alta' }, low: { m: 'baixo', f: 'baixa' },
  inner: { m: 'interno', f: 'interna' }, outer: { m: 'externo', f: 'externa' },
  bilateral: { m: 'bilateral', f: 'bilateral' }, unilateral: { m: 'unilateral', f: 'unilateral' }
};

// ===== 4. Dicionário palavra-a-palavra (fallback geral) =====
const WORDS = {
  press: 'press', curl: 'rosca', raise: 'elevação', row: 'remada', extension: 'extensão',
  squat: 'agachamento', push: 'empurrar', pull: 'puxar', fly: 'crucifixo', flye: 'crucifixo',
  crunch: 'abdominal', crunches: 'abdominais', dip: 'mergulho', dips: 'mergulho',
  lunge: 'afundo', lunges: 'afundos', deadlift: 'levantamento terra', shrug: 'encolhimento',
  shrugs: 'encolhimento', twist: 'giro', twists: 'giros', stretch: 'alongamento',
  bridge: 'ponte', kickback: 'coice', kickbacks: 'coices', thrust: 'impulso', thrusts: 'impulsos',
  jump: 'salto', jumps: 'saltos', swing: 'balanço', snatch: 'arranco', clean: 'clean',
  jerk: 'jerk', plank: 'prancha', pullover: 'pullover', pushdown: 'na polia',

  arm: 'braço', arms: 'braços', leg: 'perna', legs: 'pernas', chest: 'peito', back: 'costas',
  shoulder: 'ombro', shoulders: 'ombros', hip: 'quadril', calf: 'panturrilha', calves: 'panturrilhas',
  triceps: 'tríceps', tricep: 'tríceps', biceps: 'bíceps', bicep: 'bíceps', delt: 'deltoide',
  deltoid: 'deltoide', glute: 'glúteo', glutes: 'glúteos', hamstring: 'posterior de coxa',
  quad: 'quadríceps', quads: 'quadríceps', lat: 'dorsal', wrist: 'punho', neck: 'pescoço',
  knee: 'joelho', knees: 'joelhos', ankle: 'tornozelo', ankles: 'tornozelos', head: 'cabeça',
  hand: 'mão', hands: 'mãos', elbow: 'cotovelo', spine: 'coluna', groin: 'virilha',
  abdominal: 'abdominal', ab: 'abdominal', oblique: 'oblíquo',

  one: 'um', two: 'dois', three: 'três', double: 'duplo',
  grip: 'pegada', overhand: 'pronada', underhand: 'supinada', neutral: 'neutra',
  front: 'frontal', rear: 'posterior', side: 'lateral', lateral: 'lateral', cross: 'cruzado',
  crossover: 'cruzado', half: 'meio', partial: 'parcial', floor: 'no chão',
  wall: 'na parede', flat: 'reto', upper: 'superior', lower: 'inferior', middle: 'meio',
  behind: 'atrás da', over: 'sobre', overhead: 'acima da cabeça', up: 'para cima', down: 'para baixo',
  forward: 'para frente', backward: 'para trás', around: 'ao redor', in: '', out: 'para fora',
  internal: 'interna', external: 'externa',

  isometric: 'isométrico', explosive: 'explosivo', plyo: 'pliométrico', bodyweight: 'peso corporal',
  resistance: 'faixa de resistência', band: 'faixa elástica', rope: 'corda', ball: 'bola', towel: 'toalha',
  medicine: 'medicinal', stability: 'suíça', bosu: 'bosu', box: 'caixa', step: 'step',
  bench: 'banco', platform: 'plataforma', roller: 'rolo', wheel: 'roda', trainer: 'trainer',
  machine: 'máquina', cage: 'gaiola', rack: 'rack', pin: 'pino', chair: 'cadeira',

  male: '(masculino)', female: '(feminino)', 'v.': 'v.', 'v': 'v', pov: '(pov)',

  and: 'e', with: 'com', to: 'para', of: 'de', the: 'o', on: 'em', from: 'de', into: 'em',
  a: 'um', against: 'contra', between: 'entre', through: 'através', across: 'através',

  motion: 'movimento', exercise: 'exercício', position: 'posição',
  variation: 'variação', support: 'apoio', touch: 'toque', hold: 'segurar', hug: 'abraço',
  circle: 'círculo', circles: 'círculos', circular: 'circular', rotation: 'rotação',
  rotational: 'rotacional', rotate: 'girar', extended: 'estendido', raised: 'elevado',
  elevated: 'elevado', pronation: 'pronação', supination: 'supinação', flexion: 'flexão',
  abduction: 'abdução', adduction: 'adução', good: 'good', morning: 'morning',
  hyperextension: 'hiperextensão', bird: 'pássaro', dog: 'cachorro', cat: 'gato', cow: 'vaca',
  superman: 'super-homem', frog: 'sapo', crab: 'caranguejo', bear: 'urso', spider: 'aranha',
  scissor: 'tesoura', flutter: 'tesoura', pistol: 'pistol', cossack: 'cossack',
  climber: 'escalador', walk: 'caminhada', walking: 'caminhando', run: 'corrida',
  crawl: 'rastejar', sprint: 'sprint', sprints: 'sprints', march: 'marcha',
  swimmer: 'nadador', windmill: 'moinho', pike: 'pike', tuck: 'flexão de joelhos',
  handstand: 'parada de mãos', archer: 'arqueiro', renegade: 'renegade',
  gorilla: 'gorila', monster: 'monster', pirate: 'pirata', judo: 'judô', yoga: 'yoga',
  butterfly: 'borboleta', diamond: 'diamante', frankenstein: 'frankenstein',

  ez: 'barra w', olympic: 'olímpica', smith: 'smith',
  cable: 'cabo', dumbbell: 'halteres', dumbbells: 'halteres', barbell: 'barra',
  kettlebell: 'kettlebell', hammer: 'hammer', sled: 'trenó', trap: 'hexagonal',
  landmine: 'landmine', zercher: 'zercher', jefferson: 'jefferson',

  toe: 'dedo do pé', toes: 'dedos dos pés', finger: 'dedo', heel: 'calcanhar',
  feet: 'pés', foot: 'pé', body: 'corpo', muscle: 'músculo',

  squats: 'agachamentos', presses: 'press', curls: 'roscas', raises: 'elevações',
  extensions: 'extensões', stretches: 'alongamentos', full: 'completo',

  bar: 'barra', bicycle: 'bicicleta', palm: 'palma', gripper: 'preensor',
  stance: 'postura', stork: 'cegonha', hops: 'saltitos', hop: 'saltito',
  burpee: 'burpee', pad: 'apoio', dead: 'morto', bug: 'inseto'
};

// Movimentos-base e seu gênero em português — usado para (a) saber onde
// reencaixar um modificador que veio antes dele no inglês ("seated press" ->
// "press sentado") e (b) concordar esse adjetivo em gênero ("remada" +
// incline -> "inclinadA", não "inclinado").
const MOVEMENT_GENDER = {
  press: 'm', rosca: 'f', elevação: 'f', remada: 'f', extensão: 'f', agachamento: 'm',
  crucifixo: 'm', abdominal: 'm', mergulho: 'm', afundo: 'm', 'levantamento terra': 'm',
  encolhimento: 'm', giro: 'm', ponte: 'f', coice: 'm', impulso: 'm', salto: 'm',
  balanço: 'm', arranco: 'm', prancha: 'f', pullover: 'm', 'na polia': 'm', puxada: 'f',
  'barra fixa': 'f', flexão: 'f', supino: 'm', desenvolvimento: 'm', flexora: 'f',
  extensora: 'f', panturrilha: 'f'
};
const MOVEMENT_KEYWORDS = new Set(Object.keys(MOVEMENT_GENDER));

const PHRASE_MARK_START = '';
const PHRASE_MARK_END = '';

function titleCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function translateName(rawName) {
  let name = rawName.toLowerCase();

  // Normaliza hífens/parênteses para dar espaço aos tokens.
  name = name.replace(/[-]/g, ' ');
  name = name.replace(/[()]/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();

  // 0. "with <equipamento>" -> só "<equipamento>": o "with" vai virar "com"
  //    pelo dicionário, mas o equipamento JÁ concatena com "com" no passo 5
  //    — sem isso, dá "com com barra".
  for (const eq of Object.keys(EQUIPMENT)) {
    name = name.replace(new RegExp(`\\bwith ${eq}\\b`, 'g'), eq);
  }

  // 1. Substituições de frase (mais longas primeiro) — cada uma vira UM
  //    token marcado com caracteres de controle (nunca aparecem no texto
  //    real), para não se confundir com palavras maiúsculas legítimas.
  const sortedPhrases = [...PHRASES].sort((a, b) => b[0].length - a[0].length);
  for (const [en, pt] of sortedPhrases) {
    const re = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    // Espaços DENTRO da frase virariam quebra de token no split(' ') mais
    // abaixo, cortando a palavra ao meio — usa  como espaço interno
    // provisório, revertido em unwrapPhrase().
    const ptToken = pt.replace(/ /g, '');
    name = name.replace(re, ` ${PHRASE_MARK_START}${ptToken}${PHRASE_MARK_END} `);
  }
  name = name.replace(/\s+/g, ' ').trim();

  // 2. Extrai equipamento (procura qualquer token que bata, remove da frase).
  let equipmentPt = null;
  const rawTokens = name.split(' ');
  const remaining = [];
  for (const tok of rawTokens) {
    if (!equipmentPt && EQUIPMENT[tok]) {
      equipmentPt = EQUIPMENT[tok];
      continue;
    }
    remaining.push(tok);
  }

  // 3. Traduz token a token, marcando quais são "postura" e qual é o
  //    movimento-base, para reordenar no passo 4.
  const isPhraseToken = (tok) => tok.startsWith(PHRASE_MARK_START);
  const unwrapPhrase = (tok) => tok.slice(1, -1).replace(//g, ' ');

  const translated = remaining.map((tok) => {
    if (isPhraseToken(tok)) return { text: unwrapPhrase(tok), isMovement: true, isPosture: false };
    if (POSTURE[tok]) return { text: null, postureKey: tok, isMovement: false, isPosture: true };
    if (WORDS[tok] !== undefined) {
      return { text: WORDS[tok], isMovement: MOVEMENT_KEYWORDS.has(WORDS[tok]), isPosture: false };
    }
    return { text: tok, isMovement: false, isPosture: false }; // nome próprio desconhecido
  }).filter((t) => t.text !== '');

  // 4. Reordena: modificador(es) de postura ANTES do movimento-base viram
  //    DEPOIS dele (adjetivo pós-substantivo, como em português) — e
  //    concordam em gênero com ele (remada = f, agachamento = m...).
  const movementIdx = translated.findIndex((t) => t.isMovement);
  const movementGender = movementIdx >= 0 ? (MOVEMENT_GENDER[translated[movementIdx].text] || 'm') : 'm';
  for (const t of translated) {
    if (t.isPosture) t.text = POSTURE[t.postureKey][movementGender];
  }
  let finalTokens;
  if (movementIdx > 0) {
    const before = translated.slice(0, movementIdx);
    const postureBefore = before.filter((t) => t.isPosture);
    const otherBefore = before.filter((t) => !t.isPosture);
    const fromMovement = translated.slice(movementIdx);
    finalTokens = [...otherBefore, ...fromMovement.slice(0, 1), ...postureBefore, ...fromMovement.slice(1)];
  } else {
    finalTokens = translated;
  }

  let result = finalTokens.map((t) => t.text).join(' ').replace(/\s+/g, ' ').trim();
  if (equipmentPt) {
    result = result ? `${result} com ${equipmentPt}` : `com ${equipmentPt}`;
  }
  result = result.replace(/\s+/g, ' ').trim();
  return titleCase(result || rawName);
}

function main() {
  const exercises = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const map = {};
  for (const ex of exercises) {
    map[ex.id] = translateName(ex.name);
  }
  fs.writeFileSync(OUT, JSON.stringify(map, null, 0));
  console.log(`OK: ${OUT} (${Object.keys(map).length} nomes)`);

  // Amostra para inspeção manual.
  const sampleIds = ['0001', '0025', '0032', '0043', '0085', '0091', '0294', '0334', '0652', '0662', '0027', '0049'];
  for (const id of sampleIds) {
    const ex = exercises.find((e) => e.id === id);
    if (ex) console.log(`${id}: "${ex.name}" -> "${map[id]}"`);
  }
}

main();
