// Minnesota / Minneapolis Sound genre configuration & mappings

export const MINNESOTA_SOUND_TAGS =
  'Minneapolis Sound, Oberheim OB-Xa synth brass, tight LinnDrum 808/LM-1 patterns, slap bass pocket, gated reverb snare, falsetto harmonies, funk guitar chop, clean electro-funk production';

export const MINNESOTA_SOUND_ACCENTS = [
  'Minneapolis Sound',
  'Minnesota Sound',
  'Electro-Funk',
  'Boogie / Post-Disco',
  'New Wave Funk',
  'Synth-Pop Soul',
] as const;

export const MINNESOTA_SOUND_PRESET = {
  id: 'minnesota-sound-card',
  name: 'Minneapolis Sound',
  emoji: '🟣',
  blurb: 'Oberheim OB-Xa synths, LinnDrum pocket, falsetto funk harmonies, punchy slap bass, dry studio mix',
  category: 'vintage' as const,
  microGenre: 'Minneapolis Sound',
  genres: ['rnb', 'electronic', 'synthwave'],
  subgenres: ['Minnesota Sound', 'Minneapolis Sound', 'Electro-Funk', 'Boogie / Post-Disco', 'New Wave Funk', 'Synth-Pop Soul'],
  instruments: ['linndrum', 'oberheim-synths', 'slap-bass', 'chorused-guitar'],
  vocalTypes: ['falsetto'],
  vocalEffects: ['reverb-drenched', 'dry-intimate'],
  moods: ['euphoric', 'gritty', 'dreamy'],
  production: ['hifi-studio', 'wide-stereo', 'tape-saturation'],
  negativeTags: ['crowd', 'applause', 'audience', 'cheering', 'screaming'],
  musicalKeys: ['e-minor'],
  chordVoicings: ['jazz-voicings'],
  bpm: 116,
  timeFeel: 'normal' as const,
  customInstruments: [],
  blend: 80,
  artistArchetypes: [],
  artistBlend: 75,
  lyricTheme: 'Oberheim OB-Xa synths, LinnDrum pocket, falsetto funk harmonies, punchy slap bass, dry studio mix',
  lyricStructureId: 'standard-pop',
  lyricRhymeScheme: 'AABB',
  lyricMetatags: '[Verse 1 | intimate falsetto glide]\n[Chorus | ecstatic funk-pop release]\n[Bridge | synth breakdown and guitar shimmer]\n[Outro | stacked falsetto ad-libs]',
  matchingPills: {
    genres: ['rnb', 'electronic'],
    instruments: ['linndrum', 'oberheim-synths', 'slap-bass', 'chorused-guitar'],
    vocalTypes: ['falsetto'],
    vocalEffects: ['reverb-drenched', 'dry-intimate'],
    moods: ['euphoric', 'gritty', 'dreamy'],
    chordVoicings: ['jazz-voicings'],
    negativeTags: ['crowd', 'applause', 'audience', 'cheering', 'screaming'],
  },
};
