// Right panel: Compiled Style Prompt output + lyrics output + copy buttons

import { useState } from 'react';
import { Copy, ClipboardList, AlertTriangle, CheckCircle2, FileText, Download, Share2, Heart, RotateCcw } from 'lucide-react';
import type { PromptEngine } from '@/engine/usePromptEngine';
import { compileNegativePrompt } from '@/engine/usePromptEngine';

function CopyButton({ text, label, onCopied }: { text: string; label: string; onCopied: () => void }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onCopied();
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); onCopied(); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
  };
  return (
    <button type="button" className="btn btn-primary !py-1.5 !text-xs" onClick={copy}>
      <Copy className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function ShareButton({ state, onShared }: { state: any; onShared: () => void }) {
  const sharePrompt = () => {
    // Encode the current state into URL parameters
    const params = new URLSearchParams();
    
    // Only include essential fields to keep URL manageable
    if (state.genres.length) params.set('g', state.genres.join(','));
    if (state.subgenres.length) params.set('sg', state.subgenres.join(','));
    if (state.instruments.length) params.set('i', state.instruments.join(','));
    if (state.vocalTypes.length) params.set('v', state.vocalTypes.join(','));
    if (state.moods.length) params.set('m', state.moods.join(','));
    if (state.bpm) params.set('bpm', state.bpm.toString());
    if (state.engineMode) params.set('engine', state.engineMode);
    if (state.duetMode) params.set('duet', '1');
    
    // Generate share URL
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?${params.toString()}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      onShared();
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      onShared();
    });
  };

  return (
    <button type="button" className="btn btn-ghost !py-1.5 !text-xs" onClick={sharePrompt}>
      <Share2 className="w-3.5 h-3.5" />
      Share Link
    </button>
  );
}

function ExportButton({ state, stylePrompt, lyrics, onExported }: { state: any; stylePrompt: string; lyrics: string; onExported: () => void }) {
  const exportPackage = () => {
    const packageData = {
      timestamp: new Date().toISOString(),
      engineMode: state.engineMode,
      stylePrompt,
      negativePrompt: compileNegativePrompt(state),
      bpm: state.bpm,
      timeFeel: state.timeFeel,
      musicalKeys: state.musicalKeys,
      chordVoicings: state.chordVoicings,
      genres: state.genres,
      subgenres: state.subgenres,
      instruments: state.instruments,
      vocalTypes: state.vocalTypes,
      lyrics,
    };

    const content = `=== AudioCopilot Export Package ===
Generated: ${new Date().toLocaleString()}
Engine Mode: ${state.engineMode.toUpperCase()}

--- STYLE PROMPT ---
${stylePrompt}

--- NEGATIVE PROMPT ---
${compileNegativePrompt(state)}

--- METADATA ---
BPM: ${state.bpm}
Time Feel: ${state.timeFeel}
Musical Keys: ${state.musicalKeys?.join(', ') || 'None'}
Chord Voicings: ${state.chordVoicings?.join(', ') || 'None'}

--- GENRES & SUBGENRES ---
Genres: ${state.genres.join(', ') || 'None'}
Subgenres: ${state.subgenres.join(', ') || 'None'}

--- INSTRUMENTS ---
${state.instruments.join(', ') || 'None'}

--- VOCAL CONFIGURATION ---
Types: ${state.vocalTypes.join(', ') || 'None'}
Effects: ${state.vocalEffects?.join(', ') || 'None'}

--- FULL LYRICS ---
${lyrics}

--- JSON DATA ---
${JSON.stringify(packageData, null, 2)}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `music-prompt-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onExported();
  };

  return (
    <button type="button" className="btn btn-ghost !py-1.5 !text-xs" onClick={exportPackage}>
      <Download className="w-3.5 h-3.5" />
      Export Package
    </button>
  );
}

export function OutputPanel({ eng }: { eng: PromptEngine }) {
  const { state, stylePrompt, meta, showToast, update, setLyricsCursor } = eng;
  const [format, setFormat] = useState<'suno-v3' | 'suno-v4' | 'udio'>('suno-v4');
  const exportMode = format === 'udio' ? 'udio' : 'suno';
  const exportedStylePrompt = eng.formatPromptForExport(stylePrompt, exportMode);
  const exportedLyrics = eng.formatLyricsForExport(state.lyrics, exportMode, state.endTrack);

  const warning = meta.sunoOver;
  const ratio = Math.min(100, (meta.chars / meta.charLimit) * 100);

  return (
    <div className="space-y-4">
      {/* Style Prompt */}
      <section className="glass rounded-2xl p-5 animate-slideIn">
        <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="sec-bar h-5 bg-gradient-to-b from-neon-cyan to-neon-blue" />
            <h3 className="text-sm font-semibold tracking-wide text-ink-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-ink-300" />
              Style Prompt
            </h3>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <ShareButton state={state} onShared={() => showToast('Share link copied')} />
            <button type="button" className="btn btn-ghost !py-1.5 !text-xs" onClick={eng.saveFavorite} title="Save to Favorites"><Heart className="w-3.5 h-3.5" /> Favorite</button>
            <ExportButton state={state} stylePrompt={exportedStylePrompt} lyrics={exportedLyrics} onExported={() => showToast('Package exported')} />
            <CopyButton text={exportedStylePrompt} label="Copy Style Prompt" onCopied={() => showToast('Style prompt copied')} />
          </div>
        </div>

        <div className="mb-2 flex min-h-8 items-center justify-between">
          <div className="flex min-w-0 items-center gap-1 rounded-lg border border-ink-700/60 bg-ink-850/60 p-1">
            <span className="shrink-0 px-1 text-[10px] text-ink-400">Format For</span>
            {(['suno-v3', 'suno-v4', 'udio'] as const).map(option => (
              <button key={option} type="button" onClick={() => setFormat(option)} className={`whitespace-nowrap rounded px-2 py-1 text-[10px] ${format === option ? 'bg-neon-cyan/15 text-neon-cyan' : 'text-ink-400 hover:text-ink-100'}`}>
                {option === 'udio' ? 'Udio' : option.replace('-', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-[156px] rounded-lg bg-ink-950/70 border border-ink-700/50 p-4">
          <textarea
            value={exportedStylePrompt}
            onChange={e => update('stylePromptOverride', e.target.value)}
            className="h-[124px] w-full overflow-auto bg-transparent text-sm text-ink-100 leading-relaxed font-mono resize-none focus:outline-none"
            placeholder="Select attributes to compile your style prompt…"
            aria-label="Editable compiled style prompt"
          />
        </div>

        {/* Token/char meter */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-widest text-ink-400">Optimization meter</span>
            <span className="numeric text-xs text-ink-200">
              {meta.chars} chars · ~{meta.tokens} tokens
            </span>
          </div>
          <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
            <div
              className={
                'h-full rounded-full transition-all duration-300 ' +
                (warning ? 'bg-gradient-to-r from-neon-rose to-neon-amber' : 'bg-gradient-to-r from-neon-cyan to-neon-blue')
              }
              style={{ width: `${ratio}%` }}
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            {warning ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-neon-amber">
                <AlertTriangle className="w-3.5 h-3.5" />
                Exceeds Suno/Udio threshold ({meta.charLimit} chars). Trim tags for best results.
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-neon-lime">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Within optimization range for Suno & Udio.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Lyrics Output */}
      <section className="glass rounded-2xl p-5 animate-slideIn">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="sec-bar h-5 bg-gradient-to-b from-neon-magenta to-neon-rose" />
            <h3 className="text-sm font-semibold tracking-wide text-ink-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-ink-300" />
              Full Lyrics & Metatag Output
            </h3>
          </div>
          <CopyButton text={exportedLyrics} label="Copy Lyrics & Bracketed Tags" onCopied={() => showToast('Lyrics & bracketed tags copied')} />
        </div>
        <div className="rounded-lg bg-ink-950/70 border border-ink-700/50 p-4 max-h-[360px] overflow-auto">
          <textarea
            value={exportedLyrics}
            onChange={e => update('lyrics', e.target.value)}
            onSelect={e => setLyricsCursor(e.currentTarget.selectionStart, e.currentTarget.value)}
            onClick={e => setLyricsCursor(e.currentTarget.selectionStart, e.currentTarget.value)}
            onKeyUp={e => setLyricsCursor(e.currentTarget.selectionStart, e.currentTarget.value)}
            className="w-full min-h-[300px] bg-transparent lyrics-textarea text-sm text-ink-200 font-mono leading-relaxed resize-y focus:outline-none"
            placeholder="Add lyrics, metatags, sound effects, or transitions…"
            aria-label="Editable full lyrics and metatag output"
          />
        </div>
      </section>


    </div>
  );
}

