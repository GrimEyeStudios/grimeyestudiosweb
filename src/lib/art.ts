/**
 * Art gallery data, discovered from the filesystem.
 *
 *   src/art/<Universe Name>/<Piece Title>.jpg
 *   src/art/<Universe Name>/universe.json   (optional overrides)
 *
 * Folder name = universe title, file name = piece title. Drop images in, rebuild,
 * done. `universe.json` can override title/description/cover/order and give
 * individual pieces a title or caption — see README.
 */
import type { ImageMetadata } from 'astro';

export interface PieceMeta {
  title?: string;
  caption?: string;
  /** Lower numbers first; unlisted pieces sort by filename after these. */
  order?: number;
}

export interface UniverseMeta {
  title?: string;
  description?: string;
  /** File name (with extension) of the piece to use as the cover. Defaults to the first piece. */
  cover?: string;
  /** Lower numbers first on the home page. */
  order?: number;
  /** Per-file overrides keyed by file name, e.g. "TaliaFinal.jpg". */
  pieces?: Record<string, PieceMeta>;
}

export interface Piece {
  file: string;
  title: string;
  caption?: string;
  image: ImageMetadata;
}

export interface Universe {
  slug: string;
  dir: string;
  title: string;
  description?: string;
  order: number;
  cover: Piece;
  pieces: Piece[];
}

const images = import.meta.glob<{ default: ImageMetadata }>(
  '/src/art/*/*.{png,jpg,jpeg,webp,gif,avif}',
  { eager: true },
);
const metas = import.meta.glob<{ default: UniverseMeta }>('/src/art/*/universe.json', {
  eager: true,
});

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripExt(file: string): string {
  return file.replace(/\.[^.]+$/, '');
}

function build(): Universe[] {
  const byDir = new Map<string, { file: string; image: ImageMetadata }[]>();
  for (const [path, mod] of Object.entries(images)) {
    const [, dir, file] = path.match(/^\/src\/art\/([^/]+)\/([^/]+)$/) ?? [];
    if (!dir || !file) continue;
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push({ file, image: mod.default });
  }

  const universes: Universe[] = [];
  for (const [dir, files] of byDir) {
    const meta = metas[`/src/art/${dir}/universe.json`]?.default ?? {};
    const pieces: Piece[] = files
      .map(({ file, image }) => {
        const pm = meta.pieces?.[file] ?? {};
        return {
          file,
          title: pm.title ?? stripExt(file),
          caption: pm.caption,
          image,
          _order: pm.order ?? Number.POSITIVE_INFINITY,
        };
      })
      .sort((a, b) => a._order - b._order || a.file.localeCompare(b.file))
      .map(({ _order: _, ...p }) => p);

    if (pieces.length === 0) continue;
    const cover = pieces.find((p) => p.file === meta.cover) ?? pieces[0]!;
    universes.push({
      slug: slugify(meta.title ?? dir),
      dir,
      title: meta.title ?? dir,
      description: meta.description,
      order: meta.order ?? Number.POSITIVE_INFINITY,
      cover,
      pieces,
    });
  }

  return universes.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export const universes: Universe[] = build();

export function getUniverse(slug: string): Universe | undefined {
  return universes.find((u) => u.slug === slug);
}
