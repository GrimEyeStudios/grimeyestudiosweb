import { lang } from './i18n';

/**
 * The spoiler scale. Index = value stored in theme_votes.spoiler_level, so don't reorder —
 * only edit labels/descriptions.
 */
export interface SpoilerLevel {
  value: number;
  label: string;
  short: string;
  description: string;
  color: string;
  /** Japanese interface text. */
  ja: { label: string; short: string; description: string };
}

/** Both languages; static markup renders both (see <T>). Scripts use SPOILER_LEVELS below. */
export const SPOILER_LEVELS_ALL: SpoilerLevel[] = [
  {
    value: 0,
    label: 'No spoilers',
    short: 'None',
    description: "Nothing a first-time viewer wouldn't already know from episode 1.",
    color: '#3ecf8e',
    ja: { label: 'ネタバレなし', short: 'なし', description: '第1話を見ていれば分かる内容のみ。' },
  },
  {
    value: 1,
    label: 'Character spoilers',
    short: 'Characters',
    description: "Shows characters, forms or designs that haven't been introduced yet.",
    color: '#b6d94c',
    ja: {
      label: 'キャラクターのネタバレ',
      short: 'キャラ',
      description: 'まだ登場していないキャラクターや、姿・デザインが映る。',
    },
  },
  {
    value: 2,
    label: 'Scene / event spoilers',
    short: 'Scenes',
    description:
      'Shows specific later scenes, fights or locations, without spelling out what they mean.',
    color: '#f5c542',
    ja: {
      label: 'シーン・展開のネタバレ',
      short: 'シーン',
      description: '後半のシーン・戦闘・場所が映るが、その意味までは明かさない。',
    },
  },
  {
    value: 3,
    label: 'Plot spoilers',
    short: 'Plot',
    description: 'Gives away twists, deaths, betrayals or who ends up on which side.',
    color: '#f5813f',
    ja: {
      label: 'ストーリーのネタバレ',
      short: 'ストーリー',
      description: 'どんでん返し、死亡、裏切り、誰がどちら側につくかなどが分かる。',
    },
  },
  {
    value: 4,
    label: 'Full season spoilers',
    short: 'Full season',
    description: 'Basically summarises the season or arc, ending included.',
    color: '#ef4565',
    ja: {
      label: 'シーズン全体のネタバレ',
      short: 'シーズン全体',
      description: '結末も含めて、シーズンやアーク全体をほぼ要約している。',
    },
  },
];

/** The scale in the current interface language. */
export const SPOILER_LEVELS: SpoilerLevel[] =
  lang === 'ja' ? SPOILER_LEVELS_ALL.map((l) => ({ ...l, ...l.ja })) : SPOILER_LEVELS_ALL;

/** Song genres users can tag an OP/ED with. Free to add more; stored as plain text. */
export const SONG_GENRES = [
  'J-Pop',
  'J-Rock',
  'K-Pop',
  'Anisong',
  'Pop',
  'Rock',
  'Metal',
  'Punk',
  'Electronic',
  'Hip-Hop',
  'R&B / Soul',
  'Ballad',
  'Idol',
  'Vocaloid',
  'City Pop',
  'Jazz',
  'Folk / Acoustic',
  'Orchestral',
  'Other',
];

/**
 * The level most users picked. Ties go to the heavier level: when the community is split, it's
 * safer to warn. Returns null when there are no votes.
 */
export function topLevel(levels: number[] | undefined): number | null {
  if (!levels?.length) return null;
  let best = -1;
  let bestN = 0;
  levels.forEach((n, i) => {
    if (n > 0 && n >= bestN) {
      best = i;
      bestN = n;
    }
  });
  return best < 0 ? null : best;
}
