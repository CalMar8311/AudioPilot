// AudioPilot — Dual-Deck "Wingman" DAW Rack Shell
// Visual theme: Deep matte charcoal, neon cyan (#06b6d4) + vivid magenta (#d946ef).
// Architecture: icon rail | WingmanWorkspace (header + upper deck + reharm bar +
// lower deck + collapsible Lyrics & Persona Dock) for the primary 'dock' view;
// full-screen panels for Audio Remix / Style Studio / Export.

import { useState } from 'react';
import {
  Home, LayoutGrid, Waves, SlidersHorizontal, Settings, X,
  FileMusic,
} from 'lucide-react';
import { StyleStudio } from '@/components/StyleStudio';
import { OutputPanel } from '@/components/OutputPanel';
import { AudioRemixStudio } from '@/components/AudioRemixStudio';
import type { PromptEngine } from '@/engine/usePromptEngine';
import type { Preset } from '@/data/catalogs';
import { LicensingModal } from '@/components/LicensingModal';
import { Toast } from '@/components/Toast';
import { WingmanWorkspace } from '@/components/daw/WingmanWorkspace';

// ── Icon rail view types ─────────────────────────────────────────────────────
type RailView = 'dock' | 'remix' | 'style' | 'export';

// ── Main DawShell ────────────────────────────────────────────────────────────
interface DawShellProps {
  eng: PromptEngine;
  onPresetSelect: (p: Preset) => void;
  onEraSelect: (label: string) => boolean;
}

export function DawShell({ eng, onPresetSelect, onEraSelect }: DawShellProps) {
  const [railView, setRailView] = useState<RailView>('dock');
  const [isLicensingOpen, setIsLicensingOpen] = useState(false);

  // ── RAIL ICON items ──────────────────────────────────────────────────────
  const railItems: { id: RailView; icon: React.ReactNode; label: string }[] = [
    { id: 'dock',   icon: <LayoutGrid className="w-5 h-5" />,       label: 'DAW Dock'    },
    { id: 'remix',  icon: <Waves className="w-5 h-5" />,            label: 'Audio Remix' },
    { id: 'style',  icon: <SlidersHorizontal className="w-5 h-5" />, label: 'Style Studio'},
    { id: 'export', icon: <FileMusic className="w-5 h-5" />,        label: 'Export'      },
  ];

  // ── Sub-view: when icon rail switches away from 'dock' ───────────────────
  if (railView !== 'dock') {
    return (
      <div className="fixed inset-0 bg-dock-bg flex overflow-hidden">
        {/* Icon rail */}
        <IconRail items={railItems} active={railView} onSelect={setRailView} onSettings={() => setIsLicensingOpen(true)} />

        {/* Full-screen panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mac-style title bar */}
          <TitleBar title={railItems.find(r => r.id === railView)?.label ?? 'AudioPilot'} />
          <div className="flex-1 overflow-y-auto p-6 bg-dock-bg">
            {railView === 'remix' && (
              <AudioRemixStudio key={eng.resetKey} eng={eng} />
            )}
            {railView === 'style' && (
              <StyleStudio eng={eng} onPresetSelect={onPresetSelect} onEraSelect={onEraSelect} />
            )}
            {railView === 'export' && (
              <div className="max-w-3xl mx-auto">
                <OutputPanel eng={eng} />
              </div>
            )}
          </div>
        </div>
        <LicensingModal isOpen={isLicensingOpen} onClose={() => setIsLicensingOpen(false)} onShowToast={eng.showToast} />
        <Toast message={eng.toast} />
      </div>
    );
  }

  // ── Primary dual-deck "Wingman" DAW rack ─────────────────────────────────
  return (
    <div className="fixed inset-0 bg-dock-bg flex overflow-hidden font-sans">
      {/* Icon rail */}
      <IconRail items={railItems} active={railView} onSelect={setRailView} onSettings={() => setIsLicensingOpen(true)} />

      {/* Dual-deck workspace: header + upper deck + reharm bar + lower deck + lyrics dock */}
      <WingmanWorkspace
        key={eng.resetKey}
        eng={eng}
        onOpenSettings={() => setIsLicensingOpen(true)}
        onOpenStyleStudio={() => setRailView('style')}
      />

      <LicensingModal isOpen={isLicensingOpen} onClose={() => setIsLicensingOpen(false)} onShowToast={eng.showToast} />
      <Toast message={eng.toast} />
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function TitleBar({ title, showDots }: { title: string; showDots?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-dock-rail border-b border-dock-border shrink-0">
      {showDots && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
      )}
      <span className="text-[12px] font-semibold text-ink-300 tracking-wide flex-1 text-center">
        {title}
      </span>
    </div>
  );
}

interface IconRailItem { id: RailView; icon: React.ReactNode; label: string }
function IconRail({
  items,
  active,
  onSelect,
  onSettings,
}: {
  items: IconRailItem[];
  active: RailView;
  onSelect: (v: RailView) => void;
  onSettings: () => void;
}) {
  return (
    <nav className="w-14 shrink-0 flex flex-col items-center bg-dock-rail border-r border-dock-border py-3 gap-1 z-10">
      {/* Top: Home */}
      <button
        type="button"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-500 hover:text-ink-200 hover:bg-dock-hover transition-all mb-2"
        title="Home"
      >
        <Home className="w-5 h-5" />
      </button>

      <div className="w-6 h-px bg-dock-border mb-2" />

      {/* Navigation items */}
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          title={item.label}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            active === item.id
              ? 'bg-neon-cyan/15 text-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.25)]'
              : 'text-ink-500 hover:text-ink-200 hover:bg-dock-hover'
          }`}
        >
          {item.icon}
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      <div className="w-6 h-px bg-dock-border mb-2" />

      {/* Bottom: Settings + Exit */}
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
        title="Reset All"
        className="w-10 h-10 rounded-xl flex items-center justify-center text-ink-600 hover:text-ink-400 hover:bg-dock-hover transition-all"
      >
        <X className="w-4 h-4" />
      </button>
    </nav>
  );
}
