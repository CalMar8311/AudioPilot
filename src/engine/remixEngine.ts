import type { RemixDirection } from '@/services/geminiAudio';
import { cleanLyricText } from '@/engine/lyricEngine';
import { getGenreStructure } from '@/utils/songStructures';

export interface RemixArchetype {
  id: string;
  family: string;
  title: string;
  genre: string;
  subgenre: string;
  vocalArchetype: string;
  vocalTimbre: string;
  narrativeConcept?: string;
  narrativeThemePrompt?: string;
  reharmonization?: string;
  romanProgression?: string;
  harmonicMetatag?: string;
  bpmCalc: (baseBpm: number) => number;
  instrumentation: string[];
  negativeTags: string[];
  stylePromptTemplate: (bpm: number, key: string) => string;
  description: string;
  lyricTheme: {
    sectionTags: string[];
    verses: string[];
    chorus: string;
    intro: string;
    outro: string;
  };
}

export const REMIX_ARCHETYPES_POOL: RemixArchetype[] = [
  {
    id: 'minneapolis-sound',
    family: 'funk-disco',
    title: 'Minneapolis Sound / Prince-Core Funk Flip',
    genre: 'electronic',
    subgenre: 'Minneapolis Sound',
    vocalArchetype: 'neo-soul-badu',
    vocalTimbre: 'Dynamic Falsetto & Raw Screams',
    narrativeConcept: 'Electrified Dancefloor Romance',
    narrativeThemePrompt: 'Electrified Dancefloor Romance, late-night high-voltage desire under city lights',
    reharmonization: '1-4-5 Electro-Funk Stabs with Chromatic Passing Chords',
    romanProgression: 'I - IV - V - vi',
    harmonicMetatag: '[Harmonic Movement: I - IV - V - vi]',
    bpmCalc: (base) => Math.min(130, Math.max(105, Math.round(base * 0.95))),
    instrumentation: ['Oberheim Synths', 'LinnDrum Percussion', 'Slap Bass', 'Chorused Electric Guitar'],
    negativeTags: ['country', 'orchestral', 'heavy metal', 'screaming'],
    stylePromptTemplate: (bpm, key) =>
      `minneapolis sound funk flip, 80s electro-funk groove, ${bpm} bpm, ${key}, oberheim synth brass stabs, linndrum percussion, slap bassline, chorused guitar riffs`,
    description: 'Classic 80s Minnesota sound overhaul packed with synth-brass stabs, LinnDrum punch, and infectious slap-bass bounce.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Funk Groove]', '[Verse]', '[Chorus]', '[Outro]'],
      intro: 'LinnDrum snare roll cracks open, synth-brass stabs ignite the pocket',
      verses: [
        'Electric city lights reflected on chrome rims',
        'Synth bass popping low while chorused guitar kicks in',
        'Contagious rhythm moving through the boulevard night',
      ],
      chorus: 'Minneapolis groove taking over tonight\nFeel the funky heat rising clear out of sight',
      outro: 'Synth-brass vamp riding over LinnDrum breakdown to the end',
    },
  },
  {
    id: 'synthwave-retrowave',
    family: 'synth',
    title: 'Synthwave / Retrowave Re-Imagining',
    genre: 'synthwave',
    subgenre: 'Retrowave',
    vocalArchetype: 'classic-rock-belter',
    vocalTimbre: 'Airy Breathy Soprano / Tenor',
    narrativeConcept: 'Neon City Midnight Drive',
    narrativeThemePrompt: 'Neon City Midnight Drive, cruising through midnight rain on the digital grid',
    reharmonization: 'Pulsing Minor 7th Synth Pads & Sub-Octave Pedals',
    romanProgression: 'im7 - VImaj7 - IIImaj7 - VII7',
    harmonicMetatag: '[Harmonic Movement: im7 - VImaj7 - IIImaj7 - VII7]',
    bpmCalc: (base) => Math.min(135, Math.max(115, Math.round(base * 1.05))),
    instrumentation: ['Moog Synth Bass', 'Arpeggiated Leads', 'Juno Pads', 'Gated Drums'],
    negativeTags: ['acoustic', 'country', 'folk', 'orchestral'],
    stylePromptTemplate: (bpm, key) =>
      `synthwave retrowave re-imagining, ${bpm} bpm, ${key}, moog synth bass, arpeggiated lead synths, gated reverb drums, neon juno pads`,
    description: 'Pulse-pounding 80s retrowave reimagining driven by analog Moog basslines, neon synth pads, and gated reverb percussion.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Verse]', '[Chorus]', '[Beat Drop]', '[Outro]'],
      intro: 'Analog synths warm up, gated drums punch through dark neon glow',
      verses: [
        'Pulsing basslines hum along the highway grid',
        'Electric shadows shifting past the city edge',
        'Synthesized harmonics echoing through midnight air',
      ],
      chorus: 'Retrowave surge taking control of the beat\nSynthwave energy igniting every street',
      outro: 'Arpeggiated pluck tail fading out into atmospheric neon glow',
    },
  },
  {
    id: 'afrobeat-bounce',
    family: 'afro-caribbean',
    title: 'Afrobeat / Club Bounce Flip',
    genre: 'afrobeat',
    subgenre: 'Afrobeats',
    vocalArchetype: 'latin-reggaeton-flow',
    vocalTimbre: 'Warm Whispered Falsetto',
    narrativeConcept: 'High-Energy Island Heat',
    narrativeThemePrompt: 'High-Energy Island Heat, infectious tropical groove and sunset celebration',
    reharmonization: 'Syncopated Dominant 9th Stabs with Log Drum Root',
    romanProgression: 'iim7 - V7 - Imaj7',
    harmonicMetatag: '[Harmonic Movement: iim7 - V7 - Imaj7]',
    bpmCalc: () => 108,
    instrumentation: ['Log Drum Sub', 'Syncopated Congas', 'Fender Rhodes', 'Brass Stabs'],
    negativeTags: ['heavy metal', 'screaming', 'country', 'sad acoustic'],
    stylePromptTemplate: (bpm, key) =>
      `afrobeat club bounce flip, ${bpm} bpm, ${key}, syncopated dembow percussion, log drum sub bass, brass horn stabs, warm fender rhodes`,
    description: 'High-energy Afrobeat dancefloor flip featuring syncopated log drums, brass horn stabs, and infectious percussive bounce.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Verse]', '[Chorus]', '[Percussion Breakdown]', '[Outro]'],
      intro: 'Shaker loop enters, deep log drum sub drops into syncopated swing',
      verses: [
        'Cross-rhythms bouncing under electric keys',
        'Brass stabs echoing softly through the breeze',
        'Catch the rhythmic pulse moving floor to floor',
      ],
      chorus: 'Afrobeat bounce lifting everyone tonight\nClub rhythm surging, feeling pure delight',
      outro: 'Solo conga percussive breakdown riding out to a smooth fade',
    },
  },
  {
    id: 'dark-cyberpunk',
    family: 'industrial',
    title: 'Dark Cyberpunk / Darksynth Overhaul',
    genre: 'cyberpunk',
    subgenre: 'Darksynth',
    vocalArchetype: 'psychedelic-trap',
    vocalTimbre: 'Industrial Vocoder / Gritty Vox',
    bpmCalc: (base) => Math.min(145, Math.max(125, Math.round(base * 1.1))),
    instrumentation: ['Distorted Saw Bass', 'Glitch Percussion', 'Industrial Chops', 'Cyber Synths'],
    negativeTags: ['soft', 'acoustic', 'jazz', 'country'],
    stylePromptTemplate: (bpm, key) =>
      `dark cyberpunk darksynth overhaul, ${bpm} bpm, ${key}, aggressive distorted saw bass, glitch percussion, industrial synth chops`,
    description: 'Dystopian darksynth overhaul with menacing distorted basslines, aggressive glitch chops, and high-tech industrial grit.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Distortion Rise]', '[Verse]', '[Chorus]', '[Glitch Drop]', '[Outro]'],
      intro: 'Warning sirens wail as overdriven saw bass hums beneath the grid',
      verses: [
        'Neon rain falls through dystopian concrete spires',
        'Digital pulse humming with electric fires',
        'Sub-bass vibrations shatter neon glass',
      ],
      chorus: 'Cyberpunk overload breaking all the rules\nDarksynth rebellion conquering the fools',
      outro: 'Glitch chops and distorted feedback decaying into silence',
    },
  },
  {
    id: 'yacht-rock-aor',
    family: 'rock-aor',
    title: '70s West Coast AOR / Smooth Yacht Rock Redo',
    genre: 'yacht-rock',
    subgenre: 'West Coast AOR',
    vocalArchetype: 'alt-rnb-falsetto',
    vocalTimbre: 'Smooth Melodic Tenor / Harmonies',
    bpmCalc: () => 92,
    instrumentation: ['Fender Rhodes', 'Chorused Electric Guitar', 'Smooth Horn Section', 'Studio Drums'],
    negativeTags: ['heavy distortion', 'hardstyle', 'screaming', 'trap'],
    stylePromptTemplate: (bpm, key) =>
      `70s west coast aor yacht rock redo, ${bpm} bpm, ${key}, lush fender rhodes, chorused electric guitar solo, tight studio drums`,
    description: 'Lush 1978 West Coast AOR track featuring silky Fender Rhodes chords, chorused guitar hooks, and smooth studio harmonies.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Verse]', '[Chorus]', '[Guitar Solo]', '[Outro]'],
      intro: 'Silky Fender Rhodes progression with gentle hi-hat breeze',
      verses: [
        'Pacific highway cruising under golden sun',
        'Warm ocean air whispers the day is done',
        'Lush harmonies floating on smooth West Coast rhythm',
      ],
      chorus: 'Yacht rock breeze blowing all our cares away\nSmooth AOR warmth guiding us through the day',
      outro: 'Chorused electric guitar solo fading out into Pacific sunset',
    },
  },
  {
    id: 'dnb-jungle',
    family: 'bass-breakbeat',
    title: 'Liquid Drum & Bass / Jungle Roller',
    genre: 'electronic',
    subgenre: 'Drum & Bass',
    vocalArchetype: 'alt-rnb-falsetto',
    vocalTimbre: 'Soulful Atmospheric Soprano',
    bpmCalc: () => 174,
    instrumentation: ['Sub Bass Reese', 'Amen Break Chops', 'Lush FM Pads', 'Vocal Chops'],
    negativeTags: ['acoustic', 'country', 'rock', 'metal'],
    stylePromptTemplate: (bpm, key) =>
      `liquid drum and bass jungle roller, ${bpm} bpm, ${key}, deep sub bass reese, high-speed breakbeats, amen break chops`,
    description: 'High-speed 174 BPM liquid roller with deep Reese sub-bass, sliced breakbeats, and uplifting vocal atmospheres.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Buildup]', '[Roller Drop]', '[Verse]', '[Chorus]', '[Outro]'],
      intro: 'Atmospheric pad swells as crisp amen snare roll accelerates',
      verses: [
        '174 BPM breaks slicing through the dark',
        'Deep Reese bassline leaving its mark',
        'Soulful vocal chops echoing in the air',
      ],
      chorus: 'Liquid energy rolling through the night\nFeel the sub-bass lift us into flight',
      outro: 'Breakbeat solo fading as ambient pad reverb trails off',
    },
  },
  {
    id: 'acoustic-neo-soul',
    family: 'rnb-soul',
    title: 'Acoustic Stripped / Neo-Soul Redo',
    genre: 'rnb',
    subgenre: 'Neo-Soul',
    vocalArchetype: 'neo-soul-badu',
    vocalTimbre: 'Smoky Low-Register Alto',
    bpmCalc: () => 78,
    instrumentation: ['Acoustic Guitar', 'Upright Bass', 'Fender Rhodes', 'Brush Drums'],
    negativeTags: ['autotune', 'screaming', 'heavy distortion', 'hardstyle'],
    stylePromptTemplate: (bpm, key) =>
      `acoustic stripped neo-soul redo, ${bpm} bpm, ${key}, fingerpicked acoustic guitar, warm upright bass, fender rhodes chords`,
    description: 'Intimate stripped-down neo-soul redo with fingerpicked acoustic guitar, lush Fender Rhodes chords, and warm upright bass.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Verse]', '[Chorus]', '[Rhodes Solo]', '[Outro]'],
      intro: 'Soft fingerpicked acoustic guitar with warm vinyl crackle and Rhodes chords',
      verses: [
        'Bare acoustic stems breathing in silent space',
        'Smoky vocal melodies filling up the room',
        'Unplugged emotion stripped down to the core',
      ],
      chorus: 'Neo-soul warmth wrapping soft around the soul\nAcoustic harmony making whole world whole',
      outro: 'Acoustic guitar harmonic decay fading into vinyl crackle',
    },
  },

  {
    id: 'cinematic-metal',
    family: 'rock-metal',
    title: 'Cinematic Metal / Industrial Djent Hybrid',
    genre: 'metal',
    subgenre: 'Djent',
    vocalArchetype: 'classic-rock-belter',
    vocalTimbre: 'Soaring Rock Belting / Operatic',
    bpmCalc: (base) => Math.min(138, Math.max(110, Math.round(base))),
    instrumentation: ['Down-Tuned 8-String Guitars', 'Orchestral Brass', 'Sub-Impact Drums'],
    negativeTags: ['soft', 'acoustic-pop', 'country', 'reggaeton'],
    stylePromptTemplate: (bpm, key) =>
      `cinematic metal djent hybrid, ${bpm} bpm, ${key}, down-tuned 8-string guitars, orchestral brass, massive sub-impact drums`,
    description: 'Crushing djent metal hybrid blending down-tuned 8-string riffs with epic orchestral brass and soaring rock belting.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Heavy Riff]', '[Verse]', '[Chorus]', '[Breakdown Drop]', '[Outro]'],
      intro: 'Orchestral brass swells as down-tuned 8-string guitar riffs crash in',
      verses: [
        'Thunderous sub-impacts shaking the floor',
        'Aggressive guitar polyrhythms roaring for more',
        'Orchestral shadows clashing with industrial steel',
      ],
      chorus: 'Cinematic power rising through the storm\nMetal energy reborn in heavy form',
      outro: 'Massive sub-impact and guitar feedback decaying into silence',
    },
  },
  {
    id: 'lofi-chillhop',
    family: 'lofi',
    title: 'Dusty Lo-Fi / Chillhop Cafe Flip',
    genre: 'lofi',
    subgenre: 'Lo-Fi Beats',
    vocalArchetype: 'indie-bedroom-pop',
    vocalTimbre: 'Mellow Intimate Whisper',
    bpmCalc: () => 82,
    instrumentation: ['Dusty Vinyl Crackle', 'Mellow Rhodes Chords', 'Lazy Swing Drums'],
    negativeTags: ['screaming', 'heavy metal', 'hardstyle', 'edm'],
    stylePromptTemplate: (bpm, key) =>
      `dusty lofi chillhop cafe flip, ${bpm} bpm, ${key}, dusty vinyl crackle, mellow rhodes chords, lazy unquantized swing drums`,
    description: 'Cozy lo-fi chillhop reimagining featuring dusty vinyl crackle, warm Rhodes chords, and unquantized swing drums.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Lo-Fi Beat]', '[Verse]', '[Chorus]', '[Outro]'],
      intro: 'Needle drops on vinyl, crackle fills the room with mellow Rhodes chords',
      verses: [
        'Raindrops tapping soft on the window pane',
        'Warm coffee steaming while rhythm soothes the brain',
        'Lazy drum swing keeping unhurried pace',
      ],
      chorus: 'Lo-Fi sanctuary keeping feelings calm\nMellow chords wrapping like a soothing balm',
      outro: 'Vinyl crackle and soft Rhodes chord trail fading into quiet',
    },
  },

  {
    id: 'boom-bap-hiphop',
    family: 'hiphop',
    title: '90s Crate-Digger / Boom-Bap Flip',
    genre: 'hiphop',
    subgenre: 'Boom-Bap',
    vocalArchetype: 'east-coast-boom-bap-flow',
    vocalTimbre: 'Gritty Close-Mic Rap / Pocket',
    bpmCalc: () => 88,
    instrumentation: ['Crate-Dug Drum Breaks', 'Filtered Jazz Bass', 'Vinyl Chops'],
    negativeTags: ['country', 'orchestral', 'hyperpop', 'edm'],
    stylePromptTemplate: (bpm, key) =>
      `90s east coast boom bap flip, ${bpm} bpm, ${key}, raw crate-dug drum breaks, filtered jazz bassline, dusty vinyl chops`,
    description: 'Golden era 90s boom-bap conversion packed with dusty vinyl chops, filtered jazz basslines, and head-nodding drum breaks.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Vinyl Scratch]', '[Verse]', '[Chorus]', '[Beat Break]', '[Outro]'],
      intro: 'Vinyl scratch sample drops into punchy 88 BPM boom-bap breakbeat',
      verses: [
        'Golden era cadence riding tight multi-syllabic lines',
        'Crate-dug jazz samples woven between the rhymes',
        'Raw head-nod rhythm keeping East Coast swing',
      ],
      chorus: 'Boom-bap authenticity ringing loud and clear\nGolden era hip-hop vibes bringing magic here',
      outro: 'Filtered drum break and vinyl scratch fading out',
    },
  },
  {
    id: 'progressive-trance',
    family: 'trance',
    title: 'Anjunabeats Progressive Trance Anthem',
    genre: 'electronic',
    subgenre: 'Trance',
    vocalArchetype: 'power-pop-diva',
    vocalTimbre: 'Soaring Euphoric Soprano',
    bpmCalc: () => 128,
    instrumentation: ['Soaring Saw Lead', 'Pluck Arpeggios', 'Rolling Bassline'],
    negativeTags: ['country', 'acoustic', 'lo-fi', 'trap'],
    stylePromptTemplate: (bpm, key) =>
      `anjunabeats progressive trance anthem, ${bpm} bpm, ${key}, soaring saw wave synth lead, pluck arpeggios, rolling bassline`,
    description: 'Euphoric Anjunabeats-style progressive trance anthem with soaring saw leads, emotional breakdowns, and rolling 128 BPM drive.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Verse]', '[Emotional Breakdown]', '[Buildup]', '[Main Drop]', '[Outro]'],
      intro: 'Atmospheric synth pad swells into crisp 128 BPM kick and rolling bass',
      verses: [
        'Pluck arpeggios shimmering in endless space',
        'Harmonic chords building toward the main drop space',
        'Euphoric vocal melody soaring high above',
      ],
      chorus: 'Trance uplift carrying our hearts away\nFeel the energy shining brighter than the day',
      outro: 'Rolling bassline and trailing lead pad fading into silence',
    },
  },
  {
    id: 'phonk-trap',
    family: 'phonk',
    title: 'Memphis Drift Phonk / Cowbell Trap',
    genre: 'hiphop',
    subgenre: 'Phonk',
    vocalArchetype: 'psychedelic-trap',
    vocalTimbre: 'Lo-Fi Memphis Chants / Dark Vox',
    bpmCalc: () => 140,
    instrumentation: ['808 Cowbell Chops', 'Distorted Sub Bass', 'Tape Saturation'],
    negativeTags: ['acoustic', 'country', 'jazz', 'orchestral'],
    stylePromptTemplate: (bpm, key) =>
      `memphis drift phonk cowbell trap, ${bpm} bpm, ${key}, 808 cowbell melody, heavy distorted sub bass, tape saturation`,
    description: 'Aggressive Memphis drift phonk track driven by hypnotic 808 cowbells, heavy sub-bass distortion, and dark cassette grit.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Cowbell Drop]', '[Verse]', '[Chorus]', '[Sub-Bass Surge]', '[Outro]'],
      intro: 'Tape hiss crackles as hypnotic 808 cowbell melody enters',
      verses: [
        'Drift tires squeal through dark nocturnal streets',
        'Distorted 808 sub shaking under heavy beats',
        'Lo-fi Memphis chants echoing through the night',
      ],
      chorus: 'Drift Phonk energy taking over the road\nSub-bass distortion carrying heavy load',
      outro: 'Slowed reverb tape-stop effect fading out',
    },
  },

  {
    id: 'electro-funk-boogie',
    family: 'funk-disco',
    title: '80s Electro-Funk / Boogie Disco Redo',
    genre: 'electronic',
    subgenre: 'Electro-Funk',
    vocalArchetype: 'classic-rock-belter',
    vocalTimbre: 'Talkbox Synth & Soul Vocal Runs',
    bpmCalc: () => 116,
    instrumentation: ['Talkbox Synthesizer', 'Moog Synth Bass', 'Funky Guitar Chops'],
    negativeTags: ['heavy metal', 'country', 'sad acoustic', 'screaming'],
    stylePromptTemplate: (bpm, key) =>
      `80s electro-funk boogie disco redo, ${bpm} bpm, ${key}, talkbox vocal synth, moog bassline, funky rhythmic guitar chops`,
    description: 'Infectious 80s boogie electro-funk jam featuring talkbox vocal effects, bubbling Moog basslines, and crisp disco handclaps.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Boogie Groove]', '[Verse]', '[Chorus]', '[Talkbox Solo]', '[Outro]'],
      intro: 'Talkbox intro cue leads into bubbling Moog bass and bright handclaps',
      verses: [
        'Disco ball reflections dancing across the floor',
        'Funky guitar chops making everybody ask for more',
        'Boogie rhythm driving with infectious 80s flair',
      ],
      chorus: 'Electro-funk energy getting down tonight\nFeel the boogie rhythm shining super bright',
      outro: 'Talkbox vocal improvisation fading over handclap groove',
    },
  },
  {
    id: 'latin-urban-reggaeton',
    family: 'latin',
    title: 'Urban Reggaeton / Perreo Flip',
    genre: 'latin',
    subgenre: 'Latin Trap',
    vocalArchetype: 'latin-reggaeton-flow',
    vocalTimbre: 'Auto-Tuned Melodic Baritone',
    bpmCalc: () => 96,
    instrumentation: ['Dembow Beat', 'Deep 808 Sub', 'Pluck Synth Melody'],
    negativeTags: ['country', 'heavy metal', 'orchestral', 'folk'],
    stylePromptTemplate: (bpm, key) =>
      `urban reggaeton perreo flip, ${bpm} bpm, ${key}, syncopated dembow beat, deep 808 sub bass, latin trap synth plucks`,
    description: 'Sultry urban reggaeton perreo flip with syncopated dembow drum patterns, deep sub-bass pulses, and modern Latin trap plucks.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Dembow Drop]', '[Verse]', '[Chorus]', '[Perreo Switch]', '[Outro]'],
      intro: 'Dembow snare rimshot builds into heavy 808 sub drop',
      verses: [
        'Sultry Latin melodies echoing through the night',
        'Dembow beat bouncing under flickering club light',
        'Urban perreo flow keeping steady rhythmic groove',
      ],
      chorus: 'Reggaeton rhythm making whole club move\nPerreo energy in a hypnotic groove',
      outro: 'Dembow snare loop solo riding out to a fade',
    },
  },
  {
    id: 'epic-hybrid-trailer',
    family: 'cinematic',
    title: 'Epic Hybrid Orchestral / Hollywood Trailer',
    genre: 'cinematic',
    subgenre: 'Epic Trailer',
    vocalArchetype: 'power-pop-diva',
    vocalTimbre: 'Dramatic Choral & Soaring Soprano',
    bpmCalc: (base) => Math.min(130, Math.max(90, Math.round(base * 0.9))),
    instrumentation: ['Massive Taiko Drums', 'Orchestral Strings', 'Brass Horns'],
    negativeTags: ['lo-fi', 'cheap synths', 'chiptune', 'country'],
    stylePromptTemplate: (bpm, key) =>
      `epic hybrid orchestral hollywood trailer, ${bpm} bpm, ${key}, massive taiko drums, soaring string section, cinematic brass horns`,
    description: 'Blockbuster Hollywood trailer score combining massive Taiko percussive impacts, soaring string sections, and brass braams.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Tension Build]', '[Climax Impact]', '[Verse]', '[Chorus]', '[Outro]'],
      intro: 'Low string tremolo rises as thunderous Taiko drum impacts strike',
      verses: [
        'Cinematic tension rising like a storm',
        'Soaring orchestral harmonies take dramatic form',
        'Massive brass braams echo across the horizon',
      ],
      chorus: 'Epic trailer power surging through the sky\nHollywood grandeur rising to new heights on high',
      outro: 'Final sub-impact hit decaying into ominous silence',
    },
  },
  {
    id: 'kpop-melodic-dance',
    family: 'pop-hyper',
    title: 'K-Pop Melodic Dance / High-Energy Hook',
    genre: 'electronic',
    subgenre: 'House',
    vocalArchetype: 'modern-female-pop-hyperpop',
    vocalTimbre: 'Bright Sparkling Vocal Chops / Harmonies',
    bpmCalc: () => 124,
    instrumentation: ['Punchy House Kick', 'Bright Brass Synth', 'Vocal Chop Lead'],
    negativeTags: ['country', 'heavy metal', 'sad acoustic', 'screaming'],
    stylePromptTemplate: (bpm, key) =>
      `kpop melodic dance high energy hook, ${bpm} bpm, ${key}, punchy house kick, bright brass synths, vocal chop lead`,
    description: 'Slick high-energy K-Pop dance track packed with punchy house kicks, bright brass synth hooks, and infectious vocal chops.',
    lyricTheme: {
      sectionTags: ['[Intro]', '[Pre-Chorus Build]', '[Chorus Drop]', '[Verse]', '[Dance Break]', '[Outro]'],
      intro: 'Bright brass synth riff leads into punchy 124 BPM house kick',
      verses: [
        'Synchronized rhythm driving through the verse',
        'Shimmering vocal harmonies in perfect universe',
        'Buildup snare roll rising to the chorus peak',
      ],
      chorus: 'K-Pop energy shining bright and bold\nInfectious dancefloor magic turning into gold',
      outro: 'High-energy dance break finishing on a crisp vocal chop hit',
    },
  },
];

// Helper: Seeded Pseudo-Random Number Generator
export function createSeedHash(fileName: string, fileSize: number, detectedBpm: number, rerollCount: number = 0): number {
  let hash = 0;
  const str = `${fileName}_${fileSize}_${detectedBpm}_reroll_${rerollCount}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function PRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateRemixDirections(
  fileMeta: { name: string; size: number },
  detectedBpm: number = 120,
  detectedKey: string = 'C Minor',
  rerollCount: number = 0
): RemixDirection[] {
  const seed = createSeedHash(fileMeta.name, fileMeta.size, detectedBpm, rerollCount);
  const random = PRNG(seed);

  // Group pool by family
  const familyMap = new Map<string, RemixArchetype[]>();
  for (const arch of REMIX_ARCHETYPES_POOL) {
    if (!familyMap.has(arch.family)) {
      familyMap.set(arch.family, []);
    }
    familyMap.get(arch.family)!.push(arch);
  }

  const families = Array.from(familyMap.keys());
  
  // Shuffle families deterministically using PRNG
  const shuffledFamilies = [...families].sort(() => random() - 0.5);

  // Select 3 distinct families
  const selectedFamilies = shuffledFamilies.slice(0, 3);
  
  const chosenArchetypes: RemixArchetype[] = selectedFamilies.map((fam) => {
    const list = familyMap.get(fam)!;
    const idx = Math.floor(random() * list.length);
    return list[idx];
  });

  return chosenArchetypes.map((arch, idx) => {
    const bpm = arch.bpmCalc(detectedBpm);
    const key = detectedKey;
    const reharmonization = arch.reharmonization || 'Reharmonized modal chord progression';
    const romanProgression = arch.romanProgression || 'iim7 - V7 - Imaj7 - vi7';
    const harmonicMetatag = arch.harmonicMetatag || `[Harmonic Movement: ${romanProgression}]`;
    const baseStylePrompt = arch.stylePromptTemplate(bpm, key);
    const stylePrompt = `${baseStylePrompt}, ${reharmonization.toLowerCase()}`;

    // Build dynamic custom lyrics with dynamic structure tags
    const { lyrics, sectionTags } = formatRemixLyrics(arch, fileMeta.name, key, bpm);

    const narrativeConcept = arch.narrativeConcept || `${arch.title} Story Arc`;
    const narrativeThemePrompt = arch.narrativeThemePrompt || `${narrativeConcept}, ${arch.description}`;

    return {
      id: `remix-dir-${arch.id}-${seed}-${idx}`,
      title: arch.title,
      genre: arch.genre,
      subgenre: arch.subgenre,
      vocalArchetype: arch.vocalArchetype,
      vocalTimbre: arch.vocalTimbre,
      narrativeConcept,
      narrativeThemePrompt,
      reharmonization,
      romanProgression,
      harmonicMetatag,
      stylePrompt,
      negativeTags: arch.negativeTags,
      bpm,
      key,
      description: arch.description,
      instrumentation: arch.instrumentation,
      sectionTags,
      lyrics,
    };
  });
}

export function formatRemixLyrics(
  arch: RemixArchetype,
  _fileName: string,
  _key: string,
  _bpm: number
): { lyrics: string; sectionTags: string[] } {
  const theme = arch.lyricTheme;

  // Get genre-specific structure tags
  const genreStructureTags = getGenreStructure(arch.genre);

  const lines: string[] = [];

  // Use genre-specific structure tags or fallback to theme tags
  if (genreStructureTags && genreStructureTags.length > 0) {
    // Build lyrics using genre-specific structure
    for (const tag of genreStructureTags) {
      lines.push(tag);
      
      // Add content based on tag type
      if (tag.toLowerCase().includes('intro') && theme.intro) {
        lines.push(theme.intro);
      } else if (tag.toLowerCase().includes('verse')) {
        for (const vLine of theme.verses) {
          lines.push(vLine);
        }
      } else if (tag.toLowerCase().includes('chorus') || tag.toLowerCase().includes('hook')) {
        lines.push(theme.chorus);
      } else if (tag.toLowerCase().includes('outro') || tag.toLowerCase().includes('end')) {
        lines.push(theme.outro);
      }
      
      lines.push('');
    }
  } else {
    // Fallback to original structure
    lines.push('[Intro]');
    if (theme.intro) lines.push(theme.intro);
    lines.push('');

    const verseTag = theme.sectionTags.find((t) => t.includes('Verse')) || '[Verse 1]';
    lines.push(verseTag);
    for (const vLine of theme.verses) {
      lines.push(vLine);
    }
    lines.push('');

    const chorusTag = theme.sectionTags.find((t) => t.includes('Chorus')) || '[Chorus]';
    lines.push(chorusTag);
    lines.push(theme.chorus);
    lines.push('');

    const outroTag = theme.sectionTags.find((t) => t.includes('Outro')) || '[Outro]';
    lines.push(outroTag);
    lines.push(theme.outro);
  }

  const cleaned = cleanLyricText(lines.join('\n'));

  return {
    lyrics: cleaned,
    sectionTags: genreStructureTags || ['[Intro]', '[Verse 1]', '[Chorus]', '[Outro]'],
  };
}
