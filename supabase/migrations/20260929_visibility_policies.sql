-- =====================================================================
-- Migration: visibility='internal' vor Kunden absichern
-- Tabellen mit visibility-Spalte bekommen getrennte Policies:
-- Kunden sehen/schreiben nur 'customer'-Einträge, Admins sehen alles.
-- Einmalig in Supabase ausführen (SQL Editor).
-- =====================================================================

-- Hilfsfunktion: Eintrag für den aktuellen Kunden sichtbar?
create or replace function public.item_visible(visibility text)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or visibility = 'customer';
$$;

-- Tabellen mit visibility-Spalte
-- venture_memory, tasks, documents, venture_activities, venture_decisions, portal_calendar_events


-- venture_memory
drop policy if exists venture_memory_all on public.venture_memory;
drop policy if exists venture_memory_select on public.venture_memory;
drop policy if exists venture_memory_insert on public.venture_memory;
drop policy if exists venture_memory_update on public.venture_memory;
drop policy if exists venture_memory_delete on public.venture_memory;
create policy venture_memory_select on public.venture_memory for select
  using (public.has_access(venture_id) and public.item_visible(visibility));
create policy venture_memory_insert on public.venture_memory for insert
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy venture_memory_update on public.venture_memory for update
  using (public.has_access(venture_id) and public.item_visible(visibility))
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy venture_memory_delete on public.venture_memory for delete
  using (public.has_access(venture_id) and public.item_visible(visibility));


-- tasks
drop policy if exists tasks_all on public.tasks;
drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;
create policy tasks_select on public.tasks for select
  using (public.has_access(venture_id) and public.item_visible(visibility));
create policy tasks_insert on public.tasks for insert
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy tasks_update on public.tasks for update
  using (public.has_access(venture_id) and public.item_visible(visibility))
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy tasks_delete on public.tasks for delete
  using (public.has_access(venture_id) and public.item_visible(visibility));


-- documents
drop policy if exists documents_all on public.documents;
drop policy if exists documents_select on public.documents;
drop policy if exists documents_insert on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists documents_delete on public.documents;
create policy documents_select on public.documents for select
  using (public.has_access(venture_id) and public.item_visible(visibility));
create policy documents_insert on public.documents for insert
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy documents_update on public.documents for update
  using (public.has_access(venture_id) and public.item_visible(visibility))
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy documents_delete on public.documents for delete
  using (public.has_access(venture_id) and public.item_visible(visibility));


-- venture_activities
drop policy if exists venture_activities_all on public.venture_activities;
drop policy if exists venture_activities_select on public.venture_activities;
drop policy if exists venture_activities_insert on public.venture_activities;
drop policy if exists venture_activities_update on public.venture_activities;
drop policy if exists venture_activities_delete on public.venture_activities;
create policy venture_activities_select on public.venture_activities for select
  using (public.has_access(venture_id) and public.item_visible(visibility));
create policy venture_activities_insert on public.venture_activities for insert
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy venture_activities_update on public.venture_activities for update
  using (public.has_access(venture_id) and public.item_visible(visibility))
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy venture_activities_delete on public.venture_activities for delete
  using (public.has_access(venture_id) and public.item_visible(visibility));


-- venture_decisions
drop policy if exists venture_decisions_all on public.venture_decisions;
drop policy if exists venture_decisions_select on public.venture_decisions;
drop policy if exists venture_decisions_insert on public.venture_decisions;
drop policy if exists venture_decisions_update on public.venture_decisions;
drop policy if exists venture_decisions_delete on public.venture_decisions;
create policy venture_decisions_select on public.venture_decisions for select
  using (public.has_access(venture_id) and public.item_visible(visibility));
create policy venture_decisions_insert on public.venture_decisions for insert
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy venture_decisions_update on public.venture_decisions for update
  using (public.has_access(venture_id) and public.item_visible(visibility))
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy venture_decisions_delete on public.venture_decisions for delete
  using (public.has_access(venture_id) and public.item_visible(visibility));


-- portal_calendar_events
drop policy if exists portal_calendar_events_all on public.portal_calendar_events;
drop policy if exists portal_calendar_events_select on public.portal_calendar_events;
drop policy if exists portal_calendar_events_insert on public.portal_calendar_events;
drop policy if exists portal_calendar_events_update on public.portal_calendar_events;
drop policy if exists portal_calendar_events_delete on public.portal_calendar_events;
create policy portal_calendar_events_select on public.portal_calendar_events for select
  using (public.has_access(venture_id) and public.item_visible(visibility));
create policy portal_calendar_events_insert on public.portal_calendar_events for insert
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy portal_calendar_events_update on public.portal_calendar_events for update
  using (public.has_access(venture_id) and public.item_visible(visibility))
  with check (public.has_access(venture_id) and public.item_visible(visibility));
create policy portal_calendar_events_delete on public.portal_calendar_events for delete
  using (public.has_access(venture_id) and public.item_visible(visibility));
