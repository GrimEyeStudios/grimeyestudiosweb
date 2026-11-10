import { h } from './dom';
import { animeUrl } from './config';
import { cover, aniListTitlesBySlugs, type AnimeCard } from './animethemes';
import { titled, refreshTitles, getTitlePref } from './titles';
import { cardStats } from './db';
import { SPOILER_LEVELS, topLevel } from './spoilers';
import { seasonYear, formatLabel } from './i18n';

/**
 * Anime cover card. `sub` is an optional extra line (e.g. "You rated 2"). Cards start neutral;
 * call colorCards() afterwards to tint them by community spoiler rating.
 */
export function animeCard(a: AnimeCard, sub?: string) {
  const img = cover(a);
  const meta = [seasonYear(a.seasonLocalized, a.year), formatLabel(a.formatLocalized)]
    .filter(Boolean)
    .join(' · ');
  return h(
    'a',
    // data-adult-pending: cover stays blurred until checkCards() knows whether it's adult-themed.
    { class: 'g-card', href: animeUrl(a.slug), 'data-slug': a.slug, 'data-adult-pending': '' },
    h(
      'div',
      { class: 'g-card-cover' },
      img &&
        h('img', {
          src: img,
          alt: '',
          loading: 'lazy',
          decoding: 'async',
          referrerpolicy: 'no-referrer',
        }),
      // Full name, revealed on hover/keyboard focus because long titles get cut off below.
      titled('span', { class: 'g-card-fulltitle', 'aria-hidden': 'true' }, a.title),
    ),
    h(
      'div',
      { class: 'g-card-body' },
      titled('div', { class: 'g-card-title' }, a.title),
      // Season/format + vote line move as one block, so even spacing never splits them.
      (meta || sub) &&
        h(
          'div',
          { class: 'g-card-sub' },
          meta && h('div', { class: 'g-card-meta' }, meta),
          sub && h('div', { class: 'g-card-votes' }, sub),
        ),
    ),
  );
}

/**
 * For every element carrying data-slug (cards, search suggestions), using AniList (cached per
 * browser):
 *   - marks adult-themed anime with data-adult="1" (CSS hides them unless 18+ content is on) and
 *     clears data-adult-pending, which keeps covers blurred until the answer is in;
 *   - fills in Japanese/English titles AnimeThemes lacks, for the current title setting.
 * If AniList can't be reached the item is treated as not adult, so the site keeps working.
 */
export async function checkCards(els: HTMLElement[]) {
  const items = els.filter((el) => el.dataset.slug);
  if (!items.length) return;
  let found: Awaited<ReturnType<typeof aniListTitlesBySlugs>> | null = null;
  try {
    found = await aniListTitlesBySlugs(items.map((el) => el.dataset.slug!));
  } catch {
    /* fall through: unknown = not adult, keep fallback titles */
  }
  const pref = getTitlePref();
  for (const el of items) {
    const extra = found?.get(el.dataset.slug!);
    el.dataset.adult = extra?.adult ? '1' : '0';
    delete el.dataset.adultPending;
    if (!extra || pref === 'romaji') continue; // AnimeThemes always has romaji
    for (const tt of el.querySelectorAll<HTMLElement>('[data-t-ro]')) {
      if (!tt.dataset.tJp && extra.native) tt.dataset.tJp = extra.native;
      if (!tt.dataset.tEn && extra.english) tt.dataset.tEn = extra.english;
    }
    refreshTitles(el);
  }
}

/** Whether 18+ content is switched on (set on <html> by the header toggle). */
export const adultOn = () => document.documentElement.dataset.adult === 'on';

/**
 * Colour-codes every card by its anime's spoiler level (see anime_card_summary in
 * supabase/schema.sql). Unrated anime stay neutral. Failures are silent: colours are a bonus.
 */
export async function colorCards(target: ParentNode | HTMLElement[] | null) {
  if (!target) return;
  const cards = Array.isArray(target)
    ? target.filter((c) => c.matches('.g-card[data-slug]'))
    : [...target.querySelectorAll<HTMLElement>('.g-card[data-slug]')];
  if (!cards.length) return;
  // The adult check runs alongside the vote lookup; callers can rely on both being done.
  const checked = checkCards(cards);
  let stats;
  try {
    stats = await cardStats([...new Set(cards.map((c) => c.dataset.slug!))]);
    await checked;
  } catch {
    await checked;
    for (const card of cards) card.dataset.level = 'none';
    return;
  }
  for (const card of cards) {
    const s = stats.get(card.dataset.slug!);
    const top = topLevel(s?.levels);
    card.querySelector('.g-card-level')?.remove();
    // Read by the home page's level filter ("0"–"4", or "none" when unrated) and vote sort.
    card.dataset.level = top === null ? 'none' : String(top);
    card.dataset.total = String(s?.total ?? 0);
    if (!s || top === null) continue;
    const lv = SPOILER_LEVELS[top];
    card.classList.add('rated');
    card.style.setProperty('--c', lv.color);
    card
      .querySelector('.g-card-cover')
      ?.append(h('span', { class: 'g-card-level' }, lv.short, h('small', null, String(s.total))));
  }
}

export function skeletonCards(n = 12) {
  return Array.from({ length: n }, () =>
    h(
      'div',
      { class: 'g-card', 'aria-hidden': 'true' },
      h('div', { class: 'g-card-cover g-skeleton' }),
    ),
  );
}
