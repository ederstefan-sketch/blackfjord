-- =====================================================================
-- Migration: CRM & Cockpit mit Schema angleichen (14.10.2026)
-- Bringt supabase/schema.sql auf den Stand, den das Live-Frontend nutzt:
--   - portal_contacts: first_name, last_name, company_name, metadata, updated_at (40-crm.js)
--   - tasks: metadata jsonb (Prioritäten im Cockpit, 41-admin-enhancements.js)
--   - venture_decisions: decision, scope (Cockpit-Entscheidungsjournal)
--   - venture_memory: relevance (Cockpit-Merkeinträge)
-- Idempotent: mehrfach ausführbar (SQL Editor in Supabase).
-- =====================================================================

-- ---------- 1) portal_contacts ----------
alter table public.portal_contacts
  add column if not exists first_name   text,
  add column if not exists last_name   text,
  add column if not exists company_name text,
  add column if not exists metadata     jsonb not null default '{}'::jsonb,
  add column if not exists updated_at   timestamptz not null default now();

create index if not exists portal_contacts_updated
  on public.portal_contacts(updated_at desc);

-- updated_at automatisch pflegen (wie portal_memberships)
create or replace function public.touch_portal_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists on_portal_contact_updated on public.portal_contacts;
create trigger on_portal_contact_updated
  before update on public.portal_contacts
  for each row execute function public.touch_portal_contact();

-- ---------- 2) tasks: Prioritäts-Metadaten ----------
alter table public.tasks
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- ---------- 3) venture_decisions: Journal-Felder ----------
alter table public.venture_decisions
  add column if not exists decision text,
  add column if not exists scope    text;

-- ---------- 4) venture_memory: Relevanz ----------
alter table public.venture_memory
  add column if not exists relevance integer;
