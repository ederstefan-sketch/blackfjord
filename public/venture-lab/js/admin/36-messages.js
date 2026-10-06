// ---------- Admin: Nachrichten ----------

async function renderAdminMessages() {
  const { data: ventures, error: ventureError } = await sb
    .from('ventures')
    .select('id,title,owner_id');

  if (ventureError) return fail(ventureError);

  const ids = (ventures || []).map(v => v.id);
  let messages = [];

  if (ids.length) {
    const { data, error } = await sb
      .from('comm_messages')
      .select('id,venture_id,sender_id,body,created_at')
      .in('venture_id', ids)
      .order('created_at', { ascending: false });

    if (error) return fail(error);
    messages = data || [];
  }

  const rows = messages.length
    ? h(
        'div',
        { class: 'admin-message-list' },

        ...messages.map(message => {
          const venture = ventures.find(
            v => v.id === message.venture_id
          );

          const owner = state.customers.find(
            c => c.id === venture?.owner_id
          );

          const senderIsAdmin =
            message.sender_id === state.user?.id;

          return h(
            'div',
            {
              class: 'admin-message-row',
              onclick: () =>
                openAdminMessage(message, venture)
            },

            h(
              'div',
              { class: 'admin-message-main' },

              h(
                'strong',
                {},
                senderIsAdmin
                  ? 'BLACKFJORD'
                  : 'Kunde'
              ),

              h(
                'span',
                { class: 'muted' },
                venture?.title ||
                  'Venture unbekannt'
              ),

              h(
                'span',
                { class: 'muted' },
                owner?.full_name ||
                  owner?.company ||
                  ''
              ),

              h(
                'span',
                { class: 'muted' },
                message.body
                  ? message.body.slice(0, 120)
                  : ''
              )
            ),

            h(
              'div',
              { class: 'admin-message-meta' },

              h(
                'span',
                { class: 'muted' },
                fmtT(message.created_at)
              )
            )
          );
        })
      )
    : adminEmpty(
        'Keine Nachrichten vorhanden.'
      );

  adminShell(
    'Nachrichten',

    adminSection(
      'Nachrichtenübersicht',
      'Nachrichten aus allen Kunden-Workspaces.',

      rows
    )
  );
}


function openAdminMessage(
  message,
  venture
) {
  state.adminMessage = message;
  state.adminMessageVenture = venture;

  adminPage =
    'message-detail';

  renderAdminPage();
}


function renderAdminMessageDetail() {
  const message =
    state.adminMessage;

  const venture =
    state.adminMessageVenture;

  if (!message) {
    adminPage = 'messages';
    return renderAdminPage();
  }

  const owner =
    state.customers.find(
      c =>
        c.id ===
        venture?.owner_id
    );

  const content = h(
    'div',
    {
      class:
        'admin-detail'
    },

    h(
      'div',
      {
        class:
          'admin-detail-head'
      },

      h(
        'div',
        {},

        h(
          'h2',
          {},
          'Nachricht'
        ),

        h(
          'div',
          {
            class:
              'muted'
          },
          venture?.title ||
            'Venture unbekannt'
        )
      ),

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
        '← Zurück'
      )
    ),

    h(
      'div',
      {
        class:
          'admin-card'
      },

      h(
        'div',
        {
          class:
            'muted'
        },
        owner?.full_name ||
          owner?.company ||
          'Kunde unbekannt'
      ),

      h(
        'div',
        {
          class:
            'muted'
        },
        fmtT(
          message.created_at
        )
      ),

      h(
        'div',
        {
          style:
            'margin-top:18px;white-space:pre-wrap;line-height:1.6'
        },
        message.body || ''
      )
    ),

    h(
      'div',
      {
        style:
          'display:flex;gap:10px;margin-top:16px'
      },

      h(
        'button',
        {
          class:
            'btn btn-danger',

          type:
            'button',

          onclick: async () => {
            await deleteAdminMessage(
              message
            );
          }
        },
        'Löschen'
      )
    )
  );

  adminShell(
    'Nachricht',
    content
  );
}
