import { useEffect, useState } from 'react';
import { Download, Copy, Check, Activity, Music, Play, FolderDown, Info, Layers, Clock, RefreshCw, Wand2, FileCode, Volume2 } from 'lucide-react';
import type { AudioAnalysisResult } from '@/services/geminiAudio';
import {
  STEM_OPTIONS, TIME_SEGMENT_OPTIONS, StemType, TimeSegment,
  transcribeAudioToMidi, transcribeAllStemsToMultiTrackMidi, TranscriptionResult
} from '@/engine/audioToMidiEngine';
import { downloadMidiBlob, MidiNote } from '@/utils/midiEncoder';
import { StemPreviewRow, type StemPreviewTrack } from '@/components/audio/StemPreviewRow';
import {
  ENGINE_OFFLINE_MESSAGE,
  separateStems,
  type SeparatedStemUrls,
} from '@/services/stemSeparation';

const STEM_DISPLAY: { id: keyof SeparatedStemUrls; name: string }[] = [
  { id: 'vocals', name: 'Vocals' },
  { id: 'drums', name: 'Drums' },
  { id: 'bass', name: 'Bass' },
  { id: 'other', name: 'Instruments' },
];

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
  const [isSeparating, setIsSeparating] = useState(false);
  const [separateError, setSeparateError] = useState<string | null>(null);
  const [previewStems, setPreviewStems] = useState<StemPreviewTrack[]>([]);

  // POST audio to local Demucs engine and map returned stem URLs into StemPreviewRow
  useEffect(() => {
    if (!audioFile) {
      setPreviewStems([]);
      setSeparateError(null);
      setIsSeparating(false);
      return;
    }

    let cancelled = false;

    const runSeparation = async () => {
      setIsSeparating(true);
      setSeparateError(null);
      setPreviewStems([]);

      try {
        const urls = await separateStems(audioFile);
        if (cancelled) return;

        setPreviewStems(
          STEM_DISPLAY.map(({ id, name }) => ({
            id,
            name,
            audioUrl: urls[id],
          }))
        );
        onShowToast('Stem separation complete — Vocals, Drums, Bass & Instruments ready');
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : ENGINE_OFFLINE_MESSAGE;
        // Network / offline failures always use the canonical offline message
        const isOffline =
          message === ENGINE_OFFLINE_MESSAGE ||
          /Failed to fetch|NetworkError|ECONNREFUSED|fetch/i.test(message);
        const userMessage = isOffline ? ENGINE_OFFLINE_MESSAGE : message;
        setSeparateError(userMessage);
        onShowToast(userMessage);
      } finally {
        if (!cancelled) setIsSeparating(false);
      }
    };

    void runSeparation();

    return () => {
      cancelled = true;
    };
  }, [audioFile, onShowToast]);

  const handleDownloadStemPreview = (stem: StemPreviewTrack) => {
    const a = document.createElement('a');
    a.href = stem.audioUrl;
    a.download = `${stem.name.toLowerCase()}.wav`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    onShowToast(`Downloading ${stem.name} stem…`);
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    try {
      await new Promise(r => setTimeout(r, 350));
      const res = await transcribeAudioToMidi({
        stem: selectedStem,
        timeSegment: selectedSegment,
        audioFile,
        analysis,
        bpm: analysis?.detectedBpm || 120,
        key: analysis?.detectedKey || 'F# Minor',
      });
      setTranscription(res);
      onShowToast(`Extracted ${res.notes.length} polyphonic MIDI note events for ${res.stemLabel}!`);
    } catch {
      onShowToast('Error transcribing audio to MIDI');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleDownloadMultiTrackBundle = async () => {
    setIsTranscribing(true);
    try {
      const res = await transcribeAllStemsToMultiTrackMidi(audioFile, analysis);
      const filename = `${res.projectName}_FL_Studio_MultiTrack_Bundle.mid`;
      downloadMidiBlob(res.midiData, filename);
      onShowToast(`Exported ${res.tracksCount} stems (${res.totalNotesCount} notes) as FL Studio Multi-Track Bundle!`);
    } catch {
      onShowToast('Error exporting FL Studio Multi-Track Bundle');
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
              Extract polyphonic chords, basslines &amp; melodies into standard .MID files for FL Studio Piano Roll
            </p>
          </div>
        </div>
      </div>

      {/* Inline Stem Audio Previews (local Demucs engine) */}
      {audioFile && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-ink-300 uppercase tracking-wider flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-neon-amber" /> Stem Previews
          </label>

          {isSeparating && (
            <div className="flex items-center gap-2 rounded-lg border border-neon-amber/40 bg-neon-amber/10 px-3 py-2.5 text-[11px] text-neon-amber font-semibold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>Separating stems with AMD RX 6700 XT...</span>
            </div>
          )}

          {separateError && !isSeparating && (
            <div className="rounded-lg border border-neon-rose/40 bg-neon-rose/10 px-3 py-2.5 text-[11px] text-neon-rose">
              {separateError}
            </div>
          )}

          {!isSeparating && previewStems.length > 0 && (
            <>
              <p className="text-[10px] text-ink-400 -mt-1">
                Listen to separated stem layers inline. Use the download icon to save a stem file.
              </p>
              <div className="space-y-1.5">
                {previewStems.map((stem) => (
                  <StemPreviewRow
                    key={stem.id}
                    stem={stem}
                    onDownload={handleDownloadStemPreview}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadMidi}
              className="btn bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold !py-1.5 !px-2.5 !text-[11px] flex items-center justify-center gap-1.5 rounded-lg shadow-md"
              title="Download single stem .MID file for FL Studio Piano Roll"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Stem .MID (FL Studio)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMultiTrackBundle}
              className="btn bg-gradient-to-r from-neon-amber to-orange-400 text-slate-950 font-extrabold !py-1.5 !px-2.5 !text-[11px] flex items-center justify-center gap-1.5 rounded-lg shadow-glow"
              title="Download multi-track bundle (Keys, Bass, Lead, Strings, Drums + Section Markers) for FL Studio"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>All Stems FL Bundle (.MID)</span>
            </button>
          </div>

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