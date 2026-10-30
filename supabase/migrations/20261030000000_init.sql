-- Roomtone initial schema: profiles, room projects, approved briefs,
-- generated concepts, and a private storage bucket. Every table is
-- protected by row-level security so an account can only see its own rows.

-- Profiles ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  welcomed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles: owner read" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: owner insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles: owner update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Room projects ---------------------------------------------------------------
create type public.project_status as enum (
  'draft', 'photo_added', 'chat_in_progress', 'brief_ready', 'generating', 'concept_ready', 'saved'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 80),
  room_type text not null,
  status public.project_status not null default 'draft',
  photo_path text,
  -- Conversation answers, saved after every step.
  answers jsonb not null default '{}'::jsonb,
  conversation_step int not null default 0,
  conversation_done boolean not null default false,
  -- Inspiration board likes/dislikes: { "<reference id>": "like" | "dislike" }.
  inspiration jsonb not null default '{}'::jsonb,
  inspiration_done boolean not null default false,
  brief_draft jsonb,
  -- Copy of the latest approved brief; generation always reads this.
  approved_brief jsonb,
  current_concept_id uuid,
  generation_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_updated on public.projects (owner_id, updated_at desc);

alter table public.projects enable row level security;
create policy "projects: owner read" on public.projects for select to authenticated using ((select auth.uid()) = owner_id);
create policy "projects: owner insert" on public.projects for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "projects: owner update" on public.projects for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "projects: owner delete" on public.projects for delete to authenticated using ((select auth.uid()) = owner_id);

-- Clients may not edit the owner, the approved brief or the generation lock
-- directly. (Column grants only restrict once the table-wide grant is gone.)
revoke update on public.projects from authenticated, anon;
grant update (name, room_type, status, photo_path, answers, conversation_step, conversation_done,
              inspiration, inspiration_done, brief_draft, current_concept_id)
  on public.projects to authenticated;

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

-- Approved brief versions -----------------------------------------------------
create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  version int not null,
  data jsonb not null,
  summary text not null,
  approved_at timestamptz not null default now(),
  unique (project_id, version)
);

alter table public.briefs enable row level security;
create policy "briefs: owner read" on public.briefs for select to authenticated using ((select auth.uid()) = owner_id);

-- Approving is done through this function so the version number and the
-- copy on the project stay consistent.
create function public.approve_brief(p_project uuid, p_data jsonb, p_summary text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_version int;
  v_brief jsonb;
begin
  select owner_id into v_owner from public.projects where id = p_project for update;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'project not found';
  end if;
  select coalesce(max(version), 0) + 1 into v_version from public.briefs where project_id = p_project;
  insert into public.briefs (project_id, owner_id, version, data, summary)
    values (p_project, v_owner, v_version, p_data, p_summary);
  v_brief := jsonb_build_object('version', v_version, 'data', p_data, 'summary', p_summary, 'approvedAt', now());
  update public.projects
     set approved_brief = v_brief,
         brief_draft = p_data,
         status = case when current_concept_id is null then 'brief_ready'::public.project_status else status end
   where id = p_project;
  return v_brief;
end;
$$;
revoke execute on function public.approve_brief(uuid, jsonb, text) from public, anon;
grant execute on function public.approve_brief(uuid, jsonb, text) to authenticated;

-- Generated concepts and versions -------------------------------------------
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  version int not null,
  parent_id uuid references public.concepts (id) on delete set null,
  brief_version int not null,
  image_path text not null,
  refinement text,
  what_changed jsonb not null default '[]'::jsonb,
  source text not null check (source in ('ai', 'demo')),
  model text,
  saved boolean not null default false,
  fidelity jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index concepts_owner_created on public.concepts (owner_id, created_at desc);

alter table public.concepts enable row level security;
create policy "concepts: owner read" on public.concepts for select to authenticated using ((select auth.uid()) = owner_id);
create policy "concepts: owner update" on public.concepts for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
-- Inserts come only from the edge function (service role); users may only
-- mark a concept saved or record their fidelity check.
revoke insert, update on public.concepts from authenticated, anon;
grant update (saved, fidelity) on public.concepts to authenticated;
grant delete on public.concepts to authenticated;
create policy "concepts: owner delete" on public.concepts for delete to authenticated using ((select auth.uid()) = owner_id);

alter table public.projects
  add constraint projects_current_concept_fk foreign key (current_concept_id) references public.concepts (id) on delete set null;

-- Private storage -------------------------------------------------------------
-- Objects are stored as <user id>/<project id>/<file>. The bucket is private;
-- the app only ever shows short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-photos', 'room-photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "room-photos: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "room-photos: owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "room-photos: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
