// ---------- Admin Shell ----------

// ---------- Admin State ----------

let menuOpen =
  false;

let adminPage =
  'overview';


// ---------- Admin Shell ----------

function adminShell(
  title,
  ...content
) {
  app.replaceChildren(
    adminHeader(title),
    adminDrawer(),

    h(
      'main',
      {
        id:
          'content',

        class:
          'admin-content'
      },
      ...content
    )
  );
}


function adminHeader(
  title
) {
  return h(
    'header',
    {
      class:
        'admin-header'
    },

    h(
      'button',
      {
        class:
          'icon-btn admin-menu-btn',

        type:
          'button',

        onclick: () => {
          menuOpen =
            !menuOpen;

          renderAdminPage();
        },

        title:
          'Menü'
      },
      '☰'
    ),

    h(
      'div',
      {
        class:
          'admin-header-title'
      },

      h(
        'div',
        {
          class:
            'eyebrow'
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
        class:
          'admin-header-actions'
      },

      state.selectedCustomerId
        ? h(
            'button',
            {
              class:
                'btn btn-secondary',

              type:
                'button',

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
        : null,

      h(
        'button',
        {
          class:
            'btn btn-secondary',

          type:
            'button',

          onclick:
            logout
        },
        'Abmelden'
      )
    )
  );
}


// ---------- Admin Drawer ----------

function adminDrawer() {
  if (!menuOpen) {
    return null;
  }

  const item = (
    key,
    label,
    icon
  ) =>
    h(
      'button',
      {
        class:
          'admin-nav-item' +
          (
            adminPage ===
            key
              ? ' active'
              : ''
          ),

        type:
          'button',

        onclick: () => {
          menuOpen =
            false;

          adminPage =
            key;

          if (
            key !==
              'customers' &&
            key !==
              'customer-detail' &&
            key !==
              'venture-detail' &&
            key !==
              'message-detail'
          ) {
            state.selectedCustomerId =
              null;

            state.venture =
              null;
          }

          renderAdminPage();
        }
      },

      h(
        'span',
        {
          class:
            'admin-nav-icon'
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
      class:
        'admin-drawer'
    },

    h(
      'div',
      {
        class:
          'admin-drawer-brand'
      },

      logo(),
      wordmark()
    ),

    h(
      'div',
      {
        class:
          'admin-nav'
      },

      h(
        'div',
        {
          class:
            'admin-nav-section'
        },
        'ADMIN'
      ),

      item(
        'overview',
        'Übersicht',
        '⌂'
      ),

      item(
        'admin-ai-chat',
        'KI-Geschäftspartner',
        '✦'
      ),

      item(
        'customers',
        'Kunden',
        '♙'
      ),

      item(
        'ventures',
        'Ventures',
        '◆'
      ),

      item(
        'tasks',
        'Aufgaben',
        '✓'
      ),

      item(
        'docs',
        'Dokumente',
        '▤'
      ),

      item(
        'messages',
        'Nachrichten',
        '✉'
      ),

      item(
        'activity',
        'Aktivitäten',
        '◌'
      ),

      item(
        'settings',
        'Einstellungen',
        '⚙'
      ),

      state.selectedCustomerId
        ? h(
            'div',
            {
              class:
                'admin-nav-section customer-nav-section'
            },

            'KUNDE',

            h(
              'button',
              {
                class:
                  'admin-nav-item customer-current',

                type:
                  'button',

                onclick: () => {
                  menuOpen =
                    false;

                  adminPage =
                    'customer-detail';

                  renderAdminPage();
                }
              },

              h(
                'span',
                {
                  class:
                    'admin-nav-icon'
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
          )
        : null
    )
  );
}
