/**
 * Spoiler Gauge settings. The Supabase URL and publishable/anon key are designed to be public
 * (security comes from the row-level-security rules in supabase/schema.sql), so it's fine to
 * commit them here. Leave them empty and the site still browses, with voting disabled.
 *
 * You can also set PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY in a local .env instead.
 */
// Paste your values between the quotes (Supabase → Project Settings → API).
const PROJECT_URL = 'https://jruaixompzqmflsdegac.supabase.co';
const PUBLIC_KEY = 'sb_publishable_Se4xHHVhnjPZm5_FdbCIQQ_PZGS1bwg'; // the "anon" or "publishable" key — never the service_role / secret key

export const SUPABASE_URL: string = import.meta.env.PUBLIC_SUPABASE_URL || PROJECT_URL;
export const SUPABASE_ANON_KEY: string = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || PUBLIC_KEY;

export const gauge = {
  name: 'Spoiler Gauge',
  /** Site name in the Japanese interface. */
  nameJa: 'ネタバレゲージ',
  tagline: 'Is this opening safe to watch? Community spoiler ratings for every anime OP & ED.',
  /** URL prefix the whole tool lives under. Matches src/pages/openings/. */
  base: '/openings',
};

export const animeUrl = (slug: string) => `${gauge.base}/anime/?slug=${encodeURIComponent(slug)}`;
