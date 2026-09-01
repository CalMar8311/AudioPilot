// Lyric generation data banks — rhyme families, tone vocab, structure templates, cues

export type RhymeScheme = 'AABB' | 'ABAB' | 'AAAA' | 'ABCB' | 'AABBCCDD' | 'Complex' | 'Free';
export type Tone = 'poetic' | 'direct' | 'aggressive' | 'nostalgic' | 'playful';
export type Lang = 'en' | 'es' | 'fr' | 'ja' | 'ar';
export type StructureId = 'standard-pop' | 'edm' | 'hiphop' | 'ballad' | 'cinematic' | 'neo-soul' | 'cinematic-trailer' | 'custom';

export type SectionKind = 'Intro' | 'Verse' | 'Pre-Chorus' | 'Chorus' | 'Build-up' | 'Drop' | 'Breakdown' | 'Bridge' | 'Guitar Solo' | 'Instrumental Solo' | 'Outro' | 'Fade Out' | 'End';

export type StructureSection = {
  kind: SectionKind;
  bars?: number;
  label: string; // e.g. "Verse 1", "Chorus", "Drop"
};

export type StructureTemplate = {
  id: StructureId;
  name: string;
  blurb: string;
  sections: StructureSection[];
};

export const STRUCTURE_TEMPLATES: StructureTemplate[] = [
  {
    id: 'standard-pop',
    name: 'Standard Pop',
    blurb: 'Intro → Verses → Pre-Chorus → Chorus repeats → Bridge → Outro',
    sections: [
      { kind: 'Intro', label: 'Intro' },
      { kind: 'Verse', label: 'Verse 1' },
      { kind: 'Pre-Chorus', label: 'Pre-Chorus' },
      { kind: 'Chorus', label: 'Chorus' },
      { kind: 'Verse', label: 'Verse 2' },
      { kind: 'Chorus', label: 'Chorus' },
      { kind: 'Bridge', label: 'Bridge' },
      { kind: 'Chorus', label: 'Chorus' },
      { kind: 'Outro', label: 'Outro' },
    ],
  },
  {
    id: 'edm',
    name: 'EDM / Electronic',
    blurb: 'Build → Drop → Breakdown → Drop again',
    sections: [
      { kind: 'Intro', label: 'Intro' },
      { kind: 'Build-up', label: 'Build-up' },
      { kind: 'Drop', label: 'Drop' },
      { kind: 'Breakdown', label: 'Breakdown' },
      { kind: 'Build-up', label: 'Build-up 2' },
      { kind: 'Drop', label: 'Drop 2' },
      { kind: 'Outro', label: 'Outro' },
    ],
  },
  {
    id: 'hiphop',
    name: 'Hip-Hop',
    blurb: '16-bar verses with hook choruses',
    sections: [
      { kind: 'Intro', label: 'Intro' },
      { kind: 'Verse', label: 'Verse 1', bars: 16 },
      { kind: 'Chorus', label: 'Chorus' },
      { kind: 'Verse', label: 'Verse 2', bars: 16 },
      { kind: 'Chorus', label: 'Chorus' },
      { kind: 'Outro', label: 'Outro' },
    ],
  },
  {
    id: 'ballad',
    name: 'Ballad',
    blurb: 'Slow build, emotional bridge, stripped outro',
    sections: [
      { kind: 'Intro', label: 'Intro' },
      { kind: 'Verse', label: 'Verse 1' },
      { kind: 'Verse', label: 'Verse 2' },
      { kind: 'Chorus', label: 'Chorus' },
      { kind: 'Bridge', label: 'Bridge' },
      { kind: 'Chorus', label: 'Chorus' },
      { kind: 'Outro', label: 'Outro' },
    ],
  },
  {
    id: 'cinematic',
    name: 'Cinematic Arc',
    blurb: 'Atmospheric intro → verse builds → orchestral swell → breakdown → triumphant finale',
    sections: [
      { kind: 'Intro', label: 'Intro' },
      { kind: 'Verse', label: 'Verse 1' },
      { kind: 'Build-up', label: 'Build-up' },
      { kind: 'Chorus', label: 'Chorus' },
      { kind: 'Breakdown', label: 'Breakdown' },
      { kind: 'Bridge', label: 'Bridge' },
      { kind: 'Chorus', label: 'Chorus' },
      { kind: 'Outro', label: 'Outro' },
    ],
  },
  {
    id: 'neo-soul',
    name: 'Neo-Soul / R&B',
    blurb: 'Intro → Verse → Chorus → Verse → Chorus → Vocal Run / Bridge → Ad-lib Outro',
    sections: [
      { kind: 'Intro', label: 'Intro' },
      { kind: 'Verse', label: 'Verse 1' },
      { kind: 'Chorus', label: 'Chorus' },
      { kind: 'Verse', label: 'Verse 2' },
      { kind: 'Chorus', label: 'Chorus' },
      { kind: 'Bridge', label: 'Vocal Run / Bridge' },
      { kind: 'Outro', label: 'Outro / Ad-lib' },
    ],
  },
  {
    id: 'cinematic-trailer',
    name: 'Cinematic / Trailer',
    blurb: 'Minimal ambient intro → tension build → climactic crescendo → percussion drop → outro',
    sections: [
      { kind: 'Intro', label: 'Minimal Ambient Intro' },
      { kind: 'Build-up', label: 'Tension Build' },
      { kind: 'Chorus', label: 'Climactic Crescendo' },
      { kind: 'Drop', label: 'Percussion Drop' },
      { kind: 'Outro', label: 'Outro' },
    ],
  },
];

export const TONE_OPTIONS: { id: Tone; label: string }[] = [
  { id: 'poetic', label: 'Poetic' },
  { id: 'direct', label: 'Direct' },
  { id: 'aggressive', label: 'Aggressive' },
  { id: 'nostalgic', label: 'Nostalgic' },
  { id: 'playful', label: 'Playful' },
];

export const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
  { id: 'fr', label: 'French' },
  { id: 'ja', label: 'Japanese' },
  { id: 'ar', label: 'Arabic' },
];

export const RHYME_OPTIONS: { id: RhymeScheme; label: string }[] = [
  { id: 'AABB', label: 'AABB' },
  { id: 'ABAB', label: 'ABAB' },
  { id: 'AABBCCDD', label: 'AABB / CCDD' },
  { id: 'ABCB', label: 'ABCB' },
  { id: 'AAAA', label: 'AAAA' },
  { id: 'Complex', label: 'Complex Multi-syllabic' },
  { id: 'Free', label: 'Free Verse / Spoken Flow' },
];

export const RHYME_SCHEME_IDS: RhymeScheme[] = RHYME_OPTIONS.map(r => r.id);

// ---- Genre-contextual theme database ----
// Keyed by genre id from catalogs.ts. 'default' is used when no genre is selected.
export const GENRE_THEMES: Record<string, string[]> = {
  synthwave: [
    'A rain-slicked highway chase through a neon megacity, fleeing corporate surveillance with a corrupted cyberdeck.',
    'Cruising past holographic billboards at 3am, chasing a memory of someone who never existed.',
    'A synth-soaked sunset over a chrome skyline, where digital hearts beat in analog.',
  ],
  cyberpunk: [
    'A rain-slicked highway chase through a neon megacity, fleeing corporate surveillance with a corrupted cyberdeck.',
    'Underground rebels broadcasting pirate signals from a derelict server farm on the edge of the sprawl.',
    'A rogue AI falling in love with a street pharmacist through a cracked neural interface.',
  ],
  hiphop: [
    'Reflections on street-corner chess games, gritty winter subway rides, and surviving the hustle.',
    'Coming up from nothing, turning basement studio sessions into a movement the whole city feels.',
    'A letter to the old block — who stayed, who left, and who never made it home.',
  ],
  rnb: [
    'Late-night incense burning by an open window, untangling complicated romantic attachments over lukewarm tea.',
    'A 2am voicemail left unsent, confessing everything you were too proud to say in person.',
    'Slow dancing in the kitchen to a song that reminds you of someone you are trying to forget.',
  ],
  lofi: [
    'Rain on a bedroom window while a cassette loops crackle, studying for exams nobody will remember.',
    'A quiet afternoon watching dust motes drift through a sunbeam, thinking about old friends.',
    'Nostalgic daydreams on a train with no destination, headphones on, world off.',
  ],
  cinematic: [
    'An ancient forgotten army marching toward a glowing portal at the edge of a crumbling realm.',
    'A lone astronaut watching Earth rise over a dead moon, transmitting a final message home.',
    'The last stand of a fallen kingdom, banners burning against a blood-red dawn.',
  ],
  orchestral: [
    'A sweeping dawn over misty mountains as a forgotten civilization awakens beneath the frost.',
    'The bittersweet crescendo of a life well-lived, told through strings and fading light.',
    'A grand waltz through an empty ballroom where ghosts of the past still dance.',
  ],
  metal: [
    'A descent into the infernal depths, where chains rattle and the throne of bone awaits.',
    'Standing at the edge of the abyss, screaming defiance into the void that tried to swallow you.',
    'A battlefield aftermath — smoke, silence, and the slow march of the surviving.',
  ],
  electronic: [
    'Losing yourself on a packed dancefloor at 4am, where the bass becomes your heartbeat.',
    'A euphoric sunrise set on a beach, where every kick drum is a new beginning.',
    'Dissolving into the strobe lights, where time stops and the music is the only language.',
  ],
  afrobeat: [
    'A sun-drenched street festival where every drum pattern tells the story of a people.',
    'Dancing through the harmattan haze, weaving ancestral rhythms into a modern groove.',
    'A midnight surf session off the coast, where the ocean keeps time with the congas.',
  ],
  latin: [
    'A humid night in old San Juan, where the rhythm of the street is the rhythm of the heart.',
    'Dancing perreo until the sun comes up, sweat and neon and bad decisions worth remembering.',
    'A bittersweet bolero for a lover who left on a plane and never sent a letter back.',
  ],
  'mid-east': [
    'A caravan crossing the desert under a full moon, singing songs older than the dunes.',
    'A crowded souk at dusk where every voice is an instrument and every spice is a memory.',
    'A Sufi whirl in candlelight, seeking annihilation in the divine through spinning prayer.',
  ],
  'asian-fusion': [
    'Cherry blossoms falling on a quiet temple courtyard, where a monk plays a shamisen for no one.',
    'A bullet train through the Japanese Alps at twilight, memories blurring past faster than the scenery.',
    'A lantern festival on a river of stars, each light a wish sent to the ancestors.',
  ],
  default: [
    'Late-night conversation under dim amber lamps, reminiscing on missed chances.',
    'A long drive with no destination, the radio playing songs that feel like they were written for you.',
    'Standing at a crossroads in life, feeling the weight of every road not taken.',
    'A quiet morning after a storm, watching the light return to a world that almost washed away.',
    'Dancing alone in your apartment to a song that makes you feel invincible for three minutes.',
  ],
};

export function randomThemeForGenre(genreId: string | null): string {
  const key = genreId && GENRE_THEMES[genreId] ? genreId : 'default';
  const pool = GENRE_THEMES[key];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---- Regional Rap Flows & Cadences ----
export type RegionalFlow = {
  id: string;
  label: string;
  cadence: string;
  meter: string;
};

export const REGIONAL_FLOWS: RegionalFlow[] = [
  { id: 'east-coast-boom-bap', label: '90s East Coast / Boom Bap', cadence: 'Complex internal rhymes, multi-syllabic, aggressive pocket', meter: 'tight multi-syllabic meters with dense internal rhyme' },
  { id: 'west-coast-g-funk', label: 'West Coast G-Funk', cadence: 'Laid-back cadence, smooth syncopation, bounce', meter: 'laid-back elongated vowels with a bouncy swing' },
  { id: 'southern-trap', label: 'Southern / Dirty South / Trap', cadence: 'Triplet flows, heavy ad-libs, rapid double-time', meter: 'triplet flows with rapid double-time and heavy ad-libs' },
  { id: 'uk-drill-grime', label: 'UK Drill / Grime', cadence: 'Staccato delivery, sliding 140 BPM syncopation, British slang accents', meter: 'staccato delivery with sliding 140 BPM syncopation and British slang' },
  { id: 'midwest-chopper', label: 'Midwest Chopper', cadence: 'High-speed rapid-fire diction', meter: 'high-speed rapid-fire diction with machine-gun precision' },
  { id: 'conscious-spoken', label: 'Conscious / Spoken Word', cadence: 'Poetic, jazz-inflected phrasing', meter: 'poetic jazz-inflected phrasing with loose meter and spoken delivery' },
];

// ---- Vocal Archetypes & Timbre Personas ----
// pillLabel is shown in the UI (may include a style nickname).
// promptTags / cadence / performanceTags are acoustic descriptors — never celebrity names in compiled output.
export type VocalArchetype = {
  id: string;
  pillLabel: string;
  label: string;
  promptTags: string[];
  cadence: string;
  rhymeMeter: string;
  suggestedRhyme: RhymeScheme;
  bpmMin: number;
  bpmMax: number;
  bpmTypical: number;
  performanceTags: string[];
  description: string;
  directives: string[];
  cueStyle: string;
  relatedFlowId?: string;
};

export const VOCAL_ARCHETYPES: VocalArchetype[] = [
  {
    id: 'neo-soul-badu',
    pillLabel: 'Neo-Soul (Badu Style)',
    label: 'Neo-Soul / Jazz Phrasing',
    promptTags: ['Neo-Soul Alto', 'smoky alto timbre', 'laid-back jazz phrasing', 'conversational ad-libs', 'loose pocket'],
    cadence: 'off-beat laid-back vocal runs, smoky alto register, eccentric soul inflections',
    rhymeMeter: 'ABAB conversational pocket with stretched vowels and delayed downbeats',
    suggestedRhyme: 'ABAB',
    bpmMin: 68,
    bpmMax: 92,
    bpmTypical: 78,
    performanceTags: ['[Smoky Alto Ad-lib]', '[Laid-back Jazz Phrasing]', '[Melismatic Vocal Run]', '[Spoken Ad-libs]'],
    description: 'Off-beat laid-back vocal runs, smoky alto register, conversational ad-libs',
    directives: ['Smoky Alto Delivery', 'Laid-back Jazz Phrasing', 'Loose Pocket'],
    cueStyle: 'melismatic',
  },
  {
    id: 'retro-soul-winehouse',
    pillLabel: 'Retro-Soul (Winehouse Style)',
    label: 'Retro-Soul / Gritty Torch Jazz',
    promptTags: ['Retro-Soul Contralto', 'gritty brassy contralto', 'raw raspy soul', '60s torch-ballad timing'],
    cadence: 'raw emotive rasp, slurred jazz timing, vintage Motown bite',
    rhymeMeter: 'ABAB torch-ballad couplets with slurred end-rhymes',
    suggestedRhyme: 'ABAB',
    bpmMin: 70,
    bpmMax: 96,
    bpmTypical: 82,
    performanceTags: ['[Gritty Contralto]', '[Raspy Belting]', '[60s Torch Timing]', '[Brass Stab Cue]'],
    description: 'Raw emotive rasp, deep brassy contralto, vintage 60s Motown soul bite',
    directives: ['Gritty Contralto', 'Raw Raspy Soul', '60s Torch Ballad Timing'],
    cueStyle: 'raspy',
  },
  {
    id: 'psychedelic-trap',
    pillLabel: 'Psychedelic Trap (Scott Style)',
    label: 'Melodic Trap Auto-Tune',
    promptTags: ['Psychedelic Trap Melodies', 'atmospheric auto-tune chant', 'reverb-tail hooks', 'rhythmic melody loops'],
    cadence: 'heavy auto-tune, atmospheric reverb tails, hypnotic chanting',
    rhymeMeter: 'AABB chant hooks with triplet-flow accent bars',
    suggestedRhyme: 'AABB',
    bpmMin: 125,
    bpmMax: 150,
    bpmTypical: 140,
    performanceTags: ['[Psychedelic Trap Melody]', '[Atmospheric Auto-Tune Tail]', '[Rhythmic Chant]', '[Ad-lib: yeah]'],
    description: 'Heavy auto-tune, atmospheric reverb tails, rhythmic chanting',
    directives: ['Heavy Auto-Tune', 'Atmospheric Reverb Tails', 'Rhythmic Chanting'],
    cueStyle: 'autotune',
    relatedFlowId: 'southern-trap',
  },
  {
    id: 'conscious-multisylabic',
    pillLabel: 'Conscious Flow (Kendrick Style)',
    label: 'Conscious / Multi-syllabic Flow',
    promptTags: ['Conscious Multi-syllabic Flow', 'dense internal rhyme', 'shift-pocket delivery', 'spoken-word cadence'],
    cadence: 'poetic jazz-inflected phrasing with dense multi-syllabic internals and pocket switches',
    rhymeMeter: 'Complex multi-syllabic internals with mid-bar scheme shifts',
    suggestedRhyme: 'Complex',
    bpmMin: 84,
    bpmMax: 102,
    bpmTypical: 92,
    performanceTags: ['[Multi-syllabic Pocket]', '[Conscious Cadence Shift]', '[Spoken-Word Break]', '[Boom-Bap Drum Break]'],
    description: 'Dense internal rhyme, pocket switches, jazz-inflected spoken delivery',
    directives: ['Dense Internal Rhyme', 'Pocket Switch Delivery', 'Spoken-Word Cadence'],
    cueStyle: 'spoken',
    relatedFlowId: 'conscious-spoken',
  },
  {
    id: 'alt-rnb-falsetto',
    pillLabel: 'Alt-R&B Falsetto (Ocean Style)',
    label: 'Alternative R&B Falsetto',
    promptTags: ['airy falsetto', 'moody vibrato', 'melancholic runs', 'intimate dry-close mic'],
    cadence: 'high airy falsetto, moody vibrato, melancholic melisma',
    rhymeMeter: 'ABCB half-rhyme verses with falsetto hook peaks',
    suggestedRhyme: 'ABCB',
    bpmMin: 70,
    bpmMax: 110,
    bpmTypical: 88,
    performanceTags: ['[Airy Falsetto]', '[Moody Vibrato]', '[Melancholic Run]', '[Intimate Whisper]'],
    description: 'High airy falsetto, moody vibrato, melancholic runs',
    directives: ['Airy Falsetto', 'Moody Vibrato', 'Melancholic Runs'],
    cueStyle: 'falsetto',
  },
  {
    id: 'power-pop-diva',
    pillLabel: 'Belted Power Pop (Adele Style)',
    label: 'Belted Power Pop / Diva',
    promptTags: ['full chest resonance', 'soaring vocal peaks', 'dramatic vibrato', 'belted chorus lift'],
    cadence: 'full chest resonance building to soaring belted peaks',
    rhymeMeter: 'ABAB anthemic couplets with held-vowel chorus peaks',
    suggestedRhyme: 'ABAB',
    bpmMin: 70,
    bpmMax: 128,
    bpmTypical: 84,
    performanceTags: ['[Belted Chorus Lift]', '[Dramatic Vibrato]', '[Chest Resonance]', '[Soaring Peak]'],
    description: 'Full chest resonance, soaring vocal peaks, dramatic vibrato',
    directives: ['Full Chest Resonance', 'Soaring Vocal Peaks', 'Dramatic Vibrato'],
    cueStyle: 'belted',
  },
  {
    id: 'east-coast-boom-bap-flow',
    pillLabel: 'Boom-Bap Pocket (Nas Style)',
    label: '90s East Coast / Boom Bap',
    promptTags: ['boom-bap lyric pocket', 'tight multi-syllabic meters', 'dry close-mic grit', 'head-nod swing'],
    cadence: 'tight aggressive pocket, dense internals, crate-dug swing',
    rhymeMeter: 'Complex internals over 88 BPM boom-bap bars',
    suggestedRhyme: 'Complex',
    bpmMin: 82,
    bpmMax: 98,
    bpmTypical: 88,
    performanceTags: ['[Boom-Bap Drum Break]', '[Aggressive Pocket]', '[Multi-syllabic Internal]', '[Dry Close-Mic]'],
    description: 'Tight multi-syllabic meters with aggressive pocket delivery',
    directives: ['Tight Multi-syllabic Meter', 'Aggressive Pocket', 'Dry Close-Mic Grit'],
    cueStyle: 'spoken',
    relatedFlowId: 'east-coast-boom-bap',
  },
  {
    id: 'uk-drill-staccato',
    pillLabel: 'UK Drill Staccato (Grime Style)',
    label: 'UK Drill / Grime',
    promptTags: ['staccato drill cadence', 'sliding 140 bass pocket', 'clipped consonants', 'syncopated ad-libs'],
    cadence: 'staccato delivery with sliding 140 BPM syncopation',
    rhymeMeter: 'AABB clipped end-stops with mid-bar staccato bursts',
    suggestedRhyme: 'AABB',
    bpmMin: 136,
    bpmMax: 148,
    bpmTypical: 140,
    performanceTags: ['[Staccato Drill Cadence]', '[Sliding Bass Pocket]', '[Clipped Ad-lib]', '[140 Syncopation]'],
    description: 'Staccato delivery, sliding 140 BPM syncopation',
    directives: ['Staccato Delivery', 'Sliding 140 Pocket', 'Clipped Consonants'],
    cueStyle: 'staccato',
    relatedFlowId: 'uk-drill-grime',
  },
  {
    id: 'country-roots-storyteller',
    pillLabel: 'Country/Roots (Stapleton Style)',
    label: 'Country / Roots Storyteller',
    promptTags: ['raspy male baritone', 'raw acoustic guitar strumming', 'foot-stomping rhythm', 'gritty southern vocal tear', 'unpolished dynamic belt'],
    cadence: 'conversational storytelling with raspy baritone and foot-stomping rhythm',
    rhymeMeter: 'AABB storytelling couplets with conversational phrasing',
    suggestedRhyme: 'AABB',
    bpmMin: 72,
    bpmMax: 96,
    bpmTypical: 84,
    performanceTags: ['[Raspy Baritone]', '[Acoustic Strum]', '[Foot-Stomp]', '[Southern Vocal Tear]', '[Dynamic Belt]'],
    description: 'Raspy male baritone, raw acoustic guitar strumming, foot-stomping rhythm',
    directives: ['Raspy Baritone', 'Raw Acoustic Strumming', 'Foot-Stomping Rhythm'],
    cueStyle: 'raspy',
  },
  {
    id: 'modern-female-pop-hyperpop',
    pillLabel: 'Modern Pop/Hyperpop (Dua Style)',
    label: 'Modern Melodic Female Pop / Hyperpop',
    promptTags: ['punchy female chest voice', 'bright processed vocal chops', 'driving four-on-the-floor synth-bass', 'slick modern pop production', 'crisp top-end sheen'],
    cadence: 'punchy chest voice with bright processed vocal chops and driving synth-bass',
    rhymeMeter: 'ABAB anthemic hooks with syncopated pre-chorus builds',
    suggestedRhyme: 'ABAB',
    bpmMin: 110,
    bpmMax: 130,
    bpmTypical: 120,
    performanceTags: ['[Punchy Chest Voice]', '[Vocal Chops]', '[Synth-Bass Drive]', '[Crisp Top-End]', '[Pre-Chorus Build]'],
    description: 'Punchy female chest voice, bright processed vocal chops, driving synth-bass',
    directives: ['Punchy Chest Voice', 'Bright Vocal Chops', 'Four-on-the-Floor Synth-Bass'],
    cueStyle: 'belted',
  },
  {
    id: 'indie-bedroom-pop',
    pillLabel: 'Indie/Bedroom Pop (Eilish Style)',
    label: 'Indie / Bedroom Pop',
    promptTags: ['close-mic intimate whisper vocals', 'warm sub-bass pulses', 'layered ASMR breath harmonies', 'minimalist lo-fi acoustic texture'],
    cadence: 'close-mic intimate whisper with layered breath harmonies',
    rhymeMeter: 'ABCB half-rhyme verses with whispered hook peaks',
    suggestedRhyme: 'ABCB',
    bpmMin: 60,
    bpmMax: 90,
    bpmTypical: 72,
    performanceTags: ['[Intimate Whisper]', '[ASMR Breath]', '[Sub-Bass Pulse]', '[Lo-Fi Texture]', '[Minimalist Build]'],
    description: 'Close-mic intimate whisper vocals, warm sub-bass pulses, layered ASMR breath harmonies',
    directives: ['Intimate Whisper', 'Layered Breath Harmonies', 'Minimalist Lo-Fi Texture'],
    cueStyle: 'falsetto',
  },
  {
    id: 'classic-rock-belter',
    pillLabel: 'Classic Rock Belter (Mercury Style)',
    label: 'Classic / 80s Rock Belter',
    promptTags: ['operatic wide vocal vibrato', 'powerful soaring rock belting', 'overdriven guitar riffs', 'dynamic soaring high notes', 'punchy analog studio drums'],
    cadence: 'operatic wide vibrato with powerful soaring belting and soaring high notes',
    rhymeMeter: 'ABAB anthemic studio couplets with held-vowel peaks',
    suggestedRhyme: 'ABAB',
    bpmMin: 100,
    bpmMax: 140,
    bpmTypical: 120,
    performanceTags: ['[Operatic Vibrato]', '[Soaring Belt]', '[Soaring High Note]', '[Overdriven Guitar]', '[Studio Drums]'],
    description: 'Operatic wide vocal vibrato, powerful soaring rock belting, soaring high notes',
    directives: ['Operatic Wide Vibrato', 'Powerful Soaring Belting', 'Dynamic Soaring High Notes'],
    cueStyle: 'belted',
  },
  {
    id: 'latin-reggaeton-flow',
    pillLabel: 'Latin/Reggaeton (Bad Bunny Style)',
    label: 'Latin / Reggaeton Flow',
    promptTags: ['syncopated dembow drum groove', 'melodic auto-tuned baritone cadence', 'flamenco-infused vocal trills', 'punchy deep sub-bass'],
    cadence: 'syncopated dembow groove with melodic auto-tuned baritone and flamenco trills',
    rhymeMeter: 'AABB reggaeton flow with syncopated dembow accents',
    suggestedRhyme: 'AABB',
    bpmMin: 90,
    bpmMax: 110,
    bpmTypical: 98,
    performanceTags: ['[Dembow Groove]', '[Auto-Tuned Baritone]', '[Flamenco Trill]', '[Deep Sub-Bass]', '[Reggaeton Flow]'],
    description: 'Syncopated dembow drum groove, melodic auto-tuned baritone cadence, flamenco trills',
    directives: ['Syncopated Dembow Groove', 'Melodic Auto-Tuned Baritone', 'Flamenco-Infused Trills'],
    cueStyle: 'autotune',
  },
];

export function findVocalArchetype(idOrLabel: string): VocalArchetype | undefined {
  return VOCAL_ARCHETYPES.find(a =>
    a.id === idOrLabel || a.label === idOrLabel || a.pillLabel === idOrLabel
  );
}

// ---- Inline Vocal Directives & Ad-libs (quick-insert pills) ----
export const DELIVERY_DIRECTIVES: string[] = [
  '[Smoky Alto Delivery]',
  '[Laid-back Jazz Phrasing]',
  '[Aggressive Triplet Flow]',
  '[Raspy Belting]',
  '[Layered Harmonies]',
  '[Spoken Ad-libs]',
  '[Melismatic Vocal Run]',
  '[Off-beat Phrasing]',
  '[Vocal Run]',
  '[Ad-lib: yeah]',
];

// Performance cues injected inline
export const PERFORMANCE_CUES: string[] = [
  '[Whispered]',
  '[Belting]',
  '[Bass Drop]',
  '[Faster Tempo]',
  '[Half-Time]',
  '[Ad-Lib]',
  '[Harmonies]',
  '[Call and Response]',
  '[Vocoder]',
  '[Crowd Chant]',
];

// Cue pool per section kind
const SECTION_CUES: Partial<Record<SectionKind, string[]>> = {
  Intro: ['[Whispered]', '[Atmospheric]'],
  Verse: ['[Melodic Flow]', '[Steady Pulse]'],
  'Pre-Chorus': ['[Rising Energy]', '[Building Tension]'],
  Chorus: ['[Belting]', '[Harmonies]', '[Full Power]'],
  'Build-up': ['[Rising Energy]', '[Faster Tempo]', '[Snare Roll]'],
  Drop: ['[Bass Drop]', '[Full Power]', '[Crowd Chant]'],
  Breakdown: ['[Half-Time]', '[Stripped Back]', '[Whispered]'],
  Bridge: ['[Vocoder]', '[Emotional Shift]', '[Call and Response]'],
  'Guitar Solo': ['[Belting]', '[Crowd Chant]'],
  'Instrumental Solo': ['[Atmospheric]'],
  Outro: ['[Fading]', '[Whispered]'],
  'Fade Out': ['[Fading]'],
  End: [],
};

export function cueFor(kind: SectionKind): string | null {
  const pool = SECTION_CUES[kind];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---- Rhyme families (end-sound -> word bank) ----
// Keys are approximate phonetic endings.
export const RHYME_FAMILIES: Record<string, string[]> = {
  ee: ['see', 'me', 'free', 'be', 'breathe', 'leave', 'dream', 'believe', 'receive', 'achieve', 'deceive', 'relieve', 'conceive', 'grieve', 'sleeve', 'weave', 'retrieve', 'underneath', 'beneath', 'wreath', 'seethe', 'teethe', 'sheathe'],
  ay: ['day', 'way', 'stay', 'play', 'say', 'away', 'pray', 'stray', 'gray', 'display', 'betray', 'delay', 'decay', 'array', 'obey', 'convey', 'survey', 'voyage', 'portray', 'dismay'],
  oh: ['go', 'know', 'show', 'grow', 'flow', 'glow', 'low', 'slow', 'road', 'load', 'code', 'mode', 'rode', 'blown', 'grown', 'shown', 'alone', 'stone', 'bone', 'throne', 'tone', 'zone', 'home', 'roam', 'foam', 'comb', 'womb', 'tome', 'dome', 'globe', 'robe', 'probe', 'strobe'],
  ar: ['far', 'star', 'car', 'jar', 'bar', 'scar', 'guitar', 'are', 'care', 'share', 'spare', 'dare', 'flare', 'glare', 'rare', 'aware', 'beware', 'despair', 'repair', 'declare', 'compare', 'prepare', 'unfair', 'square', 'where', 'there', 'air', 'fair', 'hair', 'pair', 'chair', 'stair', 'somewhere', 'nowhere', 'everywhere'],
  ight: ['night', 'light', 'fight', 'right', 'sight', 'bright', 'flight', 'height', 'might', 'tight', 'white', 'knight', 'ignite', 'unite', 'invite', 'write', 'despite', 'tonight', 'alight', 'moonlight', 'starlight', 'spotlight', 'headlight', 'tail light', 'flashlight'],
  ain: ['rain', 'pain', 'gain', 'main', 'vain', 'chain', 'brain', 'train', 'lane', 'plain', 'strain', 'domain', 'refrain', 'maintain', 'remain', 'sustain', 'contain', 'explain', 'complain', 'acclaim', 'proclaim', 'exclaim', 'reign', 'feign', 'wane', 'cane', 'mane', 'sane', 'crane', 'plane', 'vein'],
  ove: ['love', 'above', 'dove', 'glove', 'shove', 'stove', 'cove', 'wove', 'rove', 'hove', 'drove', 'strove', 'govern', 'uncover', 'discover', 'hover'],
  eart: ['heart', 'apart', 'start', 'part', 'dart', 'chart', 'smart', 'art', 'torn apart', 'restart', 'depart', 'impart', 'counterpart'],
  all: ['fall', 'call', 'tall', 'wall', 'small', 'crawl', 'stall', 'ball', 'hall', 'all', 'thrall', 'appall', 'install', 'forestall', 'recall', 'enthrall'],
  oom: ['room', 'doom', 'bloom', 'gloom', 'boom', 'zoom', 'brood', 'consumed', 'assumed', 'doomed', 'entombed', 'perfumed', 'groomed'],
  ind: ['mind', 'find', 'blind', 'behind', 'kind', 'grind', 'remind', 'confined', 'defined', 'refined', 'aligned', 'assigned', 'designed', 'inclined', 'combined', 'resigned', 'unsigned'],
  one: ['one', 'gone', 'done', 'none', 'sun', 'run', 'fun', 'gun', 'won', 'begun', 'undone', 'outdone', 'overrun', 'forgotten', 'spotlight on'],
  end: ['end', 'bend', 'send', 'tend', 'mend', 'blend', 'pretend', 'defend', 'offend', 'spend', 'lend', 'extend', 'comprehend', 'ascend', 'descend', 'transcend', 'trend', 'friend', 'pen', 'when', 'then', 'men', 'again', 'amen', 'zen', 'ten'],
  ire: ['fire', 'wire', 'desire', 'higher', 'tire', 'hire', 'inspire', 'require', 'acquire', 'choir', 'liar', 'flyer', 'pliers', 'suppliers', 'buyers', 'prior', 'entire', 'attire', 'retire', 'aspire', 'empire', 'vampire', 'require'],
};

// ---- Rich Narrative Themes & Story Arcs Bank ----
export type NarrativeTheme = {
  id: string;
  title: string;
  category: string;
  description: string;
  promptTheme: string;
  sampleLyrics: string;
};

export const NARRATIVE_THEMES: NarrativeTheme[] = [
  {
    id: 'cyberpunk-odyssey',
    title: 'Late-Night Cyberpunk Odyssey',
    category: 'Sci-Fi / Dystopian',
    description: 'High-tech dystopia, neon rain on wet pavement, digital ghosts, escaping the grid.',
    promptTheme: 'Late-Night Cyberpunk Odyssey, neon rain, wet pavement reflections, digital ghosts, escaping the system',
    sampleLyrics: `[Intro]
Rain falling on electric glass
Reflections of the grid fading fast

[Verse 1]
Chrome streetlights shimmer on wet asphalt
Shadows moving fast through the dark vault
Scanning digital ghosts in the neon haze
Lost inside the sprawling circuit maze

[Pre-Chorus]
Signal locked on the skyline border
Breaking free from the digital order

[Chorus]
Cyberpunk odyssey running through the dark
Electric pulse leaving a persistent spark
We ride the neon highway into night
Escaping the grid into blinding light

[Verse 2]
Siren echoes ring across concrete spires
Heartbeats sync with holographic fires
No turning back as the firewall falls
Unshackled spirits beyond city walls

[Bridge]
Data streams dissolving in the midnight air
Fingers on the wheel with no time to spare

[Chorus]
Cyberpunk odyssey running through the dark
Electric pulse leaving a persistent spark
We ride the neon highway into night
Escaping the grid into blinding light

[Outro]
Fade into neon horizon
Midnight transmission complete`,
  },
  {
    id: 'heartbreak-redemption',
    title: 'Heartbreak & Redemption',
    category: 'Emotional / Drama',
    description: 'Rain-slicked pavement, fading photographs, midnight confessions, emotional healing, moving forward.',
    promptTheme: 'Heartbreak & Redemption, rain-slicked streets, fading photographs, midnight confession, emotional healing',
    sampleLyrics: `[Intro]
Quiet shadows falling across empty floor
Fading memories lingering by the door

[Verse 1]
Rain-slicked pavement under streetlight glow
Fading photographs of a love we used to know
I held the silence while the world turned cold
Tracing every promise that we used to hold

[Pre-Chorus]
Pieces of yesterday scattered in the dark
Searching through ashes for a single spark

[Chorus]
Through heartbreak and redemption I am finding my way
Leaving the storm behind at break of day
Tears turn to rivers and the river runs clear
Stronger than the shadow of my deepest fear

[Verse 2]
Midnight confession whispered to the wind
Forgiving every place where we used to bend
I pack the memories in an old suitcase
Stepping out forward to a brand new space

[Bridge]
No more looking back at what used to be
Surrendering the pain so my soul breathes free

[Chorus]
Through heartbreak and redemption I am finding my way
Leaving the storm behind at break of day
Tears turn to rivers and the river runs clear
Stronger than the shadow of my deepest fear

[Outro]
Sunrise breaking through morning clouds
Walking free and standing proud`,
  },
  {
    id: 'high-stakes-heist',
    title: 'High-Stakes Heist',
    category: 'Action / Thriller',
    description: 'Ticking clock, vault blueprints, shadows in alleyways, silent getaway, split-second escape.',
    promptTheme: 'High-Stakes Heist, ticking clock, vault blueprints, alleyway shadows, silent getaway, split-second escape',
    sampleLyrics: `[Intro]
Digital clock ticking three two one
Shadows in the alleyway before the rising sun

[Verse 1]
Vault blueprints memorized line by line
Silent footsteps moving right on time
Lasers flickering in the marble hall
Invisibility draped against the wall

[Pre-Chorus]
Fingers on the dial as the tumblers click
Heartbeats racing on a split-second tick

[Chorus]
High-stakes heist in the dead of night
Slipping through the shadows out of sight
One chance to break the golden lock
Running fast against the ticking clock

[Verse 2]
Diamond glinting in the velvet pouch
Alleyway getaway crouch by crouch
Siren sirens wailing three blocks away
Van engines roaring for a clean getaway

[Bridge]
Red emergency lights spinning in the dark
Wheels burning rubber leaving smoke and spark

[Chorus]
High-stakes heist in the dead of night
Slipping through the shadows out of sight
One chance to break the golden lock
Running fast against the ticking clock

[Outro]
Escape complete into the morning fog
Shadows vanishing into silence`,
  },
  {
    id: 'nostalgic-roadtrip',
    title: 'Nostalgic Road Trip',
    category: 'Feel-Good / Nostalgia',
    description: 'Endless highway, summer wind, cassette tapes on dashboard, memories on the radio, sunset horizon.',
    promptTheme: 'Nostalgic Road Trip, endless highway, summer wind, cassette tapes on dashboard, sunset horizon',
    sampleLyrics: `[Intro]
Windows down feeling the summer breeze
Dusty highway winding through palm trees

[Verse 1]
Cassette tapes piled on the dashboard leather
Singing along in the warm open weather
Milestone markers flying right on by
Golden sun setting in a violet sky

[Pre-Chorus]
Old favorite chorus playing on the radio
Remembering the places where we used to go

[Chorus]
Nostalgic road trip under open skies
Endless horizon reflected in our eyes
Miles roll behind us like a movie reel
Freedom is the only thing we want to feel

[Verse 2]
Diner coffee cups at a midnight stop
Laughter ringing out till the temperatures drop
Map spread open across the hood at night
Chasing every star glowing silver bright

[Bridge]
No destination needed just the open road
Lifting off the weight of every heavy load

[Chorus]
Nostalgic road trip under open skies
Endless horizon reflected in our eyes
Miles roll behind us like a movie reel
Freedom is the only thing we want to feel

[Outro]
Highway tail lights fading in sunset glow
Riding on forever slow and easy`,
  },
  {
    id: 'triumph-adversity',
    title: 'Triumph Over Adversity',
    category: 'Inspirational / Anthem',
    description: 'Rising from dust, breaking chains, unshakeable willpower, victorious horizon, unstoppable spirit.',
    promptTheme: 'Triumph Over Adversity, rising from dust, breaking chains, unshakeable willpower, victorious horizon',
    sampleLyrics: `[Intro]
Heavy footsteps rising from the ground
Unbroken spirit making a thunderous sound

[Verse 1]
They said the mountain was too steep to climb
They counted down the seconds on a broken time
I took the bruises and I bore the scars
Turning every shadow into shining stars

[Pre-Chorus]
Chain links shattering under pressure and grit
Burning with a fire that will never quit

[Chorus]
Triumph over adversity standing tall
Rising higher than the giant wall
From the ashes of the hardest night
We emerge victorious in golden light

[Verse 2]
Doubt was a phantom whispering in my head
Now I walk with courage in my stride instead
Every obstacle became a stepping stone
Claiming back the future that is mine alone

[Bridge]
Iron willpower that can never break
Standing firm for every dream at stake

[Chorus]
Triumph over adversity standing tall
Rising higher than the giant wall
From the ashes of the hardest night
We emerge victorious in golden light

[Outro]
Victory flag flying high and free
Unstoppable for eternity`,
  },
  {
    id: 'cosmic-exploration',
    title: 'Cosmic Exploration & Deep Space',
    category: 'Sci-Fi / Atmospheric',
    description: 'Starships in orbit, galaxy lights, silent cosmos, voyage into the unknown.',
    promptTheme: 'Cosmic Exploration, starships in orbit, galaxy lights, silent cosmos, voyage into the unknown',
    sampleLyrics: `[Intro]
Starlight gleaming across the cockpit glass
Silent celestial dust as centuries pass

[Verse 1]
Solar sails unfolding in the solar wind
Leaving Earth behind where the blue horizon thinned
Supernova clusters glowing red and gold
Navigating mysteries untold

[Pre-Chorus]
G-force pulsing through the hull plate steel
Gravity dissolving into dreamlike feel

[Chorus]
Cosmic exploration into deep unknown
Voyaging across the stellar zone
Beyond the solar realm where galaxies ignite
Sailing through eternity in starlight

[Verse 2]
Nebula clouds swirling in violet blue
Charting new worlds that no one ever knew
Transmission echoing back across the void
Harmonies of planets gently deployed

[Bridge]
Zero gravity drifting free and light
Boundless wonder shining in eternal night

[Chorus]
Cosmic exploration into deep unknown
Voyaging across the stellar zone
Beyond the solar realm where galaxies ignite
Sailing through eternity in starlight

[Outro]
Sub-light engines pulsing slow and clear
Sailing through the cosmos without fear`,
  },
  {
    id: 'midnight-jazz-secret',
    title: 'Midnight Jazz Club Secret',
    category: 'Romance / Mystery',
    description: 'Smoky lounge, velvet curtains, whispered secrets, lingering glances, hidden romance.',
    promptTheme: 'Midnight Jazz Club Secret, smoky lounge, velvet curtains, whispered secrets, lingering glances',
    sampleLyrics: `[Intro]
Soft candlelight flickering in velvet shade
Whispered conversations before memories fade

[Verse 1]
Smoky lounge corner behind velvet drape
Escaping from the city in a secret shape
Eye contact holding across the dimly lit room
Rose petals scattering subtle sweet perfume

[Pre-Chorus]
Glass clinking softly as the clock strikes two
Sensing every secret meant for me and you

[Chorus]
Midnight jazz club secret in the quiet dark
Lingering glance igniting a quiet spark
Two souls meeting in the velvet shade
A romantic memory that will never fade

[Verse 2]
Whispered promises under amber glow
Rhythms of the night moving sweet and slow
Shadows intertwining as the hour grows late
Stepping together into destiny and fate

[Bridge]
No words spoken just the unspoken truth
Timeless passion timeless youth

[Chorus]
Midnight jazz club secret in the quiet dark
Lingering glance igniting a quiet spark
Two souls meeting in the velvet shade
A romantic memory that will never fade

[Outro]
Candle burning down to a gentle ember
A midnight secret we will always remember`,
  },
];

export const RHYME_KEYS = Object.keys(RHYME_FAMILIES);

// ---- Tone-flavored vocabulary & imagery ----
export const TONE_VOCAB: Record<Tone, { openers: string[]; imagery: string[]; connectors: string[] }> = {
  poetic: {
    openers: [
      'Beneath the', 'Across the', 'Where shadows', 'A whispered', 'The velvet', 'Like embers', 'Through corridors of', 'In the cathedral of',
    ],
    imagery: ['silver moonlight', 'velvet silence', 'falling embers', 'distant echoes', 'shattered glass', 'woven dreams', 'gilded dust', 'paper skies', 'porcelain hearts', 'tide of stars', 'threadbare clouds', 'hollow cathedrals', 'marble wings', 'ink-stained dawn', 'frozen breath', 'lacquered memory'],
    connectors: ['and', 'where', 'while', 'as', 'though', 'beneath', 'within', 'between'],
  },
  direct: {
    openers: [
      'I told you', 'You said', 'Now I', 'We were', 'This is', 'No more', 'I know', 'So tell me',
    ],
    imagery: ['the truth', 'my name', 'your eyes', 'this town', 'the road', 'the night', 'our story', 'the answer', 'that promise', 'this moment', 'the facts', 'the deal', 'the price', 'the line', 'the call'],
    connectors: ['and', 'but', 'so', 'cause', 'when', 'if', 'now', 'then'],
  },
  aggressive: {
    openers: [
      'Burn it', 'Tear the', 'No one', 'I break', 'We rise', 'Spit the', 'Crush the', 'Rip the',
    ],
    imagery: ['the chains', 'the lies', 'the system', 'the throttle', 'the danger', 'the static', 'the wreckage', 'the venom', 'the pavement', 'the riot', 'the fuse', 'the fault line', 'the riot gear', 'the sirens'],
    connectors: ['and', 'till', 'no', 'never', 'break', 'rip', 'burn', 'crush'],
  },
  nostalgic: {
    openers: [
      'I remember', 'Back when', 'Those summers', 'We used to', 'There was a time', 'Old songs', 'I still hear', 'When we were',
    ],
    imagery: ['the porch light', 'cassette tapes', 'summer rain', 'a faded photo', 'the old road', 'kitchen radios', 'dusty windows', 'a borrowed coat', 'the drive-in', 'soda fountains', 'the front seat', 'a mixtape', 'the diner', 'the streetlight'],
    connectors: ['and', 'when', 'where', 'while', 'back', 'still', 'again', 'once'],
  },
  playful: {
    openers: [
      'Hey now', 'So what if', 'Tick-tock', 'Candy-coated', 'Pick it up', 'Bounce with', 'Wiggle the', 'Slip into',
    ],
    imagery: ['the groove', 'sugar rush', 'a disco ball', 'neon sneakers', 'bubblegum', 'the dance floor', 'a high five', 'a wink', 'sprinkles', 'the weekend', 'a piggyback', 'the punchline', 'a daydream', 'cartoon hearts'],
    connectors: ['and', 'so', 'then', 'plus', 'but', 'hey', 'okay', 'woo'],
  },
};

// ---- Theme → keyword extraction (very light) ----
export type ThemeKeywords = {
  nouns: string[];
  adjectives: string[];
  verbs: string[];
  setting: string | null;
};

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'about', 'through', 'with', 'for', 'is', 'was', 'are', 'were', 'my', 'your', 'their', 'his', 'her', 'i', 'you', 'we', 'they', 'me', 'him', 'it', 'this', 'that', 'night', 'day', 'song', 'story']);

export function extractKeywords(theme: string): ThemeKeywords {
  const words = theme.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const nouns: string[] = [];
  const adjectives: string[] = [];
  const verbs: string[] = [];
  let setting: string | null = null;

  const settingHints = ['city', 'road', 'street', 'ocean', 'sea', 'mountain', 'forest', 'desert', 'club', 'studio', 'stage', 'bedroom', 'porch', 'highway', 'alley', 'rooftop', 'diner', 'station', 'neon', 'rain'];
  for (const w of words) {
    if (settingHints.includes(w) && !setting) setting = w;
  }

  // crude POS-ish guess by suffix
  for (const w of words) {
    if (/(ing|ed)$/.test(w) || ['move', 'run', 'fall', 'rise', 'break', 'drive', 'fight', 'love', 'lose', 'find', 'leave', 'stay', 'cry', 'sing', 'dance', 'burn', 'fade'].includes(w)) {
      verbs.push(w);
    } else if (/(y|ful|less|ous|ic|al)$/.test(w) || ['dark', 'bright', 'cold', 'hot', 'blue', 'gold', 'green', 'red', 'white', 'black', 'slow', 'fast', 'loud', 'quiet', 'raw', 'clean'].includes(w)) {
      adjectives.push(w);
    } else {
      nouns.push(w);
    }
  }

  return { nouns, adjectives, verbs, setting };
}

// Spanish / French / Japanese / Arabic lyric phrase scaffolding (lightweight)
export const LANG_PHRASES: Record<Lang, { intro: string[]; verse: string[]; chorus: string[] }> = {
  en: { intro: ['Yeah...', 'Oh...', 'Mmm...'], verse: ['I remember', 'Walking through', 'You told me'], chorus: ['So I say', 'Tonight we', 'Nothing can stop us'] },
  es: { intro: ['Sí...', 'Oh...', 'Mmm...'], verse: ['Recuerdo', 'Caminando por', 'Me dijiste'], chorus: ['Y yo digo', 'Esta noche', 'Nada nos detiene'] },
  fr: { intro: ['Oui...', 'Oh...', 'Mmm...'], verse: ['Je me souviens', 'En marchant dans', 'Tu m\'as dit'], chorus: ['Alors je dis', 'Ce soir nous', 'Rien ne nous arrête'] },
  ja: { intro: ['そう...', 'ああ...', 'んん...'], verse: ['覚えている', '歩きながら', '君は言った'], chorus: ['だから言うよ', '今夜僕ら', '何も止められない'] },
  ar: { intro: ['نعم...', 'آه...', 'مم...'], verse: ['أتذكر', 'أمشي عبر', 'أخبرتني'], chorus: ['فأقول', 'الليلة نحن', 'لا شيء يوقفنا'] },
};

// Spanish rhyme families (small subset for es support)
export const ES_RHYME_FAMILIES: Record<string, string[]> = {
  ar: ['amar', 'cantar', 'volar', 'soñar', 'llorar', 'esperar', 'encontrar', 'cambiar', 'amar', 'mar', 'lugar', 'penitencia', 'querer'],
  er: ['querer', 'perder', 'volver', 'morder', 'comer', 'leer', 'saber', 'tener', 'poner', 'ser', 'ver', 'crecer'],
  ir: ['vivir', 'sentir', 'reír', 'partir', 'huir', 'abrir', 'decir', 'seguir', 'fugir', 'resistir'],
};

// French rhyme families (small subset)
export const FR_RHYME_FAMILIES: Record<string, string[]> = {
  ar: ['amour', 'jour', 'toujours', 'alors', 'corps', 'sort', 'port', 'mort', 'tort', 'd\'or', 'encore', 'bord', 'nord', 'accord'],
  er: ['aimer', 'rêver', 'dancer', 'pleurer', 'chanter', 'tomber', 'rester', 'passer', 'oublier', 'essayer'],
  ir: ['fuir', 'courir', 'partir', 'mourir', 'ouvrir', 'souffrir', 'rien', 'bien', 'ancien', 'loin'],
};
