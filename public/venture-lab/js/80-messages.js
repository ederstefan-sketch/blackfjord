// ---------- Kommunikation mit BLACKFJORD ----------
  async function renderMsgs(c) {
    const v = state.venture;
    const { data } = await sb.from('comm_messages').select('*').eq('venture_id', v.id).order('created_at');
    const ta = h('textarea', { rows: 3, placeholder: 'Nachricht an ' + (isAdmin() ? 'den Kunden' : 'BLACKFJORD'), maxlength: 4000, 'aria-label': 'Nachricht' });
    const send = async () => {
      if (!ta.value.trim()) return;
      const { error } = await sb.from('comm_messages').insert({ venture_id: v.id, sender_id: state.user.id, body: ta.value.trim() });
      if (error) return fail(error);
      renderMsgs(c);
    };
    c.replaceChildren(
      h('h2', {}, 'Nachrichten an BLACKFJORD'),
      h('p', { class: 'muted' }, 'Fragen, Feedback und Reviews laufen hier direkt zwischen dir und BLACKFJORD.'),
      h('div', { class: 'list' }, (data || []).length ? data.map((m) => {
        const mine = m.sender_id === state.user.id;
        return h('div', { class: 'bubble-msg' }, h('div', { class: 'meta' }, (mine ? 'Du' : (isAdmin() ? 'Kunde' : 'BLACKFJORD')) + ' · ' + fmtT(m.created_at)), h('p', {}, m.body));
      }) : h('p', { class: 'muted' }, 'Noch keine Nachrichten.')),
      h('div', { style: 'margin-top:16px' }, ta, h('button', { class: 'btn', style: 'margin-top:10px', onclick: send }, 'Nachricht senden')));
  }
