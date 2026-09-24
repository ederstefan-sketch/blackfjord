-- =====================================================================
-- BLACKFJORD Venture Lab – Datenbank-Schema (Supabase / Postgres)
-- Phase 1: Login, Workspace, KI-Chat + Gedächtnis, Dokumente, Aufgaben,
--          30-Tage-Zugang, KI-Verbrauch, Kommunikation
-- =====================================================================

-- ---------- 1. Profile (1:1 zu auth.users) ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  company     text,
  role        text not null default 'customer' check (role in ('customer','admin')),
  created_at  timestamptz not null default now()
);

-- Profil automatisch bei Registrierung anlegen
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. Paket-Konfiguration (Budgets später anpassbar) ----------
create table public.package_config (
  package           text primary key check (package in ('START','BUILD','GROW','FULL')),
  ai_budget_cents   integer not null   -- KI-Kostenbudget für die 30 Tage, in Cent
);
-- PLATZHALTER-Werte, werden nach Verbrauchsmessung festgelegt
insert into public.package_config values
  ('START', 200), ('BUILD', 500), ('GROW', 800), ('FULL', 1500);

-- ---------- 3. Ventures (Workspace pro Kunde/Projekt) ----------
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

-- ---------- 4. Mitgliedschaft / Zugang (Tag 30, BASIC/FULL) ----------
create table public.memberships (
  venture_id            uuid primary key references public.ventures(id) on delete cascade,
  package               text not null references public.package_config(package),
  plan                  text not null default 'trial_full'
                        check (plan in ('trial_full','basic','full','expired')),
  trial_started_at      timestamptz not null default now(),
  trial_ends_at         timestamptz not null default now() + interval '30 days',
  ai_budget_cents       integer not null default 0,  -- wird aus package_config übernommen
  stripe_customer_id    text,
  stripe_subscription_id text,
  updated_at            timestamptz not null default now()
);

-- Zugang starten (aufrufen nach Paketkauf, per service_role)
create function public.start_trial(p_venture uuid, p_package text) returns void
language sql security definer set search_path = public as $$
  insert into public.memberships (venture_id, package, ai_budget_cents)
  select p_venture, p_package, ai_budget_cents
  from public.package_config where package = p_package
  on conflict (venture_id) do nothing;
$$;

-- Abgelaufene Trials markieren (täglich per Cron / Edge Function aufrufen)
create function public.expire_trials() returns integer
language sql security definer set search_path = public as $$
  with u as (
    update public.memberships
       set plan = 'expired', updated_at = now()
     where plan = 'trial_full' and trial_ends_at < now()
    returning 1)
  select count(*)::int from u;
$$;

-- ---------- 5. KI-Chat ----------
create table public.chat_threads (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  title       text not null default 'Neuer Chat',
  created_at  timestamptz not null default now()
);
create index on public.chat_threads(venture_id);

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.chat_threads(id) on delete cascade,
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index on public.chat_messages(thread_id, created_at);

-- ---------- 6. Projektgedächtnis (Venture Memory) ----------
create table public.venture_memory (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  kind        text not null check (kind in ('fact','decision','goal','insight','risk')),
  content     text not null,
  source_message_id uuid references public.chat_messages(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.venture_memory(venture_id);

-- ---------- 7. Analysen & Canvas (generisch, als JSON) ----------
create table public.analyses (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  kind        text not null check (kind in
              ('idea','market','competition','audience','pricing','business_model','canvas')),
  content     jsonb not null default '{}'::jsonb,
  version     integer not null default 1,
  created_at  timestamptz not null default now()
);
create index on public.analyses(venture_id, kind);

-- ---------- 8. Aufgaben & Roadmap ----------
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  title       text not null,
  phase       text,
  status      text not null default 'open' check (status in ('open','doing','done')),
  due_date    date,
  assigned_to text not null default 'customer' check (assigned_to in ('customer','blackfjord')),
  created_at  timestamptz not null default now()
);
create index on public.tasks(venture_id);

-- ---------- 9. Dokumente ----------
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  venture_id    uuid not null references public.ventures(id) on delete cascade,
  name          text not null,
  storage_path  text,                       -- Pfad im Bucket venture-docs
  content       text,                       -- für KI-generierte Dokumente (Markdown)
  generated     boolean not null default false,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index on public.documents(venture_id);

-- ---------- 10. BLACKFJORD-Kommunikation ----------
create table public.comm_messages (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id),
  body        text not null,
  created_at  timestamptz not null default now()
);
create index on public.comm_messages(venture_id, created_at);

-- ---------- 11. KI-Verbrauch ----------
create table public.ai_usage (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  user_id     uuid references public.profiles(id),
  tokens_in   integer not null default 0,
  tokens_out  integer not null default 0,
  cost_cents  numeric(10,4) not null default 0,
  created_at  timestamptz not null default now()
);
create index on public.ai_usage(venture_id, created_at);

-- Verbrauch in Cent (für Budget-Check vor jedem KI-Aufruf)
create function public.ai_spent_cents(p_venture uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(cost_cents), 0) from public.ai_usage where venture_id = p_venture;
$$;

-- ---------- 12. Zugriffs-Helfer ----------
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

-- ---------- 13. Row Level Security ----------
alter table public.profiles       enable row level security;
alter table public.package_config enable row level security;
alter table public.ventures       enable row level security;
alter table public.memberships    enable row level security;
alter table public.chat_threads   enable row level security;
alter table public.chat_messages  enable row level security;
alter table public.venture_memory enable row level security;
alter table public.analyses       enable row level security;
alter table public.tasks          enable row level security;
alter table public.documents      enable row level security;
alter table public.comm_messages  enable row level security;
alter table public.ai_usage       enable row level security;

-- Profile: eigenes Profil lesen/ändern, Admin sieht alle
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = 'customer');

-- Paket-Konfiguration: nur lesen
create policy package_config_select on public.package_config for select
  using (auth.uid() is not null);

-- Ventures
create policy ventures_select on public.ventures for select using (public.has_access(id));
create policy ventures_insert on public.ventures for insert
  with check (owner_id = auth.uid() or public.is_admin());
create policy ventures_update on public.ventures for update using (public.has_access(id));

-- Mitgliedschaft: Kunde sieht nur, Änderungen nur per service_role / Admin
create policy memberships_select on public.memberships for select using (public.has_access(venture_id));
create policy memberships_admin  on public.memberships for all
  using (public.is_admin()) with check (public.is_admin());

-- Tabellen mit venture_id: voller Zugriff für Besitzer + Admin
create policy chat_threads_all   on public.chat_threads   for all using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy chat_messages_all  on public.chat_messages  for all using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy venture_memory_all on public.venture_memory for all using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy analyses_all       on public.analyses       for all using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy tasks_all          on public.tasks          for all using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy documents_all      on public.documents      for all using (public.has_access(venture_id)) with check (public.has_access(venture_id));
create policy comm_messages_all  on public.comm_messages  for all using (public.has_access(venture_id)) with check (public.has_access(venture_id) and sender_id = auth.uid());

-- KI-Verbrauch: nur lesen (Schreiben nur per service_role in der Edge Function)
create policy ai_usage_select on public.ai_usage for select using (public.has_access(venture_id));

-- ---------- 14. Storage (private Dokumentenablage) ----------
insert into storage.buckets (id, name, public)
values ('venture-docs', 'venture-docs', false)
on conflict (id) do nothing;

-- Dateipfad-Konvention: <venture_id>/<dateiname>
create policy venture_docs_all on storage.objects for all
  using (bucket_id = 'venture-docs' and public.has_access(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'venture-docs' and public.has_access(((storage.foldername(name))[1])::uuid));
