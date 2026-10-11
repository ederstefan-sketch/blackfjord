
/* =========================================================
   BLACKFJORD VENTURE LAB — COCKPIT
   Verwendet die bestehenden Tabellen ventures und tasks.
   ========================================================= */

async function renderAdminOverview() {
  adminShell(
    'Cockpit',
    h('div', {
      class: 'admin-cockpit-loading muted'
    }, 'Cockpit wird geladen …')
  );

  const appContent = document.getElementById('content');

  try {
    const [ventureResult, customerResult] = await Promise.all([
      sb
        .from('ventures')
        .select('id,title,owner_id,created_at')
        .order('created_at', { ascending: false }),

      sb.from('profiles').select('id').eq('role', 'customer')
    ]);

    if (ventureResult.error) throw ventureResult.error;

    const ventures = ventureResult.data || [];
    const customers = customerResult.data || [];
    const ventureIds = ventures.map(v => v.id);

    let tasks = [];
    let docs = [];
    let messages = [];

    if (ventureIds.length) {
      const [taskResult, docResult, messageResult] = await Promise.all([
        sb
          .from('tasks')
          .select('id,venture_id,title,phase,status,due_date,assigned_to,created_at')
          .in('venture_id', ventureIds)
          .order('created_at', { ascending: false }),

        sb
          .from('documents')
          .select('id')
          .in('venture_id', ventureIds),

        sb
          .from('comm_messages')
          .select('id')
          .in('venture_id', ventureIds)
      ]);

      if (taskResult.error) throw taskResult.error;

      tasks = taskResult.data || [];
      docs = docResult.data || [];
      messages = messageResult.data || [];
    }

    const completedStatuses = [
      'done',
      'completed',
      'complete',
      'closed',
      'erledigt',
      'abgeschlossen'
    ];

    const isOpen = task =>
      !completedStatuses.includes(
        String(task.status || '').trim().toLowerCase()
      );

    const openTasks = tasks.filter(isOpen);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = openTasks.filter(task => {
      if (!task.due_date) return false;

      const dueDate = new Date(`${task.due_date}T00:00:00`);
      return !Number.isNaN(dueDate.getTime()) && dueDate < today;
    });

    const getVenture = id =>
      ventures.find(venture => venture.id === id);

    const goTo = page => {
      adminPage = page;
      renderAdminPage();
    };

    const stat = (label, value, detail, page) =>
      statCard(label, value, detail, () => goTo(page));

    const stats = h(
      'div',
      { class: 'admin-stats' },

      stat('Ventures', ventures.length, 'Alle vorhandenen Ventures', 'ventures'),
      stat('Offene Aufgaben', openTasks.length, 'Noch nicht erledigt', 'tasks'),
      stat('Überfällig', overdueTasks.length, 'Aufgaben mit überschrittenem Termin', 'tasks'),
      stat('Kunden', customers.length, 'Kundenkonten', 'customers'),
      stat('Dokumente', docs.length, 'Im Workspace', 'docs'),
      stat('Nachrichten', messages.length, 'Kommunikation', 'messages')
    );

    const taskRows = list =>
      list.length
        ? h(
            'div',
            { class: 'admin-task-list' },
            ...list.slice(0, 8).map(task => {
              const venture = getVenture(task.venture_id);
              const overdue = overdueTasks.some(item => item.id === task.id);

              return h(
                'div',
                { class: 'admin-task-row' },

                h(
                  'div',
                  { class: 'admin-task-main' },
                  h('strong', {}, task.title || 'Aufgabe ohne Titel'),
                  h(
                    'div',
                    { class: 'admin-task-meta' },
                    venture?.title || 'Venture nicht zugeordnet'
                  )
                ),

                h(
                  'div',
                  { class: 'admin-task-meta' },
                  task.due_date
                    ? h(
                        'span',
                        { class: overdue ? 'badge bad' : 'badge' },
                        overdue ? `Überfällig · ${task.due_date}` : task.due_date
                      )
                    : h('span', { class: 'muted' }, 'Kein Termin')
                )
              );
            })
          )
        : adminEmpty('Keine passenden Aufgaben vorhanden.');

    const ventureRows = ventures.length
      ? h(
          'div',
          { class: 'admin-venture-list' },
          ...ventures.slice(0, 8).map(venture => {
            const count = openTasks.filter(
              task => task.venture_id === venture.id
            ).length;

            return h(
              'div',
              { class: 'admin-venture-row' },

              h(
                'div',
                { class: 'admin-venture-main' },
                h('strong', {}, venture.title || 'Venture ohne Titel'),
                h(
                  'div',
                  { class: 'admin-venture-meta' },
                  `${count} offene ${count === 1 ? 'Aufgabe' : 'Aufgaben'}`
                )
              ),

              h(
                'button',
                {
                  class: 'btn btn-secondary sm',
                  type: 'button',
                  onclick: () => goTo('ventures')
                },
                'Öffnen'
              )
            );
          })
        )
      : adminEmpty('Noch keine Ventures angelegt.');

    const quickActions = h(
      'div',
      { class: 'admin-quick-actions' },

      h(
        'button',
        {
          class: 'admin-action-card',
          type: 'button',
          onclick: () => goTo('admin-ai-chat')
        },
        h('strong', {}, 'KI-Geschäftspartner'),
        h('span', {}, 'Prioritäten klären, Entscheidungen vorbereiten und nächste Schritte besprechen.')
      ),

      h(
        'button',
        {
          class: 'admin-action-card',
          type: 'button',
          onclick: () => goTo('tasks')
        },
        h('strong', {}, 'Aufgaben bearbeiten'),
        h('span', {}, 'Offene Punkte prüfen und die nächsten Schritte festlegen.')
      ),

      h(
        'button',
        {
          class: 'admin-action-card',
          type: 'button',
          onclick: () => goTo('ventures')
        },
        h('strong', {}, 'Ventures verwalten'),
        h('span', {}, 'Alle Projekte und ihre offenen Aufgaben im Überblick.')
      ),

      h(
        'button',
        {
          class: 'admin-action-card',
          type: 'button',
          onclick: () => goTo('customers')
        },
        h('strong', {}, 'Kunden verwalten'),
        h('span', {}, 'Kundenkonten und zugehörige Ventures öffnen.')
      )
    );

    const attention = overdueTasks.length
      ? h(
          'div',
          { class: 'admin-cockpit-alert' },
          h('strong', {}, `${overdueTasks.length} überfällige ${overdueTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'}`),
          h('p', {}, 'Diese Punkte zuerst prüfen und Termine oder nächste Schritte aktualisieren.')
        )
      : h(
          'div',
          { class: 'admin-cockpit-ok' },
          h('strong', {}, 'Keine überfälligen Aufgaben erkannt'),
          h('p', {}, 'Laut den hinterlegten Fälligkeitsterminen sind derzeit keine offenen Aufgaben überfällig.')
        );

    adminShell(
      'Cockpit',

      h(
        'section',
        { class: 'admin-cockpit-intro' },
        h('p', { class: 'eyebrow' }, 'BLACKFJORD VENTURE LAB'),
        h('h2', {}, 'Dein Unternehmens-Cockpit'),
        h('p', { class: 'muted' }, 'Ventures, Aufgaben und nächste Schritte zentral im Blick.')
      ),

      stats,

      adminSection(
        'Jetzt im Blick',
        'Prioritäten aus deinen bestehenden Aufgaben.',
        attention
      ),

      adminSection(
        'Überfällige Aufgaben',
        'Aufgaben mit einem Fälligkeitsdatum vor heute.',
        taskRows(overdueTasks)
      ),

      adminSection(
        'Offene Aufgaben',
        'Die zuletzt angelegten, noch nicht erledigten Aufgaben.',
        taskRows(openTasks)
      ),

      adminSection(
        'Deine Ventures',
        'Projekte und offene Aufgaben auf einen Blick.',
        ventureRows
      ),

      adminSection(
        'Schnellzugriff',
        'Direkt zu den wichtigsten Arbeitsbereichen.',
        quickActions
      ),

      h(
        'div',
        { class: 'admin-cockpit-footer muted' },
        `Zuletzt geladen: ${new Date().toLocaleString('de-AT')}`
      )
    );
  } catch (error) {
    console.error('BLACKFJORD Cockpit:', error);

    if (appContent && document.getElementById('content') === appContent) {
      appContent.replaceChildren(
        h(
          'div',
          { class: 'admin-detail' },
          h('h2', {}, 'Cockpit konnte nicht geladen werden'),
          h(
            'p',
            { class: 'muted' },
            'Bitte prüfe die Datenbankberechtigungen und die Tabellenstruktur.'
          ),
          h('p', { class: 'err' }, error?.message || String(error)),
          h(
            'button',
            {
              class: 'btn btn-secondary',
              type: 'button',
              onclick: () => renderAdminOverview()
            },
            'Erneut versuchen'
          )
        )
      );
    }
  }
}
