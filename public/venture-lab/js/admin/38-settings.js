// ---------- Admin: Einstellungen ----------

async function loadUserSettings() {
  const { data, error } = await sb
    .from('profiles')
    .select('id,full_name,company')
    .eq('id', state.user.id)
    .maybeSingle();

  if (error) return fail(error);

  return data || {};
}


async function saveUserSettings(values) {
  const { error } = await sb
    .from('profiles')
    .update({
      full_name: values.full_name || null,
      company: values.company || null
    })
    .eq('id', state.user.id);

  if (error) {
    fail(error);
    return false;
  }

  state.profile = {
    ...(state.profile || {}),
    ...values
  };

  toast('Einstellungen gespeichert.');
  return true;
}


async function renderAdminSettings() {
  const settings = await loadUserSettings();

  if (!settings) return;

  const fullName = h(
    'input',
    {
      class: 'input',
      type: 'text',
      value: settings.full_name || '',
      placeholder: 'Name'
    }
  );

  const company = h(
    'input',
    {
      class: 'input',
      type: 'text',
      value: settings.company || '',
      placeholder: 'Unternehmen'
    }
  );

  const form = h(
    'div',
    { class: 'admin-card' },

    h(
      'label',
      {},
      'Name',
      fullName
    ),

    h(
      'label',
      { style: 'display:block;margin-top:16px' },
      'Unternehmen',
      company
    ),

    h(
      'button',
      {
        class: 'btn',
        type: 'button',
        style: 'margin-top:20px',
        onclick: async () => {
          await saveUserSettings({
            full_name: fullName.value.trim(),
            company: company.value.trim()
          });
        }
      },
      'Speichern'
    )
  );

  adminShell(
    'Einstellungen',
    adminSection(
      'Admin-Einstellungen',
      'Persönliche Angaben für das Venture Lab.',
      form
    )
  );
}
