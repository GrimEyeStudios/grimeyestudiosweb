/**
 * Games shown on /games. Add an entry, drop images in src/assets/games/, rebuild.
 * `screenshots` can be empty — the card then shows just the cover.
 */
import type { ImageMetadata } from 'astro';

import wheelCover from '../assets/games/wheel-spinner-cover.jpg';
import horseCover from '../assets/games/horse-race-cover.jpg';
import fffCover from '../assets/games/fast-food-frenzy-cover.jpg';
import fff1 from '../assets/games/fast-food-frenzy-1.jpg';
import fff2 from '../assets/games/fast-food-frenzy-2.jpg';
import fff3 from '../assets/games/fast-food-frenzy-3.jpg';
import fff4 from '../assets/games/fast-food-frenzy-4.jpg';
import fff5 from '../assets/games/fast-food-frenzy-5.jpg';
import shCover from '../assets/games/sprouting-hope-cover.png';
import sh1 from '../assets/games/sprouting-hope-1.png';
import sh2 from '../assets/games/sprouting-hope-2.png';
import sh3 from '../assets/games/sprouting-hope-3.png';

export interface Game {
  title: string;
  blurb: string;
  url: string;
  /** e.g. 'Released' | 'Prototype' | 'In development' */
  status: string;
  genre?: string;
  platforms: string[];
  madeWith?: string;
  /** Set when the game was a team project. */
  team?: string;
  cover?: ImageMetadata;
  screenshots: ImageMetadata[];
}

export const games: Game[] = [
  {
    title: 'Customizable Wheel Spinner',
    blurb:
      'A fully-featured spin wheel you can make your own. Add options with names and images, pick from four themes, weight the odds, and let fate decide.',
    url: 'https://grimeyestudios.itch.io/customizable-wheel-spinner',
    status: 'Released',
    genre: 'Tool',
    platforms: ['Web'],
    cover: wheelCover,
    screenshots: [],
  },
  {
    title: 'Horse Race',
    blurb:
      'Auto-played card game: guess which ace crosses the finish line first as cards are revealed from the deck.',
    url: 'https://grimeyestudios.itch.io/horse-race',
    status: 'Prototype',
    genre: 'Card Game',
    platforms: ['Web', 'Android'],
    madeWith: 'Unity',
    cover: horseCover,
    screenshots: [],
  },
  {
    title: 'Maze Game',
    blurb:
      'Find the keys scattered around a dark maze and escape through the exit before the entity catches you. First-person survival horror; a university class project.',
    url: 'https://grimeyestudios.itch.io/maze-game',
    status: 'Prototype',
    genre: 'Survival Horror',
    platforms: ['Web'],
    madeWith: 'Unity',
    screenshots: [],
  },
  {
    title: 'Fast Food Frenzy',
    blurb:
      "The world is overrun by mutated fast food and your boss isn't coming in today. Pick one of four classes and defend the restaurant, solo or with other staff. Inspired by Killing Floor 2 and CoD Zombies.",
    url: 'https://stepp-n.itch.io/fast-food-frenzy',
    status: 'In development',
    genre: 'Shooter / Survival',
    platforms: ['Windows'],
    team: 'Team project (7 devs)',
    cover: fffCover,
    screenshots: [fff1, fff2, fff3, fff4, fff5],
  },
  {
    title: 'Sprouting Hope',
    blurb:
      "A cozy pixel-art farming game. You're handed untouched land and two locals — a restaurant owner and an aid worker — who need your crops to feed all kinds of people.",
    url: 'https://xentios.itch.io/sprouting-hope',
    status: 'Prototype',
    genre: 'Farming / RPG',
    platforms: ['Windows'],
    madeWith: 'Unity',
    team: 'Team project (8 devs)',
    cover: shCover,
    screenshots: [sh1, sh2, sh3],
  },
];
