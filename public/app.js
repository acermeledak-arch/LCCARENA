import { setRouteHandler, closeModal, setActiveTheme, getActiveTheme } from './client.js';
import { renderHomeView, renderSetupView, renderSessionsListView } from './views-home.js';
import { renderHostScreen } from './views-display.js';
import { renderParticipantView } from './views-controller.js';

const appRoot = document.getElementById('app');
let activeCleanup = null;

setActiveTheme(getActiveTheme().id);

async function handleRoute() {
  closeModal();
  if (typeof activeCleanup === 'function') {
    try {
      activeCleanup();
    } catch {
      /* ignore */
    }
    activeCleanup = null;
  }

  const p = decodeURIComponent(window.location.pathname).replace(/\/+$/, '') || '/';

  if (p === '/') {
    document.title = 'Simulasi CPNS — Drilling CAT TIU & Live Scoring';
    activeCleanup = await renderHomeView(appRoot);
    return;
  }

  if (p === '/setup') {
    document.title = 'Buat Sesi Baru — Simulasi CPNS';
    activeCleanup = await renderSetupView(appRoot);
    return;
  }

  if (p === '/sessions' || p === '/history') {
    document.title = 'Daftar Sesi — Simulasi CPNS';
    activeCleanup = await renderSessionsListView(appRoot);
    return;
  }

  const hostMatch = p.match(/^\/(?:host|display|lobby)\/([A-Za-z0-9-]+)$/);
  if (hostMatch) {
    const code = hostMatch[1].toUpperCase();
    document.title = `Host Sesi #${code} — Simulasi CPNS`;
    activeCleanup = await renderHostScreen(appRoot, code);
    return;
  }

  const playMatch = p.match(/^\/(?:join|play|peserta|controller)\/([A-Za-z0-9-]+)$/);
  if (playMatch) {
    const code = playMatch[1].toUpperCase();
    document.title = `Peserta Sesi #${code} — Simulasi CPNS`;
    activeCleanup = await renderParticipantView(appRoot, code);
    return;
  }

  window.history.replaceState(null, '', '/');
  activeCleanup = await renderHomeView(appRoot);
}

setRouteHandler(handleRoute);
window.addEventListener('popstate', handleRoute);
handleRoute();
