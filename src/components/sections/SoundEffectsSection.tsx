// Sound Effects & Production Transition Triggers

import { Zap } from 'lucide-react';
import { SectionCard } from '@/components/ui';
import type { PromptEngine } from '@/engine/usePromptEngine';

const FX_TAGS = [
  { id: 'thunder', label: '[Thunder]', icon: '⚡' },
  { id: 'vinyl-crackle', label: '[Vinyl Crackle]', icon: '📀' },
  { id: 'tape-stop', label: '[Tape Stop]', icon: '⏹️' },
  { id: 'reverse-cymbal', label: '[Reverse Cymbal Riser]', icon: '🔔' },
  { id: 'applause', label: '[Applause]', icon: '👏' },
  { id: 'telephone-filter', label: '[Telephone Filter Voice]', icon: '📞' },
  { id: 'glass-break', label: '[Glass Break]', icon: '💥' },
  { id: 'wind-rush', label: '[Wind Rush]', icon: '💨' },
  { id: 'heartbeat', label: '[Heartbeat]', icon: '❤️' },
  { id: 'siren', label: '[Siren]', icon: '🚨' },
];

const TRANSITION_TAGS = [
  { id: 'riser', label: '[Transition | rising tension]', icon: '↗' },
  { id: 'breakdown', label: '[Transition | stripped breakdown]', icon: '↓' },
  { id: 'drum-fill', label: '[Transition | drum fill into chorus]', icon: '◈' },
  { id: 'harmonic-lift', label: '[Transition | harmonic lift]', icon: '♢' },
  { id: 'reverb-swell', label: '[Transition | reverb swell]', icon: '≈' },
];

export function SoundEffectsSection({ eng, onInsertTag }: { eng: PromptEngine; onInsertTag?: (tag: string) => void }) {
  const { state, insertLyricTag } = eng;
  const insert = onInsertTag ?? insertLyricTag;
  const isActive = (tag: string) => state.lyrics.includes(tag);

  return (
    <SectionCard
      title="Sound Effects & Transitions"
      icon={<Zap className="w-4 h-4" />}
      accent="rose"
    >
      <p className="text-[11px] text-ink-400 mb-3">
        Click to inject atmospheric transition effects into your lyrics at cursor position.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {FX_TAGS.map(fx => (
          <button
            key={fx.id}
            type="button"
            onClick={() => insert(fx.label)}
            className={`glass-soft rounded-lg p-2 text-center transition border group ${isActive(fx.label) ? 'border-neon-rose/70 bg-neon-rose/10' : 'border-ink-700/50 hover:bg-neon-rose/10 hover:border-neon-rose/40'}`}
            title={`Insert ${fx.label}`}
          >
            <span className="text-lg block mb-1 group-hover:scale-110 transition-transform">{fx.icon}</span>
            <span className="text-[10px] text-ink-300 block truncate">{fx.label.replace(/[\[\]]/g, '')}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-2">Transitions</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TRANSITION_TAGS.map(transition => (
            <button
              key={transition.id}
              type="button"
              onClick={() => insert(transition.label)}
              className={`glass-soft rounded-lg p-2 text-center transition border ${isActive(transition.label) ? 'border-neon-cyan/70 bg-neon-cyan/10' : 'border-ink-700/50 hover:bg-neon-cyan/10 hover:border-neon-cyan/40'}`}
              title={`Insert ${transition.label}`}
            >
              <span className="text-lg block mb-1 text-neon-cyan">{transition.icon}</span>
              <span className="text-[10px] text-ink-300 block truncate">{transition.label.replace(/[\[\]]/g, '')}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 glass-soft rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-2">How to use</p>
        <p className="text-[10px] text-ink-300">
          Place cursor in lyrics textarea, then click an FX button to insert at that position.
        </p>
      </div>
    </SectionCard>
  );
}
