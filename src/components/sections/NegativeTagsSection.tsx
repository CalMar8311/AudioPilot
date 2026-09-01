// Negative / Exclude Tags drawer — things to explicitly avoid in generated music

import { Ban } from 'lucide-react';
import { NEGATIVE_TAGS } from '@/data/catalogs';
import { SectionCard, Tag } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function NegativeTagsSection({ eng }: { eng: PromptEngine }) {
  const { state, toggleArray } = eng;

  return (
    <SectionCard
      title="Exclude / Negative Tags"
      icon={<Ban className="w-4 h-4" />}
      accent="amber"
    >
      <p className="text-[11px] text-ink-400 mb-3">
        Select elements to explicitly exclude from the generated music. These are appended as engine-standard negative directives.
      </p>

      <div className="flex flex-wrap gap-2">
        {NEGATIVE_TAGS.map(tag => (
          <Tag
            key={tag.id}
            label={tag.label}
            active={state.negativeTags.includes(tag.id)}
            variant="amber"
            onClick={() => toggleArray('negativeTags', tag.id)}
          />
        ))}
      </div>

      {state.negativeTags.length > 0 && (
        <div className="mt-3 glass-soft rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-2">Compiled output</p>
          <p className="text-[11px] text-ink-200 font-mono">
            [no: {state.negativeTags
              .map(id => NEGATIVE_TAGS.find(t => t.id === id)?.label.replace(/^no /, '') || id)
              .join(', ')}]
          </p>
        </div>
      )}
    </SectionCard>
  );
}
