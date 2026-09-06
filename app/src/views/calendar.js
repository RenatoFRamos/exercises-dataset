import { t } from '../i18n/index.js';
import { listCompletedSessions, getAllSessionSets } from '../data/repo.js';
import { sessionVolume } from '../domain/metrics.js';
import { showModal } from '../components/modal.js';
import { navigate } from '../router.js';

// Nota de escopo: o modelo de dados atual não guarda um "dia da semana
// planejado" por rotina — dias de treino são só uma lista ordenada (seção 5.2
// do APP_RULES não fixou isso). Por isso este calendário mostra dias
// TREINADOS de fato; marcar "planejado e não cumprido" exigiria um recurso
// de agenda semanal que não existe ainda — não foi inventado aqui para não
// fabricar dado falso.

let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();

export async function renderCalendar(container) {
  const sessions = await listCompletedSessions();
  const allSets = await getAllSessionSets();
  const setsBySession = new Map();
  for (const s of allSets) {
    if (!setsBySession.has(s.session_id)) setsBySession.set(s.session_id, []);
    setsBySession.get(s.session_id).push(s);
  }

  const sessionsByDay = new Map();
  for (const session of sessions) {
    const day = new Date(session.finished_at).toDateString();
    if (!sessionsByDay.has(day)) sessionsByDay.set(day, []);
    sessionsByDay.get(day).push(session);
  }

  function paint() {
    const first = new Date(viewYear, viewMonth, 1);
    const startWeekday = (first.getDay() + 6) % 7; // segunda = 0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const rawMonthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push('<div class="calendar-cell empty"></div>');
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const key = date.toDateString();
      const daySessions = sessionsByDay.get(key) || [];
      const trained = daySessions.length > 0;
      cells.push(`
        <button class="calendar-cell ${trained ? 'trained' : ''}" data-day="${key}" ${trained ? '' : 'disabled'}>
          <span>${d}</span>
          ${trained ? '<span class="calendar-dot"></span>' : ''}
        </button>
      `);
    }

    container.innerHTML = `
      <div class="view">
        <header class="view-header">
          <button class="btn-icon" id="back-to-history">←</button>
          <h1 class="text-lg" style="flex:1; text-align:center;">${monthLabel}</h1>
          <div class="flex gap-1">
            <button class="btn-icon" id="prev-month">‹</button>
            <button class="btn-icon" id="next-month">›</button>
          </div>
        </header>
        <div class="view-content">
          <div class="calendar-grid">${cells.join('')}</div>
        </div>
      </div>
    `;

    container.querySelector('#back-to-history').addEventListener('click', () => navigate('/history'));
    container.querySelector('#prev-month').addEventListener('click', () => {
      viewMonth -= 1;
      if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
      paint();
    });
    container.querySelector('#next-month').addEventListener('click', () => {
      viewMonth += 1;
      if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
      paint();
    });
    container.querySelectorAll('[data-day]').forEach((btn) => {
      btn.addEventListener('click', () => showDayModal(sessionsByDay.get(btn.dataset.day) || [], setsBySession));
    });
  }

  paint();
}

function showDayModal(daySessions, setsBySession) {
  showModal((modal) => {
    modal.innerHTML = `
      <div class="modal-header"><h2 class="text-lg font-bold">${new Date(daySessions[0].finished_at).toLocaleDateString()}</h2></div>
      ${daySessions.map((s) => {
        const volume = sessionVolume(setsBySession.get(s.id) || []);
        return `<div class="list-item"><div class="list-item-main"><div class="list-item-title">${s.name}</div><div class="list-item-sub">${t('history.volume', { value: Math.round(volume) })}</div></div></div>`;
      }).join('')}
    `;
  });
}
