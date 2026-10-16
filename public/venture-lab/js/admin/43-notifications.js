/* BLACKFJORD Venture Lab — Admin-Benachrichtigungen
   Ergänzt den bestehenden Admin-Bereich, ohne bestehende Dateien zu ersetzen.
*/
(() => {
  if (window.__bfAdminNotificationsLoaded) return;
  window.__bfAdminNotificationsLoaded = true;

  const originalAdminDrawer = window.adminDrawer;
  const originalRenderAdminPage = window.renderAdminPage;

  // Ergänzt einen Menüpunkt zum bestehenden Admin-Menü.
  if (typeof originalAdminDrawer === 'function') {
    window.adminDrawer = function () {
      const drawer = originalAdminDrawer();
      if (!drawer) return drawer;
      const nav = drawer.querySelector('.admin-nav');
      if (!nav || nav.querySelector('[data-bf-notifications]')) return drawer;

      const button = h('button', {
        class: 'admin-nav-item' + (adminPage === 'notifications' ? ' active' : ''),
        type: 'button',
        'data-bf-notifications': 'true',
        onclick: () => {
          menuOpen = false;
          adminPage = 'notifications';
          window.renderAdminPage();
        }
      },
        h('span', { class: 'admin-nav-icon' }, '●'),
        h('span', {}, 'Benachrichtigungen'),
        h('span', { class: 'badge warn', style: 'margin-left:auto' }, '…')
      );
      nav.appendChild(button);
      refreshUnreadBadge(button);
      return drawer;
    };
  }

  // Router-Erweiterung: alle bestehenden Seiten bleiben beim Original-Router.
  if (typeof originalRenderAdminPage === 'function') {
    window.renderAdminPage = function () {
      if (adminPage === 'notifications') {
        return window.renderAdminNotifications();
      }
      return originalRenderAdminPage();
    };
  }

  async function refreshUnreadBadge(button) {
    try {
      const { count, error } = await sb
        .from('portal_notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      if (error) throw error;
      const badge = button.querySelector('.badge');
      if (!badge) return;
      if (!count) {
        badge.remove();
      } else {
        badge.textContent = count > 99 ? '99+' : String(count);
      }
    } catch (error) {
      console.warn('Benachrichtigungs-Zähler konnte nicht geladen werden:', error);
      const badge = button.querySelector('.badge');
      if (badge) badge.remove();
    }
  }

  const dateLabel = value => {
    if (!value) return 'Zeitpunkt unbekannt';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('de-AT');
  };

  const priorityLabel = value => {
    const p = String(value || '').toLowerCase();
    if (['urgent', 'critical', 'high', 'hoch'].includes(p)) return ['Hoch', 'bad'];
    if (['medium', 'normal', 'mittel'].includes(p)) return ['Mittel', 'warn'];
    return ['Normal', ''];
  };

  window.renderAdminNotifications = async function () {
    adminShell('Benachrichtigungen',
      h('div', { class: 'admin-empty muted' }, 'Benachrichtigungen werden geladen …')
    );
    const content = document.getElementById('content');

    try {
      const { data, error } = await sb
        .from('portal_notifications')
        .select('id,venture_id,notification_type,title,body,priority,entity_type,entity_id,read_at,metadata,created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const notifications = data || [];
      const unread = notifications.filter(n => !n.read_at).length;

      const markRead = async (id) => {
        const { error: updateError } = await sb
          .from('portal_notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', id);
        if (updateError) throw updateError;
        await window.renderAdminNotifications();
      };

      const markAllRead = async () => {
        const ids = notifications.filter(n => !n.read_at).map(n => n.id);
        if (!ids.length) return;
        const { error: updateError } = await sb
          .from('portal_notifications')
          .update({ read_at: new Date().toISOString() })
          .in('id', ids);
        if (updateError) throw updateError;
        await window.renderAdminNotifications();
      };

      const rows = notifications.length
        ? h('div', { class: 'admin-task-list' },
            ...notifications.map(n => {
              const [priorityText, priorityClass] = priorityLabel(n.priority);
              return h('article', {
                class: 'admin-task-row',
                style: `align-items:flex-start;${n.read_at ? 'opacity:.72;' : 'border-left:3px solid var(--blue);'}`
              },
                h('div', { class: 'admin-task-main', style: 'min-width:0;flex:1' },
                  h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' },
                    h('strong', {}, n.title || 'Benachrichtigung'),
                    h('span', { class: 'badge ' + priorityClass }, priorityText),
                    !n.read_at ? h('span', { class: 'badge' }, 'Ungelesen') : h('span', { class: 'badge' }, 'Gelesen')
                  ),
                  h('p', { style: 'margin:6px 0;overflow-wrap:anywhere' }, n.body || 'Keine weiteren Details vorhanden.'),
                  h('div', { class: 'admin-task-meta' },
                    `${n.notification_type || 'Hinweis'} · ${dateLabel(n.created_at)}`
                  ),
                  n.venture_id
                    ? h('div', { class: 'admin-task-meta' }, `Venture-ID: ${n.venture_id}`)
                    : null
                ),
                !n.read_at
                  ? h('button', {
                      class: 'btn btn-secondary sm',
                      type: 'button',
                      onclick: async () => {
                        try { await markRead(n.id); }
                        catch (e) { console.error(e); alert('Konnte Benachrichtigung nicht als gelesen markieren: ' + (e.message || e)); }
                      }
                    }, 'Als gelesen markieren')
                  : null
              );
            })
          )
        : adminEmpty('Noch keine Benachrichtigungen vorhanden.');

      adminShell('Benachrichtigungen',
        h('section', { class: 'admin-cockpit-intro' },
          h('p', { class: 'eyebrow' }, 'SYSTEM & PROJEKTE'),
          h('h2', {}, 'Benachrichtigungen'),
          h('p', { class: 'muted' }, `${unread} ungelesen · ${notifications.length} zuletzt angezeigte Meldungen`)
        ),
        h('div', { class: 'addrow', style: 'margin-bottom:16px' },
          h('button', {
            class: 'btn btn-secondary',
            type: 'button',
            disabled: unread === 0,
            onclick: async () => {
              try { await markAllRead(); }
              catch (e) { console.error(e); alert('Konnte Benachrichtigungen nicht aktualisieren: ' + (e.message || e)); }
            }
          }, 'Alle als gelesen markieren'),
          h('button', {
            class: 'btn btn-secondary',
            type: 'button',
            onclick: () => window.renderAdminNotifications()
          }, 'Aktualisieren')
        ),
        adminSection('Letzte Meldungen', 'Automatische Prüfungen, Dokumentenstatus und weitere Systemhinweise.', rows)
      );
    } catch (error) {
      console.error('BLACKFJORD Admin-Benachrichtigungen:', error);
      if (content && document.getElementById('content')) {
        document.getElementById('content').replaceChildren(
          h('div', { class: 'admin-detail' },
            h('h2', {}, 'Benachrichtigungen konnten nicht geladen werden'),
            h('p', { class: 'muted' }, 'Bitte prüfe die Berechtigungen für portal_notifications.'),
            h('p', { class: 'err' }, error?.message || String(error)),
            h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => window.renderAdminNotifications() }, 'Erneut versuchen')
          )
        );
      }
    }
  };
})();
