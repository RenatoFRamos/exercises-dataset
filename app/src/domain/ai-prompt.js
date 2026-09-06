// Monta um prompt de texto pronto para colar em qualquer IA de texto
// (ChatGPT, Gemini, Claude etc.), combinando as respostas do checklist do
// usuário com as instruções de formato já usadas em ai-template.js. Não faz
// nenhuma chamada de rede — o usuário copia e cola manualmente.

import { SCHEMA_VERSION, FILE_TYPE, SET_TYPES } from './workout-file.js';
import { buildAiTemplate } from './ai-template.js';

export function buildAiPrompt(answers) {
  const {
    goal, level, sex, daysPerWeek, sessionMinutes, equipment, focusAreas, restrictions, notes
  } = answers;

  const template = buildAiTemplate();
  const exampleJson = JSON.stringify(
    { schema_version: SCHEMA_VERSION, type: FILE_TYPE, name: '...', description: '...', days: template.days },
    null, 2
  );

  const lines = [
    'Você é um personal trainer. Monte um treino de musculação personalizado para mim, considerando:',
    '',
    `- Objetivo: ${goal}`,
    `- Nível: ${level}`,
    sex ? `- Sexo: ${sex}` : null,
    `- Dias de treino por semana: ${daysPerWeek}`,
    `- Tempo disponível por sessão: ${sessionMinutes} minutos`,
    `- Equipamento disponível: ${equipment || 'não informado'}`,
    focusAreas ? `- Grupos musculares prioritários: ${focusAreas}` : null,
    restrictions ? `- Lesões / restrições / o que evitar: ${restrictions}` : null,
    notes ? `- Observações adicionais: ${notes}` : null,
    '',
    'DIRETRIZES DE TREINO:',
    '- Baseie as escolhas de exercícios, ordem, séries, repetições, descanso e técnicas (ex.: bi-set, tri-set, drop-set, rest-pause) em estudos e técnicas reconhecidas de ciência do treinamento (hipertrofia/força), buscando o melhor resultado possível dentro do perfil informado.',
    '- Pode usar bi-sets ou tri-sets (mesmo "superset_group"), mas só combine exercícios que usem no máximo um aparelho + halteres, ou que sejam feitos no mesmo equipamento/estação (ex.: duas variações na mesma polia/cross-over). Evite combinar exercícios que exigem aparelhos diferentes e distantes entre si — na prática da academia isso costuma ser inviável (aparelho ocupado por outra pessoa, ou longe um do outro), o que quebra a sequência sem descanso que o bi-set/tri-set exige.',
    '- Todos os nomes de exercício ("custom_name") devem ficar no MESMO idioma em que este texto foi escrito — não misture idiomas dentro do mesmo treino (ex.: não escreva um nome em português e outro em inglês). Cada nome deve ser compreensível para quem lê nesse idioma, mesmo quando descrever um exercício menos comum.',
    '',
    'Depois de montar o treino, devolva a resposta APENAS como um JSON válido no formato abaixo (sem texto antes ou depois, sem comentários), pois vou importar esse arquivo direto no meu app de treino:',
    '',
    'REGRAS DO FORMATO:',
    `- Mantenha "schema_version": ${SCHEMA_VERSION} e "type": "${FILE_TYPE}" sem alterar.`,
    '- "days": um item por dia de treino, cada um com "label" e uma lista "exercises".',
    '- Cada exercício tem: "exercise_id" (use null se não tiver certeza do ID), "custom_name" (nome do exercício em texto — obrigatório quando exercise_id for null), "sets" (número), "reps" (texto, ex.: "8-12"), "rest_seconds" (número), "warmup_sets" (número, 0 se não houver aquecimento), ' +
      `"set_type" (um de: ${SET_TYPES.map((s) => `"${s}"`).join(', ')}), "superset_group" (mesma letra em 2+ exercícios feitos em sequência sem descanso, ou null), "notes" (texto livre, pode ser "") e "substitutes" (lista com 1 a 3 nomes de exercícios substitutos — mesmo grupo muscular, para quando o aparelho estiver ocupado; lista vazia [] se não houver).`,
    '',
    'Exemplo de estrutura esperada (adapte o conteúdo, mantenha os campos):',
    '```json',
    exampleJson,
    '```',
    '',
    'IMPORTANTE SOBRE O FORMATO DO JSON — siga EXATAMENTE as mesmas características do exemplo acima, para o arquivo abrir sem erro:',
    '- Use aspas duplas retas (") em todas as chaves e valores de texto — nunca aspas curvas/tipográficas (" " \' \').',
    '- Não inclua vírgula depois do último item de uma lista ou objeto.',
    '- Não inclua comentários dentro do JSON (// ou /* */ não são JSON válido).',
    '- Números (sets, rest_seconds, warmup_sets) sem aspas; textos (reps, notes, label, custom_name) sempre com aspas.',
    '- "superset_group" e "custom_name" quando não usados devem ser null (sem aspas), nunca a string "null".',
    '- Devolva o JSON completo e fechado (todas as chaves { e [ abertas devem ser fechadas) — não corte a resposta no meio.',
    '- Responda com o bloco ```json contendo só o JSON, nada de texto antes ou depois, nem dentro do bloco.'
  ].filter(Boolean);

  return lines.join('\n');
}
