// Lyric generation engine — local deterministic-ish generator that produces
// structured, rhyme-ready lyrics wrapped in music-engine metatags.

import {
  RHYME_FAMILIES, RHYME_KEYS, TONE_VOCAB, LANG_PHRASES,
  ES_RHYME_FAMILIES, FR_RHYME_FAMILIES,
  extractKeywords, cueFor,
  VOCAL_ARCHETYPES, REGIONAL_FLOWS, findVocalArchetype,
  type RhymeScheme, type Tone, type Lang, type StructureTemplate, type StructureSection,
} from '@/data/lyricBanks';

const ACOUSTIC_INSTRUMENT_WORDS = new Set([
  'synthesizer', 'synth', 'synths', 'linndrum', 'oberheim', 'rhodes', 'fender', 'guitar', 'guitars',
  'bass', 'bassline', 'basslines', 'drums', 'drum', 'snare', 'kick', 'brass', 'horn', 'horns',
  'saxophone', 'sax', 'piano', 'organ', 'percussion', 'congas', 'conga', 'shaker', 'shakers',
  'flute', 'harmonica', 'vocoder', 'autotune', 'moog', '808', '909', 'dembow', 'taiko', 'oud',
  'darbuka', 'cowbell', 'turntable', 'scratch', 'feedback', 'amp', 'reverb', 'delay', 'bpm',
  'hertz', 'khz', 'stem', 'stems', 'track', 'mix', 'mono', 'stereo', 'hi-hat', 'hihat', 'cymbal'
]);

export function cleanLyricText(lyrics: string): string {
  if (!lyrics) return '';
  const lines = lyrics.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 1. Handle Bracketed Headers [Intro], [Verse 1], etc.
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1);
      const mainHeader = inner.split('|')[0].trim();
      cleanedLines.push(`[${mainHeader}]`);
      continue;
    }

    if (!trimmed) {
      cleanedLines.push('');
      continue;
    }

    // 2. Handle Lyric Line: Remove acoustic instrument / gear / bpm words
    const words = trimmed.split(/\s+/);
    const filteredWords = words.filter(word => {
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      return !ACOUSTIC_INSTRUMENT_WORDS.has(cleanWord);
    });

    const cleanedLine = filteredWords.join(' ').replace(/\s+/g, ' ').trim();
    if (cleanedLine.length > 0) {
      cleanedLines.push(cleanedLine);
    }
  }

  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n');
}

// ---- Utilities ----

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickN = <T,>(arr: T[], n: number): T[] => {
  const c = [...arr];
  const out: T[] = [];
  while (out.length < n && c.length) {
    out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
  }
  return out;
};

// Rough syllable counter for English (and works ok-ish for Romance langs)
export function countSyllables(line: string): number {
  const clean = line.replace(/\[[^\]]*\]/g, '').trim();
  if (!clean) return 0;
  // Count vowel groups; handle silent e, trailing ed, etc. approximately
  const words = clean.split(/\s+/).filter(Boolean);
  let total = 0;
  for (const w of words) {
    const lower = w.toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüçñ]/g, '');
    if (!lower) { total += 1; continue; }
    const groups = lower.match(/[aeiouyàâäéèêëîïôöùûü]+/g);
    let count = groups ? groups.length : 1;
    if (lower.endsWith('e') && count > 1) count -= 1;
    if (lower.endsWith('le') && lower.length > 3) count += 0;
    if (lower.endsWith('ed') && !/(t|d)ed$/.test(lower)) count -= 1;
    if (count < 1) count = 1;
    total += count;
  }
  return total;
}

function rhymeBank(lang: Lang): Record<string, string[]> {
  if (lang === 'es') return ES_RHYME_FAMILIES;
  if (lang === 'fr') return FR_RHYME_FAMILIES;
  return RHYME_FAMILIES;
}

function rhymeKeys(lang: Lang): string[] {
  return Object.keys(rhymeBank(lang));
}

function pickRhymeWord(lang: Lang, key: string, exclude: Set<string>): string {
  const bank = rhymeBank(lang);
  const pool = bank[key] || [];
  const avail = pool.filter(w => !exclude.has(w));
  if (avail.length === 0) return pick(pool.length ? pool : ['light', 'night', 'fire', 'heart', 'soul']);
  return pick(avail);
}

// ---- Line generation ----

function lineForScheme(
  scheme: RhymeScheme,
  positionInGroup: number,
  groupSize: number,
  rhymeLetter: string,
  keyA: string,
  keyB: string,
  usedA: Set<string>,
  usedB: Set<string>,
  tone: Tone,
  kws: ReturnType<typeof extractKeywords>,
  lang: Lang,
): string {
  const vocab = TONE_VOCAB[tone] ?? TONE_VOCAB.poetic;
  const opener = pick(vocab.openers);
  const img = pick(vocab.imagery);
  const conn = pick(vocab.connectors);

  // Choose rhyme word based on scheme + position
  let rhymeKey = keyA;
  let used = usedA;
  if (scheme === 'ABAB') {
    // A B A B -> positions 0,2 => A; 1,3 => B
    if (positionInGroup % 2 === 1) { rhymeKey = keyB; used = usedB; }
  } else if (scheme === 'AABB') {
    // A A B B -> first half A, second half B
    if (positionInGroup >= groupSize / 2) { rhymeKey = keyB; used = usedB; }
  } else if (scheme === 'AABBCCDD') {
    // A A B B C C D D -> pairs, each pair gets a new rhyme key
    const pairIndex = Math.floor(positionInGroup / 2);
    // cycle through keyA, keyB, then pick fresh keys for C, D
    if (pairIndex === 0) { rhymeKey = keyA; used = usedA; }
    else if (pairIndex === 1) { rhymeKey = keyB; used = usedB; }
    else {
      // Fresh rhyme key for each subsequent pair
      rhymeKey = pick(rhymeKeys(lang).filter(k => k !== keyA && k !== keyB));
      used = new Set();
    }
  } else if (scheme === 'ABCB') {
    // A B C B -> only line 1 (position 1) and 3 (position 3) rhyme (B)
    if (positionInGroup === 1 || positionInGroup === 3) {
      rhymeKey = keyB; used = usedB;
    } else {
      // A and C don't need to rhyme — pick any end word
      rhymeKey = pick(rhymeKeys(lang));
      used = new Set();
    }
  } else if (scheme === 'Complex') {
    // Multi-syllabic internal rhymes — pick dense rhyme words, vary frequently
    rhymeKey = pick(rhymeKeys(lang));
    used = new Set();
  } else if (scheme === 'Free') {
    // No enforced rhyme — pick any end word
    rhymeKey = pick(rhymeKeys(lang));
    used = new Set();
  }

  const endWord = pickRhymeWord(lang, rhymeKey, used);
  used.add(endWord);

  // Theme injection: occasionally use extracted noun/verb
  const themeNoun = kws.nouns.length ? pick(kws.nouns) : null;
  const themeVerb = kws.verbs.length ? pick(kws.verbs) : null;

  // Build line using tone vocab + theme + rhyme word
  const patterns: string[] = [
    `${opener} ${img} ${conn} ${endWord}`,
    `${img} ${conn} ${themeVerb ?? 'calling'} ${endWord}`,
    `${themeNoun ? `Every ${themeNoun} ` : 'Every shadow '}${conn} ${endWord}`,
    `${opener} ${endWord}, ${img.toLowerCase()}`,
  ];
  if (lang !== 'en') {
    const lp = LANG_PHRASES[lang];
    patterns.push(`${pick(lp.verse)} ${endWord}`);
  }
  let line = pick(patterns);
  // Capitalize first letter
  line = line.charAt(0).toUpperCase() + line.slice(1);
  return line;
}

function generateSectionMetatag(section: StructureSection, tone: Tone, vocalArchetypes: string[], deliveryDirectives: string[], moodText?: string): string {
  const archetypeLabel = vocalArchetypes.length
    ? findVocalArchetype(vocalArchetypes[0])?.label ?? 'clean lead vocal'
    : 'clean lead vocal';
  const directive = deliveryDirectives[0] ?? 'intimate delivery';
  const toneText = TONE_VOCAB[tone]?.imagery?.[0] ?? 'warm atmosphere';
  const mood = moodText ?? toneText;

  switch (section.kind) {
    case 'Intro':
      return `[Intro | atmospheric ${mood} tone | ${directive}]`;
    case 'Verse':
      return `[Verse ${section.label.replace(/^Verse\s*/, '') || '1'} | intimate close-mic delivery | ${archetypeLabel} | light fingerpicking]`;
    case 'Pre-Chorus':
      return `[Pre-Chorus | building energy | rising snare fill | vocal crescendo]`;
    case 'Chorus':
      return `[Chorus | anthemic explosive belt | stacked harmonies | 808 sub drops]`;
    case 'Bridge':
      return `[Bridge | stripped back acoustic | emotional vocal break]`;
    case 'Guitar Solo':
      return `[Guitar Solo | blues overdrive | expressive lead phrasing]`;
    case 'Instrumental Solo':
      return `[Instrumental Solo | atmospheric texture | ${mood}]`;
    case 'Outro':
      return `[Outro | slow atmospheric fade | whispered ad-libs | reverb tail]`;
    case 'Drop':
      return `[Drop | full-band peak energy | sub-heavy impact | tight syncopation]`;
    case 'Build-up':
      return `[Build-up | rising anticipation | tension swell | layered drums]`;
    case 'Breakdown':
      return `[Breakdown | stripped back pulse | breathy textures | restrained low-end]`;
    default:
      return `[${section.label} | ${mood}]`;
  }
}

function generateSection(
  section: StructureSection,
  scheme: RhymeScheme,
  tone: Tone,
  kws: ReturnType<typeof extractKeywords>,
  lang: Lang,
  theme: string,
  chorusCache: string[] | null,
  vocalArchetypes: string[],
  regionalFlows: string[],
  deliveryDirectives: string[],
): string {
  const isInstrumental = section.kind === 'Guitar Solo' || section.kind === 'Instrumental Solo' || section.kind === 'End' || section.kind === 'Fade Out';
  const isIntro = section.kind === 'Intro';
  const isOutro = section.kind === 'Outro';
  const isChorus = section.kind === 'Chorus';
  const isDrop = section.kind === 'Drop';
  const isBuild = section.kind === 'Build-up';
  const isBreak = section.kind === 'Breakdown';

  const lines: string[] = [];
  const moodText = TONE_VOCAB[tone]?.imagery?.[0] ?? 'emotional';
  // Build enriched header with archetype/flow directives when available
  let header = generateSectionMetatag(section, tone, vocalArchetypes, deliveryDirectives, moodText);
  const archDirectives: string[] = [];
  const archCues: string[] = [];
  for (const al of vocalArchetypes) {
    const arch = findVocalArchetype(al);
    if (arch) {
      archDirectives.push(...arch.directives);
      archCues.push(...arch.performanceTags);
    }
  }
  if (archDirectives.length && !isInstrumentalCheck(section)) {
    header = `[${section.label} | ${archDirectives.slice(0, 3).join(' | ')}]`;
  }
  // Add regional flow to header for verse sections
  if (regionalFlows.length && (section.kind === 'Verse')) {
    const flow = REGIONAL_FLOWS.find(f => f.label === regionalFlows[0]);
    if (flow) {
      header = header.replace(']', ` | ${flow.label}]`);
    }
  }
  const cue = cueFor(section.kind);
  const cueLine = cue ? `${cue}` : '';

  // Inject a delivery directive before the first lyric line if any are selected
  const fusedCues = Array.from(new Set([...deliveryDirectives, ...archCues]));
  const injectDirective = (): string => {
    if (fusedCues.length > 0 && Math.random() < 0.45) {
      return pick(fusedCues);
    }
    return '';
  };

  // Intro: short atmosphere
  if (isIntro) {
    const lp = LANG_PHRASES[lang];
    lines.push(pick(lp.intro));
    if (kws.setting) lines.push(`${pick(TONE_VOCAB[tone].imagery)} on the ${kws.setting}`);
    lines.push(pick(TONE_VOCAB[tone].imagery));
    if (cueLine) lines.push(cueLine);
    return [header, ...lines].join('\n');
  }

  // Instrumental sections: no lyrics, just cues
  if (isInstrumental) {
    lines.push('[Instrumental]');
    if (cueLine) lines.push(cueLine);
    if (section.kind === 'Fade Out') lines.push('[Fading]');
    if (section.kind === 'End') lines.push('[End]');
    return [header, ...lines].join('\n');
  }

  // Drop / Build / Breakdown: sparse, energy-cue-driven
  if (isDrop) {
    lines.push('[Bass Drop]');
    const vocalHook = pick(['Let it go', 'Lose control', 'Feel the bass', 'All or nothing', 'Take it higher', 'No limits']);
    lines.push(`${vocalHook}... ${vocalHook}...`);
    if (cueLine) lines.push(cueLine);
    lines.push('[Full Power]');
    return [header, ...lines].join('\n');
  }
  if (isBuild) {
    lines.push('[Rising Energy]');
    lines.push('Higher... higher...');
    lines.push('[Faster Tempo]');
    if (cueLine) lines.push(cueLine);
    return [header, ...lines].join('\n');
  }
  if (isBreak) {
    lines.push('[Half-Time]');
    lines.push(pick(TONE_VOCAB[tone].imagery));
    lines.push('[Stripped Back]');
    if (cueLine) lines.push(cueLine);
    return [header, ...lines].join('\n');
  }

  // Chorus: cache so repeats are identical
  if (isChorus && chorusCache && chorusCache.length) {
    return [header, ...chorusCache].join('\n');
  }

  // Verse / Pre-Chorus / Bridge / Chorus / Outro: full lyric lines
  const bars = section.bars ?? (isChorus ? 4 : section.kind === 'Bridge' ? 4 : section.kind === 'Pre-Chorus' ? 2 : isOutro ? 3 : 4);

  // Enforce compact lyric phrasing for natural musical pacing.
  const enforceMeter = (line: string): string => {
    const trimmed = line.replace(/\[[^\]]*\]/g, '').trim();
    if (!trimmed) return line;
    const words = trimmed.split(/\s+/);
    const syllables = words.reduce((sum, word) => sum + Math.max(1, countSyllables(word)), 0);
    if (syllables >= 6 && syllables <= 10) return line;
    if (syllables > 10) {
      const shortened = words.slice(0, Math.max(4, Math.min(words.length, 8))).join(' ');
      return `${shortened}`.trim();
    }
    return line;
  };

  // Determine rhyme groups based on scheme
  const keyA = pick(rhymeKeys(lang));
  const keyB = pick(rhymeKeys(lang).filter(k => k !== keyA)) || keyA;
  const usedA = new Set<string>();
  const usedB = new Set<string>();

  // Group lines into scheme chunks
  const groupSize =
    scheme === 'AABB' ? 4 :
    scheme === 'ABAB' ? 4 :
    scheme === 'AAAA' ? 4 :
    scheme === 'AABBCCDD' ? 8 :
    scheme === 'ABCB' ? 4 :
    scheme === 'Complex' ? 4 :
    2; // Free

  for (let i = 0; i < bars; i++) {
    const posInGroup = i % groupSize;
    const line = enforceMeter(lineForScheme(scheme, posInGroup, groupSize, '', keyA, keyB, usedA, usedB, tone, kws, lang));
    lines.push(line);
    const dir = injectDirective();
    if (dir) lines.push(dir);
  }

  if (isChorus) {
    const hook = lines[0];
    const repeated = hook.replace(/\.$/, '...');
    const hook2 = lines[1] ?? repeated;
    lines.push(repeated, `(${hook2})`, hook.replace(/\.$/, '!'));
  }

  if (isOutro) {
    lines.push('[Fading]');
  }

  if (cueLine && !isOutro) lines.push(cueLine);

  const result = [header, ...lines].join('\n');

  if (isChorus) {
    chorusCache = lines.slice();
  }

  return result;
}

// ---- Full generation ----

export type GenerateParams = {
  theme: string;
  scheme: RhymeScheme;
  tone: Tone;
  lang: Lang;
  structure: StructureTemplate;
  studioContext?: Record<string, any>;
  vocalArchetypes?: string[];
  regionalFlows?: string[];
  deliveryDirectives?: string[];
  fusedStyle?: any;
};

function isInstrumentalCheck(section: StructureSection): boolean {
  return section.kind === 'Guitar Solo' || section.kind === 'Instrumental Solo' || section.kind === 'End' || section.kind === 'Fade Out' || section.kind === 'Drop' || section.kind === 'Build-up' || section.kind === 'Breakdown';
}

export function generateLyrics(params: GenerateParams): string {
  const { theme, scheme, tone, lang, structure } = params;
  const vocalArchetypes = params.vocalArchetypes ?? [];
  const regionalFlows = params.regionalFlows ?? [];
  const deliveryDirectives = params.deliveryDirectives ?? [];
  const kws = extractKeywords(theme);
  let chorusCache: string[] | null = null;

  const sections: string[] = [];
  for (const sec of structure.sections) {
    const rendered = generateSection(sec, scheme, tone, kws, lang, theme, chorusCache, vocalArchetypes, regionalFlows, deliveryDirectives);
    if (sec.kind === 'Chorus' && !chorusCache) {
      const lines = rendered.split('\n').slice(1);
      chorusCache = lines;
    }
    sections.push(rendered);
  }

  return cleanLyricText(sections.join('\n\n'));
}

// Regenerate a single section by header label (e.g., "Verse 2", "Chorus")
export function regenerateSection(
  fullLyrics: string,
  sectionLabel: string,
  params: GenerateParams,
): string {
  const { scheme, tone, lang, structure } = params;
  const baseSectionLabel = sectionLabel.split('|')[0].trim();
  const vocalArchetypes = params.vocalArchetypes ?? [];
  const regionalFlows = params.regionalFlows ?? [];
  const deliveryDirectives = params.deliveryDirectives ?? [];
  const kws = extractKeywords(params.theme);
  const section = structure.sections.find(s => s.label === baseSectionLabel);
  if (!section) return fullLyrics;

  let chorusCache: string[] | null = null;
  if (section.kind !== 'Chorus') {
    const chorusMatch = fullLyrics.match(/\[Chorus\]\n([\s\S]*?)(?=\n\n\[|$)/);
    if (chorusMatch) chorusCache = chorusMatch[1].split('\n');
  }

  const newSection = generateSection(section, scheme, tone, kws, lang, params.theme, chorusCache, vocalArchetypes, regionalFlows, deliveryDirectives);

  // Replace the matching section block in fullLyrics
  const pattern = new RegExp(`\\[${escapeRegExp(baseSectionLabel)}(?:\\s*\\|[^\\]]+)?\\][\\s\\S]*?(?=\\n\\n\\[|$)`);
  if (pattern.test(fullLyrics)) {
    return fullLyrics.replace(pattern, newSection);
  }
  return fullLyrics;
}

export function regenerateSelectionLocal(selection: string, params: GenerateParams): string {
  const generated = generateLyrics({
    ...params,
    structure: {
      ...params.structure,
      sections: [{ kind: 'Verse', label: 'Selection' }],
    },
  });
  const replacement = generated.split('\n').slice(1).find(line => line.trim())?.trim();
  return replacement || selection;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Parse sections out of lyrics text for the regenerate UI
export type ParsedSection = { label: string; start: number; end: number };

export function parseSections(lyrics: string): ParsedSection[] {
  const lines = lyrics.split('\n');
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  let charIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\[([^\]]+)\]$/);
    if (m && !isCueTag(m[1])) {
      if (current) current.end = charIdx;
      current = { label: m[1], start: charIdx, end: charIdx };
      sections.push(current);
    }
    charIdx += line.length + 1; // +1 for newline
  }
  if (current) current.end = charIdx;
  return sections;
}

function isCueTag(label: string): boolean {
  const cues = ['Whispered', 'Belting', 'Bass Drop', 'Faster Tempo', 'Half-Time', 'Ad-Lib', 'Harmonies', 'Call and Response', 'Vocoder', 'Choral Layer', 'Rising Energy', 'Full Power', 'Stripped Back', 'Fading', 'Instrumental', 'Atmospheric', 'Building Tension', 'Snare Roll', 'Emotional Shift', 'Melodic Flow', 'Steady Pulse', 'End'];
  if (cues.includes(label)) return true;
  if (label.startsWith('Ad-lib')) return true;
  return VOCAL_ARCHETYPES.some(a => a.performanceTags.some(t => t === `[${label}]`));
}

// Get only "regeneratable" sections (verses, choruses, pre-chorus, bridge — sections with real lyrics)
export function regeneratableSections(lyrics: string): ParsedSection[] {
  const all = parseSections(lyrics);
  return all.filter(s => {
    const l = s.label.toLowerCase();
    return l.includes('verse') || l.includes('chorus') || l.includes('pre-chorus') || l.includes('bridge') || l.includes('breakdown');
  });
}

// Count syllables per line for display
export function syllableBreakdown(lyrics: string): { line: string; syllables: number }[] {
  return lyrics.split('\n').map(line => ({ line, syllables: countSyllables(line) }));
}
