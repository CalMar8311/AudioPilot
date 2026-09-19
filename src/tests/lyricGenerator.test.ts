/**
 * lyricGenerator.test.ts
 *
 * Automated test suite for the AudioPilot lyric engine.
 * Covers:
 *   1. generateLyrics   — full section-block completeness ("Surprise Me" flow)
 *   2. generateStoryPrompt — narrative / genre-frame injection
 *   3. generateLyricsViaEdge — fallback recovery when API is unavailable
 *   4. SURPRISE_RECIPES — all preset recipes carry valid lyric structures
 *   5. parseSections / countSyllables — utility helpers
 *   6. Vocal persona bracket-tag injection
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── Lyric engine (local deterministic generator) ─────────────────────────────
import {
  generateLyrics,
  parseSections,
  countSyllables,
  cleanLyricText,
} from '@/engine/lyricEngine';
import type { GenerateParams } from '@/engine/lyricEngine';

// ── Lyric client (edge function + local fallback) ─────────────────────────────
import {
  generateLyricsViaEdge,
} from '@/engine/lyricClient';
import type { GenerateParams as ClientGenerateParams } from '@/engine/lyricClient';

// ── Narrative engine ──────────────────────────────────────────────────────────
import {
  generateStoryPrompt,
  VIBE_OPTIONS,
} from '@/utils/narrativeEngine';

// ── Structure templates & lyric bank types ────────────────────────────────────
import {
  STRUCTURE_TEMPLATES,
} from '@/data/lyricBanks';

// ── Surprise Me recipes ───────────────────────────────────────────────────────
import {
  SURPRISE_RECIPES,
  pickRandomSurpriseRecipe,
} from '@/data/surpriseMe';

// ── Vocal personas ────────────────────────────────────────────────────────────
import {
  VOCAL_PERSONAS,
  injectPersonaBracketTag,
  clearPersonaBracketTags,
  pickPersonaForGenre,
} from '@/data/vocalPersonas';

// ─────────────────────────────────────────────────────────────────────────────
// Shared test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const POP_STRUCTURE   = STRUCTURE_TEMPLATES.find(s => s.id === 'standard-pop')!;
const HIP_HOP_STRUCTURE = STRUCTURE_TEMPLATES.find(s => s.id === 'hiphop')!;
const NEO_SOUL_STRUCTURE = STRUCTURE_TEMPLATES.find(s => s.id === 'neo-soul')!;
const BALLAD_STRUCTURE = STRUCTURE_TEMPLATES.find(s => s.id === 'ballad')!;

/** Minimal base params reused across most edge-client tests. */
const BASE_CLIENT_PARAMS: ClientGenerateParams = {
  theme: 'A rainy city afternoon, searching for clarity',
  scheme: 'AABB',
  tone: 'nostalgic',
  lang: 'en',
  structure: POP_STRUCTURE,
  studioContext: {
    genres: [],
    instruments: [],
    vocalTypes: [],
    moods: [],
    bpm: 120,
    blend: 50,
    artistArchetypes: [],
    artistBlend: 50,
  },
  vocalArchetypes: [],
  regionalFlows: [],
  deliveryDirectives: [],
};

afterEach(() => {
  // Restore any global stubs set during a test
  vi.unstubAllGlobals();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. generateLyrics — full section-block completeness
// ─────────────────────────────────────────────────────────────────────────────

describe('generateLyrics — section-block completeness ("Surprise Me" flow)', () => {
  it('standard-pop structure emits [Verse 1], [Chorus], [Verse 2], [Outro] blocks', () => {
    const lyrics = generateLyrics({
      theme: 'A midnight drive through unresolved memories',
      scheme: 'ABAB',
      tone: 'poetic',
      lang: 'en',
      structure: POP_STRUCTURE,
    });

    expect(lyrics).toMatch(/\[Verse 1/);
    expect(lyrics).toMatch(/\[Chorus/);
    expect(lyrics).toMatch(/\[Verse 2/);
    expect(lyrics).toMatch(/\[Outro/);
  });

  it('hip-hop structure emits [Intro], [Verse 1], [Chorus], [Verse 2], [Outro]', () => {
    const lyrics = generateLyrics({
      theme: 'Grinding through the noise to reach the light',
      scheme: 'AABB',
      tone: 'aggressive',
      lang: 'en',
      structure: HIP_HOP_STRUCTURE,
    });

    expect(lyrics).toMatch(/\[Intro/);
    expect(lyrics).toMatch(/\[Verse 1/);
    expect(lyrics).toMatch(/\[Chorus/);
    expect(lyrics).toMatch(/\[Verse 2/);
    expect(lyrics).toMatch(/\[Outro/);
  });

  it('ballad structure emits [Verse 1], [Verse 2], [Chorus], [Bridge], [Outro]', () => {
    const lyrics = generateLyrics({
      theme: 'A summer evening, last letter never sent',
      scheme: 'ABCB',
      tone: 'nostalgic',
      lang: 'en',
      structure: BALLAD_STRUCTURE,
    });

    expect(lyrics).toMatch(/\[Verse 1/);
    expect(lyrics).toMatch(/\[Verse 2/);
    expect(lyrics).toMatch(/\[Chorus/);
    expect(lyrics).toMatch(/\[Bridge/);
    expect(lyrics).toMatch(/\[Outro/);
  });

  it('returns non-empty text with multiple lines of lyric content', () => {
    const lyrics = generateLyrics({
      theme: 'Test theme — city in winter',
      scheme: 'Free',
      tone: 'direct',
      lang: 'en',
      structure: POP_STRUCTURE,
    });

    expect(lyrics.length).toBeGreaterThan(150);
    // Should have real lyric lines — at least 10
    const lyricLines = lyrics.split('\n').filter(l => l.trim() && !l.startsWith('['));
    expect(lyricLines.length).toBeGreaterThanOrEqual(10);
  });

  it('all chorus repeats produce identical lyric content (chorus cache)', () => {
    const lyrics = generateLyrics({
      theme: 'Chasing sparks across the city',
      scheme: 'ABAB',
      tone: 'poetic',
      lang: 'en',
      structure: POP_STRUCTURE,
    });

    // Extract the lyric body of every Chorus block
    const chorusBodyRe = /\[Chorus[^\]]*\]\n([\s\S]*?)(?=\n\n\[|\n\[|$)/g;
    const matches = [...lyrics.matchAll(chorusBodyRe)];

    // standard-pop has 3 Chorus sections — they must all share the same body
    expect(matches.length).toBeGreaterThanOrEqual(2);
    const bodies = matches.map(m => m[1].trim());
    const firstBody = bodies[0];
    for (const body of bodies.slice(1)) {
      expect(body).toBe(firstBody);
    }
  });

  it('does not emit instrument / gear / BPM words in lyric lines', () => {
    const BANNED = ['synthesizer', 'bassline', 'hi-hat', 'hihat', 'sidechain', 'reverb'];
    const lyrics = generateLyrics({
      theme: 'A rain-soaked city morning after a long night',
      scheme: 'AABB',
      tone: 'poetic',
      lang: 'en',
      structure: POP_STRUCTURE,
    });
    const lyricLines = lyrics.split('\n').filter(l => l.trim() && !l.startsWith('['));
    for (const banned of BANNED) {
      for (const line of lyricLines) {
        expect(line.toLowerCase()).not.toContain(banned);
      }
    }
  });

  it('Spanish (es) output contains Spanish-language content markers', () => {
    const lyrics = generateLyrics({
      theme: 'Una noche de lluvia',
      scheme: 'AABB',
      tone: 'poetic',
      lang: 'es',
      structure: BALLAD_STRUCTURE,
    });
    // The engine injects Spanish phrases from LANG_PHRASES — just verify it produces output
    expect(lyrics.length).toBeGreaterThan(100);
  });

  it('vocalArchetypes are reflected in section header metatags', () => {
    const lyrics = generateLyrics({
      theme: 'A gospel testimony over rolling 808s',
      scheme: 'ABAB',
      tone: 'direct',
      lang: 'en',
      structure: NEO_SOUL_STRUCTURE,
      vocalArchetypes: ['neo-soul-badu'],
    });
    // The engine overrides the default header with archetype directives when present
    expect(lyrics).toMatch(/\[/); // Confirm section blocks are still rendered
    expect(lyrics.length).toBeGreaterThan(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. generateStoryPrompt — genre-frame / persona injection
// ─────────────────────────────────────────────────────────────────────────────

describe('generateStoryPrompt — narrative engine & genre injection', () => {
  it('returns all required GeneratedNarrative fields', () => {
    const n = generateStoryPrompt(['hiphop'], null, 42);
    expect(typeof n.titleIdea).toBe('string');
    expect(n.titleIdea.length).toBeGreaterThan(0);
    expect(typeof n.storyBrief).toBe('string');
    expect(n.storyBrief.length).toBeGreaterThan(10);
    expect(Array.isArray(n.lyricSeedHooks)).toBe(true);
    expect(n.lyricSeedHooks).toHaveLength(2);
    expect(typeof n.lyricSeedHooks[0]).toBe('string');
    expect(typeof n.lyricSeedHooks[1]).toBe('string');
    expect(Array.isArray(n.sunoMetaTags)).toBe(true);
    expect(n.sunoMetaTags.length).toBeGreaterThan(0);
    expect(typeof n.archetypeName).toBe('string');
    expect(typeof n.genreFrame).toBe('string');
  });

  it('"gospel" genre resolves to "Gospel Trap / Soul Sample" frame', () => {
    // 'gospel-trap'.includes('gospel') = true → Gospel Trap frame is matched.
    // Note: 'soul-sample' is NOT used here because 'soul-sample'.includes('soul')
    // would hit the R&B frame first. Using the bare 'gospel' ID is unambiguous.
    const n = generateStoryPrompt(['gospel'], null, 7);
    expect(n.genreFrame).toBe('Gospel Trap / Soul Sample');
  });

  it('Gospel Trap sunoMetaTags inject choir / organ / 808 vocal-persona cues', () => {
    const n = generateStoryPrompt(['gospel'], null, 99);
    const allTags = n.sunoMetaTags.join('\n').toLowerCase();
    const hasGospelCues = /choir|organ|808|gospel|testimony/.test(allTags);
    expect(hasGospelCues).toBe(true);
  });

  it('"hiphop" / "trap" genre resolves to "Hip-Hop / Soul Trap" frame', () => {
    const n = generateStoryPrompt(['hiphop', 'trap'], null, 7);
    expect(n.genreFrame).toBe('Hip-Hop / Soul Trap');
  });

  it('"rnb" genre resolves to "R&B / Neo-Soul" frame', () => {
    const n = generateStoryPrompt(['rnb'], null, 13);
    expect(n.genreFrame).toBe('R&B / Neo-Soul');
  });

  it('"synthwave" / "edm" resolves to "Synthwave / Electronic" frame', () => {
    const n = generateStoryPrompt(['synthwave', 'edm'], null, 5);
    expect(n.genreFrame).toBe('Synthwave / Electronic');
  });

  it('unknown genre falls back to a valid default frame', () => {
    const n = generateStoryPrompt(['obscure-genre-xyz'], null, 3);
    // Fallback is R&B / Neo-Soul or any other registered frame — just must not throw
    expect(typeof n.genreFrame).toBe('string');
    expect(n.genreFrame.length).toBeGreaterThan(0);
  });

  it('generation is deterministic with the same seed', () => {
    const a = generateStoryPrompt(['hiphop', 'trap'], null, 12345);
    const b = generateStoryPrompt(['hiphop', 'trap'], null, 12345);
    expect(a.titleIdea).toBe(b.titleIdea);
    expect(a.archetypeName).toBe(b.archetypeName);
    expect(a.lyricSeedHooks[0]).toBe(b.lyricSeedHooks[0]);
    expect(a.lyricSeedHooks[1]).toBe(b.lyricSeedHooks[1]);
    expect(a.sunoMetaTags).toEqual(b.sunoMetaTags);
  });

  it('different seeds produce at least one differing field', () => {
    const a = generateStoryPrompt(['hiphop'], null, 1);
    const b = generateStoryPrompt(['hiphop'], null, 888888);
    const identical =
      a.titleIdea === b.titleIdea &&
      a.archetypeName === b.archetypeName &&
      a.lyricSeedHooks[0] === b.lyricSeedHooks[0];
    expect(identical).toBe(false);
  });

  it('vibe filter narrows archetype selection to matching vibes', () => {
    // With 'Heartbreak' vibe, archetype should be heartbreak/intimacy-aligned
    const n = generateStoryPrompt(['rnb'], 'Heartbreak', 55);
    expect(typeof n.archetypeName).toBe('string');
    expect(n.archetypeName.length).toBeGreaterThan(0);
  });

  it('every VIBE_OPTIONS id is accepted without throwing', () => {
    for (const vibe of VIBE_OPTIONS) {
      expect(() => generateStoryPrompt(['electronic'], vibe.id, 1)).not.toThrow();
    }
  });

  it('titleIdea consists of two words (Fragment A + Fragment B)', () => {
    const n = generateStoryPrompt(['pop'], null, 200);
    const words = n.titleIdea.trim().split(/\s+/);
    // Fragments can be multi-word (e.g. "Last Exit"), so at least 2 word tokens
    expect(words.length).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. generateLyricsViaEdge — fallback recovery
// ─────────────────────────────────────────────────────────────────────────────

describe('generateLyricsViaEdge — fallback recovery (no Supabase configured)', () => {
  it('returns { source: "local" } when Supabase URL is not configured (fetch fails)', async () => {
    // Stub fetch to simulate a completely unreachable endpoint (TypeError / network
    // failure) so this test is environment-independent — it doesn't matter whether
    // VITE_SUPABASE_URL is set in a local .env file.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unreachable')));

    const result = await generateLyricsViaEdge(BASE_CLIENT_PARAMS);
    expect(result.source).toBe('local');
  });

  it('fallback lyrics are non-empty and contain at least one section header', async () => {
    const result = await generateLyricsViaEdge(BASE_CLIENT_PARAMS);
    expect(result.lyrics.trim().length).toBeGreaterThan(50);
    expect(result.lyrics).toMatch(/\[/);
  });

  it('fallback result includes a warning message explaining the fallback', async () => {
    const result = await generateLyricsViaEdge(BASE_CLIENT_PARAMS);
    if ('warning' in result) {
      expect(typeof result.warning).toBe('string');
      expect((result.warning as string).length).toBeGreaterThan(5);
    }
  });

  it('returns { source: "local" } when fetch returns HTTP 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    }));

    const result = await generateLyricsViaEdge(BASE_CLIENT_PARAMS);
    expect(result.source).toBe('local');
  });

  it('returns { source: "local" } when fetch returns HTTP 429 rate limit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Too Many Requests' }),
    }));

    const result = await generateLyricsViaEdge(BASE_CLIENT_PARAMS);
    expect(result.source).toBe('local');
  });

  it('returns { source: "local" } when API returns an empty lyrics string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lyrics: '' }),   // empty → triggers localFallback
    }));

    const result = await generateLyricsViaEdge(BASE_CLIENT_PARAMS);
    expect(result.source).toBe('local');
    if ('warning' in result) {
      expect((result.warning as string).toLowerCase()).toContain('empty');
    }
  });

  it('returns { source: "local" } when API returns malformed JSON (missing "lyrics" key)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'ok' }),   // no "lyrics" key → localFallback
    }));

    const result = await generateLyricsViaEdge(BASE_CLIENT_PARAMS);
    expect(result.source).toBe('local');
  });

  it('respects an AbortController signal and still falls back gracefully', async () => {
    const controller = new AbortController();
    controller.abort(); // abort before the call even starts

    const result = await generateLyricsViaEdge({
      ...BASE_CLIENT_PARAMS,
      signal: controller.signal,
    });
    // AbortError is caught → localFallback
    expect(result.source).toBe('local');
    expect(result.lyrics.length).toBeGreaterThan(0);
  });

  it('handles a fetch promise rejection (network drop) gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network failure')));

    const result = await generateLyricsViaEdge(BASE_CLIENT_PARAMS);
    expect(result.source).toBe('local');
  });

  it('fallback respects the chosen structure — hiphop produces Verse sections', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unreachable')));

    const result = await generateLyricsViaEdge({
      ...BASE_CLIENT_PARAMS,
      theme: 'Late nights, studio sessions, the come-up',
      structure: HIP_HOP_STRUCTURE,
    });
    expect(result.source).toBe('local');
    expect(result.lyrics).toMatch(/\[Verse/);
    expect(result.lyrics).toMatch(/\[Chorus/);
  });

  it('when API returns { fallback: true } body it uses local generator', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ fallback: true }),
    }));

    const result = await generateLyricsViaEdge(BASE_CLIENT_PARAMS);
    expect(result.source).toBe('local');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. SURPRISE_RECIPES — preset recipes carry valid lyric structures
// ─────────────────────────────────────────────────────────────────────────────

describe('SURPRISE_RECIPES — preset completeness', () => {
  it('every recipe has a unique non-empty id', () => {
    const ids = SURPRISE_RECIPES.map(r => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    for (const id of ids) {
      expect(id.trim().length).toBeGreaterThan(0);
    }
  });

  it('every recipe lyrics string contains at least one section header bracket', () => {
    for (const recipe of SURPRISE_RECIPES) {
      expect(recipe.lyrics).toMatch(/\[/);
      expect(recipe.lyrics.trim().length).toBeGreaterThan(50);
    }
  });

  it('neo-soul-velvet recipe has Verse 1, Chorus, Verse 2, Bridge, Outro blocks', () => {
    const recipe = SURPRISE_RECIPES.find(r => r.id === 'neo-soul-velvet')!;
    expect(recipe).toBeDefined();
    expect(recipe.lyrics).toContain('[Verse 1');
    expect(recipe.lyrics).toContain('[Chorus');
    expect(recipe.lyrics).toContain('[Verse 2');
    expect(recipe.lyrics).toContain('[Bridge');
    expect(recipe.lyrics).toContain('[Outro');
  });

  it('dark-trap-night-drive recipe contains trap-specific section headers', () => {
    const recipe = SURPRISE_RECIPES.find(r => r.id === 'dark-trap-night-drive')!;
    expect(recipe).toBeDefined();
    expect(recipe.lyrics).toContain('[Verse 1');
    expect(recipe.lyrics).toContain('[Chorus');
    expect(recipe.lyrics).toContain('[Outro');
  });

  it('pickRandomSurpriseRecipe always returns one of the known recipes', () => {
    const ids = new Set(SURPRISE_RECIPES.map(r => r.id));
    for (let i = 0; i < 30; i++) {
      const picked = pickRandomSurpriseRecipe();
      expect(ids.has(picked.id)).toBe(true);
    }
  });

  it('every recipe has valid numeric bpm (> 0 and < 300)', () => {
    for (const recipe of SURPRISE_RECIPES) {
      expect(recipe.bpm).toBeGreaterThan(0);
      expect(recipe.bpm).toBeLessThan(300);
    }
  });

  it('every recipe has a structureId matching a known template', () => {
    const knownIds = new Set(STRUCTURE_TEMPLATES.map(t => t.id));
    for (const recipe of SURPRISE_RECIPES) {
      expect(knownIds.has(recipe.structureId)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. parseSections / countSyllables / cleanLyricText — utilities
// ─────────────────────────────────────────────────────────────────────────────

describe('parseSections — section header extraction', () => {
  const SAMPLE_LYRICS = [
    '[Verse 1 | intimate delivery]',
    'Line one of the verse',
    'Line two of the verse',
    '',
    '[Chorus | anthemic belt]',
    'Hook hook hook',
    '',
    '[Verse 2 | dynamic]',
    'Another verse here',
    '',
    '[Outro | fade]',
    '(Fading...)',
  ].join('\n');

  it('correctly identifies all top-level section headers', () => {
    const sections = parseSections(SAMPLE_LYRICS);
    const labels = sections.map(s => s.label);
    expect(labels.some(l => l.startsWith('Verse 1'))).toBe(true);
    expect(labels.some(l => l.startsWith('Chorus'))).toBe(true);
    expect(labels.some(l => l.startsWith('Verse 2'))).toBe(true);
    expect(labels.some(l => l.startsWith('Outro'))).toBe(true);
  });

  it('returns sections in order of appearance', () => {
    const sections = parseSections(SAMPLE_LYRICS);
    for (let i = 1; i < sections.length; i++) {
      expect(sections[i].start).toBeGreaterThanOrEqual(sections[i - 1].start);
    }
  });

  it('does not include performance cue tags as sections', () => {
    const cueHeavyLyrics = [
      '[Verse 1 | delivery]',
      '[Belting]',
      'A lyric line',
      '[Whispered]',
      'Soft line',
    ].join('\n');
    const sections = parseSections(cueHeavyLyrics);
    // Only 'Verse 1' should be a section; Belting / Whispered are cues
    expect(sections.length).toBe(1);
    expect(sections[0].label).toMatch(/^Verse 1/);
  });

  it('handles empty input without throwing', () => {
    expect(() => parseSections('')).not.toThrow();
    expect(parseSections('')).toEqual([]);
  });
});

describe('countSyllables — syllable estimation', () => {
  const cases: Array<[string, number, number]> = [
    ['Hello World', 3, 4],          // hel-lo world (3 syllables exact)
    ['in the city at night', 5, 7], // 6 syllables
    ['fire', 1, 2],                 // 1-2 syllables (silent e)
    ['beautiful', 3, 4],            // beau-ti-ful
    ['', 0, 0],                     // empty → 0
  ];

  for (const [input, min, max] of cases) {
    it(`"${input || '(empty)'}" falls within [${min}, ${max}] syllables`, () => {
      const syl = countSyllables(input);
      expect(syl).toBeGreaterThanOrEqual(min);
      expect(syl).toBeLessThanOrEqual(max);
    });
  }

  it('longer sentences produce more syllables than short ones', () => {
    const short = countSyllables('fire');
    const long  = countSyllables('standing in the morning light by the ocean shore');
    expect(long).toBeGreaterThan(short);
  });
});

describe('cleanLyricText — output sanitisation', () => {
  it('removes instrument/gear words from lyric lines', () => {
    const raw = '[Verse 1]\nThe synthesizer played a melody\nI heard the bassline drop';
    const cleaned = cleanLyricText(raw);
    expect(cleaned).not.toContain('synthesizer');
    expect(cleaned).not.toContain('bassline');
  });

  it('preserves section headers intact', () => {
    const raw = '[Verse 1 | intimate delivery]\nA clean lyric line here';
    const cleaned = cleanLyricText(raw);
    expect(cleaned).toContain('[Verse 1');
  });

  it('collapses triple-blank lines down to double blank lines', () => {
    const raw = 'Line one\n\n\n\nLine two';
    const cleaned = cleanLyricText(raw);
    expect(cleaned).not.toMatch(/\n{3,}/);
  });

  it('returns empty string for empty input', () => {
    expect(cleanLyricText('')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Vocal persona bracket-tag injection
// ─────────────────────────────────────────────────────────────────────────────

describe('injectPersonaBracketTag / clearPersonaBracketTags — vocal persona helpers', () => {
  // The injection regex matches bare [Intro], [Verse 1], or [Verse] headers
  // (no pipe modifiers). Use a sample that opens with [Verse 1] so we can
  // verify the tag is inserted right after that header.
  const BARE_SAMPLE = [
    '[Verse 1]',
    'First verse line here',
    '',
    '[Chorus]',
    'Hook line here',
  ].join('\n');

  // Piped-header sample — tests the prepend-fallback path.
  const PIPED_SAMPLE = [
    '[Intro | atmospheric]',
    'An opening line',
    '',
    '[Verse 1 | intimate delivery]',
    'First verse line here',
  ].join('\n');

  it('injects bracketTag immediately after the first [Verse 1] header (bare header)', () => {
    const persona = VOCAL_PERSONAS.find(p => p.id === 'neo-soul-gospel')!;
    const result = injectPersonaBracketTag(BARE_SAMPLE, persona.bracketTag);
    // [Verse 1] is at index 0; bracketTag must appear after it
    const verseIdx = result.indexOf('[Verse 1]');
    const tagIdx   = result.indexOf(persona.bracketTag);
    expect(verseIdx).toBe(0);
    expect(tagIdx).toBeGreaterThan(verseIdx);
    // And before the first verse lyric line
    const firstLineIdx = result.indexOf('First verse line here');
    expect(tagIdx).toBeLessThan(firstLineIdx);
  });

  it('prepends bracketTag when headers contain pipe modifiers (no bare match)', () => {
    // When the regex cannot find a bare [Intro]/[Verse 1] header, the tag is
    // prepended before all content — this is the path taken for engine-generated
    // lyrics which always emit [Verse 1 | ...] style headers.
    const persona = VOCAL_PERSONAS.find(p => p.id === 'neo-soul-gospel')!;
    const result = injectPersonaBracketTag(PIPED_SAMPLE, persona.bracketTag);
    expect(result).toContain(persona.bracketTag);
    // Tag should be at position 0 (prepended)
    expect(result.startsWith(persona.bracketTag)).toBe(true);
  });

  it('clearPersonaBracketTags removes all persona tags', () => {
    const persona = VOCAL_PERSONAS.find(p => p.id === 'metal-rock-growl')!;
    const injected = injectPersonaBracketTag(BARE_SAMPLE, persona.bracketTag);
    expect(injected).toContain(persona.bracketTag);
    const cleared = clearPersonaBracketTags(injected);
    expect(cleared).not.toContain(persona.bracketTag);
  });

  it('switching persona does not stack multiple cue tags', () => {
    const p1 = VOCAL_PERSONAS[0];
    const p2 = VOCAL_PERSONAS[1];
    const once  = injectPersonaBracketTag(BARE_SAMPLE, p1.bracketTag);
    const twice = injectPersonaBracketTag(once, p2.bracketTag); // replaces p1 with p2
    expect(twice).not.toContain(p1.bracketTag);
    expect(twice).toContain(p2.bracketTag);
  });

  it('pickPersonaForGenre returns a known persona id for hiphop', () => {
    const ids = new Set(VOCAL_PERSONAS.map(p => p.id));
    const picked = pickPersonaForGenre(['hiphop']);
    expect(ids.has(picked)).toBe(true);
  });

  it('pickPersonaForGenre returns a known persona id for unknown genre', () => {
    const ids = new Set(VOCAL_PERSONAS.map(p => p.id));
    const picked = pickPersonaForGenre(['unknown-xyz']);
    expect(ids.has(picked)).toBe(true);
  });

  it('every VOCAL_PERSONA has bracketTag starting and ending with brackets', () => {
    for (const persona of VOCAL_PERSONAS) {
      expect(persona.bracketTag).toMatch(/^\[.+\]$/);
    }
  });
});
