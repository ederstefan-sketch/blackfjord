// ---------- Start ----------

sb.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    Object.assign(state, {
      user: null,
      profile: null,
      customers: [],
      selectedCustomerId: null,
      ventures: [],
      venture: null,
      membership: null,
      tab: 'chat',
      threadId: undefined
    });

    renderLogin();
  }
});

window.addEventListener('error', (e) => {
  console.error('[Venture Lab]', e.error || e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Venture Lab]', e.reason);
});

function showFatal(where, err) {
  console.error('[Venture Lab]', where, err);

  const box = document.getElementById('app');
  if (!box) return;

  box.innerHTML = `
    <div class="pad">
      <h2>Das Venture Lab konnte nicht geladen werden</h2>
      <p class="muted">Fehler in: ${where}</p>
      <p class="err">${String(err?.message || err)}</p>
      <button
        class="btn"
        style="margin-top:10px"
        onclick="location.reload()"
      >
        Neu laden
      </button>
    </div>
  `;
}


// ---------- Start ----------

(async () => {
  try {
    const recovery = location.hash.includes('type=recovery');

    const {
      data: { session },
      error
    } = await sb.auth.getSession();

    if (error) {
      throw new Error(error.message);
    }

    if (recovery && session) {
      renderRecovery();
      return;
    }

    if (session) {
      await boot(session.user);
      return;
    }

    renderLogin();

  } catch (e) {
    showFatal('Start', e);
  }
})();
