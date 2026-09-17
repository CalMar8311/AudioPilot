/**
 * audioToMidiEngine.ts
 *
 * Real polyphonic audio-to-MIDI transcription engine.
 *
 * Pipeline:
 *   File (Web Audio decode) → mono PCM Float32Array
 *     → sliding-window FFT (Cooley-Tukey radix-2 DIT)
 *     → spectral peak detection with parabolic interpolation
 *     → polyphonic note tracker (onset / offset)
 *     → MidiNote[] partitioned by register into Lead / Chords / Bass
 *
 * No synthetic chord-progression fallbacks. If no audio file is provided
 * the function throws so the caller can surface a meaningful error.
 */

import type { AudioAnalysisResult } from '@/services/geminiAudio';
import {
  generateMidiFile,
  generateMultiTrackMidiFile,
  midiNumberToNoteName,
  MidiNote,
  MidiTrackConfig,
  MidiMarker,
} from '@/utils/midiEncoder';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type StemType = 'keys' | 'bass' | 'lead' | 'strings' | 'drums';

export type TimeSegment = 'full' | '0-15' | '15-30' | '30-45' | 'intro' | 'chorus';

/** Raw note event as emitted by the polyphonic pitch detector */
export interface RawPitchNote {
  pitch: number;      // MIDI number 0-127
  startTime: number;  // seconds from beginning of the segment
  endTime: number;    // seconds from beginning of the segment
  velocity: number;   // 1-127
}

export interface TranscriptionOptions {
  stem: StemType;
  timeSegment: TimeSegment;
  audioFile?: File | null;
  analysis?: AudioAnalysisResult | null;
  bpm?: number;
  key?: string;
}

export interface TranscriptionResult {
  stem: StemType;
  stemLabel: string;
  timeSegment: TimeSegment;
  timeSegmentLabel: string;
  notes: MidiNote[];
  noteSequenceString: string;
  midiData: Uint8Array;
  bpm: number;
  /** True when the source audio exceeded 30s and was auto-sliced to a shorter loop. */
  autoSliced: boolean;
  /** Actual duration (seconds) of audio that was analysed. */
  effectiveDurationSec: number;
}

export interface MultiTrackMidiResult {
  projectName: string;
  totalNotesCount: number;
  tracksCount: number;
  midiData: Uint8Array;
  /** True when the source audio exceeded 30s and was auto-sliced to a shorter loop. */
  autoSliced: boolean;
  /** Actual duration (seconds) of audio that was analysed. */
  effectiveDurationSec: number;
}

export type InstrumentLayerId = 'lead' | 'chords' | 'bass';

export interface InstrumentLayerTrack {
  id: InstrumentLayerId;
  label: string;
  notes: MidiNote[];
  midiData: Uint8Array;
}

export interface InstrumentLayerSplitResult {
  lead: InstrumentLayerTrack;
  chords: InstrumentLayerTrack;
  bass: InstrumentLayerTrack;
  /** 3-track (Lead, Chords, Bass) FL-Studio-ready multi-track bundle */
  bundleMidiData: Uint8Array;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI option lists (unchanged — consumed by AudioMidiExtractorPanel)
// ─────────────────────────────────────────────────────────────────────────────

export const STEM_OPTIONS: { id: StemType; label: string; icon: string; description: string }[] = [
  { id: 'keys',    label: 'Chord Progression / Keys', icon: '🎹', description: 'Polyphonic 7th/9th chord voicings, Fender Rhodes, acoustic piano & synth keys' },
  { id: 'bass',    label: 'Bassline',                 icon: '🎸', description: 'Low-frequency sub bass, 808s, slap bass & synth basslines' },
  { id: 'lead',    label: 'Lead Melody / Vocals',     icon: '🎤', description: 'Monophonic/polyphonic vocal lines, synth leads & solo guitar riffs' },
  { id: 'strings', label: 'Strings / Pads',           icon: '🎻', description: 'Lush sustained string sections, Juno synth pads & ambient swells' },
  { id: 'drums',   label: 'Drums / Rhythm',           icon: '🥁', description: 'Kick (36), Snare (38), Hi-Hat (42/46), Percussion & Log Drums' },
];

export const TIME_SEGMENT_OPTIONS: { id: TimeSegment; label: string; rangeSec: [number, number] }[] = [
  { id: 'full',   label: 'Full Track (0:00 - End)',      rangeSec: [0, 180] },
  { id: '0-15',   label: '0:00 - 0:15 (Intro / Hook)',  rangeSec: [0, 15]  },
  { id: '15-30',  label: '0:15 - 0:30 (Verse 1)',       rangeSec: [15, 30] },
  { id: '30-45',  label: '0:30 - 0:45 (Chorus / Drop)', rangeSec: [30, 45] },
  { id: 'intro',  label: 'Intro Section',               rangeSec: [0, 12]  },
  { id: 'chorus', label: 'Chorus Peak',                 rangeSec: [30, 60] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Pitch-register constants for Lead / Chords / Bass partitioning
// ─────────────────────────────────────────────────────────────────────────────

/** Notes below this MIDI pitch (C3) belong to the Bass register */
const BASS_CEILING_MIDI  = 48;
/** Upper bound of the Chords / Mid register (C5) */
const CHORD_CEILING_MIDI = 72;
/** A cluster's top note must clear this floor (C4) to become the Lead line */
const LEAD_FLOOR_MIDI    = 60;

// ─────────────────────────────────────────────────────────────────────────────
// FFT detection constants
// ─────────────────────────────────────────────────────────────────────────────

const FFT_SIZE           = 4096;  // ~93 ms at 44 100 Hz — good low-frequency resolution
const HOP_SIZE           = 1024;  // ~23 ms hop → ~43 frames / sec
const MAX_POLYPHONY      = 8;     // maximum simultaneous pitches to track per frame
const NOTE_ON_MIN_FRAMES = 2;     // minimum consecutive frames to emit a note event
const MIDI_DETECT_MIN    = 28;    // E1 — lowest expected instrument pitch
const MIDI_DETECT_MAX    = 100;   // E7 — highest expected instrument pitch

// ─────────────────────────────────────────────────────────────────────────────
// Transcription safety limits — prevent browser memory exhaustion / hangs
// ─────────────────────────────────────────────────────────────────────────────

/** Requested segments longer than this are automatically sliced down. */
const MAX_SAFE_AUDIO_DURATION_SEC = 30;
/** Auto-slice target — an approximate 8-bar loop, well inside the 16–30s guidance. */
const AUTO_SLICE_DURATION_SEC = 24;
/** Hard ceiling on total transcription time before we abort and surface an error. */
export const TRANSCRIPTION_TIMEOUT_MS = 25_000;
/** How many FFT / onset frames to process between cooperative-cancellation checks. */
const YIELD_EVERY_N_FRAMES = 32;

/** Thrown when transcription exceeds TRANSCRIPTION_TIMEOUT_MS. Callers should
 *  catch this specifically to show an actionable "try a shorter loop" message. */
export class TranscriptionTimeoutError extends Error {
  constructor(message = 'Transcription timed out. Please try a shorter audio loop or lower resolution.') {
    super(message);
    this.name = 'TranscriptionTimeoutError';
  }
}

/** Cooperative-cancellation flag threaded through the hot FFT / onset loops. */
interface CancelToken { cancelled: boolean }

/** Yields control back to the event loop so the timeout timer can fire between
 *  chunks of otherwise-synchronous, CPU-heavy work. */
function yieldToEventLoop(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Runs `worker(token)` and races it against `timeoutMs`. If the deadline hits
 * first, `token.cancelled` flips so the worker's cooperative yield-points can
 * bail out (best-effort "abort"), and the promise rejects with
 * TranscriptionTimeoutError so the UI can show a clear, actionable warning.
 */
async function runWithTimeout<T>(
  worker: (token: CancelToken) => Promise<T>,
  timeoutMs: number = TRANSCRIPTION_TIMEOUT_MS,
): Promise<T> {
  const token: CancelToken = { cancelled: false };
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      token.cancelled = true;
      reject(new TranscriptionTimeoutError());
    }, timeoutMs);
  });

  try {
    return await Promise.race([worker(token), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio decode
// ─────────────────────────────────────────────────────────────────────────────

interface DecodedSegment {
  pcm: Float32Array;
  sampleRate: number;
  /** True when the requested range exceeded MAX_SAFE_AUDIO_DURATION_SEC and was clamped. */
  wasAutoSliced: boolean;
  /** Actual duration (seconds) of the returned PCM buffer after any clamping. */
  effectiveDurationSec: number;
}

/**
 * Decode a File to a mono PCM Float32Array, trimmed to the requested segment.
 *
 * Safety: if the requested [segmentStartSec, segmentEndSec] window is longer
 * than MAX_SAFE_AUDIO_DURATION_SEC (30s), it is automatically clamped down to
 * AUTO_SLICE_DURATION_SEC (~24s, an 8-bar loop) starting from segmentStartSec,
 * to keep the FFT pass fast and prevent browser memory exhaustion on long
 * "Full Track" transcriptions.
 */
async function decodeAudioSegment(
  file: File,
  segmentStartSec: number,
  segmentEndSec: number,
): Promise<DecodedSegment> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close();
  }

  // ── Duration safety check & auto-slice ──────────────────────────────────
  const requestedDuration = segmentEndSec - segmentStartSec;
  let clampedEndSec = segmentEndSec;
  let wasAutoSliced = false;
  if (requestedDuration > MAX_SAFE_AUDIO_DURATION_SEC) {
    clampedEndSec = segmentStartSec + AUTO_SLICE_DURATION_SEC;
    wasAutoSliced = true;
  }
  // Never read past the actual decoded audio length
  clampedEndSec = Math.min(clampedEndSec, audioBuffer.duration);

  const sr         = audioBuffer.sampleRate;
  const startSamp  = Math.max(0, Math.floor(segmentStartSec * sr));
  const endSamp    = Math.min(audioBuffer.length, Math.ceil(clampedEndSec * sr));
  const length     = Math.max(0, endSamp - startSamp);

  // Mix down to mono (average all channels)
  const mono = new Float32Array(length);
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const chData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += chData[startSamp + i] / audioBuffer.numberOfChannels;
    }
  }

  return {
    pcm: mono,
    sampleRate: sr,
    wasAutoSliced,
    effectiveDurationSec: Math.max(0, clampedEndSec - segmentStartSec),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FFT (Cooley-Tukey radix-2 DIT, in-place)
// ─────────────────────────────────────────────────────────────────────────────

function fftInPlace(re: Float32Array, im: Float32Array): void {
  const n = re.length;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }

  // Butterfly stages
  for (let len = 2; len <= n; len <<= 1) {
    const half  = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wr0   = Math.cos(angle);
    const wi0   = Math.sin(angle);

    for (let start = 0; start < n; start += len) {
      let wr = 1.0, wi = 0.0;
      for (let k = 0; k < half; k++) {
        const u  = start + k;
        const v  = u + half;
        const vr = re[v] * wr - im[v] * wi;
        const vi = re[v] * wi + im[v] * wr;
        re[v] = re[u] - vr;
        im[v] = im[u] - vi;
        re[u] += vr;
        im[u] += vi;
        const newWr = wr * wr0 - wi * wi0;
        wi = wr * wi0 + wi * wr0;
        wr = newWr;
      }
    }
  }
}

/** Hann window coefficient for sample i in a window of size n */
function hannWindow(i: number, n: number): number {
  return 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
}

/**
 * Convert a frequency in Hz to the nearest MIDI note number.
 * Returns -1 if frequency is outside the musical detection range.
 */
function freqToMidi(freq: number): number {
  if (freq <= 0) return -1;
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  return midi >= MIDI_DETECT_MIN && midi <= MIDI_DETECT_MAX ? midi : -1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core polyphonic pitch detector
// ─────────────────────────────────────────────────────────────────────────────

interface PitchDetectionResult {
  notes: RawPitchNote[];
  wasAutoSliced: boolean;
  effectiveDurationSec: number;
}

/**
 * Transcribe an audio File into polyphonic MIDI note events.
 *
 * Algorithm:
 *   1. Decode audio → mono PCM, trimmed to [segmentStartSec, segmentEndSec]
 *      (auto-sliced to ~24s if the requested window exceeds 30s).
 *   2. Slide a Hann-windowed FFT_SIZE frame across the PCM with HOP_SIZE step.
 *   3. Compute the magnitude spectrum; locate local maxima above the adaptive
 *      noise floor; apply parabolic interpolation for sub-bin accuracy.
 *   4. Map peaks to MIDI note numbers; keep at most MAX_POLYPHONY per frame.
 *   5. Track note onsets and offsets across frames; require NOTE_ON_MIN_FRAMES
 *      of consecutive presence before emitting a note event.
 *   6. Normalise velocities relative to the loudest detected event.
 *
 * `cancelToken`, when provided, is checked every YIELD_EVERY_N_FRAMES frames
 * (with a yield back to the event loop) so a caller racing this against a
 * timeout can cooperatively abort a long-running pass.
 */
export async function transcribeAudioToNotes(
  file: File,
  segmentStartSec: number = 0,
  segmentEndSec: number   = 180,
  cancelToken?: CancelToken,
): Promise<PitchDetectionResult> {
  const { pcm, sampleRate, wasAutoSliced, effectiveDurationSec } =
    await decodeAudioSegment(file, segmentStartSec, segmentEndSec);

  if (pcm.length === 0) {
    throw new Error('Audio segment is empty — check the time range and re-upload.');
  }

  const freqPerBin = sampleRate / FFT_SIZE;

  // Frequency bin range for our MIDI detection window
  const lowestFreq  = 440 * Math.pow(2, (MIDI_DETECT_MIN - 69) / 12);
  const highestFreq = 440 * Math.pow(2, (MIDI_DETECT_MAX - 69) / 12);
  const binLo       = Math.max(1, Math.floor(lowestFreq  / freqPerBin));
  const binHi       = Math.min((FFT_SIZE >> 1) - 1, Math.ceil(highestFreq / freqPerBin));

  // Active note tracker: MIDI → { startTime, maxMag, frames }
  const active = new Map<number, { startTime: number; maxMag: number; frames: number }>();
  const rawNotes: RawPitchNote[] = [];

  const re   = new Float32Array(FFT_SIZE);
  const im   = new Float32Array(FFT_SIZE);
  const mags = new Float32Array(FFT_SIZE >> 1);

  const totalFrames = Math.max(0, Math.floor((pcm.length - FFT_SIZE) / HOP_SIZE) + 1);

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    // Cooperative cancellation: yield to the event loop periodically so a
    // racing timeout can actually fire, then bail out if it flipped the flag.
    if (cancelToken && frameIdx % YIELD_EVERY_N_FRAMES === 0) {
      await yieldToEventLoop();
      if (cancelToken.cancelled) throw new TranscriptionTimeoutError();
    }

    const frameStart = frameIdx * HOP_SIZE;
    const frameTimeSec = segmentStartSec + frameStart / sampleRate;

    // Fill FFT buffer with Hann-windowed samples and compute RMS
    let rms = 0;
    for (let i = 0; i < FFT_SIZE; i++) {
      const s = pcm[frameStart + i] ?? 0;
      const w = hannWindow(i, FFT_SIZE);
      re[i] = s * w;
      im[i] = 0;
      rms += s * s;
    }
    rms = Math.sqrt(rms / FFT_SIZE);

    // Silent frame — close all active notes
    if (rms < 0.0005) {
      for (const [midi, info] of active) {
        if (info.frames >= NOTE_ON_MIN_FRAMES) {
          rawNotes.push({ pitch: midi, startTime: info.startTime, endTime: frameTimeSec, velocity: info.maxMag });
        }
      }
      active.clear();
      continue;
    }

    fftInPlace(re, im);

    // Magnitude spectrum (positive frequencies only)
    const halfFFT = FFT_SIZE >> 1;
    let maxMag = 0;
    for (let k = 0; k < halfFFT; k++) {
      mags[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / FFT_SIZE;
      if (mags[k] > maxMag) maxMag = mags[k];
    }

    // Adaptive threshold: 3% of local maximum or 5% of RMS magnitude
    const threshold = Math.max(maxMag * 0.03, rms * 0.05);

    // Spectral peak detection with parabolic interpolation
    const peakMap = new Map<number, number>(); // midi → magnitude

    for (let k = binLo; k < binHi; k++) {
      if (mags[k] > threshold && mags[k] > mags[k - 1] && mags[k] >= mags[k + 1]) {
        // Parabolic interpolation for sub-bin frequency accuracy
        const alpha = mags[k - 1];
        const beta  = mags[k];
        const gamma = mags[k + 1];
        const denom = alpha - 2 * beta + gamma;
        const kInterp = denom !== 0 ? k - 0.5 * (gamma - alpha) / denom : k;
        const freq = kInterp * freqPerBin;
        const midi = freqToMidi(freq);
        if (midi >= 0) {
          const prev = peakMap.get(midi) ?? 0;
          if (beta > prev) peakMap.set(midi, beta);
        }
      }
    }

    // Keep at most MAX_POLYPHONY strongest peaks this frame
    const activeMidisThisFrame = new Set<number>(
      [...peakMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_POLYPHONY)
        .map(([midi]) => midi),
    );

    // Note-off: pitches active in previous frame but absent now
    for (const [midi, info] of active) {
      if (!activeMidisThisFrame.has(midi)) {
        if (info.frames >= NOTE_ON_MIN_FRAMES) {
          rawNotes.push({ pitch: midi, startTime: info.startTime, endTime: frameTimeSec, velocity: info.maxMag });
        }
        active.delete(midi);
      } else {
        // Still sounding — update max magnitude and frame count
        const mag = peakMap.get(midi)!;
        if (mag > info.maxMag) info.maxMag = mag;
        info.frames++;
      }
    }

    // Note-on: pitches newly present this frame
    for (const midi of activeMidisThisFrame) {
      if (!active.has(midi)) {
        active.set(midi, { startTime: frameTimeSec, maxMag: peakMap.get(midi)!, frames: 1 });
      }
    }
  }

  // Close remaining active notes at end of segment
  const endTime = segmentStartSec + pcm.length / sampleRate;
  for (const [midi, info] of active) {
    if (info.frames >= NOTE_ON_MIN_FRAMES) {
      rawNotes.push({ pitch: midi, startTime: info.startTime, endTime: endTime, velocity: info.maxMag });
    }
  }

  // Normalise velocity magnitudes to MIDI 1-127 range
  if (rawNotes.length > 0) {
    const maxV = rawNotes.reduce((m, n) => Math.max(m, n.velocity), 0);
    const scale = maxV > 0 ? 110 / maxV : 1;
    for (const n of rawNotes) {
      n.velocity = Math.max(40, Math.min(127, Math.round(n.velocity * scale)));
    }
  }

  rawNotes.sort((a, b) => a.startTime - b.startTime);
  return { notes: rawNotes, wasAutoSliced, effectiveDurationSec };
}

// ─────────────────────────────────────────────────────────────────────────────
// Drums: transient / onset detector
// ─────────────────────────────────────────────────────────────────────────────

interface DrumDetectionResult {
  notes: MidiNote[];
  wasAutoSliced: boolean;
  effectiveDurationSec: number;
}

/**
 * Detect drum onsets from a File using a spectral-flux + frequency-band split approach.
 * Low-frequency flux spikes → Kick (36); broadband spikes → Snare (38);
 * high-frequency spikes → Hi-Hat (42/46).
 *
 * `cancelToken`, when provided, is checked periodically so a caller racing
 * this against a timeout can cooperatively abort a long-running pass.
 */
async function transcribeDrumsFromAudio(
  file: File,
  segmentStartSec: number,
  segmentEndSec: number,
  cancelToken?: CancelToken,
): Promise<DrumDetectionResult> {
  const { pcm, sampleRate, wasAutoSliced, effectiveDurationSec } =
    await decodeAudioSegment(file, segmentStartSec, segmentEndSec);

  const frameSize = 512;
  const notes: MidiNote[] = [];
  let prevLowRms  = 0;
  let prevHighRms = 0;

  // Minimum interval between onsets to avoid double-triggering (50 ms)
  const minIntervalSec = 0.05;
  let lastOnsetSec = -1;

  let frameIdx = 0;
  for (let i = 0; i + frameSize < pcm.length; i += frameSize, frameIdx++) {
    // Cooperative cancellation — see transcribeAudioToNotes for rationale.
    if (cancelToken && frameIdx % YIELD_EVERY_N_FRAMES === 0) {
      await yieldToEventLoop();
      if (cancelToken.cancelled) throw new TranscriptionTimeoutError();
    }

    let lowRms  = 0;
    let highRms = 0;

    for (let j = 0; j < frameSize; j++) {
      const s = pcm[i + j];
      lowRms += s * s;
      const diff = j > 0 ? (pcm[i + j] - pcm[i + j - 1]) : 0;
      highRms += diff * diff;
    }

    lowRms  = Math.sqrt(lowRms  / frameSize);
    highRms = Math.sqrt(highRms / frameSize);

    const lowFlux  = Math.max(0, lowRms  - prevLowRms);
    const highFlux = Math.max(0, highRms - prevHighRms);

    const timeSec = segmentStartSec + i / sampleRate;

    if (lowFlux > 0.04 || highFlux > 0.005) {
      if (timeSec - lastOnsetSec >= minIntervalSec) {
        lastOnsetSec = timeSec;
        const vel = Math.max(40, Math.min(127, Math.round(Math.max(lowFlux, highFlux) * 900)));

        if (highFlux / (lowFlux + 0.001) > 1.5) {
          // High-frequency dominated → Hi-hat
          const isOpen = Math.random() > 0.85;
          notes.push({ noteName: isOpen ? 'A#1 (Open Hat)' : 'F#1 (Closed Hat)', midiNumber: isOpen ? 46 : 42, startTimeSec: timeSec, durationSec: 0.08, velocity: vel });
        } else if (lowFlux > 0.08) {
          // Strong low-frequency hit → Kick
          notes.push({ noteName: 'C1 (Kick)',  midiNumber: 36, startTimeSec: timeSec, durationSec: 0.10, velocity: vel });
        } else {
          // Medium broadband hit → Snare
          notes.push({ noteName: 'D1 (Snare)', midiNumber: 38, startTimeSec: timeSec, durationSec: 0.10, velocity: vel });
        }
      }
    }

    prevLowRms  = lowRms;
    prevHighRms = highRms;
  }

  return { notes, wasAutoSliced, effectiveDurationSec };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stem-register filters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract a strict monophonic melody line: only the highest active pitch at each
 * moment, considering notes that start at or above MIDI 52 (E3).
 */
function extractMonophonicLeadLine(notes: RawPitchNote[]): RawPitchNote[] {
  if (notes.length === 0) return [];

  // Sort by start time, then descending pitch so that for simultaneous onsets
  // the highest pitch is processed first.
  const sorted = [...notes]
    .filter(n => n.pitch >= 52)
    .sort((a, b) => a.startTime - b.startTime || b.pitch - a.pitch);

  const result: RawPitchNote[] = [];
  // "cursor" tracks until when the current lead note is occupied
  let cursor = 0;

  for (const note of sorted) {
    if (note.startTime >= cursor) {
      // New note starts after the previous one ended — add freely
      result.push({ ...note });
      cursor = note.endTime;
    } else if (note.pitch > (result[result.length - 1]?.pitch ?? 0)) {
      // Higher pitch overlaps — trim the previous note and take this one
      const prev = result[result.length - 1];
      if (prev) prev.endTime = note.startTime;
      result.push({ ...note });
      cursor = note.endTime;
    }
    // Lower pitch overlapping note → discard (melody monophony rule)
  }

  return result.filter(n => n.endTime > n.startTime + 0.02);
}

/**
 * Filter a RawPitchNote[] to the pitch register appropriate for each stem type.
 * All melodic stems receive the full polyphonic note set; the stem type then
 * narrows or shapes it.
 */
function filterNotesByStem(notes: RawPitchNote[], stem: StemType): RawPitchNote[] {
  switch (stem) {
    case 'bass':
      // Bass register: E0–C4 (MIDI 28–60)
      return notes.filter(n => n.pitch <= 60);

    case 'lead':
      // Monophonic top-line above E3 (MIDI 52)
      return extractMonophonicLeadLine(notes);

    case 'strings':
      // Wide mid-high range for sustained string/pad textures: C2–C7 (MIDI 36-96)
      return notes.filter(n => n.pitch >= 36 && n.pitch <= 96);

    case 'keys':
    default:
      // Full polyphonic range — no register filter
      return notes;
  }
}

/** Convert RawPitchNote[] to the MidiNote format used by midiEncoder. */
function rawNotesToMidiNotes(rawNotes: RawPitchNote[]): MidiNote[] {
  return rawNotes.map(n => ({
    noteName:     midiNumberToNoteName(n.pitch),
    midiNumber:   n.pitch,
    startTimeSec: n.startTime,
    durationSec:  Math.max(0.05, n.endTime - n.startTime),
    velocity:     Math.max(1, Math.min(127, Math.round(n.velocity))),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Public transcription entry-points
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transcribe an uploaded audio file for a selected instrument stem and time segment.
 *
 * The function decodes the actual audio, runs polyphonic pitch detection (or
 * transient detection for the drums stem), and builds a valid MIDI binary.
 * It does NOT generate synthetic chord progressions.
 *
 * Safety:
 *   - Audio windows longer than 30s are auto-sliced to a ~24s loop before any
 *     FFT/onset work begins (see decodeAudioSegment), preventing browser
 *     memory exhaustion on long "Full Track" transcriptions.
 *   - The whole detection pass is raced against TRANSCRIPTION_TIMEOUT_MS
 *     (25s). If it doesn't resolve in time, cooperative cancellation kicks
 *     in and the promise rejects with TranscriptionTimeoutError — callers
 *     should catch this specifically to reset loading state and show an
 *     actionable "try a shorter loop" warning instead of hanging forever.
 */
export async function transcribeAudioToMidi(
  options: TranscriptionOptions,
): Promise<TranscriptionResult> {
  const { stem, timeSegment, audioFile, analysis } = options;
  const bpm = options.bpm ?? analysis?.detectedBpm ?? 120;

  if (!audioFile) {
    throw new Error(
      'No audio file provided. Please upload an audio track before running transcription.',
    );
  }

  const stemOption = STEM_OPTIONS.find(s => s.id === stem)    ?? STEM_OPTIONS[0];
  const segOption  = TIME_SEGMENT_OPTIONS.find(t => t.id === timeSegment) ?? TIME_SEGMENT_OPTIONS[0];
  const [segStart, segEnd] = segOption.rangeSec;

  let notes!: MidiNote[];
  let autoSliced = false;
  let effectiveDurationSec = segEnd - segStart;

  // The entire detection pass is raced against a hard 25s deadline. On
  // timeout, `runWithTimeout` rejects with TranscriptionTimeoutError and the
  // in-flight worker's cooperative yield-points stop further wasted CPU work.
  await runWithTimeout(async (token) => {
    if (stem === 'drums') {
      // Drums stem: onset / transient detector
      const result = await transcribeDrumsFromAudio(audioFile, segStart, segEnd, token);
      notes = result.notes;
      autoSliced = result.wasAutoSliced;
      effectiveDurationSec = result.effectiveDurationSec;
    } else {
      // Melodic stems: polyphonic FFT-based pitch detector
      const result      = await transcribeAudioToNotes(audioFile, segStart, segEnd, token);
      const filteredRaw = filterNotesByStem(result.notes, stem);
      notes              = rawNotesToMidiNotes(filteredRaw);
      autoSliced = result.wasAutoSliced;
      effectiveDurationSec = result.effectiveDurationSec;
    }
  });

  const noteNamesList    = [...new Set(notes.map(n => n.noteName))];
  const noteSequenceString = noteNamesList.join(' - ') || '(no notes detected in this segment)';

  const trackName = `${audioFile.name.replace(/\.[^/.]+$/, '')}_${stemOption.label.split('/')[0].trim()}`;
  const midiData  = generateMidiFile(notes, trackName, bpm);

  return {
    stem,
    stemLabel:        stemOption.label,
    timeSegment,
    timeSegmentLabel: segOption.label,
    notes,
    noteSequenceString,
    midiData,
    bpm,
    autoSliced,
    effectiveDurationSec,
  };
}

/**
 * Extract polyphonic notes from the full track once, then fan out into the five
 * stem channels (Keys / Bass / Lead / Strings / Drums) and assemble an FL Studio
 * Format-1 multi-track MIDI bundle.
 *
 * Safety: same 30s auto-slice + 25s hard timeout guarantees as
 * transcribeAudioToMidi — see that function's doc comment for details.
 */
export async function transcribeAllStemsToMultiTrackMidi(
  audioFile: File | null,
  analysis: AudioAnalysisResult | null,
): Promise<MultiTrackMidiResult> {
  if (!audioFile) {
    throw new Error(
      'No audio file provided. Please upload an audio track before exporting the multi-track bundle.',
    );
  }

  const bpm         = analysis?.detectedBpm ?? 120;
  const projectName = audioFile.name.replace(/\.[^/.]+$/, '') || 'SunoRemix_Project';
  const segStart    = 0;
  const segEnd      = 180;

  let autoSliced = false;
  let effectiveDurationSec = segEnd - segStart;

  // ── Single audio decode pass, raced against the hard timeout ──────────────
  // Run polyphonic detection once; drums uses a separate transient detector.
  const [pitchResult, drumResult] = await runWithTimeout((token) =>
    Promise.all([
      transcribeAudioToNotes(audioFile, segStart, segEnd, token),
      transcribeDrumsFromAudio(audioFile, segStart, segEnd, token),
    ]),
  );
  autoSliced = pitchResult.wasAutoSliced || drumResult.wasAutoSliced;
  effectiveDurationSec = Math.max(pitchResult.effectiveDurationSec, drumResult.effectiveDurationSec);

  const allRawNotes = pitchResult.notes;
  const drumNotes    = drumResult.notes;

  const keysNotes    = rawNotesToMidiNotes(filterNotesByStem(allRawNotes, 'keys'));
  const bassNotes    = rawNotesToMidiNotes(filterNotesByStem(allRawNotes, 'bass'));
  const leadNotes    = rawNotesToMidiNotes(filterNotesByStem(allRawNotes, 'lead'));
  const stringsNotes = rawNotesToMidiNotes(filterNotesByStem(allRawNotes, 'strings'));

  const patchMap: Record<StemType, { channel: number; program: number; name: string }> = {
    keys:    { channel: 0, program: 0,  name: 'Chords / Keys'    },
    bass:    { channel: 1, program: 38, name: 'Bassline'          },
    lead:    { channel: 2, program: 80, name: 'Lead Melody'       },
    strings: { channel: 3, program: 48, name: 'Strings / Pad'     },
    drums:   { channel: 9, program: 0,  name: 'Drums / Percussion'},
  };

  const tracks: MidiTrackConfig[] = [
    { trackName: patchMap.keys.name,    channel: patchMap.keys.channel,    programNumber: patchMap.keys.program,    notes: keysNotes    },
    { trackName: patchMap.bass.name,    channel: patchMap.bass.channel,    programNumber: patchMap.bass.program,    notes: bassNotes    },
    { trackName: patchMap.lead.name,    channel: patchMap.lead.channel,    programNumber: patchMap.lead.program,    notes: leadNotes    },
    { trackName: patchMap.strings.name, channel: patchMap.strings.channel, programNumber: patchMap.strings.program, notes: stringsNotes },
    { trackName: patchMap.drums.name,   channel: patchMap.drums.channel,   programNumber: patchMap.drums.program,   notes: drumNotes    },
  ];

  const totalNotesCount = tracks.reduce((sum, t) => sum + t.notes.length, 0);

  const barDur = (60 / bpm) * 4;
  const markers: MidiMarker[] = [
    { label: '[Intro]',   startTimeSec: 0          },
    { label: '[Verse 1]', startTimeSec: barDur * 2  },
    { label: '[Chorus]',  startTimeSec: barDur * 6  },
    { label: '[Outro]',   startTimeSec: barDur * 10 },
  ];

  const midiData = generateMultiTrackMidiFile(projectName, bpm, tracks, markers);

  return {
    projectName,
    totalNotesCount,
    tracksCount: tracks.length,
    midiData,
    autoSliced,
    effectiveDurationSec,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Instrument-layer splitter (Lead / Chords / Bass)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Groups notes with onset times within `epsilonSec` of each other into
 * "simultaneous onset clusters" — the way polyphonic chords are represented
 * in a flat note buffer.
 */
function groupNotesIntoOnsetClusters(notes: MidiNote[], epsilonSec = 0.02): MidiNote[][] {
  const sorted   = [...notes].sort((a, b) => a.startTimeSec - b.startTimeSec);
  const clusters: MidiNote[][] = [];

  for (const note of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(last[0].startTimeSec - note.startTimeSec) <= epsilonSec) {
      last.push(note);
    } else {
      clusters.push([note]);
    }
  }

  return clusters;
}

/**
 * Classify a flat polyphonic MidiNote[] into three register / polyphony layers:
 *
 *   Bass   — every note below C3 (MIDI < 48).
 *   Lead   — the single highest note of each onset cluster, when it clears C4
 *             (MIDI >= 60). Monophonic top-line only.
 *   Chords — remaining mid-register notes (MIDI 48–72) after the Lead note is
 *             extracted, forming the harmonic polyphonic bed.
 */
export function classifyNotesByRegisterAndPolyphony(notes: MidiNote[]): {
  lead:   MidiNote[];
  chords: MidiNote[];
  bass:   MidiNote[];
} {
  const lead:   MidiNote[] = [];
  const chords: MidiNote[] = [];
  const bass:   MidiNote[] = [];

  for (const cluster of groupNotesIntoOnsetClusters(notes)) {
    const belowBass    = cluster.filter(n => n.midiNumber < BASS_CEILING_MIDI);
    const melodicPool  = cluster
      .filter(n => n.midiNumber >= BASS_CEILING_MIDI)
      .sort((a, b) => b.midiNumber - a.midiNumber);

    // All sub-C3 notes → Bass
    bass.push(...belowBass);

    if (melodicPool.length === 0) continue;

    const [topNote, ...restNotes] = melodicPool;

    if (topNote.midiNumber >= LEAD_FLOOR_MIDI) {
      // Top note clears C4 → Lead (monophonic)
      lead.push(topNote);
      // Rest in C3–C5 band → Chords
      chords.push(...restNotes.filter(n => n.midiNumber < CHORD_CEILING_MIDI));
    } else {
      // Whole cluster sits below the melodic floor → treat as chord voicing
      chords.push(...melodicPool.filter(n => n.midiNumber < CHORD_CEILING_MIDI));
    }
  }

  return { lead, chords, bass };
}

/**
 * Split a completed TranscriptionResult into Lead / Chords / Bass instrument
 * layers and encode each — plus a 3-track bundle — as standard .MID binaries.
 *
 * Note counts in the returned tracks directly reflect the actual extracted notes,
 * not static or theory-generated values.
 */
export function splitTranscriptionIntoInstrumentLayers(
  transcription: TranscriptionResult,
): InstrumentLayerSplitResult {
  const { lead, chords, bass } = classifyNotesByRegisterAndPolyphony(transcription.notes);
  const bpm       = transcription.bpm;
  const baseLabel = transcription.stemLabel.split('/')[0].trim();

  const leadMidiData   = generateMidiFile(lead,   `${baseLabel} - Lead`,   bpm);
  const chordsMidiData = generateMidiFile(chords, `${baseLabel} - Chords`, bpm);
  const bassMidiData   = generateMidiFile(bass,   `${baseLabel} - Bass`,   bpm);

  const bundleMidiData = generateMultiTrackMidiFile(
    `${baseLabel}_InstrumentLayers`,
    bpm,
    [
      { trackName: 'Lead / Melody', channel: 0, programNumber: 80, notes: lead   },
      { trackName: 'Chords / Mid',  channel: 1, programNumber: 0,  notes: chords },
      { trackName: 'Bass',          channel: 2, programNumber: 38, notes: bass   },
    ],
  );

  return {
    lead:   { id: 'lead',   label: 'Lead / Melody', notes: lead,   midiData: leadMidiData   },
    chords: { id: 'chords', label: 'Chords / Mid',  notes: chords, midiData: chordsMidiData },
    bass:   { id: 'bass',   label: 'Bass',           notes: bass,   midiData: bassMidiData   },
    bundleMidiData,
  };
}
