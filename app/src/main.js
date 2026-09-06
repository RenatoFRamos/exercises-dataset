import * as db from './data/db.js';
import { seedIfNeeded } from './data/seed.js';
import { getAllSettings } from './data/settings.js';
import { setSettingsCache, getState, on } from './state.js';
import { setLanguage, t } from './i18n/index.js';
import { init as initBackButton } from './platform/back-button.js';
import { initFullscreenToggle } from './platform/fullscreen.js';
import * as router from './router.js';
import { getInProgressSession } from './data/repo.js';
import { applyAppearance } from './appearance.js';
import { confirmDialog } from './components/modal.js';

import { renderOnboarding } from './views/onboarding.js';
import { renderLibrary } from './views/library.js';
import { renderExerciseDetail } from './views/exercise-detail.js';
import { renderWorkouts } from './views/workouts.js';
import { renderWorkoutEdit } from './views/workout-edit.js';
import { renderSessionActive } from './views/session-active.js';
import { renderHistory } from './views/history.js';
import { renderCalendar } from './views/calendar.js';
import { renderProgress } from './views/progress.js';
import { renderSettings } from './views/settings.js';

const NAV_ITEMS = [
  { path: '/workouts', icon: '🏋️', labelKey: 'nav.workouts' },
  { path: '/library', icon: '📚', labelKey: 'nav.library' },
  { path: '/history', icon: '🗓️', labelKey: 'nav.history' },
  { path: '/progress', icon: '📈', labelKey: 'nav.progress' },
  { path: '/settings', icon: '⚙️', labelKey: 'nav.settings' }
];

const NAV_HIDDEN_ROUTES = ['/onboarding'];

function renderNav(root) {
  const current = '/' + router.currentPath().split('/')[1];
  const itemsEl = root.querySelector('#app-nav-items');
  if (NAV_HIDDEN_ROUTES.includes(current)) {
    root.classList.add('hidden');
    itemsEl.innerHTML = '';
    return;
  }
  root.classList.remove('hidden');
  itemsEl.innerHTML = NAV_ITEMS.map((item) => `
    <a class="nav-item ${current === item.path ? 'active' : ''}" href="#${item.path}">
      <span class="nav-icon">${item.icon}</span>
      <span>${t(item.labelKey)}</span>
    </a>
  `).join('');
}

async function boot() {
  const appEl = document.getElementById('app');
  appEl.innerHTML = `<div class="spinner"></div>`;

  await db.init();
  await seedIfNeeded();

  const settings = await getAllSettings();
  setSettingsCache(settings);
  setLanguage(settings.language);
  applyAppearance(settings);

  appEl.innerHTML = `
    <div class="app-shell">
      <nav class="bottom-nav" id="app-nav">
        <span id="app-nav-items" style="display: contents;"></span>
        <button type="button" class="nav-item" id="fullscreen-toggle">
          <span class="nav-icon">⛶</span>
          <span>${t('common.fullscreen')}</span>
        </button>
      </nav>
      <main class="app-main" id="app-main"></main>
    </div>
  `;

  const navEl = document.getElementById('app-nav');
  const mainEl = document.getElementById('app-main');

  initFullscreenToggle(document.getElementById('fullscreen-toggle'), {
    enter: t('common.fullscreen'),
    exit: t('common.exit_fullscreen')
  });

  renderNav(navEl);
  window.addEventListener('hashchange', () => renderNav(navEl));
  on('settings-changed', () => renderNav(navEl));

  router.register('/onboarding', renderOnboarding);
  router.register('/library', renderLibrary);
  router.register('/exercise/:id', renderExerciseDetail);
  router.register('/workouts', renderWorkouts);
  router.register('/workout/:id/edit', renderWorkoutEdit);
  router.register('/session/:id', renderSessionActive);
  router.register('/history', renderHistory);
  router.register('/calendar', renderCalendar);
  router.register('/progress', renderProgress);
  router.register('/settings', renderSettings);

  await initBackButton();

  router.start(mainEl);

  if (!settings.onboarding_done) {
    location.hash = '/onboarding';
    router.renderCurrent();
    return;
  }

  if (!location.hash) location.hash = '/workouts';
  router.renderCurrent();
  maybeOfferResume();
}

async function maybeOfferResume() {
  const session = await getInProgressSession();
  if (!session) return;
  const resume = await confirmDialog({
    title: t('session.resume_title'),
    body: t('session.resume_body'),
    confirmLabel: t('session.resume')
  });
  if (resume) {
    router.navigate(`/session/${session.id}`);
  }
}

// Scripts clássicos (sem type="module") executam imediatamente, na posição
// em que aparecem — se o <div id="app"> ainda não existir nesse ponto do
// HTML, boot() falha. Módulos ES adiam a execução automaticamente até o DOM
// estar pronto; um script comum não. Isso funciona nos dois casos.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
