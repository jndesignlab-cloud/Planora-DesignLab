-- =========================================================
-- PLANORA DATABASE MIGRATION
-- Version: 1.0.0
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- ENUM TYPES
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_type') then
    create type public.plan_type as enum ('free', 'premium', 'admin');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_role') then
    create type public.workspace_role as enum ('owner', 'admin', 'member');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'post_status') then
    create type public.post_status as enum ('idea', 'created', 'scheduled', 'posted');
  end if;
end
$$;

-- =========================================================
-- TABLES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  plan public.plan_type not null default 'free',
  plan_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.social_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  platform text,
  color text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  social_page_id uuid references public.social_pages(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  caption text,
  notes text,
  post_date date not null,
  post_time time,
  status public.post_status not null default 'idea',
  platform text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index if not exists social_pages_workspace_id_idx on public.social_pages(workspace_id);
create index if not exists posts_workspace_id_idx on public.posts(workspace_id);
create index if not exists posts_social_page_id_idx on public.posts(social_page_id);
create index if not exists posts_post_date_idx on public.posts(post_date);
create index if not exists posts_workspace_date_idx on public.posts(workspace_id, post_date);

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists social_pages_set_updated_at on public.social_pages;
create trigger social_pages_set_updated_at before update on public.social_pages
for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute function public.set_updated_at();

-- =========================================================
-- NEW USER SETUP
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1),
    'Planora User'
  );

  insert into public.profiles (id, full_name, plan)
  values (new.id, display_name, 'free');

  insert into public.workspaces (name, owner_id)
  values (display_name || '''s Workspace', new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  insert into public.social_pages (workspace_id, name, platform)
  values (new_workspace_id, 'My Social Media Page', 'General');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- MEMBERSHIP HELPER
-- =========================================================

create or replace function public.is_workspace_member(requested_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = requested_workspace_id
      and user_id = (select auth.uid())
  );
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.social_pages enable row level security;
alter table public.posts enable row level security;

-- Profiles
create policy "Users can view own profile" on public.profiles
for select to authenticated using (id = (select auth.uid()));

create policy "Users can update own profile" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Workspaces
create policy "Members can view workspaces" on public.workspaces
for select to authenticated using (public.is_workspace_member(id));

create policy "Owners can update workspaces" on public.workspaces
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- Workspace memberships
create policy "Members can view workspace memberships" on public.workspace_members
for select to authenticated using (public.is_workspace_member(workspace_id));

-- Social pages
create policy "Members can view social pages" on public.social_pages
for select to authenticated using (public.is_workspace_member(workspace_id));

create policy "Members can create social pages" on public.social_pages
for insert to authenticated with check (public.is_workspace_member(workspace_id));

create policy "Members can update social pages" on public.social_pages
for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Members can delete social pages" on public.social_pages
for delete to authenticated using (public.is_workspace_member(workspace_id));

-- Posts
create policy "Members can view posts" on public.posts
for select to authenticated using (public.is_workspace_member(workspace_id));

create policy "Members can create posts" on public.posts
for insert to authenticated
with check (
  public.is_workspace_member(workspace_id)
  and created_by = (select auth.uid())
);

create policy "Members can update posts" on public.posts
for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "Members can delete posts" on public.posts
for delete to authenticated using (public.is_workspace_member(workspace_id));

-- Realtime publication

do $$
begin
  alter publication supabase_realtime add table public.posts;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.social_pages;
exception
  when duplicate_object then null;
end
$$;
