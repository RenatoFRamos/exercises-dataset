// Gera um arquivo .json "modelo" para o usuário levar a uma IA de texto
// (ChatGPT, Gemini, Claude etc. usados fora do app) e pedir um treino
// personalizado no formato que o MeuPersonal importa. Não faz nenhuma
// chamada de rede — é só um arquivo de referência com instruções embutidas
// e uma amostra de exercícios reais do catálogo.
//
// O campo "_ai_instructions" é ignorado pelo validador de import
// (workout-file.js só olha os campos que conhece), então este mesmo arquivo
// pode, em teoria, ser reimportado como um treino de exemplo.

import { SCHEMA_VERSION, FILE_TYPE, SET_TYPES } from './workout-file.js';

// IDs reais e conhecidos do catálogo, cobrindo os principais grupos
// musculares — dá à IA exemplos concretos de exercise_id válidos para usar
// quando souber o exercício, em vez de inventar um id.
const SAMPLE_EXERCISE_IDS = [
  { id: '0025', name: 'barbell bench press', target: 'pectorals' },
  { id: '0032', name: 'barbell deadlift', target: 'glutes' },
  { id: '0043', name: 'barbell full squat', target: 'glutes' },
  { id: '0027', name: 'barbell bent over row', target: 'upper back' },
  { id: '0091', name: 'barbell seated overhead press', target: 'delts' },
  { id: '0294', name: 'dumbbell biceps curl', target: 'biceps' },
  { id: '0334', name: 'dumbbell lateral raise', target: 'delts' },
  { id: '0652', name: 'pull-up', target: 'lats' },
  { id: '0662', name: 'push-up', target: 'pectorals' },
  { id: '0241', name: 'cable triceps pushdown (v-bar)', target: 'triceps' },
  { id: '0586', name: 'lever lying leg curl', target: 'hamstrings' },
  { id: '0585', name: 'lever leg extension', target: 'quads' },
  { id: '1372', name: 'barbell standing calf raise', target: 'calves' },
  { id: '0085', name: 'barbell romanian deadlift', target: 'hamstrings' },
  { id: '0739', name: 'sled 45 degrees one leg press', target: 'quads' }
];

const INSTRUCTIONS = [
  'Você vai gerar um treino de musculação personalizado no formato JSON usado pelo app MeuPersonal.',
  '',
  'REGRAS DO FORMATO (siga exatamente):',
  `- Mantenha "schema_version": ${SCHEMA_VERSION} e "type": "${FILE_TYPE}" sem alterar.`,
  '- "name": nome curto do treino. "description": objetivo/observação geral (opcional, pode ser "").',
  '- "days": lista de dias de treino. Cada dia tem "label" (ex.: "Dia 1 - Peito e Tríceps") e "exercises".',
  '- Cada exercício em "exercises" tem os campos:',
  '  - "exercise_id": use um ID da lista "_sample_exercise_ids" abaixo QUANDO o exercício escolhido estiver nela.',
  '    Se não tiver certeza do ID exato, use null.',
  '  - "custom_name": nome do exercício em texto livre. OBRIGATÓRIO quando "exercise_id" for null. Pode ser null quando exercise_id estiver preenchido.',
  '  - "sets": número de séries de trabalho (inteiro, ex.: 3).',
  '  - "reps": faixa ou número de repetições, como texto (ex.: "8-12" ou "10").',
  '  - "rest_seconds": descanso entre séries, em segundos (ex.: 90).',
  '  - "warmup_sets": quantas séries são de aquecimento (não contam como treino de verdade). Use 0 se não houver.',
  `  - "set_type": um destes valores: ${SET_TYPES.map((s) => `"${s}"`).join(', ')}. Use "normal" na maioria dos casos.`,
  '  - "superset_group": use a mesma letra (ex.: "A") em 2+ exercícios para indicar que são feitos em sequência, sem descanso entre eles (bi-set/superserie). Use null quando o exercício for isolado.',
  '  - "notes": observação livre sobre a execução (pode ser "").',
  '',
  'IMPORTANTE:',
  '- Não invente campos novos nem remova os campos acima.',
  '- Gere um JSON válido, sem comentários, sem texto fora do JSON.',
  '- Depois de gerar, o usuário vai importar esse arquivo dentro do app MeuPersonal (tela "Treinos" → ícone de importar).',
  '',
  'Pergunte ao usuário (se ainda não souber): objetivo (hipertrofia/força/emagrecimento), nível (iniciante/intermediário/avançado), quantos dias por semana, equipamento disponível, e qualquer lesão ou restrição — e monte o treino considerando essas respostas.'
].join('\n');

export function buildAiTemplate() {
  return {
    _ai_instructions: INSTRUCTIONS,
    _sample_exercise_ids: SAMPLE_EXERCISE_IDS,
    schema_version: SCHEMA_VERSION,
    type: FILE_TYPE,
    name: 'Treino Personalizado (gerado por IA)',
    description: '',
    days: [
      {
        label: 'Dia 1 - Exemplo',
        exercises: [
          {
            exercise_id: '0025',
            custom_name: null,
            sets: 4,
            reps: '8-10',
            rest_seconds: 90,
            warmup_sets: 1,
            set_type: 'normal',
            superset_group: null,
            notes: 'Exemplo usando um exercise_id real do catálogo.'
          },
          {
            exercise_id: '0334',
            custom_name: null,
            sets: 3,
            reps: '12-15',
            rest_seconds: 0,
            warmup_sets: 0,
            set_type: 'normal',
            superset_group: 'A',
            notes: 'Exemplo de bi-set: sem descanso até terminar o grupo A.'
          },
          {
            exercise_id: null,
            custom_name: 'Elevação lateral no cross (exemplo custom_name)',
            sets: 3,
            reps: '12-15',
            rest_seconds: 45,
            warmup_sets: 0,
            set_type: 'drop_set',
            superset_group: 'A',
            notes: 'Exemplo de exercício sem ID conhecido — use custom_name.'
          }
        ]
      }
    ]
  };
}
