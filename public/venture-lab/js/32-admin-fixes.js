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
    if (e.key === 'Escape' && menuOpen) { menuOpen = false; renderAdminPage(); }
  });

// ---------- Platzhalter: Aktivitäten & Einstellungen ----------
  function renderAdminActivity() {
    adminShell('Aktivitäten',
      h('p', { class: 'admin-page-intro muted' }, 'Alle Aktivitäten deiner Ventures – hier entsteht die Chronik.'),
      adminSection('Aktivitäten', 'Zuletzt passiert in deinen Ventures – Ansicht folgt.',
        adminEmpty('Die Aktivitäten-Ansicht ist in Arbeit. Hier erscheinen bald Meilensteine, neue Dokumente und Nachrichten im Überblick.')));
  }

  function renderAdminSettings() {
    adminShell('Einstellungen',
      h('p', { class: 'admin-page-intro muted' }, 'Profil, Team und Portal-Einstellungen verwalten.'),
      adminSection('Einstellungen', 'Profil- und Teamverwaltung folgen.',
        adminEmpty('Die Einstellungen sind in Arbeit. Hier kannst du später Profil, Team und Abrechnung verwalten.')));
  }
