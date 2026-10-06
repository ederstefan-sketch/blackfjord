// ---------- Admin: Ventures ----------

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

  const ventures = data || [];

  const rows = ventures.length
    ? h(
        'div',
        {
          class: 'admin-venture-list'
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
                    class: 'muted'
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
                        class: 'badge'
                      },
                      venture.stage
                    )
                  : null,

                typeof venture.progress ===
                'number'
                  ? h(
                      'span',
                      {
                        class: 'muted'
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
          class: 'admin-toolbar'
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


// ---------- Venture öffnen ----------

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


// ---------- Venture Detail ----------

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

            type: 'button',

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

            type: 'button',

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

            type: 'button',

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
                  class: 'muted'
                },
                venture.description
              )
            : null,

          venture.stage
            ? h(
                'span',
                {
                  class: 'badge'
                },
                venture.stage
              )
            : null,

          typeof venture.progress ===
          'number'
            ? h(
                'p',
                {
                  class: 'muted'
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
                  class: 'muted'
                },
                owner.company
              )
            : null
        )
      )
    )
  );
}
