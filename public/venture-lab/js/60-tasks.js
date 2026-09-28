// ---------- Aufgaben ----------
  const NEXT = { open: 'doing', doing: 'done', done: 'open' };
  const SYM = { open: '○', doing: '◐', done: '●' };
  const SLABEL = { open: 'offen', doing: 'in Arbeit', done: 'erledigt' };
  async function renderTasks(c) {
    const v = state.venture;
    const { data } = await sb.from('tasks').select('*').eq('venture_id', v.id).order('created_at');
    const title = h('input', { type: 'text', class: 'grow2', placeholder: 'Neue Aufgabe', maxlength: 200, 'aria-label': 'Aufgabe' });
    const due = h('input', { type: 'date', 'aria-label': 'Fällig am' });
    const who = h('select', { 'aria-label': 'Zuständig' }, h('option', { value: 'customer' }, 'Ich'), h('option', { value: 'blackfjord' }, 'BLACKFJORD'));
    const add = async () => {
      if (!title.value.trim()) return;
      const { error } = await sb.from('tasks').insert({ venture_id: v.id, title: title.value.trim(), due_date: due.value || null, assigned_to: who.value });
      if (error) return fail(error);
      renderTasks(c);
    };
    title.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
    const order = { doing: 0, open: 1, done: 2 };
    const sorted = [...(data || [])].sort((a, b) => order[a.status] - order[b.status]);
    c.replaceChildren(
      h('h2', {}, 'Aufgaben und Roadmap'),
      h('div', { class: 'addrow', style: 'margin-top:14px' }, title, due, who, h('button', { class: 'btn', onclick: add }, 'Hinzufügen')),
      h('div', { class: 'list' }, sorted.length ? sorted.map((t) => h('div', { class: 'item' + (t.status === 'done' ? ' done' : '') },
        h('button', { class: 'status', 'aria-label': 'Status ändern, aktuell ' + SLABEL[t.status], title: SLABEL[t.status], onclick: async () => { await sb.from('tasks').update({ status: NEXT[t.status] }).eq('id', t.id); renderTasks(c); } }, SYM[t.status]),
        h('div', { class: 'grow' }, t.title, h('div', { class: 'meta' }, SLABEL[t.status] + (t.due_date ? ' · fällig ' + fmt(t.due_date) : ''))),
        h('span', { class: 'chip' }, t.assigned_to === 'blackfjord' ? 'BLACKFJORD' : 'Kunde'),
        h('button', { class: 'x', 'aria-label': 'Aufgabe löschen', onclick: async () => { await sb.from('tasks').delete().eq('id', t.id); renderTasks(c); } }, '×')))
        : h('p', { class: 'muted' }, 'Noch keine Aufgaben. Leg die erste an oder lass dir im KI-Chat einen Plan vorschlagen.')));
  }
