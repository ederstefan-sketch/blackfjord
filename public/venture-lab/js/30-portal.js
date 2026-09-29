// ---------- Portal-Rahmen & Admin Center ----------
function daysLeft(m) {
  return Math.ceil(
    (new Date(m.trial_ends_at) - Date.now()) / 86400000
  );
}

function status() {
  const m = state.membership;

  if (!m) {
    return isAdmin()
      ? { text: 'Admin', cls: '' }
      : { text: 'Kein Zugang aktiv', cls: 'bad' };
  }

  if (
    m.plan === 'expired' ||
    (m.plan === 'trial_full' && daysLeft(m) < 0)
  ) {
    return { text: 'Abgelaufen', cls: 'bad' };
  }

  if (m.plan === 'trial_full') {
    const d = daysLeft(m);
    return {
      text: `Testphase · ${d} ${d === 1 ? 'Tag' : 'Tage'}`,
      cls: ''
    };
  }

  return {
    text: m.plan || 'Aktiv',
    cls: ''
  };
}

// ---------- Admin State ----------
let menuOpen = false;
let adminPage = 'overview';

// ---------- Admin Shell ----------
function adminShell(title, ...content) {
  app.replaceChildren(
    adminHeader(title),
    adminDrawer(),
    h(
      'main',
      {
        id: 'content',
        class: 'admin-content'
      },
      ...content
    )
  );
}

function adminHeader(title) {
  return h(
    'header',
    {
      class: 'admin-header'
    },

    h(
      'button',
      {
        class: 'icon-btn admin-menu-btn',
        type: 'button',
        onclick: () => {
          menuOpen = !menuOpen;
          renderAdminPage();
        },
        title: 'Menü'
      },
      '☰'
    ),

    h(
      'div',
      {
        class: 'admin-header-title'
      },

      h(
        'div',
        {
          class: 'eyebrow'
        },
        'BLACKFJORD'
      ),

      h(
        'h1',
        {},
        title
      )
    ),

    h(
      'div',
      {
        class: 'admin-header-actions'
      },

      state.selectedCustomerId
        ? h(
            'button',
            {
              class: 'btn btn-secondary',
              type: 'button',
              onclick: () => {
                state.selectedCustomerId = null;
                state.venture = null;
                state.tab = 'chat';
                adminPage = 'customers';
                renderAdminPage();
              }
            },
            'Kunde wechseln'
          )
        : null,

      h(
        'button',
        {
          class: 'btn btn-secondary',
          type: 'button',
          onclick: logout
        },
        'Abmelden'
      )
    )
  );
}

// ---------- Admin Drawer ----------
function adminDrawer() {
  if (!menuOpen) return null;

  const item = (key, label, icon) =>
    h(
      'button',
      {
        class:
          'admin-nav-item' +
          (adminPage === key ? ' active' : ''),
        type: 'button',
        onclick: () => {
          menuOpen = false;
          adminPage = key;

          if (
            key !== 'customers' &&
            key !== 'overview'
          ) {
            state.selectedCustomerId = null;
            state.venture = null;
          }

          renderAdminPage();
        }
      },

      h(
        'span',
        {
          class: 'admin-nav-icon'
        },
        icon
      ),

      h(
        'span',
        {},
        label
      )
    );

  return h(
    'aside',
    {
      class: 'admin-drawer'
    },

    h(
      'div',
      {
        class: 'admin-drawer-brand'
      },

      logo(),
      wordmark()
    ),

    h(
      'div',
      {
        class: 'admin-nav'
      },

      h(
        'div',
        {
          class: 'admin-nav-section'
        },
        'ADMIN'
      ),

      item('overview', 'Übersicht', '⌂'),
      item('customers', 'Kunden', '♙'),
      item('ventures', 'Ventures', '◆'),
      item('tasks', 'Aufgaben', '✓'),
      item('docs', 'Dokumente', '▤'),
      item('messages', 'Nachrichten', '✉'),
      item('activity', 'Aktivitäten', '◌'),
      item('settings', 'Einstellungen', '⚙'),

      h(
        'div',
        {
          class:
            'admin-nav-section customer-nav-section'
        },
        'KUNDE'
      ),

      state.selectedCustomerId
        ? h(
            'button',
            {
              class:
                'admin-nav-item customer-current',
              type: 'button',
              onclick: () => {
                menuOpen = false;
                openCustomerWorkspace(
                  state.selectedCustomerId
                );
              }
            },

            h(
              'span',
              {
                class: 'admin-nav-icon'
              },
              '→'
            ),

            h(
              'span',
              {},
              customerName(
                state.selectedCustomerId
              )
            )
          )
        : h(
            'button',
            {
              class: 'admin-nav-item',
              type: 'button',
              onclick: () => {
                menuOpen = false;
                adminPage = 'customers';
                renderAdminPage();
              }
            },

            h(
              'span',
              {
                class: 'admin-nav-icon'
              },
              '→'
            ),

            h(
              'span',
              {},
              'Kunde auswählen'
            )
          )
    )
  );
}

// ---------- Helpers ----------
function customerName(id) {
  const customer =
    (state.customers || []).find(
      c => c.id === id
    );

  if (!customer) return 'Kunde';

  return (
    customer.full_name ||
    customer.company ||
    'Kunde'
  );
}

function customerCompany(id) {
  const customer =
    (state.customers || []).find(
      c => c.id === id
    );

  return customer?.company || '';
}

function initials(value) {
  const text = String(value || '').trim();

  if (!text) return '?';

  return text
    .split(/\s+/)
    .slice(0, 2)
    .map(x => x[0])
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
      class: 'admin-stat-card',
      type: 'button',
      onclick
    },

    h(
      'div',
      {
        class: 'admin-stat-label'
      },
      label
    ),

    h(
      'div',
      {
        class: 'admin-stat-value'
      },
      String(value)
    ),

    detail
      ? h(
          'div',
          {
            class: 'admin-stat-detail'
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
      class: 'admin-section'
    },

    h(
      'div',
      {
        class: 'admin-section-head'
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
                class: 'muted'
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
      class: 'admin-empty'
    },

    h(
      'div',
      {
        class: 'admin-empty-icon'
      },
      '○'
    ),

    h(
      'div',
      {
        class: 'admin-empty-text'
      },
      text
    ),

    actionLabel
      ? h(
          'button',
          {
            class: 'btn btn-primary',
            type: 'button',
            onclick: action
          },
          actionLabel
        )
      : null
  );
}

// ---------- Admin Router ----------
function renderAdminPage() {
  if (!isAdmin()) {
    return renderPortal();
  }

  switch (adminPage) {
    case 'customers':
      return renderAdminCustomers();

    case 'ventures':
      return renderAdminVentures();

    case 'tasks':
      return renderAdminTasks();

    case 'docs':
      return renderAdminDocs();

    case 'messages':
      return renderAdminMessages();

    case 'activity':
      return renderAdminActivity();

    case 'settings':
      return renderAdminSettings();

    case 'overview':
    default:
      return renderAdminOverview();
  }
}

// ---------- Overview ----------
async function adminCounts() {
  const customers =
    state.customers?.length || 0;

  const {
    data: ventures
  } = await sb
    .from('ventures')
    .select('id');

  const ventureIds =
    (ventures || []).map(
      v => v.id
    );

  let tasks = [];
  let docs = [];
  let messages = [];

  if (ventureIds.length) {
    const [
      tasksResult,
      docsResult,
      messagesResult
    ] = await Promise.all([
      sb
        .from('tasks')
        .select('id,status')
        .in(
          'venture_id',
          ventureIds
        ),

      sb
        .from('documents')
        .select('id')
        .in(
          'venture_id',
          ventureIds
        ),

      sb
        .from('comm_messages')
        .select('id')
        .in(
          'venture_id',
          ventureIds
        )
    ]);

    tasks =
      tasksResult.data || [];

    docs =
      docsResult.data || [];

    messages =
      messagesResult.data || [];
  }

  const openTasks =
    tasks.filter(task => {
      const value =
        String(
          task.status || ''
        ).toLowerCase();

      return ![
        'done',
        'completed',
        'closed'
      ].includes(value);
    }).length;

  return {
    customers,
    ventures:
      ventures?.length || 0,
    tasks: openTasks,
    docs: docs.length,
    messages: messages.length
  };
}

async function renderAdminOverview() {
  const counts =
    await adminCounts();

  const stats = h(
    'div',
    {
      class: 'admin-stats'
    },

    statCard(
      'Kunden',
      counts.customers,
      'Kundenkonten',
      () => {
        adminPage = 'customers';
        renderAdminPage();
      }
    ),

    statCard(
      'Ventures',
      counts.ventures,
      'aktive / vorhandene Ventures',
      () => {
        adminPage = 'ventures';
        renderAdminPage();
      }
    ),

    statCard(
      'Offene Aufgaben',
      counts.tasks,
      'noch nicht erledigt',
      () => {
        adminPage = 'tasks';
        renderAdminPage();
      }
    ),

    statCard(
      'Dokumente',
      counts.docs,
      'im Workspace',
      () => {
        adminPage = 'docs';
        renderAdminPage();
      }
    ),

    statCard(
      'Nachrichten',
      counts.messages,
      'Kommunikation',
      () => {
        adminPage = 'messages';
        renderAdminPage();
      }
    )
  );

  const quickActions = h(
    'div',
    {
      class: 'admin-quick-actions'
    },

    h(
      'button',
      {
        class: 'admin-action-card',
        type: 'button',
        onclick: () => {
          adminPage = 'customers';
          renderAdminPage();
        }
      },

      h(
        'strong',
        {},
        'Kunden öffnen'
      ),

      h(
        'span',
        {},
        'Kunden auswählen und direkt in deren Workspace springen.'
      )
    ),

    h(
      'button',
      {
        class: 'admin-action-card',
        type: 'button',
        onclick: () => {
          adminPage = 'ventures';
          renderAdminPage();
        }
      },

      h(
        'strong',
        {},
        'Ventures verwalten'
      ),

      h(
        'span',
        {},
        'Ventures ansehen, öffnen und neue Ventures anlegen.'
      )
    ),

    h(
      'button',
      {
        class: 'admin-action-card',
        type: 'button',
        onclick: () => {
          adminPage = 'settings';
          renderAdminPage();
        }
      },

      h(
        'strong',
        {},
        'Einstellungen'
      ),

      h(
        'span',
        {},
        'Portal- und Benutzereinstellungen verwalten.'
      )
    )
  );

  adminShell(
    'Übersicht',

    h(
      'div',
      {
        class: 'admin-page-intro'
      },

      h(
        'div',
        {},

        h(
          'p',
          {
            class: 'eyebrow'
          },
          'VENTURE LAB'
        ),

        h(
          'h2',
          {},
          'Willkommen im Admin Center'
        ),

        h(
          'p',
          {
            class: 'muted'
          },
          'Von hier aus steuerst du Kunden, Ventures und den gesamten Workspace.'
        )
      )
    ),

    stats,

    adminSection(
      'Schnellzugriff',
      'Die wichtigsten Bereiche direkt erreichbar.',
      quickActions
    )
  );
}

// ---------- Customers ----------
async function renderAdminCustomers() {
  if (!state.customers?.length) {
    const {
      data,
      error
    } = await sb
      .from('profiles')
      .select(
        'id,full_name,company,role,first_name,last_name'
      )
      .eq(
        'role',
        'customer'
      )
      .order(
        'full_name',
        {
          ascending: true
        }
      );

    if (error) {
      return fail(error);
    }

    state.customers =
      data || [];
  }

  const rows =
    state.customers.length
      ? h(
          'div',
          {
            class:
              'admin-customer-list'
          },

          ...state.customers.map(
            customer =>
              h(
                'button',
                {
                  class:
                    'admin-customer-row' +
                    (
                      state.selectedCustomerId ===
                      customer.id
                        ? ' selected'
                        : ''
                    ),
                  type: 'button',
                  onclick: () =>
                    openCustomerWorkspace(
                      customer.id
                    )
                },

                h(
                  'div',
                  {
                    class:
                      'admin-avatar'
                  },
                  initials(
                    customer.full_name ||
                    customer.company
                  )
                ),

                h(
                  'div',
                  {
                    class:
                      'admin-customer-main'
                  },

                  h(
                    'strong',
                    {},
                    customer.full_name ||
                    customer.company ||
                    'Unbenannter Kunde'
                  ),

                  customer.company
                    ? h(
                        'span',
                        {
                          class:
                            'muted'
                        },
                        customer.company
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
              )
          )
        )
      : adminEmpty(
          'Noch keine Kunden vorhanden.'
        );

  adminShell(
    'Kunden',

    adminSection(
      'Kunden auswählen',
      'Öffne einen Kunden, um dessen vollständigen Workspace zu bearbeiten.',

      h(
        'div',
        {
          class: 'admin-toolbar'
        },

        h(
          'button',
          {
            class:
              'btn btn-secondary',
            type: 'button',
            onclick: () => {
              state.selectedCustomerId =
                null;
              state.venture = null;
              adminPage =
                'overview';
              renderAdminPage();
            }
          },
          'Zur Übersicht'
        )
      ),

      rows
    )
  );
}

// ---------- Customer Workspace ----------
async function openCustomerWorkspace(
  customerId
) {
  state.selectedCustomerId =
    customerId;

  state.tab =
    'chat';

  state.venture =
    null;

  await loadCustomerContext();
}

async function renderCustomerWorkspace() {
  if (
    !state.selectedCustomerId
  ) {
    adminPage =
      'customers';

    return renderAdminPage();
  }

  const customer =
    state.customers.find(
      c =>
        c.id ===
        state.selectedCustomerId
    );

  if (!customer) {
    state.selectedCustomerId =
      null;

    adminPage =
      'customers';

    return renderAdminPage();
  }

  const workspaceHeader =
    h(
      'div',
      {
        class:
          'customer-workspace-header'
      },

      h(
        'div',
        {
          class:
            'customer-workspace-identity'
        },

        h(
          'div',
          {
            class:
              'admin-avatar large'
          },
          initials(
            customer.full_name ||
            customer.company
          )
        ),

        h(
          'div',
          {},

          h(
            'div',
            {
              class:
                'eyebrow'
            },
            'KUNDE'
          ),

          h(
            'h1',
            {},
            customer.full_name ||
            customer.company ||
            'Kunde'
          ),

          customer.company
            ? h(
                'p',
                {
                  class:
                    'muted'
                },
                customer.company
              )
            : null
        )
      ),

      h(
        'button',
        {
          class:
            'btn btn-secondary',
          type: 'button',
          onclick: () => {
            state.selectedCustomerId =
              null;

            state.venture =
              null;

            adminPage =
              'customers';

            renderAdminPage();
          }
        },
        'Kunde wechseln'
      )
    );

  const tabs =
    h(
      'nav',
      {
        class: 'tabs'
      },

      ...TABS.map(
        tab => {
          const active =
            state.tab ===
            tab[0];

          return h(
            'button',
            {
              class:
                'tab' +
                (
                  active
                    ? ' active'
                    : ''
                ),
              type: 'button',
              onclick: () => {
                state.tab =
                  tab[0];

                renderCustomerWorkspace();
              }
            },
            tab[1]
          );
        }
      )
    );

  let body;

  switch (
    state.tab
  ) {
    case 'memory':
      body =
        typeof renderMemory ===
        'function'
          ? renderMemory()
          : null;
      break;

    case 'tasks':
      body =
        typeof renderTasks ===
        'function'
          ? renderTasks()
          : null;
      break;

    case 'docs':
      body =
        typeof renderDocs ===
        'function'
          ? renderDocs()
          : null;
      break;

    case 'msgs':
      body =
        typeof renderMsgs ===
        'function'
          ? renderMsgs()
          : null;
      break;

    case 'chat':
    default:
      body =
        typeof renderChat ===
        'function'
          ? renderChat()
          : null;
      break;
  }

  app.replaceChildren(
    adminHeader(
      customer.full_name ||
      customer.company ||
      'Kunde'
    ),

    adminDrawer(),

    h(
      'main',
      {
        id: 'content',
        class:
          'customer-workspace'
      },

      workspaceHeader,
      tabs,
      body
    )
  );
}

// ---------- Ventures ----------
async function renderAdminVentures() {
  const {
    data,
    error
  } = await sb
    .from('ventures')
    .select(
      'id,title,description,stage,progress,owner_id,created_at'
    )
    .order(
      'created_at',
      {
        ascending: false
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
                  type: 'button',
                  onclick: () =>
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
                        `${venture.progress}%`
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
          'Noch keine Ventures vorhanden.',
          'Neues Venture',
          () => newVenture()
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
            type: 'button',
            onclick: () =>
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
  if (!venture?.owner_id) {
    return;
  }

  await openCustomerWorkspace(
    venture.owner_id
  );

  if (
    typeof selectVenture ===
    'function'
  ) {
    await selectVenture(
      venture.id
    );
  }
}

// ---------- Tasks ----------
async function renderAdminTasks() {
  const {
    data: ventures,
    error:
      ventureError
  } = await sb
    .from('ventures')
    .select(
      'id,title,owner_id'
    )
    .order(
      'created_at',
      {
        ascending: false
      }
    );

  if (ventureError) {
    return fail(
      ventureError
    );
  }

  const ventureIds =
    (ventures || []).map(
      v => v.id
    );

  let tasks = [];

  if (
    ventureIds.length
  ) {
    const {
      data,
      error
    } = await sb
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
          ascending: false
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
  } = await sb
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
        'id,venture_id,name,document_type,generated,processing_status,visibility,created_at'
      )
      .in(
        'venture_id',
        ids
      )
      .order(
        'created_at',
        {
          ascending: false
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
                    : null
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
  } = await sb
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
    (ventures || []).map(
      v => v.id
    );

  let messages = [];

  if (ids.length) {
    const {
      data,
      error
    } = await sb
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
          ascending: false
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
                  type: 'button',
                  onclick: () =>
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
  if (!venture?.owner_id) {
    return;
  }

  await openCustomerWorkspace(
    venture.owner_id
  );

  if (
    typeof selectVenture ===
    'function'
  ) {
    await selectVenture(
      venture.id
    );
  }

  state.tab =
    'msgs';

  renderCustomerWorkspace();
}

// ---------- Activity ----------
async function renderAdminActivity() {
  const {
    data,
    error
  } = await sb
    .from('venture_activities')
    .select(
      'id,venture_id,actor_id,actor_type,event_type,entity_type,entity_id,summary,visibility,created_at'
    )
    .order(
      'created_at',
      {
        ascending: false
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
  } = await sb
    .from('portal_user_settings')
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
  } = await sb
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
    (await loadUserSettings()) ||
    {};

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
          type: 'checkbox',
          checked,

          onchange:
            async e => {
              await saveUserSettings({
                [key]:
                  e.target.checked
              });
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
                  await saveUserSettings({
                    appearance:
                      e.target.value
                  });
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
                  await saveUserSettings({
                    locale:
                      e.target.value
                  });
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
                  await saveUserSettings({
                    timezone:
                      e.target.value
                  });
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

  if (
    !state.selectedCustomerId
  ) {
    renderAdminPage();
  }
}

// ---------- Expose ----------
window.renderAdminPage =
  renderAdminPage;

window.openCustomerWorkspace =
  openCustomerWorkspace;

window.renderCustomerWorkspace =
  renderCustomerWorkspace;

window.initAdminPortal =
  initAdminPortal;