// ---------- Admin-Fixes ----------
// logout wird im Admin-Header benutzt, war nach dem Umbau nicht mehr definiert.
async function logout() {
  await sb.auth.signOut();
}

// ---------- Drawer: mit Klick außerhalb / Escape schließen ----------
document.addEventListener('click', (e) => {
  if (!menuOpen) return;
  if (e.target.closest('.admin-drawer') || e.target.closest('.admin-menu-btn')) return;
  const backdrop = e.target.closest('.admin-drawer-backdrop');
  if (backdrop || !e.target.closest('.admin-drawer')) {
    menuOpen = false;
    renderAdminPage();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOpen) {
    menuOpen = false;
    renderAdminPage();
  }
});

// ---------- Platzhalter: Aktivitäten & Einstellungen ----------
// Diese Datei überschreibt bewusst NICHT mehr die vollständigen
// renderAdminActivity/renderAdminSettings-Funktionen aus 30-portal.js.
