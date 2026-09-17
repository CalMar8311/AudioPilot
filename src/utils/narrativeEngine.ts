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
    id: 'midnight-confession',
    name: 'The Midnight Confession',
    tagline: 'Unsaid words, a late-night call, pride slipping away',
    situation:
      'The singer has been awake since 2 AM, phone in hand, rehearsing a message they can\'t bring themselves to send. The city is quiet except for the hum of a refrigerator and the distant sound of rain.',
    emotionalStake:
      'This is the last night before everything becomes permanent — one honest sentence could rewrite everything.',
    vibes: ['Late Night', 'Heartbreak', 'Intimacy'],
  },
  {
    id: 'unsent-letter',
    name: 'The Unsent Letter',
    tagline: 'Bittersweet closure, things left unaddressed, moving on',
    situation:
      'Packing the last box in an apartment that no longer feels like home, the singer finds a handwritten letter they never mailed. The envelope is still sealed.',
    emotionalStake:
      'Every line they wrote a year ago still rings true — but sending it now would be an act of war or an act of grace, and they\'re not sure which.',
    vibes: ['Nostalgia', 'Heartbreak', 'Intimacy'],
  },
  {
    id: 'underdog-ascent',
    name: 'The Underdog Ascent',
    tagline: 'Relentless grind, proving doubters wrong, scars as badges',
    situation:
      'Three years of sleeping on a studio couch, skipping meals, and watching lesser talents get co-signed. The singer is about to step on the biggest stage of their life — still wearing the same chain from a pawn shop.',
    emotionalStake:
      'Every person who laughed gets to watch. The singer doesn\'t need their applause — but they want it.',
    vibes: ['Triumph', 'Chaos', 'Rebellion'],
  },
  {
    id: 'fugitive-escapist',
    name: 'The Fugitive Escapist',
    tagline: 'Driving out of town at 2 AM, burning the rearview, pure adrenaline',
    situation:
      'Engine running, one bag in the trunk, the town limit sign disappearing in the mirror. No destination, only the open highway and the static between radio stations.',
    emotionalStake:
      'Leaving isn\'t cowardice — it\'s the only honest thing left. The question is whether freedom feels like flying or falling.',
    vibes: ['Chaos', 'Rebellion', 'Late Night'],
  },
  {
    id: 'analog-ghost',
    name: 'The Analog Ghost',
    tagline: 'Haunted by old memories, finding an artifact, fading connections',
    situation:
      'Cleaning out a storage unit and discovering a box of cassette tapes, polaroids, and a matchbook from a bar that closed ten years ago. Each object pulls a different version of the singer back into sharp focus.',
    emotionalStake:
      'The person they used to be is both a stranger and the most honest version of themselves they\'ve ever known.',
    vibes: ['Nostalgia', 'Late Night', 'Heartbreak'],
  },
  {
    id: 'cynics-spark',
    name: 'The Cynic\'s Spark',
    tagline: 'Guard dropped unexpectedly, sudden electric intimacy',
    situation:
      'After years of deflecting every genuine moment with irony, the singer is caught completely off guard by a stranger in a fluorescent-lit diner at 4 AM who says something devastatingly simple and true.',
    emotionalStake:
      'The armor they\'ve spent a decade building is useless against one honest conversation. The terror isn\'t falling — it\'s wanting to.',
    vibes: ['Intimacy', 'Late Night', 'Nostalgia'],
  },
];

// ─── Sensory Anchor Pool ──────────────────────────────────────────────────────

interface SensoryAnchor {
  text: string;
  vibes: VibeFocus[];
}

const SENSORY_ANCHORS: SensoryAnchor[] = [
  { text: 'Flickering halogen headlights on rain-slicked asphalt', vibes: ['Late Night', 'Chaos', 'Rebellion'] },
  { text: 'A muted phone screen lighting up at 3:14 AM', vibes: ['Late Night', 'Heartbreak', 'Intimacy'] },
  { text: 'Cold morning coffee beside an unopened moving box', vibes: ['Nostalgia', 'Heartbreak'] },
  { text: 'Dust motes floating across an empty studio floor', vibes: ['Nostalgia', 'Intimacy', 'Triumph'] },
  { text: 'Bass vibrations rattling the trunk at a red light', vibes: ['Chaos', 'Triumph', 'Rebellion'] },
  { text: 'A highway rest stop at 3 AM, diesel fumes and a vending machine glow', vibes: ['Late Night', 'Fugitive Escapist' as VibeFocus, 'Chaos'] },
  { text: 'A voicemail listened to so many times the words have lost meaning', vibes: ['Heartbreak', 'Nostalgia', 'Late Night'] },
  { text: 'Neon bar sign reflected in a puddle on an empty street', vibes: ['Late Night', 'Intimacy', 'Rebellion'] },
  { text: 'The specific silence after a door closes for the last time', vibes: ['Heartbreak', 'Nostalgia'] },
  { text: 'Streetlights strobing past a car window at 90 mph', vibes: ['Chaos', 'Rebellion', 'Triumph'] },
  { text: 'A crumpled setlist found in a jacket pocket two years later', vibes: ['Nostalgia', 'Triumph'] },
  { text: 'The blue light of a recording booth bleeding under the door', vibes: ['Triumph', 'Late Night', 'Intimacy'] },
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
      'Relatable internal conflicts told with unflinching specificity. Loyalty tested by circumstance. Late-night studio confessions. Dual-tone vulnerability — hard on the outside, raw underneath.',
    hookStyle:
      'Punchy declarative bars with a melodic hook payoff. Short syllable pockets with internal rhyme.',
    metatagTemplates: [
      '[Intro: Trap beat fades in, no vocals — let it breathe]',
      '[Verse 1: Close-mic spoken delivery, building intensity]',
      '[Chorus: Melodic hook, layered harmonies, wide stereo]',
      '[Bridge: Beat drops to half-time, ad-libs only]',
      '[Outro: Voice-note quality vocal, echo fade]',
    ],
  },
  {
    matchIds: ['electronic', 'synthwave', 'edm', 'house', 'techno', 'ambient'],
    label: 'Synthwave / Electronic',
    writingStyle:
      'Neon-soaked escapism and digital melancholy. Highway drives into the dark. The ache of technology connecting people who feel more disconnected than ever. Pulsating urgency beneath a cool exterior.',
    hookStyle:
      'Anthemic, simple, vowel-heavy. Designed to soar over a synth drop. Emotional directness wrapped in cool detachment.',
    metatagTemplates: [
      '[Intro: Analog synth pad swell, no percussion]',
      '[Verse: Processed vocals, robotic yet warm delivery]',
      '[Drop: Full synthwave beat, wide reverb on vocals]',
      '[Bridge: Stripped back to arpeggiated synth, raw vocal]',
      '[Outro: Beat dissolves into white noise and static]',
    ],
  },
  {
    matchIds: ['rnb', 'r&b', 'soul', 'neo-soul', 'neosoul', 'funk'],
    label: 'R&B / Neo-Soul',
    writingStyle:
      'Slow-burn emotional tension revealed in glimpses. The unsaid living in the pauses between words. Sensual intimacy and unspoken doubts. Rich vocal runs carrying more meaning than the lyrics themselves.',
    hookStyle:
      'Extended, melismatic phrasing. Lyrics that pivot on a single word. The hook rewards a second listen.',
    metatagTemplates: [
      '[Intro: Soft spoken-word, close mic, no effects]',
      '[Verse: Intimate, breathy vocal, minimal Rhodes]',
      '[Chorus: Soaring lead with delayed ad-libs]',
      '[Bridge: Falsetto break, stripped percussion]',
      '[Outro: Vocal improvisation over fading chord]',
    ],
  },
  {
    matchIds: ['rock', 'metal', 'punk', 'grunge', 'alternative', 'indie-rock'],
    label: 'Rock / Metal',
    writingStyle:
      'Cathartic rebellion and the satisfaction of breaking points. Raw grit with no apology. The body as a battlefield. Uninhibited release that feels like the moment a wave finally crashes.',
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
      'Sacred and street intersecting at the crossroads of faith and struggle. Testimony delivered over rolling 808s. The choir and the crowd as one voice. Redemption earned through the grind, not given.',
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
      'Euphoric rush encoded in precision. The magic of a single fleeting moment under strobes stretched into three minutes. Infectious rhythm that bypasses the brain and goes straight to the body.',
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
  '3 AM', 'Paper', 'Static', 'Ghost', 'Neon', 'Gravel', 'Signal', 'Echo',
  'Last Exit', 'Hollow', 'Cold', 'Burning', 'Silver', 'Dark', 'Closed',
  'Midnight', 'Broken', 'Open', 'Unmarked', 'Cracked',
];

const TITLE_FRAGMENTS_B = [
  'Tollbooth', 'Crown', '& Smoke', 'Drive', 'Road', 'Glass', 'Frequency',
  'Archive', 'Season', 'Light', 'Circuit', 'Hour', 'Reel', 'Mile',
  'Departure', 'Voltage', 'Thread', 'Current', 'Confession', 'Runway',
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
    `${anchor.text} / That's where I left the version of me that still believed`,
    `Started the engine at midnight, didn't even check the map / ${anchor.text}`,
    `There's a light on in your window and I'm still in the parking lot / ${anchor.text}`,
    `${anchor.text} / I'm running every conversation back at half the speed`,
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
