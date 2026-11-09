/** Supabase access for Spoiler Gauge: auth + votes. See supabase/schema.sql. */
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { t } from './i18n';

export const votingEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;
export function db(): SupabaseClient | null {
  if (!votingEnabled) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
  return client;
}

export type Provider = 'discord' | 'google';

export async function currentUser(): Promise<User | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session?.user ?? null;
}

export function onAuthChange(cb: (user: User | null) => void) {
  db()?.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null));
}

export async function signIn(provider: Provider) {
  await db()?.auth.signInWithOAuth({ provider, options: { redirectTo: location.href } });
}

export async function signOut() {
  await db()?.auth.signOut();
}

export function userLabel(u: User): string {
  const m = u.user_metadata ?? {};
  return (
    m.custom_claims?.global_name || m.full_name || m.name || m.user_name || u.email || t('signedIn')
  );
}

// ---------------------------------------------------------------------------------------------

export interface ThemeStats {
  total: number;
  levels: number[]; // length 5
  safe: Record<string, number>;
  genres: Record<string, number>;
}

export interface MyVote {
  theme_id: number;
  spoiler_level: number;
  safe_after_episode: number | null;
  genre: string | null;
}

export async function animeStats(animeId: number): Promise<Record<string, ThemeStats>> {
  const c = db();
  if (!c) return {};
  const { data, error } = await c.rpc('anime_theme_stats', { p_anime_id: animeId });
  if (error) throw error;
  return (data ?? {}) as Record<string, ThemeStats>;
}

export async function myVotes(animeId: number): Promise<MyVote[]> {
  const c = db();
  const user = await currentUser();
  if (!c || !user) return [];
  const { data, error } = await c
    .from('theme_votes')
    .select('theme_id, spoiler_level, safe_after_episode, genre')
    .eq('anime_id', animeId)
    .eq('user_id', user.id);
  if (error) throw error;
  return (data ?? []) as MyVote[];
}

/** Turns the database's abuse-limit errors into readable messages. */
function friendly(error: { message?: string }): Error {
  if (error.message?.includes('rate_limited')) return new Error(t('rateLimited'));
  if (error.message?.includes('too_many')) return new Error(t('tooMany'));
  if (error.message?.includes('invalid_theme')) return new Error(t('invalidTheme'));
  if (error.message?.includes('verify_unavailable')) return new Error(t('verifyUnavailable'));
  return error instanceof Error ? error : new Error(error.message ?? 'Error');
}

export async function saveVote(v: MyVote & { anime_id: number; anime_slug: string }) {
  const c = db();
  const user = await currentUser();
  if (!c || !user) throw new Error(t('signInToRateError'));
  const { error } = await c
    .from('theme_votes')
    .upsert({ ...v, user_id: user.id }, { onConflict: 'theme_id,user_id' });
  if (error) throw friendly(error);
}

export async function deleteVote(themeId: number) {
  const c = db();
  const user = await currentUser();
  if (!c || !user) return;
  const { error } = await c
    .from('theme_votes')
    .delete()
    .eq('theme_id', themeId)
    .eq('user_id', user.id);
  if (error) throw error;
}

export async function popularAnime(
  limit = 12,
  offset = 0,
): Promise<{ anime_slug: string; votes: number }[]> {
  const c = db();
  if (!c) return [];
  type Row = { anime_slug: string; votes: number };
  const { data, error } = await c.rpc('popular_anime', { p_limit: limit, p_offset: offset });
  if (error?.code === 'PGRST202') {
    // Database still has the older one-argument version (schema.sql not re-run): one page only.
    if (offset > 0) return [];
    const old = await c.rpc('popular_anime', { p_limit: Math.min(limit, 50) });
    if (old.error) throw old.error;
    return (old.data ?? []) as Row[];
  }
  if (error) throw error;
  return (data ?? []) as Row[];
}

// ---------------------------------------------------------------------------------------------
// Card colours, bookmarks, profile
// ---------------------------------------------------------------------------------------------

export interface CardStats {
  anime_slug: string;
  levels: number[];
  total: number;
}

/** Overall spoiler-level totals for a batch of anime (for colour-coding cards). */
export async function cardStats(slugs: string[]): Promise<Map<string, CardStats>> {
  const c = db();
  const out = new Map<string, CardStats>();
  if (!c || !slugs.length) return out;
  for (let i = 0; i < slugs.length; i += 100) {
    const { data, error } = await c.rpc('anime_card_stats', { p_slugs: slugs.slice(i, i + 100) });
    if (error) throw error;
    for (const row of (data ?? []) as CardStats[]) out.set(row.anime_slug, row);
  }
  return out;
}

export async function isBookmarked(slug: string): Promise<boolean> {
  const c = db();
  const user = await currentUser();
  if (!c || !user) return false;
  const { data, error } = await c
    .from('bookmarks')
    .select('anime_slug')
    .eq('user_id', user.id)
    .eq('anime_slug', slug)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function setBookmark(slug: string, on: boolean) {
  const c = db();
  const user = await currentUser();
  if (!c || !user) throw new Error(t('signInToBookmark'));
  const { error } = on
    ? await c
        .from('bookmarks')
        .upsert({ user_id: user.id, anime_slug: slug }, { onConflict: 'user_id,anime_slug' })
    : await c.from('bookmarks').delete().eq('user_id', user.id).eq('anime_slug', slug);
  if (error) throw friendly(error);
}

/** The signed-in user's bookmarks, newest first. */
export async function myBookmarks(): Promise<{ anime_slug: string; created_at: string }[]> {
  const c = db();
  const user = await currentUser();
  if (!c || !user) return [];
  const { data, error } = await c
    .from('bookmarks')
    .select('anime_slug, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface MyRatedAnime {
  anime_slug: string;
  count: number;
  updated_at: string;
}

/** Every anime the signed-in user has rated at least one OP/ED of, most recent first. */
export async function myRatedAnime(): Promise<MyRatedAnime[]> {
  const c = db();
  const user = await currentUser();
  if (!c || !user) return [];
  const { data, error } = await c
    .from('theme_votes')
    .select('anime_slug, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const by = new Map<string, MyRatedAnime>();
  for (const r of (data ?? []) as { anime_slug: string; updated_at: string }[]) {
    const cur = by.get(r.anime_slug);
    if (cur) cur.count++;
    else by.set(r.anime_slug, { anime_slug: r.anime_slug, count: 1, updated_at: r.updated_at });
  }
  return [...by.values()];
}

export function userAvatar(u: User): string | null {
  const url = u.user_metadata?.avatar_url || u.user_metadata?.picture;
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
}

export interface RatedAnime {
  anime_slug: string;
  levels: number[];
  total: number;
  top_level: number;
}

/** All rated anime (up to 500) whose majority spoiler level is one of `levels`, most votes first. */
export async function ratedAnimeByLevel(levels: number[]): Promise<RatedAnime[]> {
  const c = db();
  if (!c || !levels.length) return [];
  const { data, error } = await c.rpc('rated_anime_by_level', { p_levels: levels });
  if (error) throw error;
  return (data ?? []) as RatedAnime[];
}
