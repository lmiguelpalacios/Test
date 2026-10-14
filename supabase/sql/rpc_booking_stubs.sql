-- Nordlicht — remaining RPC stubs (NOT a migration)
--
-- SUPERSEDED (do NOT re-apply these stubs remotely):
--   booking RPCs → supabase/migrations/20261013140100_nordlicht_booking_rpcs_v1.sql
--   record_goods_receipt, import_workspace → 20261014120000_nordlicht_app_rpcs_v1.sql
--
-- Remaining stub in this file (v1 intentionally disabled in the app UI):
--   post_learning_practice
--
-- Do NOT apply via apply_migration / execute_sql against remote projects
-- unless intentionally replacing the live function with this stub.

-- ---------------------------------------------------------------------------
-- post_learning_practice (still STUB — honest-disable in supabase mode)
-- ---------------------------------------------------------------------------
create or replace function public.post_learning_practice(
  p_organization_id uuid,
  p_task_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_org_member(p_organization_id) then
    raise exception 'forbidden';
  end if;
  raise exception
    'STUB: post_learning_practice not implemented. Requires completed + practice_posted_at is null for auth.uid().';
end;
$$;

comment on function public.post_learning_practice(uuid, text) is
  'STUB+authz. Member (incl. student); not teacher-writing-for-student. App UI disabled in supabase mode for v1.';

revoke all on function public.post_learning_practice(uuid, text) from public;
revoke all on function public.post_learning_practice(uuid, text) from anon;
grant execute on function public.post_learning_practice(uuid, text) to authenticated;
