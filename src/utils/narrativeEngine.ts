// Dynamic Narrative Matrix Engine
// Generates specific, emotionally compelling, genre-aware song briefs on demand.
// No static presets — every call produces a fresh permutation.

// ─── Types ────────────────────────────────────────────────────────────────────

export type VibeFocus =
  | 'Late Night'
  | 'Heartbreak'
  | 'Triumph'
  | 'Nostalgia'
  | 'Chaos'
  | 'Intimacy'
  | 'Rebellion';

export type GeneratedNarrative = {
  /** A punchy working title, e.g. "3 AM Tollbooth" or "Paper Crown". */
  titleIdea: string;
  /** 2-3 sentence vivid backstory: who is singing, where, and what the emotional stakes are. */
  storyBrief: string;
  /** Two contrasting hook ideas / opening couplets ready to seed the Lyric Canvas. */
  lyricSeedHooks: [string, string];
  /** Ready-to-inject Suno bracket tag suggestions. */
  sunoMetaTags: string[];
  /** The archetype that anchored this narrative. */
  archetypeName: string;
  /** The genre framing applied. */
  genreFrame: string;
};

// ─── Archetype Pool ───────────────────────────────────────────────────────────

interface Archetype {
  id: string;
  name: string;
  tagline: string;
  situation: string;
  emotionalStake: string;
  vibes: VibeFocus[];
}

const ARCHETYPES: Archetype[] = [
  {
    id: 'survivor-guilt',
    name: 'Melodic Pain & Survivor Guilt',
    tagline: 'The bag came in, the group chat went quiet',
    situation:
      'Phone on DND since Tuesday. A court date sits in the lock-screen banner at 4:18 AM. The wire cleared and the people who used to ride still have not called back.',
    emotionalStake:
      'Making it out did not bring anybody with you, and the check does not cover the ones you lost.',
    vibes: ['Late Night', 'Heartbreak', 'Intimacy'],
  },
  {
    id: 'read-receipts',
    name: 'Toxic Situationship & Read Receipts',
    tagline: 'Seen at 2:07, replied at 11:41',
    situation:
      'They watched the private story, left the thread on seen, then called from the apartment lobby like nothing happened. The car console is the only light on.',
    emotionalStake:
      'You already have the receipt. You just want them to say it out loud.',
    vibes: ['Heartbreak', 'Intimacy', 'Nostalgia'],
  },
  {
    id: 'quiet-leverage',
    name: 'Corporate Hustle & High-Tier Staking',
    tagline: 'Wire confirmation, NDA, no caption',
    situation:
      'Wire hit at 9:12. NDA lives in the files app. Same lobby as people who still want the old version of you. You keep the volume down on purpose.',
    emotionalStake:
      'You outgrew the room and you still love them, but you do not narrate the come-up.',
    vibes: ['Triumph', 'Rebellion', 'Chaos'],
  },
  {
    id: 'tithes-and-trials',
    name: 'Gospel Trap / Redemption',
    tagline: 'Prayer in the driver seat, tithe on the bank app',
    situation:
      'Mama has a court date, you have a session, and the tithe left the account before the weekend. The 808 is low so you can hear yourself think.',
    emotionalStake:
      'You are trying to break the cycle in the same month you almost become it.',
    vibes: ['Triumph', 'Heartbreak', 'Intimacy'],
  },
  {
    id: 'summer-function',
    name: 'West Coast Bounce / Summer Function',
    tagline: 'Windows cracked, aux in the console, petty talk',
    situation:
      'Function starts at 4. Phone on DND until the lot fills. Street etiquette is simple: speak when spoken to, do not perform the block.',
    emotionalStake:
      'Low-stress flex is the point. If you talking loud, you not with us.',
    vibes: ['Chaos', 'Rebellion', 'Triumph'],
  },
  {
    id: 'mixed-signals',
    name: 'The Soft Launch',
    tagline: 'Everybody else gets posted, your name stays in notes',
    situation:
      'They soft-launch strangers and hide you in airplane mode. You screenshot the thread, then delete it before you do something you cannot take back.',
    emotionalStake:
      'Casual is the word they use when they still want access.',
    vibes: ['Intimacy', 'Late Night', 'Nostalgia'],
  },
];

// ─── Sensory Anchor Pool ──────────────────────────────────────────────────────

interface SensoryAnchor {
  text: string;
  vibes: VibeFocus[];
}

const SENSORY_ANCHORS: SensoryAnchor[] = [
  { text: 'Lock screen at 4:18 AM with a court date banner', vibes: ['Late Night', 'Heartbreak', 'Intimacy'] },
  { text: 'Read receipt sitting on seen since 2:07', vibes: ['Heartbreak', 'Intimacy', 'Nostalgia'] },
  { text: 'Bank app refresh in an apartment lobby', vibes: ['Triumph', 'Heartbreak'] },
  { text: 'Car console on low while a flight confirmation pings', vibes: ['Chaos', 'Triumph', 'Rebellion'] },
  { text: 'NDA PDF open in the files app', vibes: ['Triumph', 'Rebellion'] },
  { text: 'Phone on DND on the passenger seat', vibes: ['Late Night', 'Intimacy', 'Chaos'] },
  { text: 'Wire confirmation at 9:12 with no caption', vibes: ['Triumph', 'Chaos'] },
  { text: 'Private story view with no reply', vibes: ['Heartbreak', 'Nostalgia', 'Intimacy'] },
  { text: 'Tithe leaving the bank app before the weekend', vibes: ['Triumph', 'Intimacy'] },
  { text: 'Group chat going quiet after the check cleared', vibes: ['Heartbreak', 'Nostalgia', 'Late Night'] },
  { text: 'Aux in the console, windows cracked at the function', vibes: ['Chaos', 'Rebellion', 'Triumph'] },
  { text: 'Same lobby, different badge', vibes: ['Triumph', 'Late Night', 'Intimacy'] },
];

// ─── Genre Vocabulary & Framing ───────────────────────────────────────────────

interface GenreFrame {
  /** Genre IDs from the catalog that map to this frame. */
  matchIds: string[];
  label: string;
  writingStyle: string;
  hookStyle: string;
  metatagTemplates: string[];
}

const GENRE_FRAMES: GenreFrame[] = [
  {
    matchIds: ['hiphop', 'trap', 'rap', 'hip-hop', 'hiphop-trap'],
    label: 'Hip-Hop / Soul Trap',
    writingStyle:
      'Billboard Rap talk: receipts, DND, court dates, wires, and the people who did not call back. Conversational, no poetry. Dual-tone — hard outside, raw underneath.',
    hookStyle:
      'Punchy bars, strained melodic-rap hook, ad-libs (yeah) (look) (uh). Short pockets, internal rhyme.',
    metatagTemplates: [
      '[Intro: Trap drums enter, no poetry — just the pocket]',
      '[Verse 1: Close-mic spoken delivery | (look)]',
      '[Chorus: [Vocal switch: strained melodic rap] | stacked (yeah)]',
      '[Bridge: Half-time, ad-libs only]',
      '[Outro: Voice-note vocal, phone still on DND]',
    ],
  },
  {
    matchIds: ['electronic', 'synthwave', 'edm', 'house', 'techno', 'ambient'],
    label: 'Synthwave / Electronic',
    writingStyle:
      'Current club-adjacent Rap/R&B: consoles, flight pings, DND, and cool detachment. No tourist nightlife language. Talk like a chart record.',
    hookStyle:
      'Simple vowel hooks, ad-libs (uh) (yeah), designed to sit on a bounce, not a poem.',
    metatagTemplates: [
      '[Intro: Pad swell, dry talk-up]',
      '[Verse: Processed but conversational vocal]',
      '[Drop: Full bounce, (uh) on the snare]',
      '[Bridge: Stripped console vocal]',
      '[Outro: Beat drops out, lock screen still lit]',
    ],
  },
  {
    matchIds: ['rnb', 'r&b', 'soul', 'neo-soul', 'neosoul', 'funk'],
    label: 'R&B / Neo-Soul',
    writingStyle:
      'Modern R&B / toxic soul: read receipts, private stories, lobby small talk, mixed signals. Conversational, specific, no theater language.',
    hookStyle:
      'Talk-sing verses, stacked hook, one word that turns the room. (yeah) as punctuation.',
    metatagTemplates: [
      '[Intro: Soft spoken-word, close mic, no effects]',
      '[Verse: Intimate breathy vocal | (uh)]',
      '[Chorus: Soaring lead with delayed (yeah)]',
      '[Bridge: Falsetto break, stripped kit]',
      '[Outro: Voice note over a fading chord]',
    ],
  },
  {
    matchIds: ['rock', 'metal', 'punk', 'grunge', 'alternative', 'indie-rock'],
    label: 'Rock / Metal',
    writingStyle:
      'Raw grit with no apology. Specific rooms, specific people, specific money. No poetry, no theater.',
    hookStyle:
      'Singalong anthemic choruses. Short, declarative phrases with visceral imagery. Verses that build tension, choruses that explode.',
    metatagTemplates: [
      '[Intro: Distorted guitar riff, dry mix]',
      '[Verse: Gravel vocals, tight drums, no reverb]',
      '[Pre-Chorus: Tension build, doubled guitars]',
      '[Chorus: Full band explosion, screamed harmonics]',
      '[Bridge: Stripped — single guitar, raw vocal]',
    ],
  },
  {
    matchIds: ['gospel-trap', 'gospel', 'soul-sample', 'gospel trap'],
    label: 'Gospel Trap / Soul Sample',
    writingStyle:
      'Testimony over trap drums: tithes, trials, generational wealth, court dates, and the LLC in the same month. Conversational gospel-trap, no play language.',
    hookStyle:
      'Call-and-response payoffs that feel communal. Vocal runs that carry the weight of a church testimony. Hooks that build like a Sunday sermon reaching its crescendo.',
    metatagTemplates: [
      '[Gospel Choir Intro: Call-and-response vocal run with organ pad]',
      '[Verse: Close mic testimony flow, 808 undercurrent]',
      '[Chorus: Choir swell, clapping snare, soaring lead]',
      '[Bridge: Stripped — solo voice over organ drone]',
      '[Outro: Full choir, fading into vinyl crackle]',
    ],
  },
  {
    matchIds: ['pop', 'dance', 'k-pop', 'kpop', 'bubblegum', 'synth-pop'],
    label: 'Pop / Dance',
    writingStyle:
      'High-roller / function energy: aux, lot talk, quiet flex, timestamps. Catchy without tourist cliches.',
    hookStyle:
      'Earworm melodic hooks with maximum repetition. Syllables that match the kick pattern. Imagery that lands in two seconds.',
    metatagTemplates: [
      '[Intro: Four-on-the-floor kick, bright synth stab]',
      '[Verse: Punchy vocal, no reverb, close production]',
      '[Pre-Chorus: Filter sweep rising, tension mounting]',
      '[Chorus: Full mix drop, layered backing vocals]',
      '[Drop: Percussive breakdown, bass-heavy, crowd energy]',
    ],
  },
];

// ─── Working Title Fragments ──────────────────────────────────────────────────

const TITLE_FRAGMENTS_A = [
  '4:18', 'Read', 'Wire', 'DND', 'Lobby', 'Receipt', 'Quiet', 'Court',
  'Group Chat', 'Badge', 'Tithe', 'Function', 'Private', 'LLC', 'Seen',
  'Console', 'Broken', 'Open', 'Unmarked', 'Cracked',
];

const TITLE_FRAGMENTS_B = [
  'Receipts', 'Crown', '& Smoke', 'Date', 'App', 'Glass', 'Leverage',
  'Archive', 'Season', 'Thread', 'Circuit', 'Hour', 'Reel', 'Badge',
  'Confirmation', 'Voltage', 'Cycle', 'Current', 'Story', 'Runway',
];

// ─── Seeded PRNG (same pattern as harmonicTheoryEngine) ──────────────────────

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickFiltered<T extends { vibes: VibeFocus[] }>(
  arr: T[],
  vibe: VibeFocus | null,
  rng: () => number,
): T {
  const filtered = vibe ? arr.filter(a => a.vibes.includes(vibe)) : arr;
  return pickRandom(filtered.length ? filtered : arr, rng);
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

// ─── Genre Frame Resolution ───────────────────────────────────────────────────

function resolveGenreFrame(genreIds: string[]): GenreFrame {
  const lowerIds = genreIds.map(id => id.toLowerCase());
  for (const frame of GENRE_FRAMES) {
    if (frame.matchIds.some(mid => lowerIds.some(id => id.includes(mid) || mid.includes(id)))) {
      return frame;
    }
  }
  // Default fallback — R&B / Neo-Soul is universally versatile
  return GENRE_FRAMES[2];
}

// ─── Hook Generator ───────────────────────────────────────────────────────────

function buildHooks(
  archetype: Archetype,
  anchor: SensoryAnchor,
  frame: GenreFrame,
  rng: () => number,
): [string, string] {
  // Hook A — The opening image (grounded in sensory anchor)
  const hookATemplates = [
    `${anchor.text} / (look) that's the part I don't post`,
    `Phone on DND, I still pulled up / ${anchor.text}`,
    `I sat in the lobby like I had an appointment / ${anchor.text}`,
    `${anchor.text} / I'm running the thread back at half speed (yeah)`,
  ];
  // Hook B — The emotional pivot (drawn from archetype's stake)
  const hookBTemplates = [
    `${archetype.emotionalStake.split('.')[0]} — tell me that's not a song`,
    `Swore I was over it / Then ${anchor.text.toLowerCase()} / and every lie I told myself collapsed`,
    `Everyone gets an exit / Mine just happened to look like ${anchor.text.toLowerCase()}`,
    `${archetype.tagline.split(',')[0]} — the part nobody writes about`,
  ];
  return [pickRandom(hookATemplates, rng), pickRandom(hookBTemplates, rng)];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate a vivid, genre-aware story concept for the Lyric Canvas.
 *
 * @param genreIds   Active genre IDs from the prompt engine (e.g. ['hiphop', 'trap'])
 * @param vibe       Optional vibe filter to narrow archetype / anchor selection
 * @param seed       Optional explicit seed; defaults to Date.now() for fresh rolls
 */
export function generateStoryPrompt(
  genreIds: string[],
  vibe: VibeFocus | null = null,
  seed: number = Date.now(),
): GeneratedNarrative {
  const rng = seededRng(seed ^ 0xdeadbeef);

  // 1. Pick archetype (vibe-filtered)
  const archetype = pickFiltered(ARCHETYPES, vibe, rng);

  // 2. Pick sensory anchor (vibe-filtered)
  const anchor = pickFiltered(SENSORY_ANCHORS, vibe, rng);

  // 3. Resolve genre frame
  const frame = resolveGenreFrame(genreIds);

  // 4. Build title
  const titleA = pickRandom(TITLE_FRAGMENTS_A, rng);
  const titleB = pickRandom(TITLE_FRAGMENTS_B, rng);
  const titleIdea = `${titleA} ${titleB}`;

  // 5. Build story brief (3 sentences)
  const storyBrief = [
    `${archetype.situation}`,
    `The mood: ${anchor.text}.`,
    `${archetype.emotionalStake}`,
  ].join(' ');

  // 6. Build hooks
  const lyricSeedHooks = buildHooks(archetype, anchor, frame, rng);

  // 7. Pick 3 metatag suggestions from the genre frame pool
  const sunoMetaTags = pickN(frame.metatagTemplates, 3, rng);

  return {
    titleIdea,
    storyBrief,
    lyricSeedHooks,
    sunoMetaTags,
    archetypeName: archetype.name,
    genreFrame: frame.label,
  };
}

export const VIBE_OPTIONS: { id: VibeFocus; emoji: string }[] = [
  { id: 'Late Night', emoji: '🌙' },
  { id: 'Heartbreak', emoji: '💔' },
  { id: 'Triumph', emoji: '🏆' },
  { id: 'Nostalgia', emoji: '📼' },
  { id: 'Chaos', emoji: '⚡' },
  { id: 'Intimacy', emoji: '🕯️' },
  { id: 'Rebellion', emoji: '🔥' },
];

export type {
  MainGenreCategory,
  SubgenreTheme,
} from '@/data/genreThemeCatalog';
export {
  MAIN_GENRE_CATEGORIES,
  flattenSubgenreThemes,
  findGenreCategory,
  findSubgenreTheme,
  buildSubgenrePrompt,
  buildSubgenreLyricSeed,
  buildSunoStyleLine,
} from '@/data/genreThemeCatalog';
