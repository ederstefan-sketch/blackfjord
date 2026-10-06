// ---------- Admin: Aufgaben ----------

async function renderAdminTasks() {
  const {
    data: ventures,
    error: ventureError
  } = await sb
    .from('ventures')
    .select('id,title,owner_id')
    .order('created_at', {
      ascending: false
    });

  if (ventureError) {
    return fail(ventureError);
  }

  const ventureIds =
    (ventures || []).map(
      v => v.id
    );

  let tasks = [];

  if (ventureIds.length) {
    const {
      data,
      error
    } = await sb
      .from('tasks')
      .select(
        'id,venture_id,title,phase,status,due_date,assigned_to,created_at'
      )
      .in(
        'venture_id',
        ventureIds
      )
      .order('created_at', {
        ascending: false
      });

    if (error) {
      return fail(error);
    }

    tasks = data || [];
  }

  const rows =
    tasks.length
      ? h(
          'div',
          {
            class:
              'admin-task-list'
          },

          ...tasks.map(
            task => {
              const venture =
                ventures.find(
                  v =>
                    v.id ===
                    task.venture_id
                );

              const owner =
                state.customers.find(
                  c =>
                    c.id ===
                    venture?.owner_id
                );

              return h(
                'div',
                {
                  class:
                    'admin-task-row'
                },

                h(
                  'button',
                  {
                    class:
                      'btn btn-danger sm',

                    type:
                      'button',

                    title:
                      'Aufgabe löschen',

                    onclick: () =>
                      deleteAdminTask(
                        task
                      )
                  },
                  '×'
                ),

                h(
                  'div',
                  {
                    class:
                      'admin-task-main'
                  },

                  h(
                    'strong',
                    {},
                    task.title ||
                      'Aufgabe'
                  ),

                  h(
                    'span',
                    {
                      class:
                        'muted'
                    },
                    venture?.title ||
                      'Venture unbekannt'
                  ),

                  h(
                    'span',
                    {
                      class:
                        'muted'
                    },
                    owner?.full_name ||
                      owner?.company ||
                      ''
                  )
                ),

                h(
                  'div',
                  {
                    class:
                      'admin-task-meta'
                  },

                  task.status
                    ? h(
                        'span',
                        {
                          class:
                            'badge'
                        },
                        task.status
                      )
                    : null,

                  task.due_date
                    ? h(
                        'span',
                        {
                          class:
                            'muted'
                        },
                        task.due_date
                      )
                    : null
                )
              );
            }
          )
        )
      : adminEmpty(
          'Keine Aufgaben vorhanden.'
        );

  adminShell(
    'Aufgaben',

    adminSection(
      'Aufgabenübersicht',
      'Aufgaben aus den Kunden-Workspaces.',

      rows
    )
  );
}
