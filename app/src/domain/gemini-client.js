// Chama a API pública gratuita do Google Gemini diretamente do navegador
// para gerar um treino em JSON a partir do prompt montado em ai-prompt.js.
// Requer que o usuário tenha sua própria chave (grátis, sem cartão) em
// aistudio.google.com/apikey. A chave nunca é embutida neste app — fica
// salva só no IndexedDB local do navegador do usuário (settings.js).

const MODEL = 'gemini-2.0-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export async function generateWorkoutJson({ apiKey, prompt }) {
  if (!apiKey) throw new GeminiError('missing_key', 'Chave de API não configurada.');

  let response;
  try {
    response = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
      })
    });
  } catch (e) {
    throw new GeminiError('network', 'Não foi possível conectar à IA. Verifique sua internet.');
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 403) {
      throw new GeminiError('invalid_key', 'Chave de API inválida, expirada ou sem permissão.');
    }
    if (response.status === 429) {
      throw new GeminiError('rate_limit', 'Limite gratuito da IA atingido no momento. Tente novamente em instantes.');
    }
    throw new GeminiError('http_error', `A IA respondeu com um erro (${response.status}).`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (e) {
    throw new GeminiError('bad_response', 'Resposta inesperada da IA.');
  }

  const candidate = payload && payload.candidates && payload.candidates[0];
  const finishReason = candidate && candidate.finishReason;
  const parts = (candidate && candidate.content && candidate.content.parts) || [];
  const text = parts.map((p) => p.text || '').join('');

  if (!text) {
    if (finishReason === 'SAFETY') {
      throw new GeminiError('blocked', 'A IA recusou gerar esse conteúdo.');
    }
    throw new GeminiError('empty_response', 'A IA não retornou nenhum conteúdo.');
  }

  const cleaned = stripCodeFence(text);
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new GeminiError('invalid_json', 'A IA não retornou um JSON válido.');
  }
}

function stripCodeFence(text) {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1] : trimmed;
}
