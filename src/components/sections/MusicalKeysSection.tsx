// Musical Keys & Modes Selector

import { Music } from 'lucide-react';
import { MUSICAL_KEYS } from '@/data/catalogs';
import { SectionCard, Tag } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function MusicalKeysSection({ eng }: { eng: PromptEngine }) {
  const { state, toggleArray } = eng;

  return (
    <SectionCard
      title="Musical Keys & Modes"
      icon={<Music className="w-4 h-4" />}
      accent="cyan"
    >
      <p className="text-[11px] text-ink-400 mb-3">
        Select the tonal center and modal framework for harmonic guidance.
      </p>

      <div className="flex flex-wrap gap-2">
        {MUSICAL_KEYS.map(key => (
          <Tag
            label={key.label}
            active={state.musicalKeys.includes(key.id)}
            variant="default"
            onClick={() => toggleArray('musicalKeys', key.id)}
          />
        ))}
      </div>

      {state.musicalKeys.length > 0 && (
        <div className="mt-3 glass-soft rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-2">Compiled output</p>
          <p className="text-[11px] text-ink-200 font-mono">
            key: {state.musicalKeys
              .map(id => MUSICAL_KEYS.find(k => k.id === id)?.label || id)
              .join(', ')}
          </p>
        </div>
      )}
    </SectionCard>
  );
}
