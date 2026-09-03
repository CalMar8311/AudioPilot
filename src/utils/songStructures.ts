// Genre-Specific Song Structure Templates for Realistic Suno Metatag Arrangements

export interface SongStructure {
  genre: string;
  tags: string[];
  description: string;
}

export const GENRE_STRUCTURES: Record<string, SongStructure> = {
  // Electronic / Dance / EDM
  'Electronic': {
    genre: 'Electronic',
    tags: ['[Cold Open]', '[Synth Build-Up]', '[Drop]', '[Mid-Section Breakdown]', '[Second Drop]', '[Sudden End]'],
    description: 'Classic EDM structure with build-ups and drops'
  },
  'Cyberpunk': {
    genre: 'Cyberpunk',
    tags: ['[Dystopian Intro]', '[Neon Build]', '[Bass Drop]', '[Glitch Break]', '[Final Drop]', '[System Shutdown]'],
    description: 'Futuristic cyberpunk arrangement with glitch elements'
  },
  'Darksynth': {
    genre: 'Darksynth',
    tags: ['[Dark Ambient Intro]', '[Synth Wave Build]', '[Heavy Drop]', '[Atmospheric Break]', '[Climactic Drop]', '[Fade to Black]'],
    description: 'Dark synthwave structure with atmospheric breaks'
  },
  'House': {
    genre: 'House',
    tags: ['[4/4 Kick Intro]', '[Groove Build]', '[Main Drop]', '[Filter Sweep]', '[Final Drop]', '[Beat Fade Out]'],
    description: 'Four-on-the-floor house music structure'
  },
  'Techno': {
    genre: 'Techno',
    tags: ['[Minimal Intro]', '[Percussion Build]', '[Drop]', '[Hypnotic Loop]', '[Peak Drop]', '[Gradual Fade]'],
    description: 'Hypnotic techno arrangement with minimal intro'
  },
  'Dubstep': {
    genre: 'Dubstep',
    tags: ['[Intro]', '[Wobble Build-Up]', '[Bass Drop]', '[Half-Time Break]', '[Second Drop]', '[Outro]'],
    description: 'Dubstep structure with signature wobble bass'
  },
  'Drum and Bass': {
    genre: 'Drum and Bass',
    tags: ['[Ambient Intro]', '[Breakbeat Build]', '[Drop]', '[Reese Bass Section]', '[Final Drop]', '[Rollout]'],
    description: 'Fast-paced drum and bass arrangement'
  },

  // Metal / Rock / Industrial
  'Metal': {
    genre: 'Metal',
    tags: ['[Heavy Riff Intro]', '[Aggressive Verse]', '[Pre-Chorus]', '[Crushing Chorus]', '[Breakdown]', '[Guitar Solo]', '[Outro Crash]'],
    description: 'Classic metal structure with breakdown and solo'
  },
  'Industrial': {
    genre: 'Industrial',
    tags: ['[Machine Noise Intro]', '[Harsh Verse]', '[Industrial Chorus]', '[Noise Break]', '[Final Assault]', '[Mechanical Outro]'],
    description: 'Industrial metal with mechanical elements'
  },
  'Djent': {
    genre: 'Djent',
    tags: ['[Palm-Mute Intro]', '[Syncopated Verse]', '[Polyrhythmic Pre-Chorus]', '[Massive Chorus]', '[Djent Breakdown]', '[Technical Solo]', '[Heavy Outro]'],
    description: 'Progressive djent with polyrhythmic sections'
  },
  'Punk': {
    genre: 'Punk',
    tags: ['[Immediate Fast Verse]', '[Explosive Chorus]', '[Verse 2]', '[Chorus]', '[Quick Outro]'],
    description: 'Fast, raw punk rock structure'
  },

  // Hip-Hop / Trap / Urban
  'Trap': {
    genre: 'Trap',
    tags: ['[Chorus/Hook]', '[Verse 1]', '[Bridge]', '[Chorus/Hook]', '[Verse 2]', '[Outro 808 Fade]'],
    description: 'Modern trap structure starting with the hook'
  },
  'Hip-Hop': {
    genre: 'Hip-Hop',
    tags: ['[Intro Beat]', '[Verse 1]', '[Hook]', '[Verse 2]', '[Hook]', '[Verse 3]', '[Outro]'],
    description: 'Classic hip-hop three-verse structure'
  },

  // Afrobeat / World
  'Afrobeat': {
    genre: 'Afrobeat',
    tags: ['[Percussion Groove]', '[Vocal Intro]', '[Verse 1]', '[Catchy Chorus]', '[Log Drum Break]', '[Bridge]', '[Outro Groove]'],
    description: 'Afrobeat with percussion and log drum breaks'
  },
  'Amapiano': {
    genre: 'Amapiano',
    tags: ['[Piano Intro]', '[Log Drum Groove]', '[Verse]', '[Catchy Hook]', '[Percussive Break]', '[Piano Outro]'],
    description: 'South African amapiano structure'
  },

  // R&B / Soul
  'RnB': {
    genre: 'RnB',
    tags: ['[Smooth Intro]', '[Verse 1]', '[Pre-Chorus]', '[Sultry Chorus]', '[Verse 2]', '[Ad-Lib Bridge]', '[Extended Chorus]', '[Fade Out]'],
    description: 'Contemporary R&B with ad-libs and extended chorus'
  },
  'Neo-Soul': {
    genre: 'Neo-Soul',
    tags: ['[Keys Intro]', '[Verse 1]', '[Soulful Pre-Chorus]', '[Chorus]', '[Verse 2]', '[Improvised Bridge]', '[Chorus]', '[Outro]'],
    description: 'Neo-soul with improvised sections'
  },

  // Acoustic / Folk
  'Acoustic': {
    genre: 'Acoustic',
    tags: ['[Acoustic Chords]', '[Verse 1]', '[Pre-Chorus]', '[Chorus]', '[Verse 2]', '[Bridge]', '[Final Chorus]', '[Gentle Outro]'],
    description: 'Acoustic singer-songwriter structure'
  },

  // Pop
  'Pop': {
    genre: 'Pop',
    tags: ['[Intro]', '[Verse 1]', '[Pre-Chorus]', '[Chorus]', '[Verse 2]', '[Pre-Chorus]', '[Chorus]', '[Bridge]', '[Final Chorus]', '[Outro]'],
    description: 'Standard pop song structure'
  },

  // Cinematic
  'Cinematic': {
    genre: 'Cinematic',
    tags: ['[Atmospheric Swell]', '[Slow Build]', '[Main Theme]', '[Emotional Peak]', '[Heroic Climax]', '[Resolution]', '[Sub-Bass Drone Outro]'],
    description: 'Epic cinematic arrangement'
  },
  'Orchestral': {
    genre: 'Orchestral',
    tags: ['[Overture]', '[Exposition]', '[Development]', '[Recapitulation]', '[Coda]'],
    description: 'Classical orchestral form'
  },

  // Default fallback
  'Default': {
    genre: 'Default',
    tags: ['[Intro]', '[Verse 1]', '[Chorus]', '[Verse 2]', '[Chorus]', '[Bridge]', '[Final Chorus]', '[Outro]'],
    description: 'Standard song structure'
  }
};

// Utility functions
export function getGenreStructure(genre: string): string[] {
  const normalized = genre.trim();
  if (GENRE_STRUCTURES[normalized]) return GENRE_STRUCTURES[normalized].tags;
  
  const matched = Object.keys(GENRE_STRUCTURES).find(
    key => key.toLowerCase().includes(normalized.toLowerCase()) ||
           normalized.toLowerCase().includes(key.toLowerCase())
  );
  
  return matched ? GENRE_STRUCTURES[matched].tags : GENRE_STRUCTURES['Default'].tags;
}

export function generateLyricsTemplate(genre: string): string {
  const tags = getGenreStructure(genre);
  return tags.map(tag => `${tag}\n\n`).join('');
}