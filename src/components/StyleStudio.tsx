// Tab 2: Style & Presets — Organized with nested sub-tabs

import { useState } from 'react';
import { Music2, Piano, Package } from 'lucide-react';
import { GenreSection } from '@/components/sections/GenreSection';
import { ArtistArchetypeSection } from '@/components/sections/ArtistArchetypeSection';
import { InstrumentsSection } from '@/components/sections/InstrumentsSection';
import { VocalsSection } from '@/components/sections/VocalsSection';
import { MoodTempoSection } from '@/components/sections/MoodTempoSection';
import { NegativeTagsSection } from '@/components/sections/NegativeTagsSection';
import { MusicalKeysSection } from '@/components/sections/MusicalKeysSection';
import { ChordVoicingSection } from '@/components/sections/ChordVoicingSection';
import { ProductionControlsSection } from '@/components/sections/ProductionControlsSection';
import { PresetVault } from '@/components/PresetVault';
import { OutputPanel } from '@/components/OutputPanel';
import type { PromptEngine } from '@/engine/usePromptEngine';
import type { Preset } from '@/data/catalogs';

type StyleSubTab = 'genres' | 'instruments' | 'vault';

interface StyleStudioProps {
  eng: PromptEngine;
  onPresetSelect: (preset: Preset) => void;
  onEraSelect: (label: string) => boolean;
}

export function StyleStudio({ eng, onPresetSelect, onEraSelect }: StyleStudioProps) {
  const [styleSubTab, setStyleSubTab] = useState<StyleSubTab>('genres');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Left Column: Sub-Tab Controls */}
      <div className="lg:col-span-8 space-y-5 min-w-0">
        {/* Sub-Tab Navigation Pills */}
        <div className="glass rounded-2xl p-3 animate-slideIn">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setStyleSubTab('genres')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all whitespace-nowrap shrink-0
              ${styleSubTab === 'genres'
                ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 text-neon-cyan border border-neon-cyan/40'
                : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800/60 border border-transparent'
              }
            `}
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>Genre & Accents</span>
          </button>

          <button
            type="button"
            onClick={() => setStyleSubTab('instruments')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all whitespace-nowrap shrink-0
              ${styleSubTab === 'instruments'
                ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 text-neon-cyan border border-neon-cyan/40'
                : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800/60 border border-transparent'
              }
            `}
          >
            <Piano className="w-3.5 h-3.5" />
            <span>Instruments & FX</span>
          </button>

          <button
            type="button"
            onClick={() => setStyleSubTab('vault')}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all whitespace-nowrap shrink-0
              ${styleSubTab === 'vault'
                ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 text-neon-cyan border border-neon-cyan/40'
                : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800/60 border border-transparent'
              }
            `}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Preset Vault</span>
          </button>


        </div>
      </div>

      {/* Sub-Tab Content */}
      <div className="w-full overflow-hidden">
        {/* Genres Sub-Tab */}
        {styleSubTab === 'genres' && (
          <div className="space-y-5 animate-slideIn">
            <GenreSection eng={eng} />
            <ArtistArchetypeSection eng={eng} />
            <MoodTempoSection eng={eng} />
            <MusicalKeysSection eng={eng} />
            <ChordVoicingSection eng={eng} />
          </div>
        )}

        {/* Instruments & FX Sub-Tab */}
        {styleSubTab === 'instruments' && (
          <div className="space-y-5 animate-slideIn">
            <InstrumentsSection eng={eng} />
            <VocalsSection eng={eng} />
            <ProductionControlsSection 
              eng={eng} 
              onPresetSelect={onPresetSelect} 
              onEraSelect={onEraSelect} 
            />
            <NegativeTagsSection eng={eng} />
          </div>
        )}

        {/* Preset Vault Sub-Tab */}
        {styleSubTab === 'vault' && (
          <div className="animate-slideIn">
            <PresetVault eng={eng} onPresetSelect={onPresetSelect} />
          </div>
        )}
      </div>
      </div>

      {/* Right Column: Output Panel (Sticky) */}
      <div className="lg:col-span-4 space-y-4 sticky top-6 min-w-0">
        <OutputPanel eng={eng} />
      </div>
    </div>
  );
}
