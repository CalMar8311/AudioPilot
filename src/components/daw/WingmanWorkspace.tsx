// WingmanWorkspace — dual-deck "Wingman" DAW rack primary workspace.
//
// Layout (top → bottom):
//   1. Global Header Bar   — logo, record/upload, key/BPM, transport, reset/settings.
//   2. Upper Deck ("Input")— 4 stacked stem rows (Lead/Chords/Bass/Drums) with
//      S/M/knob controls, a real waveform (WaveformCanvas) synced to a shared
//      playback scrubber, and per-row "Export Stem" + "Convert to MIDI"
//      draggable (Chromium DownloadURL) cards.
//   3. Middle Reharmonization Bar — source selector, chord-progression stepper
//      cycling `rollHarmonizationVariations`, and an "Advanced" harmonic tools menu.
//   4. Lower Deck — Roman-numeral harmonic roadmap (from Gemini chordSteps) +
//      3 synced track rows (Chords/Bass/Drums) + draggable Export WAV / MIDI.
//   5. Lyrics & Persona Dock — collapsible slide-out panel on the right edge
//      hosting the structural lyric cards (same content previously docked in
//      DawShell's Column 3).
//
// Reuses the existing polyphonic MIDI extraction engine (audioToMidiEngine.ts)
// and drag-to-DAW `DownloadURL` convention established by DawStagingVault /
// MidiStagingRoll — no synthetic data, no fabricated note counts.

import {
  useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent,
} from 'react';
import {
  Circle, Mic, MonitorSpeaker, Upload, FolderOpen, Play, Pause, Square,
  Settings, X as XIcon, ChevronDown, ChevronLeft, ChevronRight,
  Layers, Waves, GripVertical, Loader2, Download, Disc3,
  Sparkles, FileMusic, Expand, Music2, Copy,
} from 'lucide-react';
import type { PromptEngine } from '@/engine/usePromptEngine';
import {
  transcribeAudioToMidi,
  transcribeAllStemsToMultiTrackMidi,
  TranscriptionTimeoutError,
  type StemType,
  type TranscriptionResult,
  type MultiTrackMidiResult,
} from '@/engine/audioToMidiEngine';
import { downloadMidiBlob, type MidiNote } from '@/utils/midiEncoder';
import { analyzeAudioWithGemini } from '@/services/geminiAudio';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import {
  rollHarmonizationVariations, parseKeyString, hashStringToSeed, type HarmonizationResult,
} from '@/utils/harmonicTheoryEngine';
import { REHARM_PRESETS, REHARM_BLOCK_COLORS, resolveChordName } from '@/utils/reharmPresets';
import { countSyllables } from '@/engine/lyricEngine';
import { FolderPlaylistBrowser } from '@/components/FolderPlaylistBrowser';
import { WaveformCanvas } from '@/components/daw/WaveformCanvas';

// ─────────────────────────────────────────────────────────────────────────────
// Structural lyric-block parser (moved here from DawShell — only the Lyrics
// & Persona Dock needs it now).
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Row configs
// ─────────────────────────────────────────────────────────────────────────────

type UpperRowId = 'lead' | 'chords' | 'bass' | 'drums';
interface UpperRowConfig { id: UpperRowId; label: string; color: string; stem: StemType }

const UPPER_ROWS: UpperRowConfig[] = [
  { id: 'lead',   label: 'Lead / Vocals',        color: '#a855f7', stem: 'lead'  },
  { id: 'chords', label: 'Instruments / Chords', color: '#06b6d4', stem: 'keys'  },
  { id: 'bass',   label: 'Bass',                 color: '#f87171', stem: 'bass'  },
  { id: 'drums',  label: 'Drums / Beat',         color: '#f59e0b', stem: 'drums' },
];

type LowerRowId = 'chords' | 'bass' | 'drums';
interface LowerRowConfig { id: LowerRowId; label: string; color: string }

const LOWER_ROWS: LowerRowConfig[] = [
  { id: 'chords', label: 'Chords',             color: '#06b6d4' },
  { id: 'bass',   label: 'Bass',               color: '#f87171' },
  { id: 'drums',  label: 'Drums / Percussion', color: '#10b981' },
];

const KEY_OPTIONS = [
  'C Major', 'C Minor', 'C# Major', 'C# Minor', 'D Major', 'D Minor', 'D# Major', 'D# Minor',
  'E Major', 'E Minor', 'F Major', 'F Minor', 'F# Major', 'F# Minor', 'G Major', 'G Minor',
  'G# Major', 'G# Minor', 'A Major', 'A Minor', 'A# Major', 'A# Minor', 'B Major', 'B Minor',
];

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Enhanced per-stem MIDI synthesis fallback.
 * - Bass register (≤48): sawtooth + lowpass filter for sub-bass warmth.
 * - Mid register (49-59): triangle (Rhodes-like mellow warmth).
 * - Lead/High (≥60): sine for a clean synth lead feel.
 * All notes get a proper linear-attack + exponential-release ADSR envelope.
 */
function scheduleNotesStemAware(actx: AudioContext, notes: MidiNote[], startOffsetSec: number): OscillatorNode[] {
  const now = actx.currentTime;
  const nodes: OscillatorNode[] = [];

  // Master limiter gain — prevents clipping when many notes play simultaneously
  const master = actx.createGain();
  master.gain.value = 0.5;
  master.connect(actx.destination);

  for (const n of notes) {
    if (n.startTimeSec + n.durationSec < startOffsetSec - 0.01) continue;
    const startAt = now + Math.max(0, n.startTimeSec - startOffsetSec);
    const dur = Math.min(n.durationSec, 2.8);
    const peakGain = Math.max(0.02, Math.min(0.28, (n.velocity / 127) * 0.24));

    const osc = actx.createOscillator();
    const env = actx.createGain();

    if (n.midiNumber <= 48) {
      // Bass — sawtooth through a lowpass filter
      osc.type = 'sawtooth';
      const flt = actx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 350;
      flt.Q.value = 1.2;
      osc.connect(flt);
      flt.connect(env);
    } else if (n.midiNumber <= 59) {
      // Mid/Chords — triangle for a warm piano-ish tone
      osc.type = 'triangle';
      osc.connect(env);
    } else {
      // Lead/Vocals — clean sine
      osc.type = 'sine';
      osc.connect(env);
    }

    osc.frequency.value = midiToHz(n.midiNumber);

    // Linear attack + exponential release
    const attack = 0.012;
    const release = Math.min(dur * 0.35, 0.3);
    env.gain.setValueAtTime(0.0001, startAt);
    env.gain.linearRampToValueAtTime(peakGain, startAt + attack);
    env.gain.setValueAtTime(peakGain, startAt + dur - release);
    env.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

    env.connect(master);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.05);
    nodes.push(osc);
  }
  return nodes;
}

function getAudioContextCtor(): typeof AudioContext {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface WingmanWorkspaceProps {
  eng: PromptEngine;
  onOpenSettings: () => void;
  onOpenStyleStudio: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function WingmanWorkspace({ eng, onOpenSettings, onOpenStyleStudio }: WingmanWorkspaceProps) {
  const { audioState, setAudioFile, setAudioAnalysis, setAudioIsAnalyzing, showToast, state } = eng;
  const { audioFile, analysis } = audioState;

  // ── Recording ──────────────────────────────────────────────────────────
  const recorder = useAudioRecorder();
  const [recordMenuOpen, setRecordMenuOpen] = useState(false);
  useEffect(() => { if (recorder.error) showToast(recorder.error); }, [recorder.error, showToast]);

  // ── Upload / folder ────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderOpen, setFolderOpen] = useState(false);

  // ── Header key override ────────────────────────────────────────────────
  const [keyOverride, setKeyOverride] = useState<string | null>(null);
  const effectiveKey = keyOverride ?? analysis?.detectedKey ?? 'C Major';
  const effectiveBpm = analysis?.detectedBpm ?? 120;

  // ── Reference audio blob (for Export WAV / drag) ──────────────────────
  const [audioFileBlobUrl, setAudioFileBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!audioFile) { setAudioFileBlobUrl(null); return; }
    const url = URL.createObjectURL(audioFile);
    setAudioFileBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  // ── Upper deck: per-row transcription state ───────────────────────────
  const [rowTranscriptions, setRowTranscriptions] = useState<Record<UpperRowId, TranscriptionResult | null>>({
    lead: null, chords: null, bass: null, drums: null,
  });
  const [rowTranscribing, setRowTranscribing] = useState<UpperRowId | null>(null);
  const [rowBlobUrls, setRowBlobUrls] = useState<Record<UpperRowId, string | null>>({
    lead: null, chords: null, bass: null, drums: null,
  });

  useEffect(() => {
    const urls: Record<UpperRowId, string | null> = { lead: null, chords: null, bass: null, drums: null };
    for (const row of UPPER_ROWS) {
      const t = rowTranscriptions[row.id];
      if (t) {
        const copy = new Uint8Array(t.midiData.byteLength);
        copy.set(t.midiData);
        urls[row.id] = URL.createObjectURL(new Blob([copy.buffer as ArrayBuffer], { type: 'audio/midi' }));
      }
    }
    setRowBlobUrls(urls);
    return () => {
      (Object.values(urls) as (string | null)[]).forEach(u => u && URL.revokeObjectURL(u));
    };
  }, [rowTranscriptions]);

  // ── Upper deck: solo / mute / volume ──────────────────────────────────
  const [upperSolo, setUpperSolo] = useState<UpperRowId | null>(null);
  const [upperMuted, setUpperMuted] = useState<Set<UpperRowId>>(new Set());
  const [upperVolume, setUpperVolume] = useState<Record<UpperRowId, number>>({
    lead: 80, chords: 80, bass: 80, drums: 80,
  });

  const toggleUpperSolo = (id: UpperRowId) => setUpperSolo(prev => (prev === id ? null : id));
  const toggleUpperMute = (id: UpperRowId) => setUpperMuted(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // ── Lower deck: solo / mute / volume ──────────────────────────────────
  const [lowerSolo, setLowerSolo] = useState<LowerRowId | null>(null);
  const [lowerMuted, setLowerMuted] = useState<Set<LowerRowId>>(new Set());
  const [lowerVolume, setLowerVolume] = useState<Record<LowerRowId, number>>({
    chords: 80, bass: 80, drums: 80,
  });

  const toggleLowerSolo = (id: LowerRowId) => setLowerSolo(prev => (prev === id ? null : id));
  const toggleLowerMute = (id: LowerRowId) => setLowerMuted(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // ── Timeline / duration ────────────────────────────────────────────────
  const [decodedDurationSec, setDecodedDurationSec] = useState(0);

  // ── Natural audio preview: decode audioFile → AudioBuffer ─────────────
  // This lets the ▶ button play the actual audio instead of oscillator beeps.
  const [decodedAudioBuffer, setDecodedAudioBuffer] = useState<AudioBuffer | null>(null);
  useEffect(() => {
    if (!audioFile) { setDecodedAudioBuffer(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const arrayBuf = await audioFile.arrayBuffer();
        const AudioCtxCtor = getAudioContextCtor();
        const tmpCtx = new AudioCtxCtor();
        let buf: AudioBuffer;
        try { buf = await tmpCtx.decodeAudioData(arrayBuf); }
        finally { await tmpCtx.close(); }
        if (!cancelled) {
          setDecodedAudioBuffer(buf);
          setDecodedDurationSec(buf.duration);
        }
      } catch { /* ignore decode errors — WaveformCanvas also decodes separately */ }
    })();
    return () => { cancelled = true; };
  }, [audioFile]);
  const allTranscribedNotes = useMemo(
    () => Object.values(rowTranscriptions).flatMap(r => r?.notes ?? []),
    [rowTranscriptions],
  );
  const notesEndSec = useMemo(
    () => allTranscribedNotes.reduce((m, n) => Math.max(m, n.startTimeSec + n.durationSec), 0),
    [allTranscribedNotes],
  );
  const totalDurationSec = Math.max(decodedDurationSec, notesEndSec, 16);
  const barDurationSec = (60 / effectiveBpm) * 4;
  const barCount = Math.min(24, Math.max(8, Math.ceil(totalDurationSec / barDurationSec)));

  // ── Transport (Web Audio preview playback) ────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadSec, setPlayheadSec] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscNodesRef = useRef<OscillatorNode[]>([]);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const playStartRef = useRef<{ ctxTime: number; offsetSec: number }>({ ctxTime: 0, offsetSec: 0 });

  const stopPlayback = useCallback(() => {
    oscNodesRef.current.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
    oscNodesRef.current = [];
    try { sourceNodeRef.current?.stop(); } catch { /* already stopped */ }
    sourceNodeRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setIsPlaying(false);
  }, []);

  useEffect(() => () => {
    stopPlayback();
    audioCtxRef.current?.close().catch(() => { /* ignore */ });
  }, [stopPlayback]);

  const isUpperAudible = (id: UpperRowId) => (upperSolo ? upperSolo === id : !upperMuted.has(id));

  const combinedPlaybackNotes = useMemo(() => {
    const list: MidiNote[] = [];
    for (const row of UPPER_ROWS) {
      const t = rowTranscriptions[row.id];
      if (!t || !isUpperAudible(row.id)) continue;
      const vol = upperVolume[row.id] / 100;
      for (const n of t.notes) list.push({ ...n, velocity: Math.max(1, Math.round(n.velocity * vol)) });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowTranscriptions, upperSolo, upperMuted, upperVolume]);

  const handleTogglePlay = () => {
    if (isPlaying) { stopPlayback(); return; }

    if (!decodedAudioBuffer && combinedPlaybackNotes.length === 0) {
      showToast('Upload an audio file to enable playback');
      return;
    }

    if (!audioCtxRef.current) audioCtxRef.current = new (getAudioContextCtor())();
    const actx = audioCtxRef.current;
    const startOffset = playheadSec >= totalDurationSec ? 0 : playheadSec;

    if (decodedAudioBuffer) {
      // ── Natural audio playback from the decoded buffer ──────────────────
      const src = actx.createBufferSource();
      src.buffer = decodedAudioBuffer;
      src.connect(actx.destination);
      src.start(0, startOffset);
      sourceNodeRef.current = src;
      // onended fires when clip naturally reaches end
      src.onended = () => {
        if (sourceNodeRef.current === src) {
          setPlayheadSec(0);
          stopPlayback();
        }
      };
    } else {
      // ── Enhanced MIDI synthesis fallback ────────────────────────────────
      oscNodesRef.current = scheduleNotesStemAware(actx, combinedPlaybackNotes, startOffset);
    }

    playStartRef.current = { ctxTime: actx.currentTime, offsetSec: startOffset };
    setIsPlaying(true);

    const tick = () => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const elapsed = ctx.currentTime - playStartRef.current.ctxTime;
      const pos = playStartRef.current.offsetSec + elapsed;
      if (pos >= totalDurationSec) {
        setPlayheadSec(0);
        stopPlayback();
        return;
      }
      setPlayheadSec(pos);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleStop = () => { stopPlayback(); setPlayheadSec(0); };
  const handleSeek = (sec: number) => { if (isPlaying) stopPlayback(); setPlayheadSec(sec); };

  // ── Audio ingestion (upload / record / folder) ────────────────────────
  const processAudioFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|flac|ogg)$/i)) {
      showToast('Please upload a valid .mp3 or .wav audio reference track');
      return;
    }
    stopPlayback();
    setPlayheadSec(0);
    setAudioFile(file);
    setAudioIsAnalyzing(true);
    setRowTranscriptions({ lead: null, chords: null, bass: null, drums: null });
    setKeyOverride(null);
    setDecodedDurationSec(0);
    try {
      const result = await analyzeAudioWithGemini(file);
      setAudioAnalysis(result);
      showToast('Audio analyzed — key, BPM & chord progression detected!');
    } catch {
      showToast('Error analyzing audio track');
      setAudioIsAnalyzing(false);
    }
  }, [setAudioFile, setAudioIsAnalyzing, setAudioAnalysis, showToast, stopPlayback]);

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void processAudioFile(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStopRecording = async () => {
    const file = await recorder.stopRecording();
    if (file) void processAudioFile(file);
  };

  const handleResetAll = () => {
    stopPlayback();
    eng.reset();
  };

  // ── Middle bar: reharmonization ────────────────────────────────────────
  const [reharmSource, setReharmSource] = useState<'lead' | 'chords'>('lead');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Fixed, named 8-bar chord-progression presets drive both the stepper and
  // the Lower Deck's Roman-numeral timeline. Defaults to "Modal Interchange".
  const [presetIndex, setPresetIndex] = useState(1);
  const activePreset = REHARM_PRESETS[presetIndex];
  const cyclePreset = (dir: 1 | -1) => setPresetIndex(i => (i + dir + REHARM_PRESETS.length) % REHARM_PRESETS.length);

  // Advanced menu: procedurally-rolled reharmonization *ideas* (separate from
  // the deterministic stepper presets above) — clicking one injects its Suno
  // bracket tag directly into the lyrics.
  const keyInfo = useMemo(() => parseKeyString(effectiveKey), [effectiveKey]);
  const detectedChordNames = useMemo(() => analysis?.chordSteps?.map(s => s.chordName), [analysis]);
  const harmSeed = useMemo(
    () => hashStringToSeed(`${keyInfo.rootKey}-${keyInfo.scale}-${audioFile?.name ?? 'none'}`),
    [keyInfo, audioFile],
  );
  const harmonyVariations = useMemo<HarmonizationResult[]>(
    () => rollHarmonizationVariations({ rootKey: keyInfo.rootKey, scale: keyInfo.scale, detectedChords: detectedChordNames }, harmSeed),
    [keyInfo, detectedChordNames, harmSeed],
  );

  const handleInjectVariationTag = (variation: HarmonizationResult) => {
    eng.insertLyricTag(variation.bracketTag);
    showToast(`Inserted "${variation.label}" Suno bracket tag into lyrics`);
    setAdvancedOpen(false);
  };

  // ── Lower deck: 8-bar loop playhead (loops the shared transport position
  //    against the current preset's 8-bar span, independent of total track
  //    duration) ────────────────────────────────────────────────────────
  const loopDurationSec = barDurationSec * 8;
  const loopPlayheadPct = loopDurationSec > 0 ? ((playheadSec % loopDurationSec) / loopDurationSec) * 100 : 0;

  // ── Upper deck: per-row MIDI conversion ───────────────────────────────
  const handleConvertRow = async (row: UpperRowConfig) => {
    if (!audioFile) { showToast('Upload an audio file first'); return; }
    setRowTranscribing(row.id);
    try {
      const res = await transcribeAudioToMidi({
        stem: row.stem, timeSegment: 'full', audioFile, analysis,
        bpm: effectiveBpm, key: effectiveKey,
      });
      setRowTranscriptions(prev => ({ ...prev, [row.id]: res }));
      if (res.autoSliced) {
        showToast(`Track exceeds 30s — auto-sliced to the first ${Math.round(res.effectiveDurationSec)}s to prevent memory exhaustion.`);
      }
      showToast(`${row.label}: extracted ${res.notes.length} notes → "${row.label}.mid" ready to drag`);
    } catch (err) {
      if (err instanceof TranscriptionTimeoutError) {
        showToast('⏱ Transcription timed out. Please try a shorter audio loop or lower resolution.');
      } else {
        showToast(`${row.label} transcription failed — try again`);
      }
    } finally {
      setRowTranscribing(null);
    }
  };

  const handleSaveRowMidi = (row: UpperRowConfig) => {
    const t = rowTranscriptions[row.id];
    if (!t) return;
    downloadMidiBlob(t.midiData, `${row.label.replace(/[^a-z0-9]+/gi, '_')}.mid`);
    showToast(`Downloaded ${row.label}.mid (${t.notes.length} notes)`);
  };

  // ── Copy MIDI to clipboard (base64 data URI) with 2 s visual feedback ──
  const [copyStates, setCopyStates] = useState<Record<string, 'idle' | 'copied'>>({});

  const handleCopyMidi = useCallback(async (id: string, blobUrl: string | null, label: string) => {
    if (!blobUrl) { showToast('Convert to MIDI first'); return; }
    try {
      const resp = await fetch(blobUrl);
      const blob = await resp.blob();
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await navigator.clipboard.writeText(dataUri);
      setCopyStates(prev => ({ ...prev, [id]: 'copied' }));
      setTimeout(() => setCopyStates(prev => ({ ...prev, [id]: 'idle' })), 2000);
      showToast(`MIDI data URI copied — paste into any text field or share`);
    } catch {
      // Fallback: silently trigger a local download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${label.replace(/[^a-z0-9]+/gi, '_')}.mid`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Clipboard unavailable — MIDI file downloaded as fallback');
    }
  }, [showToast]);

  const handleExportStemAudio = (row: UpperRowConfig) => {
    if (!audioFile || !audioFileBlobUrl) { showToast('Upload an audio file first'); return; }
    const ext = audioFile.name.split('.').pop() || 'wav';
    const base = audioFile.name.replace(/\.[^/.]+$/, '');
    const a = document.createElement('a');
    a.href = audioFileBlobUrl;
    a.download = `${base}_${row.label.replace(/[^a-z0-9]+/gi, '_')}_reference.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(`Exported reference audio for ${row.label} — per-instrument source separation isn't available yet, so this is the full mix.`);
  };

  const beginNativeDrag = (
    e: DragEvent<HTMLDivElement>,
    filename: string,
    blobUrl: string | null,
    mime: string = 'audio/midi',
  ) => {
    if (!blobUrl) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('DownloadURL', `${mime}:${filename}:${blobUrl}`);
    e.dataTransfer.setData('text/uri-list', blobUrl);
    e.dataTransfer.setData('text/plain', filename);
    showToast(`Drop "${filename}" into FL Studio Channel Rack, Playlist, or any plugin!`);
  };

  // ── Lower deck: bundle export ──────────────────────────────────────────
  const [isBundleExporting, setIsBundleExporting] = useState(false);
  const [bundleResult, setBundleResult] = useState<MultiTrackMidiResult | null>(null);
  const [bundleBlobUrl, setBundleBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!bundleResult) { setBundleBlobUrl(null); return; }
    const copy = new Uint8Array(bundleResult.midiData.byteLength);
    copy.set(bundleResult.midiData);
    const url = URL.createObjectURL(new Blob([copy.buffer as ArrayBuffer], { type: 'audio/midi' }));
    setBundleBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bundleResult]);

  const bundleFilename = `${audioFile?.name.replace(/\.[^/.]+$/, '') ?? 'Track'}_AllStems.mid`;
  const wavFilename = `${audioFile?.name.replace(/\.[^/.]+$/, '') ?? 'Track'}_Reharmonized.${audioFile?.name.split('.').pop() ?? 'wav'}`;

  const handleExportMidiBundle = async () => {
    if (!audioFile) { showToast('Upload an audio file first'); return; }
    setIsBundleExporting(true);
    try {
      const res = await transcribeAllStemsToMultiTrackMidi(audioFile, analysis);
      setBundleResult(res);
      downloadMidiBlob(res.midiData, bundleFilename);
      if (res.autoSliced) {
        showToast(`Track exceeds 30s — auto-sliced to the first ${Math.round(res.effectiveDurationSec)}s.`);
      }
      showToast(`Exported ${res.totalNotesCount} notes across ${res.tracksCount} tracks — drag "${bundleFilename}" into FL Studio`);
    } catch (err) {
      if (err instanceof TranscriptionTimeoutError) {
        showToast('⏱ Export timed out. Please try a shorter audio loop.');
      } else {
        showToast('MIDI bundle export failed — try again');
      }
    } finally {
      setIsBundleExporting(false);
    }
  };

  const handleExportWav = () => {
    if (!audioFile || !audioFileBlobUrl) { showToast('Upload an audio file first'); return; }
    const a = document.createElement('a');
    a.href = audioFileBlobUrl;
    a.download = wavFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Exported reference mix audio (full harmonic re-synthesis engine coming soon)');
  };

  // ── Lyrics & Persona Dock ──────────────────────────────────────────────
  const [lyricsDockOpen, setLyricsDockOpen] = useState(false);
  const lyricsBlocks = useMemo(() => parseDawBlocks(state.lyrics), [state.lyrics]);
  const structuralBlocks = useMemo(() => lyricsBlocks.filter(b => b.label !== '__pre__'), [lyricsBlocks]);
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
  const moodPills = useMemo(() => state.moods.slice(0, 3).map(id => id.replace(/-/g, ' ')), [state.moods]);
  const keyPill = analysis?.detectedKey ?? (state.musicalKeys[0] ?? '');
  const genrePill = state.genres[0]?.replace(/-/g, ' ') ?? '';

  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(eng.stylePrompt); } catch { /* clipboard unavailable */ }
    showToast('Style prompt copied!');
  };
  const copyLyrics = async () => {
    try { await navigator.clipboard.writeText(state.lyrics); } catch { /* clipboard unavailable */ }
    showToast('Lyrics copied!');
  };

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 h-full max-h-full overflow-hidden relative min-w-0 flex flex-col">
      {/* ══════════════ 1. GLOBAL HEADER BAR ══════════════ */}
      <header className="h-12 shrink-0 flex items-center gap-2 px-3 border-b border-white/5 bg-dock-rail overflow-x-auto">
        {/* Logo badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-cyan/25 to-neon-magenta/25 border border-ink-600 flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.25)]">
            <Disc3 className="w-3.5 h-3.5 text-neon-cyan" />
          </div>
          <span className="text-[12px] font-black tracking-wide bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent hidden md:inline">
            AudioPilot
          </span>
        </div>

        <div className="w-px h-5 bg-dock-border shrink-0" />

        {/* Record + Upload / Folder */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => (recorder.isRecording ? void handleStopRecording() : setRecordMenuOpen(o => !o))}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold whitespace-nowrap transition ${
                recorder.isRecording
                  ? 'border-red-500 bg-red-500/15 text-red-300'
                  : 'border-dock-border bg-dock-bg text-ink-300 hover:border-red-500/40'
              }`}
            >
              <Circle className={`w-2 h-2 ${recorder.isRecording ? 'fill-red-500 text-red-500 animate-pulse' : 'fill-red-500/70 text-red-500/70'}`} />
              {recorder.isRecording ? `${fmtTime(recorder.recordingTime)} · Stop` : 'Record'}
            </button>
            {recordMenuOpen && !recorder.isRecording && (
              <div className="absolute left-0 top-full mt-1.5 w-52 rounded-xl border border-dock-border bg-dock-card shadow-2xl z-30 p-1.5">
                <button
                  type="button"
                  onClick={() => { setRecordMenuOpen(false); void recorder.startMicRecording(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] text-ink-300 hover:bg-dock-hover transition"
                >
                  <Mic className="w-3.5 h-3.5" /> Microphone
                </button>
                <button
                  type="button"
                  onClick={() => { setRecordMenuOpen(false); void recorder.startSystemRecording(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] text-ink-300 hover:bg-dock-hover transition"
                >
                  <MonitorSpeaker className="w-3.5 h-3.5" /> System Audio
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-dock-border bg-dock-bg text-[10px] font-semibold text-ink-300 hover:border-neon-cyan/40 transition whitespace-nowrap"
          >
            <Upload className="w-3 h-3" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setFolderOpen(o => !o)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold transition whitespace-nowrap ${
              folderOpen ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-dock-border bg-dock-bg text-ink-300 hover:border-neon-cyan/40'
            }`}
          >
            <FolderOpen className="w-3 h-3" /> Folder
          </button>
        </div>

        {/* Key + BPM (center) */}
        <div className="flex items-center gap-1.5 mx-auto shrink-0">
          <div className="relative">
            <select
              value={effectiveKey}
              onChange={e => setKeyOverride(e.target.value)}
              className="appearance-none bg-dock-bg border border-dock-border rounded-full pl-2.5 pr-6 py-1 text-[10px] font-semibold text-ink-200 focus:outline-none focus:border-neon-cyan/50 cursor-pointer"
            >
              {KEY_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <ChevronDown className="w-2.5 h-2.5 text-ink-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dock-border bg-dock-bg text-[10px] font-mono font-bold text-neon-cyan whitespace-nowrap">
            {effectiveBpm} BPM
          </span>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition shrink-0"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={handleStop}
            title="Stop"
            className="w-7 h-7 rounded-full flex items-center justify-center border border-dock-border bg-dock-bg text-ink-400 hover:text-ink-200 transition shrink-0"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <span className="text-[10px] font-mono text-ink-500 w-12 text-right shrink-0">{fmtTime(playheadSec)}</span>
        </div>

        <div className="w-px h-5 bg-dock-border shrink-0" />

        {/* Reset + Settings */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleResetAll}
            title="Reset All"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-500 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-500 hover:text-ink-200 hover:bg-dock-hover transition"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Folder browser — absolute overlay so it never eats into the fixed deck heights */}
      {folderOpen && (
        <div className="absolute top-12 left-0 right-0 z-30 border-b border-white/5 bg-dock-surface max-h-72 overflow-y-auto shadow-2xl">
          <FolderPlaylistBrowser
            onSendToAnalyzer={(f) => { void processAudioFile(f); setFolderOpen(false); }}
            onShowToast={showToast}
          />
        </div>
      )}

      {/* ══════════════ Deck stack — fills remaining viewport, no page-level scroll ══════════════ */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 px-3 py-2 overflow-hidden">

        {/* ══════════════ 2. UPPER DECK — Input (~48% height) ══════════════ */}
        <section className="flex-1 min-h-0 flex flex-col rounded-xl bg-dock-card border border-white/5 shadow-panel overflow-hidden">
          {/* Section header — mirrors the 3-column row structure for alignment */}
          <div className="shrink-0 flex items-center gap-3 px-3 py-1 border-b border-white/5 bg-dock-hover/20">
            {/* Left zone — matches w-36 track-control column */}
            <div className="w-36 shrink-0 flex items-center gap-1.5">
              <Waves className="w-3 h-3 text-neon-cyan" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-300">Input</span>
              {!audioFile && <span className="text-[9px] text-ink-500 italic ml-1">· drop audio</span>}
            </div>
            {/* Center zone — bar ruler aligned with waveform column */}
            <div className="flex-1 flex items-center min-w-0">
              {Array.from({ length: barCount }).map((_, i) => (
                <span key={i} className="flex-1 text-center text-[9px] text-ink-600 font-mono">{i + 1}</span>
              ))}
            </div>
            {/* Right zone — column headers matching w-52 export panel */}
            <div className="w-52 shrink-0 flex items-center">
              <span className="flex-1 text-center text-[9px] font-bold uppercase tracking-widest text-ink-500">Export stem</span>
              <span className="flex-1 text-center text-[9px] font-bold uppercase tracking-widest text-ink-500">Convert to MIDI</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 flex flex-col">
            {UPPER_ROWS.map(row => {
              const isSolo = upperSolo === row.id;
              const isMuted = upperMuted.has(row.id);
              const dimmed = upperSolo !== null ? !isSolo : isMuted;
              const transcription = rowTranscriptions[row.id];
              return (
                <div key={row.id} className="flex-1 min-h-[52px] flex items-stretch gap-2 border-b border-white/5 last:border-b-0">
                  {/* Left: label + controls */}
                  <div className="w-36 shrink-0 flex flex-col gap-0.5 justify-center pr-1 pl-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="text-[10px] font-bold truncate" style={{ color: row.color }}>{row.label}</span>
                    </div>
                    <TrackControlCluster
                      color={row.color}
                      solo={isSolo}
                      muted={isMuted}
                      volume={upperVolume[row.id]}
                      onToggleSolo={() => toggleUpperSolo(row.id)}
                      onToggleMute={() => toggleUpperMute(row.id)}
                      onVolumeChange={(v) => setUpperVolume(prev => ({ ...prev, [row.id]: v }))}
                    />
                  </div>

                  {/* Center: waveform — self-stretch so it fills the full row height */}
                  <div className="flex-1 min-w-0 self-stretch min-h-[44px] py-1">
                    <WaveformCanvas
                      audioFile={audioFile}
                      accentColor={row.color}
                      progressSec={playheadSec}
                      totalDurationSec={totalDurationSec}
                      gridDivisions={8}
                      dimmed={dimmed}
                      onSeek={handleSeek}
                      onDuration={row.id === 'lead' ? setDecodedDurationSec : undefined}
                    />
                  </div>

                  {/* Right: side-by-side Export Stem | Convert to MIDI cards (matching column headers) */}
                  <div className="w-52 shrink-0 flex gap-1.5 items-stretch py-1 pr-1">
                    <div className="flex-1 min-w-0">
                      <ExportStemCard row={row} disabled={!audioFile} onExport={() => handleExportStemAudio(row)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <ConvertToMidiCard
                        row={row}
                        transcription={transcription}
                        blobUrl={rowBlobUrls[row.id]}
                        isTranscribing={rowTranscribing === row.id}
                        disabled={!audioFile}
                        onConvert={() => void handleConvertRow(row)}
                        onSave={() => handleSaveRowMidi(row)}
                        onCopy={() => void handleCopyMidi(row.id, rowBlobUrls[row.id], row.label)}
                        copyState={copyStates[row.id] ?? 'idle'}
                        onDragStart={(e) => beginNativeDrag(e, `${row.label.replace(/[^a-z0-9]+/gi, '_')}.mid`, rowBlobUrls[row.id])}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════ 3. MIDDLE REHARMONIZATION BAR (fixed h-10) ══════════════ */}
        <section className="h-10 shrink-0 rounded-xl bg-dock-card border border-white/5 shadow-panel px-3 flex items-center gap-2 overflow-x-auto">
          {/* Source selector */}
          <div className="flex items-center gap-1 text-[10px] text-ink-400 shrink-0">
            <span>Using</span>
            <select
              value={reharmSource}
              onChange={e => setReharmSource(e.target.value as 'lead' | 'chords')}
              className="bg-dock-bg border border-dock-border rounded-md px-1.5 py-0.5 text-[10px] text-ink-200 focus:outline-none focus:border-neon-cyan/50"
            >
              <option value="lead">Vocals / Lead</option>
              <option value="chords">Instruments</option>
            </select>
          </div>

          {/* Center stepper — cycles the 4 named 8-bar presets driving the Lower Deck timeline */}
          <div className="flex-1 flex items-center justify-center gap-2 min-w-[200px]">
            <button
              type="button"
              onClick={() => cyclePreset(-1)}
              title="Previous progression"
              className="p-1 rounded-lg text-ink-400 hover:text-neon-cyan hover:bg-dock-hover transition shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex flex-col items-center min-w-[180px] text-center">
              <span className="text-[11px] font-bold text-neon-magenta whitespace-nowrap">
                Chord progression {presetIndex + 1}
              </span>
              <span className="text-[9px] text-ink-500 font-mono whitespace-nowrap">
                {activePreset.label} — {activePreset.blocks.map(b => b.romanNumeral).join(' · ')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => cyclePreset(1)}
              title="Next progression"
              className="p-1 rounded-lg text-ink-400 hover:text-neon-cyan hover:bg-dock-hover transition shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Advanced dropdown — procedurally-rolled reharmonization ideas, inject-to-lyrics */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAdvancedOpen(o => !o)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dock-border bg-dock-bg text-[10px] text-ink-300 hover:border-neon-cyan/40 transition"
            >
              <Sparkles className="w-3 h-3 text-neon-cyan" /> Advanced
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </button>
            {advancedOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-dock-border bg-dock-card shadow-2xl z-30 p-3 flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink-500 mb-1">
                  More Reharmonization Ideas — Nashville Numbers · Gospel Turnarounds
                </div>
                {harmonyVariations.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleInjectVariationTag(v)}
                    title="Click to inject this Suno bracket tag into your lyrics"
                    className="text-left px-2.5 py-2 rounded-lg border border-dock-border hover:border-neon-magenta/40 hover:bg-neon-magenta/5 transition"
                  >
                    <div className="text-[11px] font-semibold text-ink-200">{v.label}</div>
                    {v.romanProgression && <div className="text-[9px] text-neon-cyan/70 font-mono mt-0.5">{v.romanProgression}</div>}
                    <div className="text-[9px] text-ink-500 mt-0.5 leading-relaxed">{v.theoryBreakdown}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { onOpenStyleStudio(); setAdvancedOpen(false); }}
                  className="text-[10px] font-semibold text-ink-400 hover:text-ink-200 text-left"
                >
                  🎼 Browse full Genre Blueprints in Style Studio →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════ 4. LOWER DECK — Harmonic Arrangement (~48% height) ══════════════ */}
        <section className="flex-1 min-h-0 flex flex-col rounded-xl bg-dock-card border border-white/5 shadow-panel overflow-hidden">
          {/* Section header — mirrors lower-deck row structure for Export column alignment */}
          <div className="shrink-0 flex items-center gap-3 px-3 py-1 border-b border-white/5 bg-dock-hover/20">
            {/* Left zone — matches w-36 track-control column */}
            <div className="w-36 shrink-0 flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-neon-magenta" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-300">Harmonic</span>
            </div>
            {/* Center zone — bar ruler aligned with waveform column */}
            <div className="flex-1 min-w-0" />
            {/* Right zone — column headers for draggable export cards */}
            <div className="w-[100px] shrink-0 flex items-center">
              <div
                draggable={!!audioFileBlobUrl}
                onDragStart={e => beginNativeDrag(e, wavFilename, audioFileBlobUrl, 'audio/wav')}
                onClick={handleExportWav}
                title={audioFileBlobUrl ? 'Click to download WAV, or drag into DAW' : 'Upload audio first'}
                className={`flex-1 text-center text-[9px] font-bold uppercase tracking-widest cursor-pointer transition select-none ${
                  audioFileBlobUrl ? 'text-emerald-400 hover:text-emerald-300' : 'text-ink-600'
                }`}
              >
                Export WAV
              </div>
              <div
                draggable={!!bundleBlobUrl}
                onDragStart={e => beginNativeDrag(e, bundleFilename, bundleBlobUrl)}
                onClick={() => void handleExportMidiBundle()}
                title={bundleBlobUrl ? 'Drag MIDI bundle into DAW, or click to re-export' : 'Click to build MIDI bundle'}
                className={`flex-1 text-center text-[9px] font-bold uppercase tracking-widest cursor-pointer transition select-none ${
                  audioFile ? 'text-neon-cyan hover:text-neon-cyan/80' : 'text-ink-600'
                }`}
              >
                {isBundleExporting ? <span className="flex justify-center"><Loader2 className="w-3 h-3 animate-spin" /></span> : 'Export MIDI'}
              </div>
            </div>
          </div>

          {/* 8-bar Roman-numeral chord timeline — driven by the middle bar's preset stepper */}
          <div className="shrink-0 border-b border-white/5">
            {/* Bar ruler — spans only the waveform column, aligned with upper deck ruler */}
            <div className="flex px-3 pt-1 gap-2">
              {/* Left spacer matching w-36 track-control column */}
              <div className="w-36 shrink-0" />
              {/* Center ruler — flex-1 same as waveform column */}
              <div className="flex-1 flex">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="flex-1 text-center text-[9px] text-ink-600 font-mono">{i + 1}</span>
                ))}
              </div>
              {/* Right spacer matching w-[100px] export column */}
              <div className="w-[100px] shrink-0" />
            </div>
            {/* Full-width chord blocks row */}
            <div className="flex px-3 pb-1 pt-0 gap-2">
              {/* Left spacer */}
              <div className="w-36 shrink-0 flex items-end pb-0.5">
                <span className="text-[8px] text-ink-600 font-mono truncate">{activePreset.label}</span>
              </div>
              {/* Chord blocks — edge-to-edge across flex-1, matching waveform width */}
              <div className="flex-1 relative flex h-[56px]">
                {activePreset.blocks.map((block, i) => {
                  const span = block.bars[1] - block.bars[0] + 1;
                  const color = REHARM_BLOCK_COLORS[i % REHARM_BLOCK_COLORS.length];
                  const chordName = resolveChordName(effectiveKey, block);
                  const barsLabel = block.bars[1] !== block.bars[0] ? `${block.bars[0]}-${block.bars[1]}` : `${block.bars[0]}`;
                  const isFirst = i === 0;
                  const isLast = i === activePreset.blocks.length - 1;
                  return (
                    <div
                      key={i}
                      title={`Bars ${barsLabel}: ${block.romanNumeral} (${chordName})`}
                      className={`flex flex-col items-center justify-center gap-0.5 border-t-[3px] min-w-0 ${
                        isFirst ? 'rounded-tl-md rounded-bl-md' : ''} ${isLast ? 'rounded-tr-md rounded-br-md' : ''
                      }`}
                      style={{
                        flex: span,
                        borderTopColor: color,
                        backgroundColor: `${color}18`,
                        borderLeft: i > 0 ? `1px solid rgba(255,255,255,0.06)` : 'none',
                      }}
                    >
                      <span className="text-[15px] font-black leading-none truncate max-w-full px-1" style={{ color }}>
                        {block.romanNumeral}
                      </span>
                      <span className="text-[10px] text-ink-200 font-mono font-semibold leading-none mt-0.5">{chordName}</span>
                    </div>
                  );
                })}
                {/* Playhead — loops across the 8-bar span */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                  style={{ left: `${loopPlayheadPct}%` }}
                />
              </div>
              {/* Right spacer */}
              <div className="w-[100px] shrink-0" />
            </div>
          </div>

          {/* Synced track rows */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {LOWER_ROWS.map(row => {
              const isSolo = lowerSolo === row.id;
              const isMuted = lowerMuted.has(row.id);
              const dimmed = lowerSolo !== null ? !isSolo : isMuted;
              return (
                <div key={row.id} className="flex-1 min-h-[52px] flex items-stretch gap-2 px-3 border-b border-white/5 last:border-b-0">
                  {/* Left: colored pill label + S/M/knob — w-36 matching lower-deck chord block left spacer */}
                  <div className="w-36 shrink-0 flex items-center gap-1.5 py-1">
                    <button
                      type="button"
                      title={row.label}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap"
                      style={{
                        backgroundColor: `${row.color}22`,
                        border: `1px solid ${row.color}55`,
                        color: row.color,
                      }}
                    >
                      {row.label.split('/')[0].trim()}
                      <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                    </button>
                    <TrackControlCluster
                      color={row.color}
                      solo={isSolo}
                      muted={isMuted}
                      volume={lowerVolume[row.id]}
                      onToggleSolo={() => toggleLowerSolo(row.id)}
                      onToggleMute={() => toggleLowerMute(row.id)}
                      onVolumeChange={(v) => setLowerVolume(prev => ({ ...prev, [row.id]: v }))}
                    />
                  </div>

                  {/* Center: waveform — self-stretch to fill full row height */}
                  <div className="flex-1 min-w-0 self-stretch min-h-[44px] py-1">
                    <WaveformCanvas
                      audioFile={audioFile}
                      accentColor={row.color}
                      progressSec={playheadSec}
                      totalDurationSec={totalDurationSec}
                      gridDivisions={8}
                      dimmed={dimmed}
                      onSeek={handleSeek}
                    />
                  </div>

                  {/* Right: mini WAV + MIDI export thumbnail cards — w-[100px] matching header columns */}
                  <div className="w-[100px] shrink-0 flex gap-1 items-stretch py-1 pr-1">
                    {/* WAV mini card */}
                    <div
                      draggable={!!audioFileBlobUrl}
                      onDragStart={e => beginNativeDrag(e, wavFilename, audioFileBlobUrl, 'audio/wav')}
                      onClick={handleExportWav}
                      title={audioFileBlobUrl ? 'Drag WAV into DAW' : 'Upload audio first'}
                      className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 rounded-md border relative overflow-hidden transition select-none ${
                        audioFileBlobUrl
                          ? 'border-emerald-500/30 bg-emerald-500/06 cursor-grab active:cursor-grabbing hover:brightness-125'
                          : 'border-dock-border/40 opacity-40'
                      }`}
                    >
                      {/* Mini waveform texture */}
                      <div className="absolute inset-0 flex items-center gap-px px-1 opacity-30 pointer-events-none">
                        {Array.from({ length: 12 }).map((_, k) => (
                          <div key={k} className="flex-1 rounded-sm bg-emerald-400"
                            style={{ height: `${15 + Math.sin(k * 1.8) * 12}%` }} />
                        ))}
                      </div>
                      <Download className="w-3 h-3 text-emerald-400 relative z-10" />
                    </div>
                    {/* MIDI mini card — with Copy overlay button */}
                    <div
                      className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 rounded-md border relative overflow-hidden transition select-none ${
                        audioFile
                          ? 'border-neon-cyan/30 bg-neon-cyan/06'
                          : 'border-dock-border/40 opacity-40'
                      }`}
                    >
                      {/* Mini piano-roll texture */}
                      <div className="absolute inset-0 flex flex-col gap-px px-1 py-1 opacity-25 pointer-events-none">
                        {Array.from({ length: 4 }).map((_, ri) => (
                          <div key={ri} className="flex-1 flex items-center gap-px">
                            {Array.from({ length: 10 }).map((_, ci) => (
                              <div key={ci} className="flex-1 h-1 rounded-sm bg-neon-cyan"
                                style={{ opacity: Math.random() > 0.6 ? 1 : 0 }} />
                            ))}
                          </div>
                        ))}
                      </div>
                      {/* Drag + Copy row */}
                      <div className="flex items-center gap-0.5 relative z-10">
                        <div
                          draggable={!!bundleBlobUrl}
                          onDragStart={e => beginNativeDrag(e, bundleFilename, bundleBlobUrl)}
                          onClick={() => void handleExportMidiBundle()}
                          title={bundleBlobUrl ? 'Drag MIDI into DAW' : 'Click to build bundle'}
                          className={`p-1 rounded transition ${bundleBlobUrl ? 'text-neon-cyan cursor-grab active:cursor-grabbing hover:text-white' : 'text-ink-600'}`}
                        >
                          <FileMusic className="w-3 h-3" />
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleCopyMidi(`lower-${row.id}`, bundleBlobUrl, `${row.label}_MIDI`)}
                          title={copyStates[`lower-${row.id}`] === 'copied' ? '✓ Copied!' : 'Copy MIDI data URI'}
                          className={`p-1 rounded transition ${copyStates[`lower-${row.id}`] === 'copied' ? 'text-emerald-400' : 'text-ink-500 hover:text-neon-cyan'}`}
                        >
                          {copyStates[`lower-${row.id}`] === 'copied'
                            ? <span className="text-[8px] font-bold">✓</span>
                            : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ══════════════ 5. LYRICS & PERSONA DOCK ══════════════ */}
      <button
        type="button"
        onClick={() => setLyricsDockOpen(o => !o)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 px-2 py-4 rounded-l-xl border border-r-0 transition-transform ${
          lyricsDockOpen ? 'bg-dock-card border-neon-magenta/40 -translate-x-96' : 'bg-dock-card border-dock-border hover:border-neon-magenta/40'
        }`}
        title="Lyrics & Persona Dock"
      >
        <FileMusic className="w-3.5 h-3.5 text-neon-magenta" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-neon-magenta" style={{ writingMode: 'vertical-rl' }}>
          Lyrics &amp; Persona Dock
        </span>
        {structuralBlocks.length > 0 && (
          <span className="text-[9px] text-ink-500 font-mono">{structuralBlocks.length}</span>
        )}
      </button>

      <div
        className={`fixed right-0 top-0 bottom-0 w-96 max-w-[90vw] bg-dock-surface border-l border-dock-border shadow-2xl z-30 flex flex-col transition-transform duration-300 ${
          lyricsDockOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-dock-border bg-dock-card">
          <FileMusic className="w-4 h-4 text-neon-magenta" />
          <span className="text-[12px] font-bold text-ink-200 flex-1">Lyrics &amp; Persona Dock</span>
          <button type="button" onClick={onOpenStyleStudio} title="Open full editor" className="p-1 rounded text-ink-500 hover:text-ink-200 transition">
            <Expand className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => setLyricsDockOpen(false)} className="p-1 rounded text-ink-500 hover:text-ink-200 transition">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {structuralBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Music2 className="w-10 h-10 text-ink-700" />
              <p className="text-[11px] text-ink-500 italic text-center leading-relaxed">
                Generate lyrics in the<br />Lyric Canvas to see them<br />as structured cards here.
              </p>
              <button
                type="button"
                onClick={onOpenStyleStudio}
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
                  <div className={`flex items-center gap-2 px-3 py-2 border-b ${
                    block.isChorus ? 'border-fuchsia-500/20 bg-fuchsia-900/20' : 'border-dock-border bg-dock-hover/50'
                  }`}>
                    <span className={`text-[12px] font-bold flex-1 ${block.isChorus ? 'text-fuchsia-300' : 'text-neon-cyan'}`}>
                      {block.label}
                    </span>
                    {syllCount > 0 && (
                      <span className="w-6 h-6 rounded-full bg-neon-magenta/20 border border-neon-magenta/40 text-neon-magenta text-[9px] font-bold flex items-center justify-center shrink-0">
                        {syllCount > 99 ? '99+' : syllCount}
                      </span>
                    )}
                  </div>

                  <div className="px-3 py-2.5">
                    {bodyLines.length > 0 ? (
                      <div className="space-y-1">
                        {bodyLines.slice(0, 6).map((line, li) => (
                          <p key={li} className="text-[12px] text-ink-200 leading-relaxed font-mono truncate">{line}</p>
                        ))}
                        {bodyLines.length > 6 && (
                          <p className="text-[10px] text-ink-500 italic">+{bodyLines.length - 6} more lines</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-ink-600 italic">Empty section</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 px-3 pb-2.5">
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

        <div className="shrink-0 border-t border-dock-border bg-dock-card px-3 py-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void copyPrompt()}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/15 transition"
          >
            <Copy className="w-3 h-3" /> Prompt
          </button>
          <button
            type="button"
            onClick={() => void copyLyrics()}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium bg-neon-magenta/10 border border-neon-magenta/30 text-neon-magenta hover:bg-neon-magenta/15 transition"
          >
            <Copy className="w-3 h-3" /> Lyrics
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TrackControlCluster({
  color, solo, muted, volume, onToggleSolo, onToggleMute, onVolumeChange,
}: {
  color: string;
  solo: boolean;
  muted: boolean;
  volume: number;
  onToggleSolo: () => void;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={onToggleSolo}
        title="Solo"
        className="w-6 h-6 rounded-md text-[9px] font-bold flex items-center justify-center border transition"
        style={solo
          ? { backgroundColor: color, borderColor: color, color: '#0b0d11' }
          : { borderColor: 'rgba(255,255,255,0.12)', color: 'var(--ink-400, #9ca3af)' }}
      >
        S
      </button>
      <button
        type="button"
        onClick={onToggleMute}
        title="Mute"
        className={`w-6 h-6 rounded-md text-[9px] font-bold flex items-center justify-center border transition ${
          muted ? 'bg-red-500/85 border-red-400 text-white' : 'text-ink-400 border-ink-700 bg-ink-900/60 hover:text-ink-200'
        }`}
      >
        M
      </button>
      <VolumeKnob color={color} value={volume} onChange={onVolumeChange} />
    </div>
  );
}

function VolumeKnob({ color, value, onChange }: { color: string; value: number; onChange: (v: number) => void }) {
  const angle = -135 + (value / 100) * 270;
  const cycle = () => onChange(value >= 100 ? 0 : Math.min(100, value + 25));
  return (
    <button
      type="button"
      onClick={cycle}
      title={`Volume: ${value}%`}
      className="relative w-6 h-6 rounded-full bg-ink-900 border border-ink-700 hover:border-ink-500 transition shrink-0"
    >
      <div className="absolute inset-0 flex items-start justify-center" style={{ transform: `rotate(${angle}deg)` }}>
        <span className="w-0.5 h-2 rounded-full mt-0.5" style={{ backgroundColor: color }} />
      </div>
    </button>
  );
}

function ExportStemCard({ row, disabled, onExport }: { row: UpperRowConfig; disabled: boolean; onExport: () => void }) {
  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled}
      className="w-full h-full flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 hover:brightness-125 transition disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
      style={{ borderColor: `${row.color}40`, backgroundColor: `${row.color}08` }}
    >
      {/* Subtle waveform-texture background */}
      <div className="absolute inset-0 flex items-center gap-px px-2 opacity-20 pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ height: `${20 + Math.sin(i * 1.3) * 15 + Math.cos(i * 0.7) * 10}%`, backgroundColor: row.color }} />
        ))}
      </div>
      <Download className="w-3.5 h-3.5 relative z-10" style={{ color: row.color }} />
      <span className="text-[9px] font-bold relative z-10" style={{ color: row.color }}>Export</span>
    </button>
  );
}

function ConvertToMidiCard({
  row, transcription, blobUrl, isTranscribing, disabled, onConvert, onSave, onCopy, copyState, onDragStart,
}: {
  row: UpperRowConfig;
  transcription: TranscriptionResult | null;
  blobUrl: string | null;
  isTranscribing: boolean;
  disabled: boolean;
  onConvert: () => void;
  onSave: () => void;
  onCopy: () => void;
  copyState: 'idle' | 'copied';
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
}) {
  const filename = `${row.label.replace(/[^a-z0-9]+/gi, '_')}.mid`;
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-1 rounded-lg border relative overflow-hidden"
      style={{ borderColor: `${row.color}55`, backgroundColor: `${row.color}0d` }}
    >
      {/* Piano-roll dot texture background */}
      <div className="absolute inset-0 flex flex-col gap-px px-1.5 py-1 opacity-25 pointer-events-none">
        {Array.from({ length: 5 }).map((_, ri) => (
          <div key={ri} className="flex-1 flex items-center gap-px">
            {Array.from({ length: 16 }).map((_, ci) => (
              <div key={ci} className="flex-1 h-1 rounded-sm"
                style={{ backgroundColor: row.color, opacity: Math.random() > 0.55 ? 0.9 : 0 }} />
            ))}
          </div>
        ))}
      </div>
      {!transcription ? (
        <>
          <FileMusic className="w-3.5 h-3.5 relative z-10" style={{ color: row.color }} />
          <button
            type="button"
            onClick={onConvert}
            disabled={isTranscribing || disabled}
            className="relative z-10 px-2 py-0.5 rounded-md text-[9px] font-bold border transition disabled:opacity-40"
            style={{ borderColor: row.color, color: row.color }}
          >
            {isTranscribing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Convert'}
          </button>
        </>
      ) : (
        <>
          <div className="text-[9px] font-mono relative z-10 truncate max-w-full px-1" style={{ color: row.color }}>
            {transcription.notes.length}n
          </div>
          <div className="flex gap-1 relative z-10">
            {/* Download */}
            <button type="button" onClick={onSave} title="Download .mid" className="p-1 rounded text-ink-400 hover:text-ink-200 transition">
              <Download className="w-3 h-3" />
            </button>
            {/* Copy MIDI data URI */}
            <button
              type="button"
              onClick={onCopy}
              title={copyState === 'copied' ? '✓ Copied!' : 'Copy MIDI data URI'}
              className={`p-1 rounded transition ${copyState === 'copied' ? 'text-emerald-400' : 'text-ink-400 hover:text-neon-cyan'}`}
            >
              {copyState === 'copied'
                ? <span className="text-[8px] font-bold text-emerald-400">✓</span>
                : <Copy className="w-3 h-3" />}
            </button>
            {/* Drag handle */}
            <div
              draggable
              onDragStart={onDragStart}
              title={blobUrl ? `Drag "${filename}" into your DAW` : 'Preparing…'}
              className="p-1 rounded cursor-grab active:cursor-grabbing border"
              style={{ borderColor: row.color, color: row.color }}
            >
              <GripVertical className="w-3 h-3" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
