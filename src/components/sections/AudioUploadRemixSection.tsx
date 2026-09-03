// Audio Upload & Remix Engine using Gemini Multimodal Audio API (gemini-2.5-flash)

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Upload, Music, RefreshCw, Copy, FileAudio, Trash2, Sparkles, Clock, Wand2, Zap, CheckCircle2, Sliders, Layers } from '@/components/ui';
import { RemixDirectionCard } from '@/components/RemixDirectionCard';
import { UploadedTrackBadgeCard } from '@/components/UploadedTrackBadgeCard';
import { AudioMidiExtractorPanel } from '@/components/AudioMidiExtractorPanel';
import { analyzeAudioWithGemini, AudioAnalysisResult, RemixDirection } from '@/services/geminiAudio';
import { generateRemixDirections } from '@/engine/remixEngine';
import { cleanLyricText } from '@/engine/lyricEngine';
import { detectBpmFromAudioFile, normalizeBpmWithRange, BpmDetectionRange } from '@/utils/bpmDetector';
import type { PromptEngine, PromptSnapshot } from '@/engine/usePromptEngine';

export function AudioUploadRemixSection({
  eng,
  onJumpToLyrics,
  activeSubTab = 'upload',
}: {
  eng: PromptEngine;
  onJumpToLyrics?: () => void;
  activeSubTab?: 'upload' | 'harmonics' | 'remix';
}) {
const { isRecording, recordingTime, startMicRecording, startSystemRecording, stopRecording } = useAudioRecorder();   
  state,
  update,
  showToast,
  addRecentPrompt,
  pushHistory,
  loadSnapshot,
} = eng;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleRerollRemixes = () => {
    if (!analysis) return;
    const nextReroll = rerollCount + 1;
    setRerollCount(nextReroll);
    const newDirections = generateRemixDirections(
      { name: audioState.fileName || 'reference_track.mp3', size: audioState.fileSize || 1024 * 1024 * 3 },
      analysis.detectedBpm,
      analysis.detectedKey,
      nextReroll
    );
    setAudioAnalysis({ ...analysis, remixDirections: newDirections });
    setSelectedDirectionId(null);
    showToast('🎲 Generated 3 fresh remix concepts!');
  };

  const processAudioFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|flac|ogg)$/i)) {
      showToast('Please upload a valid .mp3 or .wav audio reference track');
      return;
    }

    setAudioFile(file);
    setAudioIsAnalyzing(true);
    setSelectedDirectionId(null);

    try {
      const result = await analyzeAudioWithGemini(file);
      setAudioAnalysis(result);
      showToast('Audio signature & 3 Suno remix directions generated successfully!');
    } catch {
      showToast('Error analyzing audio track');
      setAudioIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processAudioFile(files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAudioFile(e.dataTransfer.files[0]);
    }
  };

  const applyAudioSignature = () => {
    if (!analysis) return;
    update('bpm', analysis.detectedBpm);
    update('musicalKeys', [analysis.detectedKey]);
    if (analysis.vocalTimbre) {
      update('vocalTimbre', analysis.vocalTimbre);
    }
    if (analysis.chordProgression) {
      const chords = analysis.chordProgression.split(/[-–—→,]/).map(c => c.trim()).filter(Boolean);
      for (const chord of chords) {
        if (!state.chordVoicings.includes(chord)) {
          toggleArray('chordVoicings', chord);
        }
      }
    }
    showToast('Applied detected BPM, Key, Vocal Timbre & Chord Voicings to studio builder!');
  };

  const handleCopyChord = async (chord: string, roman?: string) => {
    try {
      const textToCopy = roman ? `${chord} (${roman})` : chord;
      await navigator.clipboard.writeText(textToCopy);
      if (!state.chordVoicings.includes(chord)) {
        toggleArray('chordVoicings', chord);
        showToast(`Copied ${textToCopy} to clipboard & added ${chord} to chord voicings!`);
      } else {
        showToast(`Copied ${textToCopy} to clipboard!`);
      }
    } catch {
      showToast(`Selected chord: ${chord}`);
    }
  };

  const handleInjectHarmonicTag = (tag: string) => {
    insertLyricTag(tag);
    showToast(`Injected ${tag} into Lyric Canvas!`);
  };

  const handleUpdateBpm = (newBpm: number) => {
    if (!analysis) return;
    const newDirections = generateRemixDirections(
      { name: audioState.fileName || 'reference_track.mp3', size: audioState.fileSize || 1024 * 1024 * 3 },
      newBpm,
      analysis.detectedKey,
      rerollCount
    );
    setAudioAnalysis({
      ...analysis,
      detectedBpm: newBpm,
      exactBpm: newBpm,
      remixDirections: newDirections,
    });
    update('bpm', newBpm);
    showToast(`Updated BPM to ${newBpm} & recalculated 3 remix cards!`);
  };

  const handleUpdateBpmRange = async (range: BpmDetectionRange) => {
    if (!analysis) return;
    if (audioFile) {
      const beatRes = await detectBpmFromAudioFile(audioFile, range);
      handleUpdateBpm(beatRes.bpm);
      showToast(`Applied FL Studio ${range.toUpperCase()} range: ${beatRes.bpm} BPM (${beatRes.exactBpm.toFixed(1)})`);
    } else {
      const normalized = normalizeBpmWithRange(analysis.detectedBpm, range);
      handleUpdateBpm(normalized.bpm);
    }
  };

  const handleApplyRemixDirection = (direction: RemixDirection) => {
    setSelectedDirectionId(direction.id);

    // 1. Select Genre & Subgenre
    update('genres', [direction.genre]);
    if (direction.subgenre) {
      update('subgenres', [direction.subgenre]);
    }

    // 2. Apply Target Artist Timbre / Vocal Archetype
    if (direction.vocalTimbre) {
      update('vocalTimbre', direction.vocalTimbre);
    }
    if (direction.vocalArchetype) {
      update('artistArchetypes', [direction.vocalArchetype]);
    }

    // 3. Update BPM & Key
    update('bpm', direction.bpm);
    update('musicalKeys', [direction.key]);

    // 4. Auto-fill Style Prompt & Exclude Styles boxes
    update('stylePromptOverride', direction.stylePrompt);
    if (direction.negativeTags && direction.negativeTags.length > 0) {
      update('negativeTags', direction.negativeTags);
    }

    // 5. Sync Paired Narrative Theme & Generate Lyrical Narrative Content
    const narrativeThemePrompt = direction.narrativeThemePrompt || direction.narrativeConcept || direction.title;
    const generatedLyrics = cleanLyricText(
      direction.lyrics ||
      `[Intro]\n${direction.description}\n\n[Verse 1]\nWalking through the city under night lights\nChasing after dreams beyond the heights\n\n[Chorus]\n${direction.title} taking control tonight\nFeel the new rhythm rising clear and bright\n\n[Outro]\nFading into the horizon`
    );

    // Set active narrative theme in lyric engine
    setSurpriseTheme({
      theme: narrativeThemePrompt,
      structureId: 'standard-pop',
      rhymeScheme: 'ABAB',
      lyricMetatags: generatedLyrics,
    });

    // Populate verses, choruses, and Suno bracketed tags directly into Lyric Canvas state
    update('lyrics', generatedLyrics);

    // Push snapshot to history
    addRecentPrompt(generatedLyrics);
    pushHistory();

    showToast('Remix applied: Style updated & new lyrics generated!');
  };

  const copyCardStylePrompt = async (direction: RemixDirection) => {
    try {
      await navigator.clipboard.writeText(direction.stylePrompt);
      showToast(`Copied Style Prompt for "${direction.title}"!`);
    } catch {
      showToast('Copied Style Prompt to clipboard!');
    }
  };

  const copyCardLyricsAndTags = async (direction: RemixDirection) => {
    const textToCopy = direction.lyrics || '[Intro]\n\n[Verse]\n\n[Chorus]\n\n[Outro]';
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast(`Copied Lyrics & Bracketed Tags for "${direction.title}"!`);
    } catch {
      showToast('Copied Lyrics & Bracketed Tags to clipboard!');
    }
  };

  const copyGlobalStylePrompt = async () => {
    try {
      await navigator.clipboard.writeText(stylePrompt);
      showToast('Global style prompt copied!');
    } catch {
      showToast('Global style prompt copied!');
    }
  };

  const copyGlobalLyricsAndTags = async () => {
    const text = state.lyrics.trim() || '[Intro]\n\n[Beat Drop]\n\n[Verse]\n\n[Breakdown]\n\n[Chorus]\n\n[Outro]';
    try {
      await navigator.clipboard.writeText(text);
      showToast('Global lyrics & bracketed tags copied!');
    } catch {
      showToast('Global lyrics & bracketed tags copied!');
    }
  };

  const handleRemoveTrack = () => {
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showToast('Uploaded reference track removed.');
  };

  const handleReplaceTrack = () => {
    fileInputRef.current?.click();
  };

  return (
    <SectionCard title="Audio Reference & Remix Engine" icon={<FileAudio className="w-4 h-4" />} accent="cyan">
      <div className="space-y-5">
        <p className="text-[11px] text-ink-400">
          Upload reference audio (.mp3, .wav) to analyze acoustic characteristics (BPM, Key, Vocal Timbre, Instrumentation, Core Mood) and generate 3 interactive Suno remix direction cards.
        </p>

        {/* Hidden File Input always available for Replace Track */}
        <input ref={fileInputRef} type="file" accept="audio/mp3,audio/wav,audio/*" onChange={handleFileChange} className="hidden" />

        {/* File Dropzone or Uploaded Reference Track Card */}
        {!audioUrl ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all group ${
              isDragging
                ? 'border-neon-cyan bg-neon-cyan/10 scale-[1.01]'
                : 'border-ink-700/70 hover:border-neon-cyan/60 bg-ink-950/40 hover:bg-neon-cyan/5'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-neon-cyan/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-100">
                  Drag &amp; Drop audio reference track (.mp3, .wav) or click to browse
                </p>
                <p className="text-[10px] text-ink-400 mt-0.5">Supports MP3 and WAV files</p>
              </div>
            </div>
          </div>
        ) : (
          <UploadedTrackBadgeCard
            fileName={audioFile?.name || 'Uploaded Reference Track'}
            fileSize={audioFile?.size || 0}
            audioUrl={audioUrl}
            isAnalyzing={isAnalyzing}
            analysis={analysis}
            onReplace={handleReplaceTrack}
            onRemove={handleRemoveTrack}
            onApplySignature={applyAudioSignature}
            onCopyChord={handleCopyChord}
            onInjectHarmonicMovement={handleInjectHarmonicTag}
            onUpdateBpm={handleUpdateBpm}
            onUpdateBpmRange={handleUpdateBpmRange}
          />
        )}

        {/* FL Studio Audio-to-MIDI Stem Extractor Panel */}
        {audioFile && (
          <AudioMidiExtractorPanel
            audioFile={audioFile}
            analysis={analysis}
            onShowToast={showToast}
            onInjectLyricTag={insertLyricTag}
          />
        )}
        {/* 3 Interactive Remix Direction Cards Section */}
        {analysis && (
          <div className="space-y-3 border-t border-ink-700/40 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-neon-magenta" />
                <h4 className="text-xs font-bold text-ink-100 uppercase tracking-wider">
                  3 Interactive Suno Remix Direction Cards
                </h4>
              </div>

              <button
                type="button"
                onClick={handleRerollRemixes}
                className="btn btn-ghost !py-1 !px-2.5 !text-xs font-semibold border border-neon-cyan/40 hover:border-neon-cyan text-neon-cyan bg-neon-cyan/5 hover:bg-neon-cyan/15 flex items-center gap-1.5 transition rounded-lg shadow-sm"
                title="Generate 3 fresh remix concepts for this track"
              >
                <span>🎲 Reroll Remixes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {analysis.remixDirections.map((dir, idx) => (
                <RemixDirectionCard
                  key={dir.id}
                  dir={dir}
                  idx={idx}
                  isSelected={selectedDirectionId === dir.id}
                  onApply={handleApplyRemixDirection}
                  onCopyStyle={copyCardStylePrompt}
                  onCopyLyrics={copyCardLyricsAndTags}
                  onJumpToLyrics={onJumpToLyrics}
                  onInjectHarmonicMetatag={(dir) => handleInjectHarmonicTag(dir.harmonicMetatag || `[Harmonic Movement: ${dir.romanProgression || 'i - iv - VII - III'}]`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Global One-Click Suno Export Actions Bar */}
        <div className="border-t border-ink-700/40 pt-3">
          <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-2 font-semibold">One-Click Suno Export Actions</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copyGlobalStylePrompt}
              className="btn btn-primary !py-2 !text-xs flex items-center justify-center gap-2"
              title="Copy compiled style prompt to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Active Style Prompt
            </button>

            <button
              type="button"
              onClick={copyGlobalLyricsAndTags}
              className="btn bg-gradient-to-r from-neon-magenta to-neon-rose text-ink-950 font-semibold hover:brightness-110 !py-2 !text-xs flex items-center justify-center gap-2"
              title="Copy lyrics with bracketed tags ([Intro], [Verse], [Chorus], [Outro]) to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Active Lyrics &amp; Tags
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
