
// ---------- Kunden-Portal ----------
// Diese Datei ist ausschließlich für
// Kunden gedacht.
//
// Admins werden bereits in 20-data.js
// direkt ins Admin Center geleitet.
// Das Kundenportal enthält deshalb
// keinerlei Admin-Navigation.

function customerLabel(c) {
  return (
    c?.full_name ||
    c?.company ||
    'Kunde'
  );
}


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
        class:
          'banner bad'
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
        class:
          'banner bad'
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
        class:
          'banner warn'
      },
      'Deine Testphase endet bald. Danach kannst du mit BASIC selbstständig oder mit FULL samt BLACKFJORD-Begleitung weitermachen. ',
      contact,
      '.'
    );
  }

  return null;
}


function renderPortal() {
  // Sicherheitsgurt:
  // Ein Admin darf niemals über
  // renderPortal() im Kundenportal landen.
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
            class: 'top-right'
          },

          h(
            'button',
            {
              class:
                'btn ghost sm',
              onclick: () =>
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
            class: 'muted'
          },
          'Sobald du ein BLACKFJORD-Paket gebucht hast, richten wir dein Venture Workspace ein.'
        )
      )
    );

    return;
  }

  const s =
    status();

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

  const top =
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

  const nav =
    h(
      'nav',
      {
        class: 'tabs',
        'aria-label':
          'Bereiche'
      },

      TABS.map(
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

  // Höhe für den Chat:
  // Rahmen abziehen.
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
