/* BLACKFJORD Venture Lab – Hinweise/Benachrichtigungen
 * Ergänzt das bestehende Kundenportal, ohne vorhandene Dateien zu ersetzen.
 */
(function () {
  'use strict';

  if (window.__blackfjordNotificationsInstalled) return;
  window.__blackfjordNotificationsInstalled = true;

  function addNotificationsTab() {
    const nav = document.querySelector('nav.tabs[aria-label="Bereiche"]');
    if (!nav || nav.querySelector('[data-bf-notifications-tab]')) return;

    const button = h('button', {
      'data-bf-notifications-tab': 'true',
      'aria-current': state.tab === 'notifications' ? 'true' : 'false',
      onclick: function () {
        state.tab = 'notifications';
        renderPortal();
      }
    }, 'Hinweise');
    nav.appendChild(button);
  }

  async function renderNotifications(container) {
    const userId = state.user?.id || state.profile?.user_id || state.profile?.id;
    const ventureId = state.venture?.id;

    container.replaceChildren(
      h('section', { class: 'pad' },
        h('h2', {}, 'Hinweise'),
        h('p', { class: 'muted' }, 'Automatische Erinnerungen zu Aufgaben, Dokumenten und deinem Venture.')
      ),
      h('div', { class: 'pad muted' }, 'Hinweise werden geladen …')
    );

    if (!userId || !ventureId) {
      container.replaceChildren(
        h('div', { class: 'pad' },
          h('h2', {}, 'Hinweise'),
          h('p', { class: 'muted' }, 'Für dieses Venture konnten keine Benutzerdaten ermittelt werden. Bitte lade das Portal neu.')
        )
      );
      return;
    }

    const result = await sb
      .from('portal_notifications')
      .select('id,notification_type,title,body,priority,entity_type,entity_id,read_at,created_at,metadata')
      .eq('user_id', userId)
      .eq('venture_id', ventureId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (result.error) throw result.error;
    const rows = result.data || [];
    const unread = rows.filter(function (item) { return !item.read_at; }).length;

    const heading = h('section', { class: 'pad' },
      h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap' },
        h('div', {},
          h('h2', {}, 'Hinweise'),
          h('p', { class: 'muted' }, unread ? unread + ' ungelesen' : 'Du bist auf dem neuesten Stand.')
        ),
        unread ? h('button', {
          class: 'btn-secondary sm',
          type: 'button',
          onclick: async function () {
            const ids = rows.filter(function (item) { return !item.read_at; }).map(function (item) { return item.id; });
            if (!ids.length) return;
            const update = await sb.from('portal_notifications')
              .update({ read_at: new Date().toISOString() })
              .in('id', ids)
              .eq('user_id', userId)
              .eq('venture_id', ventureId);
            if (update.error) throw update.error;
            await renderNotifications(container);
          }
        }, 'Alle als gelesen markieren') : null
      )
    );

    const list = h('div', { class: 'pad', style: 'display:grid;gap:12px;padding-top:0' });
    if (!rows.length) {
      list.appendChild(h('div', { class: 'card', style: 'padding:18px;border:1px solid var(--line, #ddd);border-radius:12px' },
        h('strong', {}, 'Keine Hinweise vorhanden'),
        h('p', { class: 'muted' }, 'Wenn es etwas zu beachten gibt, erscheinen die Hinweise hier.')
      ));
    }

    rows.forEach(function (item) {
      const isUnread = !item.read_at;
      const dateText = item.created_at ? new Date(item.created_at).toLocaleString('de-AT') : '';
      const priority = String(item.priority || '').toLowerCase();
      const card = h('article', {
        style: 'padding:16px;border:1px solid var(--line, #ddd);border-radius:12px;background:var(--card, transparent);' + (isUnread ? 'border-left:4px solid var(--blue, #4678d4);' : 'opacity:.82;')
      },
        h('div', { style: 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px' },
          h('div', { style: 'min-width:0' },
            h('div', { style: 'font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;color:var(--muted, #777);margin-bottom:6px' },
              (isUnread ? 'Ungelesen · ' : 'Gelesen · ') + (item.notification_type || 'Hinweis') + (priority === 'high' || priority === 'urgent' ? ' · Wichtig' : '')
            ),
            h('h3', { style: 'margin:0 0 8px' }, item.title || 'Hinweis'),
            h('p', { style: 'margin:0;white-space:pre-wrap;line-height:1.5' }, item.body || ''),
            dateText ? h('p', { class: 'muted', style: 'font-size:.82rem;margin:10px 0 0' }, dateText) : null
          ),
          isUnread ? h('span', { class: 'badge', style: 'flex-shrink:0' }, 'Neu') : null
        ),
        isUnread ? h('div', { style: 'margin-top:12px' }, h('button', {
          class: 'btn-secondary sm',
          type: 'button',
          onclick: async function () {
            const update = await sb.from('portal_notifications')
              .update({ read_at: new Date().toISOString() })
              .eq('id', item.id)
              .eq('user_id', userId)
              .eq('venture_id', ventureId);
            if (update.error) throw update.error;
            await renderNotifications(container);
          }
        }, 'Als gelesen markieren')) : null
      );
      list.appendChild(card);
    });

    container.replaceChildren(heading, list);
  }

  const originalRenderPortal = window.renderPortal;
  if (typeof originalRenderPortal === 'function') {
    window.renderPortal = function () {
      const result = originalRenderPortal.apply(this, arguments);
      addNotificationsTab();
      return result;
    };
  }

  const originalRenderTab = window.renderTab;
  if (typeof originalRenderTab === 'function') {
    window.renderTab = async function () {
      if (state.tab === 'notifications') {
        const container = document.getElementById('content');
        if (!container) return;
        try {
          await renderNotifications(container);
        } catch (error) {
          container.replaceChildren(h('p', { class: 'err pad' }, 'Hinweise konnten nicht geladen werden: ' + (error?.message || error)));
        }
        return;
      }
      return originalRenderTab.apply(this, arguments);
    };
  }

  // renderPortal wird erst nach dem Laden aller Portal-Skripte aufgerufen.
  if (document.readyState !== 'loading') addNotificationsTab();
  else document.addEventListener('DOMContentLoaded', addNotificationsTab, { once: true });
})();
