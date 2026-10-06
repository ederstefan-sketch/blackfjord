// ---------- Admin: Aktivitäten ----------

async function renderAdminActivity() {
  const { data: activities, error } = await sb
    .from('venture_activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return fail(error);

  const rows = activities?.length
    ? h(
        'div',
        { class: 'admin-activity-list' },
        ...activities.map(activity =>
          h(
            'div',
            { class: 'admin-activity-row' },

            h(
              'div',
              { class: 'admin-activity-icon' },
              '•'
            ),

            h(
              'div',
              { class: 'admin-activity-main' },

              h(
                'strong',
                {},
                activity.summary || activity.event_type || 'Aktivität'
              ),

              activity.event_type
                ? h(
                    'span',
                    { class: 'muted' },
                    activity.event_type
                  )
                : null,

              activity.venture_id
                ? h(
                    'span',
                    { class: 'muted' },
                    `Venture: ${activity.venture_id}`
                  )
                : null
            ),

            h(
              'div',
              { class: 'admin-activity-meta' },
              h(
                'span',
                { class: 'muted' },
                fmtT(activity.created_at)
              )
            )
          )
        )
      )
    : adminEmpty('Keine Aktivitäten vorhanden.');

  adminShell(
    'Aktivitäten',
    adminSection(
      'Aktivitätsverlauf',
      'Die letzten Aktivitäten im Venture Lab.',
      rows
    )
  );
}
