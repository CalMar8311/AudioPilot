import { useState, useEffect } from 'react';
import { FileAudio, RefreshCw, Trash2, Sparkles, Music, Copy, Activity, Sliders, Plus, Minus } from 'lucide-react';
import type { AudioAnalysisResult, ChordStep } from '@/services/geminiAudio';
import { normalizeBpmWithRange, BpmDetectionRange } from '@/utils/bpmDetector';

interface UploadedTrackBadgeCardProps {
  fileName: string;
  fileSize: number;
  audioUrl: string;
  isAnalyzing: boolean;
  analysis: AudioAnalysisResult | null;
  onReplace: () => void;
  onRemove: () => void;
  onApplySignature: () => void;
  onCopyChord?: (chord: string, roman?: string) => void;
  onInjectHarmonicMovement?: (tag: string) => void;
  onUpdateBpm?: (newBpm: number) => void;
  onUpdateBpmRange?: (range: BpmDetectionRange) => void;
}

function getSteps(analysis: AudioAnalysisResult): ChordStep[] {
  if (analysis.chordSteps && analysis.chordSteps.length > 0) {
    return analysis.chordSteps;
  }
  if (!analysis.chordProgression) return [];
  const parts = analysis.chordProgression.split(/[-–—→,]/).map(p => p.trim()).filter(Boolean);
  const defaultRomans = ['im7', 'ivm7', 'VII7', 'IIImaj7', 'vm7', 'VImaj7', 'iim7', 'IV'];
  return parts.map((chordName, idx) => ({
    stepNumber: idx + 1,
    chordName,
    romanNumeral: defaultRomans[idx % defaultRomans.length],
  }));
}

export function UploadedTrackBadgeCard({
  fileName,
  fileSize,
  audioUrl,
  isAnalyzing,
  analysis,
  onReplace,
  onRemove,
  onApplySignature,
  onCopyChord,
  onInjectHarmonicMovement,
  onUpdateBpm,
  onUpdateBpmRange,
}: UploadedTrackBadgeCardProps) {
  const formattedSize = (fileSize / (1024 * 1024)).toFixed(2) + ' MB';
  const currentBpm = analysis?.detectedBpm || 120;

  const [bpmInputValue, setBpmInputValue] = useState<string>(String(currentBpm));
  const [bpmRange, setBpmRange] = useState<BpmDetectionRange>('standard');
  const [tapTimes, setTapTimes] = useState<number[]>([]);

  useEffect(() => {
    setBpmInputValue(String(currentBpm));
  }, [currentBpm]);

  const handleBpmCommit = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed >= 40 && parsed <= 260) {
      onUpdateBpm?.(parsed);
    } else {
      setBpmInputValue(String(currentBpm));
    }
  };

  const handleStepBpm = (delta: number) => {
    const newBpm = Math.max(40, Math.min(260, currentBpm + delta));
    setBpmInputValue(String(newBpm));
    onUpdateBpm?.(newBpm);
  };

  const handleAdjustBpmMultiplier = (multiplier: number) => {
    const newBpm = Math.round(currentBpm * multiplier);
    const clamped = Math.max(40, Math.min(260, newBpm));
    setBpmInputValue(String(clamped));
    onUpdateBpm?.(clamped);
  };

  const handleRangeSelect = (range: BpmDetectionRange) => {
    setBpmRange(range);
    onUpdateBpmRange?.(range);
  };

  const handleTapTempo = () => {
    const now = performance.now();
    setTapTimes((prev) => {
      const filtered = prev.length > 0 && now - prev[prev.length - 1] > 2000 ? [] : prev;
      const next = [...filtered, now].slice(-8);

      if (next.length >= 2) {
        const intervals = [];
        for (let i = 1; i < next.length; i++) {
          intervals.push(next[i] - next[i - 1]);
        }
        const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const tapped = normalizeBpmWithRange(60000 / avgMs, bpmRange);
        setBpmInputValue(String(tapped.bpm));
        onUpdateBpm?.(tapped.bpm);
      }
      return next;
    });
  };

  return (
    <div className="glass-soft backdrop-blur-md bg-ink-900/85 rounded-xl p-4 border border-ink-700/60 shadow-xl space-y-3 transition-all">
      {/* Top Header: File metadata & top-right controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-neon-cyan/15 flex items-center justify-center shrink-0 border border-neon-cyan/30">
            <FileAudio className="w-5 h-5 text-neon-cyan" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-ink-100 truncate max-w-[220px] sm:max-w-xs" title={fileName}>
                {fileName}
              </h4>
              <span className="text-[10px] text-ink-400 font-mono bg-ink-950/60 px-2 py-0.5 rounded border border-ink-700/40 shrink-0">
                {formattedSize}
              </span>
            </div>
            <p className="text-[10px] text-neon-cyan font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3" /> Persistent Reference Track Loaded
            </p>
          </div>
        </div>

        {/* Top-Right Controls: Replace Track & Remove */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onReplace}
            className="btn btn-ghost !py-1 !px-2.5 !text-[11px] border border-ink-700/70 hover:border-neon-cyan/50 text-ink-300 hover:text-neon-cyan flex items-center gap-1 transition"
            title="Replace Track"
          >
            <RefreshCw className="w-3 h-3 text-neon-cyan" />
            <span>Replace Track</span>
          </button>

          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg bg-ink-800/80 hover:bg-neon-rose/20 text-ink-400 hover:text-neon-rose border border-ink-700/60 hover:border-neon-rose/40 transition"
            title="Remove Track"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Embedded Compact HTML5 Audio Player */}
      <div className="pt-1">
        <audio controls src={audioUrl} className="h-8 w-full max-w-md rounded" />
      </div>

      {/* Detected Acoustic Metadata Badges */}
      {isAnalyzing ? (
        <div className="flex items-center justify-center gap-2 text-xs text-neon-amber py-2.5 animate-pulse bg-ink-950/40 rounded-lg border border-ink-700/30">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Analyzing Key, BPM, Vocal Presence &amp; Acoustic Characteristics via AI...</span>
        </div>
      ) : analysis && (
        <div className="space-y-2.5 border-t border-ink-700/40 pt-2.5">
          {/* Prominent FL Studio-Style Tempo Control Box */}
          <div className="bg-ink-950/80 p-3 rounded-xl border border-neon-cyan/30 space-y-2">
            {/* FL Studio Detection Range Selector */}
            <div className="flex items-center justify-between gap-1 flex-wrap border-b border-ink-800/80 pb-2">
              <span className="text-[10px] text-ink-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sliders className="w-3 h-3 text-neon-cyan" /> FL Studio Detection Range:
              </span>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'standard', label: 'Standard (75–150 BPM)' },
                    { id: 'fast', label: 'Fast / DnB / Trap (100–200 BPM)' },
                    { id: 'slow', label: 'Slow / Downtempo (50–100 BPM)' },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRangeSelect(r.id)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition ${
                      bpmRange === r.id
                        ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                        : 'bg-ink-900 text-ink-400 border border-ink-800 hover:text-ink-200'
                    }`}
                  >
                    {r.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* BPM Fine Controls: Input, -1, +1, ½, 2x, Tap Tempo */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-bold text-ink-100">BPM:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStepBpm(-1)}
                    className="w-6 h-6 rounded bg-ink-900 hover:bg-neon-cyan/20 text-ink-200 hover:text-neon-cyan border border-ink-700 flex items-center justify-center transition text-xs font-bold"
                    title="Nudge -1 BPM"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    value={bpmInputValue}
                    onChange={(e) => setBpmInputValue(e.target.value)}
                    onBlur={(e) => handleBpmCommit(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBpmCommit((e.target as HTMLInputElement).value)}
                    min={40}
                    max={260}
                    className="w-16 bg-ink-900 border border-neon-cyan/50 focus:border-neon-cyan text-neon-cyan font-extrabold text-xs px-2 py-1 rounded text-center numeric focus:outline-none shadow-inner"
                    title="Directly edit BPM value"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepBpm(1)}
                    className="w-6 h-6 rounded bg-ink-900 hover:bg-neon-cyan/20 text-ink-200 hover:text-neon-cyan border border-ink-700 flex items-center justify-center transition text-xs font-bold"
                    title="Nudge +1 BPM"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {analysis?.exactBpm && (
                  <span className="text-[10px] font-mono text-neon-cyan/70 font-semibold" title="Exact sample-calculated tempo">
                    ({analysis.exactBpm.toFixed(1)})
                  </span>
                )}
              </div>

              {/* ½ and 2x Quick Fix Toggles */}
              <div className="flex items-center gap-1 border-l border-ink-800 pl-2">
                <button
                  type="button"
                  onClick={() => handleAdjustBpmMultiplier(0.5)}
                  className="px-2 py-1 rounded bg-ink-900 hover:bg-neon-cyan/20 text-ink-200 hover:text-neon-cyan border border-ink-700 hover:border-neon-cyan/40 text-[10px] font-extrabold font-mono transition"
                  title="Half-time adjustment (divide BPM by 2)"
                >
                  ½
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustBpmMultiplier(2.0)}
                  className="px-2 py-1 rounded bg-ink-900 hover:bg-neon-cyan/20 text-ink-200 hover:text-neon-cyan border border-ink-700 hover:border-neon-cyan/40 text-[10px] font-extrabold font-mono transition"
                  title="Double-time adjustment (multiply BPM by 2)"
                >
                  2x
                </button>
              </div>

              {/* Tap Tempo Button */}
              <button
                type="button"
                onClick={handleTapTempo}
                className="btn btn-ghost !py-1 !px-2.5 !text-[10px] font-bold border border-neon-amber/40 hover:bg-neon-amber/15 text-neon-amber flex items-center gap-1 transition rounded-md ml-auto"
                title="Tap in rhythm to manually calculate & set BPM"
              >
                <Activity className="w-3.5 h-3.5 text-neon-amber animate-pulse" />
                <span>Tap Tempo ({tapTimes.length ? `${tapTimes.length} Taps` : 'Tap'})</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30 flex items-center gap-1">
              🔑 Key: {analysis.detectedKey}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-neon-emerald/15 text-neon-emerald border border-neon-emerald/30 flex items-center gap-1">
              🎙️ Vocal Presence: {analysis.vocalTimbre}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-neon-amber/15 text-neon-amber border border-neon-amber/30 flex items-center gap-1">
              💫 Core Mood: {analysis.detectedMood || 'Dynamic'}
            </span>
          </div>

          {/* Harmonic Progression & Analysis Module */}
          {(analysis.chordProgression || (analysis.chordSteps && analysis.chordSteps.length > 0) || analysis.harmonicVibe) && (
            <div className="bg-ink-950/80 rounded-xl p-3 border border-neon-cyan/30 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <span className="text-xs font-bold text-ink-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-neon-cyan" /> Harmonic Progression &amp; Analysis
                </span>
                {analysis.harmonicVibe && (
                  <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40">
                    {analysis.harmonicVibe}
                  </span>
                )}
              </div>

              {/* Sequence Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {getSteps(analysis).map((step) => (
                  <button
                    key={step.stepNumber}
                    type="button"
                    onClick={() => onCopyChord?.(step.chordName, step.romanNumeral)}
                    className="group relative flex flex-col items-center justify-center min-w-[64px] px-2.5 py-1.5 rounded-lg bg-ink-900/90 hover:bg-neon-cyan/15 border border-ink-700/60 hover:border-neon-cyan/60 transition shadow-sm cursor-pointer"
                    title={`Click to copy or apply chord ${step.chordName} (${step.romanNumeral})`}
                  >
                    {/* Step Number Badge */}
                    <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-neon-cyan/20 text-neon-cyan mb-1">
                      Step {step.stepNumber}
                    </span>
                    {/* Bold Chord Name */}
                    <span className="text-xs font-extrabold text-ink-100 group-hover:text-neon-cyan transition numeric">
                      {step.chordName}
                    </span>
                    {/* Case-Sensitive Roman Numeral */}
                    <span className="text-[10px] font-mono font-bold text-neon-magenta mt-0.5">
                      {step.romanNumeral}
                    </span>
                  </button>
                ))}
              </div>

              {/* Quick action bar to inject harmonic movement tag */}
              <div className="flex items-center justify-between pt-2 border-t border-ink-800/60 text-[10px] flex-wrap gap-1">
                <span className="text-ink-400 font-mono">
                  Roman Progression: {getSteps(analysis).map(s => s.romanNumeral).join(' - ')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const tag = `[Harmonic Movement: ${getSteps(analysis).map(s => s.romanNumeral).join(' - ')}]`;
                    onInjectHarmonicMovement?.(tag);
                  }}
                  className="btn btn-ghost !py-1 !px-2.5 !text-[10px] text-neon-cyan hover:bg-neon-cyan/10 border border-neon-cyan/30 flex items-center gap-1 font-mono font-semibold"
                >
                  <Copy className="w-3 h-3 text-neon-cyan" />
                  <span>Inject [Harmonic Movement] into Lyric Canvas</span>
                </button>
              </div>
            </div>
          )}

          {analysis.instrumentation && analysis.instrumentation.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-ink-400 font-semibold uppercase text-[9px]">Extracted Instrumentation:</span>
              <div className="flex flex-wrap gap-1">
                {analysis.instrumentation.map(inst => (
                  <span key={inst} className="px-1.5 py-0.5 rounded bg-ink-950/80 text-neon-cyan border border-neon-cyan/20 font-mono text-[9px]">
                    {inst}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onApplySignature}
            className="w-full btn btn-ghost !py-1.5 !text-xs border border-neon-cyan/40 hover:bg-neon-cyan/10 flex items-center justify-center gap-1.5 mt-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
            <span>Apply Extracted Signature &amp; Harmonic Profile to Studio Builder</span>
          </button>
        </div>
      )}
    </div>
  );
}
