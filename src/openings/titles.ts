/**
 * Title language preference: English ("Daemons of the Shadow Realm"), Romaji ("Yomi no Tsugai")
 * or Japanese script ("黄泉のツガイ"). Remembered per browser; missing titles fall back sensibly.
 *
 * Elements built with titled() carry every variant in data attributes, so switching the toggle
 * just rewrites their text (no refetching or re-rendering).
 */
import { h } from './dom';

export type TitlePref = 'english' | 'romaji' | 'native';
export const TITLE_PREFS: { value: TitlePref; label: string; title: string }[] = [
  { value: 'english', label: 'EN', title: 'English titles' },
  { value: 'romaji', label: 'Romaji', title: 'Japanese titles in English letters' },
  { value: 'native', label: '日本語', title: 'Japanese titles in Japanese script' },
];

export interface Titles {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
}

const KEY = 'spoiler-gauge:titles';
const EVENT = 'gauge:titles';

export function getTitlePref(): TitlePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'english' || v === 'romaji' || v === 'native') return v;
  } catch {
    /* storage blocked: use the default */
  }
  return 'english';
}

export function setTitlePref(pref: TitlePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* not remembered, but still applied to this page */
  }
  current = pref;
  refreshTitles();
  window.dispatchEvent(new CustomEvent(EVENT, { detail: pref }));
}

let current: TitlePref | null = null;
const pref = () => (current ??= getTitlePref());

/** The title to show for the current preference, falling back to whatever exists. */
export function pickTitle(t: Titles, p: TitlePref = pref()): string {
  const order: (keyof Titles)[] =
    p === 'english'
      ? ['english', 'romaji', 'native']
      : p === 'romaji'
        ? ['romaji', 'english', 'native']
        : ['native', 'romaji', 'english'];
  for (const k of order) if (t[k]) return t[k]!;
  return 'Untitled';
}

/** The other names an anime goes by, for a subtitle line (deduplicated, current one left out). */
export function otherTitles(t: Titles): string[] {
  const shown = pickTitle(t);
  return [t.english, t.romaji, t.native].filter(
    (x, i, all): x is string => !!x && x !== shown && all.indexOf(x) === i,
  );
}

/** An element whose text follows the title preference. */
export function titled<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> | null,
  t: Titles,
): HTMLElementTagNameMap[K] {
  const el = h(tag, attrs, pickTitle(t));
  el.dataset.tEn = t.english ?? '';
  el.dataset.tRo = t.romaji ?? '';
  el.dataset.tJp = t.native ?? '';
  return el;
}

export function refreshTitles(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-t-ro], [data-t-en], [data-t-jp]'))
    el.textContent = pickTitle({
      english: el.dataset.tEn,
      romaji: el.dataset.tRo,
      native: el.dataset.tJp,
    });
}

export function onTitlePrefChange(cb: (p: TitlePref) => void) {
  window.addEventListener(EVENT, (e) => cb((e as CustomEvent<TitlePref>).detail));
}
