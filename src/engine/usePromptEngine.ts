// AudioCopilot — prompt state, compilation, and persistence

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GENRES, INSTRUMENTS, VOCAL_TYPES, VOCAL_TIMBRES, VOCAL_EFFECTS,
  MOOD_TAGS, PRODUCTION_TAGS, NEGATIVE_TAGS, MUSICAL_KEYS, CHORD_VOICINGS, END_TRACK_TAGS,
  MIX_SPATIAL_TAGS, TIME_SIGNATURES, GROOVE_FEELS, MICRO_GENRE_PROMPTS, MICRO_GENRE_RECIPES, MICRO_GENRES, type Preset,
  GENRE_BLUEPRINTS, type GenreBlueprint, blueprintToPreset,
  rollPreset,
} from '@/data/catalogs';
import {
  randomThemeForGenre,
  VOCAL_ARCHETYPES,
} from '@/data/lyricBanks';
import { cleanLyricText } from '@/engine/lyricEngine';
import type { AudioAnalysisResult } from '@/services/geminiAudio';
import {
  applySurpriseRecipeToState,
  pickRandomSurpriseRecipe,
} from '@/data/surpriseMe';
import {
  MAX_BLEND_SLOTS,
  compileArtistBlendPrompt,
  compileGenreBlendPrompt,
} from '@/engine/styleFusion';

const STORAGE_KEY = 'n93_prompt_state_v1';
const PRESETS_KEY = 'n93_user_presets_v1';
const HISTORY_KEY = 'n93_prompt_history_v1';
const FAVORITES_KEY = 'n93_prompt_favorites_v1';
const RECENT_KEY = 'n93_recent_prompts_v1';

export type TimeFeel = 'normal' | 'half' | 'double';

export type EngineMode = 'suno' | 'udio' | 'musicfx';

export type PromptState = {
  genres: string[];
  subgenres: string[];
  instruments: string[];
  customInstruments: string[];
  vocalTypes: string[];
  vocalTimbre: string;
  vocalEffects: string[];
  moods: string[];
  production: string[];
  negativeTags: string[];
  musicalKeys: string[];
  chordVoicings: string[];
  bpm: number | '';
  timeFeel: TimeFeel;
  blend: number; // primary genre weight 0-100
  artistArchetypes: string[];
  artistBlend: number; // primary artist-archetype weight 0-100
  lyrics: string;
  engineMode: EngineMode;
  duetMode: boolean;
  endTrack: boolean;
  timeSignature: string;
  grooveFeel: string;
  mixSpatialTags: string[];
  stylePromptOverride: string;
};

export type PromptSnapshot = {
  id: string;
  createdAt: string;
  state: PromptState;
  stylePrompt: string;
};

export type SurpriseTheme = {
  theme: string;
  structureId: string;
  rhymeScheme: string;
  lyricMetatags?: string;
};

export type AudioReferenceState = {
  audioFile: File | null;
  audioUrl: string | null;
  fileName: string;
  fileSize: number;
  isAnalyzing: boolean;
  analysis: AudioAnalysisResult | null;
  selectedDirectionId: string | null;
  rerollCount: number;
};

const knownSubgenres = new Set([
  ...GENRES.flatMap(genre => genre.subgenres),
  ...MICRO_GENRES.flatMap(group => group.options),
]);

const crowdNoiseTriggerInstruments = new Set(['live-drums', 'acoustic-drums', 'acoustic-guitar']);

function knownOnly(values: unknown, known: Set<string>): string[] {
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string' && known.has(value)) : [];
}

export function normalizePromptState(value: Partial<PromptState>): PromptState {
  const instruments = knownOnly(value.instruments, new Set(INSTRUMENTS.map(tag => tag.id)));
  const negativeTags = knownOnly(value.negativeTags, new Set(NEGATIVE_TAGS.map(tag => tag.id)));
  if (instruments.some(id => crowdNoiseTriggerInstruments.has(id)) && !negativeTags.includes('no-crowd-noise')) {
    negativeTags.push('no-crowd-noise');
  }

  return {
    ...EMPTY_STATE,
    ...value,
    bpm: typeof value.bpm === 'number' && Number.isFinite(value.bpm) ? value.bpm : '',
    genres: knownOnly(value.genres, new Set(GENRES.map(tag => tag.id))),
    subgenres: knownOnly(value.subgenres, knownSubgenres),
    instruments,
    customInstruments: Array.isArray(value.customInstruments) ? value.customInstruments.filter(item => typeof item === 'string') : [],
    vocalTypes: knownOnly(value.vocalTypes, new Set(VOCAL_TYPES.map(tag => tag.id))),
    vocalTimbre: VOCAL_TIMBRES.some(tag => tag.id === value.vocalTimbre) ? value.vocalTimbre as string : '',
    vocalEffects: knownOnly(value.vocalEffects, new Set(VOCAL_EFFECTS.map(tag => tag.id))),
    moods: knownOnly(value.moods, new Set(MOOD_TAGS.map(tag => tag.id))),
    production: knownOnly(value.production, new Set(PRODUCTION_TAGS.map(tag => tag.id))),
    negativeTags,
    musicalKeys: knownOnly(value.musicalKeys, new Set(MUSICAL_KEYS.map(tag => tag.id))),
    chordVoicings: knownOnly(value.chordVoicings, new Set(CHORD_VOICINGS.map(tag => tag.id))),
    artistArchetypes: knownOnly(value.artistArchetypes, new Set(VOCAL_ARCHETYPES.map(tag => tag.id))),
    mixSpatialTags: knownOnly(value.mixSpatialTags, new Set(MIX_SPATIAL_TAGS.map(tag => tag.id))),
    timeSignature: TIME_SIGNATURES.some(tag => tag.id === value.timeSignature) ? value.timeSignature as string : '',
    grooveFeel: GROOVE_FEELS.some(tag => tag.id === value.grooveFeel) ? value.grooveFeel as string : '',
    stylePromptOverride: typeof value.stylePromptOverride === 'string' ? value.stylePromptOverride : '',
    lyrics: typeof value.lyrics === 'string' ? cleanLyricText(value.lyrics) : '',
  };
}

export const EMPTY_STATE: PromptState = {
  genres: [],
  subgenres: [],
  instruments: [],
  customInstruments: [],
  vocalTypes: [],
  vocalTimbre: '',
  vocalEffects: [],
  moods: [],
  production: [],
  negativeTags: [],
  musicalKeys: [],
  chordVoicings: [],
  bpm: '',
  timeFeel: 'normal',
  blend: 60,
  artistArchetypes: [],
  artistBlend: 70,
  lyrics: '',
  engineMode: 'suno',
  duetMode: false,
  endTrack: false,
  timeSignature: '',
  grooveFeel: '',
  mixSpatialTags: [],
  stylePromptOverride: '',
};

// ---- Blank canvas reset state used by Reset All ----
export const DEFAULT_PRESET: PromptState = {
  ...EMPTY_STATE,
  lyrics: '',
};

const SUNO_CHAR_LIMIT = 1200;
const UDIO_CHAR_LIMIT = 400;

function loadState(): PromptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const normalized = normalizePromptState(parsed);
      const isEmptyCanvas = !normalized.genres.length && !normalized.subgenres.length && !normalized.instruments.length && !normalized.customInstruments.length && !normalized.vocalTypes.length && !normalized.vocalEffects.length && !normalized.moods.length && !normalized.production.length && !normalized.negativeTags.length && !normalized.musicalKeys.length && !normalized.chordVoicings.length && !normalized.artistArchetypes.length && !normalized.lyrics.trim();
      return isEmptyCanvas
        ? { ...normalized, bpm: '', timeSignature: '', stylePromptOverride: '' }
        : normalized;
    }
  } catch { /* noop */ }
  return { ...EMPTY_STATE };
}

function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return [];
}

function loadHistory(): PromptState[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return [];
}

function loadSnapshots(key: string): PromptSnapshot[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return [];
}

export function formatLyricsForExport(lyrics: string, mode: EngineMode, endTrack: boolean): string {
  const ending = endTrack ? '\n\n[Outro | rallentando | ritardando]\n[Big Finish | Sustained Final Chord Ring-out]\n[End]\n[Fade to Silence]' : '';
  if (mode === 'udio') return `<song>\n${lyrics}${ending}\n</song>\n[clip: continue from final bar]`;
  return `${lyrics}${ending}`;
}

export function labelFor(ids: string[], tags: { id: string; label: string }[]): string[] {
  const map = new Map(tags.map(t => [t.id, t.label]));
  return ids.map(id => map.get(id)).filter(Boolean) as string[];
}

export function promptFor(ids: string[], tags: { id: string; label: string; prompt?: string }[]): string[] {
  const map = new Map(tags.map(t => [t.id, t.prompt ?? t.label]));
  return ids.map(id => map.get(id)).filter(Boolean) as string[];
}

// Compile all selected attributes into a comma-separated style prompt
export function compileNegativePrompt(s: PromptState): string {
  const defaultUnwanted = ['crowd', 'applause', 'audience', 'cheering', 'screaming', 'live performance', 'stadium echo', 'whistle'];
  const userSelected = (s.negativeTags || []).map(id => {
    const found = NEGATIVE_TAGS.find(t => t.id === id);
    return found ? found.label.replace(/^no /, '') : id.replace(/^no-/, '').replace(/-/g, ' ');
  });
  const allNegatives = Array.from(new Set([...defaultUnwanted, ...userSelected]));
  return allNegatives.join(', ');
}

export function cleanInlineNegatives(prompt: string): string {
  return prompt
    .replace(/\[no:\s*[^\]]+\]/gi, '')
    .replace(/negative:\s*[^,]+(,\s*[^,]+)*/gi, '')
    .replace(/\bno\s+(crowd|cheering|applause|screaming|shouting|audience|live|stadium|festival|whistle|fade-out|heavy-distortion|autotune|sidechain)\b/gi, '')
    .replace(/\b(no-crowd-noise|no-screaming|no-shouting|no-harsh-vocals|no-autotune|no-fade-out|no-heavy-distortion|no-sidechain)\b/gi, '')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*,\s*|\s*,\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compileStylePrompt(s: PromptState): string {
  if (s.stylePromptOverride.trim()) {
    return cleanInlineNegatives(s.stylePromptOverride);
  }

  const hasSelections =
    s.genres.length > 0 ||
    s.subgenres.length > 0 ||
    s.instruments.length > 0 ||
    s.customInstruments.length > 0 ||
    s.vocalTypes.length > 0 ||
    Boolean(s.vocalTimbre) ||
    s.vocalEffects.length > 0 ||
    s.moods.length > 0 ||
    s.production.length > 0 ||
    s.musicalKeys.length > 0 ||
    s.chordVoicings.length > 0 ||
    s.artistArchetypes.length > 0 ||
    s.mixSpatialTags.length > 0 ||
    Boolean(s.bpm) ||
    Boolean(s.timeSignature) ||
    Boolean(s.grooveFeel) ||
    s.endTrack;

  if (!hasSelections) {
    return '';
  }

  const parts: string[] = [];

  const hasAcousticDrums = s.instruments.some(id =>
    ['live-drums', 'acoustic-drums', 'acoustic-drum-kit', 'drum-kit', 'live-drum-kit'].includes(id),
  );

  // Genres
  const genreLabels = labelFor(s.genres, GENRES);
  if (genreLabels.length) parts.push(genreLabels.join(', '));

  // Subgenres
  if (s.subgenres.length) {
    const microSubgenres = s.subgenres.filter(subgenre => MICRO_GENRE_PROMPTS[subgenre]);
    const otherSubgenres = s.subgenres.filter(subgenre => !MICRO_GENRE_PROMPTS[subgenre]);
    const activeMicroGenre = microSubgenres[microSubgenres.length - 1];
    const subgenrePrompt = [
      activeMicroGenre ? MICRO_GENRE_PROMPTS[activeMicroGenre] : '',
      ...otherSubgenres,
    ].filter(Boolean);
    if (subgenrePrompt.length) parts.push(subgenrePrompt.join(', '));
  }

  // Instruments
  const inst = labelFor(s.instruments, INSTRUMENTS);
  if (inst.length) parts.push(inst.join(', '));

  // Custom instruments
  if (s.customInstruments.length) parts.push(s.customInstruments.join(', '));

  // Vocals - front-load for Suno mode
  const vtypes = labelFor(s.vocalTypes, VOCAL_TYPES);
  const timbre = labelFor(s.vocalTimbre ? [s.vocalTimbre] : [], VOCAL_TIMBRES);
  const vfx = labelFor(s.vocalEffects, VOCAL_EFFECTS);
  const vocalControl = 'smooth melodic singing, controlled vocal delivery';
  
  if (s.engineMode === 'suno') {
    // Suno: front-load vocal descriptors
    if (hasAcousticDrums) parts.unshift(vocalControl);
    if (vtypes.length) parts.unshift(vtypes.join(', ') + ' vocals');
    if (vfx.length) parts.unshift(`${vfx.join(', ')} vocal processing`);
    if (timbre.length) parts.unshift(`${timbre[0]} vocal timbre`);
  } else {
    // Udio/MusicFX: standard placement
    if (hasAcousticDrums) parts.push(vocalControl);
    if (vtypes.length) parts.push(vtypes.join(', ') + ' vocals');
    if (vfx.length) parts.push(`${vfx.join(', ')} vocal processing`);
    if (timbre.length) parts.push(`${timbre[0]} vocal timbre`);
  }

  const moods = labelFor(s.moods, MOOD_TAGS);
  if (moods.length) parts.push(moods.join(', '));

  const prod = labelFor(s.production, PRODUCTION_TAGS);
  if (prod.length) parts.push(prod.join(', '));

  const mixSpatial = labelFor(s.mixSpatialTags, MIX_SPATIAL_TAGS);
  if (mixSpatial.length) parts.push(`mix bus: ${mixSpatial.join(', ')}`);

  const timeSignature = s.timeSignature ? labelFor([s.timeSignature], TIME_SIGNATURES) : [];
  if (timeSignature.length) parts.push(`time signature: ${timeSignature[0]}`);

  const groove = labelFor(s.grooveFeel ? [s.grooveFeel] : [], GROOVE_FEELS);
  if (groove.length) parts.push(`groove: ${groove[0]}`);

  if (s.endTrack) {
    parts.push(`ending: ${END_TRACK_TAGS.join(', ')}`);
  }

  // Musical keys & modes - enhanced for Udio
  const keys = labelFor(s.musicalKeys, MUSICAL_KEYS);
  if (keys.length) {
    if (s.engineMode === 'udio') {
      parts.push(`music theory: key ${keys.join(', ')}`);
    } else {
      parts.push(`key: ${keys.join(', ')}`);
    }
  }

  // Chord voicings - enhanced for Udio
  const chords = promptFor(s.chordVoicings, CHORD_VOICINGS);
  if (chords.length) {
    if (s.engineMode === 'udio') {
      parts.push(`chord progression: ${chords.join(', ')}`);
    } else {
      parts.push(`chords: ${chords.join(', ')}`);
    }
  }

  // Tempo with time-feel modifier
  const bpm = effectiveBpm(s.bpm, s.timeFeel);
  const feelLabel = s.timeFeel === 'half' ? 'half-time' : s.timeFeel === 'double' ? 'double-time' : '';
  if (bpm !== '') parts.push(`${bpm} BPM${feelLabel ? `, ${feelLabel}` : ''}`);

  // Deduplicate parts while retaining order
  const uniqueParts: string[] = [];
  for (const part of parts) {
    if (part && !uniqueParts.includes(part)) {
      uniqueParts.push(part);
    }
  }

  let finalPrompt = uniqueParts.join(', ');

  // Strip inline negative phrases from main style prompt string
  finalPrompt = cleanInlineNegatives(finalPrompt);

  if (s.engineMode === 'suno') {
    // Suno: break into 120-character chunks
    return chunkPrompt(finalPrompt, 120);
  } else if (s.engineMode === 'udio') {
    // Udio: add 30s extend tags for sections
    return finalPrompt + ' [extend: 30s]';
  }
  
  return finalPrompt;
}

export function formatPromptForExport(stylePrompt: string, mode: EngineMode): string {
  if (mode === 'udio') return `[STYLE]\n${stylePrompt}\n[/STYLE]\n[clip: 30s continuation]`;
  return stylePrompt;
}

function chunkPrompt(prompt: string, chunkSize: number): string {
  if (prompt.length <= chunkSize) return prompt;
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  const words = prompt.split(', ');
  for (const word of words) {
    const testChunk = currentChunk ? `${currentChunk}, ${word}` : word;
    if (testChunk.length <= chunkSize) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = word;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  
  return chunks.join(', ');
}

export function effectiveBpm(bpm: number | '', feel: TimeFeel): number | '' {
  if (bpm === '') return '';
  if (feel === 'half') return Math.round(bpm / 2);
  if (feel === 'double') return bpm * 2;
  return bpm;
}

export type PromptMeta = {
  chars: number;
  tokens: number;
  sunoOver: boolean;
  udioOver: boolean;
  charLimit: number;
};

export function promptMeta(prompt: string): PromptMeta {
  const chars = prompt.length;
  // rough token estimate: ~4 chars/token for English
  const tokens = Math.ceil(chars / 4);
  return {
    chars,
    tokens,
    sunoOver: chars > SUNO_CHAR_LIMIT,
    udioOver: chars > UDIO_CHAR_LIMIT,
    charLimit: SUNO_CHAR_LIMIT,
  };
}

export function applyPreset(p: Preset): PromptState {
  const rolledPreset = rollPreset(p);
  const resolvedPreset = rolledPreset.matchingPills
    ? {
      ...rolledPreset,
      genres: rolledPreset.matchingPills.genres,
      instruments: rolledPreset.matchingPills.instruments,
      vocalTypes: rolledPreset.matchingPills.vocalTypes,
      vocalEffects: rolledPreset.matchingPills.vocalEffects,
      moods: rolledPreset.matchingPills.moods,
      chordVoicings: rolledPreset.matchingPills.chordVoicings,
      negativeTags: rolledPreset.matchingPills.negativeTags,
    }
    : rolledPreset;
  return normalizePromptState({
    genres: [...resolvedPreset.genres],
    subgenres: [...resolvedPreset.subgenres],
    instruments: [...resolvedPreset.instruments],
    customInstruments: [...resolvedPreset.customInstruments],
    vocalTypes: [...resolvedPreset.vocalTypes],
    vocalTimbre: resolvedPreset.vocalTimbre ?? '',
    vocalEffects: [...resolvedPreset.vocalEffects],
    moods: [...resolvedPreset.moods],
    production: [...resolvedPreset.production],
    negativeTags: [...(resolvedPreset.negativeTags ?? [])],
    musicalKeys: [...(resolvedPreset.musicalKeys ?? [])],
    chordVoicings: [...(resolvedPreset.chordVoicings ?? [])],
    bpm: resolvedPreset.bpm,
    timeFeel: resolvedPreset.timeFeel,
    blend: resolvedPreset.blend,
    artistArchetypes: [...(resolvedPreset.artistArchetypes ?? [])].slice(0, MAX_BLEND_SLOTS),
    artistBlend: resolvedPreset.artistBlend ?? resolvedPreset.blend,
    lyrics: resolvedPreset.lyricMetatags?.trim() || defaultLyrics(),
    engineMode: 'suno',
    duetMode: false,
    endTrack: resolvedPreset.endTrack ?? false,
    timeSignature: resolvedPreset.timeSignature ?? '',
    grooveFeel: resolvedPreset.grooveFeel ?? '',
    mixSpatialTags: [...(resolvedPreset.mixSpatialTags ?? [])],
  });
}

export function defaultLyrics(): string {
  return [
    '[Intro]',
    '',
    '[Verse 1]',
    '',
    '[Pre-Chorus]',
    '',
    '[Chorus]',
    '',
    '[Verse 2]',
    '',
    '[Bridge]',
    '',
    '[Outro]',
    '[Fade Out]',
    '[End]',
  ].join('\n');
}

export function randomState(): PromptState {
  const pick = <T,>(arr: T[], n: number): T[] => {
    const c = [...arr].sort(() => Math.random() - 0.5);
    return c.slice(0, n);
  };
  const genres = pick(GENRES, 1 + Math.floor(Math.random() * 2)).map(g => g.id);
  const primaryGenre = GENRES.find(g => g.id === genres[0]);
  const subgenres = primaryGenre ? pick(primaryGenre.subgenres, 1) : [];
  return {
    genres,
    subgenres,
    instruments: pick(INSTRUMENTS, 2 + Math.floor(Math.random() * 3)).map(i => i.id),
    customInstruments: [],
    vocalTypes: pick(VOCAL_TYPES, 1).map(v => v.id),
    vocalTimbre: '',
    vocalEffects: pick(VOCAL_EFFECTS, 1).map(v => v.id),
    moods: pick(MOOD_TAGS, 2).map(m => m.id),
    production: pick(PRODUCTION_TAGS, 2).map(p => p.id),
    negativeTags: pick(NEGATIVE_TAGS, Math.floor(Math.random() * 2)).map(t => t.id),
    musicalKeys: pick(MUSICAL_KEYS, 1).map(k => k.id),
    chordVoicings: pick(CHORD_VOICINGS, Math.floor(Math.random() * 2)).map(c => c.id),
    bpm: 70 + Math.floor(Math.random() * 9) * 10,
    timeFeel: (['normal', 'half', 'double'] as TimeFeel[])[Math.floor(Math.random() * 3)],
    blend: 50 + Math.floor(Math.random() * 4) * 10,
    artistArchetypes: pick(VOCAL_ARCHETYPES, 1 + Math.floor(Math.random() * 2)).map(a => a.id),
    artistBlend: 55 + Math.floor(Math.random() * 3) * 10,
    lyrics: defaultLyrics(),
    engineMode: 'suno',
    duetMode: false,
    endTrack: false,
    timeSignature: '',
    grooveFeel: '',
    mixSpatialTags: [],
    stylePromptOverride: '',
  };
}

// ---- Hook ----

export function usePromptEngine() {
  const [state, setState] = useState<PromptState>(loadState);
  const [userPresets, setUserPresets] = useState<Preset[]>(loadPresets);
  const [history, setHistory] = useState<PromptState[]>(loadHistory);
  const [favorites, setFavorites] = useState<PromptSnapshot[]>(() => loadSnapshots(FAVORITES_KEY));
  const [recentPrompts, setRecentPrompts] = useState<PromptSnapshot[]>(() => loadSnapshots(RECENT_KEY));
  const [toast, setToast] = useState<string | null>(null);
  const [surpriseTheme, setSurpriseTheme] = useState<SurpriseTheme | null>(null);
  const lyricsCursor = useRef<number | null>(null);

  const [audioState, setAudioState] = useState<AudioReferenceState>({
    audioFile: null,
    audioUrl: null,
    fileName: '',
    fileSize: 0,
    isAnalyzing: false,
    analysis: null,
    selectedDirectionId: null,
    rerollCount: 0,
  });

  const setAudioFile = useCallback((file: File | null) => {
    setAudioState(prev => {
      if (prev.audioUrl && file === null) {
        URL.revokeObjectURL(prev.audioUrl);
      }
      if (!file) {
        return {
          audioFile: null,
          audioUrl: null,
          fileName: '',
          fileSize: 0,
          isAnalyzing: false,
          analysis: null,
          selectedDirectionId: null,
          rerollCount: 0,
        };
      }
      const url = URL.createObjectURL(file);
      return {
        ...prev,
        audioFile: file,
        audioUrl: url,
        fileName: file.name,
        fileSize: file.size,
        selectedDirectionId: null,
      };
    });
  }, []);

  const setAudioAnalysis = useCallback((analysis: AudioAnalysisResult | null) => {
    setAudioState(prev => ({ ...prev, analysis, isAnalyzing: false }));
  }, []);

  const setAudioIsAnalyzing = useCallback((isAnalyzing: boolean) => {
    setAudioState(prev => ({ ...prev, isAnalyzing }));
  }, []);

  const setSelectedDirectionId = useCallback((selectedDirectionId: string | null) => {
    setAudioState(prev => ({ ...prev, selectedDirectionId }));
  }, []);

  const setRerollCount = useCallback((rerollCount: number) => {
    setAudioState(prev => ({ ...prev, rerollCount }));
  }, []);

  // Persist state
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ }
  }, [state]);

  useEffect(() => {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(userPresets)); } catch { /* noop */ }
  }, [userPresets]);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 24))); } catch { /* noop */ }
  }, [history]);

  useEffect(() => {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); } catch { /* noop */ }
  }, [favorites]);

  useEffect(() => {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recentPrompts.slice(0, 10))); } catch { /* noop */ }
  }, [recentPrompts]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const update = useCallback(<K extends keyof PromptState>(key: K, value: PromptState[K]) => {
    setState(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'stylePromptOverride' ? {} : { stylePromptOverride: '' }),
    }));
  }, []);

  const setEngineMode = useCallback((mode: EngineMode) => {
    update('engineMode', mode);
    showToast(`Switched to ${mode.toUpperCase()} mode`);
  }, [update, showToast]);

  const toggleDuetMode = useCallback(() => {
    update('duetMode', !state.duetMode);
    showToast(state.duetMode ? 'Duet mode disabled' : 'Duet mode enabled');
  }, [update, showToast, state.duetMode]);

  const toggleArray = useCallback((key: keyof PromptState, id: string) => {
    const capped = key === 'genres' || key === 'artistArchetypes';
    let blocked = false;
    setState(prev => {
      const arr = (prev[key] as string[]) ?? [];
      if (arr.includes(id)) {
        return { ...prev, [key]: arr.filter(x => x !== id), stylePromptOverride: '' };
      }
      if (capped && arr.length >= MAX_BLEND_SLOTS) {
        blocked = true;
        return prev;
      }
      return normalizePromptState({ ...prev, [key]: [...arr, id], stylePromptOverride: '' });
    });
    if (blocked) {
      showToast(key === 'genres'
        ? `Fusion Mode: pick up to ${MAX_BLEND_SLOTS} genres`
        : `Blend up to ${MAX_BLEND_SLOTS} artist archetypes`);
    }
  }, [showToast]);

  const addCustomInstrument = useCallback((label: string) => {
    const clean = label.trim();
    if (!clean) return;
    setState(prev => prev.customInstruments.includes(clean)
      ? prev
      : { ...prev, customInstruments: [...prev.customInstruments, clean] });
  }, []);

  const removeCustomInstrument = useCallback((label: string) => {
    setState(prev => ({ ...prev, customInstruments: prev.customInstruments.filter(x => x !== label) }));
  }, []);

  const loadPreset = useCallback((p: Preset) => {
    setState(applyPreset(p));
    if (p.lyricTheme || p.lyricStructureId || p.lyricRhymeScheme || p.lyricMetatags) {
      setSurpriseTheme({
        theme: p.lyricTheme ?? '',
        structureId: p.lyricStructureId ?? 'standard-pop',
        rhymeScheme: p.lyricRhymeScheme ?? 'ABAB',
        lyricMetatags: p.lyricMetatags,
      });
    }
    showToast(`Loaded preset: ${p.name}`);
  }, [showToast]);

  const clearPresetSelection = useCallback((p: Preset) => {
    const matching = p.matchingPills;
    const remove = (values: string[], current: string[]) => current.filter(value => !values.includes(value));
    setState(prev => normalizePromptState({
      ...prev,
      genres: matching ? remove(matching.genres, prev.genres) : remove(p.genres, prev.genres),
      subgenres: remove(p.subgenres, prev.subgenres),
      instruments: matching ? remove(matching.instruments, prev.instruments) : remove(p.instruments, prev.instruments),
      vocalTypes: matching ? remove(matching.vocalTypes, prev.vocalTypes) : remove(p.vocalTypes, prev.vocalTypes),
      vocalEffects: matching ? remove(matching.vocalEffects, prev.vocalEffects) : remove(p.vocalEffects, prev.vocalEffects),
      moods: matching ? remove(matching.moods, prev.moods) : remove(p.moods, prev.moods),
      production: remove(p.production, prev.production),
      musicalKeys: remove(p.musicalKeys ?? [], prev.musicalKeys),
      chordVoicings: matching ? remove(matching.chordVoicings, prev.chordVoicings) : remove(p.chordVoicings ?? [], prev.chordVoicings),
      negativeTags: matching ? remove(matching.negativeTags, prev.negativeTags) : remove(p.negativeTags ?? [], prev.negativeTags),
      artistArchetypes: remove(p.artistArchetypes ?? [], prev.artistArchetypes),
      bpm: '',
      timeSignature: '',
      grooveFeel: '',
      mixSpatialTags: [],
      endTrack: false,
      lyrics: '',
      stylePromptOverride: '',
    }));
    setSurpriseTheme(null);
    showToast(`Cleared ${p.name}`);
  }, [showToast]);

  const applyMicroGenreRecipe = useCallback((label: string) => {
    const recipe = MICRO_GENRE_RECIPES[label];
    if (!recipe) return false;
    setState(normalizePromptState({
      ...EMPTY_STATE,
      genres: [...recipe.genres],
      subgenres: [label],
      instruments: [...recipe.instruments],
      vocalTypes: [...recipe.vocalTypes],
      vocalTimbre: recipe.vocalTimbre,
      vocalEffects: [...recipe.vocalEffects],
      moods: [...recipe.moods],
      production: [...recipe.production],
      musicalKeys: [...recipe.musicalKeys],
      chordVoicings: [...recipe.chordVoicings],
      bpm: recipe.bpm,
      lyrics: recipe.lyricMetatags,
      stylePromptOverride: '',
    }));
    setSurpriseTheme(null);
    showToast(`Loaded era recipe: ${label}`);
    return true;
  }, [showToast]);

  const savePreset = useCallback((name: string) => {
    const p: Preset = {
      id: `user-${Date.now()}`,
      name,
      emoji: '💾',
      blurb: 'Custom saved recipe',
      genres: state.genres,
      subgenres: state.subgenres,
      instruments: state.instruments,
      customInstruments: state.customInstruments,
      vocalTypes: state.vocalTypes,
      vocalEffects: state.vocalEffects,
      moods: state.moods,
      production: state.production,
      negativeTags: [...state.negativeTags],
      musicalKeys: [...state.musicalKeys],
      chordVoicings: [...state.chordVoicings],
      bpm: typeof state.bpm === 'number' ? state.bpm : 120,
      timeFeel: state.timeFeel,
      blend: state.blend,
      artistArchetypes: [...state.artistArchetypes],
      artistBlend: state.artistBlend,
      endTrack: state.endTrack,
      timeSignature: state.timeSignature,
      grooveFeel: state.grooveFeel,
      mixSpatialTags: [...state.mixSpatialTags],
    };
    setUserPresets(prev => [p, ...prev].slice(0, 30));
    showToast(`Saved preset: ${name}`);
  }, [state, showToast]);

  const deletePreset = useCallback((id: string) => {
    setUserPresets(prev => prev.filter(p => p.id !== id));
  }, []);

  const makeSnapshot = useCallback((snapshotState: PromptState): PromptSnapshot => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    state: { ...snapshotState, mixSpatialTags: [...snapshotState.mixSpatialTags] },
    stylePrompt: compileStylePrompt(snapshotState),
  }), []);

  const saveFavorite = useCallback(() => {
    setFavorites(prev => [makeSnapshot(state), ...prev].slice(0, 30));
    showToast('Saved to favorites');
  }, [makeSnapshot, showToast, state]);

  const deleteFavorite = useCallback((id: string) => {
    setFavorites(prev => prev.filter(item => item.id !== id));
  }, []);

  const addRecentPrompt = useCallback((lyrics?: string) => {
    const snapshotState = lyrics === undefined ? state : { ...state, lyrics };
    setRecentPrompts(prev => [makeSnapshot(snapshotState), ...prev].slice(0, 10));
  }, [makeSnapshot, state]);

  const deleteRecentPrompt = useCallback((id: string) => {
    setRecentPrompts(prev => prev.filter(item => item.id !== id));
    showToast('Removed from history shelf');
  }, [showToast]);

  const clearRecentPrompts = useCallback(() => {
    setRecentPrompts([]);
    showToast('History shelf cleared');
  }, [showToast]);

  const loadSnapshot = useCallback((snapshot: PromptSnapshot) => {
    setState({ ...EMPTY_STATE, ...snapshot.state, mixSpatialTags: [...(snapshot.state.mixSpatialTags ?? [])] });
    showToast('Loaded saved prompt');
  }, [showToast]);

  const randomize = useCallback(() => {
    setState(randomState());
    showToast('Randomized all fields');
  }, [showToast]);

  const reset = useCallback(() => {
    setState({
      ...EMPTY_STATE,
      lyrics: '',
      stylePromptOverride: '',
    });
    showToast('Cleared all selections');
  }, [showToast]);

  // ---- Per-section randomize functions ----
  const pickN = <T,>(arr: T[], n: number): T[] =>
    [...arr].sort(() => Math.random() - 0.5).slice(0, n);

  const randomizeGenres = useCallback(() => {
    setState(prev => {
      const pickedGenres = pickN(GENRES, 1 + Math.floor(Math.random() * MAX_BLEND_SLOTS)).map(g => g.id);
      const primary = GENRES.find(g => g.id === pickedGenres[0]);
      const subgenres = primary ? pickN(primary.subgenres, 1) : [];
      return { ...prev, genres: pickedGenres, subgenres, blend: 50 + Math.floor(Math.random() * 4) * 10 };
    });
    showToast('Randomized genres');
  }, [showToast]);

  const randomizeVocals = useCallback(() => {
    setState(prev => ({
      ...prev,
      vocalTypes: pickN(VOCAL_TYPES, 1).map(v => v.id),
      vocalEffects: pickN(VOCAL_EFFECTS, 1).map(v => v.id),
    }));
    showToast('Randomized vocals');
  }, [showToast]);

  const randomizeArtistArchetypes = useCallback(() => {
    setState(prev => ({
      ...prev,
      artistArchetypes: pickN(VOCAL_ARCHETYPES, 1 + Math.floor(Math.random() * MAX_BLEND_SLOTS)).map(a => a.id),
      artistBlend: 55 + Math.floor(Math.random() * 3) * 10,
    }));
    showToast('Randomized artist archetypes');
  }, [showToast]);

  const randomizeInstruments = useCallback(() => {
    setState(prev => ({
      ...prev,
      instruments: pickN(INSTRUMENTS, 2 + Math.floor(Math.random() * 3)).map(i => i.id),
    }));
    showToast('Randomized instruments');
  }, [showToast]);

  const randomizeMoodTempo = useCallback(() => {
    setState(prev => ({
      ...prev,
      moods: pickN(MOOD_TAGS, 2).map(m => m.id),
      production: pickN(PRODUCTION_TAGS, 2).map(p => p.id),
      bpm: 70 + Math.floor(Math.random() * 9) * 10,
      timeFeel: (['normal', 'half', 'double'] as TimeFeel[])[Math.floor(Math.random() * 3)],
    }));
    showToast('Randomized mood & tempo');
  }, [showToast]);

  // ---- Apply a genre blueprint to the studio state ----
  const applyBlueprint = useCallback((bp: GenreBlueprint) => {
    const preset = blueprintToPreset(bp);
    setState(applyPreset(preset));
    showToast(`Loaded blueprint: ${bp.name}`);
  }, [showToast]);

  // ---- API-powered "Surprise Me" ----
  // Picks a random genre blueprint (or fusion blend), calls the generate-theme
  // edge function for a culturally accurate theme, then applies the full blueprint.
  const [surprising, setSurprising] = useState(false);

  const surpriseMe = useCallback(async () => {
    setSurprising(true);
    try {
      const recipe = pickRandomSurpriseRecipe();
      const nextState = applySurpriseRecipeToState(state, recipe);

      let theme = recipe.theme;
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-theme`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ genre: recipe.label }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.theme && typeof data.theme === 'string') {
            theme = data.theme;
          }
        }
      } catch {
        // Network error — fall back to recipe theme
      }

      setState(normalizePromptState({ ...nextState, stylePromptOverride: '' }));
      setSurpriseTheme({
        theme,
        structureId: recipe.structureId,
        rhymeScheme: recipe.rhymeScheme,
      });
      showToast(`Surprise! ${recipe.label}`);
      return { theme, recipe };
    } finally {
      setSurprising(false);
    }
  }, [showToast, state]);

  const pushHistory = useCallback(() => {
    setHistory(prev => [state, ...prev].slice(0, 24));
  }, [state]);

  const loadHistoryItem = useCallback((idx: number) => {
    const item = history[idx];
    if (item) {
      setState(normalizePromptState(item));
      showToast('Loaded from history');
    }
  }, [history, showToast]);

  const setLyricsCursor = useCallback((position: number, value: string) => {
    setState(prev => {
      if (prev.lyrics !== value) return prev;
      lyricsCursor.current = position;
      return prev;
    });
  }, []);

  const insertLyricTag = useCallback((tag: string) => {
    setState(prev => {
      const cursor = lyricsCursor.current;
      const hasValidCursor = cursor !== null && cursor >= 0 && cursor <= prev.lyrics.length;
      const outroIndex = prev.lyrics.search(/^\[Outro(?:\s|\])/mi);
      const position = hasValidCursor ? cursor : outroIndex >= 0 ? outroIndex : prev.lyrics.length;
      const before = prev.lyrics.slice(0, position);
      const after = prev.lyrics.slice(position);
      const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
      const suffix = after.length > 0 && !after.startsWith('\n') ? '\n' : '';
      lyricsCursor.current = position + prefix.length + tag.length + 1;
      return {
        ...prev,
        lyrics: `${before}${prefix}${tag}\n${suffix}${after}`,
      };
    });
  }, []);

  const stylePrompt = useMemo(() => compileStylePrompt(state), [state]);
  const meta = useMemo(() => promptMeta(stylePrompt), [stylePrompt]);

  return {
    state, setState, update, toggleArray,
    audioState, setAudioState, setAudioFile, setAudioAnalysis, setAudioIsAnalyzing, setSelectedDirectionId, setRerollCount,
    addCustomInstrument, removeCustomInstrument,
    loadPreset, savePreset, deletePreset,
    clearPresetSelection,
    applyMicroGenreRecipe,
    randomize, reset,
    randomizeGenres, randomizeVocals, randomizeArtistArchetypes, randomizeInstruments, randomizeMoodTempo,
    applyBlueprint, surpriseMe, surprising, surpriseTheme, setSurpriseTheme,
    pushHistory, loadHistoryItem,
    insertLyricTag,
    setLyricsCursor,
    stylePrompt, meta,
    userPresets, history, favorites, recentPrompts,
    toast, showToast,
    setEngineMode,
    toggleDuetMode,
    saveFavorite, deleteFavorite, addRecentPrompt, deleteRecentPrompt, clearRecentPrompts, loadSnapshot,
    formatLyricsForExport, formatPromptForExport,
  };
}

export type PromptEngine = ReturnType<typeof usePromptEngine>;
