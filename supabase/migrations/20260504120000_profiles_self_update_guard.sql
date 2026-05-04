-- Impede que utilizadores não-admin alterem o próprio e-mail ou is_active via API.
-- Admins continuam a usar a política profiles_admin_all.
-- full_name e avatar_url podem ser atualizados pelo próprio utilizador.

create or replace function public.profiles_guard_non_admin_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'update'
     and new.id = auth.uid()
     and not public.has_role(auth.uid(), 'admin'::public.app_role) then
    if new.is_active is distinct from old.is_active
       or new.email is distinct from old.email then
      raise exception 'Apenas administradores podem alterar e-mail ou estado ativo da conta.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_self on public.profiles;

create trigger trg_profiles_guard_self
before update on public.profiles
for each row
execute function public.profiles_guard_non_admin_self_update();

revoke execute on function public.profiles_guard_non_admin_self_update() from public, anon, authenticated;
