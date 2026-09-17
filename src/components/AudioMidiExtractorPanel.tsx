import { useEffect, useMemo, useState, type DragEvent } from 'react';
import {
  Download, Copy, Check, Activity, Music, Play, FolderDown, Info, Layers, Clock, RefreshCw, Wand2,
  FileCode, GripVertical, Save, Guitar, Piano, Waves, HardDriveDownload,
} from 'lucide-react';
import type { AudioAnalysisResult } from '@/services/geminiAudio';
import {
  STEM_OPTIONS, TIME_SEGMENT_OPTIONS, StemType, TimeSegment,
  transcribeAudioToMidi, transcribeAllStemsToMultiTrackMidi, TranscriptionResult,
  splitTranscriptionIntoInstrumentLayers, InstrumentLayerSplitResult,
  TranscriptionTimeoutError,
} from '@/engine/audioToMidiEngine';
import { downloadMidiBlob, MidiNote } from '@/utils/midiEncoder';
import { uploadMidiForDragDrop } from '@/services/midiDragDropEngine';

interface AudioMidiExtractorPanelProps {
  audioFile: File | null;
  analysis: AudioAnalysisResult | null;
  onShowToast: (msg: string) => void;
  onInjectLyricTag?: (tag: string) => void;
}

function playMidiNotesPreview(notes: MidiNote[]) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    notes.slice(0, 24).forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = 440 * Math.pow(2, (n.midiNumber - 69) / 12);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + n.startTimeSec);

      const start = now + n.startTimeSec;
      const dur = Math.min(n.durationSec, 1.2);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  } catch {
    // Audio Context playback ignored
  }
}

export function AudioMidiExtractorPanel({
  audioFile,
  analysis,
  onShowToast,
  onInjectLyricTag,
}: AudioMidiExtractorPanelProps) {
  const [selectedStem, setSelectedStem] = useState<StemType>('keys');
  const [selectedSegment, setSelectedSegment] = useState<TimeSegment>('full');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [copiedSeq, setCopiedSeq] = useState(false);
  const [showFlGuide, setShowFlGuide] = useState(false);
  const [midiBlobUrl, setMidiBlobUrl] = useState<string | null>(null);
  const [midiHttpUrl, setMidiHttpUrl] = useState<string | null>(null);
  const [isSavingMidi, setIsSavingMidi] = useState(false);
  const [isSavingAllToDaw, setIsSavingAllToDaw] = useState(false);

  // Rebuild an `audio/midi` Blob + object URL for the active transcription so it can be
  // dragged directly into a DAW instead of forcing a file download. Revoked whenever the
  // transcription changes or the component unmounts.
  //
  // We also opportunistically upload the same bytes to the local AudioPilot engine to get
  // back a real absolute HTTP URL. Chromium's OS-level "DownloadURL" drag can be flaky with
  // browser-internal `blob:` URIs once the drop target is a native app (e.g. FL Studio) —
  // an `http://127.0.0.1:8000/...` URL is far more reliably resolved outside the browser.
  // If the engine is offline or the endpoint is unavailable, this silently no-ops and the
  // `blob:` URL below remains the drag fallback.
  useEffect(() => {
    if (!transcription) {
      setMidiBlobUrl(null);
      setMidiHttpUrl(null);
      return;
    }

    const blob = new Blob([transcription.midiData.buffer as ArrayBuffer], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    setMidiBlobUrl(url);
    setMidiHttpUrl(null);

    let cancelled = false;
    const baseName = audioFile?.name.replace(/\.[^/.]+$/, '') || 'ReferenceTrack';
    const fileName = `${baseName}_${transcription.stem}_Extracted.mid`;

    uploadMidiForDragDrop(transcription.midiData, fileName)
      .then((httpUrl) => {
        if (!cancelled) setMidiHttpUrl(httpUrl);
      })
      .catch(() => {
        // Local engine offline / endpoint unavailable — blob: URL fallback stays active.
      });

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [transcription]); // eslint-disable-line react-hooks/exhaustive-deps

  // Parse the transcribed polyphonic MIDI notes into Lead / Chords / Bass instrument layers by
  // pitch register & onset polyphony — runs directly on the note buffer, no separated audio
  // stems or backend involved.
  const instrumentLayers: InstrumentLayerSplitResult | null = useMemo(() => {
    if (!transcription) return null;
    return splitTranscriptionIntoInstrumentLayers(transcription);
  }, [transcription]);

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    try {
      await new Promise(r => setTimeout(r, 350));
      // Runs transcription directly on the uploaded audio file/buffer — no stem-separation
      // backend involved. Long tracks are auto-sliced and the whole pass is raced against
      // a 25s deadline inside transcribeAudioToMidi — see its doc comment for details.
      const res = await transcribeAudioToMidi({
        stem: selectedStem,
        timeSegment: selectedSegment,
        audioFile,
        analysis,
        bpm: analysis?.detectedBpm || 120,
        key: analysis?.detectedKey || 'F# Minor',
      });
      setTranscription(res);
      if (res.autoSliced) {
        onShowToast(`Track exceeds 30s — auto-sliced to the first ${Math.round(res.effectiveDurationSec)}s to prevent memory exhaustion.`);
      }
      onShowToast(`Extracted ${res.notes.length} polyphonic MIDI note events for ${res.stemLabel}!`);
    } catch (err) {
      if (err instanceof TranscriptionTimeoutError) {
        onShowToast('⏱ Transcription timed out. Please try a shorter audio loop or lower resolution.');
      } else {
        onShowToast('Error transcribing audio to MIDI');
      }
    } finally {
      // Guaranteed to run even on timeout/abort/network failure — the UI
      // never gets stuck on "Analyzing…" indefinitely.
      setIsTranscribing(false);
    }
  };

  const handleDownloadMultiTrackBundle = async () => {
    setIsTranscribing(true);
    try {
      const res = await transcribeAllStemsToMultiTrackMidi(audioFile, analysis);
      const filename = `${res.projectName}_FL_Studio_MultiTrack_Bundle.mid`;
      downloadMidiBlob(res.midiData, filename);
      if (res.autoSliced) {
        onShowToast(`Track exceeds 30s — auto-sliced to the first ${Math.round(res.effectiveDurationSec)}s to prevent memory exhaustion.`);
      }
      onShowToast(`Exported ${res.tracksCount} stems (${res.totalNotesCount} notes) as FL Studio Multi-Track Bundle!`);
    } catch (err) {
      if (err instanceof TranscriptionTimeoutError) {
        onShowToast('⏱ Transcription timed out. Please try a shorter audio loop or lower resolution.');
      } else {
        onShowToast('Error exporting FL Studio Multi-Track Bundle');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDownloadMidi = () => {
    if (!transcription) return;
    const baseName = audioFile?.name.replace(/\.[^/.]+$/, '') || 'ReferenceTrack';
    const filename = `${baseName}_${transcription.stem}_Extracted.mid`;
    downloadMidiBlob(transcription.midiData, filename);
    onShowToast(`Downloaded ${filename} for FL Studio Piano Roll!`);
  };

  // Stable base name for the active transcription, reused for the download filename,
  // the drag-to-DAW payload, the instrument-layer exports, and the Save-to-folder fallback.
  const stemName = transcription
    ? `${(audioFile?.name.replace(/\.[^/.]+$/, '') || 'ReferenceTrack')}_${transcription.stem}_Extracted`
    : null;

  const handleMidiDragStart = (e: DragEvent<HTMLButtonElement>) => {
    // Prefer a real absolute HTTP URL from the local engine when we have one — it resolves
    // reliably outside the browser process. Fall back to the blob: object URL otherwise.
    const downloadUrl = midiHttpUrl || midiBlobUrl;
    if (!downloadUrl) {
      e.preventDefault();
      onShowToast('MIDI is still preparing — try the drag again in a moment.');
      return;
    }
    const fileName = `${stemName || 'extracted_melody'}.mid`;
    // Exact Chromium-recognized synthetic MIME string for native OS drag-and-drop.
    const payload = `audio/midi:${fileName}:${downloadUrl}`;
    e.dataTransfer.setData('DownloadURL', payload);
    // Fallback types some DAWs / drop targets read instead of DownloadURL.
    e.dataTransfer.setData('text/plain', fileName);
    e.dataTransfer.effectAllowed = 'copy';
    onShowToast('Drop the MIDI onto your DAW window to import it directly!');
  };

  const handleSaveMidiToFolder = async () => {
    if (!transcription) return;
    const fileName = `${stemName || 'extracted_melody'}.mid`;

    if (typeof window.showSaveFilePicker === 'function') {
      setIsSavingMidi(true);
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'MIDI File', accept: { 'audio/midi': ['.mid'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(transcription.midiData.buffer as ArrayBuffer);
        await writable.close();
        onShowToast(`Saved ${fileName} — drag it from your file explorer if in-browser drag is blocked.`);
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return; // User cancelled the picker.
        // Fall through to a direct download below (e.g. permission/UAC denied the save).
      } finally {
        setIsSavingMidi(false);
      }
    }

    downloadMidiBlob(transcription.midiData, fileName);
    onShowToast(`Downloaded ${fileName} — drag it from your Downloads folder into the DAW.`);
  };

  const handleExportLayer = (layer: 'lead' | 'chords' | 'bass') => {
    if (!instrumentLayers) return;
    const track = instrumentLayers[layer];
    const filename = `${stemName || 'extracted_melody'}_${track.label.replace(/[^a-z0-9]+/gi, '')}.mid`;
    downloadMidiBlob(track.midiData, filename);
    onShowToast(`Downloaded ${track.label} layer (${track.notes.length} notes) as ${filename}!`);
  };

  const handleExportLayerBundle = () => {
    if (!instrumentLayers) return;
    const filename = `${stemName || 'extracted_melody'}_MultiTrack_Bundle.mid`;
    downloadMidiBlob(instrumentLayers.bundleMidiData, filename);
    onShowToast(`Downloaded Lead + Chords + Bass multi-track bundle as ${filename}!`);
  };

  // 1-click export of every split instrument layer (Lead, Chords, Bass, Bundle) straight into
  // a DAW staging folder — via the File System Access API when available, or a sequenced
  // batch download otherwise, so all 4 files land somewhere FL Studio's file browser can see.
  const handleSaveAllToDawStagingFolder = async () => {
    if (!transcription || !instrumentLayers) return;

    const files: { name: string; data: Uint8Array }[] = [
      { name: `${stemName}_Lead.mid`, data: instrumentLayers.lead.midiData },
      { name: `${stemName}_Chords.mid`, data: instrumentLayers.chords.midiData },
      { name: `${stemName}_Bass.mid`, data: instrumentLayers.bass.midiData },
      { name: `${stemName}_MultiTrack_Bundle.mid`, data: instrumentLayers.bundleMidiData },
    ];

    setIsSavingAllToDaw(true);
    try {
      if (typeof window.showDirectoryPicker === 'function') {
        try {
          const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'daw-staging-folder' });
          for (const file of files) {
            const fileHandle = await dirHandle.getFileHandle(file.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(file.data.buffer as ArrayBuffer);
            await writable.close();
          }
          onShowToast(`Saved ${files.length} MIDI layer files to "${dirHandle.name}" — ready in FL Studio's file browser!`);
          return;
        } catch (err) {
          if ((err as DOMException)?.name === 'AbortError') return; // User cancelled the picker.
          // Fall through to a batch download below (e.g. permission denied).
        }
      }

      // Fallback: trigger a direct download for every layer, staggered slightly so the
      // browser doesn't block "multiple simultaneous downloads" as a popup-like action.
      files.forEach((file, i) => {
        setTimeout(() => downloadMidiBlob(file.data, file.name), i * 200);
      });
      onShowToast(`Downloading ${files.length} MIDI layer files — drag them into FL Studio's browser.`);
    } finally {
      setIsSavingAllToDaw(false);
    }
  };

  const handleCopySequence = async () => {
    if (!transcription) return;
    try {
      await navigator.clipboard.writeText(transcription.noteSequenceString);
      setCopiedSeq(true);
      setTimeout(() => setCopiedSeq(false), 2000);
      onShowToast('Copied MIDI note sequence to clipboard!');
    } catch {
      onShowToast(`Sequence: ${transcription.noteSequenceString}`);
    }
  };

  const handleInjectTag = () => {
    if (!transcription) return;
    const tag = `[MIDI Sequence: ${transcription.noteSequenceString}]`;
    if (onInjectLyricTag) {
      onInjectLyricTag(tag);
      onShowToast(`Injected ${tag} into Lyric Canvas!`);
    }
  };

  return (
    <div className="glass-soft bg-ink-900/90 rounded-xl p-4 border border-neon-cyan/40 shadow-xl space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-ink-700/50 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-ink-100 uppercase tracking-wider">
                Extract Instrument MIDI
              </h4>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/40 font-bold">
                FL Studio Workflow Ready
              </span>
            </div>
            <p className="text-[10px] text-ink-400">
              Transcribes polyphonic chords, basslines &amp; melodies directly from your audio file into standard .MID files for FL Studio Piano Roll
            </p>
          </div>
        </div>
      </div>

      {/* 1. Instrument Stem Selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-ink-300 uppercase tracking-wider flex items-center gap-1">
          <Layers className="w-3 h-3 text-neon-cyan" /> Select Instrument Stem Layer
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {STEM_OPTIONS.map((stem) => {
            const isSel = selectedStem === stem.id;
            return (
              <button
                key={stem.id}
                type="button"
                onClick={() => setSelectedStem(stem.id)}
                className={`p-2 rounded-lg border text-left transition flex flex-col justify-between min-h-[64px] ${
                  isSel
                    ? 'bg-neon-cyan/15 border-neon-cyan text-neon-cyan ring-1 ring-neon-cyan/40'
                    : 'bg-ink-950/60 border-ink-700/60 hover:border-neon-cyan/40 text-ink-300 hover:text-ink-100'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-base">{stem.icon}</span>
                  {isSel && <Check className="w-3.5 h-3.5 text-neon-cyan" />}
                </div>
                <span className="text-[11px] font-bold block truncate mt-1">{stem.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Time Segment Selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-ink-300 uppercase tracking-wider flex items-center gap-1">
          <Clock className="w-3 h-3 text-neon-amber" /> Time Segment / Timestamp
        </label>

        <div className="flex flex-wrap gap-1.5">
          {TIME_SEGMENT_OPTIONS.map((seg) => {
            const isSel = selectedSegment === seg.id;
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => setSelectedSegment(seg.id)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition ${
                  isSel
                    ? 'bg-neon-amber/20 text-neon-amber border-neon-amber/50 font-bold'
                    : 'bg-ink-950/60 text-ink-300 border-ink-700/50 hover:text-ink-100'
                }`}
              >
                {seg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transcribe Button */}
      <button
        type="button"
        onClick={handleTranscribe}
        disabled={isTranscribing}
        className="w-full btn btn-primary !py-2 !text-xs font-bold flex items-center justify-center gap-2 shadow-lg"
      >
        {isTranscribing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            <span>Analyzing Polyphonic Frequencies &amp; Extracting MIDI Events...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            <span>Transcribe Polyphonic MIDI ({STEM_OPTIONS.find(s => s.id === selectedStem)?.label})</span>
          </>
        )}
      </button>

      {/* Transcription Results & Export Options */}
      {transcription && (
        <div className="bg-ink-950/90 rounded-lg p-3 border border-neon-cyan/30 space-y-3 pt-3">
          {/* Header Summary */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-neon-cyan" />
              <span className="text-xs font-bold text-ink-100">
                Extracted MIDI Result ({transcription.notes.length} Notes)
              </span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
              {transcription.stemLabel} • {transcription.timeSegmentLabel}
            </span>
          </div>

          {/* Note Sequence Pill Cloud */}
          <div className="bg-ink-900/80 rounded-md p-2.5 border border-ink-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold uppercase text-ink-400 block">Detected Note Sequence</span>
              <button
                type="button"
                onClick={() => playMidiNotesPreview(transcription.notes)}
                className="px-2 py-0.5 rounded bg-neon-cyan/15 hover:bg-neon-cyan/30 text-neon-cyan text-[10px] font-bold border border-neon-cyan/40 flex items-center gap-1 transition"
                title="Audition synthesized preview notes in browser"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Audition Notes</span>
              </button>
            </div>
            <p className="text-xs font-mono font-bold text-neon-cyan break-words">
              {transcription.noteSequenceString}
            </p>
          </div>

          {/* Mini Piano Roll Table Preview */}
          <div className="max-h-36 overflow-auto border border-ink-800 rounded bg-ink-950/60 p-1.5">
            <div className="grid grid-cols-4 gap-1 text-[9px] font-mono font-bold text-ink-400 border-b border-ink-800 pb-1 mb-1 px-1">
              <span>Note</span>
              <span>MIDI #</span>
              <span>Duration</span>
              <span>Velocity</span>
            </div>
            <div className="space-y-0.5">
              {transcription.notes.slice(0, 16).map((n, i) => (
                <div key={i} className="grid grid-cols-4 gap-1 text-[10px] font-mono text-ink-200 hover:bg-ink-800/50 px-1 py-0.5 rounded">
                  <span className="font-bold text-neon-cyan">{n.noteName}</span>
                  <span className="text-ink-400">{n.midiNumber}</span>
                  <span className="text-ink-400">{n.durationSec.toFixed(2)}s</span>
                  <span className="text-neon-amber">{n.velocity}</span>
                </div>
              ))}
              {transcription.notes.length > 16 && (
                <p className="text-[9px] text-ink-500 italic text-center pt-1">
                  ...and {transcription.notes.length - 16} more MIDI note events in full track export
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons for FL Studio & DAW Workflow */}
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleDownloadMidi}
                className="flex-1 min-w-[140px] btn bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold !py-1.5 !px-2.5 !text-[11px] flex items-center justify-center gap-1.5 rounded-lg shadow-md"
                title="Download single stem .MID file for FL Studio Piano Roll"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Stem .MID (FL Studio)</span>
              </button>

              <button
                type="button"
                draggable={true}
                onDragStart={handleMidiDragStart}
                disabled={!midiBlobUrl && !midiHttpUrl}
                className="shrink-0 btn bg-ink-900 hover:bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan font-bold !py-1.5 !px-2.5 !text-[11px] flex items-center justify-center gap-1 rounded-lg cursor-grab active:cursor-grabbing select-none disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  midiHttpUrl
                    ? 'Drag this MIDI clip directly into your DAW (FL Studio, Ableton, Logic) via the local engine URL'
                    : 'Drag this MIDI clip directly into your DAW (FL Studio, Ableton, Logic) — no download needed'
                }
              >
                <GripVertical className="w-3.5 h-3.5" />
                <span>Drag MIDI to DAW</span>
              </button>

              <button
                type="button"
                onClick={() => { void handleSaveMidiToFolder(); }}
                disabled={isSavingMidi}
                className="shrink-0 btn btn-ghost !py-1.5 !px-2.5 !text-[11px] border border-ink-700/70 hover:border-neon-emerald/60 text-ink-200 hover:text-neon-emerald flex items-center justify-center gap-1.5 disabled:opacity-60"
                title="Fallback if drag-and-drop is blocked by Windows privilege isolation / UAC — saves the .MID directly"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingMidi ? 'Saving…' : 'Save to Project / Temp Folder'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadMultiTrackBundle}
              className="w-full btn bg-gradient-to-r from-neon-amber to-orange-400 text-slate-950 font-extrabold !py-1.5 !px-2.5 !text-[11px] flex items-center justify-center gap-1.5 rounded-lg shadow-glow"
              title="Download multi-track bundle (Keys, Bass, Lead, Strings, Drums + Section Markers) for FL Studio"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>All Stems FL Bundle (.MID)</span>
            </button>
          </div>

          {/* Split Extracted MIDI by Instrument Layer — pure pitch-register / polyphony
              parsing of the notes above, no separated audio stems involved. */}
          {instrumentLayers && (
            <div className="bg-ink-900/70 rounded-lg p-3 border border-neon-magenta/30 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-ink-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-neon-magenta" /> Split MIDI by Instrument Layer
                </span>
                <span className="text-[9px] text-ink-500 font-mono">Register + Polyphony Parsed</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleExportLayer('lead')}
                  disabled={instrumentLayers.lead.notes.length === 0}
                  className="btn btn-ghost !py-1.5 !px-2 !text-[10.5px] border border-ink-700/70 hover:border-neon-cyan/60 text-ink-200 hover:text-neon-cyan flex flex-col items-center gap-0.5 disabled:opacity-40"
                  title="Export the monophonic top-line (mid-high register) as Lead.mid"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <Guitar className="w-3.5 h-3.5" /> Export Lead.mid
                  </span>
                  <span className="text-[9px] text-ink-500 font-mono">{instrumentLayers.lead.notes.length} notes</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportLayer('chords')}
                  disabled={instrumentLayers.chords.notes.length === 0}
                  className="btn btn-ghost !py-1.5 !px-2 !text-[10.5px] border border-ink-700/70 hover:border-neon-magenta/60 text-ink-200 hover:text-neon-magenta flex flex-col items-center gap-0.5 disabled:opacity-40"
                  title="Export the C3–C6 polyphonic chord clusters as Chords.mid"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <Piano className="w-3.5 h-3.5" /> Export Chords.mid
                  </span>
                  <span className="text-[9px] text-ink-500 font-mono">{instrumentLayers.chords.notes.length} notes</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportLayer('bass')}
                  disabled={instrumentLayers.bass.notes.length === 0}
                  className="btn btn-ghost !py-1.5 !px-2 !text-[10.5px] border border-ink-700/70 hover:border-neon-amber/60 text-ink-200 hover:text-neon-amber flex flex-col items-center gap-0.5 disabled:opacity-40"
                  title="Export every sub-C3 root note as Bass.mid"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <Waves className="w-3.5 h-3.5" /> Export Bass.mid
                  </span>
                  <span className="text-[9px] text-ink-500 font-mono">{instrumentLayers.bass.notes.length} notes</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportLayerBundle}
                className="w-full btn bg-gradient-to-r from-neon-magenta to-neon-cyan text-slate-950 font-extrabold !py-1.5 !px-2.5 !text-[11px] flex items-center justify-center gap-1.5 rounded-lg shadow-glow"
                title="Export Lead + Chords + Bass as one 3-track multi-track bundle"
              >
                <FolderDown className="w-3.5 h-3.5" />
                <span>Export Multi-Track Bundle.mid</span>
              </button>

              {/* Streamline Export to DAW: 1-click batch save of all 4 split files */}
              <button
                type="button"
                onClick={() => { void handleSaveAllToDawStagingFolder(); }}
                disabled={isSavingAllToDaw}
                className="w-full btn btn-primary !py-2 !text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                title="Save Lead.mid, Chords.mid, Bass.mid & the bundle straight into a DAW staging folder"
              >
                {isSavingAllToDaw ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <HardDriveDownload className="w-4 h-4" />
                )}
                <span>{isSavingAllToDaw ? 'Saving All Layers…' : 'Save All to DAW Staging Folder'}</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopySequence}
              className="btn btn-ghost !py-1.5 !px-2.5 !text-[11px] border border-ink-700/70 hover:border-neon-cyan text-ink-200 hover:text-neon-cyan flex items-center justify-center gap-1.5"
              title="Copy MIDI Note sequence to clipboard"
            >
              {copiedSeq ? <Check className="w-3.5 h-3.5 text-neon-emerald" /> : <Copy className="w-3.5 h-3.5 text-neon-cyan" />}
              <span>{copiedSeq ? 'Sequence Copied!' : 'Copy Sequence'}</span>
            </button>

            <button
              type="button"
              onClick={handleInjectTag}
              className="btn btn-ghost !py-1.5 !px-2.5 !text-[11px] border border-neon-cyan/40 hover:bg-neon-cyan/10 text-neon-cyan flex items-center justify-center gap-1.5 font-mono"
              title="Inject [MIDI Sequence] tag into lyric canvas"
            >
              <Music className="w-3.5 h-3.5 text-neon-cyan" />
              <span>Inject to Lyrics</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFlGuide(g => !g)}
              className="btn btn-ghost !py-1.5 !px-2.5 !text-[11px] border border-ink-700 hover:border-orange-400 text-ink-300 hover:text-orange-400 flex items-center justify-center gap-1.5"
              title="FL Studio import guide"
            >
              <Info className="w-3.5 h-3.5 text-orange-400" />
              <span>FL Studio Tips</span>
            </button>
          </div>

          {/* FL Studio Drag-and-Drop Workflow Guide Drawer */}
          {showFlGuide && (
            <div className="bg-ink-900/95 rounded-lg p-3 border border-orange-500/40 text-[11px] text-ink-300 space-y-2 animate-fadeIn">
              <h5 className="font-bold text-orange-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> How to Import into FL Studio:
              </h5>
              <ol className="list-decimal list-inside space-y-1 text-ink-200">
                <li>Drag the downloaded <strong className="text-orange-300">.MID</strong> file directly into FL Studio's <strong>Channel Rack</strong> or <strong>Piano Roll</strong>.</li>
                <li>When importing multi-track bundles, select <strong>"Start new project"</strong> or <strong>"Import channels"</strong> to automatically create separate generator instruments for Keys, Bass, Lead, Strings, and Drums.</li>
                <li>Tempo and section markers ([Intro], [Verse], [Chorus]) will automatically align to FL Studio's timeline grid.</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
