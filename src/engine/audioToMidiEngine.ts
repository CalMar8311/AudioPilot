import type { AudioAnalysisResult, ChordStep } from '@/services/geminiAudio';
import { chordNameToNotes, generateMidiFile, generateMultiTrackMidiFile, midiNumberToNoteName, MidiNote, MidiTrackConfig, MidiMarker, noteNameToMidiNumber } from '@/utils/midiEncoder';

export type StemType = 'keys' | 'bass' | 'lead' | 'strings' | 'drums';

export type TimeSegment = 'full' | '0-15' | '15-30' | '30-45' | 'intro' | 'chorus';

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
}

export const STEM_OPTIONS: { id: StemType; label: string; icon: string; description: string }[] = [
  { id: 'keys', label: 'Chord Progression / Keys', icon: '🎹', description: 'Polyphonic 7th/9th chord voicings, Fender Rhodes, acoustic piano & synth keys' },
  { id: 'bass', label: 'Bassline', icon: '🎸', description: 'Low-frequency sub bass, 808s, slap bass & synth basslines' },
  { id: 'lead', label: 'Lead Melody / Vocals', icon: '🎤', description: 'Monophonic/polyphonic vocal lines, synth leads & solo guitar riffs' },
  { id: 'strings', label: 'Strings / Pads', icon: '🎻', description: 'Lush sustained string sections, Juno synth pads & ambient swells' },
  { id: 'drums', label: 'Drums / Rhythm', icon: '🥁', description: 'Kick (36), Snare (38), Hi-Hat (42/46), Percussion & Log Drums' },
];

export const TIME_SEGMENT_OPTIONS: { id: TimeSegment; label: string; rangeSec: [number, number] }[] = [
  { id: 'full', label: 'Full Track (0:00 - End)', rangeSec: [0, 180] },
  { id: '0-15', label: '0:00 - 0:15 (Intro / Hook)', rangeSec: [0, 15] },
  { id: '15-30', label: '0:15 - 0:30 (Verse 1)', rangeSec: [15, 30] },
  { id: '30-45', label: '0:30 - 0:45 (Chorus / Drop)', rangeSec: [30, 45] },
  { id: 'intro', label: 'Intro Section', rangeSec: [0, 12] },
  { id: 'chorus', label: 'Chorus Peak', rangeSec: [30, 60] },
];

function getChordsFromAnalysis(analysis?: AudioAnalysisResult | null, fallbackKey: string = 'F# Minor'): { name: string; roman?: string }[] {
  if (analysis?.chordSteps && analysis.chordSteps.length > 0) {
    return analysis.chordSteps.map(s => ({ name: s.chordName, roman: s.romanNumeral }));
  }
  if (analysis?.chordProgression) {
    const parts = analysis.chordProgression.split(/[-–—→,]/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts.map(p => ({ name: p }));
  }
  // Default fallback progression
  return [
    { name: 'F#m7', roman: 'im7' },
    { name: 'Bm7', roman: 'ivm7' },
    { name: 'E7', roman: 'VII7' },
    { name: 'AMaj7', roman: 'IIImaj7' },
  ];
}

export async function transcribeAudioToMidi(options: TranscriptionOptions): Promise<TranscriptionResult> {
  const { stem, timeSegment, analysis } = options;
  const bpm = options.bpm || analysis?.detectedBpm || 120;
  const key = options.key || analysis?.detectedKey || 'F# Minor';

  const stemOption = STEM_OPTIONS.find(s => s.id === stem) || STEM_OPTIONS[0];
  const segOption = TIME_SEGMENT_OPTIONS.find(t => t.id === timeSegment) || TIME_SEGMENT_OPTIONS[0];

  const chords = getChordsFromAnalysis(analysis, key);
  const notes: MidiNote[] = [];

  const barDurationSec = (60 / bpm) * 4;
  const segmentStart = segOption.rangeSec[0];
  const segmentEnd = Math.min(segOption.rangeSec[1], segmentStart + barDurationSec * 4);

  let currentTime = segmentStart;
  let chordIndex = 0;

  if (stem === 'keys') {
    // Polyphonic Chord Progression / Keys
    while (currentTime < segmentEnd) {
      const chord = chords[chordIndex % chords.length];
      const { midiNumbers } = chordNameToNotes(chord.name, 4);

      for (const midiNum of midiNumbers) {
        notes.push({
          noteName: midiNumberToNoteName(midiNum),
          midiNumber: midiNum,
          startTimeSec: currentTime,
          durationSec: barDurationSec * 0.9,
          velocity: 92 + Math.floor(Math.random() * 10),
        });
      }

      currentTime += barDurationSec;
      chordIndex++;
    }
  } else if (stem === 'bass') {
    // Bassline (Root notes + octave syncopation)
    while (currentTime < segmentEnd) {
      const chord = chords[chordIndex % chords.length];
      const { midiNumbers } = chordNameToNotes(chord.name, 2); // Base octave 2
      const rootMidi = midiNumbers[0] || 42; // Low bass note

      // Quarter note pulse rhythm
      const beatDur = 60 / bpm;
      for (let b = 0; b < 4; b++) {
        notes.push({
          noteName: midiNumberToNoteName(rootMidi + (b === 3 ? 12 : 0)),
          midiNumber: rootMidi + (b === 3 ? 12 : 0),
          startTimeSec: currentTime + b * beatDur,
          durationSec: beatDur * 0.8,
          velocity: 100 + (b % 2 === 0 ? 15 : 0),
        });
      }

      currentTime += barDurationSec;
      chordIndex++;
    }
  } else if (stem === 'lead') {
    // Lead Melody / Vocals (8th note melodic line seeded by chord tones)
    const beatDur = 60 / bpm;
    const eighthDur = beatDur / 2;

    while (currentTime < segmentEnd) {
      const chord = chords[chordIndex % chords.length];
      const { midiNumbers } = chordNameToNotes(chord.name, 4);

      for (let e = 0; e < 8; e++) {
        // Pick melodic tone from chord or extension
        const noteIdx = (e + chordIndex) % midiNumbers.length;
        const midiNum = midiNumbers[noteIdx] + (e % 3 === 0 ? 12 : 0);

        notes.push({
          noteName: midiNumberToNoteName(midiNum),
          midiNumber: midiNum,
          startTimeSec: currentTime + e * eighthDur,
          durationSec: eighthDur * 0.85,
          velocity: 88 + (e % 2 === 0 ? 12 : 0),
        });
      }

      currentTime += barDurationSec;
      chordIndex++;
    }
  } else if (stem === 'strings') {
    // Strings / Pads (Sustained whole note voicings)
    while (currentTime < segmentEnd) {
      const chord = chords[chordIndex % chords.length];
      const { midiNumbers } = chordNameToNotes(chord.name, 4);

      for (const midiNum of midiNumbers) {
        notes.push({
          noteName: midiNumberToNoteName(midiNum),
          midiNumber: midiNum,
          startTimeSec: currentTime,
          durationSec: barDurationSec * 1.8, // Sustained overlap
          velocity: 78,
        });
      }

      currentTime += barDurationSec * 2;
      chordIndex++;
    }
  } else if (stem === 'drums') {
    // Drums / Rhythm (General MIDI drums: Kick 36, Snare 38, Closed Hat 42, Open Hat 46)
    const beatDur = 60 / bpm;
    const sixteenthDur = beatDur / 4;

    while (currentTime < segmentEnd) {
      for (let s = 0; s < 16; s++) {
        const time = currentTime + s * sixteenthDur;

        // Kick on 1 and 9 (beats 1 and 3)
        if (s === 0 || s === 8 || s === 14) {
          notes.push({ noteName: 'C1 (Kick)', midiNumber: 36, startTimeSec: time, durationSec: 0.1, velocity: 110 });
        }
        // Snare on 4 and 12 (beats 2 and 4)
        if (s === 4 || s === 12) {
          notes.push({ noteName: 'D1 (Snare)', midiNumber: 38, startTimeSec: time, durationSec: 0.1, velocity: 105 });
        }
        // Hi-Hat on every 8th note
        if (s % 2 === 0) {
          const isOpen = s === 14;
          notes.push({
            noteName: isOpen ? 'A#1 (Open Hat)' : 'F#1 (Closed Hat)',
            midiNumber: isOpen ? 46 : 42,
            startTimeSec: time,
            durationSec: 0.08,
            velocity: isOpen ? 95 : 80,
          });
        }
      }

      currentTime += barDurationSec;
    }
  }

  // Generate sequence text summary
  const noteNamesList = Array.from(new Set(notes.map(n => n.noteName)));
  const noteSequenceString = noteNamesList.join(' - ');

  const trackName = `${options.audioFile?.name?.replace(/\.[^/.]+$/, '') || 'Song'}_${stemOption.label.split('/')[0].trim()}`;
  const midiData = generateMidiFile(notes, trackName, bpm);

  return {
    stem,
    stemLabel: stemOption.label,
    timeSegment,
    timeSegmentLabel: segOption.label,
    notes,
    noteSequenceString,
    midiData,
  };
}

export interface MultiTrackMidiResult {
  projectName: string;
  totalNotesCount: number;
  tracksCount: number;
  midiData: Uint8Array;
}

export async function transcribeAllStemsToMultiTrackMidi(
  audioFile: File | null,
  analysis: AudioAnalysisResult | null
): Promise<MultiTrackMidiResult> {
  const bpm = analysis?.detectedBpm || 120;
  const key = analysis?.detectedKey || 'F# Minor';
  const projectName = audioFile?.name.replace(/\.[^/.]+$/, '') || 'SunoRemix_Project';

  const stems: StemType[] = ['keys', 'bass', 'lead', 'strings', 'drums'];
  const tracks: MidiTrackConfig[] = [];
  let totalNotesCount = 0;

  const patchMap: Record<StemType, { channel: number; program: number; name: string }> = {
    keys: { channel: 0, program: 0, name: 'Chords / Keys' },
    bass: { channel: 1, program: 38, name: 'Bassline' },
    lead: { channel: 2, program: 80, name: 'Lead Melody' },
    strings: { channel: 3, program: 48, name: 'Strings / Pad' },
    drums: { channel: 9, program: 0, name: 'Drums / Percussion' },
  };

  for (const st of stems) {
    const res = await transcribeAudioToMidi({
      stem: st,
      timeSegment: 'full',
      audioFile,
      analysis,
      bpm,
      key,
    });

    tracks.push({
      trackName: patchMap[st].name,
      channel: patchMap[st].channel,
      programNumber: patchMap[st].program,
      notes: res.notes,
    });

    totalNotesCount += res.notes.length;
  }

  const barDur = (60 / bpm) * 4;
  const markers: MidiMarker[] = [
    { label: '[Intro]', startTimeSec: 0 },
    { label: '[Verse 1]', startTimeSec: barDur * 2 },
    { label: '[Chorus]', startTimeSec: barDur * 6 },
    { label: '[Outro]', startTimeSec: barDur * 10 },
  ];

  const midiData = generateMultiTrackMidiFile(projectName, bpm, tracks, markers);

  return {
    projectName,
    totalNotesCount,
    tracksCount: tracks.length,
    midiData,
  };
}