
// ---------- Portal-Rahmen & Admin Center ----------

function daysLeft(m) {
  return Math.ceil(
    (
      new Date(
        m.trial_ends_at
      ) -
      Date.now()
    ) /
      86400000
  );
}


function status() {
  const m =
    state.membership;

  if (!m) {
    return isAdmin()
      ? {
          text: 'Admin',
          cls: ''
        }
      : {
          text:
            'Kein Zugang aktiv',
          cls: 'bad'
        };
  }

  if (
    m.plan ===
      'expired' ||
    (
      m.plan ===
        'trial_full' &&
      daysLeft(m) < 0
    )
  ) {
    return {
      text: 'Abgelaufen',
      cls: 'bad'
    };
  }

  if (
    m.plan ===
    'trial_full'
  ) {
    const d =
      daysLeft(m);

    return {
      text:
        `Testphase · ${d} ${
          d === 1
            ? 'Tag'
            : 'Tage'
        }`,
      cls: ''
    };
  }

  return {
    text:
      m.plan ||
      'Aktiv',
    cls: ''
  };
}


// ---------- Helpers ----------

function customerName(
  id
) {
  const customer =
    (
      state.customers ||
      []
    ).find(
      c =>
        c.id === id
    );

  if (!customer) {
    return 'Kunde';
  }

  return (
    customer.full_name ||
    customer.company ||
    'Kunde'
  );
}


function customerCompany(
  id
) {
  const customer =
    (
      state.customers ||
      []
    ).find(
      c =>
        c.id === id
    );

  return (
    customer?.company ||
    ''
  );
}


function initials(
  value
) {
  const text =
    String(
      value || ''
    ).trim();

  if (!text) {
    return '?';
  }

  return text
    .split(/\s+/)
    .slice(0, 2)
    .map(
      x => x[0]
    )
    .join('')
    .toUpperCase();
}


function statCard(
  label,
  value,
  detail,
  onclick
) {
  return h(
    'button',
    {
      class:
        'admin-stat-card',

      type:
        'button',

      onclick
    },

    h(
      'div',
      {
        class:
          'admin-stat-label'
      },
      label
    ),

    h(
      'div',
      {
        class:
          'admin-stat-value'
      },
      String(value)
    ),

    detail
      ? h(
          'div',
          {
            class:
              'admin-stat-detail'
          },
          detail
        )
      : null
  );
}


function adminSection(
  title,
  subtitle,
  ...children
) {
  return h(
    'section',
    {
      class:
        'admin-section'
    },

    h(
      'div',
      {
        class:
          'admin-section-head'
      },

      h(
        'div',
        {},

        h(
          'h2',
          {},
          title
        ),

        subtitle
          ? h(
              'p',
              {
                class:
                  'muted'
              },
              subtitle
            )
          : null
      )
    ),

    ...children
  );
}


function adminEmpty(
  text,
  actionLabel,
  action
) {
  return h(
    'div',
    {
      class:
        'admin-empty'
    },

    h(
      'div',
      {
        class:
          'admin-empty-icon'
      },
      '○'
    ),

    h(
      'div',
      {
        class:
          'admin-empty-text'
      },
      text
    ),

    actionLabel
      ? h(
          'button',
          {
            class:
              'btn btn-primary',

            type:
              'button',

            onclick:
              action
          },
          actionLabel
        )
      : null
  );
}


// ---------- Admin Router ----------

function renderAdminPage() {
  if (!isAdmin()) {
    return;
  }

  switch (
    adminPage
  ) {
    case 'customers':
      return renderAdminCustomers();

    case 'customer-detail':
      return renderAdminCustomerDetail();

    case 'ventures':
      return renderAdminVentures();

    case 'venture-detail':
      return renderAdminVentureDetail();

    case 'tasks':
      return renderAdminTasks();

    case 'docs':
      return renderAdminDocs();

    case 'messages':
      return renderAdminMessages();

    case 'message-detail':
      return renderAdminMessageDetail();

    case 'activity':
      return renderAdminActivity();

    case 'settings':
      return renderAdminSettings();

    case 'overview':
    default:
      return renderAdminOverview();
  }
}


// ---------- Ventures ----------

async function renderAdminVentures() {
  const {
    data,
    error
  } =
    await sb
      .from('ventures')
      .select(
        'id,title,description,stage,progress,owner_id,created_at'
      )
      .order(
        'created_at',
        {
          ascending:
            false
        }
      );

  if (error) {
    return fail(error);
  }

  const ventures =
    data || [];

  const rows =
    ventures.length
      ? h(
          'div',
          {
            class:
              'admin-venture-list'
          },

          ...ventures.map(
            venture => {
              const owner =
                state.customers.find(
                  c =>
                    c.id ===
                    venture.owner_id
                );

              return h(
                'button',
                {
                  class:
                    'admin-venture-row',

                  type:
                    'button',

                  onclick:
                    () =>
                      openAdminVenture(
                        venture
                      )
                },

                h(
                  'div',
                  {
                    class:
                      'admin-venture-main'
                  },

                  h(
                    'strong',
                    {},
                    venture.title ||
                    'Unbenanntes Venture'
                  ),

                  h(
                    'span',
                    {
                      class:
                        'muted'
                    },
                    owner?.full_name ||
                    owner?.company ||
                    'Kunde unbekannt'
                  )
                ),

                h(
                  'div',
                  {
                    class:
                      'admin-venture-meta'
                  },

                  venture.stage
                    ? h(
                        'span',
                        {
                          class:
                            'badge'
                        },
                        venture.stage
                      )
                    : null,

                  typeof venture.progress ===
                  'number'
                    ? h(
                        'span',
                        {
                          class:
                            'muted'
                        },
                        venture.progress +
                          '%'
                      )
                    : null
                ),

                h(
                  'span',
                  {
                    class:
                      'admin-customer-arrow'
                  },
                  '›'
                )
              );
            }
          )
        )
      : adminEmpty(
          'Noch keine Ventures vorhanden.'
        );

  adminShell(
    'Ventures',

    adminSection(
      'Alle Ventures',
      'Alle Kunden-Ventures zentral verwalten.',

      h(
        'div',
        {
          class:
            'admin-toolbar'
        },

        h(
          'button',
          {
            class:
              'btn btn-primary',

            type:
              'button',

            onclick:
              () =>
                newVenture()
          },
          '+ Neues Venture'
        )
      ),

      rows
    )
  );
}


async function openAdminVenture(
  venture
) {
  if (!venture?.id) {
    return;
  }

  state.venture =
    venture;

  state.selectedCustomerId =
    venture.owner_id ||
    null;

  adminPage =
    'venture-detail';

  renderAdminPage();
}


async function renderAdminVentureDetail() {
  const venture =
    state.venture;

  if (!venture) {
    adminPage =
      'ventures';

    return renderAdminPage();
  }

  const owner =
    state.customers.find(
      c =>
        c.id ===
        venture.owner_id
    );

  adminShell(
    'Venture',

    adminSection(
      venture.title ||
        'Venture',

      owner?.full_name ||
        owner?.company ||
        'Kunde',

      h(
        'div',
        {
          class:
            'admin-toolbar'
        },

        h(
          'button',
          {
            class:
              'btn btn-secondary',

            type:
              'button',

            onclick: () => {
              adminPage =
                'ventures';

              renderAdminPage();
            }
          },
          '← Ventures'
        ),

        h(
          'button',
          {
            class:
              'btn btn-secondary',

            type:
              'button',

            onclick: () => {
              state.selectedCustomerId =
                venture.owner_id;

              adminPage =
                'customer-detail';

              renderAdminPage();
            }
          },
          'Kunde öffnen'
        ),

        h(
          'button',
          {
            class:
              'btn btn-danger',

            type:
              'button',

            onclick: () =>
              deleteAdminVenture(
                venture
              )
          },
          'Venture löschen'
        )
      ),

      h(
        'div',
        {
          class:
            'settings-grid'
        },

        h(
          'div',
          {
            class:
              'settings-group'
          },

          h(
            'h3',
            {},
            'Venture'
          ),

          h(
            'strong',
            {},
            venture.title ||
              'Ohne Titel'
          ),

          venture.description
            ? h(
                'p',
                {
                  class:
                    'muted'
                },
                venture.description
              )
            : null,

          venture.stage
            ? h(
                'span',
                {
                  class:
                    'badge'
                },
                venture.stage
              )
            : null,

          typeof venture.progress ===
          'number'
            ? h(
                'p',
                {
                  class:
                    'muted'
                },
                'Fortschritt: ' +
                  venture.progress +
                  '%'
              )
            : null
        ),

        h(
          'div',
          {
            class:
              'settings-group'
          },

          h(
            'h3',
            {},
            'Kunde'
          ),

          h(
            'strong',
            {},
            owner?.full_name ||
              owner?.company ||
              'Unbekannter Kunde'
          ),

          owner?.company
            ? h(
                'span',
                {
                  class:
                    'muted'
                },
                owner.company
              )
            : null
        )
      )
    )
  );
}


// ---------- Admin Deletes ----------

async function deleteAdminVenture(venture) {
  if (!isAdmin() || !venture?.id) {
    return;
  }

  if (
    !confirm(
      'Venture „' +
        (venture.title || 'Ohne Titel') +
        '“ wirklich löschen? Alle zugehörigen Venture-Daten werden ebenfalls gelöscht.'
    )
  ) {
    return;
  }

  const {
    data: docs,
    error: docsError
  } = await sb
    .from('documents')
    .select('storage_path')
    .eq('venture_id', venture.id);

  if (docsError) {
    return fail(docsError);
  }

  const paths = (docs || [])
    .map(d => d.storage_path)
    .filter(Boolean);

  if (paths.length) {
    const {
      error: storageError
    } = await sb.storage
      .from('venture-docs')
      .remove(paths);

    if (storageError) {
      return fail(storageError);
    }
  }

  const {
    error
  } = await sb
    .from('ventures')
    .delete()
    .eq('id', venture.id);

  if (error) {
    return fail(error);
  }

  state.venture = null;
  state.membership = null;
  state.selectedCustomerId = null;
  state.ventures = [];

  adminPage = 'ventures';

  renderAdminPage();
}


async function deleteAdminTask(task) {
  if (!isAdmin() || !task?.id) {
    return;
  }

  if (
    !confirm(
      'Aufgabe „' +
        (task.title || 'Aufgabe') +
        '“ löschen?'
    )
  ) {
    return;
  }

  const {
    error
  } = await sb
    .from('tasks')
    .delete()
    .eq('id', task.id);

  if (error) {
    return fail(error);
  }

  renderAdminPage();
}


async function deleteAdminDocument(doc) {
  if (!isAdmin() || !doc?.id) {
    return;
  }

  if (
    !confirm(
      'Dokument „' +
        (doc.name || 'Dokument') +
        '“ löschen?'
    )
  ) {
    return;
  }

  if (doc.storage_path) {
    const {
      error: storageError
    } = await sb.storage
      .from('venture-docs')
      .remove([doc.storage_path]);

    if (storageError) {
      return fail(storageError);
    }
  }

  const {
    error
  } = await sb
    .from('documents')
    .delete()
    .eq('id', doc.id);

  if (error) {
    return fail(error);
  }

  renderAdminPage();
}


async function deleteAdminMessage(message) {
  if (!isAdmin() || !message?.id) {
    return;
  }

  if (
    !confirm(
      'Diese Nachricht wirklich löschen?'
    )
  ) {
    return;
  }

  const {
    error
  } = await sb
    .from('comm_messages')
    .delete()
    .eq('id', message.id);

  if (error) {
    return fail(error);
  }

  state.adminMessage = null;
  adminPage = 'messages';

  renderAdminPage();
}


// ---------- Tasks ----------

async function renderAdminTasks() {
  const {
    data: ventures,
    error:
      ventureError
  } =
    await sb
      .from('ventures')
      .select(
        'id,title,owner_id'
      )
      .order(
        'created_at',
        {
          ascending:
            false
        }
      );

  if (ventureError) {
    return fail(
      ventureError
    );
  }

  const ventureIds =
    (
      ventures ||
      []
    ).map(
      v => v.id
    );

  let tasks = [];

  if (
    ventureIds.length
  ) {
    const {
      data,
      error
    } =
      await sb
        .from('tasks')
        .select(
          'id,venture_id,title,phase,status,due_date,assigned_to,created_at'
        )
        .in(
          'venture_id',
          ventureIds
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );

    if (error) {
      return fail(error);
    }

    tasks =
      data || [];
  }

  const rows =
    tasks.length
      ? h(
          'div',
          {
            class:
              'admin-task-list'
          },

          ...tasks.map(
            task => {
              const venture =
                ventures.find(
                  v =>
                    v.id ===
                    task.venture_id
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
                    'admin-task-row'
                },

                h(
                  'button',
                  {
                    class:
                      'btn btn-danger sm',

                    type:
                      'button',

                    title:
                      'Aufgabe löschen',

                    onclick: () =>
                      deleteAdminTask(
                        task
                      )
                  },
                  '×'
                ),

                h(
                  'div',
                  {
                    class:
                      'admin-task-main'
                  },

                  h(
                    'strong',
                    {},
                    task.title ||
                      'Aufgabe'
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
                      'admin-task-meta'
                  },

                  task.status
                    ? h(
                        'span',
                        {
                          class:
                            'badge'
                        },
                        task.status
                      )
                    : null,

                  task.due_date
                    ? h(
                        'span',
                        {
                          class:
                            'muted'
                        },
                        task.due_date
                      )
                    : null
                )
              );
            }
          )
        )
      : adminEmpty(
          'Keine Aufgaben vorhanden.'
        );

  adminShell(
    'Aufgaben',

    adminSection(
      'Aufgabenübersicht',
      'Aufgaben aus den Kunden-Workspaces.',

      rows
    )
  );
}


// ---------- Documents ----------

async function renderAdminDocs() {
  const {
    data: ventures,
    error:
      ventureError
  } =
    await sb
      .from('ventures')
      .select(
        'id,title,owner_id'
      );

  if (ventureError) {
    return fail(
      ventureError
    );
  }

  const ids =
    (
      ventures ||
      []
    ).map(
      v => v.id
    );

  let docs = [];

  if (ids.length) {
    const {
      data,
      error
    } =
      await sb
        .from('documents')
        .select(
          'id,venture_id,name,storage_path,document_type,generated,processing_status,visibility,created_at'
        )
        .in(
          'venture_id',
          ids
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        );

    if (error) {
      return fail(error);
    }

    docs =
      data || [];
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

                          onclick: async () => {
                            const {
                              data: signed,
                              error
                            } = await sb.storage
                              .from('venture-docs')
                              .createSignedUrl(
                                doc.storage_path,
                                60
                              );

                            if (error) {
                              return fail(error);
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


// ---------- Messages ----------

async function renderAdminMessages() {
  const {
    data: ventures,
    error:
      ventureError
  } =
    await sb
      .from('ventures')
      .select(
        'id,title,owner_id'
      );

  if (ventureError) {
    return fail(
      ventureError
    );
  }

  const ids =
    (
      ventures ||
      []
    ).map(
      v => v.id
    );

  let messages = [];

  if (ids.length) {
    const {
      data,
      error
    } =
      await sb
        .from('comm_messages')
        .select(
          'id,venture_id,sender_id,body,created_at,message_type,visibility'
        )
        .in(
          'venture_id',
          ids
        )
        .order(
          'created_at',
          {
            ascending:
              false
          }
        )
        .limit(100);

    if (error) {
      return fail(error);
    }

    messages =
      data || [];
  }

  const rows =
    messages.length
      ? h(
          'div',
          {
            class:
              'admin-message-list'
          },

          ...messages.map(
            message => {
              const venture =
                ventures.find(
                  v =>
                    v.id ===
                    message.venture_id
                );

              const owner =
                state.customers.find(
                  c =>
                    c.id ===
                    venture?.owner_id
                );

              return h(
                'button',
                {
                  class:
                    'admin-message-row',

                  type:
                    'button',

                  onclick:
                    () =>
                      openAdminMessage(
                        message,
                        venture
                      )
                },

                h(
                  'div',
                  {
                    class:
                      'admin-message-main'
                  },

                  h(
                    'strong',
                    {},
                    owner?.full_name ||
                      owner?.company ||
                      'Kunde'
                  ),

                  h(
                    'span',
                    {
                      class:
                        'muted'
                    },
                    venture?.title ||
                      'Venture'
                  ),

                  h(
                    'p',
                    {},
                    String(
                      message.body ||
                        ''
                    ).slice(
                      0,
                      180
                    )
                  )
                ),

                h(
                  'span',
                  {
                    class:
                      'admin-customer-arrow'
                  },
                  '›'
                )
              );
            }
          )
        )
      : adminEmpty(
          'Keine Nachrichten vorhanden.'
        );

  adminShell(
    'Nachrichten',

    adminSection(
      'Kommunikation',
      'Nachrichten aus den Kunden-Workspaces.',

      rows
    )
  );
}


async function openAdminMessage(
  message,
  venture
) {
  state.adminMessage =
    message;

  state.venture =
    venture ||
    null;

  state.selectedCustomerId =
    venture?.owner_id ||
    null;

  adminPage =
    'message-detail';

  renderAdminPage();
}


async function renderAdminMessageDetail() {
  const message =
    state.adminMessage;

  if (!message) {
    adminPage =
      'messages';

    return renderAdminPage();
  }

  const owner =
    state.customers.find(
      c =>
        c.id ===
        state.selectedCustomerId
    );

  adminShell(
    'Nachricht',

    adminSection(
      'Nachricht',

      owner?.full_name ||
        owner?.company ||
        'Kunde',

      h(
        'div',
        {
          class:
            'admin-toolbar'
        },

        h(
          'button',
          {
            class:
              'btn btn-secondary',

            type:
              'button',

            onclick: () => {
              adminPage =
                'messages';

              renderAdminPage();
            }
          },
          '← Nachrichten'
        ),

        h(
          'button',
          {
            class:
              'btn btn-danger',

            type:
              'button',

            onclick: () =>
              deleteAdminMessage(
                message
              )
          },
          'Nachricht löschen'
        )
      ),

      h(
        'div',
        {
          class:
            'settings-group'
        },

        h(
          'strong',
          {},
          owner?.full_name ||
            owner?.company ||
            'Kunde'
        ),

        h(
          'span',
          {
            class:
              'muted'
          },
          state.venture?.title ||
            'Venture'
        ),

        h(
          'p',
          {},
          message.body ||
            ''
        ),

        h(
          'small',
          {
            class:
              'muted'
          },
          fmtT(
            message.created_at
          )
        )
      )
    )
  );
}


// ---------- Activity ----------

async function renderAdminActivity() {
  const {
    data,
    error
  } =
    await sb
      .from(
        'venture_activities'
      )
      .select(
        'id,venture_id,actor_id,actor_type,event_type,entity_type,entity_id,summary,visibility,created_at'
      )
      .order(
        'created_at',
        {
          ascending:
            false
        }
      )
      .limit(100);

  if (error) {
    return fail(error);
  }

  const activities =
    data || [];

  const rows =
    activities.length
      ? h(
          'div',
          {
            class:
              'admin-activity-list'
          },

          ...activities.map(
            activity =>
              h(
                'div',
                {
                  class:
                    'admin-activity-row'
                },

                h(
                  'div',
                  {
                    class:
                      'admin-activity-dot'
                  }
                ),

                h(
                  'div',
                  {
                    class:
                      'admin-activity-main'
                  },

                  h(
                    'strong',
                    {},
                    activity.summary ||
                      activity.event_type ||
                      'Aktivität'
                  ),

                  h(
                    'span',
                    {
                      class:
                        'muted'
                    },
                    activity.event_type ||
                      ''
                  ),

                  h(
                    'small',
                    {
                      class:
                        'muted'
                    },
                    fmtT(
                      activity.created_at
                    )
                  )
                )
              )
          )
        )
      : adminEmpty(
          'Noch keine Aktivitäten vorhanden.'
        );

  adminShell(
    'Aktivitäten',

    adminSection(
      'Aktivitätsverlauf',
      'Zentrale Übersicht der Venture-Aktivitäten.',

      rows
    )
  );
}


// ---------- Settings ----------

async function loadUserSettings() {
  const {
    data,
    error
  } =
    await sb
      .from(
        'portal_user_settings'
      )
      .select('*')
      .eq(
        'user_id',
        state.user.id
      )
      .maybeSingle();

  if (error) {
    console.warn(
      'User settings:',
      error
    );

    return null;
  }

  return data;
}


async function saveUserSettings(
  values
) {
  const payload = {
    user_id:
      state.user.id,

    ...values,

    updated_at:
      new Date().toISOString()
  };

  const {
    data,
    error
  } =
    await sb
      .from(
        'portal_user_settings'
      )
      .upsert(
        payload,
        {
          onConflict:
            'user_id'
        }
      )
      .select()
      .single();

  if (error) {
    return fail(error);
  }

  return data;
}


async function renderAdminSettings() {
  const settings =
    (
      await loadUserSettings()
    ) || {};

  const email =
    settings.email_notifications !==
    false;

  const push =
    settings.push_notifications ===
    true;

  const task =
    settings.task_notifications !==
    false;

  const message =
    settings.message_notifications !==
    false;

  const appointment =
    settings.appointment_notifications !==
    false;

  const weekly =
    settings.weekly_summary ===
    true;

  const appearance =
    settings.appearance ||
    'system';

  const locale =
    settings.locale ||
    'de';

  const timezone =
    settings.timezone ||
    'Europe/Vienna';

  const checkbox = (
    label,
    checked,
    key
  ) =>
    h(
      'label',
      {
        class:
          'settings-check'
      },

      h(
        'input',
        {
          type:
            'checkbox',

          checked,

          onchange:
            async e => {
              await saveUserSettings(
                {
                  [key]:
                    e.target.checked
                }
              );
            }
        }
      ),

      h(
        'span',
        {},
        label
      )
    );

  const form =
    h(
      'div',
      {
        class:
          'settings-grid'
      },

      h(
        'div',
        {
          class:
            'settings-group'
        },

        h(
          'h3',
          {},
          'Benachrichtigungen'
        ),

        checkbox(
          'E-Mail-Benachrichtigungen',
          email,
          'email_notifications'
        ),

        checkbox(
          'Push-Benachrichtigungen',
          push,
          'push_notifications'
        ),

        checkbox(
          'Aufgaben-Benachrichtigungen',
          task,
          'task_notifications'
        ),

        checkbox(
          'Nachrichten-Benachrichtigungen',
          message,
          'message_notifications'
        ),

        checkbox(
          'Termin-Benachrichtigungen',
          appointment,
          'appointment_notifications'
        ),

        checkbox(
          'Wochenzusammenfassung',
          weekly,
          'weekly_summary'
        )
      ),

      h(
        'div',
        {
          class:
            'settings-group'
        },

        h(
          'h3',
          {},
          'Darstellung'
        ),

        h(
          'label',
          {
            class:
              'settings-field'
          },

          h(
            'span',
            {},
            'Erscheinungsbild'
          ),

          h(
            'select',
            {
              value:
                appearance,

              onchange:
                async e => {
                  await saveUserSettings(
                    {
                      appearance:
                        e.target.value
                    }
                  );
                }
            },

            h(
              'option',
              {
                value:
                  'system'
              },
              'System'
            ),

            h(
              'option',
              {
                value:
                  'light'
              },
              'Hell'
            ),

            h(
              'option',
              {
                value:
                  'dark'
              },
              'Dunkel'
            )
          )
        ),

        h(
          'label',
          {
            class:
              'settings-field'
          },

          h(
            'span',
            {},
            'Sprache'
          ),

          h(
            'select',
            {
              value:
                locale,

              onchange:
                async e => {
                  await saveUserSettings(
                    {
                      locale:
                        e.target.value
                    }
                  );
                }
            },

            h(
              'option',
              {
                value:
                  'de'
              },
              'Deutsch'
            ),

            h(
              'option',
              {
                value:
                  'en'
              },
              'English'
            )
          )
        ),

        h(
          'label',
          {
            class:
              'settings-field'
          },

          h(
            'span',
            {},
            'Zeitzone'
          ),

          h(
            'input',
            {
              value:
                timezone,

              onchange:
                async e => {
                  await saveUserSettings(
                    {
                      timezone:
                        e.target.value
                    }
                  );
                }
            }
          )
        )
      ),

      h(
        'div',
        {
          class:
            'settings-group'
        },

        h(
          'h3',
          {},
          'Profil'
        ),

        h(
          'div',
          {
            class:
              'settings-profile'
          },

          h(
            'div',
            {
              class:
                'admin-avatar large'
            },

            initials(
              state.profile?.full_name ||
              state.user?.email
            )
          ),

          h(
            'div',
            {},

            h(
              'strong',
              {},
              state.profile?.full_name ||
                'Administrator'
            ),

            h(
              'span',
              {
                class:
                  'muted'
              },
              state.user?.email ||
                ''
            ),

            state.profile?.company
              ? h(
                  'span',
                  {
                    class:
                      'muted'
                  },
                  state.profile.company
                )
              : null
          )
        )
      )
    );

  adminShell(
    'Einstellungen',

    adminSection(
      'Portal-Einstellungen',
      'Persönliche Einstellungen für deinen Admin-Zugang.',

      form
    )
  );
}


// ---------- Logout ----------

async function logout() {
  try {
    await sb.auth.signOut();
  } catch (error) {
    console.error(
      error
    );
  }
}


// ---------- Admin Initialization ----------

function initAdminPortal() {
  if (!isAdmin()) {
    return;
  }

  if (!adminPage) {
    adminPage =
      'overview';
  }

  renderAdminPage();
}


// ---------- Expose ----------

window.renderAdminPage =
  renderAdminPage;

window.initAdminPortal =
  initAdminPortal;
