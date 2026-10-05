
// ---------- Daten laden ----------
async function boot(user) {
  state.user = user;

  const { data: p } = await sb
    .from('profiles')
    .select('id,role,full_name,company')
    .eq('id', user.id)
    .maybeSingle();

  state.profile =
    p || {
      id: user.id,
      role: 'customer'
    };

  if (isAdmin()) {
    const {
      data: customers,
      error
    } = await sb
      .from('profiles')
      .select(
        'id,full_name,company,role'
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

    state.customers =
      customers || [];

    state.selectedCustomerId =
      null;

    state.venture = null;
    state.membership = null;
    state.threadId = undefined;

    // Admins starten immer direkt im
    // separaten Admin Center.
    if (
      typeof renderAdminPage ===
      'function'
    ) {
      return renderAdminPage();
    }

    return;
  }

  // ---------- Kunde ----------
  state.customers = [];

  state.selectedCustomerId =
    user.id;

  await loadCustomerContext();
}


async function loadCustomerContext() {
  state.venture = null;
  state.membership = null;
  state.threadId = undefined;

  if (!state.selectedCustomerId) {
    state.ventures = [];

    if (
      typeof renderPortal ===
      'function'
    ) {
      renderPortal();
    }

    return;
  }

  const {
    data: vs,
    error
  } = await sb
    .from('ventures')
    .select('*')
    .eq(
      'owner_id',
      state.selectedCustomerId
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

  state.ventures =
    vs || [];

  state.tab = 'chat';

  await selectVenture(
    state.ventures[0]?.id
  );
}


async function selectCustomer(id) {
  // Diese Funktion bleibt für
  // Admin-Datenoperationen verfügbar,
  // öffnet aber NICHT mehr das
  // Kundenportal.
  if (!isAdmin()) {
    return;
  }

  state.selectedCustomerId =
    id || null;

  state.venture = null;
  state.membership = null;
  state.threadId = undefined;

  if (
    typeof renderAdminPage ===
    'function'
  ) {
    renderAdminPage();
  }
}


async function selectVenture(id) {
  state.venture =
    state.ventures.find(
      v => v.id === id
    ) || null;

  state.threadId = undefined;
  state.membership = null;

  if (state.venture) {
    const {
      data,
      error
    } = await sb
      .from('memberships')
      .select('*')
      .eq(
        'venture_id',
        state.venture.id
      )
      .maybeSingle();

    if (error) {
      return fail(error);
    }

    state.membership =
      data;
  }

  // Kunden werden im Kundenportal
  // gerendert.
  if (!isAdmin()) {
    renderPortal();
  }
}


async function newVenture() {
  const title =
    await askText(
      'Neues Venture',
      'Wie heißt das Venture?'
    );

  if (!title) {
    return;
  }

  const payload = {
    title: title
  };

  // Nur Admin darf ein Venture
  // für einen anderen Kunden anlegen.
  if (isAdmin()) {
    if (
      !state.selectedCustomerId
    ) {
      return fail(
        new Error(
          'Bitte zuerst einen Kunden auswählen.'
        )
      );
    }

    payload.owner_id =
      state.selectedCustomerId;
  }

  const {
    data,
    error
  } = await sb
    .from('ventures')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return fail(error);
  }

  state.ventures =
    state.ventures || [];

  state.ventures.unshift(
    data
  );

  if (isAdmin()) {
    // Nach dem Anlegen bleibt der
    // Admin im Admin Center.
    state.venture = data;

    if (
      typeof renderAdminPage ===
      'function'
    ) {
      adminPage =
        'ventures';

      renderAdminPage();
    }

    return;
  }

  await selectVenture(
    data.id
  );
}
