// Left panel: Artist Timbre / Vocal Archetypes + style blending

import { AudioLines, Blend, Mic2 } from 'lucide-react';
import { VOCAL_ARCHETYPES } from '@/data/lyricBanks';
import { MAX_BLEND_SLOTS, blendWeights, resolveArchetypes } from '@/engine/styleFusion';
import { SectionCard, Tag, RangeRow, DiceButton } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function ArtistArchetypeSection({ eng }: { eng: PromptEngine }) {
  const { state, toggleArray, update, randomizeArtistArchetypes } = eng;
  const selected = resolveArchetypes(state.artistArchetypes);
  const weights = blendWeights(selected.length, state.artistBlend);
  const showBlend = selected.length >= 2;

  return (
    <SectionCard
      title="Artist Timbre / Vocal Archetypes"
      icon={<Mic2 className="w-4 h-4" />}
      accent="rose"
      right={
        <div className="flex items-center gap-2">
          <DiceButton onClick={randomizeArtistArchetypes} title="Randomize archetypes" color="rose" />
          <span className="text-[10px] uppercase tracking-widest text-ink-400">
            {selected.length}/{MAX_BLEND_SLOTS} blended
          </span>
        </div>
      }
    >
      <p className="text-[11px] text-ink-400 mb-3">
        Pills show a familiar style nickname. The compiled prompt uses acoustic descriptors only — never celebrity names.
      </p>

      <div className="flex items-center gap-1.5 mb-2">
        <AudioLines className="w-3.5 h-3.5 text-neon-rose" />
        <span className="text-xs text-ink-300">Style / timbre pills (multi-select up to {MAX_BLEND_SLOTS})</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {VOCAL_ARCHETYPES.map(a => (
          <Tag
            key={a.id}
            label={a.pillLabel}
            active={state.artistArchetypes.includes(a.id)}
            variant="magenta"
            onClick={() => toggleArray('artistArchetypes', a.id)}
          />
        ))}
      </div>

      {selected.length > 0 && (
        <div className="mb-3 glass-soft rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-2">Descriptor output</p>
          <ul className="space-y-1.5">
            {selected.map((a, i) => (
              <li key={a.id} className="text-[11px] text-ink-200">
                <span className="text-neon-magenta font-medium">
                  {showBlend ? `${weights[i]}% ` : ''}{a.promptTags[0]}
                </span>
                <span className="text-ink-400"> — {a.promptTags.slice(1).join(', ')}</span>
                <span className="text-ink-500"> · {a.bpmMin}–{a.bpmMax} BPM</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showBlend && (
        <div className="pt-3 border-t border-ink-700/40">
          <div className="flex items-center gap-1.5 mb-2">
            <Blend className="w-3.5 h-3.5 text-neon-amber" />
            <span className="text-xs text-ink-300">Style Blending / Fusion Mode</span>
          </div>
          <RangeRow
            label="Blend ratio — primary / accent"
            value={state.artistBlend}
            min={20}
            max={80}
            suffix="%"
            onChange={v => update('artistBlend', v)}
          />
          <div className="flex flex-wrap justify-between gap-2 mt-1 text-[10px] text-ink-400">
            {selected.map((a, i) => (
              <span key={a.id} className={i === 0 ? 'text-neon-cyan' : 'text-neon-magenta'}>
                {a.promptTags[0]} {i === 0 ? '(Primary)' : '(Accent)'} {weights[i]}%
              </span>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
