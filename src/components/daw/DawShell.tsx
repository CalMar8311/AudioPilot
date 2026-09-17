// AudioPilot — 3-Column DAW Dock Shell
// Visual theme: Deep matte charcoal, neon cyan (#06b6d4) + vivid magenta (#d946ef).
// Architecture: icon rail | asset column | production column | lyrics column.

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Home, LayoutGrid, Waves, SlidersHorizontal, Settings, X,
  Search, FolderOpen, Music2, Play, Pause, ArrowRight,
  Download, Guitar, Layers, Loader2, MoreHorizontal, Expand,
  Disc3, FileMusic, Mic2, Copy, Music, Piano as PianoIcon,
  ChevronRight, ListMusic,
} from 'lucide-react';
import { FolderPlaylistBrowser } from '@/components/FolderPlaylistBrowser';
import { StyleStudio } from '@/components/StyleStudio';
import { OutputPanel } from '@/components/OutputPanel';
import { AudioRemixStudio } from '@/components/AudioRemixStudio';
import type { PromptEngine } from '@/engine/usePromptEngine';
import type { Preset } from '@/data/catalogs';
import {
  transcribeAudioToMidi,
  splitTranscriptionIntoInstrumentLayers,
  type TranscriptionResult,
  type InstrumentLayerSplitResult,
} from '@/engine/audioToMidiEngine';
import { downloadMidiBlob } from '@/utils/midiEncoder';
import { countSyllables } from '@/engine/lyricEngine';
import { LicensingModal } from '@/components/LicensingModal';
import { Toast } from '@/components/Toast';

// ── Structural section parser (DAW-dock-local) ───────────────────────────────
const STRUCT_RE = /^(?:Intro|Verse\s*\d*|Chorus\s*\d*|Bridge|Pre-Chorus|Hook|Outro)/i;
interface DawBlock { id: string; label: string; header: string; body: string; isChorus: boolean }

function parseDawBlocks(lyrics: string): DawBlock[] {
  const lines = lyrics.split('\n');
  const counts: Record<string, number> = {};
  const blocks: DawBlock[] = [];
  let curLabel: string | null = null;
  let curHeader = '';
  let bodyLines: string[] = [];

  const flush = () => {
    if (curLabel !== null || bodyLines.join('').trim()) {
      const label = curLabel ?? '__pre__';
      const body = bodyLines.join('\n').trimEnd();
      if (curLabel !== null || body.trim()) {
        const idx = counts[label] ?? 0;
        counts[label] = idx + 1;
        blocks.push({
          id: `${label}-${idx}`,
          label,
          header: curHeader,
          body,
          isChorus: /^chorus(\s*\d+)?$/i.test(label.trim()),
        });
      }
    }
    curLabel = null; curHeader = ''; bodyLines = [];
  };

  for (const line of lines) {
    const m = line.match(/^\[([^\]]+)\]$/);
    if (m && STRUCT_RE.test(m[1].trim())) { flush(); curLabel = m[1].trim(); curHeader = line; }
    else bodyLines.push(line);
  }
  flush();
  return blocks;
}

// ── Mini piano helpers ───────────────────────────────────────────────────────
const NOTE_SEMI: Record<string, number> = {
  C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,
};
const WHITE_SEMI = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B per octave
const BLACK_SEMI = [1, 3, -1, 6, 8, 10, -1]; // -1 = no black key after E/B

function getActiveKeys(detectedKey?: string): Set<number> {
  if (!detectedKey) return new Set();
  const root = detectedKey.trim().split(/\s+/)[0];
  const rootSemi = NOTE_SEMI[root] ?? 0;
  const isMinor = /minor/i.test(detectedKey);
  // Triad intervals: major = 0,4,7 ; minor = 0,3,7
  const intervals = isMinor ? [0, 3, 7] : [0, 4, 7];
  return new Set(intervals.map(i => (rootSemi + i) % 12));
}

// ── Icon rail view types ─────────────────────────────────────────────────────
type RailView = 'dock' | 'remix' | 'style' | 'export';

// ── MiniPiano component ──────────────────────────────────────────────────────
function MiniPiano({ detectedKey }: { detectedKey?: string }) {
  const active = getActiveKeys(detectedKey);
  const octaves = 2;
  const whiteCount = 7 * octaves;

  return (
    <div className="relative flex h-12 select-none mt-2" style={{ width: '100%' }}>
      {/* White keys */}
      {Array.from({ length: whiteCount }, (_, wi) => {
        const octave = Math.floor(wi / 7);
        const posInOct = wi % 7;
        const semi = WHITE_SEMI[posInOct] + octave * 12;
        const isActive = active.has(semi % 12);
        return (
          <div
            key={`w${wi}`}
            className={`flex-1 border-r border-dock-border rounded-b-sm transition-colors ${
              isActive
                ? 'bg-neon-cyan/90 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                : 'bg-ink-200/90 hover:bg-ink-100'
            }`}
          />
        );
      })}

      {/* Black keys — absolutely positioned */}
      {Array.from({ length: whiteCount }, (_, wi) => {
        const octave = Math.floor(wi / 7);
        const posInOct = wi % 7;
        const blackSemi = BLACK_SEMI[posInOct];
        if (blackSemi < 0) return null;
        const semi = blackSemi + octave * 12;
        const isActive = active.has(semi % 12);
        const leftPct = ((wi + 0.65) / whiteCount) * 100;
        const widthPct = (0.6 / whiteCount) * 100;
        return (
          <div
            key={`b${wi}`}
            className={`absolute top-0 z-10 rounded-b transition-colors ${
              isActive
                ? 'bg-neon-cyan shadow-[0_0_6px_rgba(6,182,212,0.9)]'
                : 'bg-ink-800'
            }`}
            style={{ left: `${leftPct}%`, width: `${widthPct}%`, height: '60%' }}
          />
        );
      })}
    </div>
  );
}

// ── Main DawShell ────────────────────────────────────────────────────────────
interface DawShellProps {
  eng: PromptEngine;
  onPresetSelect: (p: Preset) => void;
  onEraSelect: (label: string) => boolean;
}

export function DawShell({ eng, onPresetSelect, onEraSelect }: DawShellProps) {
  const [railView, setRailView] = useState<RailView>('dock');
  const [assetTab, setAssetTab] = useState<'browser' | 'playlist'>('browser');
  const [col1Search, setCol1Search] = useState('');
  const [isLicensingOpen, setIsLicensingOpen] = useState(false);

  // ── MIDI state (Column 2) ────────────────────────────────────────────────
  const [midiTranscription, setMidiTranscription] = useState<TranscriptionResult | null>(null);
  const [midiLayers, setMidiLayers] = useState<InstrumentLayerSplitResult | null>(null);
  const [isMidiTranscribing, setIsMidiTranscribing] = useState(false);

  const { audioFile, analysis } = eng.audioState;

  useEffect(() => {
    // Reset MIDI state when audio file changes
    setMidiTranscription(null);
    setMidiLayers(null);
  }, [audioFile]);

  const handleMidiTranscribe = async () => {
    if (!audioFile) { eng.showToast('Upload an audio file first'); return; }
    setIsMidiTranscribing(true);
    try {
      const res = await transcribeAudioToMidi({
        stem: 'keys', timeSegment: 'full', audioFile, analysis,
        bpm: analysis?.detectedBpm ?? 120, key: analysis?.detectedKey ?? 'C Major',
      });
      setMidiTranscription(res);
      const layers = splitTranscriptionIntoInstrumentLayers(res);
      setMidiLayers(layers);
      eng.showToast(`Extracted ${res.notes.length} notes → Lead · Chords · Bass ready`);
    } catch {
      eng.showToast('MIDI transcription failed — try again');
    } finally {
      setIsMidiTranscribing(false);
    }
  };

  const handleExportLayer = (layer: 'lead' | 'chords' | 'bass') => {
    if (!midiLayers) return;
    const track = midiLayers[layer];
    const base = audioFile?.name.replace(/\.[^/.]+$/, '') ?? 'Track';
    downloadMidiBlob(track.midiData, `${base}_${track.label}.mid`);
    eng.showToast(`Downloaded ${track.label} (${track.notes.length} notes)`);
  };

  // ── Lyrics section cards ─────────────────────────────────────────────────
  const lyricsBlocks = useMemo(() => parseDawBlocks(eng.state.lyrics), [eng.state.lyrics]);
  const structuralBlocks = useMemo(() => lyricsBlocks.filter(b => b.label !== '__pre__'), [lyricsBlocks]);

  // Per-card syllable sum
  const sectionSyllables = useMemo(() => {
    const map: Record<string, number> = {};
    structuralBlocks.forEach(b => {
      const sum = b.body.split('\n')
        .filter(l => l.trim() && !l.startsWith('['))
        .reduce((acc, line) => acc + countSyllables(line), 0);
      map[b.id] = sum;
    });
    return map;
  }, [structuralBlocks]);

  // Footer tag pills derived from engine state
  const moodPills = useMemo(() =>
    eng.state.moods.slice(0, 3).map(id => id.replace(/-/g, ' ')),
    [eng.state.moods]
  );
  const keyPill = analysis?.detectedKey ?? (eng.state.musicalKeys[0] ?? '');
  const genrePill = eng.state.genres[0]?.replace(/-/g, ' ') ?? '';

  // ── Copy helpers ─────────────────────────────────────────────────────────
  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(eng.stylePrompt); } catch { /**/ }
    eng.showToast('Style prompt copied!');
  };
  const copyLyrics = async () => {
    try { await navigator.clipboard.writeText(eng.state.lyrics); } catch { /**/ }
    eng.showToast('Lyrics copied!');
  };

  // ── RAIL ICON items ──────────────────────────────────────────────────────
  const railItems: { id: RailView; icon: React.ReactNode; label: string }[] = [
    { id: 'dock',   icon: <LayoutGrid className="w-5 h-5" />,       label: 'DAW Dock'    },
    { id: 'remix',  icon: <Waves className="w-5 h-5" />,            label: 'Audio Remix' },
    { id: 'style',  icon: <SlidersHorizontal className="w-5 h-5" />, label: 'Style Studio'},
    { id: 'export', icon: <FileMusic className="w-5 h-5" />,        label: 'Export'      },
  ];

  // ── Sub-view: when icon rail switches away from 'dock' ───────────────────
  if (railView !== 'dock') {
    return (
      <div className="fixed inset-0 bg-dock-bg flex overflow-hidden">
        {/* Icon rail */}
        <IconRail items={railItems} active={railView} onSelect={setRailView} onSettings={() => setIsLicensingOpen(true)} />

        {/* Full-screen panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mac-style title bar */}
          <TitleBar title={railItems.find(r => r.id === railView)?.label ?? 'AudioPilot'} />
          <div className="flex-1 overflow-y-auto p-6 bg-dock-bg">
            {railView === 'remix' && (
              <AudioRemixStudio key={eng.resetKey} eng={eng} />
            )}
            {railView === 'style' && (
              <StyleStudio eng={eng} onPresetSelect={onPresetSelect} onEraSelect={onEraSelect} />
            )}
            {railView === 'export' && (
              <div className="max-w-3xl mx-auto">
                <OutputPanel eng={eng} />
              </div>
            )}
          </div>
        </div>
        <LicensingModal isOpen={isLicensingOpen} onClose={() => setIsLicensingOpen(false)} onShowToast={eng.showToast} />
        <Toast message={eng.toast} />
      </div>
    );
  }

  // ── Primary 3-column DAW dock ────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-dock-bg flex overflow-hidden font-sans">
      {/* Icon rail */}
      <IconRail items={railItems} active={railView} onSelect={setRailView} onSettings={() => setIsLicensingOpen(true)} />

      {/* ── Column 1: Asset Explorer & Playlist ────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-dock-border bg-dock-surface overflow-hidden">
        {/* Title bar row (Mac dots only for col 1) */}
        <TitleBar title="AudioPilot" showDots />

        {/* Search bar */}
        <div className="px-3 py-2 border-b border-dock-border">
          <div className="flex items-center gap-2 rounded-lg bg-dock-bg border border-dock-border px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-ink-400 shrink-0" />
            <input
              type="text"
              placeholder="Search tracks…"
              value={col1Search}
              onChange={e => setCol1Search(e.target.value)}
              className="flex-1 bg-transparent text-[12px] text-ink-200 placeholder-ink-600 focus:outline-none"
            />
            {col1Search && (
              <button type="button" onClick={() => setCol1Search('')} className="text-ink-500 hover:text-ink-200 transition">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dock-border shrink-0">
          {(['browser', 'playlist'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setAssetTab(tab)}
              className={`flex-1 py-2 text-[11px] font-medium uppercase tracking-wider transition-colors relative ${
                assetTab === tab ? 'text-neon-cyan' : 'text-ink-500 hover:text-ink-300'
              }`}
            >
              {tab === 'browser' ? 'File Explorer' : 'Playlist Browser'}
              {assetTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-cyan rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* FolderPlaylistBrowser fills both tabs — we just re-style it via the wrapper */}
        <div className="flex-1 overflow-hidden">
          <FolderPlaylistBrowser
            onSendToAnalyzer={eng.setAudioFile}
            onShowToast={eng.showToast}
          />
        </div>
      </aside>

      {/* ── Column 2: Production Deck ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto min-w-0">
        {/* Harmonic Analysis Deck */}
        <div className="rounded-2xl bg-dock-card border border-dock-border p-5 flex flex-col gap-3 shadow-panel">
          <div className="flex items-center gap-2 mb-1">
            <Disc3 className="w-4 h-4 text-neon-cyan" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-300">
              Harmonic Analysis Deck
            </span>
            {analysis?.detectedKey && (
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan">
                {analysis.detectedKey}
              </span>
            )}
          </div>

          {/* Glowing scale-degree numbers */}
          {analysis?.chordSteps && analysis.chordSteps.length > 0 ? (
            <>
              <div className="flex items-center justify-center gap-4 py-2">
                {analysis.chordSteps.map((step, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span
                      className="text-5xl font-black text-cyan-300 tracking-wider leading-none"
                      style={{ textShadow: '0 0 20px rgba(6,182,212,0.85), 0 0 40px rgba(6,182,212,0.4)' }}
                    >
                      {step.stepNumber}
                    </span>
                    <span className="text-[10px] text-ink-400 font-mono">{step.romanNumeral}</span>
                    <span className="text-[9px] text-ink-500 truncate max-w-[48px] text-center">{step.chordName}</span>
                  </div>
                ))}
              </div>
              {/* Separator row with dots under each degree */}
              <div className="flex items-center justify-center gap-4 -mt-2">
                {analysis.chordSteps.map((_, i) => (
                  <span key={i} className="text-neon-cyan/40 text-lg leading-none">
                    {i < analysis!.chordSteps!.length - 1 ? '·' : ''}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <span className="text-[11px] text-ink-500 italic">
                Upload & analyze an audio file to see harmonic data
              </span>
              {analysis?.chordProgression && (
                <p className="text-[12px] text-ink-300 mt-2 font-mono">{analysis.chordProgression}</p>
              )}
            </div>
          )}

          {/* Mini piano keyboard */}
          <div className="rounded-lg overflow-hidden border border-dock-border bg-dock-bg px-2 pb-2 pt-1">
            <span className="text-[9px] text-ink-600 uppercase tracking-widest">
              {analysis?.detectedKey ?? 'Key'} — Active chord tones
            </span>
            <MiniPiano detectedKey={analysis?.detectedKey} />
          </div>
        </div>

        {/* MIDI Track Export Deck */}
        <div className="rounded-2xl bg-dock-card border border-dock-border p-5 flex flex-col gap-4 shadow-panel">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-neon-magenta" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-300">
              MIDI Track Export
            </span>
            {!audioFile && (
              <span className="ml-auto text-[9px] text-ink-500 italic">awaiting audio file</span>
            )}
          </div>

          {/* Transcribe trigger */}
          {!midiLayers && (
            <button
              type="button"
              disabled={!audioFile || isMidiTranscribing}
              onClick={handleMidiTranscribe}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neon-cyan/40 bg-neon-cyan/5 text-neon-cyan text-[12px] font-semibold hover:bg-neon-cyan/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {isMidiTranscribing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Transcribing MIDI…</>
              ) : (
                <><PianoIcon className="w-4 h-4" /> Run MIDI Transcription</>
              )}
            </button>
          )}

          {/* Layer export buttons */}
          <div className="flex flex-col gap-3">
            {/* Lead */}
            <button
              type="button"
              disabled={!midiLayers}
              onClick={() => handleExportLayer('lead')}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-cyan-500/50 bg-cyan-500/5 hover:bg-cyan-500/10 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Music className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[13px] font-bold text-cyan-300">Lead / Melody</div>
                <div className="text-[10px] text-ink-400">
                  {midiLayers ? `${midiLayers.lead.notes.length} notes extracted` : 'High-register melodic line'}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-500/60 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Chords */}
            <button
              type="button"
              disabled={!midiLayers}
              onClick={() => handleExportLayer('chords')}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-fuchsia-500/50 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-fuchsia-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[13px] font-bold text-fuchsia-300">Chords / Mid</div>
                <div className="text-[10px] text-ink-400">
                  {midiLayers ? `${midiLayers.chords.notes.length} notes extracted` : 'Harmonic mid-register layer'}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-fuchsia-500/60 group-hover:text-fuchsia-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Bass */}
            <button
              type="button"
              disabled={!midiLayers}
              onClick={() => handleExportLayer('bass')}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Guitar className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[13px] font-bold text-purple-300">Bass</div>
                <div className="text-[10px] text-ink-400">
                  {midiLayers ? `${midiLayers.bass.notes.length} notes extracted` : 'Low-register sub bass line'}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-500/60 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          {/* Reset button when layers are ready */}
          {midiLayers && (
            <button
              type="button"
              onClick={() => { setMidiTranscription(null); setMidiLayers(null); }}
              className="text-[10px] text-ink-500 hover:text-ink-300 text-center transition"
            >
              ↺ Re-transcribe
            </button>
          )}
        </div>
      </main>

      {/* ── Column 3: Lyrics Canvas ─────────────────────────────────────── */}
      <aside className="w-80 shrink-0 flex flex-col border-l border-dock-border bg-dock-surface overflow-hidden">
        {/* Column header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-dock-border bg-dock-card shrink-0">
          <FileMusic className="w-4 h-4 text-neon-magenta" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-200 flex-1">
            Lyrics Canvas
          </span>
          <button
            type="button"
            onClick={copyLyrics}
            title="Copy lyrics"
            className="p-1 rounded text-ink-500 hover:text-ink-200 transition"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setRailView('style')}
            title="Open full editor"
            className="p-1 rounded text-ink-500 hover:text-ink-200 transition"
          >
            <Expand className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lyrics section cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {structuralBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Music2 className="w-10 h-10 text-ink-700" />
              <p className="text-[11px] text-ink-500 italic text-center leading-relaxed">
                Generate lyrics in the<br />Lyric Canvas to see them<br />as structured cards here.
              </p>
              <button
                type="button"
                onClick={() => setRailView('style')}
                className="mt-1 text-[11px] px-3 py-1.5 rounded-lg border border-neon-magenta/40 bg-neon-magenta/5 text-neon-magenta hover:bg-neon-magenta/10 transition"
              >
                Open Style Studio →
              </button>
            </div>
          ) : (
            structuralBlocks.map(block => {
              const syllCount = sectionSyllables[block.id] ?? 0;
              const bodyLines = block.body.split('\n').filter(l => l.trim() && !l.startsWith('['));
              return (
                <div
                  key={block.id}
                  className={`rounded-2xl border overflow-hidden transition-shadow ${
                    block.isChorus
                      ? 'border-fuchsia-500/30 bg-fuchsia-950/20 shadow-[0_0_10px_rgba(217,70,239,0.08)]'
                      : 'border-dock-border bg-dock-card'
                  }`}
                >
                  {/* Card header */}
                  <div className={`flex items-center gap-2 px-3 py-2 border-b ${
                    block.isChorus
                      ? 'border-fuchsia-500/20 bg-fuchsia-900/20'
                      : 'border-dock-border bg-dock-hover/50'
                  }`}>
                    <span className={`text-[12px] font-bold flex-1 ${
                      block.isChorus ? 'text-fuchsia-300' : 'text-neon-cyan'
                    }`}>
                      {block.label}
                    </span>
                    {/* Syllable pill */}
                    {syllCount > 0 && (
                      <span className="w-6 h-6 rounded-full bg-neon-magenta/20 border border-neon-magenta/40 text-neon-magenta text-[9px] font-bold flex items-center justify-center shrink-0">
                        {syllCount > 99 ? '99+' : syllCount}
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="px-3 py-2.5">
                    {bodyLines.length > 0 ? (
                      <div className="space-y-1">
                        {bodyLines.slice(0, 6).map((line, li) => (
                          <p key={li} className="text-[12px] text-ink-200 leading-relaxed font-mono truncate">
                            {line}
                          </p>
                        ))}
                        {bodyLines.length > 6 && (
                          <p className="text-[10px] text-ink-500 italic">
                            +{bodyLines.length - 6} more lines
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-ink-600 italic">Empty section</p>
                    )}
                  </div>

                  {/* Card footer — tag pills */}
                  <div className="flex flex-wrap gap-1 px-3 pb-2.5">
                    {/* Mood pills (magenta/violet) */}
                    {moodPills.slice(0, 2).map(mood => (
                      <span key={mood} className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 capitalize">
                        {mood}
                      </span>
                    ))}
                    {genrePill && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-violet-500/10 border border-violet-500/30 text-violet-300 capitalize">
                        {genrePill}
                      </span>
                    )}
                    {/* Cyan track/key pills */}
                    {keyPill && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                        {keyPill}
                      </span>
                    )}
                    {block.isChorus && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                        Vocal Focus
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom quick-copy bar */}
        <div className="shrink-0 border-t border-dock-border bg-dock-card px-3 py-2 flex items-center gap-2">
          <button
            type="button"
            onClick={copyPrompt}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/15 transition"
          >
            <Copy className="w-3 h-3" /> Prompt
          </button>
          <button
            type="button"
            onClick={copyLyrics}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium bg-neon-magenta/10 border border-neon-magenta/30 text-neon-magenta hover:bg-neon-magenta/15 transition"
          >
            <Copy className="w-3 h-3" /> Lyrics
          </button>
        </div>
      </aside>

      <LicensingModal isOpen={isLicensingOpen} onClose={() => setIsLicensingOpen(false)} onShowToast={eng.showToast} />
      <Toast message={eng.toast} />
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function TitleBar({ title, showDots }: { title: string; showDots?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-dock-rail border-b border-dock-border shrink-0">
      {showDots && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
      )}
      <span className="text-[12px] font-semibold text-ink-300 tracking-wide flex-1 text-center">
        {title}
      </span>
    </div>
  );
}

interface IconRailItem { id: RailView; icon: React.ReactNode; label: string }
function IconRail({
  items,
  active,
  onSelect,
  onSettings,
}: {
  items: IconRailItem[];
  active: RailView;
  onSelect: (v: RailView) => void;
  onSettings: () => void;
}) {
  return (
    <nav className="w-14 shrink-0 flex flex-col items-center bg-dock-rail border-r border-dock-border py-3 gap-1 z-10">
      {/* Top: Home */}
      <button
        type="button"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-500 hover:text-ink-200 hover:bg-dock-hover transition-all mb-2"
        title="Home"
      >
        <Home className="w-5 h-5" />
      </button>

      <div className="w-6 h-px bg-dock-border mb-2" />

      {/* Navigation items */}
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          title={item.label}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            active === item.id
              ? 'bg-neon-cyan/15 text-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.25)]'
              : 'text-ink-500 hover:text-ink-200 hover:bg-dock-hover'
          }`}
        >
          {item.icon}
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      <div className="w-6 h-px bg-dock-border mb-2" />

      {/* Bottom: Settings + Exit */}
      <button
        type="button"
        onClick={onSettings}
        title="Licensing & Settings"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-500 hover:text-ink-200 hover:bg-dock-hover transition-all"
      >
        <Settings className="w-5 h-5" />
      </button>
      <button
        type="button"
        title="Reset All"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-600 hover:text-ink-400 hover:bg-dock-hover transition-all"
      >
        <X className="w-4 h-4" />
      </button>
    </nav>
  );
}
