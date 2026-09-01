// Right panel: Preset Vault (Curated + Signature Presets + Custom User Presets)

import { Bookmark, Download, Trash2, Sparkles, Folder } from 'lucide-react';
import { CURATED_PRESETS, type Preset } from '@/data/catalogs';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function PresetVault({ eng, onPresetSelect }: { eng: PromptEngine; onPresetSelect?: (preset: Preset) => void }) {
  const { userPresets, loadPreset, deletePreset, showToast } = eng;

  const exportJson = (p: Preset) => {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Preset exported');
  };

  return (
    <section className="glass rounded-2xl p-5 animate-slideIn space-y-4">
      {/* Clean Header - No sub-tabs or floating sub-labels */}
      <div className="flex items-center justify-between pb-2 border-b border-ink-800">
        <div className="flex items-center gap-3">
          <div className="sec-bar h-5 bg-gradient-to-b from-neon-amber to-neon-rose" />
          <h3 className="text-sm font-bold tracking-wide text-ink-100 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-neon-amber" />
            <span>Preset Vault</span>
          </h3>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-ink-850 text-ink-400 border border-ink-700/60">
          {CURATED_PRESETS.length + userPresets.length} Presets
        </span>
      </div>

      {/* Custom User Presets (if any saved) */}
      {userPresets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 px-1">
            <Folder className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="text-[10px] uppercase tracking-widest text-neon-cyan font-bold">Your Saved Presets</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {userPresets.map(p => (
              <PresetCard
                key={p.id}
                p={p}
                onLoad={() => (onPresetSelect ?? loadPreset)(p)}
                onExport={() => exportJson(p)}
                onDelete={() => deletePreset(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Signature & Curated Preset Cards - Expanded for Full Legibility */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 px-1">
          <Sparkles className="w-3.5 h-3.5 text-neon-amber" />
          <span className="text-[10px] uppercase tracking-widest text-ink-400 font-bold">Signature Studio Presets</span>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {CURATED_PRESETS.map(p => (
            <PresetCard
              key={p.id}
              p={p}
              onLoad={() => (onPresetSelect ?? loadPreset)(p)}
              onExport={() => exportJson(p)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
function PresetCard({
  p,
  onLoad,
  onExport,
  onDelete,
}: {
  p: Preset;
  onLoad: () => void;
  onExport: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className="group glass-soft rounded-xl p-3.5 hover:border-neon-cyan/50 hover:bg-ink-900/80 transition-all cursor-pointer border border-ink-800/80 shadow-sm"
      onClick={onLoad}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-ink-850/80 border border-ink-700/50 flex items-center justify-center text-xs shrink-0">
              {p.emoji}
            </span>
            <h4 className="text-xs font-bold text-ink-50 whitespace-normal leading-snug break-words">
              {p.name}
            </h4>
          </div>

          <p className="text-[11px] text-ink-300 leading-relaxed font-normal">
            {p.blurb}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {p.genres.map(g => (
              <span
                key={g}
                className="text-[9px] font-bold px-2 py-0.5 rounded bg-ink-800 text-ink-300 uppercase tracking-wider border border-ink-700/50"
              >
                {g}
              </span>
            ))}
            {p.subgenres?.slice(0, 2).map(sg => (
              <span
                key={sg}
                className="text-[9px] font-medium px-2 py-0.5 rounded bg-ink-850 text-ink-400 uppercase tracking-wider"
              >
                {sg}
              </span>
            ))}
            {p.bpm && (
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-neon-cyan/15 text-neon-cyan numeric border border-neon-cyan/30">
                {p.bpm} BPM
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onExport();
            }}
            className="text-ink-400 hover:text-neon-cyan p-1 rounded hover:bg-ink-800/60 transition"
            title="Export Preset JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-ink-400 hover:text-neon-rose p-1 rounded hover:bg-ink-800/60 transition"
              title="Delete Preset"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
