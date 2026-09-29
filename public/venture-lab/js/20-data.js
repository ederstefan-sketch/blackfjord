// ---------- Daten laden ----------
  async function boot(user) {
    state.user = user;
    const { data: p } = await sb.from('profiles').select('id,role,full_name,company').eq('id', user.id).maybeSingle();
    state.profile = p || { id: user.id, role: 'customer' };
    if (isAdmin()) {
      const { data: customers, error } = await sb.from('profiles').select('id,full_name,company,role').eq('role', 'customer').order('full_name', { ascending: true });
      if (error) return fail(error);
      state.customers = customers || [];
      state.selectedCustomerId = null;
      await loadCustomerContext();
    } else {
      state.customers = [];
      state.selectedCustomerId = user.id;
      await loadCustomerContext();
    }
  }

  async function loadCustomerContext() {
    state.venture = null; state.membership = null; state.threadId = undefined;
    if (!state.selectedCustomerId) {
      state.ventures = [];
      renderPortal();
      return;
    }
    const { data: vs, error } = await sb.from('ventures').select('*').eq('owner_id', state.selectedCustomerId).order('created_at', { ascending: false });
    if (error) return fail(error);
    state.ventures = vs || [];
    state.tab = 'chat';
    await selectVenture(state.ventures[0]?.id);
  }

  async function selectCustomer(id) {
    if (!isAdmin()) return;
    state.selectedCustomerId = id || null;
    await loadCustomerContext();
  }
  async function selectVenture(id) {
    state.venture = state.ventures.find((v) => v.id === id) || null;
    state.threadId = undefined; state.membership = null;
    if (state.venture) {
      const { data } = await sb.from('portal_memberships').select('*').eq('venture_id', state.venture.id).maybeSingle();
      state.membership = data;
    }
    renderPortal();
  }
  async function newVenture() {
    const title = prompt('Wie heißt das Venture?');
    if (!title || !title.trim()) return;
    const payload = { title: title.trim() };
    // Kunden dürfen owner_id nicht selbst setzen; die DB setzt auth.uid() als Default.
    if (isAdmin()) {
      if (!state.selectedCustomerId) return fail(new Error('Bitte zuerst einen Kunden auswählen.'));
      payload.owner_id = state.selectedCustomerId;
    }
    const { data, error } = await sb.from('ventures').insert(payload).select().single();
    if (error) return fail(error);
    state.ventures.unshift(data);
    await selectVenture(data.id);
  }
