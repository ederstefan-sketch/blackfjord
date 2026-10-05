
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

    const sel = h('select', {
      'aria-label': 'Chat wählen',
      onchange: (e) => {
        state.threadId = e.target.value || null;
        renderChat(c);
      }
    },
      h('option', { value: '' }, 'Neuer Chat'),
      (threads || []).map((t) =>
        h('option', {
          value: t.id,
          selected: t.id === state.threadId
        }, t.title + ' (' + fmt(t.created_at) + ')')
      )
    );

    const box = h('div', {
      class: 'msgs',
      'aria-live': 'polite'
    });

    const fileInput = h('input', {
      type: 'file',
      id: 'chat-file-upload',
      'aria-label': 'Dokument hochladen',
      accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.json,.xml,.html',
      style: 'display:none'
    });

    const uploadBtn = h('button', {
      class: 'btn ghost sm',
      type: 'button',
      'aria-label': 'Dokument hochladen',
      title: 'Dokument hochladen'
    }, '📎');

    const ta = h('textarea', {
      rows: 1,
      placeholder: 'Schreib deiner Venture AI …',
      'aria-label': 'Nachricht'
    });

    const sendBtn = h('button', {
      class: 'btn',
      type: 'button'
    }, 'Senden');

    const bubble = (role, text, cls) => {
      const b = h(
        'div',
        { class: 'msg ' + role + (cls ? ' ' + cls : '') },
        text
      );
      box.append(b);
      box.scrollTop = box.scrollHeight;
      return b;
    };

    if (state.threadId) {
      const { data: msgs } = await sb
        .from('chat_messages')
        .select('role,content')
        .eq('thread_id', state.threadId)
        .order('created_at');

      (msgs || []).forEach((m) => bubble(m.role, m.content));
    } else {
      box.append(
        h(
          'div',
          { class: 'empty' },
          h(
            'p',
            {},
            'Erzähl von deiner Idee. Venture AI hilft dir bei Zielgruppe, Markt, Preis und Business Model und merkt sich deinen Projektstand.'
          )
        )
      );
    }

    let busy = false;

    async function uploadDocument() {
      const f = fileInput.files?.[0];
      if (!f || busy) return;

      fileInput.value = '';

      if (f.size > 10 * 1024 * 1024) {
        bubble(
          'assistant',
          'Die Datei ist größer als 10 MB und kann nicht hochgeladen werden.',
          'err'
        );
        return;
      }

      busy = true;
      sendBtn.disabled = true;
      uploadBtn.disabled = true;

      box.querySelector('.empty')?.remove();

      const status = bubble(
        'assistant',
        '📎 ' + f.name + ' · wird hochgeladen …',
        'wait'
      );

      try {
        const path =
          v.id +
          '/' +
          Date.now() +
          '-' +
          f.name.replace(/[^\w.\-]+/g, '_');

        const up = await sb.storage
          .from('venture-docs')
          .upload(path, f);

        if (up.error) {
          throw new Error(
            'Hochladen fehlgeschlagen: ' + up.error.message
          );
        }

        const { data: newDoc, error } = await sb
          .from('documents')
          .insert({
            venture_id: v.id,
            name: f.name,
            storage_path: path,
            created_by: state.user.id
          })
          .select()
          .single();

        if (error) {
          await sb.storage.from('venture-docs').remove([path]);
          throw new Error(error.message);
        }

        status.textContent = '📎 ' + f.name + ' · Text wird gelesen …';

        const ingest = await sb.functions.invoke(
          'venture-document-ingest',
          {
            body: {
              document_id: newDoc.id
            }
          }
        );

        if (ingest.error) {
          console.log(
            'Textauslese fehlgeschlagen',
            ingest.error
          );
          throw new Error(
            'Das Dokument konnte nicht verarbeitet werden.'
          );
        }

        status.textContent =
          '📎 ' + f.name + ' · wird für Venture AI vorbereitet …';

        const sync = await sb.functions.invoke(
          'venture-ai-file-sync',
          {
            body: {
              venture_id: v.id,
              document_id: newDoc.id
            }
          }
        );

        if (sync.error) {
          console.log(
            'KI-Index fehlgeschlagen',
            sync.error
          );
          throw new Error(
            'Das Dokument wurde hochgeladen, konnte aber noch nicht für die KI indexiert werden.'
          );
        }

        status.className = 'msg assistant';
        status.textContent =
          '📎 ' +
          f.name +
          ' · hochgeladen und für Venture AI durchsuchbar.';

      } catch (e) {
        status.className = 'msg assistant err';
        status.textContent =
          '📎 ' +
          f.name +
          ' · ' +
          (e?.message || 'Upload fehlgeschlagen.');
      }

      busy = false;
      sendBtn.disabled = false;
      uploadBtn.disabled = false;

      box.scrollTop = box.scrollHeight;
      ta.focus();
    }

    async function send() {
      const text = ta.value.trim();

      if (!text || busy) return;

      busy = true;
      sendBtn.disabled = true;
      uploadBtn.disabled = true;
      ta.value = '';

      box.querySelector('.empty')?.remove();

      bubble('user', text);

      const wait = bubble(
        'assistant',
        'Venture AI schreibt …',
        'wait'
      );

      const isNew = !state.threadId;

      try {
        const r = await callChat({
          venture_id: v.id,
          thread_id: state.threadId,
          message: text
        });

        state.threadId = r.thread_id;

        wait.className = 'msg assistant';
        wait.textContent = r.reply;

        if (isNew) {
          sel.insertBefore(
            new Option(
              text.slice(0, 60) +
                ' (' +
                fmt(Date.now()) +
                ')',
              r.thread_id
            ),
            sel.options[1]
          );

          sel.value = r.thread_id;
        }

        if (r.memory_saved) {
          box.append(
            h(
              'div',
              { class: 'note' },
              r.memory_saved +
                (r.memory_saved === 1
                  ? ' Eintrag'
                  : ' Einträge') +
                ' im Gedächtnis gespeichert'
            )
          );
        }

      } catch (e) {
        wait.className = 'msg assistant err';
        wait.textContent = e.message;
      }

      busy = false;
      sendBtn.disabled = false;
      uploadBtn.disabled = false;

      box.scrollTop = box.scrollHeight;
      ta.focus();
    }

    uploadBtn.addEventListener('click', () => {
      if (!busy) fileInput.click();
    });

    fileInput.addEventListener('change', uploadDocument);

    sendBtn.addEventListener('click', send);

    ta.addEventListener('keydown', (e) => {
      if (
        e.key === 'Enter' &&
        !e.shiftKey
      ) {
        e.preventDefault();
        send();
      }
    });

    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height =
        Math.min(ta.scrollHeight, 160) + 'px';
    });

    c.replaceChildren(
      h(
        'div',
        { class: 'chatbar' },
        sel
      ),
      box,
      h(
        'div',
        { class: 'composer' },
        fileInput,
        uploadBtn,
        ta,
        sendBtn
      )
    );

    box.scrollTop = box.scrollHeight;
  }