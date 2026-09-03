// Tab 1: Audio Remix Studio — 2-Column Fixed Layout (Left: Controls, Right: Output Panel)

import { useState } from 'react';
import { Headphones, Music2, Zap } from 'lucide-react';
import { AudioUploadRemixSection } from '@/components/sections/AudioUploadRemixSection';
import { RemixOutputCard } from '@/components/RemixOutputCard';
import type { PromptEngine } from '@/engine/usePromptEngine';

type RemixSubTab = 'upload' | 'harmonics' | 'remix';

interface AudioRemixStudioProps {
  eng: PromptEngine;
  onJumpToLyrics?: () => void;
}

export function AudioRemixStudio({ eng, onJumpToLyrics }: AudioRemixStudioProps) {
  const [remixSubTab, setRemixSubTab] = useState<RemixSubTab>('upload');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Left Column: Sub-Tab Controls */}
      <div className="lg:col-span-8 space-y-5 min-w-0">
        {/* Sub-Tab Navigation Pills */}
        <div className="glass rounded-2xl p-3 animate-slideIn">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setRemixSubTab('upload')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                transition-all whitespace-nowrap shrink-0
                ${remixSubTab === 'upload'
                  ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 text-neon-cyan border border-neon-cyan/40'
                  : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800/60 border border-transparent'
                }
              `}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Audio Upload & Core Specs</span>
            </button>

            <button
              type="button"
              onClick={() => setRemixSubTab('harmonics')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                transition-all whitespace-nowrap shrink-0
                ${remixSubTab === 'harmonics'
                  ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 text-neon-cyan border border-neon-cyan/40'
                  : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800/60 border border-transparent'
                }
              `}
            >
              <Music2 className="w-3.5 h-3.5" />
              <span>Harmonic Map & Detection</span>
            </button>

            <button
              type="button"
              onClick={() => setRemixSubTab('remix')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                transition-all whitespace-nowrap shrink-0
                ${remixSubTab === 'remix'
                  ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 text-neon-cyan border border-neon-cyan/40'
                  : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800/60 border border-transparent'
                }
              `}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Remix Studio & MIDI Export</span>
            </button>
          </div>
        </div>

        {/* Sub-Tab Content */}
        <div className="w-full overflow-hidden">
          <AudioUploadRemixSection 
            eng={eng} 
            onJumpToLyrics={onJumpToLyrics}
            activeSubTab={remixSubTab}
          />
        </div>
      </div>

      {/* Right Column: Remix Output Card (Sticky) */}
      <div className="lg:col-span-4 space-y-4 sticky top-6 min-w-0">
        <RemixOutputCard eng={eng} />
      </div>
    </div>
  );
}
