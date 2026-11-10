/**
 * Interface language. Japanese when the title toggle is on 日本語, English otherwise.
 *
 * - Script-rendered text uses t('key', vars).
 * - Static markup uses <T en="…" ja="…" /> (both are rendered; CSS shows one, keyed off
 *   <html lang>, which an inline script in GaugeLayout sets before the first paint).
 * - Attributes in static markup use data-i18n-placeholder / -title / -aria-label / data-i18n
 *   (text), filled in by applyI18n() on load.
 *
 * Switching between English and Japanese reloads the page, so everything is drawn once in the
 * right language; EN ⇄ Romaji stays instant because the interface language doesn't change.
 */
import { getTitlePref } from './titles';

export type Lang = 'en' | 'ja';
export const lang: Lang =
  typeof window !== 'undefined' && getTitlePref() === 'native' ? 'ja' : 'en';

type V = Record<string, string | number>;
type Entry = string | ((v: V) => string);
const s = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

const en = {
  // shared
  siteTitle: 'Spoiler Gauge — anime OP/ED spoiler ratings',
  brandHome: 'Spoiler Gauge home',
  searchAnime: 'Search anime',
  searchPlaceholderShort: 'Search anime…',
  search: 'Search',
  signIn: 'Sign in',
  signOut: 'Sign out',
  signedIn: 'Signed in',
  yourProfile: 'Your profile',
  findAnime: 'Find an anime',
  loading: 'Loading…',
  ratings: (v: V) => s(+v.n, 'voter', 'voters'),
  anime: (v: V) => s(+v.n, 'anime', 'anime'),
  titleLanguage: 'Title language',
  titleEn: 'English titles',
  titleRomaji: 'Japanese titles in English letters',
  titleNative: 'Japanese titles and Japanese interface',
  cardSize: 'Card size',
  adultToggleTitle: 'Show adult-themed anime such as ecchi (18+)',
  resultsAdultHidden: (v: V) => `${s(+v.shown, 'anime', 'anime')} · ${v.hidden} hidden (18+)`,
  allResultsAdult:
    'All results are adult-themed (18+) and hidden. Use the 18+ button in the header to show them.',
  adultGateTitle: 'Adult-themed anime (18+)',
  adultGateBody:
    'This anime is marked as adult-themed (for example ecchi), so it’s hidden while 18+ content is off.',
  adultGateButton: 'Show 18+ content',
  adultGateBack: 'Back to search',
  cardsSmall: 'Small cards, more per row',
  cardsLarge: 'Big cards, easier to read',
  cardsSmallShort: 'Small cards',
  cardsLargeShort: 'Big cards',

  // sign-in dialog
  signInToRate: 'Sign in to rate',
  signInBlurb: 'One vote per person per OP/ED. Your name is never shown next to your rating.',
  continueDiscord: 'Continue with Discord',
  continueGoogle: 'Continue with Google',
  cancel: 'Cancel',
  signInToBookmark: 'Sign in to bookmark.',
  rateLimited: 'You’re rating very quickly. Please wait a little and try again.',
  tooMany: 'You’ve reached the limit for this. Remove some old ones first.',
  invalidTheme: 'That song isn’t listed for this anime on AnimeThemes.moe, so it can’t be rated.',
  verifyUnavailable:
    'Couldn’t check this song with AnimeThemes.moe right now. Please try again in a minute.',
  signInToRateError: 'Sign in to rate.',

  // home
  homeSearchPlaceholder: 'Search an anime: Frieren, Demon Slayer, Jujutsu Kaisen',
  sortBy: 'Sort by',
  sortSeason: 'Latest season',
  sortPopular: 'Most popular',
  sortVotes: 'Most votes',
  filterGroup: 'Filter by spoiler level',
  filterHint: 'Click to show only anime mostly rated this way.',
  clearFilter: 'Clear filter',
  resultsFor: (v: V) => `Results for “${v.q}”`,
  resultsMatch: (v: V) => `${v.shown} of ${s(+v.n, 'anime', 'anime')} match`,
  noFilterMatches: 'None of these results match the selected spoiler levels.',
  nothingFound: 'Nothing found. Try the Japanese or English title.',
  searchFailed: (v: V) => `Search failed: ${v.msg}`,
  mostly: (v: V) => `Mostly ${v.levels}`,
  or: ' or ',
  noVotesYetSuffix: ' · no votes yet',
  couldntLoadMore: (v: V) => `Couldn’t load more (${v.msg}). `,
  tryAgain: 'Try again',
  thatsEverything: 'That’s everything.',
  noRatedMatch: 'No rated anime match the selected spoiler levels yet.',
  nothingToShow: 'Nothing to show.',
  cardMostly: (v: V) => `Mostly ${v.level} (${s(+v.n, 'voter', 'voters')})`,

  // suggestions
  seeAllResults: (v: V) => `See all results for “${v.q}”`,
  noQuickMatches: (v: V) => `No quick matches. Search for “${v.q}”`,
  searching: 'Searching…',
  cantReachAnimeThemes: 'Couldn’t reach AnimeThemes.moe.',
  suggestions: 'Suggestions',

  // profile
  profileTitle: 'Your profile',
  profileSignInBlurb:
    'Sign in to bookmark anime and keep track of the openings and endings you’ve rated.',
  accountsOff: 'Accounts aren’t switched on yet.',
  signedInWith: (v: V) => `Signed in with ${v.provider}`,
  bookmarks: 'Bookmarks',
  rated: 'Rated',
  noBookmarks: 'No bookmarks yet. Use the Bookmark button on any anime page.',
  noRated: 'You haven’t rated any openings or endings yet.',
  youRated: (v: V) => `You rated ${s(+v.n, 'song', 'songs')}`,
  removeBookmark: 'Remove bookmark',
  removeBookmarkFor: (v: V) => `Remove bookmark for ${v.title}`,
  couldntLoadList: (v: V) => `Couldn’t load this list (${v.msg}).`,

  // anime page
  opening: 'Opening',
  ending: 'Ending',
  insertSong: 'Insert song',
  openings: 'Openings',
  endings: 'Endings',
  artist: 'Artist',
  genre: 'Genre',
  type: 'Type',
  episodesLabel: 'Episodes',
  flags: 'Flags',
  listen: 'Listen',
  votes: (v: V) => s(+v.n, 'vote', 'votes'),
  thenGenre: (v: V) => `, then ${v.genre}`,
  notTagged: 'Not tagged yet',
  unknown: 'unknown',
  flaggedByEditors: 'Flagged by AnimeThemes.moe editors',
  animeThemesSpoiler: (v: V) => `AnimeThemes: spoiler (${v.versions})`,
  notRatedYet: 'Not rated yet',
  beFirst: (v: V) => `Be the first to say how spoiler-heavy this ${v.type} is.`,
  verdictLine: (v: V) =>
    `${s(+v.top, 'user', 'users')} of ${v.total} (${v.pct}%) say so · average ${v.avg}`,
  ratingsByLevel: 'Ratings by spoiler level',
  noSafeYet: 'No “safe after episode” recommendations yet.',
  firstAirs: (v: V) => `First airs with episode ${v.ep}.`,
  usersRecommendWait: (v: V) =>
    `${s(+v.n, 'user', 'users')} recommend${+v.n === 1 ? 's' : ''} waiting until after episode ${v.ep}.`,
  usersSafeFromStart: (v: V) =>
    `${s(+v.n, 'user', 'users')} say${+v.n === 1 ? 's' : ''} it’s safe from the start.`,
  median: (v: V) => `Median: ${v.value} · ${s(+v.n, 'recommendation', 'recommendations')}`,
  safeFromStartLower: 'safe from the start',
  afterEpisode: (v: V) => `after episode ${v.ep}`,
  histStart: 'Start',
  histEp: (v: V) => `Ep ${v.ep}`,
  votingOff: 'Voting isn’t switched on yet.',
  close: 'Close',
  editRating: 'Edit your rating',
  rateThis: 'Rate this',
  youChip: (v: V) => `You: ${v.level}${v.safe}`,
  youSafeStart: ', safe from start',
  youAfterEp: (v: V) => `, after ep ${v.ep}`,
  notSure: 'Not sure / no opinion',
  safeFromStart: 'Safe from the start',
  afterEpisodeOption: (v: V) => `After episode ${v.ep}`,
  skip: 'Skip',
  howSpoilerHeavy: (v: V) => `How spoiler-heavy is this ${v.type} for a first-time viewer?`,
  safeToWatchAfter: 'Safe to watch after…',
  itFirstAirs: (v: V) => `It first airs with episode ${v.ep}.`,
  pickEpisode: 'Pick the episode after which nothing is spoiled.',
  songGenre: 'Song genre',
  helpsGenre: 'Helps fill in the Genre field.',
  updateRating: 'Update rating',
  saveRating: 'Save rating',
  removeRating: 'Remove my rating',
  removing: 'Removing…',
  saving: 'Saving…',
  waitForEp: (v: V) => `Wait for ep ${v.ep}`,
  epsRange: (v: V) => `Eps ${v.eps}`,
  showDetails: 'Show details and rate',
  notRated: 'Not rated',
  collapse: 'Collapse',
  expandAll: 'Expand all',
  collapseAll: 'Collapse all',
  noneListed: (v: V) => `No ${v.what} listed on AnimeThemes.moe yet.`,
  docTitle: (v: V) => `${v.title} OP & ED spoilers · Spoiler Gauge`,
  episodeCount: (v: V) => s(+v.n, 'episode', 'episodes'),
  airing: 'Airing',
  readMore: 'Read more',
  showLess: 'Show less',
  coverAlt: (v: V) => `${v.title} cover`,
  bookmark: 'Bookmark',
  bookmarked: 'Bookmarked',
  ratingsOffline: 'Ratings are offline. ',
  ratingsOfflineBody: 'Song info still works, but community voting hasn’t been connected yet.',
  sections: 'Sections',
  couldntLoadRatings: 'Couldn’t load community ratings right now.',
  noAnimePicked: 'No anime picked',
  noAnimePickedBody: 'Search for a show to see its openings and endings.',
  couldntLoadAnime: 'Couldn’t load this anime',
  animeThemesDown: (v: V) => `AnimeThemes.moe didn’t respond (${v.msg}). Try again in a minute.`,
  animeNotFound: 'Anime not found',
  noSuchAnime: (v: V) => `There’s no anime with the id “${v.slug}”.`,
} satisfies Record<string, Entry>;

type Key = keyof typeof en;

const ja: Record<Key, Entry> = {
  siteTitle: 'ネタバレゲージ — アニメOP・EDのネタバレ度',
  brandHome: 'ネタバレゲージ ホーム',
  searchAnime: 'アニメを検索',
  searchPlaceholderShort: 'アニメを検索…',
  search: '検索',
  signIn: 'ログイン',
  signOut: 'ログアウト',
  signedIn: 'ログイン中',
  yourProfile: 'プロフィール',
  findAnime: 'アニメを探す',
  loading: '読み込み中…',
  ratings: (v) => `${v.n}人が評価`,
  anime: (v) => `${v.n}作品`,
  titleLanguage: 'タイトルの表示言語',
  titleEn: '英語タイトル',
  titleRomaji: 'ローマ字タイトル',
  titleNative: '日本語タイトル・日本語表示',
  cardSize: 'カードの大きさ',
  adultToggleTitle: 'エッチなど成人向けのアニメを表示（18歳以上）',
  resultsAdultHidden: (v) => `${v.shown}作品・${v.hidden}作品を非表示（18+）`,
  allResultsAdult:
    'すべての結果が成人向け（18+）のため非表示です。ヘッダーの18+ボタンで表示できます。',
  adultGateTitle: '成人向けのアニメ（18歳以上）',
  adultGateBody:
    'このアニメは成人向け（エッチなど）に分類されているため、18+表示がオフの間は非表示になっています。',
  adultGateButton: '18+コンテンツを表示',
  adultGateBack: '検索に戻る',
  cardsSmall: '小さいカード（たくさん表示）',
  cardsLarge: '大きいカード（読みやすい）',
  cardsSmallShort: '小さいカード',
  cardsLargeShort: '大きいカード',

  signInToRate: 'ログインして評価',
  signInBlurb: 'OP・EDごとに1人1票です。評価の横にあなたの名前が表示されることはありません。',
  continueDiscord: 'Discordで続ける',
  continueGoogle: 'Googleで続ける',
  cancel: 'キャンセル',
  signInToBookmark: 'ブックマークするにはログインしてください。',
  rateLimited: '短時間に評価しすぎています。しばらく待ってから再度お試しください。',
  tooMany: '上限に達しました。古いものを削除してから再度お試しください。',
  invalidTheme: 'この曲はAnimeThemes.moeでこのアニメに登録されていないため、評価できません。',
  verifyUnavailable:
    '現在AnimeThemes.moeで曲を確認できません。しばらくしてから再度お試しください。',
  signInToRateError: '評価するにはログインしてください。',

  homeSearchPlaceholder: 'アニメを検索：フリーレン、鬼滅の刃、呪術廻戦',
  sortBy: '並び替え',
  sortSeason: '新しいシーズン順',
  sortPopular: '人気順',
  sortVotes: '評価数順',
  filterGroup: 'ネタバレ度で絞り込む',
  filterHint: 'クリックすると、主にこの評価のアニメだけを表示します。',
  clearFilter: '絞り込みを解除',
  resultsFor: (v) => `「${v.q}」の検索結果`,
  resultsMatch: (v) => `${v.n}作品中 ${v.shown}作品が一致`,
  noFilterMatches: '選択したネタバレ度に一致する結果はありません。',
  nothingFound: '見つかりませんでした。日本語または英語のタイトルで試してください。',
  searchFailed: (v) => `検索に失敗しました：${v.msg}`,
  mostly: (v) => `主に${v.levels}`,
  or: '・',
  noVotesYetSuffix: '・まだ評価なし',
  couldntLoadMore: (v) => `読み込めませんでした（${v.msg}）。`,
  tryAgain: '再試行',
  thatsEverything: 'これで全部です。',
  noRatedMatch: '選択したネタバレ度に一致する評価済みのアニメはまだありません。',
  nothingToShow: '表示するものがありません。',
  cardMostly: (v) => `主に${v.level}（${v.n}人が評価）`,

  seeAllResults: (v) => `「${v.q}」の検索結果をすべて見る`,
  noQuickMatches: (v) => `候補がありません。「${v.q}」で検索`,
  searching: '検索中…',
  cantReachAnimeThemes: 'AnimeThemes.moe に接続できませんでした。',
  suggestions: '候補',

  profileTitle: 'プロフィール',
  profileSignInBlurb:
    'ログインすると、アニメをブックマークしたり、評価したOP・EDを確認したりできます。',
  accountsOff: 'アカウント機能はまだ有効になっていません。',
  signedInWith: (v) => `${v.provider}でログイン中`,
  bookmarks: 'ブックマーク',
  rated: '評価済み',
  noBookmarks:
    'ブックマークはまだありません。アニメのページにあるブックマークボタンを使ってください。',
  noRated: 'まだOP・EDを評価していません。',
  youRated: (v) => `${v.n}曲を評価済み`,
  removeBookmark: 'ブックマークを解除',
  removeBookmarkFor: (v) => `${v.title}のブックマークを解除`,
  couldntLoadList: (v) => `このリストを読み込めませんでした（${v.msg}）。`,

  opening: 'オープニング',
  ending: 'エンディング',
  insertSong: '挿入歌',
  openings: 'オープニング',
  endings: 'エンディング',
  artist: 'アーティスト',
  genre: 'ジャンル',
  type: '種類',
  episodesLabel: '使用話数',
  flags: 'フラグ',
  listen: '配信',
  votes: (v) => `${v.n}票`,
  thenGenre: (v) => `、次点：${v.genre}`,
  notTagged: 'まだタグなし',
  unknown: '不明',
  flaggedByEditors: 'AnimeThemes.moe の編集者によるフラグ',
  animeThemesSpoiler: (v) => `AnimeThemes：ネタバレあり（${v.versions}）`,
  notRatedYet: 'まだ評価がありません',
  beFirst: (v) => `この${v.type}のネタバレ度を最初に評価しましょう。`,
  verdictLine: (v) => `${v.total}人中${v.top}人（${v.pct}%）が評価・平均：${v.avg}`,
  ratingsByLevel: 'ネタバレ度別の評価',
  noSafeYet: '「何話から見て大丈夫か」の推奨はまだありません。',
  firstAirs: (v) => `第${v.ep}話から使用されています。`,
  usersRecommendWait: (v) => `${v.n}人が第${v.ep}話を見てからの視聴を推奨しています。`,
  usersSafeFromStart: (v) => `${v.n}人が最初から見ても大丈夫と言っています。`,
  median: (v) => `中央値：${v.value}・推奨${v.n}件`,
  safeFromStartLower: '最初から大丈夫',
  afterEpisode: (v) => `第${v.ep}話以降`,
  histStart: '最初',
  histEp: (v) => `第${v.ep}話`,
  votingOff: '投票機能はまだ有効になっていません。',
  close: '閉じる',
  editRating: '評価を編集',
  rateThis: '評価する',
  youChip: (v) => `あなた：${v.level}${v.safe}`,
  youSafeStart: '・最初から大丈夫',
  youAfterEp: (v) => `・第${v.ep}話以降`,
  notSure: 'わからない・特になし',
  safeFromStart: '最初から大丈夫',
  afterEpisodeOption: (v) => `第${v.ep}話以降`,
  skip: 'スキップ',
  howSpoilerHeavy: (v) => `初めて見る人にとって、この${v.type}のネタバレ度は？`,
  safeToWatchAfter: '何話から見て大丈夫？',
  itFirstAirs: (v) => `第${v.ep}話から使用されています。`,
  pickEpisode: 'ネタバレにならなくなる話数を選んでください。',
  songGenre: '曲のジャンル',
  helpsGenre: '「ジャンル」欄に反映されます。',
  updateRating: '評価を更新',
  saveRating: '評価を保存',
  removeRating: '評価を削除',
  removing: '削除中…',
  saving: '保存中…',
  waitForEp: (v) => `第${v.ep}話以降推奨`,
  epsRange: (v) => `第${v.eps}話`,
  showDetails: '詳細を見て評価する',
  notRated: '未評価',
  collapse: '閉じる',
  expandAll: 'すべて開く',
  collapseAll: 'すべて閉じる',
  noneListed: (v) => `AnimeThemes.moe に${v.what}はまだ登録されていません。`,
  docTitle: (v) => `${v.title} のOP・EDネタバレ度 · ネタバレゲージ`,
  episodeCount: (v) => `全${v.n}話`,
  airing: '放送中',
  readMore: '続きを読む',
  showLess: '閉じる',
  coverAlt: (v) => `${v.title}のカバー画像`,
  bookmark: 'ブックマーク',
  bookmarked: 'ブックマーク済み',
  ratingsOffline: '評価機能はオフラインです。',
  ratingsOfflineBody: '曲の情報は表示されますが、コミュニティ投票はまだ接続されていません。',
  sections: 'セクション',
  couldntLoadRatings: '現在コミュニティの評価を読み込めません。',
  noAnimePicked: 'アニメが選ばれていません',
  noAnimePickedBody: 'アニメを検索して、オープニングとエンディングを確認しましょう。',
  couldntLoadAnime: 'このアニメを読み込めませんでした',
  animeThemesDown: (v) =>
    `AnimeThemes.moe から応答がありません（${v.msg}）。しばらくしてから再度お試しください。`,
  animeNotFound: 'アニメが見つかりません',
  noSuchAnime: (v) => `「${v.slug}」というIDのアニメはありません。`,
};

export function t(key: Key, vars: V = {}): string {
  const e = (lang === 'ja' ? ja : en)[key];
  return typeof e === 'function' ? e(vars) : e;
}

// ---------------------------------------------------------------------------------------------
// Data labels that come from the APIs in English
// ---------------------------------------------------------------------------------------------

const SEASONS_JA: Record<string, string> = {
  WINTER: '冬',
  SPRING: '春',
  SUMMER: '夏',
  FALL: '秋',
};
/** "Fall" / "FALL" → "Fall" or "秋". */
export function seasonLabel(season: string | null | undefined): string {
  if (!season) return '';
  if (lang !== 'ja') return season[0].toUpperCase() + season.slice(1).toLowerCase();
  return SEASONS_JA[season.toUpperCase()] ?? season;
}
/** "Fall 2026" or "2026年秋". */
export function seasonYear(season: string | null | undefined, year: number | null | undefined) {
  if (lang === 'ja') return [year ? `${year}年` : '', seasonLabel(season)].join('');
  return [seasonLabel(season), year].filter(Boolean).join(' ');
}

const FORMATS_JA: Record<string, string> = {
  TV: 'TV',
  'TV Short': 'TVショート',
  OVA: 'OVA',
  Movie: '劇場版',
  Special: 'スペシャル',
  ONA: 'ONA',
};
export const formatLabel = (f: string | null | undefined) =>
  !f ? '' : lang === 'ja' ? (FORMATS_JA[f] ?? f) : f;

const GENRES_JA: Record<string, string> = {
  Action: 'アクション',
  Adventure: '冒険',
  Comedy: 'コメディ',
  Drama: 'ドラマ',
  Ecchi: 'エッチ',
  Fantasy: 'ファンタジー',
  Horror: 'ホラー',
  'Mahou Shoujo': '魔法少女',
  Mecha: 'メカ',
  Music: '音楽',
  Mystery: 'ミステリー',
  Psychological: 'サイコ',
  Romance: '恋愛',
  'Sci-Fi': 'SF',
  'Slice of Life': '日常',
  Sports: 'スポーツ',
  Supernatural: '超常現象',
  Thriller: 'スリラー',
};
export const animeGenreLabel = (g: string) => (lang === 'ja' ? (GENRES_JA[g] ?? g) : g);

const SONG_GENRES_JA: Record<string, string> = {
  'J-Pop': 'J-POP',
  'J-Rock': 'J-ROCK',
  'K-Pop': 'K-POP',
  Anisong: 'アニソン',
  Pop: 'ポップ',
  Rock: 'ロック',
  Metal: 'メタル',
  Punk: 'パンク',
  Electronic: 'エレクトロニック',
  'Hip-Hop': 'ヒップホップ',
  'R&B / Soul': 'R&B・ソウル',
  Ballad: 'バラード',
  Idol: 'アイドル',
  Vocaloid: 'ボカロ',
  'City Pop': 'シティポップ',
  Jazz: 'ジャズ',
  'Folk / Acoustic': 'フォーク・アコースティック',
  Orchestral: 'オーケストラ',
  Other: 'その他',
};
/** Song genres are stored in English; this is only the displayed label. */
export const songGenreLabel = (g: string) => (lang === 'ja' ? (SONG_GENRES_JA[g] ?? g) : g);

/** Fills in data-i18n* attributes on static markup. */
export function applyI18n(root: ParentNode = document) {
  if (lang === 'en') return;
  const attrs: [string, string][] = [
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-title', 'title'],
    ['data-i18n-aria-label', 'aria-label'],
  ];
  for (const [data, attr] of attrs)
    for (const el of root.querySelectorAll<HTMLElement>(`[${data}]`))
      el.setAttribute(attr, t(el.getAttribute(data) as Key));
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]'))
    el.textContent = t(el.dataset.i18n as Key);
}
