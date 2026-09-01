// AudioCopilot — data catalogs

export type Tag = { id: string; label: string; prompt?: string };

// Genres (primary categories) — each with subgenres + regional fusion accents
export type GenreDef = {
  id: string;
  label: string;
  color: 'cyan' | 'magenta' | 'amber' | 'lime' | 'blue' | 'rose';
  subgenres: string[];
};

export const GENRES: GenreDef[] = [
  { id: 'electronic', label: 'Electronic', color: 'cyan', subgenres: ['House', 'Techno', 'Trance', 'Drum & Bass', 'Garage', 'Ambient Techno', 'Minnesota Sound', 'Minneapolis Sound', 'Electro-Funk', 'Boogie / Post-Disco', 'New Wave Funk', 'Synth-Pop Soul'] },
  { id: 'synthwave', label: 'Synthwave', color: 'magenta', subgenres: ['Darksynth', 'Retrowave', 'Outrun', 'Chillwave', 'Cyberpunk', 'Minnesota Sound', 'Minneapolis Sound', 'New Wave Funk', 'Synth-Pop Soul'] },
  { id: 'hiphop', label: 'Hip-Hop / Trap', color: 'amber', subgenres: ['Boom-Bap', 'Trap', 'Drill', 'Lo-Fi Hip-Hop', 'Phonk', 'Hyperpop'] },
  { id: 'cyberpunk', label: 'Cyberpunk', color: 'cyan', subgenres: ['Darksynth', 'Industrial', 'Glitch', 'Cyber Noir'] },
  { id: 'metal', label: 'Metal', color: 'rose', subgenres: ['Heavy', 'Death', 'Black', 'Djent', 'Metalcore', 'Symphonic'] },
  { id: 'cinematic', label: 'Cinematic', color: 'blue', subgenres: ['Epic Trailer', 'Score', 'Tension', 'Documentary', 'Action'] },
  { id: 'orchestral', label: 'Orchestral', color: 'blue', subgenres: ['Symphonic', 'Chamber', 'Neo-Classical', 'Hybrid Orchestral'] },
  { id: 'rnb', label: 'R&B / Funk', color: 'magenta', subgenres: ['Contemporary R&B', 'Neo-Soul', 'Funk', 'Quiet Storm', 'Minnesota Sound', 'Minneapolis Sound', 'Electro-Funk', 'Boogie / Post-Disco', 'New Wave Funk', 'Synth-Pop Soul'] },
  { id: 'lofi', label: 'Lo-Fi', color: 'lime', subgenres: ['Lo-Fi Beats', 'Chillhop', 'Jazzhop', 'Bedroom Pop'] },
  { id: 'afrobeat', label: 'Afrobeat', color: 'amber', subgenres: ['Afrobeats', 'Amapiano', 'Afro-House', 'Gqom'] },
  { id: 'mid-east', label: 'Middle Eastern', color: 'amber', subgenres: ['Oud Fusion', 'Maqam Rhythms', 'Dabke', 'Sufi Trance'] },
  { id: 'asian-fusion', label: 'Asian Traditional', color: 'lime', subgenres: ['Shamisen Rock', 'Erhu Fusion', 'Koto Ambient', 'Gagaku'] },
  { id: 'latin', label: 'Latin', color: 'rose', subgenres: ['Reggaeton', 'Bachata', 'Salsa', 'Latin Trap', 'Bossanova'] },
  { id: 'country', label: 'Country / Americana', color: 'amber', subgenres: ['Americana', 'Country Folk', 'Alt-Country', 'Roots Rock'] },
  { id: 'blues', label: 'Blues', color: 'blue', subgenres: ['Chicago Blues', 'Delta Blues', 'Electric Blues', 'Blues Rock'] },
  { id: 'yacht-rock', label: 'Late 70s West Coast AOR, Soft Rock, Smooth Melodic Rock', color: 'blue', subgenres: ['Yacht Rock', 'West Coast AOR', 'Soft Rock'] },
];

export const INSTRUMENTS: Tag[] = [
  { id: 'acoustic-guitar', label: 'Acoustic Guitar' },
  { id: 'distorted-guitar', label: 'Distorted Guitar' },
  { id: 'bass-guitar', label: 'Bass Guitar' },
  { id: '808-bass', label: '808 Bass' },
  { id: 'moog-bass', label: 'Moog Synth Bass' },
  { id: 'analog-lead', label: 'Analog Lead' },
  { id: 'vinyl-crackle', label: 'Vinyl Crackle' },
  { id: 'live-drums', label: 'Live Drum Kit' },
  { id: 'acoustic-drums', label: 'Acoustic Drums' },
  { id: 'fender-rhodes', label: 'Fender Rhodes' },
  { id: 'oberheim-synths', label: 'Oberheim Synths' },
  { id: 'slap-bass', label: 'Slap Bass' },
  { id: 'chorused-guitar', label: 'Chorused Guitar' },
  { id: 'saxophone', label: 'Saxophone' },
  { id: 'yamaha-dx7', label: 'Yamaha DX7' },
  { id: 'linndrum', label: 'LinnDrum' },
  { id: 'juno-pads', label: 'Juno Pads' },
  { id: 'overdriven-tube-guitar', label: 'Overdriven Tube Guitar' },
  { id: 'harmonica', label: 'Harmonica' },
  { id: 'upright-bass', label: 'Upright Bass' },
  { id: 'cassette-hiss', label: 'Cassette Hiss' },
  { id: 'chorus-texture', label: 'Chorus Texture' },
  { id: 'strings', label: 'Orchestral Strings' },
  { id: 'brass-stabs', label: 'Brass Stabs' },
  { id: 'arpeggiated-plucks', label: 'Arpeggiated Plucks' },
  { id: 'grand-piano', label: 'Grand Piano' },
  { id: 'fm-pads', label: 'FM Pads' },
  { id: 'saw-waves', label: 'Saw Waves' },
  { id: 'tabla', label: 'Tabla' },
  { id: 'oud', label: 'Oud' },
  { id: 'shamisen', label: 'Shamisen' },
  { id: 'koto', label: 'Koto' },
  { id: 'congas', label: 'Congas' },
  { id: '808-kick', label: '808 Kick' },
  { id: 'hi-hat-rolls', label: 'Hi-Hat Rolls' },
  { id: 'choir', label: 'Choir' },
];

export const VOCAL_TYPES: Tag[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'duet', label: 'Duet' },
  { id: 'choral', label: 'Choral' },
  { id: 'vocoder', label: 'Robotic / Vocoder' },
  { id: 'whispered', label: 'Whispered' },
  { id: 'belted', label: 'Belted' },
  { id: 'falsetto', label: 'Falsetto' },
  { id: 'raspy', label: 'Raspy' },
  { id: 'melodic-rap', label: 'Melodic Rap' },
  { id: 'instrumental', label: 'Instrumental Only' },
];

export const VOCAL_TIMBRES: Tag[] = [
  { id: 'gritty-raspy-baritone', label: 'Gritty Raspy Baritone' },
  { id: 'smoky-low-register-alto', label: 'Smoky Low-Register Alto' },
  { id: 'airy-breathy-soprano', label: 'Airy Breathy Soprano' },
  { id: 'soaring-dynamic-tenor', label: 'Soaring Dynamic Tenor' },
  { id: 'warm-whispered-falsetto', label: 'Warm Whispered Falsetto' },
  { id: 'distorted-blues-growl', label: 'Distorted Blues Growl' },
  { id: 'velvet-melodic-mezzo', label: 'Velvet Melodic Mezzo' },
  { id: 'bright-clean-pop-lead', label: 'Bright Clean Pop Lead' },
];

export const VOCAL_EFFECTS: Tag[] = [
  { id: 'reverb-drenched', label: 'Reverb-Drenched' },
  { id: 'autotune', label: 'Auto-Tune' },
  { id: 'dry-intimate', label: 'Dry & Intimate' },
  { id: 'distorted', label: 'Distorted' },
  { id: 'lofi-radio', label: 'Lo-Fi Radio Filter' },
];

export const MOOD_TAGS: Tag[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'melancholic', label: 'Melancholic' },
  { id: 'uplifting', label: 'Uplifting' },
  { id: 'aggressive', label: 'Aggressive' },
  { id: 'ethereal', label: 'Ethereal' },
  { id: 'nostalgic', label: 'Nostalgic' },
  { id: 'gritty', label: 'Gritty' },
  { id: 'euphoric', label: 'Euphoric' },
  { id: 'dreamy', label: 'Dreamy' },
  { id: 'ominous', label: 'Ominous' },
];

export const PRODUCTION_TAGS: Tag[] = [
  { id: '90s-cassette', label: '90s Cassette Master' },
  { id: 'wide-stereo', label: 'Wide Stereo Field' },
  { id: 'heavy-sidechain', label: 'Heavy Sidechain' },
  { id: 'hifi-studio', label: 'Hi-Fi Studio Mix' },
  { id: 'raw-unpolished', label: 'Raw & Unpolished' },
  { id: 'tape-saturation', label: 'Tape Saturation' },
  { id: 'lofi-charm', label: 'Lo-Fi Charm' },
  { id: 'glitch-cuts', label: 'Glitch Cuts' },
];

export const SONG_STRUCTURE_TAGS = [
  '[Intro]',
  '[Verse]',
  '[Pre-Chorus]',
  '[Chorus]',
  '[Drop]',
  '[Bridge]',
  '[Guitar Solo]',
  '[Outro]',
  '[Fade Out]',
  '[End]',
];

export const END_TRACK_TAGS = [
  '[Outro | rallentando | ritardando]',
  '[Final Chorus Climax]',
  '[Big Finish | Sustained Final Chord Ring-out]',
  '[Cello Sustain]',
  '[Cymbal Choke]',
  '[Decaying Reverb Tail | Silence]',
  '[End]',
  '[Fade to Silence]',
];

export const MICRO_GENRES: { era: string; options: string[] }[] = [
  { era: '1970s', options: ['West Coast Soft Rock / Yacht', 'Funk / Philly Soul', 'Glam Rock', 'Outlaw Country'] },
  { era: '1980s', options: ['80s Gated Snare Synth-Pop', 'Hair Metal / Arena Rock', 'Quiet Storm / Boogie R&B', 'Minneapolis Sound (Prince style)', 'Minneapolis Sound', 'Minnesota Sound', 'Electro-Funk', 'Boogie / Post-Disco', 'New Wave Funk', 'Synth-Pop Soul'] },
  { era: '1990s', options: ['90s Boom-Bap Hip Hop', 'Grunge / Alternative', 'Eurodance', 'Neotraditional Country'] },
  { era: '2000s-Present', options: ['2000s Timbaland/Neptunes R&B', 'Mid-2010s Trap', 'Hyperpop', 'Bedroom Lo-Fi Pop'] },
];

export const MICRO_GENRE_PROMPTS: Record<string, string> = {
  'West Coast Soft Rock / Yacht': 'late-70s West Coast AOR, polished soft rock, Fender Rhodes glow, chorused guitar, smooth stacked harmonies',
  'Funk / Philly Soul': '1970s funk and Philly soul, syncopated rhythm section, string accents, tight horn arrangements',
  'Glam Rock': '1970s glam rock, swaggering guitar riffs, theatrical vocals, stomping rock pulse',
  'Outlaw Country': '1970s outlaw country, dry acoustic storytelling, twang guitar, road-worn baritone delivery',
  '80s Gated Snare Synth-Pop': '1980s gated-snare synth-pop, bright analog keyboards, punchy drum-machine hooks, polished chorus vocals',
  'Hair Metal / Arena Rock': '1980s hair metal and hard rock, overdriven guitar leads, huge drums, soaring clean vocal hooks',
  'Quiet Storm / Boogie R&B': '1980s quiet storm boogie, glossy digital keys, smooth pocket bass, restrained soul phrasing',
  'Minneapolis Sound (Prince style)': 'Minneapolis Sound, Oberheim OB-Xa synth brass, tight LinnDrum 808/LM-1 patterns, slap bass pocket, gated reverb snare, falsetto harmonies, funk guitar chop, clean electro-funk production',
  'Minneapolis Sound': 'Minneapolis Sound, Oberheim OB-Xa synth brass, tight LinnDrum 808/LM-1 patterns, slap bass pocket, gated reverb snare, falsetto harmonies, funk guitar chop, clean electro-funk production',
  'Minnesota Sound': 'Minneapolis Sound, Oberheim OB-Xa synth brass, tight LinnDrum 808/LM-1 patterns, slap bass pocket, gated reverb snare, falsetto harmonies, funk guitar chop, clean electro-funk production',
  'Electro-Funk': 'electro-funk production, Oberheim synths, LinnDrum groove, slap bass, funk guitar chop',
  'Boogie / Post-Disco': 'boogie post-disco, synth bass, slap bass, bright synth brass, funk guitar chop',
  'New Wave Funk': 'new wave funk, Oberheim OB-Xa synths, gated snare, slap bass, falsetto harmonies',
  'Synth-Pop Soul': 'synth-pop soul, Oberheim synth brass, tight LinnDrum, falsetto harmonies, clean electro-funk production',
  '90s Boom-Bap Hip Hop': '1990s boom-bap hip hop, dusty chopped-sample texture, swung head-nod drums, dense rhythmic flow',
  'Grunge / Alternative': '1990s grunge alternative rock, raw guitar dynamics, live-room drums, hushed-to-explosive vocals',
  'Eurodance': '1990s Eurodance, four-on-the-floor kick, bright trance synths, euphoric vocal chorus',
  'Neotraditional Country': '1990s neotraditional country, clean twang guitar, fiddle accents, close harmony storytelling',
  '2000s Timbaland/Neptunes R&B': '2000s futuristic R&B, clipped syncopated drums, sparse synth bass, inventive melodic vocals',
  'Mid-2010s Trap': 'mid-2010s trap, rolling hi-hats, deep 808 sub bass, spacious minor-key melodic rap',
  'Hyperpop': 'hyperpop, maximal digital distortion, elastic synths, pitch-shifted high-energy vocal textures',
  'Bedroom Lo-Fi Pop': 'bedroom lo-fi pop, intimate dry vocals, cassette haze, soft programmed drums, fragile guitar layers',
};

export type MicroGenreRecipe = {
  genres: string[];
  instruments: string[];
  vocalTypes: string[];
  vocalTimbre?: string;
  vocalEffects: string[];
  moods: string[];
  production: string[];
  musicalKeys: string[];
  chordVoicings: string[];
  bpm: number;
  lyricMetatags: string;
};

export const MICRO_GENRE_RECIPES: Record<string, MicroGenreRecipe> = {
  'Funk / Philly Soul': { genres: ['rnb'], instruments: ['live-drums', 'brass-stabs', 'grand-piano', 'acoustic-guitar'], vocalTypes: ['female', 'male'], vocalEffects: ['dry-intimate'], moods: ['uplifting', 'gritty'], production: ['hifi-studio', 'tape-saturation'], musicalKeys: ['g-major'], chordVoicings: ['vintage-doo-wop'], bpm: 108, lyricMetatags: '[Verse 1 | pocketed soul delivery]\n[Chorus | stacked call-and-response]\n[Outro | brass and rhythm-section tag]' },
  'Glam Rock': { genres: ['metal'], instruments: ['live-drums', 'distorted-guitar', 'grand-piano'], vocalTypes: ['male', 'belted'], vocalEffects: ['reverb-drenched'], moods: ['euphoric', 'aggressive'], production: ['hifi-studio', 'wide-stereo'], musicalKeys: ['e-minor'], chordVoicings: ['power-chords'], bpm: 124, lyricMetatags: '[Verse 1 | swaggering theatrical delivery]\n[Chorus | soaring studio vocal energy]\n[Guitar Solo | overdriven spotlight]\n[Outro | final riff ring-out]' },
  'Outlaw Country': { genres: ['country'], instruments: ['acoustic-guitar', 'live-drums', 'grand-piano'], vocalTypes: ['male', 'raspy'], vocalEffects: ['dry-intimate'], moods: ['gritty', 'nostalgic'], production: ['raw-unpolished', 'tape-saturation'], musicalKeys: ['g-major', 'mixolydian-mode'], chordVoicings: ['open-voicings'], bpm: 86, lyricMetatags: '[Verse 1 | plainspoken road-worn delivery]\n[Chorus | wide open-road harmony]\n[Bridge | stripped acoustic confession]\n[Outro | dust and room-tone fade]' },
  '80s Gated Snare Synth-Pop': { genres: ['synthwave', 'electronic'], instruments: ['808-kick', 'analog-lead', 'juno-pads', 'arpeggiated-plucks'], vocalTypes: ['female', 'vocoder'], vocalEffects: ['reverb-drenched'], moods: ['euphoric', 'dreamy'], production: ['wide-stereo', 'heavy-sidechain', 'hifi-studio'], musicalKeys: ['c-major', 'lydian-mode'], chordVoicings: ['arpeggiated-progression'], bpm: 120, lyricMetatags: '[Verse 1 | glossy gated-synth delivery]\n[Build-up | rising drum-machine tension]\n[Chorus | bright stacked pop hook]\n[Outro | sequenced synth fade]' },
  'Hair Metal / Arena Rock': { genres: ['metal'], instruments: ['live-drums', 'distorted-guitar', 'grand-piano'], vocalTypes: ['male', 'belted'], vocalEffects: ['reverb-drenched'], moods: ['aggressive', 'euphoric'], production: ['wide-stereo', 'hifi-studio'], musicalKeys: ['e-minor'], chordVoicings: ['power-chords'], bpm: 132, lyricMetatags: '[Verse 1 | gritty studio delivery]\n[Chorus | soaring studio hook]\n[Guitar Solo | virtuosic lead break]\n[Outro | sustained power-chord finish]' },
  '90s Boom-Bap Hip Hop': { genres: ['hiphop'], instruments: ['live-drums', 'vinyl-crackle', 'grand-piano', 'brass-stabs'], vocalTypes: ['male', 'melodic-rap'], vocalEffects: ['lofi-radio', 'dry-intimate'], moods: ['gritty', 'nostalgic'], production: ['90s-cassette', 'raw-unpolished'], musicalKeys: ['e-minor'], chordVoicings: ['jazz-voicings'], bpm: 88, lyricMetatags: '[Intro | vinyl sample drop]\n[Verse 1 | dense boom-bap flow]\n[Chorus | head-nod hook]\n[Verse 2 | sharper internal rhyme pocket]\n[Outro | DJ cut and tape stop]' },
  'Grunge / Alternative': { genres: ['metal'], instruments: ['live-drums', 'distorted-guitar', 'bass-guitar'], vocalTypes: ['male', 'raspy'], vocalEffects: ['distorted', 'dry-intimate'], moods: ['dark', 'gritty'], production: ['raw-unpolished', 'wide-stereo'], musicalKeys: ['e-minor'], chordVoicings: ['power-chords'], bpm: 104, lyricMetatags: '[Verse 1 | hushed raw delivery]\n[Chorus | explosive unpolished release]\n[Bridge | feedback breakdown]\n[Outro | collapsing guitar noise]' },
  'Eurodance': { genres: ['electronic'], instruments: ['808-kick', 'analog-lead', 'arpeggiated-plucks', 'fm-pads'], vocalTypes: ['female', 'male'], vocalEffects: ['autotune', 'reverb-drenched'], moods: ['euphoric', 'uplifting'], production: ['heavy-sidechain', 'wide-stereo'], musicalKeys: ['c-major'], chordVoicings: ['pop-anthem'], bpm: 132, lyricMetatags: '[Intro | sampled vocal lift]\n[Verse 1 | bright dance delivery]\n[Build-up | rising four-on-the-floor tension]\n[Drop | euphoric synth hook]\n[Outro | club mix fade]' },
  'Neotraditional Country': { genres: ['country'], instruments: ['acoustic-guitar', 'live-drums', 'grand-piano'], vocalTypes: ['male', 'female'], vocalEffects: ['dry-intimate'], moods: ['nostalgic', 'uplifting'], production: ['hifi-studio', 'raw-unpolished'], musicalKeys: ['g-major'], chordVoicings: ['vintage-doo-wop'], bpm: 92, lyricMetatags: '[Verse 1 | clear country storytelling]\n[Chorus | bright harmony lift]\n[Verse 2 | fiddle-ready narrative pocket]\n[Outro | acoustic resolve]' },
  '2000s Timbaland/Neptunes R&B': { genres: ['rnb', 'electronic'], instruments: ['808-kick', '808-bass', 'analog-lead', 'arpeggiated-plucks'], vocalTypes: ['female', 'male'], vocalEffects: ['autotune', 'dry-intimate'], moods: ['euphoric', 'dreamy'], production: ['hifi-studio', 'wide-stereo'], musicalKeys: ['a-minor'], chordVoicings: ['inversions'], bpm: 102, lyricMetatags: '[Verse 1 | clipped syncopated vocal pocket]\n[Chorus | futuristic melodic hook]\n[Bridge | sparse beat switch]\n[Outro | ad-lib loop fade]' },
  'Mid-2010s Trap': { genres: ['hiphop'], instruments: ['808-kick', '808-bass', 'hi-hat-rolls', 'saw-waves'], vocalTypes: ['male', 'melodic-rap'], vocalEffects: ['autotune'], moods: ['dark', 'aggressive'], production: ['heavy-sidechain', 'wide-stereo', 'glitch-cuts'], musicalKeys: ['e-minor', 'phrygian-mode'], chordVoicings: ['dark-trap-cadence'], bpm: 140, lyricMetatags: '[Intro | filtered 808 atmosphere]\n[Verse 1 | triplet melodic rap flow]\n[Chorus | hypnotic autotuned hook]\n[Bridge | half-time bass breakdown]\n[Outro | 808 decay]' },
  'Hyperpop': { genres: ['electronic'], instruments: ['808-kick', 'saw-waves', 'analog-lead', 'arpeggiated-plucks'], vocalTypes: ['female', 'vocoder'], vocalEffects: ['autotune', 'distorted'], moods: ['euphoric', 'aggressive'], production: ['glitch-cuts', 'heavy-sidechain', 'wide-stereo'], musicalKeys: ['c-major'], chordVoicings: ['cluster-voicings'], bpm: 156, lyricMetatags: '[Intro | corrupted digital vocal chop]\n[Verse 1 | elastic pitch-shifted delivery]\n[Chorus | maximal digital overload]\n[Breakdown | glitch stutter silence]\n[Outro | clipped digital decay]' },
  'Bedroom Lo-Fi Pop': { genres: ['lofi'], instruments: ['acoustic-guitar', 'live-drums', 'vinyl-crackle', 'grand-piano'], vocalTypes: ['female', 'whispered'], vocalEffects: ['lofi-radio', 'dry-intimate'], moods: ['dreamy', 'nostalgic'], production: ['90s-cassette', 'lofi-charm', 'tape-saturation'], musicalKeys: ['a-minor'], chordVoicings: ['open-voicings'], bpm: 78, lyricMetatags: '[Intro | cassette hiss and room tone]\n[Verse 1 | intimate bedroom whisper]\n[Chorus | soft fragile melody]\n[Outro | tape warble fade]' },
};

export const MIX_SPATIAL_TAGS: Tag[] = [
  { id: 'dry-close-mic', label: 'dry close-mic vocal' },
  { id: 'warm-tube-saturation', label: 'warm analog tube saturation' },
  { id: 'asmr-proximity', label: 'intimate ASMR proximity effect' },
  { id: 'telephone-eq', label: 'lo-fi telephone EQ filter' },
  { id: 'cathedral-reverb', label: 'spacious cathedral reverb' },
  { id: 'dry-booth', label: 'tight dry studio booth' },
  { id: 'stereo-plate', label: 'lush stereo plate reverb' },
  { id: 'ping-pong-delay', label: 'wide ping-pong delay' },
  { id: 'octave-double', label: 'octave double vocals' },
  { id: 'three-part-harmony', label: '3-part tight vocal harmony' },
  { id: 'whisper-double', label: 'whispered background doubling' },
  { id: 'crowd-adlibs', label: 'crowd chanting ad-libs' },
];

export const TIME_SIGNATURES: Tag[] = [
  { id: '4-4', label: '4/4 Standard' },
  { id: '3-4', label: '3/4 Waltz' },
  { id: '6-8', label: '6/8 Soul Ballad' },
  { id: '12-8', label: '12/8 Blues Shuffle' },
];

export const GROOVE_FEELS: Tag[] = [
  { id: 'swung-16ths', label: 'swung 16th-note groove' },
  { id: 'dilla-pocket', label: 'unquantized J Dilla pocket' },
  { id: 'half-time-breakdown', label: 'half-time drum breakdown' },
  { id: 'four-on-floor', label: 'straight driving four-on-the-floor' },
  { id: 'syncopated-polyrhythms', label: 'syncopated polyrhythms' },
];

// Negative / Exclude tags — things to explicitly avoid in the generated music
export const NEGATIVE_TAGS: Tag[] = [
  { id: 'crowd', label: 'crowd' },
  { id: 'applause', label: 'applause' },
  { id: 'audience', label: 'audience' },
  { id: 'cheering', label: 'cheering' },
  { id: 'screaming', label: 'screaming' },
  { id: 'live-performance', label: 'live performance' },
  { id: 'stadium-echo', label: 'stadium echo' },
  { id: 'whistle', label: 'whistle' },
  { id: 'no-screaming-clean-vocals', label: 'No Screaming / Clean Vocals' },
  { id: 'no-rnb-vocal-runs', label: 'no R&B vocal runs' },
  { id: 'no-modern-soul', label: 'no modern soul' },
  { id: 'no-screaming', label: 'no screaming' },
  { id: 'no-shouting', label: 'no shouting' },
  { id: 'no-harsh-vocals', label: 'no harsh vocals' },
  { id: 'no-brass', label: 'no brass' },
  { id: 'no-heavy-distortion', label: 'no heavy distortion' },
  { id: 'no-autotune', label: 'no autotune' },
  { id: 'clean-mix', label: 'clean mix' },
  { id: 'no-crowd-noise', label: 'no crowd noise' },
  { id: 'no-spoken-intro', label: 'no spoken intro' },
  { id: 'no-fade-out', label: 'no fade-out' },
  { id: 'no-lofi', label: 'no lofi artifacts' },
  { id: 'no-harsh-frequencies', label: 'no harsh frequencies' },
  { id: 'no-sidechain', label: 'no heavy sidechain' },
];

// Musical Keys & Modes
export const MUSICAL_KEYS: Tag[] = [
  { id: 'c-minor', label: 'C Minor' },
  { id: 'ab-major', label: 'A♭ Major' },
  { id: 'dorian-mode', label: 'Dorian Mode' },
  { id: 'minor-pentatonic', label: 'Minor Pentatonic' },
  { id: 'lydian-mode', label: 'Lydian Mode' },
  { id: 'c-major', label: 'C Major' },
  { id: 'a-minor', label: 'A Minor' },
  { id: 'g-major', label: 'G Major' },
  { id: 'e-minor', label: 'E Minor' },
  { id: 'mixolydian-mode', label: 'Mixolydian Mode' },
  { id: 'phrygian-mode', label: 'Phrygian Mode' },
  { id: 'major-pentatonic', label: 'Major Pentatonic' },
];

// Chord Voicing Tags
export const CHORD_VOICINGS: Tag[] = [
  { id: 'pop-anthem', label: 'Pop Anthem (I-V-vi-IV)', prompt: 'I-V-vi-IV chord progression, soaring uplifting resolution, modern pop anthem harmony' },
  { id: 'emotional-melancholic', label: 'Emotional / Melancholic (vi-IV-I-V)', prompt: 'vi-IV-I-V minor-led chord progression, melancholic longing mood, dynamic emotional tension' },
  { id: 'vintage-doo-wop', label: 'Vintage Doo-Wop (I-vi-IV-V)', prompt: 'I-vi-IV-V vintage progression, 50s doo-wop nostalgia, classic soul chord cycle' },
  { id: 'jazz-neo-soul', label: 'Jazz / Neo-Soul (ii-V-I 7th Voicings)', prompt: 'ii-V-I jazz cadence, extended 7th and 9th chords, lush Fender Rhodes harmony, smooth chromatic transitions' },
  { id: 'dark-trap-cadence', label: 'Dark Trap Cadence (i-VII-VI)', prompt: 'i-VII-VI minor step-down progression, dark melancholic pads, tense ambient chord loops' },
  { id: 'royal-road-anime-pop', label: 'Royal Road / Anime Pop (IV-V-iii-vi)', prompt: 'IV-V-iii-vi Royal Road progression, dramatic emotive resolution, rich Japanese pop harmonies' },
  { id: 'cinematic-heroic', label: 'Cinematic Heroic (i-VI-III-VII)', prompt: 'i-VI-III-VII minor descent, epic orchestral trailer harmony, triumphant dramatic build' },
  { id: 'twelve-bar-blues', label: '12-Bar Blues / Rock', prompt: 'traditional 12-bar blues progression, dominant 7th chords, gritty shuffle turnaround' },
  { id: 'sus4-chords', label: 'Sus4 chords', prompt: 'suspended 4th chord voicings, airy tension, unresolved harmonic lift' },
  { id: 'jazz-voicings', label: '7th and 9th jazz voicings', prompt: '7th and 9th jazz voicings, creamy harmonic extensions, elegant late-night sophistication' },
  { id: 'arpeggiated-progression', label: 'Arpeggiated progression', prompt: 'arpeggiated progression, shimmering broken chords, delicate melodic motion' },
  { id: 'walking-bassline', label: 'Walking bassline', prompt: 'walking bassline, smooth harmonic movement, foundational swing groove' },
  { id: 'power-chords', label: 'Power chords', prompt: 'power chord voicings, punchy distorted motion, direct rock energy' },
  { id: 'extended-chords', label: '11th and 13th extensions', prompt: '11th and 13th chord extensions, lush suspended tension, cinematic color' },
  { id: 'cluster-voicings', label: 'Cluster voicings', prompt: 'cluster voicings, dense harmonic color, modern experimental tension' },
  { id: 'open-voicings', label: 'Open voicings', prompt: 'open voicings, full resonant spacing, warm acoustic bloom' },
  { id: 'inversions', label: 'Chord inversions', prompt: 'chord inversions, smooth bass movement, fluid melodic continuity' },
  { id: 'pedal-point', label: 'Pedal point bass', prompt: 'pedal point bass, hypnotic tonal center, sustained harmonic pressure' },
];

export type DynamicPresetPools = {
  keys: string[];
  bpmRange: [number, number];
  chords: string[];
  coreDrums: string[];
  harmonicLeads: string[];
  textures: string[];
  vocals: string[];
};

// Preset recipes
export type Preset = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  genres: string[];      // genre ids
  subgenres: string[];   // subgenre labels (secondary accent)
  instruments: string[];
  vocalTypes: string[];
  vocalTimbre?: string;
  vocalEffects: string[];
  moods: string[];
  production: string[];
  negativeTags?: string[];
  musicalKeys?: string[];
  chordVoicings?: string[];
  bpm: number;
  timeFeel: 'normal' | 'half' | 'double';
  customInstruments: string[];
  blend: number; // primary genre weight 0-100
  artistArchetypes?: string[];
  artistBlend?: number; // primary artist-archetype weight 0-100
  lyricTheme?: string;
  lyricStructureId?: string;
  lyricRhymeScheme?: string;
  lyricMetatags?: string;
  category?: 'signature' | 'vintage';
  dynamicPools?: DynamicPresetPools;
  endTrack?: boolean;
  timeSignature?: string;
  grooveFeel?: string;
  mixSpatialTags?: string[];
  microGenre?: string;
  matchingPills?: {
    genres: string[];
    instruments: string[];
    vocalTypes: string[];
    vocalEffects: string[];
    moods: string[];
    chordVoicings: string[];
    negativeTags: string[];
  };
};

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickDistinct<T>(items: T[], count: number): T[] {
  return [...items].sort(() => Math.random() - 0.5).slice(0, Math.min(count, items.length));
}

export function rollPreset(preset: Preset): Preset {
  const pools = preset.dynamicPools;
  if (!pools) return { ...preset };

  const [minimumBpm, maximumBpm] = pools.bpmRange;
  const bpm = Math.round(minimumBpm + Math.random() * (maximumBpm - minimumBpm));
  return {
    ...preset,
    instruments: [pickRandom(pools.coreDrums), ...pickDistinct(pools.harmonicLeads, 2), pickRandom(pools.textures)],
    musicalKeys: [pickRandom(pools.keys)],
    chordVoicings: [pickRandom(pools.chords)],
    vocalTypes: [...pools.vocals],
    bpm,
  };
}

// ---- Genre blueprint presets (discrete, one-per-genre) ----
export type GenreBlueprint = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  primaryGenre: string;       // genre id
  secondaryGenre?: string;    // optional fusion genre id
  subgenres: string[];
  instruments: string[];
  vocalTypes: string[];
  vocalEffects: string[];
  moods: string[];
  production: string[];
  bpm: number;
  timeFeel: 'normal' | 'half' | 'double';
  blend: number;              // primary weight %
  structureId: string;        // matches StructureId in lyricBanks
  rhymeScheme: string;        // matches RhymeScheme in lyricBanks
  vocalArchetypes: string[];  // archetype ids (see lyricBanks VOCAL_ARCHETYPES)
  regionalFlows: string[];    // flow labels
};

export const GENRE_BLUEPRINTS: GenreBlueprint[] = [
  {
    id: 'bp-boom-bap',
    name: '90s East Coast Hip-Hop / Boom-Bap',
    emoji: '🎤',
    blurb: 'Crate-dug soul loops, head-nod drums, dense lyricism.',
    primaryGenre: 'hiphop',
    subgenres: ['Boom-Bap'],
    instruments: ['vinyl-crackle', 'acoustic-guitar', 'live-drums', 'grand-piano', 'brass-stabs'],
    vocalTypes: ['male', 'raspy'],
    vocalEffects: ['dry-intimate', 'lofi-radio'],
    moods: ['nostalgic', 'gritty'],
    production: ['90s-cassette', 'raw-unpolished', 'tape-saturation'],
    bpm: 88,
    timeFeel: 'normal',
    blend: 80,
    structureId: 'hiphop',
    rhymeScheme: 'Complex',
    vocalArchetypes: ['east-coast-boom-bap-flow'],
    regionalFlows: ['90s East Coast / Boom Bap'],
  },
  {
    id: 'bp-neo-soul',
    name: 'Neo-Soul / Jazz Lounge',
    emoji: '🌙',
    blurb: 'Velvet vocals over warm Rhodes, live drums, tape warmth.',
    primaryGenre: 'rnb',
    subgenres: ['Neo-Soul', 'Quiet Storm'],
    instruments: ['grand-piano', 'fm-pads', 'acoustic-guitar', 'live-drums', 'brass-stabs'],
    vocalTypes: ['female', 'belted'],
    vocalEffects: ['reverb-drenched', 'dry-intimate'],
    moods: ['ethereal', 'dreamy', 'melancholic'],
    production: ['wide-stereo', 'tape-saturation', 'hifi-studio'],
    bpm: 74,
    timeFeel: 'normal',
    blend: 75,
    structureId: 'neo-soul',
    rhymeScheme: 'ABAB',
    vocalArchetypes: ['neo-soul-badu'],
    regionalFlows: [],
  },
  {
    id: 'bp-synthwave',
    name: 'Synthwave / Cyberpunk',
    emoji: '🌆',
    blurb: 'Chromatic dystopia with punishing bass and arpeggios.',
    primaryGenre: 'synthwave',
    secondaryGenre: 'cyberpunk',
    subgenres: ['Darksynth', 'Outrun'],
    instruments: ['moog-bass', 'saw-waves', 'analog-lead', 'arpeggiated-plucks', '808-kick'],
    vocalTypes: ['vocoder'],
    vocalEffects: ['distorted', 'reverb-drenched'],
    moods: ['dark', 'aggressive', 'ominous'],
    production: ['heavy-sidechain', 'wide-stereo', 'glitch-cuts'],
    bpm: 130,
    timeFeel: 'normal',
    blend: 65,
    structureId: 'edm',
    rhymeScheme: 'AABB',
    vocalArchetypes: [],
    regionalFlows: [],
  },
  {
    id: 'bp-uk-drill',
    name: 'UK Drill / Grime',
    emoji: '🏴',
    blurb: 'Sliding 140 BPM bass, staccato flows, British slang.',
    primaryGenre: 'hiphop',
    subgenres: ['Drill'],
    instruments: ['808-bass', '808-kick', 'hi-hat-rolls', 'arpeggiated-plucks', 'saw-waves'],
    vocalTypes: ['male', 'melodic-rap'],
    vocalEffects: ['autotune', 'reverb-drenched'],
    moods: ['dark', 'aggressive'],
    production: ['wide-stereo', 'heavy-sidechain', 'hifi-studio'],
    bpm: 140,
    timeFeel: 'normal',
    blend: 85,
    structureId: 'hiphop',
    rhymeScheme: 'AABB',
    vocalArchetypes: ['uk-drill-staccato'],
    regionalFlows: ['UK Drill / Grime'],
  },
  {
    id: 'bp-retro-soul',
    name: 'Retro-Soul / Vintage Motown',
    emoji: '🎷',
    blurb: 'Raw brassy contralto, 60s torch ballad timing, vintage bite.',
    primaryGenre: 'rnb',
    subgenres: ['Funk'],
    instruments: ['brass-stabs', 'grand-piano', 'live-drums', 'acoustic-guitar', 'vinyl-crackle'],
    vocalTypes: ['female', 'raspy'],
    vocalEffects: ['dry-intimate', 'lofi-radio'],
    moods: ['nostalgic', 'gritty'],
    production: ['90s-cassette', 'tape-saturation', 'raw-unpolished'],
    bpm: 82,
    timeFeel: 'normal',
    blend: 80,
    structureId: 'standard-pop',
    rhymeScheme: 'ABAB',
    vocalArchetypes: ['retro-soul-winehouse'],
    regionalFlows: [],
  },
  {
    id: 'bp-trap',
    name: 'Trap / Southern 808',
    emoji: '🔥',
    blurb: 'Triplet flows, rattling 808s, auto-tuned melodic hooks.',
    primaryGenre: 'hiphop',
    subgenres: ['Trap'],
    instruments: ['808-bass', '808-kick', 'hi-hat-rolls', 'arpeggiated-plucks', 'brass-stabs'],
    vocalTypes: ['male', 'melodic-rap'],
    vocalEffects: ['autotune', 'reverb-drenched'],
    moods: ['aggressive', 'euphoric', 'dark'],
    production: ['wide-stereo', 'heavy-sidechain', 'hifi-studio'],
    bpm: 140,
    timeFeel: 'normal',
    blend: 80,
    structureId: 'hiphop',
    rhymeScheme: 'AABB',
    vocalArchetypes: ['psychedelic-trap'],
    regionalFlows: ['Southern / Dirty South / Trap'],
  },
  {
    id: 'bp-cinematic',
    name: 'Cinematic / Orchestral Trailer',
    emoji: '🎬',
    blurb: 'Gravity-shifting orchestral build to a monstrous drop.',
    primaryGenre: 'cinematic',
    secondaryGenre: 'orchestral',
    subgenres: ['Epic Trailer', 'Hybrid Orchestral'],
    instruments: ['strings', 'choir', 'brass-stabs', '808-bass', 'grand-piano', '808-kick'],
    vocalTypes: ['choral'],
    vocalEffects: ['reverb-drenched'],
    moods: ['dark', 'ominous', 'euphoric'],
    production: ['wide-stereo', 'hifi-studio'],
    bpm: 140,
    timeFeel: 'half',
    blend: 70,
    structureId: 'cinematic-trailer',
    rhymeScheme: 'Free',
    vocalArchetypes: [],
    regionalFlows: [],
  },
  {
    id: 'bp-modern-pop',
    name: 'Modern Pop / Dance-Pop',
    emoji: '✨',
    blurb: 'Catchy hooks, polished production, infectious energy.',
    primaryGenre: 'electronic',
    secondaryGenre: 'rnb',
    subgenres: ['House', 'Contemporary R&B'],
    instruments: ['arpeggiated-plucks', '808-bass', 'analog-lead', 'grand-piano', 'hi-hat-rolls'],
    vocalTypes: ['female', 'belted'],
    vocalEffects: ['autotune', 'reverb-drenched'],
    moods: ['uplifting', 'euphoric', 'dreamy'],
    production: ['wide-stereo', 'hifi-studio', 'heavy-sidechain'],
    bpm: 124,
    timeFeel: 'normal',
    blend: 60,
    structureId: 'standard-pop',
    rhymeScheme: 'ABAB',
    vocalArchetypes: ['power-pop-diva'],
    regionalFlows: [],
  },
];

// Map a genre id to its preferred structure template id
export const GENRE_STRUCTURE_MAP: Record<string, string> = {
  hiphop: 'hiphop',
  rnb: 'neo-soul',
  lofi: 'neo-soul',
  synthwave: 'edm',
  cyberpunk: 'edm',
  electronic: 'edm',
  cinematic: 'cinematic-trailer',
  orchestral: 'cinematic-trailer',
  metal: 'hiphop',
  afrobeat: 'standard-pop',
  latin: 'standard-pop',
  country: 'ballad',
  'yacht-rock': 'standard-pop',
  'mid-east': 'standard-pop',
  'asian-fusion': 'ballad',
};

export function structureIdForGenres(genres: string[]): string {
  if (genres.length === 0) return 'standard-pop';
  const primary = genres[0];
  return GENRE_STRUCTURE_MAP[primary] ?? 'standard-pop';
}

export function blueprintToPreset(bp: GenreBlueprint): Preset {
  return {
    id: bp.id,
    name: bp.name,
    emoji: bp.emoji,
    blurb: bp.blurb,
    genres: bp.secondaryGenre ? [bp.primaryGenre, bp.secondaryGenre] : [bp.primaryGenre],
    subgenres: [...bp.subgenres],
    instruments: [...bp.instruments],
    vocalTypes: [...bp.vocalTypes],
    vocalEffects: [...bp.vocalEffects],
    moods: [...bp.moods],
    production: [...bp.production],
    bpm: bp.bpm,
    timeFeel: bp.timeFeel,
    customInstruments: [],
    blend: bp.blend,
    artistArchetypes: [...bp.vocalArchetypes],
    artistBlend: bp.blend,
  };
}

export const CURATED_PRESETS: Preset[] = [
  {
    id: 'cinematic-dark-rnb',
    name: 'Cinematic Dark R&B',
    emoji: '🌑',
    dynamicPools: {
      keys: ['c-minor', 'a-minor', 'dorian-mode'], bpmRange: [72, 84],
      chords: ['jazz-neo-soul', 'emotional-melancholic'], coreDrums: ['live-drums'],
      harmonicLeads: ['grand-piano', 'fm-pads', 'fender-rhodes'], textures: ['vinyl-crackle', 'chorus-texture'],
      vocals: ['female', 'belted'],
    },
    blurb: 'Noir vocal intimacy, sub-bass weight, and a widescreen emotional arc.',
    genres: ['rnb', 'cinematic'],
    subgenres: ['Contemporary R&B', 'Quiet Storm'],
    instruments: ['grand-piano', 'fm-pads', '808-bass', 'live-drums'],
    vocalTypes: ['female', 'belted'],
    vocalEffects: ['reverb-drenched', 'dry-intimate'],
    moods: ['dark', 'melancholic', 'ethereal'],
    production: ['wide-stereo', 'hifi-studio', 'tape-saturation'],
    negativeTags: ['no-heavy-distortion', 'no-brass', 'no-lofi'],
    musicalKeys: ['c-minor', 'dorian-mode'],
    chordVoicings: ['jazz-neo-soul', 'emotional-melancholic'],
    bpm: 76,
    timeFeel: 'normal',
    customInstruments: [],
    blend: 72,
    artistArchetypes: ['neo-soul-badu'],
    artistBlend: 78,
    lyricTheme: 'A midnight confession after the last text goes unanswered, choosing self-respect over one more apology.',
    lyricStructureId: 'neo-soul',
    lyricRhymeScheme: 'ABAB',
    lyricMetatags: '[Verse 1 | close-mic smoky delivery]\n[Chorus | soaring wounded energy]\n[Outro | whispered ad-libs]',
  },
  {
    id: 'vintage-neo-soul',
    name: 'Vintage Neo-Soul',
    emoji: '🎙️',
    dynamicPools: {
      keys: ['a-minor', 'dorian-mode', 'g-major'], bpmRange: [78, 96],
      chords: ['jazz-neo-soul', 'jazz-voicings', 'extended-chords'], coreDrums: ['live-drums'],
      harmonicLeads: ['grand-piano', 'fm-pads', 'fender-rhodes'], textures: ['vinyl-crackle', 'cassette-hiss'],
      vocals: ['female', 'raspy'],
    },
    blurb: 'Rhodes warmth, pocket drums, and honeyed extended harmony.',
    genres: ['rnb'],
    subgenres: ['Neo-Soul', 'Funk'],
    instruments: ['grand-piano', 'fm-pads', 'live-drums', 'brass-stabs'],
    vocalTypes: ['female', 'raspy'],
    vocalEffects: ['dry-intimate', 'reverb-drenched'],
    moods: ['dreamy', 'nostalgic', 'melancholic'],
    production: ['tape-saturation', 'raw-unpolished', 'hifi-studio'],
    negativeTags: ['no-heavy-distortion', 'no-autotune', 'no-sidechain'],
    musicalKeys: ['a-minor', 'dorian-mode'],
    chordVoicings: ['jazz-neo-soul', 'jazz-voicings'],
    bpm: 92,
    timeFeel: 'normal',
    customInstruments: [],
    blend: 78,
    artistArchetypes: ['neo-soul-badu'],
    artistBlend: 84,
    lyricTheme: 'A slow kitchen dance where old love becomes gratitude instead of grief.',
    lyricStructureId: 'neo-soul',
    lyricRhymeScheme: 'ABAB',
    lyricMetatags: '[Verse 1 | velvet conversational delivery]\n[Chorus | warm stacked harmony]\n[Outro | loose vocal runs and ad-libs]',
  },
  {
    id: 'americana-roots',
    name: 'Americana Roots',
    emoji: '🪕',
    dynamicPools: {
      keys: ['g-major', 'mixolydian-mode', 'a-minor'], bpmRange: [72, 92],
      chords: ['open-voicings', 'vintage-doo-wop', 'twelve-bar-blues'], coreDrums: ['live-drums', 'acoustic-drums'],
      harmonicLeads: ['acoustic-guitar', 'grand-piano'], textures: ['vinyl-crackle', 'cassette-hiss'],
      vocals: ['male', 'raspy'],
    },
    blurb: 'Open-road storytelling, weathered vocals, and resonant acoustic lift.',
    genres: ['country'],
    subgenres: ['Americana', 'Country Folk'],
    instruments: ['acoustic-guitar', 'live-drums', 'grand-piano'],
    vocalTypes: ['male', 'raspy'],
    vocalEffects: ['dry-intimate', 'reverb-drenched'],
    moods: ['nostalgic', 'gritty', 'uplifting'],
    production: ['raw-unpolished', 'tape-saturation', 'wide-stereo'],
    negativeTags: ['no-autotune', 'no-heavy-distortion', 'no-sidechain'],
    musicalKeys: ['g-major', 'mixolydian-mode'],
    chordVoicings: ['open-voicings', 'vintage-doo-wop'],
    bpm: 82,
    timeFeel: 'normal',
    customInstruments: [],
    blend: 76,
    artistArchetypes: ['country-roots-storyteller'],
    artistBlend: 82,
    lyricTheme: 'Leaving a small town at dawn with one last promise folded in the map pocket.',
    lyricStructureId: 'ballad',
    lyricRhymeScheme: 'ABCB',
    lyricMetatags: '[Verse 1 | plainspoken raspy storytelling]\n[Chorus | open-road full-band energy]\n[Outro | sparse acoustic resolve]',
  },
  {
    id: 'chromatic-synthwave',
    name: 'Chromatic Synthwave',
    emoji: '🌆',
    dynamicPools: {
      keys: ['c-minor', 'e-minor', 'lydian-mode'], bpmRange: [112, 132],
      chords: ['arpeggiated-progression', 'pedal-point', 'dark-trap-cadence'], coreDrums: ['808-kick'],
      harmonicLeads: ['analog-lead', 'saw-waves', 'arpeggiated-plucks'], textures: ['moog-bass', 'juno-pads'],
      vocals: ['vocoder', 'female'],
    },
    blurb: 'Chrome-night arpeggios, vocoder color, and a kinetic electronic rise.',
    genres: ['synthwave', 'cyberpunk'],
    subgenres: ['Retrowave', 'Outrun'],
    instruments: ['moog-bass', 'saw-waves', 'analog-lead', 'arpeggiated-plucks', '808-kick'],
    vocalTypes: ['vocoder', 'female'],
    vocalEffects: ['distorted', 'reverb-drenched'],
    moods: ['dark', 'euphoric', 'ominous'],
    production: ['heavy-sidechain', 'wide-stereo', 'glitch-cuts'],
    negativeTags: ['no-brass', 'no-lofi', 'no-harsh-frequencies'],
    musicalKeys: ['c-minor', 'lydian-mode'],
    chordVoicings: ['arpeggiated-progression', 'pedal-point'],
    bpm: 124,
    timeFeel: 'normal',
    customInstruments: [],
    blend: 68,
    artistArchetypes: ['power-pop-diva'],
    artistBlend: 72,
    lyricTheme: 'Driving through a rain-slick megacity while a lost signal turns into a second chance.',
    lyricStructureId: 'edm',
    lyricRhymeScheme: 'AABB',
    lyricMetatags: '[Verse 1 | intimate vocoder pulse]\n[Drop | explosive synth energy]\n[Outro | fading transmission]',
  },
  {
    id: 'late-70s-yacht-rock',
    name: 'Late-70s Yacht Rock',
    emoji: '⛵',
    dynamicPools: {
      keys: ['g-major', 'c-major', 'mixolydian-mode'], bpmRange: [96, 112],
      chords: ['jazz-voicings', 'pop-anthem', 'inversions'], coreDrums: ['live-drums'],
      harmonicLeads: ['fender-rhodes', 'chorused-guitar', 'grand-piano'], textures: ['cassette-hiss', 'chorus-texture'],
      vocals: ['male', 'female'],
    },
    blurb: 'Fender Rhodes glow, chorused guitar, saxophone, and smooth stacked harmonies.',
    category: 'vintage',
    microGenre: 'West Coast Soft Rock / Yacht',
    matchingPills: {
      genres: ['yacht-rock'], instruments: ['fender-rhodes', 'chorused-guitar', 'saxophone', 'live-drums'],
      vocalTypes: ['male', 'female'], vocalEffects: ['reverb-drenched', 'dry-intimate'],
      moods: ['dreamy', 'nostalgic', 'uplifting'], chordVoicings: ['jazz-voicings', 'pop-anthem'],
      negativeTags: ['no-heavy-distortion', 'no-harsh-frequencies'],
    },
    genres: ['yacht-rock'],
    subgenres: ['Yacht Rock', 'West Coast AOR', 'Soft Rock'],
    instruments: ['fender-rhodes', 'chorused-guitar', 'saxophone', 'live-drums'],
    vocalTypes: ['male', 'female'],
    vocalEffects: ['reverb-drenched', 'dry-intimate'],
    moods: ['dreamy', 'nostalgic', 'uplifting'],
    production: ['hifi-studio', 'wide-stereo', 'tape-saturation'],
    negativeTags: ['no-heavy-distortion', 'no-harsh-frequencies', 'no-rnb-vocal-runs', 'no-modern-soul'],
    musicalKeys: ['g-major', 'mixolydian-mode'],
    chordVoicings: ['jazz-voicings', 'pop-anthem'],
    bpm: 104,
    timeFeel: 'normal',
    customInstruments: [],
    blend: 74,
    artistArchetypes: [],
    artistBlend: 70,
    lyricTheme: 'A coastal night drive where an old flame returns as a warm memory instead of a wound.',
    lyricStructureId: 'standard-pop',
    lyricRhymeScheme: 'ABAB',
    lyricMetatags: '[Verse 1 | relaxed conversational delivery]\n[Chorus | smooth stacked harmony energy]\n[Outro | saxophone ad-libs and soft fade]',
  },
  {
    id: '80s-digital-rnb-quiet-storm',
    name: '80s Digital R&B / Quiet Storm',
    emoji: '🌃',
    dynamicPools: {
      keys: ['a-minor', 'c-major', 'dorian-mode'], bpmRange: [80, 94],
      chords: ['jazz-neo-soul', 'emotional-melancholic', 'inversions'], coreDrums: ['linndrum'],
      harmonicLeads: ['yamaha-dx7', 'juno-pads', 'fender-rhodes'], textures: ['cassette-hiss', 'chorus-texture'],
      vocals: ['female', 'belted'],
    },
    blurb: 'Yamaha DX7 keys, LinnDrum pulse, Juno pads, and melismatic soul vocals.',
    category: 'vintage',
    microGenre: 'Quiet Storm / Boogie R&B',
    matchingPills: {
      genres: ['rnb'], instruments: ['yamaha-dx7', 'linndrum', 'juno-pads', 'fender-rhodes'],
      vocalTypes: ['female', 'belted'], vocalEffects: ['reverb-drenched', 'autotune'],
      moods: ['dreamy', 'melancholic', 'ethereal'], chordVoicings: ['jazz-neo-soul', 'emotional-melancholic'],
      negativeTags: ['no-heavy-distortion', 'no-harsh-frequencies', 'no-brass'],
    },
    genres: ['rnb'],
    subgenres: ['Quiet Storm', 'Contemporary R&B'],
    instruments: ['yamaha-dx7', 'linndrum', 'juno-pads', 'fender-rhodes'],
    vocalTypes: ['female', 'belted'],
    vocalEffects: ['reverb-drenched', 'autotune'],
    moods: ['dreamy', 'melancholic', 'ethereal'],
    production: ['wide-stereo', 'hifi-studio', 'tape-saturation'],
    negativeTags: ['no-heavy-distortion', 'no-harsh-frequencies', 'no-brass'],
    musicalKeys: ['a-minor', 'dorian-mode'],
    chordVoicings: ['jazz-neo-soul', 'emotional-melancholic'],
    bpm: 86,
    timeFeel: 'normal',
    customInstruments: [],
    blend: 80,
    artistArchetypes: ['neo-soul-badu'],
    artistBlend: 82,
    lyricTheme: 'A late-night phone call that says everything through pauses, runs, and half-finished promises.',
    lyricStructureId: 'neo-soul',
    lyricRhymeScheme: 'ABAB',
    lyricMetatags: '[Verse 1 | intimate melismatic soul delivery]\n[Chorus | lush sustained harmony energy]\n[Outro | improvised vocal runs over Juno pads]',
  },
  {
    id: 'vintage-chicago-blues',
    name: 'Vintage Chicago Blues',
    emoji: '🎸',
    dynamicPools: {
      keys: ['e-minor', 'a-minor', 'minor-pentatonic'], bpmRange: [78, 98],
      chords: ['twelve-bar-blues', 'walking-bassline'], coreDrums: ['live-drums', 'acoustic-drums'],
      harmonicLeads: ['overdriven-tube-guitar', 'harmonica', 'upright-bass'], textures: ['vinyl-crackle', 'cassette-hiss'],
      vocals: ['male', 'raspy'],
    },
    blurb: '12-bar shuffle, overdriven tube guitar, harmonica, and upright bass.',
    category: 'vintage',
    microGenre: 'Vintage Chicago Blues',
    matchingPills: {
      genres: ['blues'], instruments: ['overdriven-tube-guitar', 'harmonica', 'upright-bass', 'live-drums'],
      vocalTypes: ['male', 'raspy'], vocalEffects: ['dry-intimate', 'reverb-drenched'],
      moods: ['gritty', 'melancholic', 'nostalgic'], chordVoicings: ['twelve-bar-blues', 'walking-bassline'],
      negativeTags: ['no-autotune', 'no-sidechain', 'no-harsh-frequencies'],
    },
    genres: ['blues'],
    subgenres: ['Chicago Blues', 'Electric Blues'],
    instruments: ['overdriven-tube-guitar', 'harmonica', 'upright-bass', 'live-drums'],
    vocalTypes: ['male', 'raspy'],
    vocalEffects: ['dry-intimate', 'reverb-drenched'],
    moods: ['gritty', 'melancholic', 'nostalgic'],
    production: ['raw-unpolished', 'tape-saturation', 'hifi-studio'],
    negativeTags: ['no-autotune', 'no-sidechain', 'no-harsh-frequencies'],
    musicalKeys: ['e-minor', 'minor-pentatonic'],
    chordVoicings: ['twelve-bar-blues', 'walking-bassline'],
    bpm: 88,
    timeFeel: 'normal',
    customInstruments: [],
    blend: 86,
    artistArchetypes: ['country-roots-storyteller'],
    artistBlend: 68,
    lyricTheme: 'A hard-earned story told at the corner bar after the last train leaves town.',
    lyricStructureId: 'standard-pop',
    lyricRhymeScheme: 'AABB',
    lyricMetatags: '[Verse 1 | gritty half-spoken blues delivery]\n[Chorus | call-and-response shuffle energy]\n[Outro | harmonica and overdriven guitar tag]',
  },
  {
    id: 'minneapolis-sound-80s',
    name: 'Minneapolis Sound',
    emoji: '🟣',
    blurb: 'Oberheim OB-Xa synths, LinnDrum pocket, falsetto funk harmonies, punchy slap bass, dry studio mix',
    category: 'vintage',
    microGenre: 'Minneapolis Sound',
    genres: ['rnb'],
    subgenres: ['Minnesota Sound', 'Minneapolis Sound', 'Electro-Funk', 'Boogie / Post-Disco', 'New Wave Funk', 'Synth-Pop Soul'],
    instruments: ['linndrum', 'oberheim-synths', 'slap-bass', 'chorused-guitar'],
    vocalTypes: ['falsetto'],
    vocalEffects: ['reverb-drenched', 'dry-intimate'],
    moods: ['euphoric', 'gritty', 'dreamy'],
    production: ['hifi-studio', 'wide-stereo', 'tape-saturation'],
    negativeTags: ['crowd', 'applause', 'audience', 'cheering', 'screaming'],
    musicalKeys: ['e-minor', 'dorian-mode'],
    chordVoicings: ['jazz-voicings', 'inversions'],
    bpm: 116,
    timeFeel: 'normal',
    customInstruments: [],
    blend: 78,
    artistArchetypes: [],
    artistBlend: 78,
    lyricTheme: 'Oberheim OB-Xa synths, LinnDrum pocket, falsetto funk harmonies, punchy slap bass, dry studio mix',
    lyricStructureId: 'standard-pop',
    lyricRhymeScheme: 'AABB',
    lyricMetatags: '[Verse 1 | intimate falsetto glide]\n[Chorus | ecstatic funk-pop release]\n[Bridge | synth breakdown and guitar shimmer]\n[Outro | stacked falsetto ad-libs]',
    matchingPills: {
      genres: ['rnb'], instruments: ['linndrum', 'oberheim-synths', 'slap-bass', 'chorused-guitar'],
      vocalTypes: ['falsetto'], vocalEffects: ['reverb-drenched', 'dry-intimate'],
      moods: ['euphoric', 'gritty', 'dreamy'], chordVoicings: ['jazz-voicings', 'inversions'],
      negativeTags: ['crowd', 'applause', 'audience', 'cheering', 'screaming'],
    },
  },
];
