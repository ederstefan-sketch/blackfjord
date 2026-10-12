
/* BLACKFJORD Venture Lab — integriertes CRM
 * Bestehende Tabellen:
 * portal_contacts, venture_contacts, ventures
 *
 * Portalzugang wird NICHT automatisch angelegt.
 * Einladungen erfolgen ausschließlich manuell über den Einladungsbutton.
 */

(() => {
  const stages = [
    ['new', 'Neuer Kontakt'],
    ['contacted', 'Kontaktiert'],
    ['meeting', 'Erstgespräch'],
    ['offer', 'Angebot'],
    ['follow_up', 'Nachfassen'],
    ['won', 'Gewonnen'],
    ['lost', 'Verloren']
  ];

  const packages = ['Noch offen', 'Start', 'Build', 'Grow', 'Full'];

  let contacts = [];
  let ventures = [];
  let links = [];
  let query = '';
  let editing = null;
  let saving = false;
  let inviting = false;

  const field = (label, control) =>
    h('label', {},
      h('span', {}, label),
      control
    );

  const input = (type, placeholder, value = '') => {
    const el = h('input', {
      type,
      placeholder,
      class: 'input'
    });

    el.value = value || '';
    return el;
  };

  const select = (options, value) => {
    const el = h('select', { class: 'input' },
      ...options.map(([v, label]) =>
        h('option', { value: v }, label)
      )
    );

    el.value = value || options[0]?.[0] || '';
    return el;
  };

  const getMetadata = contact => {
    const metadata = contact?.metadata;

    if (!metadata) return {};

    if (typeof metadata === 'object' && !Array.isArray(metadata)) {
      return metadata;
    }

    if (typeof metadata === 'string') {
      try {
        const parsed = JSON.parse(metadata);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }

    return {};
  };

  const stageName = value =>
    stages.find(item => item[0] === value)?.[1] || 'Neuer Kontakt';

  function contactName(contact) {
    return contact?.display_name ||
      [contact?.first_name, contact?.last_name]
        .filter(Boolean)
        .join(' ') ||
      contact?.company_name ||
      '';
  }

  function inviteStatusLabel(contact) {
    const meta = getMetadata(contact);

    if (meta.portal_invite_status === 'sent') {
      return 'Einladung versendet';
    }

    return 'Kein Portalzugang eingerichtet';
  }

  async function loadCRM() {
    const [contactResult, ventureResult, linkResult] =
      await Promise.all([
        sb.from('portal_contacts')
          .select(
            'id,contact_type,first_name,last_name,display_name,' +
            'company_name,email,phone,notes,metadata,created_at'
          )
          .order('updated_at', { ascending: false }),

        sb.from('ventures')
          .select('id,title,owner_id')
          .order('created_at', { ascending: false }),

        sb.from('venture_contacts')
          .select('venture_id,contact_id,relationship,is_primary')
      ]);

    if (contactResult.error) throw contactResult.error;
    if (ventureResult.error) throw ventureResult.error;
    if (linkResult.error) throw linkResult.error;

    contacts = contactResult.data || [];
    ventures = ventureResult.data || [];
    links = linkResult.data || [];
  }

  function linkedVentureNames(contactId) {
    return links
      .filter(link => link.contact_id === contactId)
      .map(link =>
        ventures.find(v => v.id === link.venture_id)?.title
      )
      .filter(Boolean);
  }

  /*
   * PORTALEINLADUNG
   *
   * Nutzt die bestehende Supabase Edge Function:
   * venture-admin-invite
   *
   * Diese Funktion muss weiterhin serverseitig prüfen,
   * ob der angemeldete Benutzer Administrator ist.
   */
  async function sendPortalInvite(contact) {
    if (inviting) return;

    const email = String(contact?.email || '')
      .trim()
      .toLowerCase();

    const name = contactName(contact);
    const meta = getMetadata(contact);

    if (!contact?.id) {
      toast('Bitte zuerst den Kontakt speichern.', 'error');
      return;
    }

    if (!email) {
      toast('Bitte zuerst eine E-Mail-Adresse speichern.', 'error');
      return;
    }

    if (!name) {
      toast('Bitte zuerst einen Kontaktnamen speichern.', 'error');
      return;
    }

    if (meta.portal_invite_status === 'sent') {
      const resend = window.confirm(
        'Für diesen Kontakt wurde bereits eine Einladung ' +
        'als versendet markiert.\n\n' +
        'Möchtest du erneut versuchen, eine Einladung zu senden?'
      );

      if (!resend) return;
    }

    const confirmed = window.confirm(
      `Portalzugang für ${name} einrichten?\n\n` +
      `Die Einladungs-E-Mail wird an ${email} gesendet.\n\n` +
      'Der Zugang wird erst durch den vorgesehenen ' +
      'Registrierungs- bzw. Bestätigungsprozess nutzbar.\n\n' +
      'Möchtest du fortfahren?'
    );

    if (!confirmed) return;

    inviting = true;

    try {
      const { data, error } = await sb.functions.invoke(
        'venture-admin-invite',
        {
          body: {
            email,
            full_name: name,
            company: contact.company_name || ''
          }
        }
      );

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(
          data?.error ||
          'Die Einladung konnte nicht versendet werden.'
        );
      }

      /*
       * Versandstatus beim CRM-Kontakt speichern.
       * Dies ist ein Versandstatus und kein Nachweis,
       * dass die eingeladene Person den Zugang aktiviert hat.
       */
      const updatedMetadata = {
        ...meta,
        portal_invite_status: 'sent',
        portal_invited_at: new Date().toISOString(),
        portal_invite_email: email
      };

      const { error: updateError } = await sb
        .from('portal_contacts')
        .update({ metadata: updatedMetadata })
        .eq('id', contact.id);

      if (updateError) {
        console.error(
          'Einladung versendet, Status nicht gespeichert:',
          updateError
        );

        toast(
          'Einladung wurde versendet, aber der Status konnte ' +
          'nicht gespeichert werden. Bitte den Kontakt prüfen.',
          'error'
        );

        await loadCRM();
        await renderCRM();
        return;
      }

      await loadCRM();
      await renderCRM();

      toast(`Einladung an ${email} wurde versendet.`, 'ok');

    } catch (error) {
      console.error(
        'BLACKFJORD Portal-Einladung fehlgeschlagen:',
        error
      );

      toast(
        error?.message ||
        'Portal-Einladung fehlgeschlagen.',
        'error'
      );

    } finally {
      inviting = false;
    }
  }

  function renderContactRows() {
    const filtered = contacts.filter(contact => {
      const meta = getMetadata(contact);

      const haystack = [
        contact.display_name,
        contact.first_name,
        contact.last_name,
        contact.company_name,
        contact.email,
        contact.phone,
        contact.notes,
        meta.pipeline_stage,
        meta.package,
        meta.follow_up_date,
        meta.portal_invite_status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query.toLowerCase());
    });

    if (!filtered.length) {
      return adminEmpty(
        query
          ? 'Keine Kontakte zu dieser Suche gefunden.'
          : 'Noch keine CRM-Kontakte vorhanden. ' +
            'Lege rechts den ersten Kontakt an.'
      );
    }

    return h('div', { class: 'admin-customer-list' },
      ...filtered.map(contact => {
        const meta = getMetadata(contact);
        const name = contactName(contact) || 'Kontakt ohne Namen';
        const ventureNames = linkedVentureNames(contact.id);

        const inviteButton = h('button', {
          class: 'btn btn-primary sm',
          type: 'button',
          disabled: !contact.email || inviting,
          onclick: () => sendPortalInvite(contact)
        },
          meta.portal_invite_status === 'sent'
            ? 'Erneut einladen'
            : 'Portalzugang einrichten'
        );

        return h('article', {
          class: 'admin-customer-row',
          style: 'cursor:default'
        },
          h('div', { class: 'admin-avatar' },
            initials(name)
          ),

          h('div', { class: 'admin-customer-main' },
            h('strong', {}, name),

            h('span', { class: 'muted' },
              [
                contact.company_name,
                contact.email,
                contact.phone
              ].filter(Boolean).join(' · ')
            ),

            h('div', { class: 'admin-task-meta' },
              h('span', { class: 'badge' },
                stageName(meta.pipeline_stage)
              ),

              h('span', { class: 'badge' },
                meta.package || 'Noch offen'
              ),

              h('span', { class: 'muted' },
                ventureNames.length
                  ? 'Ventures: ' + ventureNames.join(', ')
                  : 'Keinem Venture zugeordnet'
              ),

              meta.follow_up_date
                ? h('span', { class: 'muted' },
                    'Wiedervorlage: ' + meta.follow_up_date
                  )
                : null
            ),

            h('p', {
              class: 'muted',
              style: 'font-size:12px;margin:6px 0 0'
            }, inviteStatusLabel(contact)),

            meta.portal_invited_at
              ? h('p', {
                  class: 'muted',
                  style: 'font-size:12px;margin:2px 0 0'
                },
                  'Einladungsdatum: ' +
                  new Date(meta.portal_invited_at).toLocaleString(
                    'de-AT'
                  )
                )
              : null
          ),

          h('div', {
            class: 'addrow',
            style: 'gap:8px;flex-wrap:wrap'
          },
            h('button', {
              class: 'btn btn-secondary sm',
              type: 'button',
              onclick: () => {
                editing = contact;
                renderCRM();
              }
            }, 'Bearbeiten'),

            inviteButton
          )
        );
      })
    );
  }

  function renderContactForm() {
    const contact = editing || {};
    const meta = getMetadata(contact);

    const name = input(
      'text',
      'Vor- und Nachname / Kontaktname',
      contact.display_name || ''
    );

    const company = input(
      'text',
      'Unternehmen',
      contact.company_name || ''
    );

    const email = input(
      'email',
      'name@unternehmen.at',
      contact.email || ''
    );

    const phone = input(
      'tel',
      '+43 …',
      contact.phone || ''
    );

    const stage = select(
      stages,
      meta.pipeline_stage || 'new'
    );

    const pack = select(
      packages.map(item => [item, item]),
      meta.package || 'Noch offen'
    );

    const followUp = input(
      'date',
      '',
      meta.follow_up_date || ''
    );

    const currentLink = links.find(
      link => link.contact_id === contact.id
    );

    const venture = select(
      [
        ['', 'Kein Venture zuordnen'],
        ...ventures.map(v => [v.id, v.title || 'Venture'])
      ],
      currentLink?.venture_id || ''
    );

    const notes = h('textarea', {
      rows: '4',
      placeholder: 'Interne Gesprächsnotizen und nächste Schritte'
    });

    notes.value = contact.notes || '';

    const status = h('p', {
      class: 'muted',
      role: 'status',
      'aria-live': 'polite'
    });

    const saveButton = h('button', {
      class: 'btn btn-primary',
      type: 'button',

      onclick: async () => {
        if (saving) return;

        const displayName = name.value.trim();

        if (!displayName) {
          status.textContent = 'Bitte einen Namen eingeben.';
          name.focus();
          return;
        }

        saving = true;
        saveButton.disabled = true;
        saveButton.textContent = 'Wird gespeichert …';
        status.textContent = '';

        try {
          const payload = {
            contact_type: company.value.trim()
              ? 'organization'
              : 'person',

            display_name: displayName,
            company_name: company.value.trim() || null,
            email: email.value.trim() || null,
            phone: phone.value.trim() || null,
            notes: notes.value.trim() || null,
            visibility: 'internal',

            metadata: {
              ...meta,
              pipeline_stage: stage.value,
              package: pack.value,
              follow_up_date: followUp.value || null
            }
          };

          let saved;

          if (contact.id) {
            const result = await sb
              .from('portal_contacts')
              .update(payload)
              .eq('id', contact.id)
              .select(
                'id,contact_type,first_name,last_name,display_name,' +
                'company_name,email,phone,notes,metadata,created_at'
              )
              .single();

            if (result.error) throw result.error;
            saved = result.data;

          } else {
            payload.created_by = state.user.id;

            const result = await sb
              .from('portal_contacts')
              .insert(payload)
              .select(
                'id,contact_type,first_name,last_name,display_name,' +
                'company_name,email,phone,notes,metadata,created_at'
              )
              .single();

            if (result.error) throw result.error;
            saved = result.data;
          }

          /*
           * Eine gewählte Venture-Zuordnung ergänzen.
           * Andere bestehende Zuordnungen bleiben erhalten.
           */
          if (
            venture.value &&
            !links.some(link =>
              link.contact_id === saved.id &&
              link.venture_id === venture.value
            )
          ) {
            const linkResult = await sb
              .from('venture_contacts')
              .insert({
                venture_id: venture.value,
                contact_id: saved.id,
                relationship: 'contact',
                is_primary: true,
                metadata: {}
              });

            if (linkResult.error) throw linkResult.error;
          }

          editing = null;

          await loadCRM();
          await renderCRM();

          toast('Kontakt gespeichert.', 'ok');

        } catch (error) {
          console.error('BLACKFJORD CRM:', error);

          status.textContent =
            error?.message ||
            'Kontakt konnte nicht gespeichert werden.';

          status.className = 'form-error';

        } finally {
          saving = false;
          saveButton.disabled = false;
          saveButton.textContent = 'Kontakt speichern';
        }
      }
    }, 'Kontakt speichern');

    return adminSection(
      editing ? 'Kontakt bearbeiten' : 'Neuen Kontakt anlegen',

      'Kontaktdaten, Vertriebsstatus und Wiedervorlage an einem Ort.',

      field('Name / Kontakt', name),
      field('Unternehmen', company),
      field('E-Mail', email),
      field('Telefon', phone),
      field('Vertriebsstatus', stage),
      field('BLACKFJORD-Paket', pack),
      field('Wiedervorlage', followUp),
      field('Zugehöriges Venture', venture),
      field('Interne Notizen', notes),

      h('div', { class: 'addrow' },
        saveButton,

        editing
          ? h('button', {
              class: 'btn btn-secondary',
              type: 'button',
              onclick: () => {
                editing = null;
                renderCRM();
              }
            }, 'Abbrechen')
          : null
      ),

      status
    );
  }

  async function renderCRM() {
    if (!isAdmin()) return;

    const search = input(
      'search',
      'Name, Firma, E-Mail oder Status suchen',
      query
    );

    search.setAttribute(
      'aria-label',
      'CRM-Kontakte suchen'
    );

    const rowsContainer = h(
      'div',
      { id: 'crm-contact-rows' },
      renderContactRows()
    );

    search.addEventListener('input', () => {
      query = search.value;
      rowsContainer.replaceChildren(renderContactRows());
    });

    adminShell(
      'CRM & Kunden',

      h('section', {
        class: 'admin-cockpit-intro'
      },
        h('p', { class: 'eyebrow' },
          'BLACKFJORD VENTURE LAB'
        ),

        h('h2', {}, 'CRM & Kunden'),

        h('p', { class: 'muted' },
          'Kontakte, Vertrieb, BLACKFJORD-Pakete und ' +
          'Wiedervorlagen zentral im Venture Lab.'
        )
      ),

      h('div', { class: 'settings-grid' },

        h('div', {},
          adminSection(
            'Kontaktbestand',
            'Kontakte suchen und bearbeiten.',

            h('div', { class: 'admin-toolbar' },
              search,

              h('span', { class: 'muted' },
                contacts.length + ' Kontakte'
              )
            ),

            rowsContainer
          )
        ),

        h('div', {},
          renderContactForm()
        )
      )
    );
  }

  /*
   * Der vorhandene Menüpunkt „Kunden“ öffnet das CRM.
   * Der normale Speichervorgang versendet keine Einladung.
   */
  window.renderAdminCustomers = async function () {
    if (!isAdmin()) return;

    try {
      await loadCRM();
      await renderCRM();

    } catch (error) {
      console.error(
        'BLACKFJORD CRM konnte nicht geladen werden:',
        error
      );

      adminShell(
        'CRM & Kunden',

        adminSection(
          'CRM konnte nicht geladen werden',

          'Bitte die vorhandenen Supabase-Berechtigungen prüfen.',

          h('p', { class: 'err' },
            error?.message || String(error)
          ),

          h('button', {
            class: 'btn btn-secondary',
            type: 'button',
            onclick: () => window.renderAdminCustomers()
          }, 'Erneut versuchen')
        )
      );
    }
  };
})();
