// MidiStagingRoll — DAW-style piano-roll canvas with playback preview,
// drag-to-DAW MIDI handles, and 1-click "Export All Stems" for FL Studio.
//
// Renders transcribed Lead / Chords / Bass notes as colored bars on a
// scrollable HTML5 Canvas (no extra libraries required). Transport uses
// the Web Audio API (triangle oscillators, no Tone.js dependency).

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Download,
  GripVertical,
  Zap,
} from 'lucide-react';
import type { InstrumentLayerSplitResult } from '@/engine/audioToMidiEngine';
import type { MidiNote } from '@/utils/midiEncoder';
import { downloadMidiBlob } from '@/utils/midiEncoder';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MidiStagingRollProps {
  midiLayers: InstrumentLayerSplitResult | null;
  /** Base filename (no extension) for the exported .mid files. */
  baseName: string;
  onShowToast: (msg: string) => void;
}

type LayerKey = 'lead' | 'chords' | 'bass';

interface LayeredNote extends MidiNote {
  layer: LayerKey;
}

// ─── Visual constants ─────────────────────────────────────────────────────────

/** Canvas pixels per second on the time axis. */
const PX_PER_SEC = 90;
/** Pixels tall per semitone row. */
const ROW_HEIGHT = 5;
/** Fixed CSS height of the roll canvas container. */
const ROLL_CSS_HEIGHT = 180;
/** Minimum note width so very short notes are still visible. */
const MIN_NOTE_WIDTH_PX = 3;

const LAYER_STYLE: Record<LayerKey, { fill: string; stroke: string; label: string }> = {
  lead:   { fill: 'rgba(6,182,212,0.70)',  stroke: '#06b6d4', label: 'Lead.mid'   },
  chords: { fill: 'rgba(217,70,239,0.60)', stroke: '#d946ef', label: 'Chords.mid' },
  bass:   { fill: 'rgba(168,85,247,0.60)', stroke: '#a855f7', label: 'Bass.mid'   },
};

const DRAG_BADGE_STYLE: Record<LayerKey, { border: string; text: string; bg: string }> = {
  lead:   { border: 'border-cyan-500/50',    text: 'text-cyan-300',    bg: 'bg-cyan-500/5'    },
  chords: { border: 'border-fuchsia-500/50', text: 'text-fuchsia-300', bg: 'bg-fuchsia-500/5' },
  bass:   { border: 'border-purple-500/50',  text: 'text-purple-300',  bg: 'bg-purple-500/5'  },
};

// ─── Canvas helper ────────────────────────────────────────────────────────────

/** Draws a rounded rectangle — polyfills via `fillRect` if `roundRect` is absent. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

// ─── Web Audio helpers ────────────────────────────────────────────────────────

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Schedules up to `maxNotes` triangle-oscillator tones for the provided note list.
 * Returns the created OscillatorNodes so they can be stopped later.
 */
function scheduleOscillators(
  actx: AudioContext,
  notes: MidiNote[],
  startOffset: number,
  maxNotes = 120,
): OscillatorNode[] {
  const now = actx.currentTime;
  const nodes: OscillatorNode[] = [];
  const sorted = [...notes].sort((a, b) => a.startTimeSec - b.startTimeSec);

  for (const n of sorted.slice(0, maxNotes)) {
    if (n.startTimeSec < startOffset - 0.01) continue;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    const startAt = now + Math.max(0, n.startTimeSec - startOffset);
    const dur = Math.min(n.durationSec, 1.8);

    osc.type = 'triangle';
    osc.frequency.value = midiToHz(n.midiNumber);
    gain.gain.setValueAtTime(0.001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.14, startAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);

    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.06);
    nodes.push(osc);
  }
  return nodes;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MidiStagingRoll({ midiLayers, baseName, onShowToast }: MidiStagingRollProps) {
  // ── Blob URLs for drag-to-DAW ─────────────────────────────────────────────
  const [blobUrls, setBlobUrls] = useState<Record<LayerKey, string | null>>({
    lead: null, chords: null, bass: null,
  });

  useEffect(() => {
    if (!midiLayers) {
      setBlobUrls({ lead: null, chords: null, bass: null });
      return;
    }
    // Copy to a fresh ArrayBuffer-backed Uint8Array so Blob constructor type-checks cleanly
    // (midiData is Uint8Array<ArrayBufferLike> which may include SharedArrayBuffer variants).
    const make = (d: Uint8Array) => {
      const copy = new Uint8Array(d.byteLength);
      copy.set(d);
      return URL.createObjectURL(new Blob([copy], { type: 'audio/midi' }));
    };
    const urls: Record<LayerKey, string | null> = {
      lead:   make(midiLayers.lead.midiData),
      chords: make(midiLayers.chords.midiData),
      bass:   make(midiLayers.bass.midiData),
    };
    setBlobUrls(urls);
    return () => {
      (Object.values(urls) as (string | null)[]).forEach(u => u && URL.revokeObjectURL(u));
    };
  }, [midiLayers]);

  // ── Combined note list ────────────────────────────────────────────────────
  const allNotes = useMemo<LayeredNote[]>(() => {
    if (!midiLayers) return [];
    return [
      ...midiLayers.lead.notes.map(n => ({ ...n, layer: 'lead' as const })),
      ...midiLayers.chords.notes.map(n => ({ ...n, layer: 'chords' as const })),
      ...midiLayers.bass.notes.map(n => ({ ...n, layer: 'bass' as const })),
    ];
  }, [midiLayers]);

  const totalTimeSec = useMemo(() => {
    if (allNotes.length === 0) return 16;
    return Math.max(...allNotes.map(n => n.startTimeSec + n.durationSec)) + 1;
  }, [allNotes]);

  const pitchRange = useMemo(() => {
    if (allNotes.length === 0) return { min: 48, max: 84 };
    const rawMin = Math.min(...allNotes.map(n => n.midiNumber));
    const rawMax = Math.max(...allNotes.map(n => n.midiNumber));
    return { min: Math.max(21, rawMin - 4), max: Math.min(108, rawMax + 4) };
  }, [allNotes]);

  // ── Canvas drawing ────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrubberSec, setScrubberSec] = useState(0);

  /** Stable refs so draw effect doesn't need them as deps */
  const scrubberRef = useRef(0);
  scrubberRef.current = scrubberSec;

  const drawRoll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pitchCount = pitchRange.max - pitchRange.min + 1;
    const cssH = Math.max(ROLL_CSS_HEIGHT, pitchCount * ROW_HEIGHT);
    const cssW = Math.max(480, totalTimeSec * PX_PER_SEC);

    // Only resize if dimensions changed (avoids full repaint flicker)
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);

    // ── Background rows ──────────────────────────────────────────────────
    for (let midi = pitchRange.min; midi <= pitchRange.max; midi++) {
      const y = (pitchRange.max - midi) * ROW_HEIGHT;
      const isBlack = [1, 3, 6, 8, 10].includes(midi % 12);
      ctx.fillStyle = isBlack ? '#0e1014' : '#12151c';
      ctx.fillRect(0, y, cssW, ROW_HEIGHT);

      // C-note divider (faint cyan line)
      if (midi % 12 === 0) {
        ctx.fillStyle = 'rgba(6,182,212,0.10)';
        ctx.fillRect(0, y, cssW, 1);
        // Octave label
        const octave = Math.floor(midi / 12) - 1;
        ctx.fillStyle = 'rgba(6,182,212,0.30)';
        ctx.font = '8px monospace';
        ctx.fillText(`C${octave}`, 2, y + ROW_HEIGHT - 1);
      }
    }

    // ── Beat grid ────────────────────────────────────────────────────────
    const approxBeatSec = 0.5; // ~120 BPM quarter note
    const beatCount = Math.ceil(totalTimeSec / approxBeatSec) + 1;
    for (let b = 0; b <= beatCount; b++) {
      const x = b * approxBeatSec * PX_PER_SEC;
      const isBar = b % 4 === 0;
      ctx.fillStyle = isBar
        ? 'rgba(6,182,212,0.18)'
        : 'rgba(255,255,255,0.04)';
      ctx.fillRect(x, 0, 1, cssH);
    }

    // ── Notes ────────────────────────────────────────────────────────────
    for (const note of allNotes) {
      const style = LAYER_STYLE[note.layer];
      const x = note.startTimeSec * PX_PER_SEC;
      const y = (pitchRange.max - note.midiNumber) * ROW_HEIGHT + 0.5;
      const w = Math.max(MIN_NOTE_WIDTH_PX, note.durationSec * PX_PER_SEC - 1);
      const h = ROW_HEIGHT - 1;

      ctx.beginPath();
      roundRect(ctx, x, y, w, h, 2);
      ctx.fillStyle = style.fill;
      ctx.fill();
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // ── Scrubber line ─────────────────────────────────────────────────────
    const sx = scrubberRef.current * PX_PER_SEC;
    if (sx > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.90)';
      ctx.fillRect(sx, 0, 2, cssH);
      // Glow
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.fillRect(sx - 2, 0, 6, cssH);
    }

    ctx.restore();
  }, [allNotes, totalTimeSec, pitchRange]);

  useEffect(() => {
    drawRoll();
  }, [drawRoll, scrubberSec]);

  // ── Transport ──────────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<OscillatorNode[]>([]);
  const rafRef = useRef<number>(0);
  const playOriginRef = useRef<{ wall: number; offset: number }>({ wall: 0, offset: 0 });

  /** Stable refs for loop/totalTime so callbacks don't become stale */
  const loopRef = useRef(loop);
  useEffect(() => { loopRef.current = loop; }, [loop]);
  const totalTimeRef = useRef(totalTimeSec);
  useEffect(() => { totalTimeRef.current = totalTimeSec; }, [totalTimeSec]);
  const midiLayersRef = useRef(midiLayers);
  useEffect(() => { midiLayersRef.current = midiLayers; }, [midiLayers]);

  const stopPlayback = useCallback(() => {
    nodesRef.current.forEach(n => { try { n.stop(); } catch { /**/ } });
    nodesRef.current = [];
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback((fromSec: number) => {
    const layers = midiLayersRef.current;
    if (!layers) return;

    // Create or resume AudioContext
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AC = (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      );
      audioCtxRef.current = new AC();
    }
    const actx = audioCtxRef.current;
    if (actx.state === 'suspended') actx.resume();

    const combinedNotes: MidiNote[] = [
      ...layers.lead.notes,
      ...layers.chords.notes,
      ...layers.bass.notes,
    ];
    nodesRef.current = scheduleOscillators(actx, combinedNotes, fromSec);
    playOriginRef.current = { wall: performance.now(), offset: fromSec };
    setIsPlaying(true);

    const tick = () => {
      const elapsed = (performance.now() - playOriginRef.current.wall) / 1000;
      const pos = playOriginRef.current.offset + elapsed;
      setScrubberSec(pos);

      if (pos >= totalTimeRef.current) {
        if (loopRef.current) {
          stopPlayback();
          // Tiny delay so React state flushes before re-scheduling
          setTimeout(() => startPlayback(0), 60);
        } else {
          stopPlayback();
          setScrubberSec(0);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopPlayback]); // stopPlayback is stable (no deps)

  // Cleanup on unmount
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  // ── Canvas click → seek ───────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const seekSec = Math.max(0, (e.clientX - rect.left) / PX_PER_SEC);
    setScrubberSec(seekSec);
    if (isPlaying) {
      stopPlayback();
      startPlayback(seekSec);
    }
  }, [isPlaying, stopPlayback, startPlayback]);

  // ── Drag-to-DAW ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, layer: LayerKey) => {
    const url = blobUrls[layer];
    const filename = `${baseName}_${LAYER_STYLE[layer].label}`;
    e.dataTransfer.effectAllowed = 'copy';
    if (url) {
      // Chromium "DownloadURL" — native apps (FL Studio) pick this up on drop
      e.dataTransfer.setData('DownloadURL', `audio/midi:${filename}:${url}`);
      // Plain-text fallback for DAWs that read text/uri-list
      e.dataTransfer.setData('text/uri-list', url);
      e.dataTransfer.setData('text/plain', url);
    }
  }, [blobUrls, baseName]);

  // ── Export All ────────────────────────────────────────────────────────────
  const handleExportAll = useCallback(() => {
    if (!midiLayers) return;
    (['lead', 'chords', 'bass'] as LayerKey[]).forEach(layer => {
      const track = midiLayers[layer];
      downloadMidiBlob(track.midiData, `${baseName}_${LAYER_STYLE[layer].label}`);
    });
    onShowToast('⬇ Exported Lead · Chords · Bass MIDI stems');
  }, [midiLayers, baseName, onShowToast]);

  // ── Format time ──────────────────────────────────────────────────────────
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(2).padStart(5, '0');
    return `${m}:${sec}`;
  };

  if (!midiLayers) return null;

  const noteCount = allNotes.length;

  return (
    <div className="rounded-2xl bg-dock-card border border-dock-border shadow-panel flex flex-col gap-0 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2 border-b border-dock-border">
        <Zap className="w-3.5 h-3.5 text-neon-cyan shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink-300 flex-1">
          DAW Staging Roll
        </span>
        <span className="text-[9px] font-mono text-ink-600">
          {noteCount} notes · {totalTimeSec.toFixed(1)} s
        </span>
        {/* Layer legend */}
        <div className="flex items-center gap-2 ml-2">
          {(['lead', 'chords', 'bass'] as LayerKey[]).map(k => (
            <span key={k} className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: LAYER_STYLE[k].stroke }}
              />
              <span className="text-[9px] text-ink-500 capitalize">{k}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Piano Roll Canvas ── */}
      <div
        className="overflow-x-auto overflow-y-hidden border-b border-dock-border bg-[#0b0d11]"
        style={{ maxHeight: ROLL_CSS_HEIGHT + 2 }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="block cursor-crosshair"
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
      </div>

      {/* ── Transport ── */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        {/* Play / Stop */}
        <button
          type="button"
          onClick={() => isPlaying ? stopPlayback() : startPlayback(scrubberSec)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${
            isPlaying
              ? 'bg-neon-magenta/15 border-neon-magenta/40 text-neon-magenta'
              : 'bg-neon-cyan/8 border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/15'
          }`}
        >
          {isPlaying
            ? <><Square className="w-3 h-3 fill-current" /> Stop</>
            : <><Play  className="w-3 h-3 fill-current" /> Play</>
          }
        </button>

        {/* Reset */}
        <button
          type="button"
          onClick={() => { stopPlayback(); setScrubberSec(0); }}
          title="Reset to 0:00"
          className="p-1.5 rounded-lg border border-ink-700/60 text-ink-500 hover:text-ink-200 hover:border-ink-600 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Loop */}
        <button
          type="button"
          onClick={() => setLoop(v => !v)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
            loop
              ? 'bg-neon-amber/15 border-neon-amber/50 text-neon-amber'
              : 'border-ink-700/50 text-ink-600 hover:text-ink-300'
          }`}
        >
          ↺ Loop
        </button>

        {/* Time readout */}
        <span className="ml-auto text-[10px] font-mono text-ink-500 tabular-nums">
          {fmtTime(scrubberSec)} / {fmtTime(totalTimeSec)}
        </span>
      </div>

      {/* ── Drag-to-DAW Shelf ── */}
      <div className="px-4 py-2.5 border-t border-dock-border/50">
        <p className="text-[9px] uppercase tracking-widest text-ink-600 mb-2 flex items-center gap-1">
          <GripVertical className="w-3 h-3" />
          Drag onto FL Studio instrument track
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {(['lead', 'chords', 'bass'] as LayerKey[]).map(layer => {
            const { border, text, bg } = DRAG_BADGE_STYLE[layer];
            const { label, stroke } = LAYER_STYLE[layer];
            return (
              <div
                key={layer}
                draggable
                onDragStart={e => handleDragStart(e, layer)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${border} ${bg} cursor-grab active:cursor-grabbing select-none transition hover:brightness-125`}
                title={`Drag ${label} into FL Studio or your DAW`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: stroke }}
                />
                <span className={`text-[11px] font-bold font-mono ${text}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Action Row ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-dock-border/50">
        <button
          type="button"
          onClick={handleExportAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-ink-800/80 border border-ink-700/60 text-ink-200 hover:bg-ink-700 hover:text-ink-100 transition"
          title="Download Lead, Chords and Bass as separate .mid files"
        >
          <Download className="w-3.5 h-3.5 text-neon-cyan" />
          Export All Stems
        </button>

        <span className="text-[9px] text-ink-600 italic">
          or drag individual badges above into FL Studio
        </span>
      </div>
    </div>
  );
}
