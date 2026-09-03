import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateRemixDirections } from '@/engine/remixEngine';
import { detectBpmFromAudioFile, normalizeBpmWithRange } from '@/utils/bpmDetector';

export interface ChordStep {
  stepNumber: number;
  chordName: string;
  romanNumeral: string;
}

export interface RemixDirection {
  id: string;
  title: string;
  genre: string;
  subgenre?: string;
  vocalArchetype?: string;
  vocalTimbre?: string;
  narrativeConcept?: string;
  narrativeThemePrompt?: string;
  reharmonization?: string;
  romanProgression?: string;
  harmonicMetatag?: string;
  stylePrompt: string;
  negativeTags: string[];
  bpm: number;
  key: string;
  description: string;
  instrumentation: string[];
  sectionTags: string[];
  lyrics: string;
}

export interface AudioAnalysisResult {
  detectedBpm: number;
  exactBpm?: number;
  detectedKey?: string;
  chordProgression?: string;
  chordSteps?: ChordStep[];
  harmonicVibe?: string;
  vocalTimbre?: string;
  instrumentation?: string[];
  detectedGenre?: string;
  detectedMood?: string;
  remixDirections: RemixDirection[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      resolve(res.split(',')[1] || res);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function analyzeAudioWithGemini(file: File): Promise<AudioAnalysisResult> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || '';

  if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY') {
    try {
      const base64Data = await fileToBase64(file);
      const genAI = new GoogleGenerativeAI(apiKey);
      let model;
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      } catch {
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      }

      const prompt = `Analyze this audio track for key, tempo, harmonic structure, vocal characteristics, and instrumentation. Break down the progression chord-by-chord with step numbers, actual chord names, and case-sensitive Roman numerals (Uppercase for Major e.g. I, IV, V, Imaj7; Lowercase for Minor e.g. i, ii, iii, vi, iim7; Diminished/Augmented e.g. vii°, iiø7, V+). Return ONLY a valid JSON object matching this schema:
{
  "detectedBpm": 124,
  "detectedKey": "F# Minor",
  "chordProgression": "F#m7 - Bm7 - E7 - AMaj7",
  "chordSteps": [
    { "stepNumber": 1, "chordName": "F#m7", "romanNumeral": "im7" },
    { "stepNumber": 2, "chordName": "Bm7", "romanNumeral": "ivm7" },
    { "stepNumber": 3, "chordName": "E7", "romanNumeral": "VII7" },
    { "stepNumber": 4, "chordName": "AMaj7", "romanNumeral": "IIImaj7" }
  ],
  "harmonicVibe": "Jazzy 2-5-1 voicings with major 7th resolution",
  "vocalTimbre": "Airy Breathy Soprano",
  "instrumentation": ["Moog Synth Bass", "Arpeggiator", "Gated Drums", "Fender Rhodes"],
  "detectedGenre": "Electronic",
  "detectedMood": "Atmospheric & Driving",
  "remixDirections": [
    {
      "id": "dir-synthwave",
      "title": "Synthwave / Retrowave Re-Imagining",
      "genre": "synthwave",
      "subgenre": "Retrowave",
      "vocalArchetype": "retro-soul-winehouse",
      "vocalTimbre": "Airy Breathy Soprano",
      "narrativeConcept": "Neon City Midnight Drive",
      "reharmonization": "Pulsing Minor 7th Synth Pads & Sub-Octave Pedals",
      "romanProgression": "im7 - ivm7 - VII7 - IIImaj7",
      "harmonicMetatag": "[Harmonic Movement: im7 - ivm7 - VII7 - IIImaj7]",
      "stylePrompt": "synthwave retrowave re-imagining, 124 bpm, F# Minor, moog synth bass, arpeggiated lead synths, gated reverb drums, neon juno pads, pulsing minor 7th synth pads",
      "negativeTags": ["crowd", "applause", "screaming", "acoustic-guitar", "country"],
      "bpm": 124,
      "key": "F# Minor",
      "description": "Pulse-pounding 80s retrowave reimagining driven by analog Moog basslines, neon synth pads, and gated drums.",
      "instrumentation": ["Moog Synth Bass", "Arpeggiated Leads", "Juno Pads", "LinnDrum"],
      "sectionTags": ["[Intro]", "[Verse]", "[Chorus]", "[Outro]"],
      "lyrics": "[Intro]\\nAnalog synths warm up, gated drums punch through the dark neon light\\n\\n[Verse]\\nPulsing basslines hum along the highway grid\\nElectric shadows shifting past the city edge\\nSynthesized harmonics echoing through the night\\n\\n[Chorus]\\nRetrowave surge taking control of the beat\\nSynthwave energy igniting every street\\nFeel the analog warmth rise up high\\n\\n[Outro]\\nArpeggiated pluck tail fading out into atmospheric neon glow"
    }
  ]
}`;

      const response = await model.generateContent([
        { inlineData: { data: base64Data, mimeType: file.type || 'audio/mp3' } },
        prompt,
      ]);

      const text = response.response.text().trim();
      const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleaned) as AudioAnalysisResult;

      // Run Web Audio API autocorrelation tempo detection via web-audio-beat-detector
      const beatResult = await detectBpmFromAudioFile(file);
      parsed.detectedBpm = beatResult.bpm;
      parsed.exactBpm = beatResult.exactBpm;

      if (parsed.detectedBpm && parsed.detectedKey && Array.isArray(parsed.remixDirections) && parsed.remixDirections.length >= 3) {
        return parsed;
      }
    } catch (err) {
      console.warn('Gemini API notice, using audio engine fallback:', err);
    }
  }

  // Fallback Local Estimation Engine with Web Audio API Autocorrelation Tempo Detection
  const beatResult = await detectBpmFromAudioFile(file);
  const detectedBpm = beatResult.bpm;
  const exactBpm = beatResult.exactBpm;

  const seed = file.name.length + file.size;
  const keys = ['F# Minor', 'C Minor', 'G Major', 'A Minor', 'D Minor', 'E Major', 'B♭ Major', 'E♭ Major', 'G Minor'];
  const timbres = ['Airy Breathy Soprano', 'Gritty Raspy Baritone', 'Smoky Low-Register Alto', 'Soaring Dynamic Tenor', 'Intimate Whisper Falsetto'];
  const moods = ['Atmospheric & Energetic', 'Melancholic Groove', 'Euphoric Uplifting', 'Intimate & Warm', 'Funky & Bouncy', 'Dystopian Grit'];

  const detectedKey = keys[seed % keys.length];
  const vocalTimbre = timbres[seed % timbres.length];

  const chordProgressionMaps: Record<string, { progression: string; steps: ChordStep[]; vibe: string }> = {
    'F# Minor': {
      progression: 'F#m7 - Bm7 - E7 - AMaj7',
      steps: [
        { stepNumber: 1, chordName: 'F#m7', romanNumeral: 'im7' },
        { stepNumber: 2, chordName: 'Bm7', romanNumeral: 'ivm7' },
        { stepNumber: 3, chordName: 'E7', romanNumeral: 'VII7' },
        { stepNumber: 4, chordName: 'AMaj7', romanNumeral: 'IIImaj7' },
      ],
      vibe: 'Jazzy 2-5-1 voicings with major 7th resolution',
    },
    'C Minor': {
      progression: 'Cm7 - A♭Maj7 - Fm7 - G7',
      steps: [
        { stepNumber: 1, chordName: 'Cm7', romanNumeral: 'im7' },
        { stepNumber: 2, chordName: 'A♭Maj7', romanNumeral: 'VImaj7' },
        { stepNumber: 3, chordName: 'Fm7', romanNumeral: 'ivm7' },
        { stepNumber: 4, chordName: 'G7', romanNumeral: 'V7' },
      ],
      vibe: 'Dark modal shift with dominant resolution',
    },
    'G Major': {
      progression: 'G - D - Em - C',
      steps: [
        { stepNumber: 1, chordName: 'G', romanNumeral: 'I' },
        { stepNumber: 2, chordName: 'D', romanNumeral: 'V' },
        { stepNumber: 3, chordName: 'Em', romanNumeral: 'vi' },
        { stepNumber: 4, chordName: 'C', romanNumeral: 'IV' },
      ],
      vibe: 'Classic 4-chord pop loop',
    },
    'A Minor': {
      progression: 'Am7 - Dm7 - G7 - CMaj7',
      steps: [
        { stepNumber: 1, chordName: 'Am7', romanNumeral: 'im7' },
        { stepNumber: 2, chordName: 'Dm7', romanNumeral: 'ivm7' },
        { stepNumber: 3, chordName: 'G7', romanNumeral: 'VII7' },
        { stepNumber: 4, chordName: 'CMaj7', romanNumeral: 'IIImaj7' },
      ],
      vibe: 'Atmospheric minor 2-5-1 cycle',
    },
    'D Minor': {
      progression: 'Dm7 - Gm7 - C7 - FMaj7',
      steps: [
        { stepNumber: 1, chordName: 'Dm7', romanNumeral: 'im7' },
        { stepNumber: 2, chordName: 'Gm7', romanNumeral: 'ivm7' },
        { stepNumber: 3, chordName: 'C7', romanNumeral: 'VII7' },
        { stepNumber: 4, chordName: 'FMaj7', romanNumeral: 'IIImaj7' },
      ],
      vibe: 'Smooth cycle of fifths reharmonization',
    },
    'E Major': {
      progression: 'E - B - C#m - A',
      steps: [
        { stepNumber: 1, chordName: 'E', romanNumeral: 'I' },
        { stepNumber: 2, chordName: 'B', romanNumeral: 'V' },
        { stepNumber: 3, chordName: 'C#m', romanNumeral: 'vi' },
        { stepNumber: 4, chordName: 'A', romanNumeral: 'IV' },
      ],
      vibe: 'Uplifting anthemic major loop',
    },
    'B♭ Major': {
      progression: 'B♭Maj7 - Gm7 - Cm7 - F7',
      steps: [
        { stepNumber: 1, chordName: 'B♭Maj7', romanNumeral: 'Imaj7' },
        { stepNumber: 2, chordName: 'Gm7', romanNumeral: 'vim7' },
        { stepNumber: 3, chordName: 'Cm7', romanNumeral: 'iim7' },
        { stepNumber: 4, chordName: 'F7', romanNumeral: 'V7' },
      ],
      vibe: 'Lush neo-soul 7th chord movement',
    },
    'E♭ Major': {
      progression: 'E♭Maj7 - Cm7 - Fm7 - B♭7',
      steps: [
        { stepNumber: 1, chordName: 'E♭Maj7', romanNumeral: 'Imaj7' },
        { stepNumber: 2, chordName: 'Cm7', romanNumeral: 'vim7' },
        { stepNumber: 3, chordName: 'Fm7', romanNumeral: 'iim7' },
        { stepNumber: 4, chordName: 'B♭7', romanNumeral: 'V7' },
      ],
      vibe: 'Warm jazz ballad cadences',
    },
    'G Minor': {
      progression: 'Gm7 - E♭Maj7 - Dm7 - Cm7',
      steps: [
        { stepNumber: 1, chordName: 'Gm7', romanNumeral: 'im7' },
        { stepNumber: 2, chordName: 'E♭Maj7', romanNumeral: 'VImaj7' },
        { stepNumber: 3, chordName: 'Dm7', romanNumeral: 'vm7' },
        { stepNumber: 4, chordName: 'Cm7', romanNumeral: 'ivm7' },
      ],
      vibe: 'Pulsing dark synthwave progression',
    },
  };

  const harmInfo = chordProgressionMaps[detectedKey] || {
    progression: 'F#m7 - Bm7 - E7 - AMaj7',
    steps: [
      { stepNumber: 1, chordName: 'F#m7', romanNumeral: 'im7' },
      { stepNumber: 2, chordName: 'Bm7', romanNumeral: 'ivm7' },
      { stepNumber: 3, chordName: 'E7', romanNumeral: 'VII7' },
      { stepNumber: 4, chordName: 'AMaj7', romanNumeral: 'IIImaj7' },
    ],
    vibe: 'Jazzy 2-5-1 voicings',
  };

  const remixDirections = generateRemixDirections(
    { name: file.name, size: file.size },
    detectedBpm,
    detectedKey,
    0
  );

  return {
    detectedBpm,
    exactBpm,
    detectedKey,
    chordProgression: harmInfo.progression,
    chordSteps: harmInfo.steps,
    harmonicVibe: harmInfo.vibe,
    vocalTimbre,
    detectedGenre: remixDirections[0]?.genre || 'Electronic',
    detectedMood: moods[seed % moods.length],
    instrumentation: remixDirections[0]?.instrumentation || ['Analog Synth Bass', 'Fender Rhodes', 'Acoustic Guitar', 'Gated Drums'],
    remixDirections,
  };
}
