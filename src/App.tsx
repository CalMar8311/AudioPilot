import { useState } from 'react';
import { Sliders, FileText, Radio, Share2, Copy } from 'lucide-react';
import { Header } from '@/components/Header';
import { Toast } from '@/components/Toast';
import { OutputPanel } from '@/components/OutputPanel';
import { PresetVault } from '@/components/PresetVault';
import { LicensingModal } from '@/components/LicensingModal';
import { GenreSection } from '@/components/sections/GenreSection';
import { ArtistArchetypeSection } from '@/components/sections/ArtistArchetypeSection';
import { InstrumentsSection } from '@/components/sections/InstrumentsSection';
import { VocalsSection } from '@/components/sections/VocalsSection';
import { MoodTempoSection } from '@/components/sections/MoodTempoSection';
import { NegativeTagsSection } from '@/components/sections/NegativeTagsSection';
import { MusicalKeysSection } from '@/components/sections/MusicalKeysSection';
import { ChordVoicingSection } from '@/components/sections/ChordVoicingSection';
import { SoundEffectsSection } from '@/components/sections/SoundEffectsSection';
import { SectionArrangementBuilder } from '@/components/sections/SectionArrangementBuilder';
import { AudioUploadRemixSection } from '@/components/sections/AudioUploadRemixSection';
import { LyricGeneratorSection } from '@/components/sections/LyricGeneratorSection';
import { ProductionControlsSection } from '@/components/sections/ProductionControlsSection';
import { normalizePromptState, usePromptEngine } from '@/engine/usePromptEngine';
import { applySurpriseRecipeToState, pickRandomSurpriseRecipe } from '@/data/surpriseMe';
import type { Preset } from '@/data/catalogs';

type Tab = 'style' | 'lyrics' | 'remix' | 'export';

function App() {
  const eng = usePromptEngine();
  const [activeTab, setActiveTab] = useState<Tab>('remix');
  const [isLicensingOpen, setIsLicensingOpen] = useState(false);

  const handlePresetSelect = (preset: Preset) => {
    eng.loadPreset(preset);
  };

  const handleEraSelect = (label: string) => eng.applyMicroGenreRecipe(label);

  const handleSurprise = () => {
    const recipe = pickRandomSurpriseRecipe();
    const nextState = applySurpriseRecipeToState(eng.state, recipe);
    eng.setState(normalizePromptState({ ...nextState, stylePromptOverride: '' }));
    eng.setSurpriseTheme({
      theme: recipe.theme,
      structureId: recipe.structureId,
      rhymeScheme: recipe.rhymeScheme,
    });
    eng.showToast(`Surprise! ${recipe.label}`);
  };

  const copyPromptQuick = async () => {
    try {
      await navigator.clipboard.writeText(eng.stylePrompt);
      eng.showToast('Style prompt copied to clipboard!');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = eng.stylePrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      eng.showToast('Style prompt copied to clipboard!');
    }
  };

  const copyLyricsQuick = async () => {
    const lyricsText = eng.state.lyrics.trim() || '[Intro]\n\n[Verse]\n\n[Chorus]\n\n[Outro]\n[End]';
    try {
      await navigator.clipboard.writeText(lyricsText);
      eng.showToast('Lyrics copied to clipboard!');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = lyricsText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      eng.showToast('Lyrics copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center studio-bg studio-grid relative overflow-x-hidden pb-20">
      <div className="w-full max-w-5xl px-4 sm:px-6 py-6 space-y-6">
        <Header
          eng={eng}
          onReset={eng.reset}
          onSurprise={handleSurprise}
          onPresetSelect={handlePresetSelect}
          onOpenLicensing={() => setIsLicensingOpen(true)}
        />

        {/* Horizontal Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 p-1 rounded-xl mb-6 gap-2">
          <button 
            type="button"
            onClick={() => setActiveTab('remix')} 
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'remix' ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            1. Audio Remix
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('style')} 
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'style' ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            2. Style &amp; Presets
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('lyrics')} 
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'lyrics' ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            3. Lyric Canvas
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('export')} 
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'export' ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            4. Export &amp; History
          </button>
        </div>

        {/* Active Tab Panels — Kept mounted with CSS visibility for state persistence */}
        <main className="w-full">
          {/* TAB 1: Audio Remix */}
          <section className={activeTab === 'remix' ? 'space-y-6 block' : 'hidden'}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
              <div className="lg:col-span-8 space-y-5 min-w-0">
                <AudioUploadRemixSection eng={eng} onJumpToLyrics={() => setActiveTab('lyrics')} />
              </div>

              <div className="lg:col-span-4 space-y-4 sticky top-6 min-w-0">
                <OutputPanel eng={eng} />
              </div>
            </div>
          </section>

          {/* TAB 2: Style & Presets — Preset Vault renders exclusively here */}
          <section className={activeTab === 'style' ? 'space-y-6 block' : 'hidden'}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
              <div className="lg:col-span-8 space-y-5 min-w-0">
                <GenreSection eng={eng} />
                <ArtistArchetypeSection eng={eng} />
                <InstrumentsSection eng={eng} />
                <VocalsSection eng={eng} />
                <MoodTempoSection eng={eng} />
                <NegativeTagsSection eng={eng} />
                <MusicalKeysSection eng={eng} />
                <ChordVoicingSection eng={eng} />
                <ProductionControlsSection eng={eng} onPresetSelect={handlePresetSelect} onEraSelect={handleEraSelect} />
              </div>

              <div className="lg:col-span-4 space-y-4 sticky top-6 min-w-0">
                <PresetVault eng={eng} onPresetSelect={handlePresetSelect} />
              </div>
            </div>
          </section>

          {/* TAB 3: Lyric Canvas */}
          <section className={activeTab === 'lyrics' ? 'space-y-6 block' : 'hidden'}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
              <div className="lg:col-span-8 space-y-5 min-w-0">
                <SectionArrangementBuilder eng={eng} />
                <SoundEffectsSection eng={eng} onInsertTag={eng.insertLyricTag} />
                <LyricGeneratorSection eng={eng} />
              </div>

              <div className="lg:col-span-4 space-y-4 sticky top-6 min-w-0">
                <OutputPanel eng={eng} />
              </div>
            </div>
          </section>

          {/* TAB 4: Export & History */}
          <section className={activeTab === 'export' ? 'space-y-6 block' : 'hidden'}>
            <div className="w-full max-w-4xl mx-auto space-y-5 min-w-0">
              <OutputPanel eng={eng} />
            </div>
          </section>

          <footer className="mt-8 pb-4 text-center">
            <p className="text-[11px] text-ink-500">
              AudioCopilot — AI Music &amp; Remix Assistant for Suno, Udio &amp; DAWs (FL Studio). Compiled locally in your browser.
            </p>
          </footer>
        </main>
      </div>
      {/* Persistent Bottom Quick-Action Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-ink-950/90 border-t border-ink-700/60 backdrop-blur-lg px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-ink-300 hidden sm:inline">Engine Target:</span>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40">
              {eng.state.engineMode}
            </span>
            <span className="text-[11px] text-ink-400 truncate hidden md:inline">
              {eng.stylePrompt ? eng.stylePrompt.slice(0, 50) + '…' : 'Canvas initialized'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyPromptQuick}
              className="btn btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1.5 shadow-glow"
              title="Quick Copy compiled Style Prompt"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Prompt</span>
            </button>

            <button
              type="button"
              onClick={copyLyricsQuick}
              className="btn bg-gradient-to-r from-neon-magenta to-neon-rose text-ink-950 font-semibold hover:brightness-110 !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
              title="Quick Copy Lyrics"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Lyrics</span>
            </button>
          </div>
        </div>
      </div>

      <LicensingModal
        isOpen={isLicensingOpen}
        onClose={() => setIsLicensingOpen(false)}
        onShowToast={eng.showToast}
      />
      <Toast message={eng.toast} />
    </div>
  );
}

export default App;
