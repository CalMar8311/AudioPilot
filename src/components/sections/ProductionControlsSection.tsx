import { AudioWaveform, Clock3, Disc3, Mic2, Radio, Shuffle } from 'lucide-react';
import {
  END_TRACK_TAGS,
  GROOVE_FEELS,
  MICRO_GENRES,
  MIX_SPATIAL_TAGS,
  TIME_SIGNATURES,
  CURATED_PRESETS,
} from '@/data/catalogs';
import { SectionCard, Tag } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function ProductionControlsSection({ eng, onPresetSelect, onEraSelect }: { eng: PromptEngine; onPresetSelect?: (preset: typeof CURATED_PRESETS[number]) => void; onEraSelect?: (label: string) => boolean }) {
  const { state, update, toggleArray, loadPreset, clearPresetSelection } = eng;
  const isPresetActive = (preset: typeof CURATED_PRESETS[number]) => {
    const matching = preset.matchingPills;
    return Boolean(matching && matching.genres.every(id => state.genres.includes(id)) && matching.instruments.every(id => state.instruments.includes(id)) && matching.vocalTypes.every(id => state.vocalTypes.includes(id)));
  };

  return (
    <SectionCard
      title="Production, Era & Track Finish"
      icon={<AudioWaveform className="w-4 h-4" />}
      accent="blue"
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Disc3 className="w-3.5 h-3.5 text-ink-300" />
            <p className="text-xs text-ink-200">Decades &amp; Vintage Eras</p>
          </div>
          <div className="space-y-3">
            {MICRO_GENRES.map(group => (
              <div key={group.era}>
                <p className="text-[10px] uppercase tracking-widest text-ink-500 mb-1.5">{group.era}</p>
                <div className="flex flex-wrap gap-2">
                  {group.options.map(option => (
                    <Tag
                      key={option}
                      label={option}
                      active={state.subgenres.includes(option) || Boolean(CURATED_PRESETS.find(item => item.microGenre === option && isPresetActive(item)))}
                      onClick={() => {
                        const preset = CURATED_PRESETS.find(item => item.microGenre === option);
                        if (preset) {
                          const isActive = isPresetActive(preset);
                          if (isActive) clearPresetSelection(preset);
                          else (onPresetSelect ?? loadPreset)(preset);
                        } else if (!onEraSelect?.(option)) update('subgenres', [option]);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-ink-700/40 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Mic2 className="w-3.5 h-3.5 text-ink-300" />
            <p className="text-xs text-ink-200">Mix &amp; Spatial Production</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {MIX_SPATIAL_TAGS.map(tag => (
              <Tag key={tag.id} label={tag.label} active={state.mixSpatialTags.includes(tag.id)} onClick={() => toggleArray('mixSpatialTags', tag.id)} />
            ))}
          </div>
        </div>

        <div className="border-t border-ink-700/40 pt-4 grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock3 className="w-3.5 h-3.5 text-ink-300" />
              <p className="text-xs text-ink-200">Time Signature</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIME_SIGNATURES.map(tag => (
                <Tag key={tag.id} label={tag.label} active={state.timeSignature === tag.id} onClick={() => update('timeSignature', tag.id)} />
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shuffle className="w-3.5 h-3.5 text-ink-300" />
              <p className="text-xs text-ink-200">Groove Quantization</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {GROOVE_FEELS.map(tag => (
                <Tag key={tag.id} label={tag.label} active={state.grooveFeel === tag.id} onClick={() => update('grooveFeel', state.grooveFeel === tag.id ? '' : tag.id)} />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-ink-700/40 pt-4">
          <button
            type="button"
            onClick={() => update('endTrack', !state.endTrack)}
            className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${state.endTrack ? 'border-neon-cyan/60 bg-neon-cyan/10' : 'border-ink-700/60 bg-ink-850/50'}`}
          >
            <span>
              <span className="block text-sm text-ink-100">End Track / Resolution</span>
              <span className="block text-[11px] text-ink-400 mt-0.5">Force a clean final chord, silence, and master release</span>
            </span>
            <span className={`w-9 h-5 rounded-full p-0.5 transition ${state.endTrack ? 'bg-neon-cyan' : 'bg-ink-700'}`}>
              <span className={`block w-4 h-4 rounded-full bg-ink-50 transition-transform ${state.endTrack ? 'translate-x-4' : ''}`} />
            </span>
          </button>
          {state.endTrack && (
            <div className="flex flex-wrap gap-2 mt-3">
              {END_TRACK_TAGS.map(tag => <span key={tag} className="tag text-[10px]">{tag}</span>)}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
