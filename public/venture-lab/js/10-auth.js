// ---------- Anmeldung ----------
  function renderLogin(message) {
    const email = h('input', { type: 'email', id: 'em', autocomplete: 'username', required: true });
    const pass = h('input', { type: 'password', id: 'pw', autocomplete: 'current-password', required: true });
    const msg = h('p', { class: 'row err', role: 'alert' }, message || '');
    const btn = h('button', { class: 'btn', type: 'submit' }, 'Anmelden');
    const form = h('form', {
      onsubmit: async (ev) => {
        ev.preventDefault();
        btn.disabled = true; msg.textContent = '';
        const { data, error } = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value });
        if (error) { msg.textContent = 'E-Mail oder Passwort stimmt nicht.'; btn.disabled = false; return; }
        await boot(data.user);
      }
    },
      h('label', { for: 'em' }, 'E-Mail'), email,
      h('label', { for: 'pw' }, 'Passwort'), pass,
      btn, msg,
      h('p', { class: 'row' }, h('button', {
        class: 'link', type: 'button', onclick: async () => {
          if (!email.value.trim()) { msg.textContent = 'Trag oben deine E-Mail ein, dann senden wir dir einen Link.'; return; }
          const { error } = await sb.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: location.origin + '/venture-lab' });
          msg.className = 'row ' + (error ? 'err' : 'muted');
          msg.textContent = error ? 'Der Link konnte nicht gesendet werden.' : 'Wir haben dir einen Link zum Zurücksetzen gesendet.';
        }
      }, 'Passwort vergessen'))
    );
    app.replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'auth-box' },
      h('div', { class: 'brand' }, logo(), wordmark()),
      h('h1', {}, 'Venture Lab'),
      h('p', { class: 'muted' }, 'Melde dich an, um an deinem Venture zu arbeiten.'),
      form,
      h('p', { class: 'row muted' }, 'Noch kein Zugang? Der Zugang startet mit deinem BLACKFJORD-Paket unter ', h('a', { href: '/ventures', style: 'color:var(--blue)' }, 'blackfjord.at/ventures'), '.')
    )));
  }

  function renderRecovery() {
    const pass = h('input', { type: 'password', id: 'np', autocomplete: 'new-password', minlength: 8, required: true });
    const msg = h('p', { class: 'row err', role: 'alert' });
    const form = h('form', {
      onsubmit: async (ev) => {
        ev.preventDefault();
        const { error } = await sb.auth.updateUser({ password: pass.value });
        if (error) { msg.textContent = 'Das Passwort konnte nicht gespeichert werden. Nimm mindestens 8 Zeichen.'; return; }
        history.replaceState(null, '', location.pathname);
        const { data } = await sb.auth.getUser();
        await boot(data.user);
      }
    }, h('label', { for: 'np' }, 'Neues Passwort (mindestens 8 Zeichen)'), pass, h('button', { class: 'btn', type: 'submit' }, 'Passwort speichern'), msg);
    app.replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'auth-box' },
      h('div', { class: 'brand' }, logo(), wordmark()), h('h1', {}, 'Neues Passwort festlegen'), form)));
  }
