/**
 * Thin client for the public AnimeThemes.moe GraphQL API (song/artist/episode data + covers)
 * and AniList (episode counts + genres). Both allow browser requests, so everything runs
 * client-side and the site stays static.
 */

import { pickTitle } from './titles';
import { seasonYear } from './i18n';

const ANIMETHEMES = 'https://graphql.animethemes.moe/';
const ANILIST = 'https://graphql.anilist.co';

async function gql<T>(
  url: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  const json = await res.json();
  if (json.errors?.length && !json.data) throw new Error(json.errors[0].message);
  return json.data as T;
}

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

export interface AnimeCard {
  id: number;
  slug: string;
  title: { romaji: string; english: string | null; native?: string | null };
  year: number | null;
  seasonLocalized: string | null;
  formatLocalized: string | null;
  images: { nodes: { facet: string; link: string }[] };
}

export interface Performance {
  alias: string | null;
  as: string | null;
  artist: { name: { main: string; native: string | null }; slug: string };
}

export interface ThemeEntry {
  version: number;
  episodes: string | null;
  notes: string | null;
  spoiler: boolean;
  nsfw: boolean;
}

export interface Theme {
  id: number;
  type: 'OP' | 'ED' | 'IN';
  sequence: number | null;
  slug: string;
  group: { name: string } | null;
  song: {
    title: { romaji: string | null; native: string | null };
    performances: Performance[];
    resources: { nodes: { siteLocalized: string; link: string }[] };
  } | null;
  animethemeentries: ThemeEntry[];
}

export interface AnimeDetail extends AnimeCard {
  title: { romaji: string; english: string | null; native: string | null };
  synopsis: string | null;
  siteUrl: string;
  studios: { nodes: { name: string }[] };
  resources: { nodes: { site: string; externalId: number | null; link: string }[] };
  animethemes: Theme[];
}

export interface AniListInfo {
  episodes: number | null;
  status: string | null;
  genres: string[];
  nextAiringEpisode: { episode: number } | null;
  siteUrl: string;
  title: { native: string | null; english: string | null } | null;
}

// ---------------------------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------------------------

const CARD = `id slug title { romaji english native } year seasonLocalized formatLocalized
  images { nodes { facet link } }`;

export async function searchAnime(q: string, first = 24): Promise<AnimeCard[]> {
  const data = await gql<{ search: { anime: AnimeCard[] } }>(
    ANIMETHEMES,
    `query($q: String!, $first: Int) { search(search: $q, first: $first) { anime { ${CARD} } } }`,
    { q, first },
  );
  return data.search.anime;
}

/** One page of a season's anime, A–Z. */
export async function seasonAnime(
  year: number,
  season: string,
  first = 50,
  page = 1,
): Promise<{ list: AnimeCard[]; hasMore: boolean }> {
  const data = await gql<{
    animeyears: {
      season: { anime: { paginatorInfo: { hasMorePages: boolean }; data: AnimeCard[] } }[];
    }[];
  }>(
    ANIMETHEMES,
    `query($year: [Int!], $season: AnimeSeason, $first: Int, $page: Int) {
      animeyears(year: $year) { season(season: $season) {
        anime(first: $first, page: $page, sort: [TITLE_ROMAJI]) { paginatorInfo { hasMorePages } data { ${CARD} } }
      } }
    }`,
    { year: [year], season, first, page },
  );
  const a = data.animeyears[0]?.season[0]?.anime;
  return { list: a?.data ?? [], hasMore: !!a?.paginatorInfo.hasMorePages };
}

export interface SeasonRef {
  year: number;
  season: string;
}
const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
export function previousSeason({ year, season }: SeasonRef): SeasonRef {
  const i = SEASONS.indexOf(season);
  return i > 0 ? { year, season: SEASONS[i - 1] } : { year: year - 1, season: 'FALL' };
}
/** "Fall 2026" (or "2026年秋" in the Japanese interface). */
export function seasonName({ year, season }: SeasonRef) {
  return seasonYear(season, year);
}

/**
 * Most popular anime on AniList (by member count), mapped to their AnimeThemes entries. AniList
 * pages are 50 long; anime AnimeThemes doesn't list are skipped.
 */
export async function popularAnimePage(
  page: number,
): Promise<{ list: AnimeCard[]; hasMore: boolean }> {
  const al = await gql<{
    Page: { pageInfo: { hasNextPage: boolean }; media: { id: number }[] };
  }>(
    ANILIST,
    `query($page: Int) { Page(page: $page, perPage: 50) { pageInfo { hasNextPage }
      media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) { id } } }`,
    { page },
  );
  const ids = al.Page.media.map((m) => m.id);
  if (!ids.length) return { list: [], hasMore: false };
  // One filtered query (~1s) instead of 50 per-ID lookups (~15s). The filter matches external IDs
  // from every site, so keep only anime whose AniList ID is in the list, in popularity order.
  type Row = AnimeCard & { resources: { nodes: { externalId: number | null }[] } };
  const data = await gql<{ animePagination: { data: Row[] } }>(
    ANIMETHEMES,
    `query($ids: Mixed) {
      animePagination(first: 100, where: { HAS: { relation: "resources",
        condition: { column: "external_id", operator: IN, value: $ids } } }) {
        data { ${CARD} resources(site: ANILIST) { nodes { externalId } } }
      }
    }`,
    { ids },
  );
  const byId = new Map<number, AnimeCard>();
  for (const a of data.animePagination.data)
    for (const r of a.resources.nodes)
      if (r.externalId !== null && !byId.has(r.externalId)) byId.set(r.externalId, a);
  const seen = new Set<string>();
  const list: AnimeCard[] = [];
  for (const id of ids) {
    const a = byId.get(id);
    if (a && !seen.has(a.slug)) {
      seen.add(a.slug);
      list.push(a);
    }
  }
  return { list, hasMore: al.Page.pageInfo.hasNextPage };
}

/** Fetches several anime by slug in one request (GraphQL aliases). Missing slugs are dropped. */
export async function animeBySlugs(slugs: string[]): Promise<AnimeCard[]> {
  if (!slugs.length) return [];
  const fields = slugs.map((_, i) => `a${i}: anime(slug: $s${i}) { ${CARD} }`).join('\n');
  const vars = slugs.map((_, i) => `$s${i}: String!`).join(', ');
  const variables = Object.fromEntries(slugs.map((s, i) => [`s${i}`, s]));
  const data = await gql<Record<string, AnimeCard | null>>(
    ANIMETHEMES,
    `query(${vars}) { ${fields} }`,
    variables,
  );
  return slugs.map((_, i) => data[`a${i}`]).filter((a): a is AnimeCard => !!a);
}

export async function animeDetail(slug: string): Promise<AnimeDetail | null> {
  const data = await gql<{ anime: AnimeDetail | null }>(
    ANIMETHEMES,
    `query($slug: String!) {
      anime(slug: $slug) {
        ${CARD}
        title { romaji english native }
        synopsis siteUrl
        studios { nodes { name } }
        resources { nodes { site externalId link } }
        animethemes {
          id type sequence slug
          group { name }
          song {
            title { romaji native }
            performances { alias as artist { name { main native } slug } }
            resources { nodes { siteLocalized link } }
          }
          animethemeentries { version episodes notes spoiler nsfw }
        }
      }
    }`,
    { slug },
  );
  return data.anime;
}

/** Episode count + genres from AniList. Returns null on any failure — it's a nice-to-have. */
export async function aniListInfo(id: number): Promise<AniListInfo | null> {
  try {
    const data = await gql<{ Media: AniListInfo | null }>(
      ANILIST,
      `query($id: Int) { Media(id: $id, type: ANIME) { episodes status genres siteUrl nextAiringEpisode { episode } title { native english } } }`,
      { id },
    );
    return data.Media;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

export function cover(
  a: Pick<AnimeCard, 'images'>,
  prefer: 'LARGE_COVER' | 'SMALL_COVER' = 'LARGE_COVER',
) {
  const nodes = a.images?.nodes ?? [];
  return (
    nodes.find((n) => n.facet === prefer) ??
    nodes.find((n) => n.facet.endsWith('COVER')) ??
    nodes[0]
  )?.link;
}

/** Plain-text title in the viewer's chosen language (see titles.ts). */
export function displayTitle(a: Pick<AnimeCard, 'title'>) {
  return pickTitle(a.title);
}

export function currentSeason(d = new Date()): { year: number; season: string } {
  const m = d.getMonth(); // 0-11
  const season = m < 3 ? 'WINTER' : m < 6 ? 'SPRING' : m < 9 ? 'SUMMER' : 'FALL';
  return { year: d.getFullYear(), season };
}

/** Highest episode number mentioned in strings like "1-14, 16". */
export function maxEpisode(entries: ThemeEntry[]): number | null {
  let max: number | null = null;
  for (const e of entries) {
    for (const n of (e.episodes ?? '').match(/\d+/g) ?? []) {
      const v = Number(n);
      if (v > (max ?? 0) && v < 5000) max = v;
    }
  }
  return max;
}

/** Lowest episode a theme first appears in, if known. */
export function firstEpisode(entries: ThemeEntry[]): number | null {
  let min: number | null = null;
  for (const e of entries) {
    const m = (e.episodes ?? '').match(/\d+/);
    if (m && (min === null || Number(m[0]) < min)) min = Number(m[0]);
  }
  return min;
}

export function artistLine(p: Performance[]): string {
  return p
    .map((x) => {
      const name = x.alias || x.artist.name.main;
      return x.as ? `${name} (as ${x.as})` : name;
    })
    .join(', ');
}

/**
 * AniList member counts for a set of AnimeThemes slugs, used to sort filtered results by
 * popularity. Slugs without an AniList link are left out of the map.
 */
export async function popularityBySlugs(slugs: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!slugs.length) return out;
  const idBySlug = await aniListIdsBySlugs(slugs);
  // AniList popularity, 50 IDs per request.
  const ids = [...new Set(idBySlug.values())];
  const pop = new Map<number, number>();
  for (let i = 0; i < ids.length; i += 50) {
    const data = await gql<{ Page: { media: { id: number; popularity: number | null }[] } }>(
      ANILIST,
      `query($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { id popularity } } }`,
      { ids: ids.slice(i, i + 50) },
    );
    for (const m of data.Page.media) pop.set(m.id, m.popularity ?? 0);
  }
  for (const [slug, id] of idBySlug) out.set(slug, pop.get(id) ?? 0);
  return out;
}

export interface ExtraTitles {
  native: string | null;
  english: string | null;
}
const TITLE_CACHE_KEY = 'spoiler-gauge:anilist-titles';
let titleCache: Record<string, ExtraTitles> | null = null;
function readTitleCache(): Record<string, ExtraTitles> {
  if (titleCache) return titleCache;
  try {
    titleCache = JSON.parse(localStorage.getItem(TITLE_CACHE_KEY) ?? '{}');
  } catch {
    titleCache = {};
  }
  return (titleCache ??= {});
}
function writeTitleCache() {
  try {
    const entries = Object.entries(titleCache ?? {});
    // Keep the cache small: the most recent 2000 anime.
    localStorage.setItem(TITLE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries.slice(-2000))));
  } catch {
    /* storage full or blocked: lookups just aren't remembered */
  }
}

/**
 * Japanese/English titles from AniList for anime that AnimeThemes lacks them for (e.g. it has
 * no Japanese title for Overlord). Remembered per browser, so each anime is only looked up once.
 */
export async function aniListTitlesBySlugs(slugs: string[]): Promise<Map<string, ExtraTitles>> {
  const cache = readTitleCache();
  const out = new Map<string, ExtraTitles>();
  const missing = [...new Set(slugs)].filter((s) => {
    if (cache[s]) out.set(s, cache[s]);
    return !cache[s];
  });
  if (!missing.length) return out;
  const idBySlug = await aniListIdsBySlugs(missing);
  const ids = [...new Set(idBySlug.values())];
  const byId = new Map<number, ExtraTitles>();
  for (let i = 0; i < ids.length; i += 50) {
    const data = await gql<{
      Page: { media: { id: number; title: ExtraTitles }[] };
    }>(
      ANILIST,
      `query($ids: [Int]) { Page(perPage: 50) { media(id_in: $ids, type: ANIME) { id title { native english } } } }`,
      { ids: ids.slice(i, i + 50) },
    );
    for (const m of data.Page.media) byId.set(m.id, m.title);
  }
  for (const s of missing) {
    const id = idBySlug.get(s);
    const titles = (id && byId.get(id)) || { native: null, english: null };
    cache[s] = titles; // also remember "AniList has nothing", so we don't ask again
    out.set(s, titles);
  }
  writeTitleCache();
  return out;
}

/** AnimeThemes slug → AniList ID, 25 aliases per request. */
async function aniListIdsBySlugs(slugs: string[]): Promise<Map<string, number>> {
  const idBySlug = new Map<string, number>();
  for (let i = 0; i < slugs.length; i += 25) {
    const chunk = slugs.slice(i, i + 25);
    const fields = chunk
      .map(
        (_, j) =>
          `a${j}: anime(slug: $s${j}) { slug resources(site: ANILIST) { nodes { externalId } } }`,
      )
      .join('\n');
    const vars = chunk.map((_, j) => `$s${j}: String!`).join(', ');
    const data = await gql<
      Record<string, { slug: string; resources: { nodes: { externalId: number | null }[] } } | null>
    >(
      ANIMETHEMES,
      `query(${vars}) { ${fields} }`,
      Object.fromEntries(chunk.map((s, j) => [`s${j}`, s])),
    );
    for (const a of Object.values(data)) {
      const id = a?.resources.nodes.find((n) => n.externalId !== null)?.externalId;
      if (a && id) idBySlug.set(a.slug, id);
    }
  }
  return idBySlug;
}
