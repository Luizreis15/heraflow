
-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'operation', 'editor_support', 'commercial', 'viewer');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ============ USER_ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- has_role (security definer to avoid recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- helper: check if any of multiple roles
create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = any(_roles))
$$;

-- ============ updated_at trigger ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ SPRINTS ============
create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  objective text,
  description text,
  start_date date,
  end_date date,
  status text not null default 'planned' check (status in ('planned','active','paused','completed','cancelled')),
  owner_id uuid references public.profiles(id) on delete set null,
  progress integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sprints enable row level security;

-- ============ PROCESSES ============
create table public.processes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text,
  objective text,
  when_to_use text,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','testing','validated','official','needs_review')),
  steps text,
  checklist text,
  tools text,
  quality_standard text,
  common_errors text,
  estimated_time_minutes integer,
  source_task_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.processes enable row level security;

-- ============ TASKS ============
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  sector text check (sector is null or sector in ('strategy','brand','content','traffic','commercial','diagnosis','proposal','client','product','ai','processes','training','finance','operation')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'backlog' check (status in ('backlog','today','in_progress','review','done','became_process','archived')),
  sprint_id uuid references public.sprints(id) on delete set null,
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  turned_into_process boolean not null default false,
  process_id uuid references public.processes(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;

alter table public.processes
  add constraint processes_source_task_id_fkey
  foreign key (source_task_id) references public.tasks(id) on delete set null;

-- auto completed_at
create or replace function public.tasks_set_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at = now();
  elsif new.status <> 'done' and old.status = 'done' then
    new.completed_at = null;
  end if;
  return new;
end; $$;

create trigger trg_tasks_completed_at
before update on public.tasks
for each row execute function public.tasks_set_completed_at();

-- ============ TASK_CHECKLIST_ITEMS ============
create table public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  label text not null,
  is_done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.task_checklist_items enable row level security;

-- ============ LEADS ============
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null,
  contact_name text,
  city text,
  state text,
  instagram_url text,
  website_url text,
  whatsapp text,
  specialty text,
  priority_treatment text,
  source text,
  status text not null default 'mapped' check (status in ('mapped','contacted','replied','diagnosis_scheduled','diagnosis_done','proposal_sent','follow_up','won','lost','nurturing')),
  potential_score integer check (potential_score between 1 and 5),
  main_pain text,
  next_action text,
  next_follow_up_date date,
  proposal_value numeric,
  lost_reason text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.leads enable row level security;

-- ============ DIARY ============
create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text check (category is null or category in ('commercial','content','offer','client','process','technology','mentorship','mistake','insight','win')),
  content text not null,
  decision text,
  learning text,
  impact text,
  next_action text,
  sprint_id uuid references public.sprints(id) on delete set null,
  related_task_id uuid references public.tasks(id) on delete set null,
  related_lead_id uuid references public.leads(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.diary_entries enable row level security;

-- ============ ASSETS ============
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  url text,
  status text not null default 'draft' check (status in ('draft','in_use','approved','archived')),
  version text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.assets enable row level security;

-- ============ COMMENTS ============
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('task','process','lead','diary_entry','asset','sprint')),
  entity_id uuid not null,
  content text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;

-- ============ updated_at TRIGGERS ============
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_sprints_updated before update on public.sprints for each row execute function public.set_updated_at();
create trigger trg_tasks_updated before update on public.tasks for each row execute function public.set_updated_at();
create trigger trg_processes_updated before update on public.processes for each row execute function public.set_updated_at();
create trigger trg_leads_updated before update on public.leads for each row execute function public.set_updated_at();
create trigger trg_diary_updated before update on public.diary_entries for each row execute function public.set_updated_at();
create trigger trg_assets_updated before update on public.assets for each row execute function public.set_updated_at();
create trigger trg_checklist_updated before update on public.task_checklist_items for each row execute function public.set_updated_at();

-- ============ AUTH SIGNUP TRIGGER ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ INDEXES ============
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_sprint_id on public.tasks(sprint_id);
create index idx_tasks_assignee_id on public.tasks(assignee_id);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_sprints_status on public.sprints(status);
create index idx_processes_status on public.processes(status);
create index idx_processes_sector on public.processes(sector);
create index idx_leads_status on public.leads(status);
create index idx_leads_owner_id on public.leads(owner_id);
create index idx_leads_followup on public.leads(next_follow_up_date);
create index idx_diary_category on public.diary_entries(category);
create index idx_diary_sprint_id on public.diary_entries(sprint_id);
create index idx_assets_category on public.assets(category);
create index idx_comments_entity on public.comments(entity_type, entity_id);

-- ============ RLS POLICIES ============

-- PROFILES: everyone authenticated can read; users can update their own; admins can do all
create policy "profiles_select_all" on public.profiles for select to authenticated using (true);
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_all" on public.profiles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES: users see their own roles; admins manage all
create policy "user_roles_select_self" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_all" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- SPRINTS
create policy "sprints_select_authenticated" on public.sprints for select to authenticated using (true);
create policy "sprints_insert_admin_op" on public.sprints for insert to authenticated with check (public.has_any_role(auth.uid(), array['admin','operation']::public.app_role[]));
create policy "sprints_update_admin_op" on public.sprints for update to authenticated using (public.has_any_role(auth.uid(), array['admin','operation']::public.app_role[])) with check (public.has_any_role(auth.uid(), array['admin','operation']::public.app_role[]));
create policy "sprints_delete_admin" on public.sprints for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- TASKS
create policy "tasks_select" on public.tasks for select to authenticated using (
  public.has_any_role(auth.uid(), array['admin','operation','commercial']::public.app_role[])
  or assignee_id = auth.uid()
  or created_by = auth.uid()
);
create policy "tasks_insert" on public.tasks for insert to authenticated with check (
  public.has_any_role(auth.uid(), array['admin','operation','commercial']::public.app_role[])
);
create policy "tasks_update" on public.tasks for update to authenticated using (
  public.has_any_role(auth.uid(), array['admin','operation']::public.app_role[])
  or assignee_id = auth.uid()
  or created_by = auth.uid()
) with check (
  public.has_any_role(auth.uid(), array['admin','operation']::public.app_role[])
  or assignee_id = auth.uid()
  or created_by = auth.uid()
);
create policy "tasks_delete_admin" on public.tasks for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- TASK_CHECKLIST_ITEMS: anyone who can see the task
create policy "checklist_select" on public.task_checklist_items for select to authenticated using (
  exists (select 1 from public.tasks t where t.id = task_id and (
    public.has_any_role(auth.uid(), array['admin','operation','commercial']::public.app_role[])
    or t.assignee_id = auth.uid() or t.created_by = auth.uid()
  ))
);
create policy "checklist_modify" on public.task_checklist_items for all to authenticated using (
  exists (select 1 from public.tasks t where t.id = task_id and (
    public.has_any_role(auth.uid(), array['admin','operation']::public.app_role[])
    or t.assignee_id = auth.uid() or t.created_by = auth.uid()
  ))
) with check (
  exists (select 1 from public.tasks t where t.id = task_id and (
    public.has_any_role(auth.uid(), array['admin','operation']::public.app_role[])
    or t.assignee_id = auth.uid() or t.created_by = auth.uid()
  ))
);

-- PROCESSES
create policy "processes_select" on public.processes for select to authenticated using (true);
create policy "processes_insert" on public.processes for insert to authenticated with check (
  public.has_any_role(auth.uid(), array['admin','operation']::public.app_role[])
);
-- non-admins cannot set status='official'
create policy "processes_update_admin" on public.processes for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "processes_update_op" on public.processes for update to authenticated using (
  public.has_role(auth.uid(),'operation')
) with check (
  public.has_role(auth.uid(),'operation') and status <> 'official'
);
create policy "processes_delete_admin" on public.processes for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- LEADS
create policy "leads_select" on public.leads for select to authenticated using (
  public.has_any_role(auth.uid(), array['admin','commercial']::public.app_role[])
  or owner_id = auth.uid() or created_by = auth.uid()
);
create policy "leads_insert" on public.leads for insert to authenticated with check (
  public.has_any_role(auth.uid(), array['admin','commercial','operation']::public.app_role[])
);
create policy "leads_update" on public.leads for update to authenticated using (
  public.has_any_role(auth.uid(), array['admin','commercial']::public.app_role[])
  or owner_id = auth.uid()
) with check (
  public.has_any_role(auth.uid(), array['admin','commercial']::public.app_role[])
  or owner_id = auth.uid()
);
create policy "leads_delete_admin" on public.leads for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- DIARY
create policy "diary_select" on public.diary_entries for select to authenticated using (true);
create policy "diary_insert" on public.diary_entries for insert to authenticated with check (created_by = auth.uid());
create policy "diary_update" on public.diary_entries for update to authenticated using (created_by = auth.uid() or public.has_role(auth.uid(),'admin')) with check (created_by = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "diary_delete_admin" on public.diary_entries for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- ASSETS
create policy "assets_select" on public.assets for select to authenticated using (true);
create policy "assets_insert" on public.assets for insert to authenticated with check (
  public.has_any_role(auth.uid(), array['admin','operation','commercial']::public.app_role[])
);
create policy "assets_update" on public.assets for update to authenticated using (
  public.has_any_role(auth.uid(), array['admin','operation']::public.app_role[])
  or owner_id = auth.uid() or created_by = auth.uid()
) with check (
  public.has_any_role(auth.uid(), array['admin','operation']::public.app_role[])
  or owner_id = auth.uid() or created_by = auth.uid()
);
create policy "assets_delete_admin" on public.assets for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- COMMENTS
create policy "comments_select" on public.comments for select to authenticated using (true);
create policy "comments_insert" on public.comments for insert to authenticated with check (created_by = auth.uid());
create policy "comments_delete" on public.comments for delete to authenticated using (created_by = auth.uid() or public.has_role(auth.uid(),'admin'));
