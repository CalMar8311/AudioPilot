// Tab 4 Component: Export History & Prompt Persistence Shelf

import { useState } from 'react';
import { Clock3, Save, Bookmark, Trash2 } from 'lucide-react';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function ExportHistory({ eng }: { eng: PromptEngine }) {
  const [presetName, setPresetName] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyTab, setHistoryTab] = useState<'history' | 'favorites'>('history');

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) {
      eng.showToast('Enter a preset name first');
      return;
    }
    eng.savePreset(name);
    setPresetName('');
    setSaving(false);
  };

  return (
    <section className="glass rounded-2xl p-5 animate-slideIn space-y-4">
      {/* Save Actions Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-ink-800">
        <div className="flex items-center gap-3">
          <div className="sec-bar h-5 bg-gradient-to-b from-neon-cyan to-neon-blue" />
          <h3 className="text-sm font-bold tracking-wide text-ink-100 flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-neon-cyan" />
            <span>Save &amp; Prompt History</span>
          </h3>
        </div>
      </div>

      {/* Save Controls */}
      <div className="glass-soft rounded-xl p-3 border border-ink-800">
        {!saving ? (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setSaving(true)}
              className="btn btn-ghost !py-1.5 !px-3 !text-xs border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10 flex-1 flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Current as Preset</span>
            </button>
            <button
              type="button"
              onClick={() => eng.pushHistory()}
              className="btn btn-ghost !py-1.5 !px-3 !text-xs border border-ink-700 text-ink-200 hover:text-neon-cyan flex-1 flex items-center justify-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5 text-neon-cyan" />
              <span>Save to History Shelf</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSavePreset();
                if (e.key === 'Escape') setSaving(false);
              }}
              placeholder="Enter preset title..."
              className="flex-1 bg-ink-950 border border-ink-700 rounded-lg px-3 py-1.5 text-xs text-ink-100 focus:border-neon-cyan outline-none"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="btn btn-primary !py-1.5 !px-3 !text-xs"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setSaving(false)}
              className="btn btn-ghost !py-1.5 !px-3 !text-xs text-ink-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* History & Favorites Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-ink-800 pb-2">
          <div className="flex items-center gap-1 bg-ink-900 border border-ink-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setHistoryTab('history')}
              className={`px-3 py-1 text-xs rounded-md transition-all font-bold ${
                historyTab === 'history' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              Recent History ({eng.recentPrompts.length})
            </button>
            <button
              type="button"
              onClick={() => setHistoryTab('favorites')}
              className={`px-3 py-1 text-xs rounded-md transition-all font-bold ${
                historyTab === 'favorites' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              Favorites ({eng.favorites.length})
            </button>
          </div>

          {historyTab === 'history' && eng.recentPrompts.length > 0 && (
            <button
              type="button"
              onClick={eng.clearRecentPrompts}
              className="text-[10px] text-ink-400 hover:text-neon-rose font-medium"
            >
              Clear History Shelf
            </button>
          )}

        {/* List Content */}
        {historyTab === 'history' ? (
          eng.recentPrompts.length === 0 ? (
            <p className="text-[11px] text-ink-500 italic py-4 text-center bg-ink-950/40 rounded-xl border border-ink-800">
              No recent prompts saved. Generate or click "Save to History Shelf" above.
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {eng.recentPrompts.map(snapshot => (
                <div
                  key={snapshot.id}
                  className="glass-soft rounded-xl p-3 hover:border-neon-cyan/40 transition flex items-center justify-between gap-3 border border-ink-800/80"
                >
                  <button
                    type="button"
                    onClick={() => eng.loadSnapshot(snapshot)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-100 truncate">
                        {snapshot.state.genres.join(', ') || 'Custom Recipe'}
                      </span>
                      {snapshot.state.bpm && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-neon-cyan/15 text-neon-cyan numeric">
                          {snapshot.state.bpm} BPM
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-ink-400 truncate mt-0.5">
                      {snapshot.stylePrompt || 'Style prompt generated'}
                    </p>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => eng.loadSnapshot(snapshot)}
                      className="btn btn-ghost !py-1 !px-2 !text-[10px] text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/10"
                    >
                      Reload
                    </button>
                    <button
                      type="button"
                      onClick={() => eng.deleteRecentPrompt(snapshot.id)}
                      className="text-ink-400 hover:text-neon-rose p-1 rounded hover:bg-ink-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : eng.favorites.length === 0 ? (
          <p className="text-[11px] text-ink-500 italic py-4 text-center bg-ink-950/40 rounded-xl border border-ink-800">
            No favorite prompts saved yet. Click "Favorite" in the Output Panel to pin prompts.
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {eng.favorites.map(snapshot => (
              <div
                key={snapshot.id}
                className="glass-soft rounded-xl p-3 hover:border-neon-cyan/40 transition flex items-center justify-between gap-3 border border-ink-800/80"
              >
                <button
                  type="button"
                  onClick={() => eng.loadSnapshot(snapshot)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink-100 truncate">
                      {snapshot.state.genres.join(', ') || 'Favorite Prompt'}
                    </span>
                    {snapshot.state.bpm && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-neon-cyan/15 text-neon-cyan numeric">
                        {snapshot.state.bpm} BPM
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-ink-400 truncate mt-0.5">
                    {snapshot.stylePrompt || 'Style prompt saved'}
                  </p>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => eng.loadSnapshot(snapshot)}
                    className="btn btn-ghost !py-1 !px-2 !text-[10px] text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/10"
                  >
                    Reload
                  </button>
                  <button
                    type="button"
                    onClick={() => eng.deleteFavorite(snapshot.id)}
                    className="text-ink-400 hover:text-neon-rose p-1 rounded hover:bg-ink-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </section>
  );
}