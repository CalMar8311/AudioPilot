// Left panel: Vocal & Performance Direction

import { Mic2, Waves } from 'lucide-react';
import { VOCAL_TYPES, VOCAL_TIMBRES, VOCAL_EFFECTS } from '@/data/catalogs';
import { SectionCard, Tag, DiceButton } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function VocalsSection({ eng }: { eng: PromptEngine }) {
  const { state, toggleArray, randomizeVocals } = eng;

  return (
    <SectionCard
      title="Vocal & Performance Direction"
      icon={<Mic2 className="w-4 h-4" />}
      accent="magenta"
      right={<DiceButton onClick={randomizeVocals} title="Randomize vocals" color="magenta" />}
    >
      <label className="block text-xs text-ink-300 mb-2">Vocal type</label>
      <div className="flex flex-wrap gap-2 mb-4">
        {VOCAL_TYPES.map(v => (
          <Tag
            key={v.id}
            label={v.label}
            active={state.vocalTypes.includes(v.id)}
            variant="magenta"
            onClick={() => toggleArray('vocalTypes', v.id)}
          />
        ))}
      </div>

      <div className="pt-3 border-t border-ink-700/40 mb-4">
        <label className="block text-xs text-ink-300 mb-2">Vocal timbre</label>
        <div className="flex flex-wrap gap-2">
          {VOCAL_TIMBRES.map(timbre => (
            <Tag
              key={timbre.id}
              label={timbre.label}
              active={state.vocalTimbre === timbre.id}
              variant="magenta"
              onClick={() => eng.update('vocalTimbre', state.vocalTimbre === timbre.id ? '' : timbre.id)}
            />
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-ink-700/40">
        <div className="flex items-center gap-1.5 mb-2">
          <Waves className="w-3.5 h-3.5 text-neon-magenta" />
          <label className="text-xs text-ink-300">Vocal effects</label>
        </div>
        <div className="flex flex-wrap gap-2">
          {VOCAL_EFFECTS.map(v => (
            <Tag
              key={v.id}
              label={v.label}
              active={state.vocalEffects.includes(v.id)}
              variant="magenta"
              onClick={() => toggleArray('vocalEffects', v.id)}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
