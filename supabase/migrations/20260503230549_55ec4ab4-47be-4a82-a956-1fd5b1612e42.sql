
-- set search_path on remaining functions
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.tasks_set_completed_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at = now();
  elsif new.status <> 'done' and old.status = 'done' then
    new.completed_at = null;
  end if;
  return new;
end; $$;

-- Revoke execute on internal functions from public/authenticated
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.tasks_set_completed_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- has_role / has_any_role: only authenticated can call (used in client-readable contexts via RLS)
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.has_any_role(uuid, public.app_role[]) from public, anon;
