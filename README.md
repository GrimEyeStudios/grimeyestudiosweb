# grimeyestudios.com

Portfolio site for Grimeye Studios. Static [Astro](https://astro.build) site, deployed to
GitHub Pages by GitHub Actions on every push to `main`.

| Tab        | Route               | Source                                    |
| ---------- | ------------------- | ----------------------------------------- |
| Art (home) | `/`, `/art/<slug>/` | `src/art/**` (auto-discovered)            |
| Games      | `/games/`           | `src/data/games.ts` + `src/assets/games/` |
| About      | `/about/`           | `src/site.config.ts`                      |

## Local development

Requires Node 24 (`.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:4321, live reload
make ci            # what CI runs: lint + format check + astro check + build
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
`docs:`, `chore:` …) — enforced by a commit-msg hook, installed automatically by `npm install`.

## Adding art

Every folder under `src/art/` is a **universe**; every image inside it is a **piece**.

```
src/art/
  Lilith's Gaze/
    universe.json        ← optional
    TaliaFinal.jpg
    Talia Sketch.jpg
  New Universe/          ← just make a folder
    anything.png
```

- Folder name → universe title and URL (`/art/new-universe/`).
- File name (minus extension) → piece title.
- Pieces sort by file name; universes sort by title. Rebuild (or let `npm run dev` reload) and it's live.
- Supported: `png jpg jpeg webp gif avif`. Any size — the build makes 400/800/1200px thumbnails
  and a 2000px lightbox copy, all WebP. Originals never ship to visitors.

`universe.json` (all keys optional):

```json
{
  "title": "Lilith's Gaze",
  "description": "One line shown on the home card and the gallery header.",
  "storyTitle": "Description",
  "story": "Longer write-up shown in a block at the top of the universe page.

Blank line = new paragraph. Leave empty to hide the block.",
  "cover": "TaliaFinal.jpg",
  "order": 1,
  "pieces": {
    "TaliaFinal.jpg": { "title": "Talia", "caption": "Final render", "order": 1 },
    "Talia Sketch.jpg": { "title": "Talia — pencil sketch" }
  }
}
```

`order` is "lower first"; anything without an order comes after, alphabetically.

`story` can also be an array of strings (one per paragraph) if you prefer that over `

`.
`storyTitle` is the block's heading and defaults to "Description".

## Adding a game

Add an object to the array in `src/data/games.ts` and import its images from
`src/assets/games/`. `screenshots: []` is fine — the card says "Screenshots coming soon".

## About page, socials, email, bio

All in `src/site.config.ts`. `bio` is empty on purpose; fill it in when ready.

## Deploying

### One-time setup

1. **Create the GitHub repo** (`GrimEyeStudios/grimeyestudiosweb`), push this folder to `main`.
2. **Repo → Settings → Pages → Build and deployment → Source: "GitHub Actions".**
3. **Repo → Settings → Pages → Custom domain:** `grimeyestudios.com` → Save. Tick
   **Enforce HTTPS** once the DNS check passes (can take up to an hour; the cert is automatic).
4. **GoDaddy DNS** (My Products → your domain → DNS → Manage zones). Delete any existing `A` record
   for `@` and the `CNAME` for `www` that GoDaddy parked there, then add:

   | Type  | Name | Value                    | TTL |
   | ----- | ---- | ------------------------ | --- |
   | A     | @    | 185.199.108.153          | 600 |
   | A     | @    | 185.199.109.153          | 600 |
   | A     | @    | 185.199.110.153          | 600 |
   | A     | @    | 185.199.111.153          | 600 |
   | CNAME | www  | grimeyestudios.github.io | 600 |

   `www.grimeyestudios.com` then redirects to the apex automatically.

### Every deploy after that

```bash
git add -A
git commit -m "feat(art): add new universe"
git push
```

CI runs `make ci`; if it passes on `main`, the `deploy` job publishes `dist/` to Pages. Pull
requests get the same checks without deploying. Watch it under the repo's **Actions** tab.

## Project layout

```
.github/workflows/ci.yml   CI + deploy (pinned action SHAs)
src/
  art/                     your artwork (see "Adding art")
  assets/brand/            logo
  assets/games/            game covers + screenshots
  components/              Nav, Footer, ArtGrid, Lightbox
  data/games.ts            games list
  layouts/Base.astro       <head>, nav, footer, OG/favicon
  lib/art.ts               folder → universe discovery
  pages/                   one file per route
  site.config.ts           name, bio, socials, email
  styles/global.css        design tokens (colours, fonts, spacing)
public/CNAME               custom domain for GitHub Pages
```
