// ---------- Kunden-Portal ----------
// Venture Lab Design 2.0
//
// Diese Datei ist ausschließlich für Kunden gedacht.
// Admins werden weiterhin in das Admin Center geleitet.

function customerLabel(c) {
  return (
    c?.full_name ||
    c?.company ||
    'Kunde'
  );
}


// ---------- Design 2.0: Kunden-Navigation ----------

const CUSTOMER_TABS = [
  ['home', 'Übersicht'],
  ['chat', 'KI-Chat'],
  ['tasks', 'Aufgaben'],
  ['docs', 'Dokumente'],
  ['memory', 'Gedächtnis'],
  ['msgs', 'BLACKFJORD']
];


// ---------- Status / Banner ----------

function banner() {
  const s = status();
  const m = state.membership;

  const contact = h(
    'a',
    {
      href:
        'mailto:' +
        CONTACT +
        '?subject=' +
        encodeURIComponent(
          'Venture weiterentwickeln'
        ),
      style:
        'color:var(--blue)'
    },
    'Schreib uns'
  );

  if (
    s.cls === 'bad' &&
    m
  ) {
    return h(
      'div',
      {
        class: 'banner bad'
      },
      'Dein Venture Workspace ist abgelaufen. Möchtest du dein Venture weiterentwickeln? ',
      contact,
      ' und wähle BASIC oder FULL.'
    );
  }

  if (
    s.cls === 'bad'
  ) {
    return h(
      'div',
      {
        class: 'banner bad'
      },
      'Für dieses Venture ist noch kein Zugang aktiv. ',
      contact,
      ', wenn du Hilfe brauchst.'
    );
  }

  if (
    s.cls === 'warn'
  ) {
    return h(
      'div',
      {
        class: 'banner warn'
      },
      'Deine Testphase endet bald. Danach kannst du mit BASIC selbstständig oder mit FULL samt BLACKFJORD-Begleitung weitermachen. ',
      contact,
      '.'
    );
  }

  return null;
}


// ---------- Übersicht: Daten ----------

async function loadCustomerOverviewData() {
  const ventureId =
    state.venture?.id;

  if (!ventureId) {
    return {
      tasks: [],
      docs: [],
      messages: []
    };
  }

  const [
    tasksResult,
    docsResult,
    messagesResult
  ] = await Promise.all([
    sb
      .from('tasks')
      .select(
        'id,title,status,due_date,assigned_to,created_at'
      )
      .eq(
        'venture_id',
        ventureId
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      ),

    sb
      .from('documents')
      .select(
        'id,name,document_type,processing_status,created_at'
      )
      .eq(
        'venture_id',
        ventureId
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      ),

    sb
      .from('comm_messages')
      .select(
        'id,sender_id,body,created_at'
      )
      .eq(
        'venture_id',
        ventureId
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      )
      .limit(5)
  ]);

  if (tasksResult.error) {
    throw tasksResult.error;
  }

  if (docsResult.error) {
    throw docsResult.error;
  }

  if (messagesResult.error) {
    throw messagesResult.error;
  }

  return {
    tasks:
      tasksResult.data || [],

    docs:
      docsResult.data || [],

    messages:
      messagesResult.data || []
  };
}


// ---------- Übersicht ----------

async function renderCustomerOverview(c) {
  const venture =
    state.venture;

  if (!venture) {
    c.replaceChildren(
      h(
        'div',
        {
          class: 'empty'
        },
        h(
          'h2',
          {},
          'Noch kein Venture'
        ),
        h(
          'p',
          {
            class: 'muted'
          },
          'Sobald dein BLACKFJORD Venture eingerichtet ist, erscheint es hier.'
        )
      )
    );

    return;
  }

  c.replaceChildren(
    h(
      'div',
      {
        class: 'customer-overview-loading'
      },
      h(
        'p',
        {
          class: 'muted'
        },
        'Venture wird geladen …'
      )
    )
  );

  const data =
    await loadCustomerOverviewData();

  const openTasks =
    data.tasks.filter(
      task => {
        const status =
          String(
            task.status ||
              ''
          ).toLowerCase();

        return ![
          'done',
          'completed',
          'closed'
        ].includes(status);
      }
    );

  const nextTask =
    openTasks[0] ||
    null;

  const firstDocument =
    data.docs[0] ||
    null;

  const firstMessage =
    data.messages[0] ||
    null;

  const userName =
    customerLabel(
      state.profile
    );

  // ---------- Header ----------

  const intro =
    h(
      'section',
      {
        class:
          'customer-overview-intro'
      },

      h(
        'div',
        {
          class:
            'eyebrow'
        },
        'VENTURE LAB'
      ),

      h(
        'h2',
        {},
        'Willkommen, ' +
          userName
      ),

      h(
        'p',
        {
          class: 'muted'
        },
        'Hier findest du alles, was du für dein Venture gerade brauchst.'
      )
    );


  // ---------- Venture Header ----------

  const ventureHeader =
    h(
      'section',
      {
        class:
          'customer-venture-card'
      },

      h(
        'div',
        {
          class:
            'customer-venture-main'
        },

        h(
          'div',
          {
            class:
              'customer-venture-eyebrow'
          },
          'DEIN VENTURE'
        ),

        h(
          'h1',
          {},
          venture.title ||
            'Dein Venture'
        ),

        venture.description
          ? h(
              'p',
              {
                class: 'muted'
              },
              venture.description
            )
          : h(
              'p',
              {
                class: 'muted'
              },
              'Dein persönlicher Workspace bei BLACKFJORD.'
            )
      ),

      h(
        'div',
        {
          class:
            'customer-venture-status'
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
                  'badge'
              },
              venture.progress +
                '%'
            )
          : null
      )
    );


  // ---------- Nächster Schritt ----------

  const nextStep =
    h(
      'section',
      {
        class:
          'customer-next-step'
      },

      h(
        'div',
        {
          class:
            'customer-section-label'
        },
        'NÄCHSTER SCHRITT'
      ),

      nextTask
        ? h(
            'div',
            {
              class:
                'customer-next-task'
            },

            h(
              'div',
              {
                class:
                  'customer-next-task-icon'
              },
              '○'
            ),

            h(
              'div',
              {
                class:
                  'customer-next-task-main'
              },

              h(
                'strong',
                {},
                nextTask.title
              ),

              h(
                'span',
                {
                  class:
                    'muted'
                },
                nextTask.due_date
                  ? 'Fällig am ' +
                      nextTask.due_date
                  : 'Offene Aufgabe'
              )
            ),

            h(
              'button',
              {
                class:
                  'btn-secondary sm',
                type:
                  'button',
                onclick: () => {
                  state.tab =
                    'tasks';

                  renderPortal();
                }
              },
              'Aufgabe öffnen'
            )
          )
        : h(
            'div',
            {
              class:
                'customer-next-empty'
            },

            h(
              'strong',
              {},
              'Alles im Griff'
            ),

            h(
              'p',
              {
                class: 'muted'
              },
              'Aktuell sind keine offenen Aufgaben vorhanden.'
            )
          )
    );


  // ---------- Kennzahlen ----------

  const stats =
    h(
      'section',
      {
        class:
          'customer-overview-stats'
      },

      h(
        'button',
        {
          class:
            'customer-stat-card',
          type:
            'button',
          onclick: () => {
            state.tab =
              'tasks';

            renderPortal();
          }
        },

        h(
          'span',
          {
            class:
              'customer-stat-value'
          },
          String(
            openTasks.length
          )
        ),

        h(
          'span',
          {
            class:
              'customer-stat-label'
          },
          'Offene Aufgaben'
        )
      ),

      h(
        'button',
        {
          class:
            'customer-stat-card',
          type:
            'button',
          onclick: () => {
            state.tab =
              'docs';

            renderPortal();
          }
        },

        h(
          'span',
          {
            class:
              'customer-stat-value'
          },
          String(
            data.docs.length
          )
        ),

        h(
          'span',
          {
            class:
              'customer-stat-label'
          },
          'Dokumente'
        )
      ),

      h(
        'button',
        {
          class:
            'customer-stat-card',
          type:
            'button',
          onclick: () => {
            state.tab =
              'msgs';

            renderPortal();
          }
        },

        h(
          'span',
          {
            class:
              'customer-stat-value'
          },
          String(
            data.messages.length
          )
        ),

        h(
          'span',
          {
            class:
              'customer-stat-label'
          },
          'Nachrichten'
        )
      )
    );


  // ---------- Schnellzugriff ----------

  const quick =
    h(
      'section',
      {
        class:
          'customer-overview-section'
      },

      h(
        'div',
        {
          class:
            'customer-section-heading'
        },

        h(
          'h3',
          {},
          'Was möchtest du tun?'
        ),

        h(
          'p',
          {
            class:
              'muted'
          },
          'Arbeite direkt dort weiter, wo du gerade bist.'
        )
      ),

      h(
        'div',
        {
          class:
            'customer-quick-grid'
        },

        h(
          'button',
          {
            class:
              'customer-quick-card',
            type:
              'button',
            onclick: () => {
              state.tab =
                'chat';

              renderPortal();
            }
          },

          h(
            'span',
            {
              class:
                'customer-quick-icon'
            },
            '◉'
          ),

          h(
            'strong',
            {},
            'KI-Chat'
          ),

          h(
            'span',
            {
              class:
                'muted'
            },
            'Dein Sparringspartner für das Venture'
          )
        ),

        h(
          'button',
          {
            class:
              'customer-quick-card',
            type:
              'button',
            onclick: () => {
              state.tab =
                'tasks';

              renderPortal();
            }
          },

          h(
            'span',
            {
              class:
                'customer-quick-icon'
            },
            '✓'
          ),

          h(
            'strong',
            {},
            'Aufgaben'
          ),

          h(
            'span',
            {
              class:
                'muted'
            },
            'Deine nächsten Schritte'
          )
        ),

        h(
          'button',
          {
            class:
              'customer-quick-card',
            type:
              'button',
            onclick: () => {
              state.tab =
                'docs';

              renderPortal();
            }
          },

          h(
            'span',
            {
              class:
                'customer-quick-icon'
            },
            '▤'
          ),

          h(
            'strong',
            {},
            'Dokumente'
          ),

          h(
            'span',
            {
              class:
                'muted'
            },
            'Unterlagen und Wissen für dein Venture'
          )
        ),

        h(
          'button',
          {
            class:
              'customer-quick-card',
            type:
              'button',
            onclick: () => {
              state.tab =
                'msgs';

              renderPortal();
            }
          },

          h(
            'span',
            {
              class:
                'customer-quick-icon'
            },
            '✉'
          ),

          h(
            'strong',
            {},
            'BLACKFJORD'
          ),

          h(
            'span',
            {
              class:
                'muted'
            },
            'Direkter Draht zu BLACKFJORD'
          )
        )
      )
    );


  // ---------- Letzte Aktivität ----------

  const recent =
    h(
      'section',
      {
        class:
          'customer-overview-section'
      },

      h(
        'div',
        {
          class:
            'customer-section-heading'
        },

        h(
          'h3',
          {},
          'Zuletzt'
        ),

        h(
          'p',
          {
            class:
              'muted'
          },
          'Was zuletzt in deinem Venture passiert ist.'
        )
      ),

      h(
        'div',
        {
          class:
            'customer-recent-card'
        },

        firstDocument
          ? h(
              'div',
              {
                class:
                  'customer-recent-row'
              },

              h(
                'span',
                {
                  class:
                    'customer-recent-icon'
                },
                '▤'
              ),

              h(
                'div',
                {
                  class:
                    'customer-recent-main'
                },

                h(
                  'strong',
                  {},
                  firstDocument.name ||
                    'Dokument'
                ),

                h(
                  'span',
                  {
                    class:
                      'muted'
                  },
                  'Dokument'
                )
              )
            )
          : null,

        firstMessage
          ? h(
              'div',
              {
                class:
                  'customer-recent-row'
              },

              h(
                'span',
                {
                  class:
                    'customer-recent-icon'
                },
                '✉'
              ),

              h(
                'div',
                {
                  class:
                    'customer-recent-main'
                },

                h(
                  'strong',
                  {},
                  'Neue Nachricht'
                ),

                h(
                  'span',
                  {
                    class:
                      'muted'
                  },
                  String(
                    firstMessage.body ||
                      ''
                  ).slice(
                    0,
                    90
                  )
                )
              )
            )
          : null,

        !firstDocument &&
        !firstMessage
          ? h(
              'div',
              {
                class:
                  'customer-recent-empty'
              },
              'Noch keine Aktivitäten vorhanden.'
            )
          : null
      )
    );


  c.replaceChildren(
    intro,
    ventureHeader,
    nextStep,
    stats,
    quick,
    recent
  );
}


// ---------- Portal ----------

function renderPortal() {
  // Admin darf niemals im Kundenportal landen.
  if (isAdmin()) {
    if (
      typeof renderAdminPage ===
      'function'
    ) {
      return renderAdminPage();
    }

    return;
  }

  if (!state.venture) {
    app.replaceChildren(
      h(
        'header',
        {
          class: 'top'
        },

        h(
          'div',
          {
            class: 'brand'
          },
          logo(),
          wordmark(),

          h(
            'small',
            {},
            'Venture Lab'
          )
        ),

        h(
          'div',
          {
            class:
              'top-right'
          },

          h(
            'button',
            {
              class:
                'btn ghost sm',
              onclick:
                () =>
                  sb.auth.signOut()
            },
            'Abmelden'
          )
        )
      ),

      h(
        'div',
        {
          class: 'pad'
        },

        h(
          'h2',
          {},
          'Noch kein Venture'
        ),

        h(
          'p',
          {
            class:
              'muted'
          },
          'Sobald du ein BLACKFJORD-Paket gebucht hast, richten wir dein Venture Workspace ein.'
        )
      )
    );

    return;
  }

  const s =
    status();


  // ---------- Venture-Auswahl ----------

  const sel =
    h(
      'select',
      {
        'aria-label':
          'Venture wählen',

        onchange:
          e =>
            selectVenture(
              e.target.value
            )
      },

      state.ventures.map(
        v =>
          h(
            'option',
            {
              value:
                v.id,

              selected:
                v.id ===
                state.venture.id
            },
            v.title
          )
      )
    );


  // ---------- Topbar ----------

  const top =
    h(
      'header',
      {
        class: 'top'
      },

      h(
        'div',
        {
          class:
            'brand'
        },

        logo(),
        wordmark(),

        h(
          'small',
          {},
          'Venture Lab'
        )
      ),

      h(
        'div',
        {
          class:
            'top-right'
        },

        sel,

        h(
          'span',
          {
            class:
              'badge ' +
              s.cls
          },
          s.text
        ),

        h(
          'button',
          {
            class:
              'btn ghost sm',
            onclick:
              () =>
                sb.auth.signOut()
          },
          'Abmelden'
        )
      )
    );


  // ---------- Navigation ----------

  const nav =
    h(
      'nav',
      {
        class:
          'tabs',
        'aria-label':
          'Bereiche'
      },

      CUSTOMER_TABS.map(
        ([id, label]) =>
          h(
            'button',
            {
              'aria-current':
                state.tab ===
                id
                  ? 'true'
                  : 'false',

              onclick: () => {
                state.tab =
                  id;

                renderPortal();
              }
            },
            label
          )
      )
    );


  const bannerEl =
    banner();


  // ---------- Seite ----------

  app.replaceChildren(
    ...[
      top,
      bannerEl,
      nav,

      h(
        'main',
        {
          id:
            'content',

          class:
            state.tab ===
            'chat'
              ? 'chatmode'
              : ''
        }
      )
    ].filter(Boolean)
  );


  // Chat-Höhe berechnen
  const chrome =
    top.offsetHeight +
    (
      app.querySelector(
        '.banner'
      )?.offsetHeight ||
      0
    ) +
    nav.offsetHeight;

  document.documentElement.style.setProperty(
    '--chrome',
    chrome + 'px'
  );

  renderTab();
}


// ---------- Tab Router ----------

async function renderTab() {
  const c =
    document.getElementById(
      'content'
    );

  if (!c) {
    return;
  }

  const fn =
    {
      home:
        renderCustomerOverview,

      chat:
        renderChat,

      memory:
        renderMemory,

      tasks:
        renderTasks,

      docs:
        renderDocs,

      msgs:
        renderMsgs
    }[
      state.tab
    ];

  if (
    typeof fn !==
    'function'
  ) {
    c.replaceChildren(
      h(
        'p',
        {
          class:
            'err pad'
        },
        'Bereich konnte nicht geladen werden.'
      )
    );

    return;
  }

  try {
    await fn(c);
  } catch (e) {
    c.replaceChildren(
      h(
        'p',
        {
          class:
            'err pad'
        },
        'Fehler beim Laden: ' +
          e.message
      )
    );
  }
}
