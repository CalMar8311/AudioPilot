// AI Lyric Generator workspace — controls, enhanced editor, syllable gutter, regenerate

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileMusic, Sparkles, Copy, RefreshCw, Wand2, Plus, Type, Gauge, ChevronDown, Users } from 'lucide-react';
import {
  STRUCTURE_TEMPLATES, TONE_OPTIONS, LANG_OPTIONS, RHYME_OPTIONS,
  RHYME_SCHEME_IDS, REGIONAL_FLOWS, DELIVERY_DIRECTIVES,
  randomThemeForGenre, NARRATIVE_THEMES, type NarrativeTheme,
  type RhymeScheme, type Tone, type Lang, type StructureId, type StructureTemplate,
} from '@/data/lyricBanks';
import { structureIdForGenres, GENRE_BLUEPRINTS } from '@/data/catalogs';
import { fusedLyricContext, resolveArchetypes } from '@/engine/styleFusion';
import { SectionCard, DiceButton } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';
import {
  generateLyricsViaEdge, regenerateSectionLocal,
} from '@/engine/lyricClient';
import {
  regeneratableSections, countSyllables,
  regenerateSelectionLocal, cleanLyricText,
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
      // Distinguish section headers (single word, capitalized) from inline cues
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

export function LyricGeneratorSection({ eng }: { eng: PromptEngine }) {
  const { state, update, showToast, surpriseTheme, setSurpriseTheme, toggleDuetMode, addRecentPrompt, setLyricsCursor } = eng;
  const taRef = useRef<HTMLTextAreaElement>(null);

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

  // Consume AI-generated theme from the "Surprise Me" engine
  useEffect(() => {
    if (surpriseTheme) {
      setTheme(surpriseTheme.theme);
      setStructId(surpriseTheme.structureId as StructureId);
      setScheme(surpriseTheme.rhymeScheme as RhymeScheme);
      if (surpriseTheme.lyricMetatags) {
        update('lyrics', surpriseTheme.lyricMetatags);
      }
      // Also sync rhyme scheme and vocal styling from the applied blueprint
      const bp = GENRE_BLUEPRINTS.find(b =>
        state.genres[0] === b.primaryGenre &&
        (!b.secondaryGenre || state.genres.includes(b.secondaryGenre))
      );
      if (bp) {
        setScheme(bp.rhymeScheme as RhymeScheme);
        if (bp.regionalFlows.length) setRegionalFlows(bp.regionalFlows);
      }
      setSurpriseTheme(null);
    }
  }, [surpriseTheme, state.genres, setSurpriseTheme]);

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

  const handleGenerate = async () => {
    const activeTheme = theme.trim();
    if (!activeTheme) { showToast('Enter a theme or story first'); return; }
    setGenerating(true);
    setGenWarning(null);
    try {
      const result = await generateLyricsViaEdge({
        theme: activeTheme,
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
      
      let processedLyrics = result.lyrics;
      
      // Apply duet mode alternating vocal tags
      if (state.duetMode) {
        processedLyrics = applyDuetVocalTags(processedLyrics, state.artistArchetypes);
      }
      
      update('lyrics', processedLyrics);
      addRecentPrompt(processedLyrics);
      setGenSource(result.source);
      if (result.source === 'local' && result.warning) {
        setGenWarning(result.warning);
        showToast(result.warning);
      } else {
        showToast('Lyrics generated');
      }
    } catch {
      showToast('Generation failed — try again');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (!regenTarget) { showToast('Pick a section to regenerate'); return; }
    const next = regenerateSectionLocal(state.lyrics, regenTarget, {
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
    update('lyrics', next);
    addRecentPrompt(next);
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
    update('lyrics', `${state.lyrics.slice(0, start)}${replacement}${state.lyrics.slice(end)}`);
    setSelectedRange({ start: start + replacement.length, end: start + replacement.length });
    addRecentPrompt(replacement);
    showToast('Highlighted lyric regenerated');
  };

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

      {/* Quick-insert toolbar */}
      <div className="glass-soft rounded-lg p-2 mb-3">
        <div className="flex items-center gap-1.5 mb-1.5 px-1">
          <Plus className="w-3 h-3 text-ink-400" />
          <span className="text-[10px] uppercase tracking-widest text-ink-400">Quick-insert tags</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_INSERT_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => insertAtCursor(tag)}
              className="tag !font-mono !text-[11px] !py-1 hover:tag-active"
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-2 mb-1.5 px-1">
          <Type className="w-3 h-3 text-ink-400" />
          <span className="text-[10px] uppercase tracking-widest text-ink-400">Performance cues</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INLINE_CUES.map(cue => (
            <button
              key={cue}
              type="button"
              onClick={() => insertAtCursor(cue)}
              className="tag !font-mono !text-[11px] !py-1 hover:tag-magenta"
            >
              {cue}
            </button>
          ))}
        </div>
      </div>

      {/* Editor with syllable gutter + live preview */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-3">
        {/* Editor + syllable gutter */}
        <div className="flex rounded-lg bg-ink-950/70 border border-ink-700/60 overflow-hidden">
          {/* Syllable gutter */}
          <div className="flex-shrink-0 w-12 bg-ink-950/80 border-r border-ink-700/40 py-3 overflow-hidden select-none">
            {syllableLines.map((sl, i) => (
              <div key={i} className="numeric text-[10px] text-right pr-2 leading-[1.6] h-[1.6em] text-ink-500">
                {sl.count > 0 ? sl.count : ''}
              </div>
            ))}
          </div>
          {/* Textarea */}
          <textarea
            ref={taRef}
            value={state.lyrics}
            onChange={e => update('lyrics', e.target.value)}
            onSelect={e => { setLyricsCursor(e.currentTarget.selectionStart, e.currentTarget.value); setSelectedRange({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd }); }}
            onClick={e => { setLyricsCursor(e.currentTarget.selectionStart, e.currentTarget.value); setSelectedRange({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd }); }}
            onKeyUp={e => { setLyricsCursor(e.currentTarget.selectionStart, e.currentTarget.value); setSelectedRange({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd }); }}
            spellCheck={false}
            className="lyrics-textarea flex-1 bg-transparent border-0 p-3 text-sm text-ink-100 focus:outline-none resize-none min-h-[320px] leading-[1.6]"
            placeholder="Generated lyrics will appear here. Click 'Generate' or write your own."
            style={{ height: Math.max(320, syllableLines.length * 1.6 * 14) }}
          />
        </div>

        {/* Live highlighted preview */}
        <div className="rounded-lg bg-ink-950/40 border border-ink-700/40 p-3 max-h-[420px] overflow-auto">
          <div className="flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-widest text-ink-400">
            <FileMusic className="w-3 h-3" />
            Live Preview
          </div>
          <div className="lyrics-view text-sm text-ink-200">
            {state.lyrics.trim() ? renderHighlighted(state.lyrics) : <span className="text-ink-500 italic">Preview appears here…</span>}
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-ink-400">
        <span className="inline-flex items-center gap-1"><Gauge className="w-3 h-3" /> {lineCount} lines</span>
        <span className="inline-flex items-center gap-1"><Type className="w-3 h-3" /> {totalSyllables} syllables</span>
        <span className="inline-flex items-center gap-1"><FileMusic className="w-3 h-3" /> {regenSections.length} sections</span>
      </div>
    </SectionCard>
  );
}
