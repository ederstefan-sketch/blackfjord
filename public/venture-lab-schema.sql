-- =====================================================================
-- BLACKFJORD Venture Lab – Datenbank-Schema (Supabase / Postgres)
-- Phase 2: Login, Workspace, KI-Chat + Gedächtnis, Dokumente, Aufgaben,
--          Termine, Kontakte, Aktivität, Entscheidungen, Benachrichtigungen,
--          Suche, 30-Tage-Trial / Abo / Sponsored
--
-- Dieses Schema ist vollständig auf public/venture-lab.html abgestimmt:
--   - portal_membership_status (View mit billing_mode, trial_seconds_remaining, access_active)
--   - create_my_venture (RPC für Onboarding)
--   - venture_activities, venture_decisions, venture_contacts, portal_contacts,
--     portal_calendar_events, portal_notifications, portal_search
--   - alle Insert/Update-Felder des Frontends (visibility, status, file_path, metadata, …)
-- =====================================================================

-- ---------- 1. Profile (1:1 zu auth.users) ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text,
  last_name   text,
  full_name   text,
  company     text,
  role        text not null default 'customer' check (role in ('customer','admin')),
  created_at  timestamptz not null default now()
);

-- Profil automatisch bei Registrierung anlegen
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, full_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'first_name',''),
    nullif(new.raw_user_meta_data->>'last_name',''),
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. Ventures (Workspace pro Kunde/Projekt) ----------
create table public.ventures (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  stage       text not null default 'idea'
              check (stage in ('idea','validation','model','build','launch','partner')),
  progress    smallint not null default 0 check (progress between 0 and 100),
  created_at  timestamptz not null default now()
);
create index on public.ventures(owner_id);

-- ---------- 3. Portal-Mitgliedschaft (Trial / Abo / Sponsored) ----------
create table public.portal_memberships (
  venture_id              uuid primary key references public.ventures(id) on delete cascade,
  billing_mode            text not null default 'trial'
                          check (billing_mode in ('trial','subscription','sponsored')),
  trial_started_at        timestamptz not null default now(),
  trial_ends_at           timestamptz not null default now() + interval '30 days',
  subscription_status     text,                     -- z. B. 'active','past_due','canceled'
  stripe_customer_id      text,
  stripe_subscription_id text,
  updated_at              timestamptz not null default now()
);

-- Status-View, die das Frontend liest (billingLabel, Badge, Billing-Tab)
create view public.portal_membership_status
with (security_invoker = true) as
select
  m.venture_id,
  m.billing_mode,
  m.trial_started_at,
  m.trial_ends_at,
  greatest(0, floor(extract(epoch from (m.trial_ends_at - now())))::bigint)
    as trial_seconds_remaining,
  (m.billing_mode = 'sponsored'
   or (m.billing_mode = 'subscription' and m.subscription_status = 'active')
   or (m.billing_mode = 'trial' and m.trial_ends_at > now())
  ) as access_active,
  m.subscription_status,
  m.updated_at
from public.portal_memberships m;

-- ---------- 4. Onboarding-RPC (vom Frontend aufgerufen) ----------
create function public.create_my_venture(p_title text, p_description text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.ventures (owner_id, title, description)
  values (auth.uid(), p_title, nullif(p_description,''))
  returning id into v_id;

  insert into public.portal_memberships (venture_id)
  values (v_id);

  return v_id;
end $$;

-- ---------- 5. KI-Chat ----------
create table public.chat_threads (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null default 'Neuer Chat',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.chat_threads(venture_id, updated_at);

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.chat_threads(id) on delete cascade,
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index on public.chat_messages(thread_id, created_at);

-- updated_at des Threads bei neuer Nachricht anfassen (Frontend sortiert danach)
create function public.touch_thread() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.chat_threads set updated_at = now() where id = new.thread_id;
  return new;
end $$;

create trigger on_chat_message_created
  after insert on public.chat_messages
  for each row execute function public.touch_thread();

-- ---------- 6. Projektgedächtnis (Venture Memory) ----------
create table public.venture_memory (
  id            uuid primary key default gen_random_uuid(),
  venture_id    uuid not null references public.ventures(id) on delete cascade,
  kind          text not null default 'fact'
                check (kind in ('fact','decision','goal','insight','risk')),
  content       text not null,
  status        text not null default 'active'
                check (status in ('active','archived')),
  source_type   text not null default 'customer'
                check (source_type in ('customer','ai','system')),
  visibility    text not null default 'customer'
                check (visibility in ('customer','internal')),
  source_message_id uuid references public.chat_messages(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index on public.venture_memory(venture_id, created_at);

-- ---------- 7. Aufgaben ----------
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  title       text not null,
  phase       text,
  status      text not null default 'open' check (status in ('open','doing','done')),
  due_date    date,
  assigned_to text not null default 'customer' check (assigned_to in ('customer','blackfjord')),
  visibility  text not null default 'customer' check (visibility in ('customer','internal')),
  created_at  timestamptz not null default now()
);
create index on public.tasks(venture_id, created_at);

-- ---------- 8. Dokumente ----------
create table public.documents (
  id               uuid primary key default gen_random_uuid(),
  venture_id       uuid not null references public.ventures(id) on delete cascade,
  name             text not null,
  file_path        text,                          -- Pfad im Bucket venture-docs
  content          text,                          -- für KI-generierte Dokumente (Markdown)
  document_type    text not null default 'file',
  processing_status text not null default 'pending'
                   check (processing_status in ('pending','processing','ready','error')),
  visibility       text not null default 'customer' check (visibility in ('customer','internal')),
  metadata         jsonb not null default '{}'::jsonb,
  generated        boolean not null default false,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now()
);
create index on public.documents(venture_id, created_at);

-- ---------- 9. Aktivität (Timeline) ----------
create table public.venture_activities (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  title       text not null,
  detail      text,
  visibility  text not null default 'customer' check (visibility in ('customer','internal')),
  created_at  timestamptz not null default now()
);
create index on public.venture_activities(venture_id, created_at);

-- ---------- 10. Entscheidungen (Decision Log) ----------
create table public.venture_decisions (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  title       text not null,
  rationale   text,
  decided_by  text not null default 'customer' check (decided_by in ('customer','blackfjord')),
  visibility  text not null default 'customer' check (visibility in ('customer','internal')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.venture_decisions(venture_id, updated_at);

-- ---------- 11. Kontakte (zentral + pro Venture) ----------
create table public.portal_contacts (
  id            uuid primary key default gen_random_uuid(),
  contact_type  text not null default 'person' check (contact_type in ('person','company')),
  display_name  text not null,
  email         text,
  phone         text,
  notes         text,
  created_by    uuid references public.profiles(id),
  visibility    text not null default 'customer' check (visibility in ('customer','internal')),
  created_at    timestamptz not null default now()
);

create table public.venture_contacts (
  venture_id   uuid not null references public.ventures(id) on delete cascade,
  contact_id   uuid not null references public.portal_contacts(id) on delete cascade,
  relationship text not null default 'contact',
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  primary key (venture_id, contact_id)
);
create index on public.venture_contacts(contact_id);

-- ---------- 12. Termine ----------
create table public.portal_calendar_events (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  status      text not null default 'scheduled'
              check (status in ('scheduled','done','canceled')),
  visibility  text not null default 'customer' check (visibility in ('customer','internal')),
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index on public.portal_calendar_events(venture_id, starts_at);

-- ---------- 13. Benachrichtigungen ----------
create table public.portal_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  venture_id  uuid references public.ventures(id) on delete cascade,
  title       text not null,
  body        text,
  kind        text not null default 'info',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.portal_notifications(user_id, created_at);

-- ---------- 14. Suche (View über durchsuchbare Objekte) ----------
create view public.portal_search
with (security_invoker = true) as
  select id, venture_id, title, 'task' as kind, created_at from public.tasks
  union all
  select id, venture_id, name, 'document', created_at from public.documents
  union all
  select id, venture_id, title, 'decision', created_at from public.venture_decisions
  union all
  select id, venture_id, content, 'memory', created_at from public.venture_memory;

-- ---------- 15. Zugriffs-Helfer ----------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create function public.has_access(p_venture uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.ventures v
                 where v.id = p_venture and v.owner_id = auth.uid());
$$;

-- ---------- 16. Row Level Security ----------
alter table public.profiles             enable row level security;
alter table public.ventures             enable row level security;
alter table public.portal_memberships   enable row level security;
alter table public.chat_threads         enable row level security;
alter table public.chat_messages        enable row level security;
alter table public.venture_memory       enable row level security;
alter table public.tasks                enable row level security;
alter table public.documents            enable row level security;
alter table public.venture_activities   enable row level security;
alter table public.venture_decisions    enable row level security;
alter table public.portal_contacts      enable row level security;
alter table public.venture_contacts     enable row level security;
alter table public.portal_calendar_events enable row level security;
alter table public.portal_notifications enable row level security;

-- Profile: eigenes Profil lesen/ändern, Admin sieht alle
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Ventures
create policy ventures_select on public.ventures for select using (public.has_access(id));
create policy ventures_insert on public.ventures for insert
  with check (owner_id = auth.uid() or public.is_admin());
create policy ventures_update on public.ventures for update using (public.has_access(id));

-- Mitgliedschaft: Kunde liest (über View), Änderungen nur Admin / service_role
create policy portal_memberships_select on public.portal_memberships for select
  using (public.has_access(venture_id));
create policy portal_memberships_admin on public.portal_memberships for all
  using (public.is_admin()) with check (public.is_admin());

-- Chat
create policy chat_threads_all    on public.chat_threads    for all
  using (public.has_access(venture_id) and (user_id = auth.uid() or public.is_admin()))
  with check (public.has_access(venture_id) and (user_id = auth.uid() or public.is_admin()));
create policy chat_messages_all   on public.chat_messages   for all
  using (public.has_access(venture_id)) with check (public.has_access(venture_id));

-- Tabellen mit venture_id: voller Zugriff für Besitzer + Admin
create policy venture_memory_all     on public.venture_memory     for all
  using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy tasks_all             on public.tasks             for all
  using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy documents_all         on public.documents         for all
  using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy venture_activities_all on public.venture_activities for all
  using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy venture_decisions_all on public.venture_decisions for all
  using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy venture_contacts_all  on public.venture_contacts  for all
  using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy calendar_events_all    on public.portal_calendar_events for all
  using (public.has_access(venture_id)) with check (public.has_access(venture_id));

-- Kontakte: global nur eigene (created_by) bzw. Admin
create policy portal_contacts_select on public.portal_contacts for select
  using (created_by = auth.uid() or public.is_admin()
         or exists (select 1 from public.venture_contacts vc
                    join public.ventures v on v.id = vc.venture_id
                    where vc.contact_id = public.portal_contacts.id
                      and v.owner_id = auth.uid()));
create policy portal_contacts_insert on public.portal_contacts for insert
  with check (created_by = auth.uid() or public.is_admin());
create policy portal_contacts_update on public.portal_contacts for update
  using (created_by = auth.uid() or public.is_admin());
create policy portal_contacts_delete on public.portal_contacts for delete
  using (created_by = auth.uid() or public.is_admin());

-- Benachrichtigungen: nur die eigenen
create policy notifications_select on public.portal_notifications for select
  using (user_id = auth.uid());
create policy notifications_update on public.portal_notifications for update
  using (user_id = auth.uid());
create policy notifications_insert on public.portal_notifications for insert
  with check (public.is_admin() or user_id = auth.uid());

-- ---------- 17. Storage (private Dokumentenablage) ----------
insert into storage.buckets (id, name, public)
values ('venture-docs', 'venture-docs', false)
on conflict (id) do nothing;

-- Dateipfad-Konvention: <venture_id>/<dateiname>
create policy venture_docs_all on storage.objects for all
  using (bucket_id = 'venture-docs' and public.has_access(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'venture-docs' and public.has_access(((storage.foldername(name))[1])::uuid));
