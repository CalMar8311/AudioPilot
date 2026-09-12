import { GENRES } from '@/data/catalogs';
import { MAX_BLEND_SLOTS } from '@/engine/styleFusion';

export type GenreTaxonomyEntry = {
  subs: string[];
  crossoverSubs: string[];
};

/**
 * Native subgenres plus adjacent-family accents that can be borrowed for
 * true hybrids (Soul Trap, Ambient Drill, Latin Synthwave, etc.).
 * Keys match GenreDef.id in catalogs.ts.
 */
export const GENRE_TAXONOMY: Record<string, GenreTaxonomyEntry> = {
  hiphop: {
    subs: ['Boom-Bap', 'Trap', 'Drill', 'Lo-Fi Hip-Hop', 'Phonk', 'Hyperpop', 'Cloud Rap'],
    crossoverSubs: ['Soul', 'Neo-Soul Rhodes', 'Jersey Club', 'R&B Grooves', 'Neo-Soul'],
  },
  rnb: {
    subs: ['Neo-Soul', 'Vintage Motown', 'Contemporary R&B', 'Funk Groove', 'Soulful Vocals', 'Funk', 'Quiet Storm'],
    crossoverSubs: ['Trap 808s', 'Lo-Fi Tape', 'Slow Jam', 'Trap', 'Drill'],
  },
  electronic: {
    subs: ['Future Bass', 'UK Garage', 'House', 'Techno', 'Glitch', 'Trance', 'Drum & Bass', 'Garage', 'Ambient Techno'],
    crossoverSubs: ['Ambient Pads', 'Vaporwave', 'Soul', 'Latin Percussion'],
  },
  synthwave: {
    subs: ['Darksynth', 'Outrun', 'Retrowave', 'Chillwave', 'Cyberpunk'],
    crossoverSubs: ['Cyberpunk Bass', 'Gated Reverb', 'Latin Percussion', 'Trap'],
  },
  lofi: {
    subs: ['Lo-Fi Beats', 'Chillhop', 'Tape Saturation', 'Jazz Chops', 'Jazzhop', 'Bedroom Pop'],
    crossoverSubs: ['Boom-Bap Drums', 'Soul Chords', 'Trap', 'Neo-Soul'],
  },
  cyberpunk: {
    subs: ['Darksynth', 'Industrial', 'Glitch', 'Cyber Noir'],
    crossoverSubs: ['Drill', 'Ambient Pads', 'Gated Reverb', 'Trap'],
  },
  metal: {
    subs: ['Heavy', 'Death', 'Black', 'Djent', 'Metalcore', 'Symphonic'],
    crossoverSubs: ['Industrial', 'Orchestral Brass', 'Trap 808s', 'Glitch'],
  },
  cinematic: {
    subs: ['Epic Trailer', 'Score', 'Tension', 'Documentary', 'Action'],
    crossoverSubs: ['Ambient Pads', 'Hybrid Orchestral', 'Trap', 'Darksynth'],
  },
  orchestral: {
    subs: ['Symphonic', 'Chamber', 'Neo-Classical', 'Hybrid Orchestral'],
    crossoverSubs: ['Epic Trailer', 'Ambient Pads', 'Tape Saturation'],
  },
  afrobeat: {
    subs: ['Afrobeats', 'Amapiano', 'Afro-House', 'Gqom'],
    crossoverSubs: ['House', 'Trap', 'Soul', 'Jersey Club'],
  },
  'mid-east': {
    subs: ['Oud Fusion', 'Maqam Rhythms', 'Dabke', 'Sufi Trance'],
    crossoverSubs: ['Ambient Pads', 'Trap', 'House', 'Cinematic Score'],
  },
  'asian-fusion': {
    subs: ['Shamisen Rock', 'Erhu Fusion', 'Koto Ambient', 'Gagaku'],
    crossoverSubs: ['Lo-Fi Beats', 'Ambient Pads', 'Retrowave', 'Trap'],
  },
  latin: {
    subs: ['Reggaeton', 'Bachata', 'Salsa', 'Latin Trap', 'Bossanova'],
    crossoverSubs: ['House', 'Retrowave', 'Trap', 'Funk Groove', 'Outrun'],
  },
  country: {
    subs: ['Americana', 'Country Folk', 'Alt-Country', 'Roots Rock'],
    crossoverSubs: ['Soul', 'Lo-Fi Tape', 'Trap', 'Quiet Storm'],
  },
  blues: {
    subs: ['Chicago Blues', 'Delta Blues', 'Electric Blues', 'Blues Rock'],
    crossoverSubs: ['Soul', 'Funk Groove', 'Trap', 'Lo-Fi Tape'],
  },
  'yacht-rock': {
    subs: ['Yacht Rock', 'West Coast AOR', 'Soft Rock'],
    crossoverSubs: ['Neo-Soul', 'Boogie / Post-Disco', 'Chillwave', 'Soulful Vocals'],
  },
};

const MAX_FUSION_GENRES = Math.min(2, MAX_BLEND_SLOTS);
const MAX_SUBGENRE_ACCENTS = 2;

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  if (n <= 0 || arr.length === 0) return [];
  return shuffleInPlace([...arr]).slice(0, Math.min(n, arr.length));
}

function rollAccentCount(): number {
  const roll = Math.random();
  if (roll < 0.2) return 0;
  if (roll < 0.7) return 1;
  return MAX_SUBGENRE_ACCENTS;
}

/** Native catalog subs plus taxonomy subs/crossovers for a genre id. */
export function getFusionSubgenrePool(genreId: string): string[] {
  const catalog = GENRES.find((g) => g.id === genreId);
  const tax = GENRE_TAXONOMY[genreId];
  return Array.from(
    new Set([
      ...(catalog?.subgenres ?? []),
      ...(tax?.subs ?? []),
      ...(tax?.crossoverSubs ?? []),
    ])
  );
}

/** Every known fusion accent label (for prompt-state allowlists). */
export function getAllTaxonomySubgenres(): string[] {
  return Array.from(
    new Set(
      Object.keys(GENRE_TAXONOMY).flatMap((id) => getFusionSubgenrePool(id))
    )
  );
}

export type GenreFusionRoll = {
  genres: string[];
  subgenres: string[];
};

/**
 * Independent random fusion: 1–2 genres, 0–2 subgenre accents drawn from
 * native + adjacent-family pools. No hardcoded pairings (Trap is not tied to Phonk).
 */
export function rollIntelligentGenreFusion(): GenreFusionRoll {
  const genreCount = Math.random() < 0.4 ? MAX_FUSION_GENRES : 1;
  const picked = pickN(GENRES, genreCount);
  const genres = picked.map((g) => g.id);

  const pool = Array.from(new Set(genres.flatMap((id) => getFusionSubgenrePool(id))));
  const accentCount = rollAccentCount();
  const subgenres = pickN(pool, accentCount);

  return { genres, subgenres };
}
