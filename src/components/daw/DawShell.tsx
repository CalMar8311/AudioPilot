// AudioPilot — Dual-Deck "Wingman" DAW Rack Shell
// Icon rail toggles workspace focus (stems / harmonic / lyrics dock)
// rather than routing to separate pages.

import { useState } from 'react';
import {
  Home, Waves, SlidersHorizontal, Settings, X, FileMusic,
} from 'lucide-react';
import type { PromptEngine } from '@/engine/usePromptEngine';
import type { Preset } from '@/data/catalogs';
import { LicensingModal } from '@/components/LicensingModal';
import { Toast } from '@/components/Toast';
import { WingmanWorkspace, type WorkspaceFocus } from '@/components/daw/WingmanWorkspace';

interface DawShellProps {
  eng: PromptEngine;
  onPresetSelect: (p: Preset) => void;
  onEraSelect: (label: string) => boolean;
}

type RailAction = 'balanced' | 'stems' | 'harmonic' | 'lyrics';

export function DawShell({ eng, onPresetSelect: _onPresetSelect, onEraSelect: _onEraSelect }: DawShellProps) {
  const [workspaceFocus, setWorkspaceFocus] = useState<WorkspaceFocus>('balanced');
  const [lyricsDockOpen, setLyricsDockOpen] = useState(false);
  const [isLicensingOpen, setIsLicensingOpen] = useState(false);

  const handleRail = (id: RailAction) => {
    if (id === 'lyrics') {
      setLyricsDockOpen(o => !o);
      return;
    }
    setWorkspaceFocus(prev => (prev === id ? 'balanced' : id));
  };

  const railItems: { id: RailAction; icon: React.ReactNode; label: string }[] = [
    { id: 'stems', icon: <Waves className="w-5 h-5" />, label: 'Stem / Waveform Focus' },
    { id: 'harmonic', icon: <SlidersHorizontal className="w-5 h-5" />, label: 'Harmonic Focus' },
    { id: 'lyrics', icon: <FileMusic className="w-5 h-5" />, label: 'Lyrics & Persona Dock' },
  ];

  const activeRail: RailAction =
    lyricsDockOpen && workspaceFocus === 'balanced'
      ? 'lyrics'
      : workspaceFocus === 'stems' || workspaceFocus === 'harmonic'
        ? workspaceFocus
        : lyricsDockOpen
          ? 'lyrics'
          : 'balanced';

  return (
    <div className="fixed inset-0 bg-dock-bg flex overflow-hidden font-sans">
      <IconRail
        items={railItems}
        active={activeRail}
        lyricsOpen={lyricsDockOpen}
        onSelect={handleRail}
        onHome={() => { setWorkspaceFocus('balanced'); }}
        onSettings={() => setIsLicensingOpen(true)}
        onReset={() => eng.reset()}
      />

      <WingmanWorkspace
        key={eng.resetKey}
        eng={eng}
        workspaceFocus={workspaceFocus}
        lyricsDockOpen={lyricsDockOpen}
        onLyricsDockOpenChange={setLyricsDockOpen}
        onOpenSettings={() => setIsLicensingOpen(true)}
        onOpenStyleStudio={() => setLyricsDockOpen(true)}
      />

      <LicensingModal isOpen={isLicensingOpen} onClose={() => setIsLicensingOpen(false)} onShowToast={eng.showToast} />
      <Toast message={eng.toast} />
    </div>
  );
}

interface IconRailItem { id: RailAction; icon: React.ReactNode; label: string }

function IconRail({
  items,
  active,
  lyricsOpen,
  onSelect,
  onHome,
  onSettings,
  onReset,
}: {
  items: IconRailItem[];
  active: RailAction;
  lyricsOpen: boolean;
  onSelect: (v: RailAction) => void;
  onHome: () => void;
  onSettings: () => void;
  onReset: () => void;
}) {
  return (
    <nav className="w-14 shrink-0 flex flex-col items-center bg-dock-rail border-r border-dock-border py-3 gap-1 z-10">
      <button
        type="button"
        onClick={onHome}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all mb-2 ${
          active === 'balanced' && !lyricsOpen
            ? 'bg-neon-cyan/15 text-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.25)]'
            : 'text-ink-500 hover:text-ink-200 hover:bg-dock-hover'
        }`}
        title="Balanced workspace"
      >
        <Home className="w-5 h-5" />
      </button>

      <div className="w-6 h-px bg-dock-border mb-2" />

      {items.map(item => {
        const isActive = item.id === 'lyrics' ? lyricsOpen : active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            title={item.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-neon-cyan/15 text-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                : 'text-ink-500 hover:text-ink-200 hover:bg-dock-hover'
            }`}
          >
            {item.icon}
          </button>
        );
      })}

      <div className="flex-1" />

      <div className="w-6 h-px bg-dock-border mb-2" />

      <button
        type="button"
        onClick={onSettings}
        title="Licensing & Settings"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-500 hover:text-ink-200 hover:bg-dock-hover transition-all"
      >
        <Settings className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={onReset}
        title="Reset All"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
      >
        <X className="w-4 h-4" />
      </button>
    </nav>
  );
}
