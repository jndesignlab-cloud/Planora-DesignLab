-- =========================================================
-- PLANORA SECURITY HARDENING
-- Version: 1.0.1
-- =========================================================

begin;

revoke all privileges
on table public.profiles, public.workspaces, public.workspace_members,
  public.social_pages, public.posts
from anon;

revoke all privileges
on table public.profiles, public.workspaces, public.workspace_members,
  public.social_pages, public.posts
from authenticated;

grant usage on schema public to authenticated;

-- Profiles: signed-in users can read their RLS-approved row and edit only safe columns.
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- Workspaces: signup trigger creates the workspace; owners can rename it.
grant select on public.workspaces to authenticated;
grant update (name, slug) on public.workspaces to authenticated;

-- Workspace members: team mutations are reserved for a future secure workflow.
grant select on public.workspace_members to authenticated;

-- Social pages.
grant select on public.social_pages to authenticated;
grant insert (workspace_id, name, platform, color, is_archived)
on public.social_pages to authenticated;
grant update (name, platform, color, is_archived)
on public.social_pages to authenticated;
grant delete on public.social_pages to authenticated;

-- Posts: ownership and audit fields cannot be edited directly.
grant select on public.posts to authenticated;
grant insert (
  workspace_id, social_page_id, created_by, title, caption, notes,
  post_date, post_time, status, platform, category
) on public.posts to authenticated;
grant update (
  social_page_id, title, caption, notes, post_date, post_time,
  status, platform, category
) on public.posts to authenticated;
grant delete on public.posts to authenticated;

revoke all privileges on function public.is_workspace_member(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;

commit;
