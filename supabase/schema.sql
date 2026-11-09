-- Spoiler Gauge — Supabase schema.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: everything is CREATE OR REPLACE / IF NOT EXISTS / DROP … IF EXISTS.
--
-- Data model: one row per (signed-in user, OP/ED). Themes and anime are identified by their
-- AnimeThemes.moe ids, so no anime data is stored here — only the community's ratings.
--
-- Security model
--   * Raw rows are only readable/writable by their author (row-level security).
--   * Everyone else only sees aggregates, through the SECURITY DEFINER functions below. They run
--     with an empty search_path and fully-qualified names, so they can't be hijacked by objects
--     created in other schemas.
--   * The database can't know which AnimeThemes ids are real, so anime-wide numbers (card
--     colours, "Most votes", the level filter) count PEOPLE, not rows: one account can move an
--     anime by at most one vote per spoiler level, however many rows it inserts.
--   * Per-account write limits (theme_votes_limits trigger) stop scripted flooding.
--   * Every vote is checked against AnimeThemes when it's saved (theme_votes_verify trigger): the
--     song must really belong to that anime. That also records whether it's an OP or ED, which
--     the card colours use. Needs the "http" extension (enabled below).

-- ---------------------------------------------------------------------------------------------
-- Votes
-- ---------------------------------------------------------------------------------------------

create table if not exists public.theme_votes (
  theme_id            integer     not null,               -- AnimeThemes animetheme.id
  anime_id            integer     not null,               -- AnimeThemes anime.id
  anime_slug          text        not null,               -- AnimeThemes anime.slug
  user_id             uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  -- 0 none · 1 characters · 2 scenes/events · 3 plot · 4 full season (see src/openings/spoilers.ts)
  spoiler_level       smallint    not null check (spoiler_level between 0 and 4),
  -- 0 = safe from the very start; N = safe once you've watched episode N; null = no opinion
  safe_after_episode  smallint    check (safe_after_episode between 0 and 2000),
  genre               text,
  -- 'OP' / 'ED' / 'IN', filled in by the verify trigger from AnimeThemes (never by the client)
  theme_type          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (theme_id, user_id)
);

-- Constraints are (re)declared by name so re-running this file upgrades older installs.
alter table public.theme_votes drop constraint if exists theme_votes_anime_slug_check;
alter table public.theme_votes drop constraint if exists theme_votes_slug_format;
alter table public.theme_votes add constraint theme_votes_slug_format
  check (anime_slug ~ '^[a-z0-9_]{1,200}$');

alter table public.theme_votes drop constraint if exists theme_votes_ids_positive;
alter table public.theme_votes add constraint theme_votes_ids_positive
  check (theme_id > 0 and anime_id > 0);

-- Genre is shown publicly, so only the fixed list from src/openings/spoilers.ts is allowed.
alter table public.theme_votes drop constraint if exists theme_votes_genre_check;
alter table public.theme_votes add constraint theme_votes_genre_check check (
  genre is null or genre in (
    'J-Pop', 'J-Rock', 'K-Pop', 'Anisong', 'Pop', 'Rock', 'Metal', 'Punk', 'Electronic', 'Hip-Hop',
    'R&B / Soul', 'Ballad', 'Idol', 'Vocaloid', 'City Pop', 'Jazz', 'Folk / Acoustic',
    'Orchestral', 'Other'
  )
);

alter table public.theme_votes add column if not exists theme_type text;
alter table public.theme_votes drop constraint if exists theme_votes_theme_type_check;
alter table public.theme_votes add constraint theme_votes_theme_type_check
  check (theme_type is null or theme_type in ('OP', 'ED', 'IN'));

create index if not exists theme_votes_anime_idx on public.theme_votes (anime_id);
create index if not exists theme_votes_slug_idx on public.theme_votes (anime_slug);
create index if not exists theme_votes_user_idx on public.theme_votes (user_id, created_at);

alter table public.theme_votes enable row level security;

-- Explicit grants, so this works with "Automatically expose new tables" turned off.
-- Signed-in users can touch the table (RLS below limits them to their own rows);
-- anonymous visitors only get the read functions further down.
revoke all on public.theme_votes from anon, authenticated;
grant select, insert, update, delete on public.theme_votes to authenticated;

drop policy if exists "read own votes" on public.theme_votes;
create policy "read own votes" on public.theme_votes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "insert own votes" on public.theme_votes;
create policy "insert own votes" on public.theme_votes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "update own votes" on public.theme_votes;
create policy "update own votes" on public.theme_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete own votes" on public.theme_votes;
create policy "delete own votes" on public.theme_votes
  for delete to authenticated using (user_id = auth.uid());

-- Keep updated_at honest and stop clients from back-dating rows.
create or replace function public.theme_votes_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists theme_votes_touch on public.theme_votes;
create trigger theme_votes_touch before insert or update on public.theme_votes
  for each row execute function public.theme_votes_touch();

-- ---------------------------------------------------------------------------------------------
-- Bookmarks (private to each user)
-- ---------------------------------------------------------------------------------------------

create table if not exists public.bookmarks (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  anime_slug  text        not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, anime_slug)
);

alter table public.bookmarks drop constraint if exists bookmarks_anime_slug_check;
alter table public.bookmarks drop constraint if exists bookmarks_slug_format;
alter table public.bookmarks add constraint bookmarks_slug_format
  check (anime_slug ~ '^[a-z0-9_]{1,200}$');

alter table public.bookmarks enable row level security;

revoke all on public.bookmarks from anon, authenticated;
grant select, insert, delete on public.bookmarks to authenticated;

drop policy if exists "read own bookmarks" on public.bookmarks;
create policy "read own bookmarks" on public.bookmarks
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "insert own bookmarks" on public.bookmarks;
create policy "insert own bookmarks" on public.bookmarks
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "delete own bookmarks" on public.bookmarks;
create policy "delete own bookmarks" on public.bookmarks
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------
-- Abuse limits. Generous for people, tight for scripts. The site shows a friendly message for
-- 'rate_limited' / 'too_many'.
-- ---------------------------------------------------------------------------------------------

create or replace function public.theme_votes_limits()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- New ratings per account per hour.
  if (select count(*) from public.theme_votes
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 300 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  -- Ratings per account per anime (One Piece has ~80 OPs/EDs; real shows stay well below).
  if (select count(*) from public.theme_votes
      where user_id = new.user_id and anime_slug = new.anime_slug) >= 200 then
    raise exception 'too_many' using errcode = 'P0001';
  end if;
  -- Ratings per account overall.
  if (select count(*) from public.theme_votes where user_id = new.user_id) >= 20000 then
    raise exception 'too_many' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists theme_votes_limits on public.theme_votes;
create trigger theme_votes_limits before insert on public.theme_votes
  for each row execute function public.theme_votes_limits();

create or replace function public.bookmarks_limits()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.bookmarks where user_id = new.user_id) >= 2000 then
    raise exception 'too_many' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists bookmarks_limits on public.bookmarks;
create trigger bookmarks_limits before insert on public.bookmarks
  for each row execute function public.bookmarks_limits();

-- ---------------------------------------------------------------------------------------------
-- Vote verification. Before a vote is stored, ask AnimeThemes for the anime's song list and make
-- sure the song id really belongs to it; take the anime id and OP/ED type from AnimeThemes too,
-- so nothing the client sends about the song is trusted. Unknown songs are rejected
-- ('invalid_theme'); if AnimeThemes can't be reached the vote fails ('verify_unavailable') and
-- the user can retry. Triggers fire alphabetically: limits → touch → verify, so rate-limited
-- requests never reach AnimeThemes.
-- ---------------------------------------------------------------------------------------------

create extension if not exists http with schema extensions;

create or replace function public.theme_votes_verify()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  resp extensions.http_response;
  body jsonb;
  anime jsonb;
  theme jsonb;
begin
  -- Edits that don't change which song this is keep the already-verified data.
  if tg_op = 'UPDATE' and old.theme_type is not null
     and new.theme_id = old.theme_id and new.anime_slug = old.anime_slug then
    new.theme_type := old.theme_type;
    new.anime_id := old.anime_id;
    return new;
  end if;

  begin
    perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '6000');
    select * into resp from extensions.http((
      'POST',
      'https://graphql.animethemes.moe/',
      array[
        extensions.http_header('Accept', 'application/json'),
        extensions.http_header('User-Agent', 'SpoilerGauge/1.0 (+https://grimeyestudios.com/openings/)')
      ],
      'application/json',
      jsonb_build_object(
        'query', 'query($s: String!) { anime(slug: $s) { id animethemes { id type } } }',
        'variables', jsonb_build_object('s', new.anime_slug)
      )::text
    )::extensions.http_request);
    body := resp.content::jsonb;
  exception when others then
    raise exception 'verify_unavailable' using errcode = 'P0001';
  end;

  if resp.status <> 200 then
    raise exception 'verify_unavailable' using errcode = 'P0001';
  end if;

  anime := body -> 'data' -> 'anime';
  if anime is null or jsonb_typeof(anime) <> 'object' then
    raise exception 'invalid_theme' using errcode = 'P0001';
  end if;

  select x into theme
  from jsonb_array_elements(anime -> 'animethemes') as x
  where (x ->> 'id')::integer = new.theme_id
  limit 1;
  if theme is null then
    raise exception 'invalid_theme' using errcode = 'P0001';
  end if;

  new.anime_id := (anime ->> 'id')::integer;
  new.theme_type := theme ->> 'type';
  return new;
end $$;

drop trigger if exists theme_votes_verify on public.theme_votes;
create trigger theme_votes_verify before insert or update on public.theme_votes
  for each row execute function public.theme_votes_verify();

-- Trigger functions are only for the triggers.
revoke all on function public.theme_votes_touch() from public, anon, authenticated;
revoke all on function public.theme_votes_limits() from public, anon, authenticated;
revoke all on function public.bookmarks_limits() from public, anon, authenticated;
revoke all on function public.theme_votes_verify() from public, anon, authenticated;

-- The site never needs to make web requests from the API roles; keep the http functions private.
do $$
declare fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'extensions' and p.proname like 'http%'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
    -- …but the verify trigger (owned by postgres) still needs them.
    execute format('grant execute on function %s to postgres', fn);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Public read API (callable with the anon key)
-- ---------------------------------------------------------------------------------------------

-- Per-song stats for every OP/ED of one anime. One row per (user, song) already, thanks to the
-- primary key, so these are true per-person counts:
-- { "<theme_id>": { "total": 12, "levels": [n0,n1,n2,n3,n4],
--                   "safe": { "<episode>": n, ... }, "genres": { "<genre>": n, ... } } }
create or replace function public.anime_theme_stats(p_anime_id integer)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_object_agg(t.theme_id::text, t.stats), '{}'::jsonb)
  from (
    select
      v.theme_id,
      jsonb_build_object(
        'total', count(*),
        'levels', jsonb_build_array(
          count(*) filter (where v.spoiler_level = 0),
          count(*) filter (where v.spoiler_level = 1),
          count(*) filter (where v.spoiler_level = 2),
          count(*) filter (where v.spoiler_level = 3),
          count(*) filter (where v.spoiler_level = 4)
        ),
        'safe', coalesce((
          select jsonb_object_agg(s.ep::text, s.n)
          from (
            select x.safe_after_episode as ep, count(*) as n
            from public.theme_votes x
            where x.theme_id = v.theme_id and x.safe_after_episode is not null
            group by x.safe_after_episode
          ) s
        ), '{}'::jsonb),
        'genres', coalesce((
          select jsonb_object_agg(g.genre, g.n)
          from (
            select x.genre, count(*) as n
            from public.theme_votes x
            where x.theme_id = v.theme_id and x.genre is not null
            group by x.genre
          ) g
        ), '{}'::jsonb)
      ) as stats
    from public.theme_votes v
    where v.anime_id = p_anime_id
    group by v.theme_id
  ) t;
$$;

drop view if exists public.anime_level_people;

-- Community notes were removed; drop what earlier versions of this file created.
drop function if exists public.anime_theme_notes(integer, integer);
alter table public.theme_votes drop column if exists note;

-- Most-rated anime (by number of people), paged, for the home page's "Most votes" sort.
-- (The one-argument version from earlier releases is dropped so calls aren't ambiguous.)
drop function if exists public.popular_anime(integer);
create or replace function public.popular_anime(p_limit integer default 12, p_offset integer default 0)
returns table (anime_slug text, votes bigint)
language sql stable security definer set search_path = ''
as $$
  select v.anime_slug, count(distinct v.user_id) as votes
  from public.theme_votes v
  where v.theme_type is not null
  group by v.anime_slug
  order by votes desc, max(v.updated_at) desc, v.anime_slug
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

-- How an anime card is coloured (one row per anime):
--   1. Each verified song gets its own top level: the level most people picked, ties → heavier.
--   2. If any opening is rated, levels[i] = how many OPENINGS have top level i.
--      Otherwise the same over the rated ENDINGS. Insert songs never count.
--   3. The card colour is the level most songs have, ties → heavier (topLevel() in
--      src/openings/spoilers.ts does this on the client from `levels`).
--   total = number of people who rated any of the anime's songs.
-- p_slugs = null means every rated anime. Internal; the public wrappers are below.
create or replace function public.anime_card_summary(p_slugs text[])
returns table (anime_slug text, levels integer[], total integer, top_level integer, basis text, last_vote timestamptz)
language sql stable security definer set search_path = ''
as $$
  with v as (
    select * from public.theme_votes x
    where x.theme_type in ('OP', 'ED')
      and (p_slugs is null or x.anime_slug = any (p_slugs))
  ),
  per_song as (
    select v.anime_slug, v.theme_id, v.theme_type,
      array[
        count(*) filter (where v.spoiler_level = 0),
        count(*) filter (where v.spoiler_level = 1),
        count(*) filter (where v.spoiler_level = 2),
        count(*) filter (where v.spoiler_level = 3),
        count(*) filter (where v.spoiler_level = 4)
      ]::integer[] as lv
    from v
    group by v.anime_slug, v.theme_id, v.theme_type
  ),
  song_top as (
    select p.anime_slug, p.theme_type,
      (select i - 1 from generate_subscripts(p.lv, 1) as i
        order by p.lv[i] desc, i desc limit 1) as top
    from per_song p
  ),
  basis as (
    select st.anime_slug,
      case when bool_or(st.theme_type = 'OP') then 'OP' else 'ED' end as basis
    from song_top st
    group by st.anime_slug
  ),
  counts as (
    select st.anime_slug, b.basis,
      array[
        count(*) filter (where st.top = 0),
        count(*) filter (where st.top = 1),
        count(*) filter (where st.top = 2),
        count(*) filter (where st.top = 3),
        count(*) filter (where st.top = 4)
      ]::integer[] as levels
    from song_top st
    join basis b on b.anime_slug = st.anime_slug and st.theme_type = b.basis
    group by st.anime_slug, b.basis
  ),
  people as (
    select v.anime_slug, count(distinct v.user_id)::integer as total, max(v.updated_at) as last_vote
    from v
    group by v.anime_slug
  )
  select c.anime_slug, c.levels, p.total,
    (select i - 1 from generate_subscripts(c.levels, 1) as i
      order by c.levels[i] desc, i desc limit 1) as top_level,
    c.basis, p.last_vote
  from counts c
  join people p on p.anime_slug = c.anime_slug;
$$;
revoke all on function public.anime_card_summary(text[]) from public, anon, authenticated;

-- Card colours for a batch of anime (capped at 100 per call).
create or replace function public.anime_card_stats(p_slugs text[])
returns table (anime_slug text, levels integer[], total integer)
language sql stable security definer set search_path = ''
as $$
  select s.anime_slug, s.levels, s.total
  from public.anime_card_summary(coalesce(p_slugs[1:100], '{}'::text[])) s;
$$;

-- Every rated anime whose card colour is one of p_levels (the home page's level filter).
-- Capped at 500; the page sorts the result itself.
create or replace function public.rated_anime_by_level(p_levels integer[])
returns table (anime_slug text, levels integer[], total integer, top_level integer)
language sql stable security definer set search_path = ''
as $$
  select s.anime_slug, s.levels, s.total, s.top_level
  from public.anime_card_summary(null) s
  where s.top_level = any (p_levels)
  order by s.total desc, s.last_vote desc
  limit 500;
$$;

revoke all on function public.anime_theme_stats(integer) from public;
revoke all on function public.popular_anime(integer, integer) from public;
revoke all on function public.anime_card_stats(text[]) from public;
revoke all on function public.rated_anime_by_level(integer[]) from public;
grant execute on function public.anime_theme_stats(integer) to anon, authenticated;
grant execute on function public.popular_anime(integer, integer) to anon, authenticated;
grant execute on function public.anime_card_stats(text[]) to anon, authenticated;
grant execute on function public.rated_anime_by_level(integer[]) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- One-time backfill: verify votes saved before verification existed. Votes for songs that
-- don't exist are deleted; if AnimeThemes is unreachable they're left for the next run.
-- ---------------------------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select theme_id, user_id from public.theme_votes where theme_type is null loop
    begin
      update public.theme_votes set theme_type = null
      where theme_id = r.theme_id and user_id = r.user_id;
    exception when others then
      if sqlerrm = 'invalid_theme' then
        delete from public.theme_votes where theme_id = r.theme_id and user_id = r.user_id;
      else
        raise notice 'Could not verify vote % yet: %', r.theme_id, sqlerrm;
      end if;
    end;
  end loop;
end $$;
