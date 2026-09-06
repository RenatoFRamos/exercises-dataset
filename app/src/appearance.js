// Aplica tema/cor de destaque/escala de fonte no <html>. Usado no boot
// (main.js) e sempre que o usuário muda algo em Ajustes (aplicação "ao vivo",
// regra 5.6 do APP_RULES).

export function resolveTheme(settings) {
  if (settings.high_contrast) return 'high-contrast';
  if (settings.theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return settings.theme;
}

export function applyAppearance(settings) {
  const html = document.documentElement;
  html.setAttribute('data-theme', resolveTheme(settings));
  html.setAttribute('data-accent', settings.accent);
  html.style.setProperty('--font-scale', String(settings.font_scale));
}
