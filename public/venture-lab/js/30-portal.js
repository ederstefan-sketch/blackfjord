
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
