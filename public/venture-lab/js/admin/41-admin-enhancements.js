/* BLACKFJORD Venture Lab — Cockpit, Entscheidungen, Merkpunkte & Löschaktionen
   Neue Ergänzungsdatei: laden, nachdem 32-admin-fixes.js und die Admin-Seiten geladen sind.
*/
(() => {
  // ---------- Cockpit-Erweiterung: Prioritäten + Entscheidungsjournal + Gedächtnis ----------
  const renderAdminOverviewBase = window.renderAdminOverview;

  window.renderAdminOverview = async function () {
    await renderAdminOverviewBase();

    const content = document.getElementById('content');
    if (!content || adminPage !== 'overview') return;

    try {
      const [ventureResult, taskResult, decisionResult, memoryResult] = await Promise.all([
        sb.from('ventures').select('id,title').order('created_at', { ascending: false }),
        sb.from('tasks').select('id,venture_id,title,status,due_date,phase,metadata,created_at').order('created_at', { ascending: false }).limit(200),
        sb.from('venture_decisions').select('id,venture_id,title,decision,status,scope,updated_at,created_at').order('updated_at', { ascending: false }).limit(30),
        sb.from('venture_memory').select('id,venture_id,kind,content,status,relevance,created_at').eq('status', 'active').order('relevance', { ascending: false }).order('created_at', { ascending: false }).limit(30)
      ]);

      const ventures = ventureResult.data || [];
      const ventureById = new Map(ventures.map(v => [v.id, v]));
      const done = ['done', 'completed', 'complete', 'closed', 'erledigt', 'abgeschlossen'];
      const openTasks = (taskResult.data || []).filter(t => !done.includes(String(t.status || '').trim().toLowerCase()));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue = task => {
        if (!task.due_date) return false;
        const due = new Date(String(task.due_date) + 'T00:00:00');
        return !Number.isNaN(due.getTime()) && due < today;
      };
      const priorityScore = task => {
        const p = String(task.metadata?.priority || task.metadata?.urgency || '').toLowerCase();
        const urgent = /kritisch|critical|urgent|sofort/.test(p) ? 400 :
          /hoch|high/.test(p) ? 300 : /mittel|medium/.test(p) ? 200 : 100;
        return (isOverdue(task) ? 1000 : 0) + urgent;
      };
      openTasks.sort((a, b) => priorityScore(b) - priorityScore(a) ||
        String(a.due_date || '9999-12-31').localeCompare(String(b.due_date || '9999-12-31')));

      const priorityRows = openTasks.length
        ? h('div', { class: 'admin-cockpit-record-list' },
            ...openTasks.slice(0, 6).map(task => {
              const venture = ventureById.get(task.venture_id);
              const overdue = isOverdue(task);
              const priority = task.metadata?.priority || task.metadata?.urgency || '';
              return h('article', { class: 'admin-cockpit-record' },
                h('div', { class: 'admin-cockpit-record-copy' },
                  h('strong', {}, task.title || 'Aufgabe ohne Titel'),
                  h('p', {}, venture?.title || 'Keinem Venture zugeordnet'),
                  h('span', { class: overdue ? 'admin-cockpit-urgent' : 'muted' },
                    [overdue ? 'ÜBERFÄLLIG' : '', priority ? 'Priorität: ' + priority : '', task.due_date ? 'Termin: ' + task.due_date : 'Kein Termin'].filter(Boolean).join(' · '))
                )
              );
            })
          )
        : adminEmpty('Keine offenen Aufgaben. Aktuell ist kein nächster Schritt als Aufgabe hinterlegt.');

      const activeDecisions = (decisionResult.data || []).filter(d =>
        !['archived', 'rejected', 'superseded'].includes(String(d.status || '').toLowerCase()));
      const decisionRows = activeDecisions.length
        ? h('div', { class: 'admin-cockpit-record-list' },
            ...activeDecisions.slice(0, 6).map(item => {
              const venture = ventureById.get(item.venture_id);
              return h('article', { class: 'admin-cockpit-record' },
                h('div', { class: 'admin-cockpit-record-copy' },
                  h('strong', {}, item.title || 'Entscheidung'),
                  h('p', {}, item.decision || 'Keine Beschreibung hinterlegt.'),
                  h('span', { class: 'muted' }, [venture?.title, item.status || 'Status offen'].filter(Boolean).join(' · '))
                )
              );
            })
          )
        : adminEmpty('Noch keine aktiven Entscheidungen gespeichert.');

      const memories = memoryResult.data || [];
      const memoryRows = memories.length
        ? h('div', { class: 'admin-cockpit-record-list' },
            ...memories.slice(0, 6).map(item => {
              const venture = ventureById.get(item.venture_id);
              const text = String(item.content || '');
              return h('article', { class: 'admin-cockpit-record' },
                h('div', { class: 'admin-cockpit-record-copy' },
                  h('strong', {}, (item.kind || 'Merkeintrag') + (venture?.title ? ' · ' + venture.title : '')),
                  h('p', {}, text.length > 240 ? text.slice(0, 240) + '…' : text),
                  h('span', { class: 'muted' }, 'Relevanz ' + (item.relevance ?? '–') + ' · ' + (item.created_at ? new Date(item.created_at).toLocaleDateString('de-AT') : 'Datum unbekannt'))
                )
              );
            })
          )
        : adminEmpty('Noch keine aktiven Merkeinträge vorhanden.');

      const panels = h('div', { class: 'admin-cockpit-extra' },
        adminSection('Prioritäten & nächste Schritte', 'Überfällige Aufgaben zuerst, danach Aufgaben mit höherer hinterlegter Priorität.', priorityRows),
        adminSection('Entscheidungen', 'Aktive Beschlüsse aus dem vorhandenen Entscheidungsjournal.', decisionRows),
        adminSection('Wichtige Merkpunkte', 'Aktive Fakten, Risiken und Erkenntnisse aus dem Venture-Gedächtnis.', memoryRows)
      );
      content.append(panels);
    } catch (error) {
      console.error('BLACKFJORD Cockpit-Erweiterung:', error);
      content.append(h('p', { class: 'muted' }, 'Prioritäten und Merkpunkte konnten nicht geladen werden. Details stehen in der Browser-Konsole.'));
    }
  };

  // ---------- Löschen: Venture nur, wenn keine Kerninhalte daran hängen ----------
  window.deleteAdminVenture = async function (venture) {
    if (!isAdmin() || !venture?.id) return;
    const title = venture.title || 'dieses Venture';
    if (!window.confirm('Venture „' + title + '“ wirklich löschen? Nur Ventures ohne verknüpfte Inhalte können hier gelöscht werden.')) return;

    const dependencies = [
      ['tasks', 'Aufgaben'],
      ['documents', 'Dokumente'],
      ['comm_messages', 'Nachrichten'],
      ['portal_memberships', 'Mitgliedschaften'],
      ['chat_threads', 'Chatverläufe'],
      ['chat_messages', 'Chatnachrichten'],
      ['venture_decisions', 'Entscheidungen'],
      ['venture_memory', 'Merkeinträge'],
      ['venture_activities', 'Aktivitäten'],
      ['analyses', 'Analysen']
    ];
    const found = [];
    for (const [table, label] of dependencies) {
      const { count, error } = await sb.from(table).select('id', { count: 'exact', head: true }).eq('venture_id', venture.id);
      if (error) {
        window.alert('Löschen abgebrochen: „' + label + '“ konnte nicht geprüft werden. Es wurde nichts gelöscht.');
        return;
      }
      if ((count || 0) > 0) found.push(label + ': ' + count);
    }
    if (found.length) {
      window.alert('Dieses Venture hat noch verknüpfte Daten und wurde nicht gelöscht:\n\n' + found.join('\n') + '\n\nBitte zuerst die Inhalte prüfen.');
      return;
    }

    const { data, error } = await sb.from('ventures').delete().eq('id', venture.id).select('id');
    if (error) {
      window.alert('Venture konnte nicht gelöscht werden: ' + error.message);
      return;
    }
    if (!data?.length) {
      window.alert('Venture wurde nicht gelöscht. Möglicherweise fehlen Berechtigungen.');
      return;
    }
    state.venture = null;
    state.ventures = (state.ventures || []).filter(item => item.id !== venture.id);
    adminPage = 'ventures';
    renderAdminPage();
  };

  // ---------- Löschen: Kundenkonto nur ohne Ventures ----------
  window.deleteAdminCustomer = async function (customer) {
    if (!isAdmin() || !customer?.id) return;
    const label = customer.full_name || customer.company || 'dieser Kunde';
    if (!window.confirm('Kundenkonto „' + label + '“ endgültig löschen? Dies ist nur möglich, wenn keine Ventures zugeordnet sind.')) return;

    const { data, error } = await sb.functions.invoke('venture-admin-delete-customer', {
      body: { customer_id: customer.id }
    });
    if (error || !data?.ok) {
      window.alert(data?.error || error?.message || 'Kundenkonto konnte nicht gelöscht werden.');
      return;
    }
    state.customers = (state.customers || []).filter(item => item.id !== customer.id);
    state.selectedCustomerId = null;
    state.venture = null;
    state.ventures = [];
    adminPage = 'customers';
    renderAdminPage();
  };

  // Ergänzt den Löschen-Button in der Kunden-Detailansicht.
  const renderCustomerDetailBase = window.renderAdminCustomerDetail;
  if (typeof renderCustomerDetailBase === 'function') {
    window.renderAdminCustomerDetail = async function (...args) {
      await renderCustomerDetailBase(...args);
      if (adminPage !== 'customer-detail') return;
      const toolbar = document.querySelector('#content .admin-toolbar');
      const customer = (state.customers || []).find(c => c.id === state.selectedCustomerId);
      if (!toolbar || !customer || toolbar.querySelector('[data-delete-customer]')) return;
      toolbar.append(h('button', {
        class: 'btn btn-danger',
        type: 'button',
        'data-delete-customer': 'true',
        onclick: () => window.deleteAdminCustomer(customer)
      }, 'Kundenkonto löschen'));
    };
  }
})();
