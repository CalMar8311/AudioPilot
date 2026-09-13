// Left panel: Vocal & Performance Direction

import { Mic2, Waves, UserCircle2, Shuffle } from 'lucide-react';
import { VOCAL_TYPES, VOCAL_TIMBRES, VOCAL_EFFECTS } from '@/data/catalogs';
import { VOCAL_PERSONAS, pickPersonaForGenre } from '@/data/vocalPersonas';
import { SectionCard, Tag, DiceButton } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function VocalsSection({ eng }: { eng: PromptEngine }) {
  const { state, toggleArray, randomizeVocals, selectVocalPersona } = eng;

  /** Pick a persona that matches the active genres, then apply it. */
  const randomizePersona = () => {
    const picked = pickPersonaForGenre(state.genres);
    if (picked) selectVocalPersona(picked);
  };

  return (
    <SectionCard
      title="Vocal & Performance Direction"
      icon={<Mic2 className="w-4 h-4" />}
      accent="magenta"
      right={<DiceButton onClick={randomizeVocals} title="Randomize vocals" color="magenta" />}
    >
      {/* ── Vocal Delivery / Persona ───────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <UserCircle2 className="w-3.5 h-3.5 text-neon-magenta" />
          <span className="text-xs text-ink-300 font-medium flex-1">Vocal Delivery / Persona</span>
          <button
            type="button"
            onClick={randomizePersona}
            title="Pick a random persona matching your genre"
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border border-neon-magenta/40 bg-neon-magenta/10 text-neon-magenta hover:bg-neon-magenta/20 transition"
          >
            <Shuffle className="w-3 h-3" />
            Random
          </button>
        </div>

        {/* Persona pills — 2-column responsive grid */}
        <div className="grid grid-cols-1 gap-1.5">
          {VOCAL_PERSONAS.map(persona => {
            const active = state.vocalPersona === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                title={persona.description}
                onClick={() => selectVocalPersona(persona.id)}
                className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-neon-magenta/70 bg-neon-magenta/10 shadow-[0_0_8px_rgba(236,72,153,0.25)]'
                    : 'border-ink-700/50 bg-ink-850/40 hover:border-neon-magenta/40 hover:bg-neon-magenta/5'
                }`}
              >
                <span className="text-lg leading-none mt-0.5 shrink-0">{persona.emoji}</span>
                <div className="min-w-0">
                  <span className={`block text-[11px] font-semibold leading-tight ${active ? 'text-neon-magenta' : 'text-ink-200'}`}>
                    {persona.label}
                  </span>
                  <span className="block text-[10px] text-ink-400 leading-snug mt-0.5 truncate">
                    {persona.description}
                  </span>
                  {active && (
                    <span className="inline-block mt-1 text-[9px] font-mono text-neon-magenta/70 bg-neon-magenta/10 border border-neon-magenta/20 px-1.5 py-0.5 rounded">
                      {persona.bracketTag}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {/* ───────────────────────────────────────────────────────────────────── */}

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
