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
    { class: 'g-card', href: animeUrl(a.slug), 'data-slug': a.slug },
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
 * Fills in Japanese/English titles AnimeThemes doesn't have (from AniList) for elements carrying
 * data-slug with a titled() child. Only runs when the current title setting needs them, e.g. a
 * Japanese title for Overlord when 日本語 is on.
 */
export async function fillMissingTitles(els: HTMLElement[]) {
  const pref = getTitlePref();
  if (pref === 'romaji') return; // AnimeThemes always has romaji
  const need = els.filter((el) => {
    const tt = el.querySelector<HTMLElement>('[data-t-ro]'); // all copies share the same data
    return el.dataset.slug && tt && !(pref === 'native' ? tt.dataset.tJp : tt.dataset.tEn);
  });
  if (!need.length) return;
  let found;
  try {
    found = await aniListTitlesBySlugs(need.map((el) => el.dataset.slug!));
  } catch {
    return; // keep the fallback title
  }
  for (const el of need) {
    const extra = found.get(el.dataset.slug!);
    if (!extra) continue;
    for (const tt of el.querySelectorAll<HTMLElement>('[data-t-ro]')) {
      if (!tt.dataset.tJp && extra.native) tt.dataset.tJp = extra.native;
      if (!tt.dataset.tEn && extra.english) tt.dataset.tEn = extra.english;
    }
    refreshTitles(el);
  }
}

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
  fillMissingTitles(cards); // runs alongside the vote lookup
  let stats;
  try {
    stats = await cardStats([...new Set(cards.map((c) => c.dataset.slug!))]);
  } catch {
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
