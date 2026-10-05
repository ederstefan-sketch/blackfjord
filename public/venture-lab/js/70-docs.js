// ---------- Dokumente ----------
  const AI_STATUS = {
    pending: 'KI: wartet',
    processing: 'KI: wird verarbeitet',
    ready: 'KI: durchsuchbar',
    error: 'KI: Fehler'
  };

  async function renderDocs(c) {
    const v = state.venture;

    const { data } = await sb
      .from('documents')
      .select('*')
      .eq('venture_id', v.id)
      .order('created_at', { ascending: false });

    const { data: resources } = await sb
      .from('venture_ai_resources')
      .select('document_id,status')
      .eq('venture_id', v.id);

    const aiStatus = new Map(
      (resources || []).map((r) => [r.document_id, r.status])
    );

    const file = h('input', {
      type: 'file',
      id: 'fu',
      'aria-label': 'Datei hochladen'
    });

    const msg = h('p', {
      class: 'muted',
      role: 'status'
    });

    file.addEventListener('change', async () => {
      const f = file.files[0];

      if (!f) return;

      if (f.size > 10 * 1024 * 1024) {
        msg.className = 'err';
        msg.textContent =
          'Die Datei ist größer als 10 MB.';
        return;
      }

      msg.className = 'muted';
      msg.textContent = 'Lädt hoch …';

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
        msg.className = 'err';
        msg.textContent =
          'Hochladen fehlgeschlagen: ' +
          up.error.message;
        return;
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
        msg.className = 'err';
        msg.textContent = error.message;
        return;
      }

      msg.className = 'muted';
      msg.textContent =
        'Document Reader prüft die Datei …';

      const agent = await sb.functions.invoke(
        'venture-document-agent',
        {
          body: {
            document_id: newDoc.id
          }
        }
      );

      if (agent.error || !agent.data?.ok) {
        msg.className = 'err';
        msg.textContent =
          agent.data?.error ||
          agent.error?.message ||
          'Das Dokument konnte nicht verarbeitet werden.';

        renderDocs(c);
        return;
      }

      msg.className = 'muted';
      msg.textContent =
        'Gelesen, geprüft und für Venture AI durchsuchbar.';

      renderDocs(c);
    });

    c.replaceChildren(
      h('h2', {}, 'Dokumente'),

      h(
        'p',
        { class: 'muted' },
        'Deine Dateien sind privat und nur für dich und BLACKFJORD sichtbar (bis 10 MB pro Datei).'
      ),

      h(
        'div',
        { style: 'margin-top:14px' },
        file
      ),

      msg,

      h(
        'div',
        { class: 'list' },
        (data || []).length
          ? data.map((d) =>
              h(
                'div',
                { class: 'item' },

                h(
                  'div',
                  { class: 'grow' },

                  d.storage_path
                    ? d.name
                    : h(
                        'details',
                        {},
                        h(
                          'summary',
                          {},
                          d.name
                        ),
                        h(
                          'pre',
                          {},
                          d.content || ''
                        )
                      ),

                  h(
                    'div',
                    { class: 'meta' },
                    fmt(d.created_at) +
                      (d.generated
                        ? ' · von Venture AI erstellt'
                        : '')
                  )
                ),

                aiStatus.has(d.id)
                  ? h(
                      'span',
                      { class: 'chip' },
                      AI_STATUS[
                        aiStatus.get(d.id)
                      ] ||
                        aiStatus.get(d.id)
                    )
                  : null,

                d.storage_path
                  ? h(
                      'button',
                      {
                        class: 'btn ghost sm',
                        onclick: async () => {
                          const {
                            data: s,
                            error
                          } = await sb.storage
                            .from('venture-docs')
                            .createSignedUrl(
                              d.storage_path,
                              60
                            );

                          if (error) {
                            return fail(error);
                          }

                          window.open(
                            s.signedUrl,
                            '_blank',
                            'noopener'
                          );
                        }
                      },
                      'Öffnen'
                    )
                  : null,

                h(
                  'button',
                  {
                    class: 'x',
                    'aria-label':
                      'Dokument löschen',
                    onclick: async () => {
                      if (
                        !confirm(
                          'Dokument „' +
                            d.name +
                            '“ löschen?'
                        )
                      ) {
                        return;
                      }

                      if (d.storage_path) {
                        await sb.storage
                          .from('venture-docs')
                          .remove([
                            d.storage_path
                          ]);
                      }

                      await sb
                        .from('documents')
                        .delete()
                        .eq('id', d.id);

                      renderDocs(c);
                    }
                  },
                  '×'
                )
              )
            )
          : h(
              'p',
              { class: 'muted' },
              'Noch keine Dokumente. Lade Unterlagen hoch, die BLACKFJORD und du gemeinsam nutzen.'
            )
      )
    );
  }