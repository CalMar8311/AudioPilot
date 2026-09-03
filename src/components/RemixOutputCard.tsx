// Remix Engine Output Card: Detected Track Summary + Remix Direction Cards + MIDI Export

import { Music, Download, Wand2, Copy } from 'lucide-react';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function RemixOutputCard({ eng }: { eng: PromptEngine }) {
  const { audioState } = eng;
  const { analysis, audioFile } = audioState;

  if (!audioFile) {
    return (
      <section className="glass rounded-2xl p-5 animate-slideIn">
        <div className="flex items-center justify-between pb-3 border-b border-ink-800">
          <div className="flex items-center gap-3">
            <div className="sec-bar h-5 bg-gradient-to-b from-neon-cyan to-neon-blue" />
            <h3 className="text-sm font-semibold tracking-wide text-ink-100">Remix Engine Output</h3>
          </div>
        </div>
        <div className="pt-4 text-center">
          <p className="text-xs text-ink-400">
            Upload an audio file to see detected track summary and remix directions.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="glass rounded-2xl p-5 animate-slideIn space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-ink-800">
        <div className="flex items-center gap-3">
          <div className="sec-bar h-5 bg-gradient-to-b from-neon-cyan to-neon-blue" />
          <h3 className="text-sm font-semibold tracking-wide text-ink-100">Remix Engine Output</h3>
        </div>
      </div>

      {/* Detected Track Summary */}
      {analysis && (
        <div className="glass-soft rounded-xl p-4 border border-ink-700/60 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-neon-cyan" />
            <h4 className="text-xs font-bold text-ink-100 uppercase tracking-wider">Track Signature</h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="glass-soft rounded-lg p-2 border border-ink-700/50">
              <p className="text-[10px] text-ink-400 mb-0.5">BPM</p>
              <p className="text-sm font-bold text-neon-cyan">{analysis.detectedBpm || analysis.exactBpm || 120}</p>
            </div>
            <div className="glass-soft rounded-lg p-2 border border-ink-700/50">
              <p className="text-[10px] text-ink-400 mb-0.5">Key</p>
              <p className="text-sm font-bold text-neon-cyan">{analysis.detectedKey || 'Unknown'}</p>
            </div>
          </div>

          {analysis.chordProgression && (
            <div className="glass-soft rounded-lg p-2 border border-ink-700/50">
              <p className="text-[10px] text-ink-400 mb-1">Chord Progression</p>
              <p className="text-xs font-mono text-ink-100">{analysis.chordProgression}</p>
            </div>
          )}

          {analysis.detectedMood && (
            <div className="glass-soft rounded-lg p-2 border border-ink-700/50">
              <p className="text-[10px] text-ink-400 mb-1">Mood</p>
              <p className="text-xs text-ink-200">{analysis.detectedMood}</p>
            </div>
          )}
        </div>
      )}

      {/* Remix Direction Cards Count */}
      {analysis && analysis.remixDirections && analysis.remixDirections.length > 0 && (
        <div className="glass-soft rounded-xl p-4 border border-ink-700/60">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="w-4 h-4 text-neon-magenta" />
            <h4 className="text-xs font-bold text-ink-100 uppercase tracking-wider">Remix Directions</h4>
          </div>
          <p className="text-xs text-ink-300">
            {analysis.remixDirections.length} AI-powered remix concepts generated. 
            Switch to the <span className="text-neon-cyan font-semibold">"Remix Studio & MIDI Export"</span> sub-tab to explore and apply them.
          </p>
        </div>
      )}

      {/* Quick Note */}
      <div className="text-center pt-2 border-t border-ink-700/40">
        <p className="text-[10px] text-ink-400 italic">
          💡 MIDI Export and full remix direction cards available in the "Remix Studio & MIDI Export" sub-tab on the left.
        </p>
      </div>
    </section>
  );
}
