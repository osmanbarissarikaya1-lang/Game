create table if not exists public.game_state (
  id bigint primary key,
  data jsonb not null default '{"states":[],"settings":{},"transfers":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.game_state enable row level security;

drop policy if exists "authenticated can read game state" on public.game_state;
create policy "authenticated can read game state" on public.game_state for select to authenticated using (true);

drop policy if exists "authenticated can insert game state" on public.game_state;
create policy "authenticated can insert game state" on public.game_state for insert to authenticated with check (true);

drop policy if exists "authenticated can update game state" on public.game_state;
create policy "authenticated can update game state" on public.game_state for update to authenticated using (true) with check (true);

grant select, insert, update on public.game_state to authenticated;

insert into public.game_state(id,data) values (1,'{"states":[],"settings":{},"transfers":[]}'::jsonb) on conflict(id) do nothing;
