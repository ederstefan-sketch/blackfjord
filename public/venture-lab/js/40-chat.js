// ---------- KI-Chat ----------
  async function callChat(payload) {
    const { data, error } = await sb.functions.invoke('venture-ai-orchestrator', { body: payload });
    if (error) {
      let msg = 'Die KI ist gerade nicht erreichbar. Versuch es gleich noch einmal.';
      try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { /* Standardtext */ }
      throw new Error(msg);
    }
    return data;
  }

  async function renderChat(c) {
    const v = state.venture;
    const { data: threads } = await sb.from('chat_threads').select('id,title,created_at').eq('venture_id', v.id).order('created_at', { ascending: false });
    if (state.threadId === undefined) state.threadId = threads?.[0]?.id ?? null;

    const sel = h('select', { 'aria-label': 'Chat wählen', onchange: (e) => { state.threadId = e.target.value || null; renderChat(c); } },
      h('option', { value: '' }, 'Neuer Chat'),
      (threads || []).map((t) => h('option', { value: t.id, selected: t.id === state.threadId }, t.title + ' (' + fmt(t.created_at) + ')')));
    const box = h('div', { class: 'msgs', 'aria-live': 'polite' });
    const ta = h('textarea', { rows: 1, placeholder: 'Schreib deiner Venture AI …', 'aria-label': 'Nachricht' });
    const sendBtn = h('button', { class: 'btn', type: 'button' }, 'Senden');

    const bubble = (role, text, cls) => { const b = h('div', { class: 'msg ' + role + (cls ? ' ' + cls : '') }, text); box.append(b); box.scrollTop = box.scrollHeight; return b; };

    if (state.threadId) {
      const { data: msgs } = await sb.from('chat_messages').select('role,content').eq('thread_id', state.threadId).order('created_at');
      (msgs || []).forEach((m) => bubble(m.role, m.content));
    } else {
      box.append(h('div', { class: 'empty' }, h('p', {}, 'Erzähl von deiner Idee. Venture AI hilft dir bei Zielgruppe, Markt, Preis und Business Model und merkt sich deinen Projektstand.')));
    }

    let busy = false;
    async function send() {
      const text = ta.value.trim();
      if (!text || busy) return;
      busy = true; sendBtn.disabled = true; ta.value = '';
      box.querySelector('.empty')?.remove();
      bubble('user', text);
      const wait = bubble('assistant', 'Venture AI schreibt …', 'wait');
      const isNew = !state.threadId;
      try {
        const r = await callChat({ venture_id: v.id, thread_id: state.threadId, message: text });
        state.threadId = r.thread_id;
        wait.className = 'msg assistant'; wait.textContent = r.reply;
        if (isNew) { sel.insertBefore(new Option(text.slice(0, 60) + ' (' + fmt(Date.now()) + ')', r.thread_id), sel.options[1]); sel.value = r.thread_id; }
        if (r.memory_saved) box.append(h('div', { class: 'note' }, r.memory_saved + (r.memory_saved === 1 ? ' Eintrag' : ' Einträge') + ' im Gedächtnis gespeichert'));
      } catch (e) {
        wait.className = 'msg assistant err'; wait.textContent = e.message;
      }
      busy = false; sendBtn.disabled = false; box.scrollTop = box.scrollHeight; ta.focus();
    }
    sendBtn.addEventListener('click', send);
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; });

    c.replaceChildren(h('div', { class: 'chatbar' }, sel), box, h('div', { class: 'composer' }, ta, sendBtn));
    box.scrollTop = box.scrollHeight;
  }
