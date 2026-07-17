-- Confirm that RLS is enabled on the Planora tables.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'workspaces', 'workspace_members', 'social_pages', 'posts')
order by c.relname;

-- List active RLS policies.
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Verify automatic account records. Replace the email before running.
select
  u.id as user_id,
  u.email,
  p.full_name,
  p.plan,
  w.id as workspace_id,
  w.name as workspace_name,
  wm.role,
  sp.id as social_page_id,
  sp.name as social_page_name,
  sp.platform
from auth.users u
left join public.profiles p on p.id = u.id
left join public.workspaces w on w.owner_id = u.id
left join public.workspace_members wm
  on wm.workspace_id = w.id and wm.user_id = u.id
left join public.social_pages sp on sp.workspace_id = w.id
where u.email = 'YOUR_TEST_EMAIL@example.com';
