// ── Vocal Persona & Delivery Profiles ───────────────────────────────────────
// Preset map of singer / rapper delivery styles for Suno prompt injection.
// Each persona contributes:
//   • styleTags  → appended to the "Style of Music" compiled prompt
//   • bracketTag → injected at the top of [Verse 1] / [Intro] in the lyric canvas

export type VocalPersona = {
  id: string;
  label: string;
  emoji: string;
  /** Short blurb shown as a tooltip / description chip */
  description: string;
  /** Comma-separated vocal descriptors appended to the Suno style prompt */
  styleTags: string;
  /** Bracket cue tag injected at the start of the first lyric section */
  bracketTag: string;
  /** Genre IDs this persona naturally aligns with (used for auto-matching on Randomize) */
  matchGenres: string[];
};

export const VOCAL_PERSONAS: VocalPersona[] = [
  {
    id: 'southern-trap-melodic',
    label: 'Southern Trap / Melodic',
    emoji: '🎤',
    description: 'Deep baritone, autotuned melodic trap, southern cadence',
    styleTags:
      'male vocals, deep baritone, autotuned melodic trap delivery, southern cadence, punchy flow',
    bracketTag: '[Deep Baritone - Southern Trap Delivery]',
    matchGenres: ['hiphop'],
  },
  {
    id: '90s-boom-bap-gritty',
    label: '90s Boom-Bap / Gritty',
    emoji: '🔥',
    description: 'Raw gritty baritone, aggressive rhythmic cadence, 90s boom-bap flow',
    styleTags:
      'male vocals, raw gritty baritone, aggressive rhythmic cadence, 90s boom-bap delivery, confident projection',
    bracketTag: '[Raw Gritty Baritone - 90s Flow]',
    matchGenres: ['hiphop'],
  },
  {
    id: 'neo-soul-gospel',
    label: 'Neo-Soul / Warm Gospel',
    emoji: '🌟',
    description: 'Soulful tenor, rich gospel chest resonance, dynamic vocal runs',
    styleTags:
      'male vocals, soulful tenor, rich gospel chest resonance, dynamic vocal runs, warm raspy vibrato',
    bracketTag: '[Soulful Gospel Tenor - Melodic Runs]',
    matchGenres: ['rnb', 'lofi'],
  },
  {
    id: 'smooth-rnb',
    label: 'Smooth Contemporary R&B',
    emoji: '🎶',
    description: 'Silky falsetto, airy low register, modern R&B vocal stacks',
    styleTags:
      'male vocals, silky falsetto, airy low register, modern R&B vocal stacks, emotive delivery',
    bracketTag: '[Smooth R&B Tenor - Intimate Delivery]',
    matchGenres: ['rnb', 'lofi', 'synthwave'],
  },
  {
    id: 'detroit-fast-bounce',
    label: 'Detroit / Fast Bounce',
    emoji: '⚡',
    description: 'Energetic conversational delivery, off-beat rhythmic cadence, crisp projection',
    styleTags:
      'male vocals, energetic conversational delivery, off-beat rhythmic cadence, crisp projection',
    bracketTag: '[Punchy Fast Cadence - Male Rap]',
    matchGenres: ['hiphop'],
  },
  {
    id: 'indie-pop-female',
    label: 'Indie-Pop / Dream Female',
    emoji: '🌸',
    description: 'Breathy indie-pop voice, soaring choruses, delicate vibrato',
    styleTags:
      'female vocals, breathy indie-pop voice, soaring high register, delicate vibrato, emotive falsetto',
    bracketTag: '[Breathy Indie-Pop Female - Soaring Chorus]',
    matchGenres: ['lofi', 'synthwave', 'electronic'],
  },
  {
    id: 'metal-rock-growl',
    label: 'Metal / Rock Growl',
    emoji: '🤘',
    description: 'Heavy growl, screamo undertones, raw gritty power vocals',
    styleTags:
      'male vocals, heavy vocal growl, screamo undertones, raw gritty power, full-chest rock projection',
    bracketTag: '[Heavy Growl - Rock Power Vocals]',
    matchGenres: ['metal', 'cyberpunk'],
  },
  {
    id: 'cinematic-baritone',
    label: 'Cinematic / Spoken Word',
    emoji: '🎬',
    description: 'Deep cinematic baritone, authoritative spoken-word narration',
    styleTags:
      'male vocals, deep cinematic baritone, spoken-word narration, authoritative resonant delivery',
    bracketTag: '[Cinematic Baritone - Spoken Narrative]',
    matchGenres: ['cinematic', 'orchestral'],
  },
];

// ── Genre → Persona auto-match ───────────────────────────────────────────────

/**
 * Returns the ID of a randomly chosen persona that aligns with the given genre IDs.
 * Falls back to a completely random persona if no genre match exists.
 */
export function pickPersonaForGenre(genreIds: string[]): string {
  const matches = VOCAL_PERSONAS.filter(p =>
    p.matchGenres.some(g => genreIds.includes(g)),
  );
  const pool = matches.length > 0 ? matches : VOCAL_PERSONAS;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

// ── Lyric bracket-tag injection helpers ──────────────────────────────────────

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strips any existing persona bracket tags from the lyrics string so that
 * switching personas doesn't stack multiple cue tags.
 */
export function clearPersonaBracketTags(lyrics: string): string {
  let out = lyrics;
  for (const p of VOCAL_PERSONAS) {
    out = out.replace(new RegExp(`^${escapeRe(p.bracketTag)}\\r?\\n?`, 'gm'), '');
  }
  // Collapse triple+ blank lines left behind
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Injects a persona bracketTag immediately after the first [Intro] / [Verse 1] /
 * [Verse] header found in the lyrics.  Falls back to prepending if no such
 * header exists.  Removes any previously injected persona cue first.
 */
export function injectPersonaBracketTag(lyrics: string, bracketTag: string): string {
  const cleaned = clearPersonaBracketTags(lyrics);
  if (!cleaned) return `${bracketTag}\n`;

  // Insert right after the first matching section header
  const headerRe = /(\[(?:Intro|Verse 1|Verse)\][^\n]*(?:\n|$))/;
  if (headerRe.test(cleaned)) {
    return cleaned.replace(headerRe, `$1${bracketTag}\n`);
  }

  // No matching header — prepend before all content
  return `${bracketTag}\n${cleaned}`;
}
