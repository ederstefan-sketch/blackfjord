// ---------- KI-Chat ----------

async function callChat(payload) {
  const { data, error } = await sb.functions.invoke(
    'venture-ai-orchestrator',
    { body: payload }
  );

  if (error) {
    let msg =
      'Die KI ist gerade nicht erreichbar. Versuch es gleich noch einmal.';

    try {
      const j = await error.context.json();
      if (j?.error) msg = j.error;
    } catch (_) {
      /* Standardtext */
    }

    throw new Error(msg);
  }

  return data;
}


// ---------- Aufgaben aus KI-Vorschlägen ----------

async function saveSuggestedTask(task, button, wrapper) {
  const v = state.venture;

  if (!v?.id || !task?.title) return;

  button.disabled = true;
  button.textContent = 'Wird übernommen …';

  try {
    const { data: existing, error: existingError } = await sb
      .from('tasks')
      .select('id,title')
      .eq('venture_id', v.id)
      .ilike('title', task.title);

    if (existingError) throw existingError;

    if (existing?.length) {
      wrapper.replaceChildren(
        h(
          'span',
          {
            class: 'muted',
            style: 'font-size:13px'
          },
          '✓ Aufgabe bereits vorhanden'
        )
      );
      return;
    }

    const { error } = await sb
      .from('tasks')
      .insert({
        venture_id: v.id,
        title: task.title,
        phase: task.phase || null,
        status: 'open',
        due_date: task.due_date || null,
        assigned_to: task.assigned_to || 'customer',
        visibility: 'customer',
        metadata: {
          source: 'venture_ai_chat',
          suggested_by_ai: true
        }
      });

    if (error) throw error;

    wrapper.replaceChildren(
      h(
        'span',
        {
          class: 'muted',
          style: 'font-size:13px'
        },
        '✓ Aufgabe übernommen'
      )
    );

  } catch (e) {
    button.disabled = false;
    button.textContent = 'Als Aufgabe übernehmen';

    const err = h(
      'span',
      {
        class: 'err',
        style: 'margin-left:8px;font-size:13px'
      },
      e?.message || 'Aufgabe konnte nicht gespeichert werden.'
    );

    wrapper.append(err);
  }
}


// ---------- Mehrere vorgeschlagene Aufgaben direkt übernehmen ----------

async function saveSuggestedTasks(tasks) {
  const v = state.venture;

  if (!v?.id || !Array.isArray(tasks)) {
    return {
      saved: 0,
      skipped: 0
    };
  }

  const validTasks = tasks
    .filter(task => task?.title)
    .slice(0, 5);

  if (!validTasks.length) {
    return {
      saved: 0,
      skipped: 0
    };
  }

  let saved = 0;
  let skipped = 0;

  for (const task of validTasks) {
    try {
      const { data: existing, error: existingError } = await sb
        .from('tasks')
        .select('id,title')
        .eq('venture_id', v.id)
        .ilike('title', task.title);

      if (existingError) {
        console.error(
          '[Venture Lab] Aufgabe prüfen fehlgeschlagen:',
          existingError
        );
        continue;
      }

      if (existing?.length) {
        skipped++;
        continue;
      }

      const { error } = await sb
        .from('tasks')
        .insert({
          venture_id: v.id,
          title: task.title,
          phase: task.phase || null,
          status: 'open',
          due_date: task.due_date || null,
          assigned_to: task.assigned_to || 'customer',
          visibility: 'customer',
          metadata: {
            source: 'venture_ai_chat',
            suggested_by_ai: true,
            auto_committed: true
          }
        });

      if (error) {
        console.error(
          '[Venture Lab] Aufgabe speichern fehlgeschlagen:',
          error
        );
        continue;
      }

      saved++;

    } catch (e) {
      console.error(
        '[Venture Lab] Aufgabe speichern fehlgeschlagen:',
        e
      );
    }
  }

  return {
    saved,
    skipped
  };
}


// ---------- Bestätigung erkennen ----------

function isTaskConfirmation(text) {
  const value = String(text || '')
    .trim()
    .toLowerCase();

  if (!value) return false;

  return (
    /^(ja|ja bitte|ja gerne|gerne|okay|ok|passt|mach das|mach\s+das bitte)$/i.test(value) ||
    /\b(übernehme|übernimm|übernehmen|speichern|speichere)\b/.test(value) ||
    /\bin\s+(die|den)\s+aufgaben\b/.test(value) ||
    /\bals\s+aufgabe\b/.test(value) ||
    /\baufgaben\s+(übernehmen|speichern)\b/.test(value) ||
    /\b(diese|die)\s+aufgaben\b.*\b(übernehmen|speichern)\b/.test(value)
  );
}


// ---------- Aufgaben-Vorschläge darstellen ----------

function renderTaskSuggestions(tasks) {
  if (!Array.isArray(tasks) || !tasks.length) {
    return null;
  }

  const rows = tasks
    .filter((task) => task?.title)
    .slice(0, 5)
    .map((task) => {
      const wrapper = h(
        'div',
        {
          class: 'item',
          style:
            'display:flex;align-items:center;gap:10px;margin-top:8px;'
        }
      );

      const title = h(
        'div',
        {
          class: 'grow',
          style: 'font-size:14px'
        },
        task.title
      );

      const button = h(
        'button',
        {
          class: 'btn ghost sm',
          type: 'button'
        },
        'Als Aufgabe übernehmen'
      );

      button.addEventListener('click', () => {
        saveSuggestedTask(task, button, wrapper);
      });

      wrapper.append(title, button);

      return wrapper;
    });

  if (!rows.length) {
    return null;
  }

  return h(
    'div',
    {
      class: 'task-suggestions',
      style:
        'margin-top:14px;padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:12px;'
    },

    h(
      'div',
      {
        style:
          'font-weight:600;margin-bottom:4px;'
      },
      'Mögliche Aufgaben'
    ),

    h(
      'div',
      {
        class: 'muted',
        style: 'font-size:13px;margin-bottom:8px;'
      },
      'Diese Aufgaben wurden aus deiner Nachricht bzw. der Dokumentanalyse erkannt. Du kannst sie übernehmen.'
    ),

    ...rows
  );
}


// ---------- KI-Chat ----------

async function renderChat(c) {
  const v = state.venture;

  const { data: threads } = await sb
    .from('chat_threads')
    .select('id,title,created_at')
    .eq('venture_id', v.id)
    .order('created_at', { ascending: false });

  if (state.threadId === undefined) {
    state.threadId = threads?.[0]?.id ?? null;
  }

  const sel = h(
    'select',
    {
      'aria-label': 'Chat wählen',
      onchange: (e) => {
        state.threadId = e.target.value || null;
        renderChat(c);
      }
    },

    h(
      'option',
      {
        value: ''
      },
      'Neuer Chat'
    ),

    (threads || []).map((t) =>
      h(
        'option',
        {
          value: t.id,
          selected: t.id === state.threadId
        },
        t.title + ' (' + fmt(t.created_at) + ')'
      )
    )
  );


  const box = h(
    'div',
    {
      class: 'msgs',
      'aria-live': 'polite'
    }
  );


  const fileInput = h(
    'input',
    {
      type: 'file',
      id: 'chat-file-upload',
      'aria-label': 'Dokument hochladen',
      accept:
        '.pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.json,.xml,.html',
      style: 'display:none'
    }
  );


  const uploadBtn = h(
    'button',
    {
      class: 'btn ghost sm',
      type: 'button',
      'aria-label': 'Dokument hochladen',
      title: 'Dokument hochladen'
    },
    '📎'
  );


  const ta = h(
    'textarea',
    {
      rows: 1,
      placeholder: 'Schreib deiner Venture AI …',
      'aria-label': 'Nachricht'
    }
  );


  const sendBtn = h(
    'button',
    {
      class: 'btn',
      type: 'button'
    },
    'Senden'
  );


  // ---------- Noch nicht übernommene Aufgaben ----------
  // Bleiben innerhalb dieser Chat-Ansicht erhalten,
  // damit eine anschließende Bestätigung wie
  // "Ja, übernimm die Aufgaben" verarbeitet werden kann.

  let pendingTaskSuggestions = [];


  // ---------- Chat-Bubble ----------

  const bubble = (role, text, cls) => {
    const b = h(
      'div',
      {
        class:
          'msg ' +
          role +
          (cls ? ' ' + cls : '')
      },
      text
    );

    box.append(b);
    box.scrollTop = box.scrollHeight;

    return b;
  };


  // ---------- Bestehenden Chat laden ----------

  if (state.threadId) {
    const { data: msgs } = await sb
      .from('chat_messages')
      .select('role,content')
      .eq('thread_id', state.threadId)
      .order('created_at');

    (msgs || []).forEach((m) => {
      bubble(m.role, m.content);
    });

  } else {
    box.append(
      h(
        'div',
        {
          class: 'empty'
        },
        h(
          'p',
          {},
          'Erzähl von deiner Idee. Venture AI hilft dir bei Zielgruppe, Markt, Preis und Business Model und merkt sich deinen Projektstand.'
        )
      )
    );
  }


  let busy = false;


  // ---------- Dokument hochladen ----------

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
          'Hochladen fehlgeschlagen: ' +
          up.error.message
        );
      }

      const {
        data: newDoc,
        error
      } = await sb
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
        await sb.storage
          .from('venture-docs')
          .remove([path]);

        throw new Error(error.message);
      }

      status.textContent =
        '📎 ' +
        f.name +
        ' · Document Reader prüft die Datei …';

      const agent = await sb.functions.invoke(
        'venture-document-agent',
        {
          body: {
            document_id: newDoc.id
          }
        }
      );

      if (
        agent.error ||
        !agent.data?.ok
      ) {
        const detail =
          agent.data?.error ||
          agent.error?.message ||
          'Das Dokument konnte nicht verarbeitet werden.';

        throw new Error(detail);
      }

      status.className =
        'msg assistant';

      status.textContent =
        '📎 ' +
        f.name +
        ' · gelesen, geprüft und für Venture AI durchsuchbar.';

    } catch (e) {
      status.className =
        'msg assistant err';

      status.textContent =
        '📎 ' +
        f.name +
        ' · ' +
        (e?.message ||
          'Upload fehlgeschlagen.');
    }

    busy = false;

    sendBtn.disabled = false;
    uploadBtn.disabled = false;

    box.scrollTop = box.scrollHeight;
    ta.focus();
  }


  // ---------- Aufgaben bestätigen ----------

  async function commitPendingTasks() {
    if (!pendingTaskSuggestions.length) {
      return false;
    }

    busy = true;

    sendBtn.disabled = true;
    uploadBtn.disabled = true;

    const wait = bubble(
      'assistant',
      'Aufgaben werden in „Aufgaben“ übernommen …',
      'wait'
    );

    try {
      const result = await saveSuggestedTasks(
        pendingTaskSuggestions
      );

      if (result.saved > 0) {
        const text =
          result.saved === 1
            ? 'Die Aufgabe wurde in „Aufgaben“ übernommen.'
            : result.saved +
              ' Aufgaben wurden in „Aufgaben“ übernommen.';

        wait.className = 'msg assistant';
        wait.textContent = text;

        if (result.skipped > 0) {
          box.append(
            h(
              'div',
              {
                class: 'note'
              },
              result.skipped +
                (result.skipped === 1
                  ? ' Aufgabe war bereits vorhanden.'
                  : ' Aufgaben waren bereits vorhanden.')
            )
          );
        }
      } else if (result.skipped > 0) {
        wait.className = 'msg assistant';
        wait.textContent =
          'Die Aufgaben waren bereits in „Aufgaben“ vorhanden.';
      } else {
        wait.className = 'msg assistant err';
        wait.textContent =
          'Die Aufgaben konnten nicht übernommen werden.';
      }

      pendingTaskSuggestions = [];

      return true;

    } catch (e) {
      wait.className = 'msg assistant err';
      wait.textContent =
        e?.message ||
        'Die Aufgaben konnten nicht übernommen werden.';

      return false;

    } finally {
      busy = false;

      sendBtn.disabled = false;
      uploadBtn.disabled = false;

      box.scrollTop = box.scrollHeight;
      ta.focus();
    }
  }


  // ---------- Nachricht senden ----------

  async function send() {
    const text = ta.value.trim();

    if (!text || busy) return;


    // --------------------------------------------------
    // WICHTIG:
    // Wenn die KI zuvor konkrete Aufgaben vorgeschlagen
    // hat und der Nutzer jetzt "Ja", "Übernehmen",
    // "In Aufgaben übernehmen" usw. schreibt,
    // werden diese Aufgaben DIREKT gespeichert.
    // Es wird dafür kein neuer KI-Aufruf benötigt.
    // --------------------------------------------------

    if (
      pendingTaskSuggestions.length &&
      isTaskConfirmation(text)
    ) {
      ta.value = '';

      box.querySelector('.empty')?.remove();

      bubble('user', text);

      await commitPendingTasks();

      return;
    }


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


      // ---------- KI-Antwort ----------

      wait.className =
        'msg assistant';

      wait.textContent =
        r.reply || 'Keine Antwort erhalten.';


      // ---------- Aufgaben-Vorschläge merken ----------

      pendingTaskSuggestions = Array.isArray(
        r.task_suggestions
      )
        ? r.task_suggestions
            .filter((task) => task?.title)
            .slice(0, 5)
        : [];


      // ---------- Neuen Thread eintragen ----------

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


      // ---------- Memory ----------

      if (r.memory_saved) {
        box.append(
          h(
            'div',
            {
              class: 'note'
            },
            r.memory_saved +
              (r.memory_saved === 1
                ? ' Eintrag'
                : ' Einträge') +
              ' im Gedächtnis gespeichert'
          )
        );
      }


      // ---------- Aufgaben-Vorschläge ----------

      const taskBox =
        renderTaskSuggestions(
          pendingTaskSuggestions
        );

      if (taskBox) {
        box.append(taskBox);
      }

    } catch (e) {
      wait.className =
        'msg assistant err';

      wait.textContent =
        e?.message ||
        'Die Anfrage konnte nicht verarbeitet werden.';
    }

    busy = false;

    sendBtn.disabled = false;
    uploadBtn.disabled = false;

    box.scrollTop = box.scrollHeight;

    ta.focus();
  }


  // ---------- Events ----------

  uploadBtn.addEventListener(
    'click',
    () => {
      if (!busy) {
        fileInput.click();
      }
    }
  );


  fileInput.addEventListener(
    'change',
    uploadDocument
  );


  sendBtn.addEventListener(
    'click',
    send
  );


  ta.addEventListener(
    'keydown',
    (e) => {
      if (
        e.key === 'Enter' &&
        !e.shiftKey
      ) {
        e.preventDefault();
        send();
      }
    }
  );


  ta.addEventListener(
    'input',
    () => {
      ta.style.height = 'auto';

      ta.style.height =
        Math.min(
          ta.scrollHeight,
          160
        ) + 'px';
    }
  );


  // ---------- UI ----------

  c.replaceChildren(
    h(
      'div',
      {
        class: 'chatbar'
      },
      sel
    ),

    box,

    h(
      'div',
      {
        class: 'composer'
      },
      fileInput,
      uploadBtn,
      ta,
      sendBtn
    )
  );

  box.scrollTop =
    box.scrollHeight;
}
