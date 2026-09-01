// Audio Engine Target Switcher (Suno vs Udio vs MusicFX)

import { Radio } from 'lucide-react';
import type { PromptEngine, EngineMode } from '@/engine/usePromptEngine';

const ENGINE_OPTIONS: { id: EngineMode; label: string; description: string; color: string }[] = [
  { id: 'suno', label: 'Suno', description: '120-char tag chunks, vocal descriptors front-loaded', color: 'text-neon-cyan' },
  { id: 'udio', label: 'Udio', description: 'Negative prompts, chord cues, 30s extend tags', color: 'text-neon-rose' },
  { id: 'musicfx', label: 'MusicFX', description: 'Google MusicFX optimization mode', color: 'text-neon-lime' },
];

export function AudioEngineSwitcher({ eng }: { eng: PromptEngine }) {
  const { state, setEngineMode } = eng;

  return (
    <div className="flex items-center gap-2 px-3 py-2 glass-soft rounded-lg">
      <Radio className="w-4 h-4 text-ink-400" />
      <div className="flex gap-1">
        {ENGINE_OPTIONS.map(engine => (
          <button
            key={engine.id}
            type="button"
            onClick={() => setEngineMode(engine.id)}
            className={
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all border ' +
              (state.engineMode === engine.id
                ? `bg-ink-800 border-ink-600 ${engine.color} shadow-[0_0_8px_rgba(255,255,255,0.1)]`
                : 'bg-ink-900/50 border-ink-700/50 text-ink-400 hover:border-ink-600 hover:text-ink-300')
            }
            title={engine.description}
          >
            {engine.label}
          </button>
        ))}
      </div>
    </div>
  );
}
