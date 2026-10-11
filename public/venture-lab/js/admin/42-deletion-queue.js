/* BLACKFJORD Venture Lab — deletion queue controls */
(() => {
  window.deleteAdminCustomer = async function (customer) {
    if (!isAdmin() || !customer?.id) return;
    const label = customer.full_name || customer.company || 'dieser Kunde';
    if (!window.confirm('Kundenkonto „' + label + '“ jetzt sperren und die endgültige Löschung für 30 Tage vormerken? Ein Admin kann den Vorgang in dieser Frist aufheben.')) return;
    const { data, error } = await sb.functions.invoke('venture-admin-delete-customer', {
      body: { customer_id: customer.id, reason: 'Durch Admin im Venture Lab vorgemerkt' }
    });
    if (error || !data?.ok) {
      window.alert(data?.error || error?.message || 'Löschung konnte nicht vorgemerkt werden.');
      return;
    }
    state.customers = (state.customers || []).filter(item => item.id !== customer.id);
    state.selectedCustomerId = null;
    state.venture = null;
    state.ventures = [];
    adminPage = 'customers';
    renderAdminPage();
    window.alert(data.notification_status === 'sent'
      ? 'Kundenzugang wurde gesperrt. Die Löschung ist für 30 Tage vorgemerkt; die E-Mail wurde versendet.'
      : 'Kundenzugang wurde gesperrt. Die Löschung ist für 30 Tage vorgemerkt. ACHTUNG: Die Kunden-E-Mail wurde nicht bestätigt. Bitte den E-Mail-Status im Löschprotokoll prüfen.');
  };

  window.deleteAdminVenture = async function (venture) {
    if (!isAdmin() || !venture?.id) return;
    const title = venture.title || 'dieses Venture';
    if (!window.confirm('Venture „' + title + '“ sofort aus dem normalen Cockpit ausblenden und die endgültige Löschung für 30 Tage vormerken? Ein Admin kann den Vorgang in dieser Frist aufheben.')) return;
    const { data, error } = await sb.functions.invoke('venture-admin-request-deletion', {
      body: { entity_type: 'venture', entity_id: venture.id, reason: 'Durch Admin im Venture Lab vorgemerkt' }
    });
    if (error || !data?.ok) {
      window.alert(data?.error || error?.message || 'Löschung konnte nicht vorgemerkt werden.');
      return;
    }
    state.venture = null;
    state.ventures = (state.ventures || []).filter(item => item.id !== venture.id);
    adminPage = 'ventures';
    renderAdminPage();
    window.alert(data.notification_status === 'sent'
      ? 'Venture wurde ausgeblendet und für 30 Tage zur Löschung vorgemerkt. Der Kunde wurde informiert.'
      : 'Venture wurde ausgeblendet und für 30 Tage zur Löschung vorgemerkt. ACHTUNG: Die Kunden-E-Mail wurde nicht bestätigt. Bitte den E-Mail-Status im Löschprotokoll prüfen.');
  };

  const previousOverview = window.renderAdminOverview;
  if (typeof previousOverview === 'function') {
    window.renderAdminOverview = async function (...args) {
      await previousOverview(...args);
      if (adminPage !== 'overview') return;
      const content = document.getElementById('content');
      if (!content) return;
      try {
        const { data: requests, error } = await sb.from('deletion_requests')
          .select('id,entity_type,entity_id,status,requested_at,scheduled_for,attempt_count,error_message,notification_status,metadata')
          .in('status', ['pending', 'processing', 'blocked', 'failed'])
          .order('requested_at', { ascending: false }).limit(30);
        if (error) throw error;
        const rows = requests || [];
        const customerIds = [...new Set(rows.filter(r => r.entity_type === 'customer').map(r => r.entity_id))];
        const ventureIds = [...new Set(rows.filter(r => r.entity_type === 'venture').map(r => r.entity_id))];
        const [customerResult, ventureResult, auditResult] = await Promise.all([
          customerIds.length ? sb.from('profiles').select('id,full_name,company').in('id', customerIds) : Promise.resolve({ data: [], error: null }),
          ventureIds.length ? sb.from('ventures').select('id,title').in('id', ventureIds) : Promise.resolve({ data: [], error: null }),
          sb.from('deletion_audit_log').select('id,event_type,entity_type,created_at,request_id').order('created_at', { ascending: false }).limit(8)
        ]);
        if (customerResult.error || ventureResult.error || auditResult.error) throw customerResult.error || ventureResult.error || auditResult.error;
        const customers = new Map((customerResult.data || []).map(x => [x.id, x]));
        const ventures = new Map((ventureResult.data || []).map(x => [x.id, x]));
        const labels = { pending: 'Vorgemerkt', processing: 'Wird gelöscht', blocked: 'Gesperrt / prüfen', failed: 'Fehler – erneuter Versuch' };
        const queue = rows.length ? h('div', { class: 'admin-customer-list' }, ...rows.map(item => {
          const target = item.entity_type === 'customer' ? customers.get(item.entity_id) : ventures.get(item.entity_id);
          const name = item.entity_type === 'customer'
            ? (target?.full_name || target?.company || 'Kundenkonto')
            : (target?.title || item.metadata?.title || 'Venture');
          return h('div', { class: 'admin-customer-row' },
            h('div', { class: 'admin-customer-main' },
              h('strong', {}, name),
              h('span', { class: 'muted' }, (item.entity_type === 'customer' ? 'Kundenkonto' : 'Venture') + ' · ' + (labels[item.status] || item.status)),
              h('span', { class: 'muted' }, 'Vorgesehen: ' + new Date(item.scheduled_for).toLocaleDateString('de-AT') + ' · E-Mail: ' + (item.notification_status || 'offen')),
              item.error_message ? h('span', { class: 'form-error' }, item.error_message) : null
            ),
            h('button', { class: 'btn btn-secondary sm', type: 'button', disabled: item.status === 'processing', onclick: async () => {
              if (!window.confirm('Löschvormerkung für „' + name + '“ wirklich aufheben?')) return;
              const { data, error } = await sb.functions.invoke('venture-admin-restore-deletion', { body: { request_id: item.id } });
              if (error || !data?.ok) { window.alert(data?.error || error?.message || 'Wiederherstellung fehlgeschlagen.'); return; }
              window.alert('Löschvormerkung aufgehoben. Der Datensatz bleibt erhalten.');
              await window.renderAdminOverview();
            } }, 'Löschung aufheben')
          );
        })) : adminEmpty('Keine offenen Löschvorgänge.');
        const events = auditResult.data || [];
        const audit = events.length ? h('div', { class: 'admin-cockpit-record-list' }, ...events.map(item =>
          h('article', { class: 'admin-cockpit-record' },
            h('div', { class: 'admin-cockpit-record-copy' },
              h('strong', {}, String(item.event_type || 'Ereignis').replaceAll('_', ' ')),
              h('p', {}, (item.entity_type === 'customer' ? 'Kundenkonto' : 'Venture') + ' · ' + new Date(item.created_at).toLocaleString('de-AT'))
            )
          )
        )) : adminEmpty('Noch keine Audit-Ereignisse.');
        content.append(adminSection('Löschkontrolle', '30-Tage-Warteschlange und Wiederherstellung. Fehler bleiben sichtbar und werden erneut versucht.', queue));
        content.append(adminSection('Letzte Löschereignisse', 'Nachvollziehbares Protokoll der Löschkontrolle.', audit));
      } catch (error) {
        console.error('Löschkontrolle konnte nicht geladen werden:', error);
        content.append(h('p', { class: 'muted' }, 'Löschkontrolle konnte nicht geladen werden. Bitte Datenbankberechtigungen prüfen.'));
      }
    };
  }
})();
