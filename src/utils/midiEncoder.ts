// Standard MIDI File (SMF Format 0) Binary Encoder in Pure TypeScript
// Generates standard .mid binary files compatible with FL Studio, Ableton, Logic, Pro Tools, Cubase.

export interface MidiNote {
  noteName: string;
  midiNumber: number;
  startTimeSec: number;
  durationSec: number;
  velocity: number;
}

export interface MidiTrackConfig {
  trackName: string;
  channel: number; // 0-15 (Channel 9 is drums in GM)
  programNumber?: number; // GM Program patch (0-127)
  notes: MidiNote[];
}

export interface MidiMarker {
  label: string;
  startTimeSec: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_ALIAS: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'D♭': 'C#', 'E♭': 'D#', 'G♭': 'F#', 'A♭': 'G#', 'B♭': 'A#',
  'C♯': 'C#', 'D♯': 'D#', 'F♯': 'F#', 'G♯': 'G#', 'A♯': 'A#',
};

export function noteNameToMidiNumber(name: string, defaultOctave: number = 4): number {
  const clean = name.trim();
  const match = clean.match(/^([A-Ga-g][#b♭♯]?)(-?\d+)?$/);
  if (!match) return 60; // Default C4

  let noteSymbol = match[1].toUpperCase();
  if (NOTE_ALIAS[noteSymbol]) {
    noteSymbol = NOTE_ALIAS[noteSymbol];
  }

  const octave = match[2] !== undefined ? parseInt(match[2], 10) : defaultOctave;
  const noteIndex = NOTE_NAMES.indexOf(noteSymbol);
  if (noteIndex === -1) return 60;

  return (octave + 1) * 12 + noteIndex;
}

export function midiNumberToNoteName(num: number): string {
  const clamped = Math.max(0, Math.min(127, Math.round(num)));
  const octave = Math.floor(clamped / 12) - 1;
  const noteIndex = clamped % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

// Convert chord formula to polyphonic note array
export function chordNameToNotes(chordName: string, baseOctave: number = 4): { noteNames: string[]; midiNumbers: number[] } {
  const clean = chordName.trim();
  const match = clean.match(/^([A-Ga-g][#b♭♯]?)(.*)$/);
  if (!match) return { noteNames: ['C4', 'E4', 'G4'], midiNumbers: [60, 64, 67] };

  let root = match[1].toUpperCase();
  if (NOTE_ALIAS[root]) root = NOTE_ALIAS[root];
  const quality = match[2].toLowerCase();

  const rootMidi = noteNameToMidiNumber(`${root}${baseOctave}`);

  let intervals = [0, 4, 7]; // Major triad default

  if (quality.includes('m7') || quality.includes('min7') || quality.includes('minor7')) {
    intervals = [0, 3, 7, 10];
  } else if (quality.includes('maj7') || quality.includes('major7')) {
    intervals = [0, 4, 7, 11];
  } else if (quality.includes('7') || quality.includes('dom7')) {
    intervals = [0, 4, 7, 10];
  } else if (quality.includes('m9') || quality.includes('min9')) {
    intervals = [0, 3, 7, 10, 14];
  } else if (quality.includes('maj9')) {
    intervals = [0, 4, 7, 11, 14];
  } else if (quality.includes('dim7') || quality.includes('°7')) {
    intervals = [0, 3, 6, 9];
  } else if (quality.includes('m') || quality.includes('min') || quality.includes('minor')) {
    intervals = [0, 3, 7];
  } else if (quality.includes('sus4')) {
    intervals = [0, 5, 7];
  } else if (quality.includes('sus2')) {
    intervals = [0, 2, 7];
  } else if (quality.includes('dim') || quality.includes('°')) {
    intervals = [0, 3, 6];
  } else if (quality.includes('aug') || quality.includes('+')) {
    intervals = [0, 4, 8];
  }

  const midiNumbers = intervals.map(i => rootMidi + i);
  const noteNames = midiNumbers.map(n => midiNumberToNoteName(n));

  return { noteNames, midiNumbers };
}

// Encode Variable Length Quantity (VLQ) for MIDI timing
function encodeVLQ(num: number): number[] {
  const bytes: number[] = [];
  let buffer = num & 0x7f;
  let n = num >> 7;

  while (n > 0) {
    buffer <<= 8;
    buffer |= (n & 0x7f) | 0x80;
    n >>= 7;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }

  return bytes;
}

export function generateMidiFile(notes: MidiNote[], trackName: string = 'Extracted MIDI', bpm: number = 120): Uint8Array {
  const ticksPerBeat = 480;
  const microsecondsPerBeat = Math.round(60000000 / Math.max(20, bpm));

  type MidiEvent = {
    tick: number;
    type: 'noteOn' | 'noteOff';
    midiNumber: number;
    velocity: number;
  };

  const events: MidiEvent[] = [];

  for (const n of notes) {
    const startTick = Math.max(0, Math.round((n.startTimeSec * bpm / 60) * ticksPerBeat));
    const durationTicks = Math.max(1, Math.round((n.durationSec * bpm / 60) * ticksPerBeat));
    const endTick = startTick + durationTicks;
    const velocity = Math.max(1, Math.min(127, Math.round(n.velocity)));

    events.push({ tick: startTick, type: 'noteOn', midiNumber: n.midiNumber, velocity });
    events.push({ tick: endTick, type: 'noteOff', midiNumber: n.midiNumber, velocity: 0 });
  }

  events.sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type === 'noteOff' && b.type === 'noteOn') return -1;
    if (a.type === 'noteOn' && b.type === 'noteOff') return 1;
    return a.midiNumber - b.midiNumber;
  });

  const trackBytes: number[] = [];

  // Track Name Meta Event
  const nameBytes = Array.from(new TextEncoder().encode(trackName));
  trackBytes.push(0x00, 0xff, 0x03, nameBytes.length, ...nameBytes);

  // Tempo Meta Event
  trackBytes.push(
    0x00, 0xff, 0x51, 0x03,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff
  );

  // Time Signature Meta Event (4/4)
  trackBytes.push(0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  let lastTick = 0;

  for (const ev of events) {
    const deltaTicks = Math.max(0, ev.tick - lastTick);
    lastTick = ev.tick;

    const vlqDelta = encodeVLQ(deltaTicks);
    trackBytes.push(...vlqDelta);

    if (ev.type === 'noteOn') {
      trackBytes.push(0x90, ev.midiNumber & 0x7f, ev.velocity & 0x7f);
    } else {
      trackBytes.push(0x80, ev.midiNumber & 0x7f, 0x00);
    }
  }

  // End of Track Meta Event
  trackBytes.push(0x00, 0xff, 0x2f, 0x00);

  // Header Chunk (MThd)
  const header = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Length = 6
    0x00, 0x00,             // Format 0
    0x00, 0x01,             // 1 track
    (ticksPerBeat >> 8) & 0xff, ticksPerBeat & 0xff, // Ticks per quarter note
  ];

  // Track Chunk (MTrk)
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    (trackBytes.length >> 24) & 0xff,
    (trackBytes.length >> 16) & 0xff,
    (trackBytes.length >> 8) & 0xff,
    trackBytes.length & 0xff,
  ];

  return new Uint8Array([...header, ...trackHeader, ...trackBytes]);
}

// Standard MIDI Format 1 Multi-Track Binary File Generator for FL Studio & DAWs
export function generateMultiTrackMidiFile(
  projectName: string,
  bpm: number = 120,
  tracks: MidiTrackConfig[],
  markers: MidiMarker[] = []
): Uint8Array {
  const ticksPerBeat = 480;
  const microsecondsPerBeat = Math.round(60000000 / Math.max(20, bpm));

  const allTrackChunks: number[][] = [];

  // Conductor Track (Track 0)
  const conductorBytes: number[] = [];
  const projNameBytes = Array.from(new TextEncoder().encode(`${projectName} (FL Studio Bundle)`));
  conductorBytes.push(0x00, 0xff, 0x03, projNameBytes.length, ...projNameBytes);

  // Tempo Meta Event
  conductorBytes.push(
    0x00, 0xff, 0x51, 0x03,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff
  );

  // Time Signature Meta Event (4/4)
  conductorBytes.push(0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Markers meta-events (0xFF 0x06)
  let lastMarkerTick = 0;
  const sortedMarkers = [...markers].sort((a, b) => a.startTimeSec - b.startTimeSec);
  for (const m of sortedMarkers) {
    const markerTick = Math.max(0, Math.round((m.startTimeSec * bpm / 60) * ticksPerBeat));
    const delta = Math.max(0, markerTick - lastMarkerTick);
    lastMarkerTick = markerTick;

    const labelBytes = Array.from(new TextEncoder().encode(m.label));
    const vlqDelta = encodeVLQ(delta);
    conductorBytes.push(...vlqDelta, 0xff, 0x06, labelBytes.length, ...labelBytes);
  }

  // End of Conductor Track
  conductorBytes.push(0x00, 0xff, 0x2f, 0x00);
  allTrackChunks.push(conductorBytes);

  // Instrument Stem Tracks
  for (const trk of tracks) {
    const trackBytes: number[] = [];
    const channel = Math.max(0, Math.min(15, trk.channel));

    // Track Name
    const trkNameBytes = Array.from(new TextEncoder().encode(trk.trackName));
    trackBytes.push(0x00, 0xff, 0x03, trkNameBytes.length, ...trkNameBytes);

    // Program Change event if patch provided (0xC0 | channel, patch)
    if (trk.programNumber !== undefined) {
      const patch = Math.max(0, Math.min(127, trk.programNumber));
      trackBytes.push(0x00, 0xc0 | channel, patch);
    }

    type MidiEvent = {
      tick: number;
      type: 'noteOn' | 'noteOff';
      midiNumber: number;
      velocity: number;
    };

    const events: MidiEvent[] = [];

    for (const n of trk.notes) {
      const startTick = Math.max(0, Math.round((n.startTimeSec * bpm / 60) * ticksPerBeat));
      const durationTicks = Math.max(1, Math.round((n.durationSec * bpm / 60) * ticksPerBeat));
      const endTick = startTick + durationTicks;
      const velocity = Math.max(1, Math.min(127, Math.round(n.velocity)));

      events.push({ tick: startTick, type: 'noteOn', midiNumber: n.midiNumber, velocity });
      events.push({ tick: endTick, type: 'noteOff', midiNumber: n.midiNumber, velocity: 0 });
    }

    events.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      if (a.type === 'noteOff' && b.type === 'noteOn') return -1;
      if (a.type === 'noteOn' && b.type === 'noteOff') return 1;
      return a.midiNumber - b.midiNumber;
    });

    let lastTick = 0;
    for (const ev of events) {
      const deltaTicks = Math.max(0, ev.tick - lastTick);
      lastTick = ev.tick;

      const vlqDelta = encodeVLQ(deltaTicks);
      trackBytes.push(...vlqDelta);

      if (ev.type === 'noteOn') {
        trackBytes.push(0x90 | channel, ev.midiNumber & 0x7f, ev.velocity & 0x7f);
      } else {
        trackBytes.push(0x80 | channel, ev.midiNumber & 0x7f, 0x00);
      }
    }

    // End of track
    trackBytes.push(0x00, 0xff, 0x2f, 0x00);
    allTrackChunks.push(trackBytes);
  }

  // SMF Format 1 Header
  const numTracks = allTrackChunks.length;
  const header = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Length 6
    0x00, 0x01,             // Format 1 (Multi-Track)
    (numTracks >> 8) & 0xff, numTracks & 0xff,
    (ticksPerBeat >> 8) & 0xff, ticksPerBeat & 0xff,
  ];

  const fullFileBytes: number[] = [...header];

  for (const chunk of allTrackChunks) {
    const trackHeader = [
      0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
      (chunk.length >> 24) & 0xff,
      (chunk.length >> 16) & 0xff,
      (chunk.length >> 8) & 0xff,
      chunk.length & 0xff,
    ];
    fullFileBytes.push(...trackHeader, ...chunk);
  }

  return new Uint8Array(fullFileBytes);
}

export function downloadMidiBlob(data: Uint8Array, filename: string): void {
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.mid') ? filename : `${filename}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}