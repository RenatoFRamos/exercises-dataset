// Roteador por hash, sem framework (T13). Cada rota é um padrão como
// "/workout/:id/edit" mapeado para uma função de render(container, params).

const routes = [];
let container = null;
let notFoundHandler = null;
let currentUnmount = null;

function compile(pattern) {
  const paramNames = [];
  const regexStr = pattern
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^/${regexStr}/?$`), paramNames };
}

export function register(pattern, handler) {
  const { regex, paramNames } = compile(pattern);
  routes.push({ pattern, regex, paramNames, handler });
}

export function setNotFound(handler) {
  notFoundHandler = handler;
}

export function navigate(path) {
  if (location.hash.slice(1) === path) {
    render();
  } else {
    location.hash = path;
  }
}

export function currentPath() {
  const hash = location.hash.slice(1);
  return hash || '/library';
}

async function render() {
  const path = currentPath().split('?')[0];

  if (typeof currentUnmount === 'function') {
    try { currentUnmount(); } catch (e) { /* view sem cleanup — ok */ }
    currentUnmount = null;
  }

  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
      container.innerHTML = '';
      const result = await route.handler(container, params);
      if (typeof result === 'function') currentUnmount = result;
      window.scrollTo(0, 0);
      const mainEl = document.querySelector('.app-main');
      if (mainEl) mainEl.scrollTop = 0;
      return;
    }
  }

  if (notFoundHandler) {
    container.innerHTML = '';
    notFoundHandler(container);
  }
}

export function start(appContainer) {
  container = appContainer;
  window.addEventListener('hashchange', render);
}

export function renderCurrent() {
  render();
}

export function rerender() {
  render();
}
