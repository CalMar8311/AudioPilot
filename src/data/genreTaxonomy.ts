/**
 * Genre Taxonomy & Cross-genre Fusion Engine
 *
 * Keys in SUBGENRE_MAP_BY_LABEL match GenreDef.label strings from catalogs.ts so the
 * dice / Surprise Me roll can look up a pool by the label shown in the UI.  Each entry
 * combines native sub-styles with adjacent-family crossover accents, enabling true
 * hybrids like Soul Trap, Ambient Drill, Latin Synthwave, etc.
 *
 * No pairings are hard-coded: the roll picks freely from the full pool, so Trap will NOT
 * always land on Phonk — every click genuinely shuffles.
 */

import { GENRES } from '@/data/catalogs';

// ─── Subgenre map keyed by genre LABEL (matches what the UI pills display) ─────────────

export const SUBGENRE_MAP: Record<string, string[]> = {
  'Hip-Hop / Trap': [
    'Boom-Bap', 'Trap', 'Drill', 'Lo-Fi Hip-Hop', 'Phonk', 'Hyperpop', 'Cloud Rap',
    'Soul', 'R&B Chords', 'Neo-Soul Rhodes', 'Jersey Club', 'R&B Grooves',
  ],
  'R&B / Funk': [
    'Neo-Soul', 'Vintage Motown', 'Soul', 'Contemporary R&B',
    'Funk Groove', 'Soulful Vocals', 'Funk', 'Quiet Storm',
    'Trap 808s', 'Lo-Fi Tape', 'Slow Jam', 'Trap', 'Drill',
  ],
  'Electronic': [
    'Future Bass', 'UK Garage', 'House', 'Techno', 'Glitch',
    'Trance', 'Drum & Bass', 'Garage', 'Ambient Techno',
    'Ambient Pads', 'Vaporwave', 'Soul', 'Latin Percussion',
  ],
  'Synthwave': [
    'Darksynth', 'Outrun', 'Retrowave', 'Chillwave', 'Cyberpunk',
    'Cyberpunk Bass', 'Gated Reverb', 'Latin Percussion', 'Trap',
  ],
  'Lo-Fi': [
    'Lo-Fi Beats', 'Chillhop', 'Tape Saturation', 'Jazz Chops', 'Jazzhop', 'Bedroom Pop',
    'Boom-Bap Drums', 'Soul Chords', 'Trap', 'Neo-Soul',
  ],
  'Cyberpunk': [
    'Darksynth', 'Industrial', 'Glitch', 'Cyber Noir',
    'EBM', 'Midtempo Bass', 'Dark Synth', 'Drill', 'Ambient Pads',
  ],
  'Metal': [
    'Heavy', 'Death', 'Black', 'Djent', 'Metalcore', 'Symphonic',
    'Nu-Metal', 'Trap Metal', 'Doom', 'Industrial', 'Orchestral Brass',
  ],
  'Cinematic': [
    'Epic Trailer', 'Score', 'Tension', 'Documentary', 'Action',
    'Orchestral Hybrid', 'Trailer Brass', 'Epic Percussion', 'Ambient Textures',
    'Hybrid Orchestral', 'Ambient Pads', 'Darksynth',
  ],
  'Orchestral': [
    'Symphonic', 'Chamber', 'Neo-Classical', 'Hybrid Orchestral',
    'Epic Trailer', 'Ambient Pads', 'Tape Saturation',
  ],
  'Afrobeat': [
    'Afrobeats', 'Amapiano', 'Afro-House', 'Gqom',
    'House', 'Trap', 'Soul', 'Jersey Club',
  ],
  'Middle Eastern': [
    'Oud Fusion', 'Maqam Rhythms', 'Dabke', 'Sufi Trance',
    'Ambient Pads', 'Trap', 'House', 'Cinematic Score',
  ],
  'Asian Traditional': [
    'Shamisen Rock', 'Erhu Fusion', 'Koto Ambient', 'Gagaku',
    'Lo-Fi Beats', 'Ambient Pads', 'Retrowave', 'Trap',
  ],
  'Latin': [
    'Reggaeton', 'Bachata', 'Salsa', 'Latin Trap', 'Bossanova',
    'House', 'Retrowave', 'Trap', 'Funk Groove', 'Outrun',
  ],
  'Country / Americana': [
    'Americana', 'Country Folk', 'Alt-Country', 'Roots Rock',
    'Soul', 'Lo-Fi Tape', 'Trap', 'Quiet Storm',
  ],
  'Blues': [
    'Chicago Blues', 'Delta Blues', 'Electric Blues', 'Blues Rock',
    'Soul', 'Funk Groove', 'Trap', 'Lo-Fi Tape',
  ],
  'Late 70s West Coast AOR, Soft Rock, Smooth Melodic Rock': [
    'Yacht Rock', 'West Coast AOR', 'Soft Rock',
    'Neo-Soul', 'Boogie / Post-Disco', 'Chillwave', 'Soulful Vocals',
  ],
};

// ID-keyed alias (catalogs.ts uses GenreDef.id like 'hiphop', 'rnb', etc.)
const ID_TO_LABEL: Record<string, string> = {};
for (const g of GENRES) {
  ID_TO_LABEL[g.id] = g.label;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────────────

/** Fisher-Yates in-place shuffle. */
function fisherYates<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick up to n distinct elements at random from arr. */
function pickN<T>(arr: readonly T[], n: number): T[] {
  if (n <= 0 || arr.length === 0) return [];
  return fisherYates([...arr]).slice(0, Math.min(n, arr.length));
}

/**
 * Determine how many subgenre accents to add.
 * 25% → 0,  45% → 1,  30% → 2.
 */
function rollAccentCount(): number {
  const roll = Math.random();
  if (roll < 0.25) return 0;
  if (roll < 0.70) return 1;
  return 2;
}

/** Full subgenre pool for a genre by its catalog ID (native catalog subs + taxonomy pool). */
export function getFusionSubgenrePool(genreId: string): string[] {
  const catalogGenre = GENRES.find((g) => g.id === genreId);
  const label = ID_TO_LABEL[genreId] ?? '';
  const taxonomyPool = SUBGENRE_MAP[label] ?? [];
  return Array.from(
    new Set([...(catalogGenre?.subgenres ?? []), ...taxonomyPool])
  );
}

/** Every distinct subgenre label known to the taxonomy (for allowlisting in normalizePromptState). */
export function getAllTaxonomySubgenres(): string[] {
  return Array.from(
    new Set([
      ...GENRES.flatMap((g) => g.subgenres),
      ...Object.values(SUBGENRE_MAP).flat(),
    ])
  );
}

// ─── Roll interface ──────────────────────────────────────────────────────────────────────

export type GenreFusionRoll = {
  /** Catalog GenreDef.id strings (e.g. 'hiphop', 'rnb'). */
  genres: string[];
  /** Subgenre label strings drawn from the fused pool. */
  subgenres: string[];
};

/**
 * One-click intelligent fusion roll:
 * • 60% → 1 primary genre,  40% → 2-genre hybrid.
 * • Subgenre pool = full taxonomy pool for all selected genres, merged & deduped.
 * • 25% 0 accents · 45% 1 accent · 30% 2 accents — chosen by independent Fisher-Yates
 *   shuffle each time, so Trap will NOT always pair with Phonk.
 */
export function rollIntelligentGenreFusion(): GenreFusionRoll {
  const MAX_GENRES = 2;
  const genreCount = Math.random() < 0.4 ? MAX_GENRES : 1;
  const picked = pickN(GENRES, genreCount);
  const genres = picked.map((g) => g.id);

  // Build a combined, deduped pool from all picked genres.
  const pool = Array.from(new Set(genres.flatMap((id) => getFusionSubgenrePool(id))));

  const accentCount = rollAccentCount();
  // Fisher-Yates sort into a new array — no hardcoded companions.
  const subgenres = [...pool].sort(() => 0.5 - Math.random()).slice(0, accentCount);

  return { genres, subgenres };
}
