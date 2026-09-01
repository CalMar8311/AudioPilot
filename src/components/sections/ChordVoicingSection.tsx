// Chord Voicing Tags

import { Guitar } from 'lucide-react';
import { CHORD_VOICINGS } from '@/data/catalogs';
import { SectionCard, Tag } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function ChordVoicingSection({ eng }: { eng: PromptEngine }) {
  const { state, toggleArray } = eng;

  return (
    <SectionCard
      title="Chord Voicing & Progression"
      icon={<Guitar className="w-4 h-4" />}
      accent="magenta"
    >
      <p className="text-[11px] text-ink-400 mb-3">
        Select harmonic voicing styles and bass movement patterns.
      </p>

      <div className="flex flex-wrap gap-2">
        {CHORD_VOICINGS.map(voicing => (
          <Tag
            label={voicing.label}
            active={state.chordVoicings.includes(voicing.id)}
            variant="magenta"
            onClick={() => toggleArray('chordVoicings', voicing.id)}
          />
        ))}
      </div>

      {state.chordVoicings.length > 0 && (
        <div className="mt-3 glass-soft rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-2">Compiled output</p>
          <p className="text-[11px] text-ink-200 font-mono">
            chords: {state.chordVoicings
              .map(id => CHORD_VOICINGS.find(c => c.id === id)?.label || id)
              .join(', ')}
          </p>
        </div>
      )}
    </SectionCard>
  );
}
