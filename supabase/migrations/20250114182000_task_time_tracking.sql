-- Time tracking for tasks: estimated vs actual with per-user entries

-- Estimated hours on tasks
alter table public.tasks
  add column if not exists estimated_hours numeric(10,2);

-- Time entries table
create table if not exists public.task_time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_task_time_entries_task on public.task_time_entries(task_id);
create index if not exists idx_task_time_entries_user on public.task_time_entries(user_id);

-- RLS
alter table public.task_time_entries enable row level security;

do $$ begin
  drop policy if exists "Time entries readable by assigned users" on public.task_time_entries;
  drop policy if exists "Time entries insert by assigned users" on public.task_time_entries;
  drop policy if exists "Time entries update by owner" on public.task_time_entries;

  create policy "Time entries readable by assigned users" on public.task_time_entries
  for select to authenticated
  using (
    exists (
      select 1 from public.task_assignees ta
      where ta.task_id = task_time_entries.task_id and ta.user_id = auth.uid()
    )
    or exists (
      select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

  create policy "Time entries insert by assigned users" on public.task_time_entries
  for insert to authenticated
  with check (
    user_id = auth.uid() and exists (
      select 1 from public.task_assignees ta
      where ta.task_id = task_time_entries.task_id and ta.user_id = auth.uid()
    )
  );

  create policy "Time entries update by owner" on public.task_time_entries
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Helper view to compute total spent seconds per task
create or replace view public.v_task_time_summary as
select
  t.id as task_id,
  sum(
    extract(epoch from coalesce(ended_at, now()) - started_at)
  )::bigint as spent_seconds
from public.tasks t
left join public.task_time_entries e on e.task_id = t.id
group by t.id;


