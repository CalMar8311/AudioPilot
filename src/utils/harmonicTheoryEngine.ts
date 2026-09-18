// Music Theory Engine — procedurally computes musically-valid harmonization ideas
// (relative-key mediant pivots, modal interchange, jazz/neo-soul reharmonization, and
// vocal harmony stacking) for a detected key, instead of pulling from static template
// text. All chord math below runs on real functional-harmony rules (semitone/interval
// arithmetic over the major & natural-minor scales), seeded by a PRNG so results stay
// varied and reproducible per "roll".

export type Scale = 'major' | 'minor';

export interface HarmonicTheoryInput {
  /** Root note of the detected key, e.g. "C", "F#", "B♭". */
  rootKey: string;
  scale: Scale;
  /** Optional literal chord names from the detected progression (e.g. ["F#m7", "Bm7", "E7", "AMaj7"]). */
  detectedChords?: string[];
}

export type HarmonizationTechniqueId =
  | 'relative-mediant-shift'
  | 'modal-interchange'
  | 'jazz-neo-soul-reharm'
  | 'vocal-harmony-stacking';

export interface HarmonizationResult {
  id: HarmonizationTechniqueId;
  label: string;
  /** "Chord Movement / Theory Breakdown" — plain-English explanation of the move. */
  theoryBreakdown: string;
  /** "Suno Style Prompt Tag" — short, comma-separated descriptor for the style prompt box. */
  stylePromptTag: string;
  /** "Suno Bracket Tag" — a ready-to-inject Suno metatag. */
  bracketTag: string;
  /** Roman-numeral chord movement summary, when the technique produces one. */
  romanProgression?: string;
}

// ————————————————————————————————————————————————————————————————————————
// Note / chord name helpers
// ————————————————————————————————————————————————————————————————————————

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

const LETTER_BASE_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export type ChordQuality = 'maj' | 'min' | 'dim';

/** Parses a root note like "F#", "B♭", "Bb", "C" into a semitone index (0–11) + accidental preference. */
export function parseRootKey(rootKey: string): { semitone: number; preferFlats: boolean } {
  const cleaned = rootKey.trim();
  const match = cleaned.match(/^([A-Ga-g])\s*([#♯b♭]?)/);
  if (!match) return { semitone: 0, preferFlats: false };

  const letter = match[1].toUpperCase();
  const accidental = match[2];
  let semitone = LETTER_BASE_SEMITONES[letter] ?? 0;
  let preferFlats = false;

  if (accidental === '#' || accidental === '♯') {
    semitone = (semitone + 1) % 12;
  } else if (accidental === 'b' || accidental === '♭') {
    semitone = (semitone + 11) % 12;
    preferFlats = true;
  }

  return { semitone, preferFlats };
}

/** Splits a full key string like "F# Minor" / "B♭ Major" into { rootKey, scale }. */
export function parseKeyString(keyString: string): { rootKey: string; scale: Scale } {
  const trimmed = (keyString || '').trim();
  const match = trimmed.match(/^(.*?)\s*(major|minor|maj|min)\s*$/i);
  if (!match || !match[1].trim()) {
    return { rootKey: trimmed || 'C', scale: 'major' };
  }
  const rootKey = match[1].trim();
  const scale: Scale = /^min/i.test(match[2]) ? 'minor' : 'major';
  return { rootKey, scale };
}

export function formatNote(semitone: number, preferFlats: boolean): string {
  const normalized = ((semitone % 12) + 12) % 12;
  return (preferFlats ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP)[normalized];
}

export function chordSymbol(semitone: number, quality: ChordQuality, preferFlats: boolean, extension: string = ''): string {
  const name = formatNote(semitone, preferFlats);
  const qualitySuffix = quality === 'min' ? 'm' : quality === 'dim' ? '°' : '';
  return `${name}${qualitySuffix}${extension}`;
}

// ————————————————————————————————————————————————————————————————————————
// Seeded PRNG (same LCG family used by the remix engine, kept local so this
// module has no runtime dependency on it).
// ————————————————————————————————————————————————————————————————————————

export function hashStringToSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function createSeededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function random() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ————————————————————————————————————————————————————————————————————————
// a) Relative / Mediant Shift
//    Major key: tonicize the relative minor as a vi chord: vi - IV - V - I
//    Minor key: pivot up to the relative major as a VI chord: VI - v - i
// ————————————————————————————————————————————————————————————————————————

function computeRelativeMediantShift(input: HarmonicTheoryInput): HarmonizationResult {
  const { semitone: rootSemitone, preferFlats } = parseRootKey(input.rootKey);
  const isMajor = input.scale === 'major';
  const rootName = formatNote(rootSemitone, preferFlats);

  if (isMajor) {
    // Relative minor of a major key sits a minor third below the tonic (root + 9 semitones).
    const relativeSemitone = (rootSemitone + 9) % 12;
    const ivSemitone = (rootSemitone + 5) % 12;
    const vSemitone = (rootSemitone + 7) % 12;

    const relativeChord = chordSymbol(relativeSemitone, 'min', preferFlats, '9');
    const ivChord = chordSymbol(ivSemitone, 'maj', preferFlats, 'maj9');
    const vChord = chordSymbol(vSemitone, 'maj', preferFlats, '11');
    const romanProgression = 'vi - IV - V - I';

    return {
      id: 'relative-mediant-shift',
      label: 'Relative / Mediant Shift',
      theoryBreakdown: `Tonicize the relative minor as a vi chord, then resolve home: ${relativeChord} (vi) → ${ivChord} (IV) → ${vChord} (V) → ${rootName} (I). A classic mediant pivot that briefly borrows the relative minor's color before landing back on the tonic.`,
      stylePromptTag: 'relative-minor mediant pivot, lush upper-extension voicings (maj9, 11th)',
      bracketTag: `[Bridge: Chord substitution ${romanProgression} with lush upper extensions (maj9, 11th)]`,
      romanProgression,
    };
  }

  // Relative major of a minor key sits a minor third above the tonic (root + 3 semitones).
  const relativeSemitone = (rootSemitone + 3) % 12;
  const vSemitone = (rootSemitone + 7) % 12;

  const relativeChord = chordSymbol(relativeSemitone, 'maj', preferFlats, 'maj9');
  const vChord = chordSymbol(vSemitone, 'min', preferFlats, '11');
  const rootChord = chordSymbol(rootSemitone, 'min', preferFlats, '9');
  const romanProgression = 'VI - v - i';

  return {
    id: 'relative-mediant-shift',
    label: 'Relative / Mediant Shift',
    theoryBreakdown: `Pivot up to the relative major's tonic as a VI chord before falling back home: ${relativeChord} (VI) → ${vChord} (v) → ${rootChord} (i). Mediant motion that brightens the minor tonic on its way back to i.`,
    stylePromptTag: 'relative-major mediant pivot, lush upper-extension voicings (maj9, 11th)',
    bracketTag: `[Bridge: Chord substitution ${romanProgression} with lush upper extensions (maj9, 11th)]`,
    romanProgression,
  };
}

// ————————————————————————————————————————————————————————————————————————
// b) Modal Interchange (Color Chords)
//    Major key: borrow iv, ♭VI, ♭VII from the parallel minor.
//    Minor key: Picardy third resolution (i → I), or the Dorian ♮6 brightening iv → IV.
// ————————————————————————————————————————————————————————————————————————

function computeModalInterchange(input: HarmonicTheoryInput, random: () => number): HarmonizationResult {
  const { semitone: rootSemitone, preferFlats } = parseRootKey(input.rootKey);
  const isMajor = input.scale === 'major';
  const rootName = formatNote(rootSemitone, preferFlats);

  if (isMajor) {
    // Borrowed from the parallel natural minor: iv (minor), ♭VI (major), ♭VII (major).
    const ivMinorSemitone = (rootSemitone + 5) % 12;
    const bVISemitone = (rootSemitone + 8) % 12;
    const bVIISemitone = (rootSemitone + 10) % 12;

    const ivMinorChord = chordSymbol(ivMinorSemitone, 'min', preferFlats);
    const bVIChord = chordSymbol(bVISemitone, 'maj', preferFlats);
    const bVIIChord = chordSymbol(bVIISemitone, 'maj', preferFlats);
    const romanProgression = 'iv - ♭VI - ♭VII - I';

    return {
      id: 'modal-interchange',
      label: 'Modal Interchange (Color Chords)',
      theoryBreakdown: `Borrow color chords from the parallel ${rootName} minor: drop in ${ivMinorChord} (iv) for a bittersweet lift, or run the plagal-gospel slide ${bVIChord} (♭VI) → ${bVIIChord} (♭VII) → ${rootName} (I) for a darker, rock/gospel-tinted cadence.`,
      stylePromptTag: 'modal interchange, borrowed minor iv & ♭VI-♭VII color chords',
      bracketTag: `[Verse: Modal interchange — borrowed ${ivMinorChord} (iv) color chord]`,
      romanProgression,
    };
  }

  // Minor key: randomly favor either the Picardy third or the Dorian natural 6th.
  const usePicardy = random() < 0.5;
  const rootMinorChord = chordSymbol(rootSemitone, 'min', preferFlats);

  if (usePicardy) {
    const picardyChord = chordSymbol(rootSemitone, 'maj', preferFlats);
    const romanProgression = 'i - I';

    return {
      id: 'modal-interchange',
      label: 'Modal Interchange (Color Chords)',
      theoryBreakdown: `End on a Picardy third: resolve the ${rootMinorChord} (i) tonic to a surprise ${picardyChord} (I) major chord on the final cadence — a bright, hymn-like resolution that lifts the minor key at the last moment.`,
      stylePromptTag: 'Picardy third resolution, major-tonic surprise cadence',
      bracketTag: `[Outro: Picardy third resolution — ${rootMinorChord} (i) → ${picardyChord} (I)]`,
      romanProgression,
    };
  }

  // Dorian mode raises the natural minor's ♭6 to a natural ♮6 — since that raised 6th degree
  // is the third of the iv chord, it turns the usually-minor iv triad into a major IV triad.
  const dorianSixthSemitone = (rootSemitone + 9) % 12;
  const dorianSixthNote = formatNote(dorianSixthSemitone, preferFlats);
  const ivMajorChord = chordSymbol((rootSemitone + 5) % 12, 'maj', preferFlats);
  const romanProgression = 'iv → IV (Dorian ♮6)';

  return {
    id: 'modal-interchange',
    label: 'Modal Interchange (Color Chords)',
    theoryBreakdown: `Borrow the Dorian ♮6: raising the 6th scale degree to ${dorianSixthNote} turns the usually-minor iv chord into a brightened ${ivMajorChord} (IV) — a modal, dreamy lift straight out of Dorian minor.`,
    stylePromptTag: 'Dorian mode natural 6th, brightened modal IV chord',
    bracketTag: `[Verse: Dorian ♮6 color chord — ${rootMinorChord} (i) → ${ivMajorChord} (IV)]`,
    romanProgression,
  };
}

// ————————————————————————————————————————————————————————————————————————
// c) Jazz / Neo-Soul Reharm
//    Secondary dominant (V7 of ii or V) + its tritone substitute (subV7), tailored to root key.
// ————————————————————————————————————————————————————————————————————————

function computeJazzNeoSoulReharm(input: HarmonicTheoryInput, random: () => number): HarmonizationResult {
  const { semitone: rootSemitone, preferFlats } = parseRootKey(input.rootKey);
  const isMajor = input.scale === 'major';

  const targetIsII = random() < 0.5;
  const targetOffset = targetIsII ? 2 : 7;
  const targetSemitone = (rootSemitone + targetOffset) % 12;
  const targetLabel = targetIsII ? 'ii' : (isMajor ? 'V' : 'v');
  const targetQuality: ChordQuality = targetIsII || !isMajor ? 'min' : 'maj';
  const targetChord = chordSymbol(targetSemitone, targetQuality, preferFlats, targetIsII ? 'm7' : '7');

  // V7 of the target sits a perfect fifth above it; its tritone sub sits a half-step above
  // the target (a tritone away from the V7 root) and resolves the same way, chromatically.
  const secDomSemitone = (targetSemitone + 7) % 12;
  const secDomChord = chordSymbol(secDomSemitone, 'maj', preferFlats, '7');
  const subDomSemitone = (targetSemitone + 1) % 12;
  const subDomChord = chordSymbol(subDomSemitone, 'maj', preferFlats, '7');

  const contextNote =
    input.detectedChords && input.detectedChords.length > 0
      ? ` over your detected ${input.detectedChords.join(' - ')} progression`
      : '';

  const romanProgression = `V7/${targetLabel} → ${targetLabel}`;

  return {
    id: 'jazz-neo-soul-reharm',
    label: 'Jazz / Neo-Soul Reharm',
    theoryBreakdown: `Insert a secondary dominant${contextNote}: ${secDomChord} (V7/${targetLabel}) resolving down a fifth into ${targetChord} (${targetLabel}). For smoother neo-soul voice leading, swap it for the tritone substitute ${subDomChord} (subV7/${targetLabel}) instead — same resolution, chromatic half-step motion into ${targetChord}.`,
    stylePromptTag: 'extended lush neo-soul voicings, 9th/11th chord stacks, passing diminished chords',
    bracketTag: `[Verse: Reharmonized ${secDomChord} → ${targetChord} secondary dominant, tritone sub ${subDomChord}]`,
    romanProgression,
  };
}

// ————————————————————————————————————————————————————————————————————————
// d) Vocal Harmony Stacking — procedurally selected arrangement styles.
// ————————————————————————————————————————————————————————————————————————

const VOCAL_HARMONY_STYLES: Array<Pick<HarmonizationResult, 'theoryBreakdown' | 'stylePromptTag' | 'bracketTag'>> = [
  {
    theoryBreakdown: 'Stack tight 3-part harmonies moving in parallel thirds above the lead melody line.',
    stylePromptTag: 'tight 3-part vocal harmonies in parallel thirds',
    bracketTag: '[Chorus: Tight 3-part vocal harmonies in parallel thirds]',
  },
  {
    theoryBreakdown: 'Hold a sustained choir pad as a pedal point on the 5th degree underneath the lead vocal.',
    stylePromptTag: 'choir pad pedal point on the 5th',
    bracketTag: '[Bridge: Choir pad pedal point on the 5th]',
  },
  {
    theoryBreakdown: 'Trade call-and-response falsetto ad-libs answering the tail of each vocal phrase.',
    stylePromptTag: 'call-and-response falsetto ad-libs',
    bracketTag: '[Outro: Call-and-response falsetto ad-libs]',
  },
  {
    theoryBreakdown: 'Layer close, tightly-voiced barbershop-style vocal stacks on the final cadence.',
    stylePromptTag: 'barbershop close vocal stacks',
    bracketTag: '[Chorus: Barbershop close vocal harmony stack on the final cadence]',
  },
];

function computeVocalHarmonyStacking(random: () => number): HarmonizationResult {
  const idx = Math.floor(random() * VOCAL_HARMONY_STYLES.length);
  const style = VOCAL_HARMONY_STYLES[idx];
  return {
    id: 'vocal-harmony-stacking',
    label: 'Vocal Harmony Stacking',
    ...style,
  };
}

// ————————————————————————————————————————————————————————————————————————
// Public entry point — rolls a seed and picks 2–3 distinct compatible techniques from
// the four generators above, so recommendations stay fresh and non-repetitive on every
// "Dice / Shuffle" click (or on first load, using a deterministic seed).
// ————————————————————————————————————————————————————————————————————————

export function rollHarmonizationVariations(input: HarmonicTheoryInput, seed: number): HarmonizationResult[] {
  const random = createSeededRandom(seed);

  const allTechniques: HarmonizationResult[] = [
    computeRelativeMediantShift(input),
    computeModalInterchange(input, random),
    computeJazzNeoSoulReharm(input, random),
    computeVocalHarmonyStacking(random),
  ];

  // Fisher-Yates shuffle (seeded) — every technique in the pool is already harmonically
  // valid for this key/scale, so any subset is "compatible"; shuffling just decides which
  // 2–3 of the 4 make the cut for this roll.
  const shuffled = [...allTechniques];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const count = 2 + Math.floor(random() * 2); // 2 or 3 techniques per roll
  return shuffled.slice(0, count);
}
