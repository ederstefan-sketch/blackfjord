// ---------- Admin: Kunden ----------
// Ergänzt die bestehende Kundenverwaltung um das manuelle Einladen neuer Kunden.
// Die Einladung wird serverseitig über die Supabase Edge Function
// "venture-admin-invite" versendet. Der Service-Role-Key bleibt serverseitig.

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

  const emailInput = h('input', {
    type: 'email',
    name: 'invite_email',
    placeholder: 'kunde@beispiel.at',
    autocomplete: 'email',
    required: true,
    maxlength: 254,
    class: 'input'
  });

  const nameInput = h('input', {
    type: 'text',
    name: 'invite_full_name',
    placeholder: 'Vor- und Nachname',
    autocomplete: 'name',
    required: true,
    maxlength: 120,
    class: 'input'
  });

  const companyInput = h('input', {
    type: 'text',
    name: 'invite_company',
    placeholder: 'Unternehmen (optional)',
    autocomplete: 'organization',
    maxlength: 160,
    class: 'input'
  });

  const inviteStatus = h('p', {
    class: 'muted',
    role: 'status',
    'aria-live': 'polite'
  });

  const inviteButton = h(
    'button',
    {
      class: 'btn btn-primary',
      type: 'button',
      onclick: async () => {
        const email = String(emailInput.value || '').trim().toLowerCase();
        const fullName = String(nameInput.value || '').trim();
        const company = String(companyInput.value || '').trim();

        if (!email || !fullName) {
          inviteStatus.textContent =
            'Bitte E-Mail-Adresse und Kundennamen eingeben.';
          return;
        }

        inviteButton.disabled = true;
        inviteButton.textContent = 'Einladung wird gesendet …';
        inviteStatus.textContent = '';

        try {
          const { data, error } = await sb.functions.invoke(
            'venture-admin-invite',
            {
              body: {
                email,
                full_name: fullName,
                company
              }
            }
          );

          if (error || !data?.ok) {
            console.error(
              'Kundeneinladung fehlgeschlagen:',
              error || data
            );

            inviteStatus.textContent =
              data?.error ||
              error?.message ||
              'Einladung fehlgeschlagen. Bitte Einstellungen und E-Mail-Adresse prüfen.';

            inviteStatus.className = 'form-error';
            return;
          }

          inviteStatus.textContent =
            `Einladung an ${email} wurde versendet. Der Kunde kann über den persönlichen Link sein Konto einrichten.`;

          inviteStatus.className = 'form-success';

          emailInput.value = '';
          nameInput.value = '';
          companyInput.value = '';

          // Kundenliste beim nächsten Render neu laden.
          state.customers = null;
        } catch (err) {
          console.error(
            'Kundeneinladung fehlgeschlagen:',
            err
          );

          inviteStatus.textContent =
            'Einladung fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.';

          inviteStatus.className = 'form-error';
        } finally {
          inviteButton.disabled = false;
          inviteButton.textContent = 'Einladung senden';
        }
      }
    },
    'Einladung senden'
  );

  const invitePanel = h(
    'div',
    {
      class: 'admin-invite-panel'
    },
    h('h3', {}, 'Neuen Kunden einladen'),
    h(
      'p',
      {
        class: 'muted'
      },
      'Der Kunde erhält eine E-Mail mit einem persönlichen Einladungslink.'
    ),
    h(
      'div',
      {
        class: 'admin-invite-fields'
      },
      h(
        'label',
        {},
        h('span', {}, 'E-Mail-Adresse'),
        emailInput
      ),
      h(
        'label',
        {},
        h('span', {}, 'Name des Kunden'),
        nameInput
      ),
      h(
        'label',
        {},
        h('span', {}, 'Unternehmen (optional)'),
        companyInput
      )
    ),
    inviteButton,
    inviteStatus
  );

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
      invitePanel,
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
