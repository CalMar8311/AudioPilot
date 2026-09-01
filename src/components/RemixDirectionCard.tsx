import { Copy, FileText, Sparkles, Check, ArrowRight, BookOpen, Music } from 'lucide-react';
import type { RemixDirection } from '@/services/geminiAudio';

interface RemixDirectionCardProps {
  dir: RemixDirection;
  idx: number;
  isSelected: boolean;
  onApply: (dir: RemixDirection) => void;
  onCopyStyle: (dir: RemixDirection) => void;
  onCopyLyrics: (dir: RemixDirection) => void;
  onJumpToLyrics?: () => void;
  onInjectHarmonicMetatag?: (dir: RemixDirection) => void;
}

export function RemixDirectionCard({
  dir,
  idx,
  isSelected,
  onApply,
  onCopyStyle,
  onCopyLyrics,
  onJumpToLyrics,
  onInjectHarmonicMetatag,
}: RemixDirectionCardProps) {
  const badgeColors = [
    'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30',
    'bg-neon-amber/15 text-neon-amber border-neon-amber/30',
    'bg-neon-lime/15 text-neon-lime border-neon-lime/30',
  ];

  return (
    <div
      className={`rounded-xl p-3 border transition-all flex flex-col justify-between gap-2.5 ${
        isSelected
          ? 'border-neon-cyan bg-neon-cyan/10 ring-1 ring-neon-cyan/50'
          : 'border-ink-700/60 bg-ink-900/40 hover:border-neon-cyan/50'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeColors[idx % 3]}`}>
            {dir.genre} {dir.subgenre ? `• ${dir.subgenre}` : ''}
          </span>
          <span className="text-[10px] font-mono text-ink-300">
            {dir.bpm} BPM | {dir.key}
          </span>
        </div>

        <h5 className="text-xs font-bold text-ink-100 truncate">{dir.title}</h5>
        <p className="text-[10px] text-ink-400 line-clamp-2 leading-relaxed">{dir.description}</p>

        {dir.narrativeConcept && (
          <div className="text-[10px] bg-neon-cyan/5 p-1.5 rounded border border-neon-cyan/30 space-y-0.5">
            <span className="text-neon-cyan font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Paired Narrative Theme
            </span>
            <span className="text-ink-100 font-medium block truncate">{dir.narrativeConcept}</span>
          </div>
        )}

        {(dir.reharmonization || dir.romanProgression) && (
          <div className="text-[10px] bg-neon-amber/10 p-1.5 rounded border border-neon-amber/30 space-y-0.5">
            <span className="text-neon-amber font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
              <Music className="w-3 h-3 text-neon-amber" /> Suggested Reharmonization
            </span>
            {dir.reharmonization && <span className="text-ink-100 font-medium block truncate">{dir.reharmonization}</span>}
            {dir.romanProgression && (
              <span className="text-[9px] font-mono text-neon-magenta block font-bold mt-0.5">
                Roman Loop: {dir.romanProgression}
              </span>
            )}
          </div>
        )}

        {(dir.vocalTimbre || dir.vocalArchetype) && (
          <div className="text-[10px] bg-ink-950/60 p-1.5 rounded border border-ink-700/40">
            <span className="text-ink-400 font-semibold block text-[9px] uppercase">Vocal Archetype / Timbre</span>
            <span className="text-ink-200 block truncate">{dir.vocalTimbre || dir.vocalArchetype}</span>
          </div>
        )}

        {dir.instrumentation && dir.instrumentation.length > 0 && (
          <div>
            <span className="text-[9px] text-ink-400 font-semibold uppercase block mb-1">Key Instruments</span>
            <div className="flex flex-wrap gap-1">
              {dir.instrumentation.map(inst => (
                <span key={inst} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-ink-950 text-ink-300 border border-ink-700/50">
                  {inst}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <span className="text-[9px] text-ink-400 font-semibold uppercase block mb-1">Arrangement Tags</span>
          <div className="flex flex-wrap gap-1">
            {(dir.sectionTags || ['[Intro]', '[Verse]', '[Chorus]', '[Outro]']).map(tag => (
              <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-ink-800 text-neon-cyan border border-neon-cyan/20">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-ink-700/40">
        <button
          type="button"
          onClick={() => onApply(dir)}
          className={`w-full btn !py-1.5 !text-xs font-semibold flex items-center justify-center gap-1.5 ${
            isSelected ? 'btn-primary' : 'bg-ink-800 hover:bg-neon-cyan/20 text-ink-100 border border-ink-700'
          }`}
        >
          {isSelected ? <Check className="w-3.5 h-3.5 text-neon-cyan" /> : <Sparkles className="w-3.5 h-3.5" />}
          {isSelected ? 'Remix Applied & Lyrics Generated' : 'Apply Remix Direction'}
        </button>

        {onJumpToLyrics && isSelected && (
          <button
            type="button"
            onClick={onJumpToLyrics}
            className="w-full btn bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 !py-1 !px-2 !text-[10px] flex items-center justify-center gap-1 font-semibold transition rounded-lg"
          >
            <span>Jump to Lyric Canvas</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
        {onInjectHarmonicMetatag && (dir.harmonicMetatag || dir.romanProgression) && (
          <button
            type="button"
            onClick={() => onInjectHarmonicMetatag(dir)}
            className="w-full btn btn-ghost !py-1 !px-2 !text-[10px] text-neon-cyan hover:bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center gap-1 font-mono font-semibold"
            title="Inject harmonic movement tag into lyric canvas"
          >
            <Music className="w-3 h-3 text-neon-cyan" />
            <span>Inject {dir.harmonicMetatag || `[Harmonic Movement: ${dir.romanProgression}]`}</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onCopyStyle(dir)}
            className="btn btn-ghost !py-1 !px-2 !text-[10px] border border-ink-700/60 flex items-center justify-center gap-1"
            title="Copy Remix Style Prompt"
          >
            <Copy className="w-3 h-3 text-neon-cyan" /> Style Prompt
          </button>
          <button
            type="button"
            onClick={() => onCopyLyrics(dir)}
            className="btn btn-ghost !py-1 !px-2 !text-[10px] border border-ink-700/60 flex items-center justify-center gap-1"
            title="Copy Remix Lyrics & Tags"
          >
            <FileText className="w-3 h-3 text-neon-magenta" /> Lyrics &amp; Tags
          </button>
        </div>
      </div>
    </div>
  );
}
