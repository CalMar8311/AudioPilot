// AI Lyric Generator workspace — controls, enhanced editor, syllable gutter, regenerate

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileMusic, Sparkles, Copy, RefreshCw, Wand2, Plus, Type, Gauge, ChevronDown, Users, Dices, BookOpen, Zap as ZapIcon, ArrowUp, ArrowDown, Music2 as Rephrase, Hash } from 'lucide-react';
import {
  STRUCTURE_TEMPLATES, TONE_OPTIONS, LANG_OPTIONS, RHYME_OPTIONS,
  RHYME_SCHEME_IDS, REGIONAL_FLOWS, DELIVERY_DIRECTIVES, RHYME_FAMILIES,
  randomThemeForGenre, NARRATIVE_THEMES, type NarrativeTheme,
  type RhymeScheme, type Tone, type Lang, type StructureId, type StructureTemplate,
} from '@/data/lyricBanks';
import {
  generateStoryPrompt, VIBE_OPTIONS, type VibeFocus, type GeneratedNarrative,
} from '@/utils/narrativeEngine';
import { structureIdForGenres, GENRE_BLUEPRINTS } from '@/data/catalogs';
import { fusedLyricContext, resolveArchetypes } from '@/engine/styleFusion';
import { SectionCard, DiceButton } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';
import {
  generateLyricsViaEdge, regenerateSectionLocal,
} from '@/engine/lyricClient';
import type { GenerateParams } from '@/engine/lyricClient';
import {
  regeneratableSections, countSyllables,
  regenerateSelectionLocal, cleanLyricText, parseSections,
} from '@/engine/lyricEngine';
import { Zap, Cpu, Radio, Mic2 } from 'lucide-react';

const QUICK_INSERT_TAGS = [
  '[Verse]', '[Chorus]', '[Pre-Chorus]', '[Bridge]', '[Drop]',
  '[Instrumental Solo]', '[Outro]', '[Build-up]', '[Breakdown]',
];

const INLINE_CUES = [
  '[Whispered]', '[Belting]', '[Bass Drop]', '[Faster Tempo]', '[Half-Time]',
  '[Ad-Lib]', '[Harmonies]', '[Vocoder]', '[Crowd Chant]',
];

// Helper: toggle a value in a string array state
function toggleInArray(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

// Helper: apply alternating vocal performance tags for duet mode
function applyDuetVocalTags(lyrics: string, archetypes: string[]): string {
  const resolved = resolveArchetypes(archetypes);
  if (resolved.length < 2) return lyrics;
  
  const [singerA, singerB] = resolved;
  const tagA = `[Singer A - ${singerA.promptTags[0]}]`;
  const tagB = `[Singer B - ${singerB.promptTags[0]}]`;
  const tagBoth = `[Both - Dual Harmonies]`;
  
  const lines = lyrics.split('\n');
  let lineIndex = 0;
  let currentSinger = 'A';
  
  const processedLines = lines.map(line => {
    // Skip section headers and empty lines
    if (line.startsWith('[') || line.trim() === '') {
      return line;
    }
    
    // Alternate singers every few lines
    lineIndex++;
    if (lineIndex % 4 === 0) {
      currentSinger = currentSinger === 'A' ? 'B' : 'A';
    }
    
    // Add vocal tag at start of line
    const tag = currentSinger === 'A' ? tagA : tagB;
    return `${tag}\n${line}`;
  });
  
  return processedLines.join('\n');
}

function renderHighlighted(text: string) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) => {
    if (/^\[[^\]]+\]$/.test(part)) {
      const isCue = part.includes(' ') || /Drop|Tempo|Ad-Lib|Harmonies|Vocoder|Chant|Energy|Power|Stripped|Fading|Atmospheric|Tension|Snare|Shift|Flow|Pulse/.test(part.slice(1, -1));
      return (
        <span key={i} className={isCue ? 'text-neon-magenta font-semibold' : 'mt'}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Rhyme finder ────────────────────────────────────────────────────────────
// Checks whether two words share a similar ending sound (last 2-3 chars).
function endSoundsMatch(a: string, b: string): boolean {
  if (a === b) return false;
  const tail = (s: string, n: number) => s.slice(-n);
  return tail(a, 3) === tail(b, 3) || tail(a, 2) === tail(b, 2);
}

/** Return up to 8 musically-compatible rhyme suggestions for a given word. */
function findRhymesForWord(word: string): string[] {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return [];
  const hits = new Set<string>();
  for (const words of Object.values(RHYME_FAMILIES)) {
    // Direct family match
    if (words.some(w => w === clean || endSoundsMatch(clean, w))) {
      words.filter(w => w !== clean).forEach(w => hits.add(w));
    }
    if (hits.size >= 12) break;
  }
  // Deduplicate and return the best 8
  return Array.from(hits).filter(w => w !== clean).slice(0, 8);
}

// ── Section block parser for the structured card editor ─────────────────────
/**
 * Structural section headers that get their own editable card.
 * Anything else (inline cues like [Whispered], [Belting]) stays in the body.
 */
const STRUCTURAL_LABEL_RE = /^(?:Intro|Verse\s*\d*|Chorus\s*\d*|Bridge|Pre-Chorus|Hook|Outro)/i;

interface SectionBlock {
  /** Unique id within this parse: "${label}-${occurrenceIndex}" */
  id: string;
  /** Text inside the brackets, e.g. "Verse 1", "Chorus" */
  label: string;
  /** Full bracket header line as it appears in lyrics, e.g. "[Verse 1]" */
  header: string;
  /** Section content — all lines after the header, including inline cue tags */
  body: string;
  /** True when label matches Chorus or Chorus N */
  isChorus: boolean;
  /** True for structural sections (verses, choruses, bridge …) — these get cards */
  isStructural: boolean;
}

/**
 * Splits lyrics into structural blocks.
 * Everything before the first structural header becomes a "preamble" block
 * (preserved in assembly but shown without a card).
 */
function parseSectionBlocks(lyrics: string): SectionBlock[] {
  const lines = lyrics.split('\n');
  const blocks: SectionBlock[] = [];
  const labelCounts: Record<string, number> = {};
  let curLabel: string | null = null;
  let curHeader = '';
  let bodyLines: string[] = [];

  const flush = () => {
    const isStructural = curLabel !== null;
    const label = curLabel ?? '__preamble__';
    const body = bodyLines.join('\n').trimEnd();
    if (isStructural || body.trim()) {
      const count = labelCounts[label] ?? 0;
      labelCounts[label] = count + 1;
      blocks.push({
        id: `${label}-${count}`,
        label,
        header: curHeader,
        body,
        isChorus: /^chorus(\s*\d+)?$/i.test(label.trim()),
        isStructural,
      });
    }
    curLabel = null;
    curHeader = '';
    bodyLines = [];
  };

  for (const line of lines) {
    const m = line.match(/^\[([^\]]+)\]$/);
    if (m && STRUCTURAL_LABEL_RE.test(m[1].trim())) {
      flush();
      curLabel = m[1].trim();
      curHeader = line;
    } else {
      bodyLines.push(line);
    }
  }
  flush();
  return blocks;
}

/**
 * Reassembles the full lyrics string from the block list, substituting
 * per-block draft edits. Non-structural (preamble) blocks are preserved as-is.
 * Blocks are separated by blank lines so the raw textarea stays clean.
 */
function assembleSectionBlocks(
  blocks: SectionBlock[],
  drafts: Record<string, string>,
): string {
  return blocks
    .map(b => {
      const body = (drafts[b.id] !== undefined ? drafts[b.id] : b.body).trimEnd();
      if (b.isStructural) {
        return body ? `${b.header}\n${body}` : b.header;
      }
      return body; // preamble — keep as-is
    })
    .filter(s => s.trim())
    .join('\n\n');
}

function reorderSectionInLyrics(lyrics: string, label: string, direction: 'up' | 'down'): string {
  // Re-use parseSectionBlocks so reordering is consistent with card IDs
  const blocks = parseSectionBlocks(lyrics);
  const idx = blocks.findIndex(b => b.label === label && b.isStructural);
  if (idx < 0) return lyrics;
  const target = direction === 'up' ? idx - 1 : idx + 1;
  if (target < 0 || target >= blocks.length) return lyrics;
  const next = [...blocks];
  [next[idx], next[target]] = [next[target], next[idx]];
  return assembleSectionBlocks(next, {});
}

// ── Defensive section-reroll wrapper ────────────────────────────────────────
function escapeRegExpLocal(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wraps regenerateSectionLocal with three safety guards:
 * 1. Section header must exist in the lyrics before attempting reroll.
 * 2. The generated replacement must be non-empty.
 * 3. The generated replacement must still contain the section header —
 *    if the engine strips it, fall back to the original to prevent data loss.
 */
function safeRerollSection(
  lyrics: string,
  label: string,
  params: GenerateParams,
): string {
  const headerRe = new RegExp(`\\[${escapeRegExpLocal(label)}\\]`);
  if (!headerRe.test(lyrics)) return lyrics; // section doesn't exist, no-op

  const result = regenerateSectionLocal(lyrics, label, params);

  if (!result || !result.trim()) return lyrics; // empty output → keep original

  // If the header disappeared from the output, the engine returned garbage
  if (!headerRe.test(result)) {
    // Re-splice: find the original block and substitute just the body
    const origLines = lyrics.split('\n');
    const headerIdx = origLines.findIndex(l => l.trim() === `[${label}]`);
    if (headerIdx < 0) return lyrics;
    const newLines = result.split('\n').filter(l => l.trim() !== `[${label}]`);
    const before = origLines.slice(0, headerIdx + 1);
    const afterHeaderOrig = origLines.slice(headerIdx + 1);
    const nextHeaderIdx = afterHeaderOrig.findIndex(l => /^\[[^\]]+\]$/.test(l.trim()));
    const after = nextHeaderIdx >= 0 ? afterHeaderOrig.slice(nextHeaderIdx) : [];
    return [...before, ...newLines, ...after].join('\n');
  }

  return result;
}

// ── Lyric snapshot type ──────────────────────────────────────────────────────
interface LyricSnapshot {
  text: string;
  label: string;
  ts: number; // Date.now()
}

// ── Syllable colour helper ───────────────────────────────────────────────────
function syllableColour(count: number): string {
  if (count === 0) return 'text-ink-700';
  if (count <= 6)  return 'text-neon-cyan/60';
  if (count <= 10) return 'text-neon-lime/70';
  if (count <= 13) return 'text-neon-amber/70';
  return 'text-neon-rose/70';
}

// Expanded quick-inject metatags (for the scrollable shelf)
const METATAG_SHELF: { label: string; tag: string; color: string }[] = [
  { label: '[Harmonies]',         tag: '[Harmonies]',         color: 'text-neon-cyan'    },
  { label: '[Ad-lib]',            tag: '[Ad-lib]',            color: 'text-neon-magenta' },
  { label: '[Whisper]',           tag: '[Whispered]',         color: 'text-ink-300'      },
  { label: '[Falsetto]',          tag: '[Falsetto]',          color: 'text-neon-blue'    },
  { label: '[Belt]',              tag: '[Belting]',           color: 'text-neon-rose'    },
  { label: '[Inst. Break]',       tag: '[Instrumental Break]',color: 'text-neon-lime'    },
  { label: '[Beat Drop]',         tag: '[Bass Drop]',         color: 'text-neon-amber'   },
  { label: '[Guitar Solo]',       tag: '[Guitar Solo]',       color: 'text-neon-lime'    },
  { label: '[Verse]',             tag: '[Verse]',             color: 'text-ink-300'      },
  { label: '[Chorus]',            tag: '[Chorus]',            color: 'text-ink-300'      },
  { label: '[Pre-Chorus]',        tag: '[Pre-Chorus]',        color: 'text-ink-300'      },
  { label: '[Bridge]',            tag: '[Bridge]',            color: 'text-ink-300'      },
  { label: '[Drop]',              tag: '[Drop]',              color: 'text-neon-amber'   },
  { label: '[Build-up]',          tag: '[Build-up]',          color: 'text-neon-amber'   },
  { label: '[Breakdown]',         tag: '[Breakdown]',         color: 'text-ink-300'      },
  { label: '[Outro]',             tag: '[Outro]',             color: 'text-ink-300'      },
  { label: '[Vocoder]',           tag: '[Vocoder]',           color: 'text-neon-blue'    },
  { label: '[Crowd Chant]',       tag: '[Crowd Chant]',       color: 'text-neon-rose'    },
  { label: '[Half-Time]',         tag: '[Half-Time]',         color: 'text-neon-cyan'    },
  { label: '[Faster Tempo]',      tag: '[Faster Tempo]',      color: 'text-neon-amber'   },
];

export function LyricGeneratorSection({ eng }: { eng: PromptEngine }) {
  const {
    state, update, showToast,
    surpriseTheme, setSurpriseTheme,
    toggleDuetMode, addRecentPrompt, setLyricsCursor,
    isLyricGenerating, setIsLyricGenerating,
  } = eng;
  const taRef = useRef<HTMLTextAreaElement>(null);
  // Abort controller for in-flight lyric generation requests.
  // Rapid "Surprise Me" clicks will cancel the previous fetch and start fresh.
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generator params (local state)
  // Keep these truly optional so the user can clear them and return to a blank canvas.
  const [theme, setTheme] = useState('');
  const [scheme, setScheme] = useState<RhymeScheme | null>(null);
  const [tone, setTone] = useState<Tone | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  const [structId, setStructId] = useState<StructureId | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenTarget, setRegenTarget] = useState<string | null>(null);
  const [genSource, setGenSource] = useState<'openai' | 'local' | null>(null);
  const [genWarning, setGenWarning] = useState<string | null>(null);
  const [regionalFlows, setRegionalFlows] = useState<string[]>([]);
  const [deliveryDirectives, setDeliveryDirectives] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState({ start: 0, end: 0 });
  const [selectedNarrativeId, setSelectedNarrativeId] = useState<string>('');

  // ── Inline lyric toolkit state ───────────────────────────────────────────
  // inlineSectionRerolling accepts either a section label (legacy) or block id
  const [inlineSectionRerolling, setInlineSectionRerolling] = useState<string | null>(null);
  const [rhymeSuggestions, setRhymeSuggestions] = useState<string[]>([]);
  const [rhymeWord, setRhymeWord] = useState('');

  // ── Section card editor state ────────────────────────────────────────────
  /**
   * Per-block draft bodies: Record<blockId, draftText>.
   * Populated/reset whenever `state.lyrics` changes from an external source.
   * Committed to `state.lyrics` on textarea onBlur.
   */
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});
  /** When true, editing or rerolling ANY chorus card updates ALL chorus blocks. */
  const [syncChoruses, setSyncChoruses] = useState(true);
  /**
   * Tracks the last lyrics value we committed ourselves (via `commitSectionEdit`
   * or `handleSectionCardReroll`), so the reset-on-external-change effect can
   * distinguish our own commits from external updates (generate, undo, etc.).
   */
  const lastSyncedLyricsRef = useRef('');
  // ─────────────────────────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────────────────────────

  // ── Lyric Undo / Redo history stack ─────────────────────────────────────
  // We keep a parallel local snapshot stack separate from the global prompt
  // history so undo/redo is scoped to just the Lyric Canvas workspace.
  // Using refs for O(1) synchronous reads inside handlers, plus a state
  // counter to force re-renders when the stack changes.
  const lyricHistoryRef = useRef<LyricSnapshot[]>([]);
  const histIdxRef = useRef<number>(-1);
  const [histRenderTick, setHistRenderTick] = useState(0); // trigger UI updates
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  // Debounce timer — prevent a snapshot per keystroke during manual typing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ────────────────────────────────────────────────────────────────────────

  // ── Dynamic Narrative Matrix ─────────────────────────────────────────────
  const [vibeFilter, setVibeFilter] = useState<VibeFocus | null>(null);
  const [generatedNarrative, setGeneratedNarrative] = useState<GeneratedNarrative | null>(null);
  const [narrativeRollCount, setNarrativeRollCount] = useState(0);

  const handleRollNarrative = () => {
    const freshNarrative = generateStoryPrompt(
      state.genres,
      vibeFilter,
      Date.now() + narrativeRollCount,
    );
    setGeneratedNarrative(freshNarrative);
    setNarrativeRollCount(c => c + 1);
  };

  const applyNarrativeToTheme = (narrative: GeneratedNarrative) => {
    setTheme(`${narrative.titleIdea} — ${narrative.storyBrief}`);
    showToast(`Story applied: "${narrative.titleIdea}"`);
  };

  const injectNarrativeHooks = (narrative: GeneratedNarrative) => {
    const seedText = [
      `[Verse 1]`,
      narrative.lyricSeedHooks[0],
      '',
      '[Chorus]',
      narrative.lyricSeedHooks[1],
    ].join('\n');
    update('lyrics', state.lyrics ? state.lyrics + '\n\n' + seedText : seedText);
    addRecentPrompt(seedText);
    showToast('Seed hooks injected into Lyric Canvas');
  };

  const injectNarrativeMetatag = (tag: string) => {
    eng.insertLyricTag(tag);
    showToast('Metatag inserted at cursor');
  };
  // ────────────────────────────────────────────────────────────────────────

  const selectedNarrative = useMemo(
    () => NARRATIVE_THEMES.find(nt => nt.id === selectedNarrativeId) || null,
    [selectedNarrativeId]
  );

  const applyNarrativeConcept = (narrative: NarrativeTheme) => {
    setSelectedNarrativeId(narrative.id);
    setTheme(narrative.promptTheme);
    const cleaned = cleanLyricText(narrative.sampleLyrics);
    update('lyrics', cleaned);
    addRecentPrompt(cleaned);
    showToast(`Applied story arc: ${narrative.title}`);
  };

  const handleRandomNarrativeConcept = () => {
    const randomNt = NARRATIVE_THEMES[Math.floor(Math.random() * NARRATIVE_THEMES.length)];
    applyNarrativeConcept(randomNt);
  };
  const fusion = useMemo(
    () => fusedLyricContext(state.artistArchetypes, state.artistBlend),
    [state.artistArchetypes, state.artistBlend],
  );

  /** Parsed structural section blocks — updates whenever state.lyrics changes */
  const parsedBlocks = useMemo(() => parseSectionBlocks(state.lyrics), [state.lyrics]);

  // ── History helpers ──────────────────────────────────────────────────────
  const pushLyricSnapshot = (text: string, label: string) => {
    // Truncate any "future" entries that were undone
    lyricHistoryRef.current = lyricHistoryRef.current.slice(0, histIdxRef.current + 1);
    // Deduplicate: don't push if identical to current snapshot
    const last = lyricHistoryRef.current[lyricHistoryRef.current.length - 1];
    if (last && last.text === text) return;
    lyricHistoryRef.current.push({ text, label, ts: Date.now() });
    histIdxRef.current = lyricHistoryRef.current.length - 1;
    setHistRenderTick(t => t + 1);
  };

  const undoLyric = () => {
    if (histIdxRef.current <= 0) return;
    histIdxRef.current -= 1;
    const snap = lyricHistoryRef.current[histIdxRef.current];
    if (snap) {
      update('lyrics', snap.text);
      setHistRenderTick(t => t + 1);
      showToast(`↶ Undone — restored "${snap.label}"`);
    }
  };

  const redoLyric = () => {
    if (histIdxRef.current >= lyricHistoryRef.current.length - 1) return;
    histIdxRef.current += 1;
    const snap = lyricHistoryRef.current[histIdxRef.current];
    if (snap) {
      update('lyrics', snap.text);
      setHistRenderTick(t => t + 1);
      showToast(`↷ Redone — "${snap.label}"`);
    }
  };

  const restoreSnapshot = (idx: number) => {
    const snap = lyricHistoryRef.current[idx];
    if (!snap) return;
    histIdxRef.current = idx;
    update('lyrics', snap.text);
    setHistRenderTick(t => t + 1);
    setHistoryDrawerOpen(false);
    showToast(`Restored: "${snap.label}"`);
  };
  // ────────────────────────────────────────────────────────────────────────

  // Keyboard shortcuts: Ctrl+Z / Cmd+Z = undo, Ctrl+Y / Cmd+Shift+Z = redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoLyric(); }
      else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redoLyric(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-initialise sectionDrafts when lyrics change from an external source
  // (full generation, undo/redo, Surprise Me, reset, etc.).
  // We distinguish external changes from our own commits via lastSyncedLyricsRef.
  useEffect(() => {
    if (state.lyrics !== lastSyncedLyricsRef.current) {
      const blocks = parseSectionBlocks(state.lyrics);
      const fresh: Record<string, string> = {};
      blocks.forEach(b => { if (b.isStructural) fresh[b.id] = b.body; });
      setSectionDrafts(fresh);
      lastSyncedLyricsRef.current = state.lyrics;
    }
  }, [state.lyrics]);

  const effectiveTone = tone ?? 'nostalgic';
  const effectiveScheme = scheme ?? 'ABAB';
  const effectiveStructureId = structId ?? 'standard-pop';

  useEffect(() => {
    const isBlankStudio = !state.genres.length && !state.subgenres.length && !state.instruments.length && !state.customInstruments.length && !state.vocalTypes.length && !state.vocalEffects.length && !state.moods.length && !state.production.length && !state.negativeTags.length && !state.musicalKeys.length && !state.chordVoicings.length && !state.artistArchetypes.length && !state.lyrics.trim();
    if (isBlankStudio) {
      setTheme('');
      setScheme(null);
      setTone(null);
      setLang('en');
      setStructId(null);
      setRegionalFlows([]);
      setDeliveryDirectives([]);
    }
  }, [state]);

  // Auto-sync song structure when genres change (genre-adaptive structures)
  useEffect(() => {
    const newStructId = structureIdForGenres(state.genres) as StructureId;
    if (newStructId && newStructId !== structId && structId !== null) {
      setStructId(newStructId);
    }
  }, [state.genres, structId]);

  // Consume AI-generated theme from the "Surprise Me" engine.
  // When autoGenerateLyrics is true, immediately invoke runGenerate() with the
  // explicit param values (before React re-renders with the new state) so the
  // user never needs to manually click "Generate Lyrics" after a Surprise roll.
  useEffect(() => {
    if (!surpriseTheme) return;

    const newTheme    = surpriseTheme.theme;
    const newStructId = surpriseTheme.structureId as StructureId;
    const newScheme   = surpriseTheme.rhymeScheme as RhymeScheme;

    setTheme(newTheme);
    setStructId(newStructId);
    setScheme(newScheme);

    if (surpriseTheme.lyricMetatags) {
      update('lyrics', surpriseTheme.lyricMetatags);
    }

    // Sync rhyme scheme / flows from matching genre blueprint
    const bp = GENRE_BLUEPRINTS.find(b =>
      state.genres[0] === b.primaryGenre &&
      (!b.secondaryGenre || state.genres.includes(b.secondaryGenre))
    );
    if (bp) {
      setScheme(bp.rhymeScheme as RhymeScheme);
      if (bp.regionalFlows.length) setRegionalFlows(bp.regionalFlows);
    }

    setSurpriseTheme(null);

    // Auto-generate lyrics immediately — pass explicit values so we don't rely
    // on React state that hasn't re-rendered yet.
    if (surpriseTheme.autoGenerateLyrics) {
      runGenerate({ theme: newTheme, structId: newStructId, scheme: newScheme });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surpriseTheme]);

  useEffect(() => {
    const labels = resolveArchetypes(state.artistArchetypes)
      .map(a => a.relatedFlowId ? REGIONAL_FLOWS.find(f => f.id === a.relatedFlowId)?.label : undefined)
      .filter((x): x is string => Boolean(x));
    if (labels.length) {
      setRegionalFlows(prev => Array.from(new Set([...prev, ...labels])));
    }
    if (fusion.suggestedRhyme) setScheme(fusion.suggestedRhyme);
  }, [state.artistArchetypes]); // eslint-disable-line react-hooks/exhaustive-deps
  const randomizeTheme = () => {
    const genreId = state.genres.length > 0 ? state.genres[0] : null;
    setTheme(randomThemeForGenre(genreId));
    showToast('Randomized theme');
  };
  const randomizeRhyme = () => {
    const next = RHYME_SCHEME_IDS[Math.floor(Math.random() * RHYME_SCHEME_IDS.length)];
    setScheme(next);
    showToast('Randomized rhyme scheme');
  };
  const randomizeStructure = () => {
    const next = STRUCTURE_TEMPLATES[Math.floor(Math.random() * STRUCTURE_TEMPLATES.length)];
    setStructId(next.id);
    showToast(`Structure: ${next.name}`);
  };

  const structure = useMemo<StructureTemplate>(
    () => STRUCTURE_TEMPLATES.find(s => s.id === (structId ?? effectiveStructureId)) ?? STRUCTURE_TEMPLATES[0],
    [structId, effectiveStructureId],
  );

  const syllableLines = useMemo(
    () => state.lyrics.split('\n').map(line => ({ line, count: countSyllables(line) })),
    [state.lyrics],
  );
  const totalSyllables = syllableLines.reduce((a, b) => a + b.count, 0);
  const lineCount = syllableLines.length;

  const regenSections = useMemo(() => regeneratableSections(state.lyrics), [state.lyrics]);

  /**
   * Core generation routine. Accepts optional `overrides` so it can be called
   * immediately from the surpriseTheme effect (before React state updates settle)
   * with the explicit values that were just applied.
   *
   * Cancels any in-flight request via AbortController before starting a new one,
   * so rapid "Surprise Me" clicks never stack up.
   */
  const runGenerate = async (overrides?: {
    theme?: string;
    structId?: StructureId;
    scheme?: RhymeScheme;
  }) => {
    const activeTheme = (overrides?.theme ?? theme).trim();
    if (!activeTheme) { showToast('Enter a theme or story first'); return; }

    // Cancel any previous in-flight fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Resolve the generation parameters — use overrides where provided so we don't
    // depend on React state updates that haven't rendered yet.
    const activeStructId = overrides?.structId ?? structId ?? effectiveStructureId;
    const activeScheme   = overrides?.scheme   ?? effectiveScheme;
    const activeStructure =
      STRUCTURE_TEMPLATES.find(s => s.id === activeStructId) ?? STRUCTURE_TEMPLATES[0];

    setGenerating(true);
    setIsLyricGenerating(true);
    setGenWarning(null);

    try {
      const result = await generateLyricsViaEdge({
        theme: activeTheme,
        scheme: activeScheme,
        tone: effectiveTone,
        lang,
        structure: activeStructure,
        studioContext: {
          genres: state.genres,
          instruments: state.instruments,
          vocalTypes: state.vocalTypes,
          moods: state.moods,
          bpm: state.bpm,
          blend: state.blend,
          artistArchetypes: state.artistArchetypes,
          artistBlend: state.artistBlend,
        },
        vocalArchetypes: state.artistArchetypes,
        regionalFlows,
        deliveryDirectives,
        fusedStyle: fusion,
        signal: controller.signal,
      });

      // If another request already cancelled this one, silently discard.
      if (controller.signal.aborted) return;

      let processedLyrics = result.lyrics;
      if (state.duetMode) {
        processedLyrics = applyDuetVocalTags(processedLyrics, state.artistArchetypes);
      }
      // Push the BEFORE snapshot so the user can undo back to what they had
      if (state.lyrics.trim()) pushLyricSnapshot(state.lyrics, 'Before Full Generation');
      update('lyrics', processedLyrics);
      addRecentPrompt(processedLyrics);
      // Push the AFTER snapshot as the new current
      pushLyricSnapshot(processedLyrics, 'Full Generation');
      setGenSource(result.source);
      if (result.source === 'local' && result.warning) {
        setGenWarning(result.warning);
        showToast(result.warning);
      } else {
        showToast('✨ Lyrics generated');
      }
    } catch (err) {
      // AbortError is expected on cancel — don't show an error toast.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      showToast('Generation failed — try again');
    } finally {
      if (!controller.signal.aborted) {
        setGenerating(false);
        setIsLyricGenerating(false);
      }
    }
  };

  // Thin wrapper keeps the existing call-sites unchanged.
  const handleGenerate = () => runGenerate();

  const handleRegenerate = () => {
    if (!regenTarget) { showToast('Pick a section to regenerate'); return; }
    const params = {
      theme: theme.trim() || 'a reflective song about transformation',
      scheme: effectiveScheme,
      tone: effectiveTone,
      lang,
      structure,
      studioContext: {
        genres: state.genres,
        instruments: state.instruments,
        vocalTypes: state.vocalTypes,
        moods: state.moods,
        bpm: state.bpm,
        blend: state.blend,
        artistArchetypes: state.artistArchetypes,
        artistBlend: state.artistBlend,
      },
      vocalArchetypes: state.artistArchetypes,
      regionalFlows,
      deliveryDirectives,
      fusedStyle: fusion,
    };
    pushLyricSnapshot(state.lyrics, `Before [${regenTarget}] Regeneration`);
    const next = safeRerollSection(state.lyrics, regenTarget, params);
    update('lyrics', next);
    addRecentPrompt(next);
    pushLyricSnapshot(next, `[${regenTarget}] Regenerated`);
    showToast(`Regenerated ${regenTarget}`);
    setRegenOpen(false);
  };

  const handleRegenerateSelection = () => {
    const { start, end } = selectedRange;
    if (start === end) { showToast('Highlight text to regenerate'); return; }
    const selectedText = state.lyrics.slice(start, end);
    const replacement = regenerateSelectionLocal(selectedText, {
      theme: theme.trim() || 'a reflective song about transformation',
      scheme: effectiveScheme,
      tone: effectiveTone,
      lang,
      structure,
      studioContext: {
        genres: state.genres,
        instruments: state.instruments,
        vocalTypes: state.vocalTypes,
        moods: state.moods,
        bpm: state.bpm,
        blend: state.blend,
        artistArchetypes: state.artistArchetypes,
        artistBlend: state.artistBlend,
      },
      vocalArchetypes: state.artistArchetypes,
      regionalFlows,
      deliveryDirectives,
      fusedStyle: fusion,
    });
    pushLyricSnapshot(state.lyrics, 'Before Selection Rephrase');
    const next = `${state.lyrics.slice(0, start)}${replacement}${state.lyrics.slice(end)}`;
    update('lyrics', next);
    setSelectedRange({ start: start + replacement.length, end: start + replacement.length });
    addRecentPrompt(replacement);
    pushLyricSnapshot(next, 'Selection Rephrased');
    showToast('Highlighted lyric regenerated');
  };

  // ── Inline section reroll ───────────────────────────────────────────────
  const handleInlineSectionReroll = (label: string) => {
    setInlineSectionRerolling(label);
    const params = {
      theme: theme.trim() || 'a reflective, emotionally resonant song',
      scheme: effectiveScheme,
      tone: effectiveTone,
      lang,
      structure,
      studioContext: {
        genres: state.genres,
        instruments: state.instruments,
        vocalTypes: state.vocalTypes,
        moods: state.moods,
        bpm: state.bpm,
        blend: state.blend,
        artistArchetypes: state.artistArchetypes,
        artistBlend: state.artistBlend,
      },
      vocalArchetypes: state.artistArchetypes,
      regionalFlows,
      deliveryDirectives,
      fusedStyle: fusion,
    };
    pushLyricSnapshot(state.lyrics, `Before [${label}] Reroll`);
    const next = safeRerollSection(state.lyrics, label, params);
    update('lyrics', next);
    addRecentPrompt(next);
    pushLyricSnapshot(next, `[${label}] Rerolled`);
    showToast(`🎲 Rerolled [${label}]`);
    setInlineSectionRerolling(null);
  };

  const handleMoveSectionInLyrics = (label: string, direction: 'up' | 'down') => {
    const next = reorderSectionInLyrics(state.lyrics, label, direction);
    if (next !== state.lyrics) {
      pushLyricSnapshot(state.lyrics, `Before Move [${label}] ${direction}`);
      update('lyrics', next);
      pushLyricSnapshot(next, `[${label}] Moved ${direction}`);
      showToast(`Moved [${label}] ${direction}`);
    }
  };

  // ── Section Card Editor handlers ─────────────────────────────────────────

  /**
   * Called on textarea onBlur.  Assembles all blocks from current drafts,
   * syncs chorus blocks if enabled, and commits to state.lyrics in one update.
   */
  const commitSectionEdit = (block: SectionBlock, newBody: string) => {
    let committed: Record<string, string> = { ...sectionDrafts, [block.id]: newBody };

    // Chorus sync: propagate the new body to every other chorus block's draft
    if (syncChoruses && block.isChorus) {
      parsedBlocks.filter(b => b.isChorus && b.id !== block.id).forEach(b => {
        committed[b.id] = newBody;
      });
    }

    setSectionDrafts(committed);
    const assembled = assembleSectionBlocks(parsedBlocks, committed);
    if (assembled === state.lyrics) return; // nothing actually changed

    pushLyricSnapshot(state.lyrics, `Before [${block.label}] Edit`);
    update('lyrics', assembled);
    // Mark this as our own commit so the reset-effect doesn't fire
    lastSyncedLyricsRef.current = assembled;
    pushLyricSnapshot(assembled, `[${block.label}] Edited`);
  };

  /**
   * Rewrites a single card's block via the local lyric engine, then optionally
   * syncs the result to all chorus blocks.  Works per-block (uses a snippet
   * approach so it never accidentally rerolls the wrong chorus occurrence).
   */
  const handleSectionCardReroll = (block: SectionBlock) => {
    setInlineSectionRerolling(block.id);

    const params: GenerateParams = {
      theme: theme.trim() || 'a reflective, emotionally resonant song',
      scheme: effectiveScheme,
      tone: effectiveTone,
      lang,
      structure,
      studioContext: {
        genres: state.genres,
        instruments: state.instruments,
        vocalTypes: state.vocalTypes,
        moods: state.moods,
        bpm: state.bpm,
        blend: state.blend,
        artistArchetypes: state.artistArchetypes,
        artistBlend: state.artistBlend,
      },
      vocalArchetypes: state.artistArchetypes,
      regionalFlows,
      deliveryDirectives,
      fusedStyle: fusion,
    };

    // Build a one-section snippet so safeRerollSection rewrites exactly this block
    const snippet = `[${block.label}]\n${sectionDrafts[block.id] ?? block.body}`;
    const rerolled = safeRerollSection(snippet, block.label, params);
    const rerolledBody =
      parseSectionBlocks(rerolled).find(b => b.isStructural)?.body ?? (sectionDrafts[block.id] ?? block.body);

    let committed: Record<string, string> = { ...sectionDrafts };
    if (syncChoruses && block.isChorus) {
      parsedBlocks.filter(b => b.isChorus).forEach(b => { committed[b.id] = rerolledBody; });
    } else {
      committed[block.id] = rerolledBody;
    }

    setSectionDrafts(committed);
    const assembled = assembleSectionBlocks(parsedBlocks, committed);
    pushLyricSnapshot(state.lyrics, `Before [${block.label}] Reroll`);
    update('lyrics', assembled);
    lastSyncedLyricsRef.current = assembled;
    addRecentPrompt(assembled);
    pushLyricSnapshot(assembled, `[${block.label}] Rerolled`);
    showToast(
      `🎲 Rerolled [${block.label}]${syncChoruses && block.isChorus ? ' — all choruses synced' : ''}`,
    );
    setInlineSectionRerolling(null);
  };

  /**
   * Flushes any pending card drafts, then moves the block up or down.
   * Because we don't set lastSyncedLyricsRef, the useEffect will reset
   * sectionDrafts from the newly ordered lyrics on the next render.
   */
  const handleSectionCardMove = (block: SectionBlock, direction: 'up' | 'down') => {
    // Flush pending card drafts first so no edits are lost in the reorder
    const currentLyrics =
      Object.keys(sectionDrafts).length > 0
        ? assembleSectionBlocks(parsedBlocks, sectionDrafts)
        : state.lyrics;

    const next = reorderSectionInLyrics(currentLyrics, block.label, direction);
    if (next !== currentLyrics) {
      pushLyricSnapshot(state.lyrics, `Before Move [${block.label}] ${direction}`);
      update('lyrics', next);
      // intentionally NOT setting lastSyncedLyricsRef so the effect resets drafts
      pushLyricSnapshot(next, `[${block.label}] Moved ${direction}`);
      showToast(`Moved [${block.label}] ${direction}`);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ── Rhyme & rephrase popover ─────────────────────────────────────────────
  const handleFindRhymes = () => {
    const { start, end } = selectedRange;
    if (start === end) { showToast('Highlight a word or line first'); return; }
    const selectedText = state.lyrics.slice(start, end).trim();
    // Get the last word of the selected text
    const lastWord = selectedText.split(/\s+/).pop() ?? selectedText;
    const rhymes = findRhymesForWord(lastWord);
    setRhymeWord(lastWord);
    setRhymeSuggestions(rhymes.length ? rhymes : ['No rhymes found — try a different word']);
    showToast(`Found ${rhymes.length} rhymes for "${lastWord}"`);
  };

  const handleRephraseSelection = (mode: 'aggressive' | 'poetic') => {
    const { start, end } = selectedRange;
    if (start === end) { showToast('Highlight a line to rephrase'); return; }
    const selectedText = state.lyrics.slice(start, end);
    const toneOverride: Tone = mode === 'aggressive' ? 'aggressive' : 'poetic';
    const replacement = regenerateSelectionLocal(selectedText, {
      theme: theme.trim() || 'a song',
      scheme: effectiveScheme,
      tone: toneOverride,
      lang,
      structure,
      studioContext: {
        genres: state.genres,
        instruments: state.instruments,
        vocalTypes: state.vocalTypes,
        moods: state.moods,
        bpm: state.bpm,
        blend: state.blend,
        artistArchetypes: state.artistArchetypes,
        artistBlend: state.artistBlend,
      },
      vocalArchetypes: state.artistArchetypes,
      regionalFlows,
      deliveryDirectives,
      fusedStyle: fusion,
    });
    pushLyricSnapshot(state.lyrics, `Before Rephrase (${mode})`);
    const next = `${state.lyrics.slice(0, start)}${replacement}${state.lyrics.slice(end)}`;
    update('lyrics', next);
    setSelectedRange({ start: start + replacement.length, end: start + replacement.length });
    pushLyricSnapshot(next, `Rephrased — ${mode}`);
    setRhymeSuggestions([]);
    showToast(`Rephrased — ${mode}`);
  };
  // ────────────────────────────────────────────────────────────────────────

  const insertAtCursor = (tag: string) => {
    const ta = taRef.current;
    if (!ta) {
      update('lyrics', state.lyrics + (state.lyrics.endsWith('\n') ? '' : '\n') + tag + '\n');
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = state.lyrics.slice(0, start);
    const after = state.lyrics.slice(end);
    const needNewlineBefore = before.length > 0 && !before.endsWith('\n');
    const insert = `${needNewlineBefore ? '\n' : ''}${tag}\n`;
    const next = before + insert + after;
    update('lyrics', next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = (before + insert).length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const copyLyrics = async () => {
    try {
      await navigator.clipboard.writeText(state.lyrics);
      showToast('Lyrics with metatags copied');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = state.lyrics;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast('Lyrics with metatags copied'); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
  };

  return (
    <SectionCard
      title="AI Lyric Generator Workspace"
      icon={<Wand2 className="w-4 h-4" />}
      accent="blue"
      right={
        <span className="text-[10px] uppercase tracking-widest text-ink-400 numeric">
          {lineCount} lines · {totalSyllables} syllables
        </span>
      }
    >
      {/* ── Dynamic Narrative Matrix ─────────────────────────────────────────── */}
      <div className="mb-4 bg-gradient-to-br from-neon-blue/5 via-ink-900/60 to-neon-magenta/5 rounded-xl border border-neon-blue/30 p-3 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-neon-blue" />
            <span className="text-xs font-bold text-ink-100 uppercase tracking-wider">
              Dynamic Narrative Matrix
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-blue/15 text-neon-blue border border-neon-blue/30">
              Genre-Aware
            </span>
          </div>
          <button
            type="button"
            onClick={handleRollNarrative}
            className="btn btn-ghost !py-1.5 !px-3 !text-xs border border-neon-blue/50 hover:bg-neon-blue/10 text-neon-blue flex items-center gap-1.5 transition rounded-lg"
            title="Generate a fresh, genre-aware story concept"
          >
            <Dices className="w-3.5 h-3.5" />
            🎲 Roll Story / Topic
          </button>
        </div>

        {/* Vibe / Focus filter pills */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-widest text-ink-400">Vibe / Focus Filter</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setVibeFilter(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                vibeFilter === null
                  ? 'bg-neon-blue/15 border-neon-blue/60 text-neon-blue'
                  : 'bg-ink-850/60 border-ink-700/60 text-ink-400 hover:border-neon-blue/40 hover:text-ink-200'
              }`}
            >
              ✦ Any
            </button>
            {VIBE_OPTIONS.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVibeFilter(vibeFilter === v.id ? null : v.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  vibeFilter === v.id
                    ? 'bg-neon-blue/15 border-neon-blue/60 text-neon-blue'
                    : 'bg-ink-850/60 border-ink-700/60 text-ink-400 hover:border-neon-blue/40 hover:text-ink-200'
                }`}
              >
                {v.emoji} {v.id}
              </button>
            ))}
          </div>
        </div>

        {/* Generated narrative card */}
        {generatedNarrative ? (
          <div className="bg-ink-950/60 rounded-lg border border-neon-blue/20 p-3 space-y-2.5 animate-slideIn">
            {/* Title + archetype + genre frame */}
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-neon-cyan tracking-tight leading-tight">
                  &ldquo;{generatedNarrative.titleIdea}&rdquo;
                </h3>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-magenta/10 border border-neon-magenta/30 text-neon-magenta">
                    {generatedNarrative.archetypeName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-blue/10 border border-neon-blue/30 text-neon-blue">
                    {generatedNarrative.genreFrame}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRollNarrative}
                className="p-1.5 rounded-lg text-ink-400 hover:text-neon-blue hover:bg-neon-blue/10 transition"
                title="Re-roll another concept"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Story brief */}
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase tracking-widest text-ink-500 font-semibold">Story Brief</span>
              <p className="text-[11px] text-ink-200 leading-relaxed">{generatedNarrative.storyBrief}</p>
            </div>

            {/* Seed hooks */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-ink-500 font-semibold">Lyric Seed Hooks</span>
              <div className="space-y-1.5">
                {generatedNarrative.lyricSeedHooks.map((hook, i) => (
                  <div
                    key={i}
                    className="text-[11px] font-mono text-neon-amber bg-neon-amber/5 border border-neon-amber/20 rounded px-2.5 py-1.5 leading-relaxed"
                  >
                    <span className="text-[9px] text-ink-500 mr-1.5">Hook {i + 1}:</span>
                    {hook}
                  </div>
                ))}
              </div>
            </div>

            {/* Suno metatags */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-widest text-ink-500 font-semibold">Suno Bracket Tags — click to insert</span>
              <div className="flex flex-wrap gap-1.5">
                {generatedNarrative.sunoMetaTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => injectNarrativeMetatag(tag)}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-neon-magenta/10 border border-neon-magenta/30 text-neon-magenta hover:bg-neon-magenta/20 transition cursor-pointer"
                    title="Insert at cursor in Lyric Canvas"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-ink-700/40">
              <button
                type="button"
                onClick={() => applyNarrativeToTheme(generatedNarrative)}
                className="btn btn-primary !py-1 !px-2.5 !text-[11px] flex items-center gap-1.5"
                title="Set this as the active Theme / Story Prompt"
              >
                <Wand2 className="w-3 h-3" />
                Apply as Theme
              </button>
              <button
                type="button"
                onClick={() => injectNarrativeHooks(generatedNarrative)}
                className="btn btn-ghost !py-1 !px-2.5 !text-[11px] border border-neon-amber/40 text-neon-amber hover:bg-neon-amber/10 flex items-center gap-1.5 transition"
                title="Inject both seed hooks into the Lyric Canvas"
              >
                <ZapIcon className="w-3 h-3" />
                Inject Seed Hooks
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-ink-500 text-[11px] border border-dashed border-ink-700/40 rounded-lg">
            Click <span className="text-neon-blue font-semibold">🎲 Roll Story / Topic</span> to generate a vivid, genre-aware narrative concept.
            {state.genres.length > 0 && (
              <span className="block mt-1 text-[10px] text-ink-600">
                Active genre: <span className="text-neon-blue/70">{state.genres.join(' + ')}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Controls grid */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {/* Narrative Concept / Theme Archetype Selector */}
        <div className="sm:col-span-2 bg-ink-900/60 p-3 rounded-xl border border-ink-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-neon-cyan" />
              <label className="text-xs font-bold text-ink-100 uppercase tracking-wider">
                Theme / Narrative Concept Selector
              </label>
            </div>
            <button
              type="button"
              onClick={handleRandomNarrativeConcept}
              className="btn btn-ghost !py-1 !px-2.5 !text-[11px] border border-neon-cyan/40 hover:bg-neon-cyan/10 text-neon-cyan flex items-center gap-1 transition rounded-lg"
              title="Pick a random story concept"
            >
              <span>🎲 Random Story Concept</span>
            </button>
          </div>

          <select
            value={selectedNarrativeId}
            onChange={e => {
              const nt = NARRATIVE_THEMES.find(item => item.id === e.target.value);
              if (nt) applyNarrativeConcept(nt);
              else setSelectedNarrativeId('');
            }}
            className="w-full bg-ink-850/80 border border-ink-700/80 rounded-lg px-3 py-2 text-xs text-ink-100 focus:outline-none focus:border-neon-cyan"
          >
            <option value="" className="bg-ink-900 text-ink-400">
              -- Select a Narrative Story Concept --
            </option>
            {NARRATIVE_THEMES.map(nt => (
              <option key={nt.id} value={nt.id} className="bg-ink-900 text-ink-100">
                {nt.title} ({nt.category})
              </option>
            ))}
          </select>

          {selectedNarrative && (
            <div className="text-[11px] text-ink-300 bg-ink-950/60 p-2.5 rounded-lg border border-ink-700/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neon-cyan">{selectedNarrative.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
                  {selectedNarrative.category}
                </span>
              </div>
              <p className="text-ink-400 text-[10px] leading-relaxed">{selectedNarrative.description}</p>
              <button
                type="button"
                onClick={() => applyNarrativeConcept(selectedNarrative)}
                className="btn btn-primary !py-1 !px-2.5 !text-[10px] flex items-center gap-1.5 mt-1"
              >
                <Wand2 className="w-3 h-3" />
                Apply Story Arc &amp; Pure Storytelling Lyrics
              </button>
            </div>
          )}
        </div>

        {/* Custom Theme Prompt */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-ink-300">Custom Theme &amp; Story Prompt</label>
            <DiceButton onClick={randomizeTheme} title="Randomize theme (genre-aware)" color="cyan" />
          </div>
          <textarea
            value={theme}
            onChange={e => setTheme(e.target.value)}
            rows={2}
            placeholder="Describe the topic, narrative, or emotional story…"
            className="w-full bg-ink-850/60 border border-ink-700/60 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-neon-cyan/60 focus:ring-1 focus:ring-neon-cyan/30 transition resize-none"
          />
        </div>

        {/* Rhyme scheme */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-ink-300">Rhyme Scheme</label>
            <DiceButton onClick={randomizeRhyme} title="Roll a random rhyme scheme" color="cyan" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setScheme(null)}
              className={
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                (scheme === null
                  ? 'bg-ink-700/80 border-ink-500 text-ink-50'
                  : 'bg-ink-850/60 border-ink-700/60 text-ink-300 hover:border-neon-cyan/40')
              }
            >
              None
            </button>
            {RHYME_OPTIONS.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setScheme(r.id)}
                className={
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                  (scheme === r.id
                    ? 'bg-neon-cyan/15 border-neon-cyan/60 text-neon-cyan'
                    : 'bg-ink-850/60 border-ink-700/60 text-ink-300 hover:border-neon-cyan/40')
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div>
          <label className="block text-xs text-ink-300 mb-1.5">Tone</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTone(null)}
              className={
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                (tone === null
                  ? 'bg-ink-700/80 border-ink-500 text-ink-50'
                  : 'bg-ink-850/60 border-ink-700/60 text-ink-300 hover:border-neon-magenta/40')
              }
            >
              None
            </button>
            {TONE_OPTIONS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id)}
                className={
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                  (tone === t.id
                    ? 'bg-neon-magenta/15 border-neon-magenta/60 text-neon-magenta'
                    : 'bg-ink-850/60 border-ink-700/60 text-ink-300 hover:border-neon-magenta/40')
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-xs text-ink-300 mb-1.5">Language</label>
          <div className="flex flex-wrap gap-1.5">
            {LANG_OPTIONS.map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLang(l.id)}
                className={
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                  (lang === l.id
                    ? 'bg-neon-amber/15 border-neon-amber/60 text-neon-amber'
                    : 'bg-ink-850/60 border-ink-700/60 text-ink-300 hover:border-neon-amber/40')
                }
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Structure preset */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-ink-300">Song Structure Preset</label>
            <DiceButton onClick={randomizeStructure} title="Randomize song structure" color="lime" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStructId(null)}
              className={
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                (structId === null
                  ? 'bg-ink-700/80 border-ink-500 text-ink-50'
                  : 'bg-ink-850/60 border-ink-700/60 text-ink-300 hover:border-neon-lime/40')
              }
            >
              None
            </button>
            {STRUCTURE_TEMPLATES.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStructId(s.id)}
                title={s.blurb}
                className={
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                  (structId === s.id
                    ? 'bg-neon-lime/15 border-neon-lime/60 text-neon-lime'
                    : 'bg-ink-850/60 border-ink-700/60 text-ink-300 hover:border-neon-lime/40')
                }
              >
                {s.name}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-ink-400 mt-1.5">{structure.blurb}</p>
        </div>
      </div>

      {/* Vocal styling row: Regional Flows + Vocal Archetypes */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        {/* Regional Rap Flows */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-ink-300 mb-1.5">
            <Radio className="w-3.5 h-3.5 text-neon-lime" />
            Regional Rap Flows &amp; Cadences
          </label>
          <div className="flex flex-wrap gap-1.5">
            {REGIONAL_FLOWS.map(f => (
              <button
                key={f.id}
                type="button"
                title={f.cadence}
                onClick={() => setRegionalFlows(prev => toggleInArray(prev, f.label))}
                className={
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ' +
                  (regionalFlows.includes(f.label)
                    ? 'bg-neon-lime/15 border-neon-lime/60 text-neon-lime'
                    : 'bg-ink-850/60 border-ink-700/60 text-ink-300 hover:border-neon-lime/40')
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vocal Archetypes — driven by Artist Timbre section */}
        <div>
          <label className="flex items-center gap-1.5 text-xs text-ink-300 mb-1.5">
            <Mic2 className="w-3.5 h-3.5 text-neon-magenta" />
            Fused vocal cadence
          </label>
          {state.artistArchetypes.length === 0 ? (
            <p className="text-[11px] text-ink-400">
              Select up to 3 pills in Artist Timbre / Vocal Archetypes. Their descriptors, BPM pockets, and performance tags feed this generator.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {resolveArchetypes(state.artistArchetypes).map((a, i) => (
                  <span
                    key={a.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-neon-magenta/15 border-neon-magenta/60 text-neon-magenta"
                    title={a.cadence}
                  >
                    {fusion.parts[i] ? `${fusion.parts[i].weight}% ` : ''}{a.promptTags[0]}
                  </span>
                ))}
              </div>
              {fusion.enabled && (
                <p className="text-[11px] text-ink-400">
                  Fusion rhyme meter: {fusion.rhymeMeter}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline delivery directives */}
      <div className="mb-4">
        <label className="block text-xs text-ink-300 mb-1.5">Inline Vocal Directives &amp; Ad-libs</label>
        <div className="flex flex-wrap gap-1.5">
          {DELIVERY_DIRECTIVES.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDeliveryDirectives(prev => toggleInArray(prev, d))}
              className={
                'tag !font-mono !text-[11px] !py-1 transition-all ' +
                (deliveryDirectives.includes(d)
                  ? 'tag-magenta'
                  : 'hover:tag-magenta')
              }
            >
              {d}
            </button>
          ))}
        </div>
        {deliveryDirectives.length > 0 && (
          <p className="text-[10px] text-ink-400 mt-1.5">
            Selected directives will be injected into generated lyrics and passed to the AI engine.
          </p>
        )}
      </div>

      {/* Surprise auto-generate status badge */}
      {isLyricGenerating && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-neon-blue/10 border border-neon-blue/40 text-neon-blue text-[11px] font-semibold animate-pulse">
          <ZapIcon className="w-3.5 h-3.5 shrink-0" />
          ⚡ Rolling Inspiration &amp; Writing Lyrics…
          <span className="ml-auto text-[10px] font-normal text-ink-400">
            Click "Surprise Me" again to cancel &amp; re-roll
          </span>
        </div>
      )}

      {/* Generate button */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="btn btn-primary flex-1 sm:flex-none disabled:opacity-60"
        >
          <Sparkles className="w-4 h-4" />
          {generating ? 'Generating…' : 'Generate Structured Lyrics'}
        </button>

        {/* Duet Mode Toggle */}
        <button
          type="button"
          onClick={toggleDuetMode}
          className={
            'btn btn-ghost ' +
            (state.duetMode ? 'bg-neon-magenta/10 border-neon-magenta/40' : '')
          }
          title="Enable Duet/Feature Mode for alternating vocal tags"
        >
          <Users className="w-4 h-4" />
          {state.duetMode ? 'Duet Mode ON' : 'Duet Mode'}
        </button>

        {/* Regenerate section */}
        <button
          type="button"
          onClick={handleRegenerateSelection}
          disabled={selectedRange.start === selectedRange.end}
          className="btn btn-ghost disabled:opacity-50"
          title="Highlight a word or phrase in the lyrics editor to replace it"
        >
          <Type className="w-4 h-4" />
          Regenerate Highlight
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setRegenOpen(o => !o)}
            disabled={regenSections.length === 0}
            className="btn btn-ghost disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate Section
            <ChevronDown className={'w-3.5 h-3.5 transition ' + (regenOpen ? 'rotate-180' : '')} />
          </button>
          {regenOpen && regenSections.length > 0 && (
            <div className="absolute z-20 mt-2 w-56 glass rounded-xl p-2 animate-slideIn max-h-60 overflow-auto">
              <p className="text-[10px] uppercase tracking-widest text-ink-400 px-2 py-1">Pick a section</p>
              {regenSections.map(s => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => { setRegenTarget(s.label); setRegenOpen(false); }}
                  className={
                    'w-full text-left px-2 py-2 rounded-lg hover:bg-neon-cyan/10 transition text-sm ' +
                    (regenTarget === s.label ? 'text-neon-cyan' : 'text-ink-200')
                  }
                >
                  [{s.label}]
                </button>
              ))}
              {regenTarget && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="btn btn-primary w-full mt-2 !py-1.5 !text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate [{regenTarget}]
                </button>
              )}
            </div>
          )}
        </div>

        <button type="button" onClick={copyLyrics} className="btn btn-ghost">
          <Copy className="w-4 h-4" />
          Copy Lyrics
        </button>

        {/* Source indicator */}
        {genSource && (
          <span
            className={
              'inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border ' +
              (genSource === 'openai'
                ? 'bg-neon-lime/10 border-neon-lime/40 text-neon-lime'
                : 'bg-ink-850/60 border-ink-700/60 text-ink-400')
            }
            title={genWarning ?? undefined}
          >
            {genSource === 'openai' ? <Zap className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
            {genSource === 'openai' ? 'AI' : 'Built-in'}
          </span>
        )}
      </div>

      {genWarning && (
        <div className="mb-3 text-[11px] text-neon-amber bg-neon-amber/10 border border-neon-amber/30 rounded-lg px-3 py-2">
          {genWarning}
        </div>
      )}

      {/* ── Undo / Redo toolbar + Revision History drawer ──────────────────── */}
      {(() => {
        const history = lyricHistoryRef.current;
        const idx = histIdxRef.current;
        const canUndo = idx > 0;
        const canRedo = idx < history.length - 1;
        const hasHistory = history.length > 0;

        return (
          <div className="mb-3 space-y-2">
            {/* Undo/Redo strip */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={undoLyric}
                disabled={!canUndo}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-ink-700/60 bg-ink-850/60 text-ink-300 hover:bg-ink-700/50 hover:text-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Undo last lyric change (Ctrl+Z / Cmd+Z)"
              >
                <span className="text-base leading-none">↶</span> Undo
              </button>
              <button
                type="button"
                onClick={redoLyric}
                disabled={!canRedo}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-ink-700/60 bg-ink-850/60 text-ink-300 hover:bg-ink-700/50 hover:text-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                title="Redo (Ctrl+Y / Cmd+Shift+Z)"
              >
                <span className="text-base leading-none">↷</span> Redo
              </button>
              {hasHistory && (
                <button
                  type="button"
                  onClick={() => setHistoryDrawerOpen(o => !o)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                    historyDrawerOpen
                      ? 'border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan'
                      : 'border-ink-700/60 bg-ink-850/60 text-ink-400 hover:text-ink-200 hover:border-ink-600'
                  }`}
                  title="View and restore previous lyric versions"
                >
                  <FileMusic className="w-3 h-3" />
                  Revision History
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ink-700/60">
                    {history.length}
                  </span>
                </button>
              )}
              {hasHistory && (
                <span className="text-[10px] text-ink-600 ml-auto">
                  {idx + 1} / {history.length} &nbsp;·&nbsp; Ctrl+Z undo · Ctrl+Y redo
                </span>
              )}
            </div>

            {/* History drawer */}
            {historyDrawerOpen && hasHistory && (
              <div className="rounded-xl border border-ink-700/60 bg-ink-900/70 overflow-hidden animate-slideIn">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-700/40 bg-ink-850/60">
                  <FileMusic className="w-3.5 h-3.5 text-neon-cyan" />
                  <span className="text-[11px] font-bold text-ink-100 uppercase tracking-wider flex-1">
                    Revision History
                  </span>
                  <button
                    type="button"
                    onClick={() => setHistoryDrawerOpen(false)}
                    className="text-ink-500 hover:text-ink-200 text-xs transition"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-ink-800/40">
                  {[...history].reverse().map((snap, ri) => {
                    const realIdx = history.length - 1 - ri;
                    const isCurrent = realIdx === idx;
                    const d = new Date(snap.ts);
                    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    return (
                      <div
                        key={`${snap.ts}-${ri}`}
                        className={`flex items-center gap-3 px-3 py-2 hover:bg-ink-800/50 transition ${isCurrent ? 'bg-neon-cyan/5' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isCurrent && (
                              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 font-semibold">
                                current
                              </span>
                            )}
                            <span className={`text-[11px] font-medium truncate ${isCurrent ? 'text-neon-cyan' : 'text-ink-200'}`}>
                              {snap.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-ink-500 font-mono">{timeStr}</span>
                            <span className="text-[9px] text-ink-600">·</span>
                            <span className="text-[9px] text-ink-500">
                              {snap.text.trim().split('\n').length} lines
                            </span>
                          </div>
                        </div>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => restoreSnapshot(realIdx)}
                            className="shrink-0 px-2 py-1 rounded text-[10px] font-medium bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 transition"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Scrollable Suno Metatag Shelf ───────────────────────────────────── */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
          <Hash className="w-3 h-3 text-ink-400" />
          <span className="text-[10px] uppercase tracking-widest text-ink-400">Metatag shelf — click to insert at cursor</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-ink-700 scrollbar-track-transparent">
          {METATAG_SHELF.map(({ label, tag, color }) => (
            <button
              key={tag}
              type="button"
              onClick={() => insertAtCursor(tag)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border border-ink-700/60 bg-ink-850/60 hover:bg-ink-700/50 transition whitespace-nowrap ${color}`}
              title={`Insert ${tag}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Rhyme & Rephrase action bar (shows when text is highlighted) ──── */}
      {selectedRange.start !== selectedRange.end && (
        <div className="mb-3 flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-neon-magenta/5 border border-neon-magenta/30 animate-slideIn">
          <span className="text-[10px] text-neon-magenta font-semibold uppercase tracking-wider shrink-0">
            ✏️ Selection tools:
          </span>
          <button
            type="button"
            onClick={handleFindRhymes}
            className="px-2 py-1 rounded text-[11px] font-medium bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20 transition"
          >
            🎵 Find Rhymes
          </button>
          <button
            type="button"
            onClick={() => handleRephraseSelection('aggressive')}
            className="px-2 py-1 rounded text-[11px] font-medium bg-neon-rose/10 border border-neon-rose/40 text-neon-rose hover:bg-neon-rose/20 transition"
          >
            ⚡ More Aggressive
          </button>
          <button
            type="button"
            onClick={() => handleRephraseSelection('poetic')}
            className="px-2 py-1 rounded text-[11px] font-medium bg-neon-blue/10 border border-neon-blue/40 text-neon-blue hover:bg-neon-blue/20 transition"
          >
            🌸 More Poetic
          </button>
          {rhymeSuggestions.length > 0 && (
            <div className="w-full flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-neon-magenta/20 mt-0.5">
              <span className="text-[10px] text-ink-400 shrink-0">
                Rhymes for <span className="text-neon-cyan font-semibold">"{rhymeWord}"</span>:
              </span>
              {rhymeSuggestions.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    // Replace the last word of the selection with this rhyme
                    const { start, end } = selectedRange;
                    const sel = state.lyrics.slice(start, end);
                    const words = sel.trimEnd().split(/\s+/);
                    words[words.length - 1] = r;
                    const replacement = words.join(' ');
                    update('lyrics', `${state.lyrics.slice(0, start)}${replacement}${state.lyrics.slice(end)}`);
                    setRhymeSuggestions([]);
                    showToast(`Substituted "${r}"`);
                  }}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/25 transition"
                >
                  {r}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRhymeSuggestions([])}
                className="ml-auto text-[10px] text-ink-500 hover:text-ink-300 transition"
              >
                ✕ dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Editor (textarea + syllable gutter) + Section Editor panel ────── */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-3">
        {/* Left: syllable-gutter + textarea */}
        <div className="flex rounded-lg bg-ink-950/70 border border-ink-700/60 overflow-hidden">
          {/* Left gutter: syllable counts, colour-coded */}
          <div className="flex-shrink-0 w-14 bg-ink-950/80 border-r border-ink-700/40 py-3 overflow-hidden select-none">
            {syllableLines.map((sl, i) => (
              <div
                key={i}
                className={`text-[9px] text-right pr-1.5 leading-[1.6] h-[1.6em] font-mono ${syllableColour(sl.count)}`}
              >
                {sl.count > 0 ? `${sl.count}s` : ''}
              </div>
            ))}
          </div>
          {/* Textarea */}
          <textarea
            ref={taRef}
            value={state.lyrics}
            onChange={e => {
              const val = e.target.value;
              update('lyrics', val);
              setRhymeSuggestions([]);
              // Debounced snapshot: don't create a snapshot on every keystroke,
              // but save a "Manual Edit" checkpoint ~1.5 s after typing stops.
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => {
                if (val.trim()) pushLyricSnapshot(val, 'Manual Edit');
              }, 1500);
            }}
            onSelect={e => {
              setLyricsCursor(e.currentTarget.selectionStart, e.currentTarget.value);
              setSelectedRange({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd });
              if (e.currentTarget.selectionStart === e.currentTarget.selectionEnd) setRhymeSuggestions([]);
            }}
            onClick={e => {
              setLyricsCursor(e.currentTarget.selectionStart, e.currentTarget.value);
              setSelectedRange({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd });
            }}
            onKeyUp={e => {
              setLyricsCursor(e.currentTarget.selectionStart, e.currentTarget.value);
              setSelectedRange({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd });
            }}
            spellCheck={false}
            className="lyrics-textarea flex-1 bg-transparent border-0 p-3 text-sm text-ink-100 focus:outline-none resize-none min-h-[320px] leading-[1.6]"
            placeholder="Generated lyrics will appear here. Click 'Generate' or write your own."
            style={{ height: Math.max(320, syllableLines.length * 1.6 * 14) }}
          />
        </div>

        {/* Right: Section Card Editor — one editable card per structural section */}
        <div className="rounded-lg bg-ink-950/40 border border-ink-700/40 flex flex-col max-h-[520px]">
          {/* Panel header */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-ink-700/40 shrink-0">
            <FileMusic className="w-3 h-3 text-ink-400" />
            <span className="text-[10px] uppercase tracking-widest text-ink-400 flex-1">Section Cards</span>
            {/* Chorus sync toggle */}
            <button
              type="button"
              onClick={() => setSyncChoruses(s => !s)}
              className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border transition ${
                syncChoruses
                  ? 'border-neon-magenta/50 bg-neon-magenta/10 text-neon-magenta'
                  : 'border-ink-700/50 bg-ink-800/40 text-ink-500 hover:text-ink-300'
              }`}
              title="When ON, editing or rerolling any chorus card syncs all chorus blocks automatically"
            >
              🔗 Sync Choruses
            </button>
          </div>

          {/* Card list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {(() => {
              const structural = parsedBlocks.filter(b => b.isStructural);

              if (!structural.length) {
                return (
                  <div className="text-center py-6">
                    <p className="text-[11px] text-ink-500 italic">
                      Generate or write lyrics with bracket sections<br />
                      <span className="text-[10px] text-ink-600">
                        e.g. [Verse 1], [Chorus], [Bridge]
                      </span>
                    </p>
                    {state.lyrics.trim() && (
                      <div className="mt-2 text-ink-200 lyrics-view text-[11px] text-left px-2 max-h-48 overflow-auto">
                        {renderHighlighted(state.lyrics)}
                      </div>
                    )}
                  </div>
                );
              }

              return structural.map((block, idx) => {
                const isRerolling = inlineSectionRerolling === block.id;

                // Identify primary chorus so secondary ones can mirror it
                const primaryChorus = structural.find(b => b.isChorus);
                const isSecondaryChorus =
                  syncChoruses && block.isChorus && primaryChorus?.id !== block.id;

                // Display body: secondary chorus mirrors primary chorus draft
                const displayBody = isSecondaryChorus && primaryChorus
                  ? (sectionDrafts[primaryChorus.id] ?? primaryChorus.body)
                  : (sectionDrafts[block.id] ?? block.body);

                const originalBody = block.body;
                const isDirty = !isSecondaryChorus && displayBody !== originalBody;
                const lineCount = displayBody
                  .split('\n')
                  .filter(l => l.trim() && !l.startsWith('[')).length;
                const textareaHeight = Math.max(72, displayBody.split('\n').length * 20);

                return (
                  <div
                    key={block.id}
                    className={`rounded-xl border overflow-hidden transition-shadow ${
                      block.isChorus
                        ? 'border-neon-magenta/40 bg-neon-magenta/5 shadow-[0_0_8px_rgba(236,72,153,0.08)]'
                        : 'border-ink-700/50 bg-ink-900/40'
                    }`}
                  >
                    {/* Card header bar */}
                    <div className={`flex items-center gap-1 px-2 py-1.5 border-b ${
                      block.isChorus
                        ? 'bg-neon-magenta/10 border-neon-magenta/20'
                        : 'bg-ink-800/50 border-ink-700/40'
                    }`}>
                      {/* Section label */}
                      <span className={`text-[11px] font-bold flex-1 min-w-0 truncate ${
                        block.isChorus ? 'text-neon-magenta' : 'text-neon-cyan'
                      }`}>
                        [{block.label}]
                      </span>

                      {/* Badges */}
                      {isSecondaryChorus && (
                        <span className="shrink-0 text-[8px] px-1 py-0.5 rounded bg-neon-magenta/20 text-neon-magenta/80 border border-neon-magenta/30">
                          🔗 synced
                        </span>
                      )}
                      {isDirty && (
                        <span
                          className="shrink-0 w-1.5 h-1.5 rounded-full bg-neon-amber"
                          title="Unsaved draft — will commit on blur"
                        />
                      )}
                      <span className="text-[9px] text-ink-500 shrink-0">{lineCount}L</span>

                      {/* ▲ Move up */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleSectionCardMove(block, 'up')}
                        className="p-0.5 rounded text-ink-500 hover:text-ink-200 disabled:opacity-25 transition"
                        title={`Move [${block.label}] up`}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>

                      {/* ▼ Move down */}
                      <button
                        type="button"
                        disabled={idx === structural.length - 1}
                        onClick={() => handleSectionCardMove(block, 'down')}
                        className="p-0.5 rounded text-ink-500 hover:text-ink-200 disabled:opacity-25 transition"
                        title={`Move [${block.label}] down`}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>

                      {/* 🎲 Reroll */}
                      <button
                        type="button"
                        disabled={!!isRerolling || isSecondaryChorus}
                        onClick={() => handleSectionCardReroll(block)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition shrink-0 ${
                          isSecondaryChorus
                            ? 'border-ink-700/30 bg-ink-800/20 text-ink-600 cursor-not-allowed'
                            : 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-40'
                        }`}
                        title={
                          isSecondaryChorus
                            ? 'Reroll the first chorus card — it will sync here automatically'
                            : `Reroll [${block.label}]${syncChoruses && block.isChorus ? ' (all choruses will sync)' : ''}`
                        }
                      >
                        {isRerolling ? '…' : '🎲'}
                      </button>
                    </div>

                    {/* Card body */}
                    {isSecondaryChorus ? (
                      /* Read-only mirror for synced secondary choruses */
                      <div className="px-2 py-2 bg-neon-magenta/3">
                        <p className="text-[8px] text-neon-magenta/50 italic mb-1.5">
                          ↕ Mirrors primary chorus — edit the first [Chorus] card
                        </p>
                        <div className="text-[11px] text-ink-400 leading-relaxed font-mono max-h-28 overflow-hidden">
                          {displayBody
                            .split('\n')
                            .filter(l => l.trim())
                            .slice(0, 6)
                            .map((line, li) => (
                              <div key={li} className="truncate opacity-70">{line}</div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <textarea
                        value={displayBody}
                        onChange={e => {
                          const v = e.target.value;
                          if (syncChoruses && block.isChorus) {
                            // Live-sync all chorus drafts while the user types
                            setSectionDrafts(prev => {
                              const next = { ...prev };
                              parsedBlocks
                                .filter(b => b.isChorus)
                                .forEach(b => { next[b.id] = v; });
                              return next;
                            });
                          } else {
                            setSectionDrafts(prev => ({ ...prev, [block.id]: v }));
                          }
                        }}
                        onBlur={e => commitSectionEdit(block, e.target.value)}
                        className="w-full bg-transparent border-0 p-2 text-[12px] text-ink-200 focus:outline-none resize-none leading-relaxed font-mono focus:bg-ink-900/30 transition-colors"
                        style={{ minHeight: textareaHeight }}
                        placeholder={`Write [${block.label}] lyrics here…`}
                        spellCheck={false}
                      />
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-ink-400">
        <span className="inline-flex items-center gap-1"><Gauge className="w-3 h-3" /> {lineCount} lines</span>
        <span className="inline-flex items-center gap-1"><Type className="w-3 h-3" /> {totalSyllables} syllables</span>
        <span className="inline-flex items-center gap-1"><FileMusic className="w-3 h-3" /> {regenSections.length} sections</span>
        <span className="inline-flex items-center gap-1 ml-auto text-[9px] text-ink-600">
          Gutter colours: <span className="text-neon-cyan/60">≤6s</span> <span className="text-neon-lime/70">7-10s</span> <span className="text-neon-amber/70">11-13s</span> <span className="text-neon-rose/70">14+s</span>
        </span>
      </div>
    </SectionCard>
  );
}
