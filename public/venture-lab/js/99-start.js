// ---------- Start ----------
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      Object.assign(state, { user: null, profile: null, customers: [], selectedCustomerId: null, ventures: [], venture: null, membership: null, tab: 'chat', threadId: undefined });
      renderLogin();
    }
  });

  window.addEventListener('error', (e) => console.error('[Venture Lab]', e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => console.error('[Venture Lab]', e.reason));

  (async () => {
    const recovery = location.hash.includes('type=recovery');
    const { data: { session } } = await sb.auth.getSession();
    if (recovery && session) return renderRecovery();
    if (session) return boot(session.user);
    renderLogin();
  })();
