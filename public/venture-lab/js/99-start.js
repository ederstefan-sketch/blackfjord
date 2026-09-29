// ---------- Start ----------
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      Object.assign(state, { user: null, profile: null, customers: [], selectedCustomerId: null, ventures: [], venture: null, membership: null, tab: 'chat', threadId: undefined });
      renderLogin();
    }
  });

  window.addEventListener('error', (e) => console.error('[Venture Lab]', e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => console.error('[Venture Lab]', e.reason));

  // Self-Check: Welche Kernfunktion aus welcher Datei fehlt?
  function missingCore() {
    const required = [
      ['sb', '00-core.js (Supabase-Client)'],
      ['h', '00-core.js (Helferfunktionen)'],
      ['renderLogin', '10-auth.js'],
      ['boot', '20-data.js'],
      ['renderAdminPage', '30-portal.js'],
      ['renderPortal', '31-customer-portal.js'],
      ['renderChat', '40-chat.js'],
    ];
    return required.filter(([fn]) => typeof window[fn] === 'undefined' && (typeof eval === 'function' ? typeof eval(fn) === 'undefined' : true));
  }

  function showFatal(where, err) {
    console.error('[Venture Lab]', where, err);
    const box = document.getElementById('app');
    if (!box) return;
    box.replaceChildren(
      h('div', { class: 'pad' },
        h('h2', {}, 'Das Venture Lab konnte nicht geladen werden'),
        h('p', { class: 'muted' }, 'Fehler in: ' + where),
        h('p', { class: 'err' }, String(err?.message || err)),
        h('p', { class: 'muted' }, 'Lad die Seite neu (Strg+Shift+R). Wenn der Fehler bleibt, melde ihn mit dem Text oben an ' + CONTACT + '.'),
        h('button', { class: 'btn', style: 'margin-top:10px', onclick: () => location.reload() }, 'Neu laden'))
    );
  }

  (async () => {
    try {
      const miss = missingCore();
      if (miss.length) {
        throw new Error('Nicht geladen: ' + miss.map(([, f]) => f).join(', '));
      }
      const recovery = location.hash.includes('type=recovery');
      const { data: { session }, error } = await sb.auth.getSession();
      if (error) throw Object.assign(new Error(error.message), { stage: 'Supabase getSession' });
      if (recovery && session) return renderRecovery();
      if (session) return await boot(session.user);
      renderLogin();
    } catch (e) {
      showFatal(e?.stage || 'Start', e);
    }
  })();
