// ---------- Admin: Dokumente ----------

async function renderAdminDocs() {
  const {
    data: ventures,
    error: ventureError
  } = await sb
    .from('ventures')
    .select('id,title,owner_id');

  if (ventureError) {
    return fail(ventureError);
  }

  const ids =
    (ventures || []).map(
      v => v.id
    );

  let docs = [];

  if (ids.length) {
    const {
      data,
      error
    } = await sb
      .from('documents')
      .select(
        'id,venture_id,name,storage_path,document_type,generated,processing_status,visibility,created_at'
      )
      .in(
        'venture_id',
        ids
      )
      .order('created_at', {
        ascending: false
      });

    if (error) {
      return fail(error);
    }

    docs = data || [];
  }

  const rows =
    docs.length
      ? h(
          'div',
          {
            class:
              'admin-doc-list'
          },

          ...docs.map(
            doc => {
              const venture =
                ventures.find(
                  v =>
                    v.id ===
                    doc.venture_id
                );

              const owner =
                state.customers.find(
                  c =>
                    c.id ===
                    venture?.owner_id
                );

              return h(
                'div',
                {
                  class:
                    'admin-doc-row'
                },

                h(
                  'div',
                  {
                    class:
                      'admin-doc-icon'
                  },
                  '▤'
                ),

                h(
                  'div',
                  {
                    class:
                      'admin-doc-main'
                  },

                  h(
                    'strong',
                    {},
                    doc.name ||
                      'Dokument'
                  ),

                  h(
                    'span',
                    {
                      class:
                        'muted'
                    },
                    venture?.title ||
                      'Venture unbekannt'
                  ),

                  h(
                    'span',
                    {
                      class:
                        'muted'
                    },
                    owner?.full_name ||
                      owner?.company ||
                      ''
                  )
                ),

                h(
                  'div',
                  {
                    class:
                      'admin-doc-meta'
                  },

                  doc.document_type
                    ? h(
                        'span',
                        {
                          class:
                            'badge'
                        },
                        doc.document_type
                      )
                    : null,

                  doc.processing_status
                    ? h(
                        'span',
                        {
                          class:
                            'muted'
                        },
                        doc.processing_status
                      )
                    : null,

                  doc.storage_path
                    ? h(
                        'button',
                        {
                          class:
                            'btn btn-secondary sm',

                          type:
                            'button',

                          onclick:
                            async () => {
                              const {
                                data: signed,
                                error
                              } =
                                await sb.storage
                                  .from(
                                    'venture-docs'
                                  )
                                  .createSignedUrl(
                                    doc.storage_path,
                                    60
                                  );

                              if (error) {
                                return fail(
                                  error
                                );
                              }

                              window.open(
                                signed.signedUrl,
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
                      class:
                        'btn btn-danger sm',

                      type:
                        'button',

                      onclick: () =>
                        deleteAdminDocument(
                          doc
                        )
                    },
                    'Löschen'
                  )
                )
              );
            }
          )
        )
      : adminEmpty(
          'Keine Dokumente vorhanden.'
        );

  adminShell(
    'Dokumente',

    adminSection(
      'Dokumentenübersicht',
      'Dokumente aus allen Kunden-Workspaces.',

      rows
    )
  );
}
