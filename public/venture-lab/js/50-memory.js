// ---------- Gedächtnis ----------
  const KINDS = { fact: 'Fakt', decision: 'Entscheidung', goal: 'Ziel', insight: 'Erkenntnis', risk: 'Risiko' };
  async function renderMemory(c) {
    const v = state.venture;
    const { data } = await sb.from('venture_memory').select('*').eq('venture_id', v.id).order('created_at', { ascending: false });
    const kind = h('select', { 'aria-label': 'Art' }, Object.entries(KINDS).map(([k, l]) => h('option', { value: k }, l)));
    const txt = h('input', { type: 'text', class: 'grow2', placeholder: 'Was soll sich Venture AI merken?', maxlength: 500, 'aria-label': 'Eintrag' });
    const add = async () => {
      if (!txt.value.trim()) return;
      const { error } = await sb.from('venture_memory').insert({ venture_id: v.id, kind: kind.value, content: txt.value.trim() });
      if (error) return fail(error);
      renderMemory(c);
    };
    txt.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
    c.replaceChildren(
      h('h2', {}, 'Projektgedächtnis'),
      h('p', { class: 'muted' }, 'Das weiß Venture AI über dein Venture. Neue Fakten und Entscheidungen aus dem Chat landen hier automatisch.'),
      h('div', { class: 'addrow' }, kind, txt, h('button', { class: 'btn', onclick: add }, 'Merken')),
      h('div', { class: 'list' }, (data || []).length ? data.map((m) => h('div', { class: 'item' },
        h('span', { class: 'chip' }, KINDS[m.kind] || m.kind),
        h('div', { class: 'grow' }, m.content, h('div', { class: 'meta' }, fmt(m.created_at))),
        h('button', { class: 'x', 'aria-label': 'Eintrag löschen', onclick: async () => { await sb.from('venture_memory').delete().eq('id', m.id); renderMemory(c); } }, '×')))
        : h('p', { class: 'muted' }, 'Noch nichts gespeichert. Starte im KI-Chat oder trag oben etwas ein.')));
  }
