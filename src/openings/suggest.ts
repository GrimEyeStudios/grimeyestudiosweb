/**
 * Search-as-you-type suggestions for the header search box (every page except home, which has its
 * own full results grid). Accessible combobox: ↑/↓ to move, Enter to open, Esc to close.
 */
import { searchAnime, cover, type AnimeCard } from './animethemes';
import { titled, otherTitles } from './titles';
import { fillMissingTitles } from './cards';
import { t, seasonYear, formatLabel } from './i18n';
import { animeUrl, gauge } from './config';
import { h, mount } from './dom';

const MAX = 8;
const DEBOUNCE_MS = 250;

export function setupSuggest(input: HTMLInputElement, list: HTMLElement) {
  const form = input.form!;
  let items: AnimeCard[] = [];
  let active = -1;
  let seq = 0;
  let timer: number | undefined;
  const cache = new Map<string, AnimeCard[]>();

  const open = () => {
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };

  const allResultsUrl = (q: string) => `${gauge.base}/?q=${encodeURIComponent(q)}`;

  function setActive(i: number) {
    const options = [...list.querySelectorAll<HTMLElement>('[role="option"]')];
    if (!options.length) return;
    active = (i + options.length) % options.length;
    options.forEach((o, j) => o.setAttribute('aria-selected', String(j === active)));
    input.setAttribute('aria-activedescendant', options[active].id);
    options[active].scrollIntoView({ block: 'nearest' });
  }

  function render(q: string) {
    active = -1;
    input.removeAttribute('aria-activedescendant');
    const options = items.map((a, i) => {
      const img = cover(a, 'SMALL_COVER') ?? cover(a);
      const meta = [seasonYear(a.seasonLocalized, a.year), formatLabel(a.formatLocalized)]
        .filter(Boolean)
        .join(' · ');
      const alt = otherTitles(a.title)[0] ?? null;
      return h(
        'li',
        { role: 'option', id: `hq-opt-${i}`, 'aria-selected': 'false', 'data-slug': a.slug },
        h(
          'a',
          { href: animeUrl(a.slug), tabindex: '-1' },
          h(
            'span',
            { class: 'g-suggest-cover' },
            img && h('img', { src: img, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }),
          ),
          h(
            'span',
            { class: 'g-suggest-text' },
            titled('span', { class: 'g-suggest-title' }, a.title),
            h('span', { class: 'g-suggest-meta' }, [alt, meta].filter(Boolean).join(' · ')),
          ),
        ),
      );
    });
    const all = h(
      'li',
      {
        role: 'option',
        id: `hq-opt-${items.length}`,
        'aria-selected': 'false',
        class: 'g-suggest-all',
      },
      h(
        'a',
        { href: allResultsUrl(q), tabindex: '-1' },
        items.length ? t('seeAllResults', { q }) : t('noQuickMatches', { q }),
      ),
    );
    mount(list, options, all);
    fillMissingTitles(options);
    open();
  }

  async function lookup(q: string) {
    const mine = ++seq;
    const key = q.toLowerCase();
    let found = cache.get(key);
    if (!found) {
      if (list.hidden || !list.childElementCount) {
        mount(list, h('li', { class: 'g-suggest-status' }, t('searching')));
        open();
      }
      try {
        found = (await searchAnime(q, MAX)).slice(0, MAX);
      } catch {
        if (mine === seq) {
          mount(list, h('li', { class: 'g-suggest-status' }, t('cantReachAnimeThemes')));
          open();
        }
        return;
      }
      cache.set(key, found);
    }
    if (mine !== seq || input.value.trim() !== q) return;
    items = found;
    render(q);
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) {
      seq++;
      close();
      return;
    }
    timer = window.setTimeout(() => lookup(q), DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (e) => {
    if (list.hidden) {
      if (e.key === 'ArrowDown' && input.value.trim().length >= 2) {
        e.preventDefault();
        lookup(input.value.trim());
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      const link = list.querySelectorAll<HTMLAnchorElement>('[role="option"] a')[active];
      if (link) location.href = link.href;
    }
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2 && list.childElementCount) open();
  });

  // Close when clicking or tabbing anywhere outside the search box.
  document.addEventListener('pointerdown', (e) => {
    if (!form.contains(e.target as Node)) close();
  });
  form.addEventListener('focusout', (e) => {
    if (!form.contains(e.relatedTarget as Node | null)) close();
  });

  // Plain Enter (nothing highlighted) still goes to the full results page.
  form.addEventListener('submit', () => close());
}
