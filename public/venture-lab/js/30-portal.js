// ---------- Portal-Rahmen ----------
  function daysLeft(m) { return Math.ceil((new Date(m.trial_ends_at) - Date.now()) / 86400000); }
  function status() {
    const m = state.membership;
    if (!m) return isAdmin() ? { text: 'Admin', cls: '' } : { text: 'Kein Zugang aktiv', cls: 'bad' };
    if (m.plan === 'expired' || (m.plan === 'trial_full' && daysLeft(m) < 0)) return { text: 'Abgelaufen', cls: 'bad' };
    if (m.plan === 'trial_full') { const d = daysLeft(m); return { text: 'Testphase: noch ' + d + (d === 1 ? ' Tag' : ' Tage'), cls: d <= 7 ? 'warn' : '' }; }
    return { text: m.plan === 'full' ? 'FULL' : 'BASIC', cls: '' };
  }
  function banner() {
    const s = status(); const m = state.membership;
    if (isAdmin() && !m) return null;
    const contact = h('a', { href: 'mailto:' + CONTACT + '?subject=' + encodeURIComponent('Venture weiterentwickeln'), style: 'color:var(--blue)' }, 'Schreib uns');
    if (s.cls === 'bad' && m) return h('div', { class: 'banner bad' }, 'Dein Venture Workspace ist abgelaufen. Möchtest du dein Venture weiterentwickeln? ', contact, ' und wähle BASIC oder FULL.');
    if (s.cls === 'bad') return h('div', { class: 'banner bad' }, 'Für dieses Venture ist noch kein Zugang aktiv. ', contact, ', wenn du Hilfe brauchst.');
    if (s.cls === 'warn') return h('div', { class: 'banner warn' }, 'Deine Testphase endet bald. Danach kannst du mit BASIC selbstständig oder mit FULL samt BLACKFJORD-Begleitung weitermachen. ', contact, '.');
    return null;
  }

  function customerLabel(c) {
    return c?.full_name || c?.company || 'Kunde';
  }

  function customerSwitcher() {
    if (!isAdmin()) return null;
    return h('div', { style: 'display:flex;align-items:center;gap:8px;min-width:240px' },
      h('span', { class: 'muted', style: 'font-size:13px;white-space:nowrap' }, 'Kunde'),
      h('select', { 'aria-label': 'Kunde auswählen', onchange: (e) => selectCustomer(e.target.value) },
        h('option', { value: '', selected: !state.selectedCustomerId }, 'Alle Kunden'),
        state.customers.map((c) => h('option', { value: c.id, selected: c.id === state.selectedCustomerId }, customerLabel(c) + (c.company ? ' · ' + c.company : '')))
      )
    );
  }

  function renderAdminOverview() {
    const rows = state.customers.map((customer) => {
      const active = customer.id === state.selectedCustomerId;
      return h('button', { class: 'item', style: 'width:100%;text-align:left;background:none;border:0;color:inherit;cursor:pointer', onclick: () => selectCustomer(customer.id) },
        h('div', { class: 'grow' }, customerLabel(customer), h('div', { class: 'meta' }, customer.company || 'Kunde' )),
        h('span', { class: 'chip' }, active ? 'ausgewählt' : 'Kunde')
      );
    });
    app.replaceChildren(
      h('header', { class: 'top' }, h('div', { class: 'brand' }, logo(), wordmark(), h('small', {}, 'Admin · Venture Lab')),
        h('div', { class: 'top-right' }, customerSwitcher(), h('button', { class: 'btn ghost sm', onclick: () => sb.auth.signOut() }, 'Abmelden'))),
      h('main', { id: 'content' },
        h('h2', {}, 'Kunden'),
        h('p', { class: 'muted' }, 'Wähle einen Kunden, um seinen kompletten Venture-Workspace zu öffnen.'),
        h('div', { class: 'list' }, rows.length ? rows : h('p', { class: 'muted' }, 'Noch keine Kunden angelegt.'))
      )
    );
  }

  function renderPortal() {
    if (isAdmin() && !state.selectedCustomerId) { renderAdminOverview(); return; }
    if (!state.venture) {
      app.replaceChildren(
        h('header', { class: 'top' }, h('div', { class: 'brand' }, logo(), wordmark(), h('small', {}, 'Venture Lab')),
          h('div', { class: 'top-right' }, customerSwitcher(), isAdmin() ? h('button', { class: 'btn', onclick: newVenture }, 'Venture anlegen') : null,
            h('button', { class: 'btn ghost sm', onclick: () => sb.auth.signOut() }, 'Abmelden'))),
        h('div', { class: 'pad' }, h('h2', {}, 'Noch kein Venture'),
          h('p', { class: 'muted' }, isAdmin() ? 'Für diesen Kunden gibt es noch kein Venture.' : 'Sobald du ein BLACKFJORD-Paket gebucht hast, richten wir dein Venture Workspace ein.')));
      return;
    }
    const s = status();
    const sel = h('select', { 'aria-label': 'Venture wählen', onchange: (e) => selectVenture(e.target.value) },
      state.ventures.map((v) => h('option', { value: v.id, selected: v.id === state.venture.id }, v.title)));
    const top = h('header', { class: 'top' },
      h('div', { class: 'brand' }, logo(), wordmark(), h('small', {}, 'Venture Lab')),
      h('div', { class: 'top-right' }, customerSwitcher(), sel, h('span', { class: 'badge ' + s.cls }, s.text),
        isAdmin() ? h('button', { class: 'btn ghost sm', onclick: newVenture }, '+ Venture') : null,
        h('button', { class: 'btn ghost sm', onclick: () => sb.auth.signOut() }, 'Abmelden')));
    const nav = h('nav', { class: 'tabs', 'aria-label': 'Bereiche' },
      TABS.map(([id, label]) => h('button', {
        'aria-current': state.tab === id ? 'true' : 'false',
        onclick: () => { state.tab = id; renderPortal(); }
      }, label)));
    app.replaceChildren(...[top, banner(), nav, h('main', { id: 'content', class: state.tab === 'chat' ? 'chatmode' : '' })].filter(Boolean));
    // Höhe für den Chat: Rahmen abziehen
    const chrome = top.offsetHeight + (app.querySelector('.banner')?.offsetHeight || 0) + nav.offsetHeight;
    document.documentElement.style.setProperty('--chrome', chrome + 'px');
    renderTab();
  }

  async function renderTab() {
    const c = document.getElementById('content');
    const fn = { chat: renderChat, memory: renderMemory, tasks: renderTasks, docs: renderDocs, msgs: renderMsgs }[state.tab];
    try { await fn(c); } catch (e) { c.replaceChildren(h('p', { class: 'err pad' }, 'Fehler beim Laden: ' + e.message)); }
  }
