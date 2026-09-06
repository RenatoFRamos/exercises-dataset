// Abre o seletor de arquivo do sistema operacional pelo navegador.
export function pickFile(accept = '.json,application/json') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, text: String(reader.result) });
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    });

    // Se o usuário cancelar o seletor, nenhum evento dispara de forma
    // confiável em todos os navegadores — não travamos o app por isso,
    // o input só fica órfão até a próxima interação (custo desprezível).
    input.click();
  });
}

// Copia texto para a área de transferência. `navigator.clipboard` só existe
// em contexto seguro (https/localhost) — abrir o app via file:// (o caso
// comum no celular, já que o entregável é um HTML solto) deixa esse objeto
// undefined, então caímos para o truque clássico de textarea+execCommand,
// que funciona em qualquer contexto. Retorna true só se algum dos dois
// caminhos realmente copiou.
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // segue para o fallback abaixo
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.setAttribute('readonly', '');
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (e) {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

// Exporta um conteúdo textual como arquivo via download do navegador.
export async function exportFile(filename, content, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
