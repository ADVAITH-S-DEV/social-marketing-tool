create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, email, password_hash)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email,
    'managed-by-supabase-auth'
  )
  on conflict (id) do update
    set username = excluded.username,
        email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.users (id, username, email, password_hash)
select
  au.id,
  coalesce(au.raw_user_meta_data ->> 'username', split_part(au.email, '@', 1)),
  au.email,
  'managed-by-supabase-auth'
from auth.users au
on conflict (id) do nothing;

alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.platform_accounts enable row level security;
alter table public.post_platform_targets enable row level security;

grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.platform_accounts to authenticated;
grant select, insert, update, delete on public.post_platform_targets to authenticated;

drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own posts" on public.posts;
drop policy if exists "Users can create own posts" on public.posts;
drop policy if exists "Users can update own posts" on public.posts;
drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can read own posts"
on public.posts
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own posts"
on public.posts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own posts"
on public.posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own posts"
on public.posts
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can manage own platform accounts" on public.platform_accounts;
create policy "Users can manage own platform accounts"
on public.platform_accounts
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage post targets for own posts" on public.post_platform_targets;
create policy "Users can manage post targets for own posts"
on public.post_platform_targets
for all
to authenticated
using (
  exists (
    select 1
    from public.posts posts_owner
    where posts_owner.id = post_id
      and posts_owner.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.posts posts_owner
    where posts_owner.id = post_id
      and posts_owner.user_id = auth.uid()
  )
);
