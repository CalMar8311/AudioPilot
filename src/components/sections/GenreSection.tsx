// Left panel: Genre & Subgenre Fusion selector

import { useState } from 'react';
import { Disc3, Sparkles, Layers } from 'lucide-react';
import { GENRES, GENRE_BLUEPRINTS, type GenreBlueprint } from '@/data/catalogs';
import { MAX_BLEND_SLOTS, blendWeights } from '@/engine/styleFusion';
import { SectionCard, Tag, SearchInput, RangeRow, DiceButton } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function GenreSection({ eng }: { eng: PromptEngine }) {
  const [query, setQuery] = useState('');
  const { state, toggleArray, update, randomizeGenres, applyBlueprint } = eng;

  const filtered = GENRES.filter(g =>
    g.label.toLowerCase().includes(query.toLowerCase()) ||
    g.subgenres.some(s => s.toLowerCase().includes(query.toLowerCase()))
  );

  // Selected genres (preserve order = primary first)
  const selected = GENRES.filter(g => state.genres.includes(g.id));
  const allSubgenres = selected.flatMap(g => g.subgenres);
  const uniqueSubgenres = Array.from(new Set(allSubgenres));

  return (
    <SectionCard
      title="Genre & Regional Fusion"
      icon={<Disc3 className="w-4 h-4" />}
      accent="cyan"
      right={
        <div className="flex items-center gap-2">
          <DiceButton onClick={randomizeGenres} title="Randomize genres" color="cyan" />
          <span className="text-[10px] uppercase tracking-widest text-ink-400">
            {state.genres.length}/{MAX_BLEND_SLOTS} fused
          </span>
        </div>
      }
    >
      <div className="mb-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Search genres or subgenres…" />
      </div>

      {/* Genre blueprint quick-pick */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Layers className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-xs text-ink-300">Genre Blueprints</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GENRE_BLUEPRINTS.map((bp: GenreBlueprint) => (
            <button
              key={bp.id}
              type="button"
              title={bp.blurb}
              onClick={() => applyBlueprint(bp)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-ink-700/60 bg-ink-850/60 text-ink-300 hover:border-neon-cyan/50 hover:text-neon-cyan hover:bg-neon-cyan/10 transition-all"
            >
              <span className="mr-1">{bp.emoji}</span>{bp.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <Disc3 className="w-3.5 h-3.5 text-neon-cyan" />
        <span className="text-xs text-ink-300">Individual Genres</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {filtered.map(g => (
          <Tag
            key={g.id}
            label={g.label}
            active={state.genres.includes(g.id)}
            onClick={() => toggleArray('genres', g.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-ink-400">No genres match "{query}".</p>
        )}
      </div>

      {uniqueSubgenres.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-neon-magenta" />
            <span className="text-xs text-ink-300">Subgenre accents</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueSubgenres.map(s => (
              <Tag
                key={s}
                label={s}
                active={state.subgenres.includes(s)}
                variant="magenta"
                onClick={() => toggleArray('subgenres', s)}
              />
            ))}
          </div>
        </div>
      )}

      {state.genres.length >= 2 && (
        <div className="pt-3 border-t border-ink-700/40">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-neon-amber" />
            <span className="text-xs text-ink-300">
              Style Blending / Fusion Mode ({state.genres.length}-way)
            </span>
          </div>
          <RangeRow
            label="Blend ratio — primary genre / accent genre"
            value={state.blend}
            min={20}
            max={80}
            suffix="%"
            onChange={v => update('blend', v)}
          />
          <div className="flex flex-wrap justify-between gap-2 mt-1 text-[10px] text-ink-400">
            {state.genres.slice(0, MAX_BLEND_SLOTS).map((id, i) => {
              const w = blendWeights(Math.min(state.genres.length, MAX_BLEND_SLOTS), state.blend);
              return (
                <span key={id} className={i === 0 ? 'text-neon-cyan' : 'text-neon-magenta'}>
                  {GENRES.find(g => g.id === id)?.label} {i === 0 ? '(Primary)' : '(Accent)'} {w[i]}%
                </span>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
