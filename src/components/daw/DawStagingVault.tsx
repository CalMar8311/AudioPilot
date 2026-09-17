/**
 * DawStagingVault — DAW Bridge / Staged Downloads Dock
 *
 * Renders visual file cards for every transcribed MIDI stem (Lead, Chords, Bass,
 * Bundle). Each card supports:
 *   • Native Chromium drag-to-DAW via the "DownloadURL" dataTransfer type so the
 *     file lands directly in FL Studio's Channel Rack, Playlist, or any plugin
 *     window without a preliminary desktop download.
 *   • ⬇ Save to Folder  — File System Access API picker, fallback to <a download>.
 *   • 📋 Copy URL       — Copies the blob: URL to clipboard (paste into DAW that
 *     accepts URI import).
 *
 * Visual language: deep slate `#12151c`, per-stem accent colours (Cyan / Fuchsia /
 * Purple / Amber), animated pulsing drag badge, `cursor-grab` / `cursor-grabbing`.
 */

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  GripVertical, Download, Copy, Check, FolderOpen, FileMusic, Loader2,
  Music, Layers, Waves, Package, Info,
} from 'lucide-react';
import type { InstrumentLayerSplitResult } from '@/engine/audioToMidiEngine';
import type { MidiNote } from '@/utils/midiEncoder';
import { downloadMidiBlob } from '@/utils/midiEncoder';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DawStagingVaultProps {
  midiLayers: InstrumentLayerSplitResult | null;
  /** Base track name (no extension) derived from the audio filename */
  baseName: string;
  /** Detected musical key from analysis, shown on each card */
  detectedKey?: string;
  /** Detected BPM from analysis */
  bpm?: number;
  onShowToast: (msg: string) => void;
}

type StemId = 'lead' | 'chords' | 'bass' | 'bundle';

interface CardMeta {
  id: StemId;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  notes: MidiNote[];
  midiData: Uint8Array;
  /** Tailwind colour tokens for the card */
  accent: {
    border: string;
    bg: string;
    glow: string;
    text: string;
    badge: string;
    grip: string;
    actionHover: string;
    dot: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatKB(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function trackDuration(notes: MidiNote[]): number {
  if (notes.length === 0) return 0;
  return Math.max(...notes.map(n => n.startTimeSec + n.durationSec));
}

function fmtMin(sec: number): string {
  if (sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-stem accent palette
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT: Record<StemId, CardMeta['accent']> = {
  lead: {
    border:      'border-cyan-500/40',
    bg:          'bg-cyan-500/5',
    glow:        'shadow-[0_0_16px_rgba(6,182,212,0.10)]',
    text:        'text-cyan-300',
    badge:       'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300',
    grip:        'text-cyan-400/70 hover:text-cyan-300',
    actionHover: 'hover:bg-cyan-500/10 hover:text-cyan-200',
    dot:         '#06b6d4',
  },
  chords: {
    border:      'border-fuchsia-500/40',
    bg:          'bg-fuchsia-500/5',
    glow:        'shadow-[0_0_16px_rgba(217,70,239,0.10)]',
    text:        'text-fuchsia-300',
    badge:       'bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300',
    grip:        'text-fuchsia-400/70 hover:text-fuchsia-300',
    actionHover: 'hover:bg-fuchsia-500/10 hover:text-fuchsia-200',
    dot:         '#d946ef',
  },
  bass: {
    border:      'border-purple-500/40',
    bg:          'bg-purple-500/5',
    glow:        'shadow-[0_0_16px_rgba(168,85,247,0.10)]',
    text:        'text-purple-300',
    badge:       'bg-purple-500/15 border border-purple-500/30 text-purple-300',
    grip:        'text-purple-400/70 hover:text-purple-300',
    actionHover: 'hover:bg-purple-500/10 hover:text-purple-200',
    dot:         '#a855f7',
  },
  bundle: {
    border:      'border-amber-500/40',
    bg:          'bg-amber-500/5',
    glow:        'shadow-[0_0_16px_rgba(245,158,11,0.10)]',
    text:        'text-amber-300',
    badge:       'bg-amber-500/15 border border-amber-500/30 text-amber-300',
    grip:        'text-amber-400/70 hover:text-amber-300',
    actionHover: 'hover:bg-amber-500/10 hover:text-amber-200',
    dot:         '#f59e0b',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Individual card
// ─────────────────────────────────────────────────────────────────────────────

interface VaultCardProps {
  meta: CardMeta;
  filename: string;
  blobUrl: string | null;
  detectedKey?: string;
  bpm?: number;
  onSave: () => void;
  onCopy: () => void;
  onShowToast: (msg: string) => void;
}

function VaultCard({ meta, filename, blobUrl, detectedKey, bpm, onSave, onCopy, onShowToast }: VaultCardProps) {
  const [dragging, setDragging]   = useState(false);
  const [copied, setCopied]       = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const { accent }                = meta;

  const noteCount  = meta.notes.length;
  const durationS  = trackDuration(meta.notes);
  const fileSizeS  = formatKB(meta.midiData.byteLength);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!blobUrl) { e.preventDefault(); return; }
    setDragging(true);
    e.dataTransfer.effectAllowed = 'copy';
    // Chromium DownloadURL — native FL Studio / DAW apps resolve this on drop
    e.dataTransfer.setData('DownloadURL', `audio/midi:${filename}:${blobUrl}`);
    // Fallback types for DAWs that read uri-list or plain-text paths
    e.dataTransfer.setData('text/uri-list', blobUrl);
    e.dataTransfer.setData('text/plain', filename);
    onShowToast(`Drop "${filename}" into FL Studio Channel Rack, Playlist, or any plugin!`);
  };

  const handleDragEnd = () => setDragging(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleOpenFolder = async () => {
    if (typeof window.showDirectoryPicker === 'function') {
      try {
        const dir = await window.showDirectoryPicker({ mode: 'readwrite', id: 'daw-vault-folder' });
        const fh  = await dir.getFileHandle(filename, { create: true });
        const w   = await fh.createWritable();
        const copy = new Uint8Array(meta.midiData.byteLength);
        copy.set(meta.midiData);
        await w.write(copy.buffer as ArrayBuffer);
        await w.close();
        onShowToast(`Saved "${filename}" to "${dir.name}"`);
      } catch (err) {
        if ((err as DOMException)?.name !== 'AbortError') {
          // Picker denied or unavailable — fall back to download
          downloadMidiBlob(meta.midiData, filename);
          onShowToast(`Downloaded "${filename}" — drag from Downloads into the DAW.`);
        }
      }
    } else {
      // File System Access API unavailable
      downloadMidiBlob(meta.midiData, filename);
      onShowToast(`Downloaded "${filename}" — drag from Downloads into FL Studio.`);
    }
  };

  return (
    <div
      className={`
        rounded-2xl border ${accent.border} ${accent.bg} ${accent.glow}
        flex flex-col gap-0 overflow-hidden transition-all duration-200
        ${dragging ? 'ring-1 ring-white/20 scale-[1.01]' : ''}
      `}
    >
      {/* ── Card header ── */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        {/* Stem icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent.bg} border ${accent.border}`}>
          {meta.icon}
        </div>

        {/* Label + filename */}
        <div className="flex-1 min-w-0">
          <div className={`text-[12px] font-bold truncate ${accent.text}`}>
            {meta.label}
          </div>
          <div className="text-[10px] text-ink-500 font-mono truncate">
            {filename}
          </div>
        </div>

        {/* Animated drag handle */}
        <div
          draggable={!!blobUrl}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          title={blobUrl
            ? `Drag "${filename}" directly into FL Studio or your DAW`
            : 'MIDI is preparing…'}
          className={`
            flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg
            border ${accent.border} ${accent.bg}
            transition-all select-none
            ${blobUrl
              ? `${accent.grip} cursor-grab active:cursor-grabbing hover:brightness-125 ${dragging ? 'animate-pulse' : ''}`
              : 'opacity-30 cursor-not-allowed'}
          `}
        >
          <GripVertical className="w-3.5 h-3.5" />
          <span className="text-[8px] font-bold uppercase tracking-wide leading-none">
            {dragging ? 'Drop!' : 'Drag'}
          </span>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
        {/* Note count */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${accent.badge}`}>
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: accent.dot }}
          />
          {noteCount} notes
        </span>

        {/* Duration */}
        {durationS > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-ink-800/60 border border-ink-700/40 text-ink-400">
            {fmtMin(durationS)}
          </span>
        )}

        {/* File size */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-ink-800/60 border border-ink-700/40 text-ink-400">
          {fileSizeS}
        </span>

        {/* Detected key */}
        {detectedKey && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-neon-cyan/8 border border-neon-cyan/25 text-neon-cyan/80">
            {detectedKey}
          </span>
        )}

        {/* BPM */}
        {bpm && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-ink-800/60 border border-ink-700/40 text-ink-400">
            {bpm} BPM
          </span>
        )}
      </div>

      {/* ── Drag hint ── */}
      <div className="mx-3 mb-2 px-2 py-1.5 rounded-lg bg-ink-950/60 border border-ink-800/60 flex items-center gap-1.5">
        <Info className="w-3 h-3 text-ink-600 shrink-0" />
        <span className="text-[9px] text-ink-600 leading-snug">
          Drag directly into <strong className="text-ink-400">FL Studio Channel Rack</strong>, Playlist, Serum, Vital or any DAW.
        </span>
      </div>

      {/* ── Quick actions ── */}
      <div className="flex items-stretch border-t border-ink-800/60 divide-x divide-ink-800/60">
        {/* Save to folder */}
        <button
          type="button"
          onClick={() => { void handleSave(); }}
          disabled={isSaving}
          title="Save MIDI to a folder via File System Access API, or download"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium text-ink-400 ${accent.actionHover} transition-colors disabled:opacity-50`}
        >
          {isSaving
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Download className="w-3 h-3" />
          }
          <span>{isSaving ? 'Saving…' : 'Save'}</span>
        </button>

        {/* Open / Save in Staging Folder */}
        <button
          type="button"
          onClick={() => { void handleOpenFolder(); }}
          title="Pick a folder and save directly to it (File System Access API)"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium text-ink-400 ${accent.actionHover} transition-colors`}
        >
          <FolderOpen className="w-3 h-3" />
          <span>Folder</span>
        </button>

        {/* Copy blob URL */}
        <button
          type="button"
          onClick={() => { void handleCopy(); }}
          title="Copy blob URL to clipboard"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium text-ink-400 ${accent.actionHover} transition-colors`}
        >
          {copied
            ? <Check className="w-3 h-3 text-neon-emerald" />
            : <Copy className="w-3 h-3" />
          }
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function DawStagingVault({
  midiLayers,
  baseName,
  detectedKey,
  bpm,
  onShowToast,
}: DawStagingVaultProps) {
  // ── Blob URLs (created once per midiLayers change, revoked on cleanup) ───
  type BlobMap = Record<StemId, string | null>;
  const [blobUrls, setBlobUrls] = useState<BlobMap>({ lead: null, chords: null, bass: null, bundle: null });

  useEffect(() => {
    if (!midiLayers) {
      setBlobUrls({ lead: null, chords: null, bass: null, bundle: null });
      return;
    }
    const make = (d: Uint8Array): string => {
      const copy = new Uint8Array(d.byteLength);
      copy.set(d);
      return URL.createObjectURL(new Blob([copy.buffer as ArrayBuffer], { type: 'audio/midi' }));
    };
    const urls: BlobMap = {
      lead:   make(midiLayers.lead.midiData),
      chords: make(midiLayers.chords.midiData),
      bass:   make(midiLayers.bass.midiData),
      bundle: make(midiLayers.bundleMidiData),
    };
    setBlobUrls(urls);
    return () => {
      (Object.values(urls) as (string | null)[]).forEach(u => u && URL.revokeObjectURL(u));
    };
  }, [midiLayers]);

  // ── Bundle note array (union of all stems for stats display) ─────────────
  const allNotes = useMemo(() => {
    if (!midiLayers) return [];
    return [...midiLayers.lead.notes, ...midiLayers.chords.notes, ...midiLayers.bass.notes];
  }, [midiLayers]);

  // ── Card metadata ─────────────────────────────────────────────────────────
  const cards = useMemo<CardMeta[]>(() => {
    if (!midiLayers) return [];
    return [
      {
        id:       'lead',
        label:    'Lead / Melody',
        subtitle: 'Monophonic top-line, synth lead & vocal register',
        icon:     <Music className="w-4 h-4 text-cyan-400" />,
        notes:    midiLayers.lead.notes,
        midiData: midiLayers.lead.midiData,
        accent:   ACCENT.lead,
      },
      {
        id:       'chords',
        label:    'Chords / Mid',
        subtitle: 'Polyphonic harmonic mid-register clusters',
        icon:     <Layers className="w-4 h-4 text-fuchsia-400" />,
        notes:    midiLayers.chords.notes,
        midiData: midiLayers.chords.midiData,
        accent:   ACCENT.chords,
      },
      {
        id:       'bass',
        label:    'Bass',
        subtitle: 'Sub-bass roots & octave foundations (≤ C3)',
        icon:     <Waves className="w-4 h-4 text-purple-400" />,
        notes:    midiLayers.bass.notes,
        midiData: midiLayers.bass.midiData,
        accent:   ACCENT.bass,
      },
      {
        id:       'bundle',
        label:    'Full Stem Bundle',
        subtitle: 'Lead + Chords + Bass in one FL Studio Format-1 .mid',
        icon:     <Package className="w-4 h-4 text-amber-400" />,
        notes:    allNotes,
        midiData: midiLayers.bundleMidiData,
        accent:   ACCENT.bundle,
      },
    ];
  }, [midiLayers, allNotes]);

  // ── Save / Copy handlers ──────────────────────────────────────────────────
  const saveRef = useRef({ midiLayers, baseName });
  saveRef.current = { midiLayers, baseName };

  const makeSaveHandler = (meta: CardMeta, filename: string) => async () => {
    const midiData = meta.midiData;
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const fh = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'MIDI File', accept: { 'audio/midi': ['.mid'] } }],
        });
        const copy = new Uint8Array(midiData.byteLength);
        copy.set(midiData);
        const w = await fh.createWritable();
        await w.write(copy.buffer as ArrayBuffer);
        await w.close();
        onShowToast(`Saved "${filename}" — drag from folder into your DAW.`);
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
        // Fall through to download
      }
    }
    downloadMidiBlob(midiData, filename);
    onShowToast(`Downloaded "${filename}" — drag from Downloads into FL Studio.`);
  };

  const makeCopyHandler = (id: StemId, filename: string) => async () => {
    const url = blobUrls[id];
    try {
      await navigator.clipboard.writeText(url ?? filename);
      onShowToast(`Copied "${filename}" blob URL to clipboard.`);
    } catch {
      onShowToast(`Copy unavailable — use the Save button instead.`);
    }
  };

  // ── Total stats ───────────────────────────────────────────────────────────
  const totalNotes    = allNotes.length;
  const totalDuration = trackDuration(allNotes);

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (!midiLayers) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-neon-cyan/8 border border-neon-cyan/20 flex items-center justify-center">
          <FileMusic className="w-7 h-7 text-neon-cyan/40" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-ink-300">DAW Staging Vault</p>
          <p className="text-[11px] text-ink-500 mt-1 leading-relaxed">
            Run <span className="text-neon-cyan">MIDI Transcription</span> in the<br />
            Production Deck to stage Lead,<br />
            Chords &amp; Bass files here.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-700/50 bg-ink-900/60">
          <GripVertical className="w-3.5 h-3.5 text-ink-600" />
          <span className="text-[10px] text-ink-600">Files ready for drag-to-DAW</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Vault header strip */}
      <div className="flex items-center gap-2 pb-1">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">
            {totalNotes} notes
          </span>
          <span className="text-ink-700">·</span>
          <span className="text-[10px] text-ink-500 font-mono">
            {fmtMin(totalDuration)}
          </span>
          {detectedKey && (
            <>
              <span className="text-ink-700">·</span>
              <span className="text-[10px] text-neon-cyan/70">{detectedKey}</span>
            </>
          )}
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-neon-cyan/8 border border-neon-cyan/20 text-neon-cyan/60 font-mono">
          {cards.length} stems
        </span>
      </div>

      {/* Cards */}
      {cards.map(meta => {
        const filename = `${baseName}_${meta.label.replace(/[^a-z0-9]+/gi, '_')}.mid`;
        return (
          <VaultCard
            key={meta.id}
            meta={meta}
            filename={filename}
            blobUrl={blobUrls[meta.id]}
            detectedKey={detectedKey}
            bpm={meta.id === 'bundle' ? bpm : undefined}
            onSave={makeSaveHandler(meta, filename)}
            onCopy={makeCopyHandler(meta.id, filename)}
            onShowToast={onShowToast}
          />
        );
      })}

      {/* Global drag tip */}
      <div className="flex items-start gap-2 mt-1 px-3 py-2.5 rounded-xl bg-ink-950/70 border border-ink-800/50">
        <GripVertical className="w-3.5 h-3.5 text-ink-600 shrink-0 mt-0.5" />
        <p className="text-[9px] text-ink-500 leading-relaxed">
          <strong className="text-ink-400">Drag any card's grip</strong> directly from the browser onto
          FL Studio's Channel Rack, Playlist, Serum, Vital, or any VST plugin window.
          No download step required. Works in Chromium-based browsers.
        </p>
      </div>
    </div>
  );
}
