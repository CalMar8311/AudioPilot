// reharmPresets.ts — 4 fixed, named chord-progression presets driving the
// Lower Deck's interactive 8-bar Roman-numeral harmonic timeline. Each preset
// carves an 8-bar loop into 1–2 bar chord blocks; chord names are resolved
// live against whatever root key the header currently shows, using the same
// semitone-offset chord math as harmonicTheoryEngine.ts (no duplicate logic).

import { parseRootKey, chordSymbol, type ChordQuality } from './harmonicTheoryEngine';

export interface ReharmBlock {
  /** Inclusive 1-indexed bar range within the 8-bar loop, e.g. [1, 2]. */
  bars: [number, number];
  /** Roman-numeral degree label shown on the block, e.g. "iv", "bVI", "V/ii". */
  romanNumeral: string;
  /** Semitones above the tonic pitch class (chromatic, mode-agnostic). */
  semitoneOffset: number;
  quality: ChordQuality;
  /** Optional chord-symbol suffix, e.g. "7" or "maj7". */
  extension?: string;
}

export interface ReharmPreset {
  id: string;
  label: string;
  blocks: ReharmBlock[];
}

export const REHARM_PRESETS: ReharmPreset[] = [
  {
    id: 'pop-trap',
    label: 'Standard Pop / Trap',
    blocks: [
      { bars: [1, 2], romanNumeral: 'i',   semitoneOffset: 0,  quality: 'min' },
      { bars: [3, 4], romanNumeral: 'VI',  semitoneOffset: 8,  quality: 'maj' },
      { bars: [5, 6], romanNumeral: 'III', semitoneOffset: 3,  quality: 'maj' },
      { bars: [7, 8], romanNumeral: 'VII', semitoneOffset: 10, quality: 'maj' },
    ],
  },
  {
    id: 'modal-interchange',
    label: 'Modal Interchange / Color Chords',
    blocks: [
      { bars: [1, 2], romanNumeral: 'iv',   semitoneOffset: 5,  quality: 'min' },
      { bars: [3, 4], romanNumeral: 'bVI',  semitoneOffset: 8,  quality: 'maj' },
      { bars: [5, 6], romanNumeral: 'bVII', semitoneOffset: 10, quality: 'maj' },
      { bars: [7, 8], romanNumeral: 'I',    semitoneOffset: 0,  quality: 'maj' },
    ],
  },
  {
    id: 'gospel-turnaround',
    label: 'Gospel Turnaround',
    blocks: [
      { bars: [1, 2], romanNumeral: 'ii',   semitoneOffset: 2, quality: 'min', extension: '7' },
      { bars: [3, 4], romanNumeral: 'V/ii', semitoneOffset: 9, quality: 'maj', extension: '7' },
      { bars: [5, 6], romanNumeral: 'ii',   semitoneOffset: 2, quality: 'min', extension: '7' },
      { bars: [7, 7], romanNumeral: 'V',    semitoneOffset: 7, quality: 'maj', extension: '7' },
      { bars: [8, 8], romanNumeral: 'I',    semitoneOffset: 0, quality: 'maj', extension: 'maj7' },
    ],
  },
  {
    id: '90s-soul',
    label: '90s Soul Neo-Classic',
    blocks: [
      { bars: [1, 2], romanNumeral: 'ii7',   semitoneOffset: 2, quality: 'min', extension: '7' },
      { bars: [3, 4], romanNumeral: 'V7',    semitoneOffset: 7, quality: 'maj', extension: '7' },
      { bars: [5, 6], romanNumeral: 'Imaj7', semitoneOffset: 0, quality: 'maj', extension: 'maj7' },
      { bars: [7, 8], romanNumeral: 'vi7',   semitoneOffset: 9, quality: 'min', extension: '7' },
    ],
  },
];

/** Cyan / magenta / coral cycle used to color each block's top accent bar. */
export const REHARM_BLOCK_COLORS = ['#06b6d4', '#d946ef', '#f87171'];

/** Resolves a block's chord symbol (e.g. "Fm", "Ab", "G7") against a root key string like "C Minor". */
export function resolveChordName(rootKey: string, block: ReharmBlock): string {
  const { semitone } = parseRootKey(rootKey);
  // Borrowed/modal-interchange & natural-minor chord degrees are conventionally
  // notated with flats (Ab, Bb, Eb…) unless the tonic itself is an explicitly
  // sharp key (F#, C#…), in which case sharp spelling reads more naturally.
  const preferFlats = !/[#♯]/.test(rootKey);
  const chordSemitone = (semitone + block.semitoneOffset) % 12;
  return chordSymbol(chordSemitone, block.quality, preferFlats, block.extension ?? '');
}
