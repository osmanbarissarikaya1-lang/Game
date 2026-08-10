create table if not exists public.game_data (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references auth.users(id) on delete cascade,
 data jsonb not null default '{"states":[],"prices":{},"maint":{}}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.game_data enable row level security;
drop policy if exists "game_select_own" on public.game_data;
drop policy if exists "game_insert_own" on public.game_data;
drop policy if exists "game_update_own" on public.game_data;
drop policy if exists "game_delete_own" on public.game_data;
create policy "game_select_own" on public.game_data for select to authenticated using (auth.uid()=owner_id);
create policy "game_insert_own" on public.game_data for insert to authenticated with check (auth.uid()=owner_id);
create policy "game_update_own" on public.game_data for update to authenticated using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy "game_delete_own" on public.game_data for delete to authenticated using (auth.uid()=owner_id);
