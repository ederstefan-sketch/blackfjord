-- =====================================================================
-- Migration: Venture-Lab-Frontend mit Datenbank angleichen
-- Für bestehende Supabase-Projekte, die bereits mit dem alten Schema laufen.
-- Neue Projekte: supabase/schema.sql vollständig ausführen.
-- =====================================================================

-- 1) Kunden-Onboarding: owner_id darf von der DB gesetzt werden (20-data.js newVenture)
alter table public.ventures alter column owner_id set default auth.uid();

-- 2) Dokumente: Spalte heißt im Frontend storage_path (70-docs.js)
alter table public.documents rename column file_path to storage_path;

-- 3) Mitgliedschaft: plan-Feld für den Badge im Portal (30-portal.js)
alter table public.portal_memberships
  add column if not exists plan text not null default 'trial_full';

-- 4) Nachrichten-Tab (80-messages.js)
create table if not exists public.comm_messages (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists comm_messages_venture_created
  on public.comm_messages(venture_id, created_at);
alter table public.comm_messages enable row level security;
drop policy if exists comm_messages_all on public.comm_messages;
create policy comm_messages_all on public.comm_messages for all
  using (public.has_access(venture_id)) with check (public.has_access(venture_id));

-- 5) KI-Status pro Dokument (70-docs.js Status-Chips)
create table if not exists public.venture_ai_resources (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  status      text not null default 'pending'
              check (status in ('pending','processing','ready','error')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists venture_ai_resources_venture_doc
  on public.venture_ai_resources(venture_id, document_id);
alter table public.venture_ai_resources enable row level security;
drop policy if exists venture_ai_resources_all on public.venture_ai_resources;
create policy venture_ai_resources_all on public.venture_ai_resources for all
  using (public.has_access(venture_id)) with check (public.has_access(venture_id));

-- 6) Ventures durch Besitzer/Admin löschbar machen
drop policy if exists ventures_delete on public.ventures;
create policy ventures_delete on public.ventures for delete
  using (public.has_access(id));
