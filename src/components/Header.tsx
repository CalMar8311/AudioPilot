// Top header: branding, presets dropdown, randomize, reset

import { useEffect, useRef, useState } from 'react';
import { Music4, Shuffle, RotateCcw, ChevronDown, Sparkles, Loader2, ShieldCheck } from 'lucide-react';
import { CURATED_PRESETS, GENRE_BLUEPRINTS, type Preset } from '@/data/catalogs';
import { AudioEngineSwitcher } from '@/components/AudioEngineSwitcher';
import { getCurrentLicense } from '@/services/licensingService';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function Header({
  eng,
  onReset,
  onSurprise,
  onPresetSelect,
  onOpenLicensing,
}: {
  eng: PromptEngine;
  onReset?: () => void;
  onSurprise?: () => void;
  onPresetSelect?: (preset: Preset) => void;
  onOpenLicensing?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { loadPreset, applyBlueprint, surpriseMe, surprising } = eng;
  const license = getCurrentLicense();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <header className="sticky top-0 z-30 glass !rounded-none border-x-0 border-t-0 w-full">
      <div className="w-full py-3 flex items-center justify-between gap-3">
        {/* Branding */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-blue flex items-center justify-center shadow-glow">
            <Music4 className="w-5 h-5 text-ink-950" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-neon-magenta animate-pulseGlow" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-ink-50 tracking-tight leading-none flex items-center gap-1.5">
              <span>AudioCopilot</span>
              {license.tier !== 'free' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-neon-cyan to-neon-blue text-ink-950 uppercase tracking-widest shadow-glow">
                  PRO
                </span>
              )}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-ink-400 mt-0.5 truncate">
              AI Music &amp; Remix Assistant · Suno AI &amp; FL Studio
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <AudioEngineSwitcher eng={eng} />

          {/* License Badge Button */}
          <button
            type="button"
            onClick={onOpenLicensing}
            className={`btn btn-ghost !py-1.5 !px-2.5 !text-xs border flex items-center gap-1.5 ${
              license.tier === 'studio'
                ? 'border-neon-amber/60 text-neon-amber bg-neon-amber/10 shadow-glow'
                : license.tier === 'pro'
                ? 'border-neon-cyan/60 text-neon-cyan bg-neon-cyan/10 shadow-glow'
                : 'border-ink-700/60 text-ink-300 hover:border-neon-cyan/40 hover:text-neon-cyan'
            }`}
            title="Open Licensing & Commercial Rights Hub"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-bold uppercase tracking-wider text-[10px]">
              {license.tier.toUpperCase()}
            </span>
          </button>

          {/* Presets dropdown */}
          <div className="relative" ref={ref}>
            <button
              type="button"
              className="btn btn-ghost !text-xs sm:!text-sm"
              onClick={() => setOpen(o => !o)}
            >
              <Sparkles className="w-4 h-4 text-neon-cyan" />
              <span className="hidden sm:inline">Presets</span>
              <ChevronDown className={'w-3.5 h-3.5 transition ' + (open ? 'rotate-180' : '')} />
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-72 glass rounded-xl p-2 z-40 animate-slideIn max-h-[60vh] overflow-auto">
                <p className="text-[10px] uppercase tracking-widest text-ink-400 px-2 py-1">Genre Blueprints</p>
                {GENRE_BLUEPRINTS.map(bp => (
                  <button
                    key={bp.id}
                    type="button"
                    onClick={() => { applyBlueprint(bp); setOpen(false); }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-neon-cyan/10 transition flex items-center gap-2"
                  >
                    <span className="text-base">{bp.emoji}</span>
                    <span className="min-w-0">
                      <span className="block text-sm text-ink-100 truncate">{bp.name}</span>
                      <span className="block text-[10px] text-ink-400 truncate">{bp.blurb}</span>
                    </span>
                  </button>
                ))}
                <div className="my-1 border-t border-ink-700/40" />
                <p className="text-[10px] uppercase tracking-widest text-ink-400 px-2 py-1">Signature Presets</p>
                {CURATED_PRESETS.filter(p => p.category !== 'vintage').map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { (onPresetSelect ?? loadPreset)(p); setOpen(false); }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-neon-cyan/10 transition flex items-center gap-2"
                  >
                    <span className="text-base">{p.emoji}</span>
                    <span className="min-w-0">
                      <span className="block text-sm text-ink-100 truncate">{p.name}</span>
                      <span className="block text-[10px] text-ink-400 truncate">{p.blurb}</span>
                    </span>
                  </button>
                ))}
                <div className="my-1 border-t border-ink-700/40" />
                <p className="text-[10px] uppercase tracking-widest text-ink-400 px-2 py-1">Decades &amp; Vintage Eras</p>
                {CURATED_PRESETS.filter(p => p.category === 'vintage').map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { (onPresetSelect ?? loadPreset)(p); setOpen(false); }}
                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-neon-cyan/10 transition flex items-center gap-2"
                  >
                    <span className="text-base">{p.emoji}</span>
                    <span className="min-w-0">
                      <span className="block text-sm text-ink-100 truncate">{p.name}</span>
                      <span className="block text-[10px] text-ink-400 truncate">{p.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-ghost !text-xs sm:!text-sm disabled:opacity-60"
            onClick={() => (onSurprise ?? surpriseMe)()}
            disabled={surprising}
            title="AI-powered contextual surprise — picks a genre, generates a theme, and configures everything"
          >
            {surprising ? <Loader2 className="w-4 h-4 text-neon-magenta animate-spin" /> : <Shuffle className="w-4 h-4 text-neon-magenta" />}
            <span className="hidden sm:inline">{surprising ? 'Surprising…' : 'Surprise Me'}</span>
          </button>

          <button
            type="button"
            className="btn btn-danger !text-xs sm:!text-sm"
            onClick={onReset ?? eng.reset}
            title="Clear all selections and return to a blank canvas"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset All</span>
          </button>
        </div>
      </div>
    </header>
  );
}
