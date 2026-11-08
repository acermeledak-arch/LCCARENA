import { setRouteHandler, closeModal } from './client.js';
import { renderHomeView, renderSetupView, renderLobbyLaunchpad, renderHistoryView } from './views-home.js';
import { renderDisplayView } from './views-display.js';
import { renderControllerView } from './views-controller.js';

const appRoot = document.getElementById('app');
let activeCleanup = null;

async function handleRoute() {
  closeModal();
  if (typeof activeCleanup === 'function') {
    try { activeCleanup(); } catch { /* ignore */ }
    activeCleanup = null;
  }

  const p = decodeURIComponent(window.location.pathname).replace(/\/+$/, '') || '/';

  if (p === '/') {
    document.title = 'LCC ARENA — Simulasi Cerdas Cermat Numerasi SMP';
    activeCleanup = await renderHomeView(appRoot);
    return;
  }

  if (p === '/setup') {
    document.title = 'Setup Pertandingan — LCC ARENA';
    activeCleanup = await renderSetupView(appRoot);
    return;
  }

  const lobbyMatch = p.match(/^\/lobby\/([A-Za-z0-9-]+)$/);
  if (lobbyMatch) {
    document.title = `Lobby #${lobbyMatch[1].toUpperCase()} — LCC ARENA`;
    activeCleanup = await renderLobbyLaunchpad(appRoot, lobbyMatch[1]);
    return;
  }

  const dispMatch = p.match(/^\/display\/([A-Za-z0-9-]+)$/);
  if (dispMatch) {
    document.title = `Display #${dispMatch[1].toUpperCase()} — LCC ARENA`;
    activeCleanup = await renderDisplayView(appRoot, dispMatch[1]);
    return;
  }

  const ctrlMatch = p.match(/^\/controller\/([A-Za-z0-9-]+)$/);
  if (ctrlMatch) {
    document.title = `Controller #${ctrlMatch[1].toUpperCase()} — LCC ARENA`;
    activeCleanup = await renderControllerView(appRoot, ctrlMatch[1]);
    return;
  }

  if (p === '/history') {
    document.title = 'Riwayat Pertandingan — LCC ARENA';
    activeCleanup = await renderHistoryView(appRoot, null);
    return;
  }

  const histDetail = p.match(/^\/history\/([A-Za-z0-9-]+)$/);
  if (histDetail) {
    document.title = 'Detail Riwayat — LCC ARENA';
    activeCleanup = await renderHistoryView(appRoot, histDetail[1]);
    return;
  }

  // Fallback to Home
  window.history.replaceState(null, '', '/');
  activeCleanup = await renderHomeView(appRoot);
}

setRouteHandler(handleRoute);
window.addEventListener('popstate', handleRoute);
handleRoute();
