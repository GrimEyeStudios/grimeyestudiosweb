/**
 * Everything personal about the site lives here. Edit freely — no code changes needed.
 */
export type AppStatus = 'live' | 'coming-soon';

export interface AppConfig {
  title: string;
  url: string;
  status: AppStatus;
  blurb: string;
}

export const site = {
  name: 'Grimeye Studios',
  tagline: 'Art, games & tools by Liam Kaldes',
  owner: 'Liam Kaldes',
  email: 'lkaldes01@gmail.com',
  url: 'https://grimeyestudios.com',

  /** Shown on the About page. Leave empty to show the placeholder. */
  bio: '',

  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/liam-kaldes/' },
    { label: 'itch.io', href: 'https://grimeyestudios.itch.io/' },
  ],

  /**
   * Embedded web apps. Flip `status` to 'live' once the subdomain resolves and
   * the app allows being framed (see README → "Embedding the apps").
   */
  apps: {
    converter: {
      title: 'Playlist Converter',
      url: 'https://convert.grimeyestudios.com',
      status: 'coming-soon',
      blurb:
        'Paste a playlist link from one music service and rebuild it on another — Spotify, YouTube Music, Deezer, Tidal and more.',
    },
    splitter: {
      title: 'Playlist Splitter',
      url: 'https://split.grimeyestudios.com',
      status: 'coming-soon',
      blurb: 'Take one oversized playlist and split it into smaller ones by your own rules.',
    },
  } satisfies Record<string, AppConfig>,
};

export type AppKey = keyof typeof site.apps;
