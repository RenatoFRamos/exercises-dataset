// Sem camada nativa (o app é um único HTML aberto no navegador), não existe
// botão físico de voltar para tratar. Mantido como stub para que modais e o
// visualizador de zoom (que chamam pushBackHandler para saber "fechar antes
// de navegar") continuem funcionando sem precisar de mudanças em cada tela.

export function pushBackHandler(_handler) {
  return () => {};
}

export async function init() {
  // no-op — nada a inicializar no navegador puro.
}
