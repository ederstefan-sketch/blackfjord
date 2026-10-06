// ---------- Admin: Kunden ----------

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

    state.customers = data || [];
  }

  const rows = state.customers.length
    ? h(
        'div',
        {
          class: 'admin-customer-list'
        },

        ...state.customers.map(
          customer =>
            h(
              'button',
              {
                class:
                  'admin-customer-row' +
                  (
                    state.selectedCustomerId === customer.id
                      ? ' selected'
                      : ''
                  ),

                type: 'button',

                onclick: () =>
                  openAdminCustomer(
                    customer.id
                  )
              },

              h(
                'div',
                {
                  class: 'admin-avatar'
                },
                initials(
                  customer.full_name ||
                  customer.company
                )
              ),

              h(
                'div',
                {
                  class: 'admin-customer-main'
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
                        class: 'muted'
                      },
                      customer.company
                    )
                  : null
              ),

              h(
                'span',
                {
                  class: 'admin-customer-arrow'
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
      'Kunden',
      'Kunden ausschließlich innerhalb des Admin Centers verwalten.',

      h(
        'div',
        {
          class: 'admin-toolbar'
        },

        h(
          'button',
          {
            class: 'btn btn-secondary',

            type: 'button',

            onclick: () => {
              adminPage = 'overview';
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


// ---------- Kunde öffnen ----------

async function openAdminCustomer(
  customerId
) {
  state.selectedCustomerId =
    customerId;

  state.venture = null;
  state.membership = null;
  state.ventures = [];

  adminPage =
    'customer-detail';

  renderAdminPage();
}


// ---------- Kunden-Detail ----------

async function renderAdminCustomerDetail() {
  const customer =
    (
      state.customers || []
    ).find(
      c =>
        c.id ===
        state.selectedCustomerId
    );

  if (!customer) {
    state.selectedCustomerId = null;
    adminPage = 'customers';

    return renderAdminPage();
  }

  const {
    data: ventures,
    error
  } = await sb
    .from('ventures')
    .select(
      'id,title,description,stage,progress,owner_id,created_at'
    )
    .eq(
      'owner_id',
      customer.id
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

  const rows =
    ventures?.length
      ? h(
          'div',
          {
            class: 'admin-venture-list'
          },

          ...ventures.map(
            venture =>
              h(
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

                  venture.stage
                    ? h(
                        'span',
                        {
                          class: 'muted'
                        },
                        venture.stage
                      )
                    : null
                ),

                h(
                  'div',
                  {
                    class:
                      'admin-venture-meta'
                  },

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
              )
          )
        )
      : adminEmpty(
          'Dieser Kunde hat noch kein Venture.',
          'Neues Venture',
          () =>
            newVenture()
        );

  adminShell(
    'Kunde',

    adminSection(
      customer.full_name ||
      customer.company ||
      'Kunde',

      customer.company || '',

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
              state.selectedCustomerId =
                null;

              adminPage =
                'customers';

              renderAdminPage();
            }
          },
          '← Kunden'
        ),

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
