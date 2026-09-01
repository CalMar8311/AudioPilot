// Left panel: Mood, Tempo & Production Dynamics

import { Gauge, Heart, Sliders } from 'lucide-react';
import { MOOD_TAGS, PRODUCTION_TAGS } from '@/data/catalogs';
import { SectionCard, Tag, RangeRow, DiceButton } from '@/components/ui';
import type { PromptEngine, TimeFeel } from '@/engine/usePromptEngine';
import { effectiveBpm } from '@/engine/usePromptEngine';

export function MoodTempoSection({ eng }: { eng: PromptEngine }) {
  const { state, update, toggleArray, randomizeMoodTempo } = eng;

  const feels: { id: TimeFeel; label: string }[] = [
    { id: 'normal', label: 'Normal' },
    { id: 'half', label: 'Half-Time' },
    { id: 'double', label: 'Double-Time' },
  ];

  const eff = effectiveBpm(state.bpm, state.timeFeel);

  return (
    <SectionCard
      title="Mood, Tempo & Production"
      icon={<Gauge className="w-4 h-4" />}
      accent="lime"
      right={<DiceButton onClick={randomizeMoodTempo} title="Randomize mood & tempo" color="lime" />}
    >
      {/* Tempo */}
      <div className="mb-4">
        <RangeRow
          label="Tempo"
          value={state.bpm}
          min={60}
          max={180}
          suffix=" BPM"
          onChange={v => update('bpm', v)}
        />
        <div className="flex gap-2 mt-3">
          {feels.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => update('timeFeel', f.id)}
              className={
                'flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ' +
                (state.timeFeel === f.id
                  ? 'bg-neon-lime/15 border-neon-lime/60 text-neon-lime shadow-[0_0_12px_rgba(163,255,61,0.25)]'
                  : 'bg-ink-850/60 border-ink-700/60 text-ink-300 hover:border-neon-lime/40')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-ink-400 mt-2 numeric">
          Effective tempo: <span className="text-neon-lime">{eff} BPM</span>
        </p>
      </div>

      {/* Mood */}
      <div className="pt-3 border-t border-ink-700/40 mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Heart className="w-3.5 h-3.5 text-neon-rose" />
          <label className="text-xs text-ink-300">Mood tags</label>
        </div>
        <div className="flex flex-wrap gap-2">
          {MOOD_TAGS.map(m => (
            <Tag
              key={m.id}
              label={m.label}
              active={state.moods.includes(m.id)}
              onClick={() => toggleArray('moods', m.id)}
            />
          ))}
        </div>
      </div>

      {/* Production */}
      <div className="pt-3 border-t border-ink-700/40">
        <div className="flex items-center gap-1.5 mb-2">
          <Sliders className="w-3.5 h-3.5 text-neon-cyan" />
          <label className="text-xs text-ink-300">Production & mix tags</label>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRODUCTION_TAGS.map(p => (
            <Tag
              key={p.id}
              label={p.label}
              active={state.production.includes(p.id)}
              onClick={() => toggleArray('production', p.id)}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
