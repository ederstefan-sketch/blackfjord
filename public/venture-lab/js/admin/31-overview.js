// ---------- Admin Overview ----------

async function adminCounts() {
  const customers =
    state.customers?.length ||
    0;

  const {
    data: ventures
  } =
    await sb
      .from('ventures')
      .select('id');

  const ventureIds =
    (
      ventures ||
      []
    ).map(
      v => v.id
    );

  let tasks = [];
  let docs = [];
  let messages = [];

  if (
    ventureIds.length
  ) {
    const [
      tasksResult,
      docsResult,
      messagesResult
    ] =
      await Promise.all([
        sb
          .from('tasks')
          .select(
            'id,status'
          )
          .in(
            'venture_id',
            ventureIds
          ),

        sb
          .from('documents')
          .select(
            'id'
          )
          .in(
            'venture_id',
            ventureIds
          ),

        sb
          .from(
            'comm_messages'
          )
          .select(
            'id'
          )
          .in(
            'venture_id',
            ventureIds
          )
      ]);

    tasks =
      tasksResult.data ||
      [];

    docs =
      docsResult.data ||
      [];

    messages =
      messagesResult.data ||
      [];
  }

  const openTasks =
    tasks.filter(
      task => {
        const value =
          String(
            task.status ||
              ''
          ).toLowerCase();

        return ![
          'done',
          'completed',
          'closed'
        ].includes(
          value
        );
      }
    ).length;

  return {
    customers,

    ventures:
      ventures?.length ||
      0,

    tasks:
      openTasks,

    docs:
      docs.length,

    messages:
      messages.length
  };
}


async function renderAdminOverview() {
  const counts =
    await adminCounts();

  const stats =
    h(
      'div',
      {
        class:
          'admin-stats'
      },

      statCard(
        'Kunden',
        counts.customers,
        'Kundenkonten',
        () => {
          adminPage =
            'customers';

          renderAdminPage();
        }
      ),

      statCard(
        'Ventures',
        counts.ventures,
        'aktive / vorhandene Ventures',
        () => {
          adminPage =
            'ventures';

          renderAdminPage();
        }
      ),

      statCard(
        'Offene Aufgaben',
        counts.tasks,
        'noch nicht erledigt',
        () => {
          adminPage =
            'tasks';

          renderAdminPage();
        }
      ),

      statCard(
        'Dokumente',
        counts.docs,
        'im Workspace',
        () => {
          adminPage =
            'docs';

          renderAdminPage();
        }
      ),

      statCard(
        'Nachrichten',
        counts.messages,
        'Kommunikation',
        () => {
          adminPage =
            'messages';

          renderAdminPage();
        }
      )
    );

  const quickActions =
    h(
      'div',
      {
        class:
          'admin-quick-actions'
      },

      h(
        'button',
        {
          class:
            'admin-action-card',

          type:
            'button',

          onclick: () => {
            adminPage =
              'customers';

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
          'Kunden und deren Ventures im Admin Center verwalten.'
        )
      ),

      h(
        'button',
        {
          class:
            'admin-action-card',

          type:
            'button',

          onclick: () => {
            adminPage =
              'ventures';

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
          'Ventures zentral ansehen und verwalten.'
        )
      ),

      h(
        'button',
        {
          class:
            'admin-action-card',

          type:
            'button',

          onclick: () => {
            adminPage =
              'settings';

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
          'Admin-Einstellungen verwalten.'
        )
      )
    );

  adminShell(
    'Übersicht',

    h(
      'div',
      {
        class:
          'admin-page-intro'
      },

      h(
        'div',
        {},

        h(
          'p',
          {
            class:
              'eyebrow'
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
            class:
              'muted'
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
