// Left panel: Instruments & Sound Design

import { useState } from 'react';
import { Piano, Plus, X } from 'lucide-react';
import { INSTRUMENTS } from '@/data/catalogs';
import { SectionCard, Tag, SearchInput, DiceButton } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function InstrumentsSection({ eng }: { eng: PromptEngine }) {
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');
  const { state, toggleArray, addCustomInstrument, removeCustomInstrument, randomizeInstruments } = eng;

  const filtered = INSTRUMENTS.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SectionCard
      title="Instruments & Sound Design"
      icon={<Piano className="w-4 h-4" />}
      accent="amber"
      right={
        <div className="flex items-center gap-2">
          <DiceButton onClick={randomizeInstruments} title="Randomize instruments" color="amber" />
          <span className="text-[10px] uppercase tracking-widest text-ink-400">
            {state.instruments.length + state.customInstruments.length} selected
          </span>
        </div>
      }
    >
      <div className="mb-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search instruments…" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filtered.map(i => (
          <Tag
            key={i.id}
            label={i.label}
            active={state.instruments.includes(i.id)}
            variant="amber"
            onClick={() => toggleArray('instruments', i.id)}
          />
        ))}
      </div>

      <div className="pt-3 border-t border-ink-700/40">
        <label className="block text-xs text-ink-300 mb-1.5">Custom instrument tag</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                addCustomInstrument(custom);
                setCustom('');
              }
            }}
            placeholder="e.g. Sitar, Hang Drum, TB-303"
            className="flex-1 bg-ink-850/60 border border-ink-700/60 rounded-lg px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-neon-amber/60 focus:ring-1 focus:ring-neon-amber/30 transition"
          />
          <button
            type="button"
            className="btn btn-ghost !px-3"
            onClick={() => { addCustomInstrument(custom); setCustom(''); }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {state.customInstruments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {state.customInstruments.map(c => (
              <span key={c} className="tag tag-amber inline-flex items-center">
                {c}
                <button
                  type="button"
                  onClick={() => removeCustomInstrument(c)}
                  className="ml-1 text-neon-amber/80 hover:text-neon-rose"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
