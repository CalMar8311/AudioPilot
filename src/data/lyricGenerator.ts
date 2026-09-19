export interface LyricTemplateOptions {
  theme: string;
  archetype?: string;
  mood?: string;
  structure?: 'pop' | 'hiphop' | 'ballad';
}

export const BANNED_CLICHES = [
  'neon',
  'city lights',
  'late night',
  'midnight drive',
  'echoes',
  'shadows',
  'whispers',
  'velvet',
  'silhouetted',
  'dance floor',
  'tapestry',
  'horizon',
  'symphony',
  'ignite',
] as const;

export const CRITICAL_LYRIC_INSTRUCTION = [
  'CRITICAL LYRIC INSTRUCTION: NEVER USE THE FOLLOWING WORDS OR TIRED CLICHES:',
  '- neon, city lights, late night, midnight drive',
  '- echoes, shadows, whispers, velvet, silhouetted',
  '- dance floor, tapestry, horizon, symphony',
  'Write with natural, grounded, conversational phrasing typical of Billboard-charting Rap and R&B records. Avoid poetry/theater language.',
  'Require tangible modern details: phones on DND, flight confirmations, bank apps, apartment lobbies, car consoles, specific timestamps (e.g. 4:18 AM).',
  'Use modern cadence markers and ad-libs: (yeah), (look), (uh), [Vocal switch: strained melodic rap].',
].join('\n');

export const GROUNDED_LYRIC_INSTRUCTIONS = [
  CRITICAL_LYRIC_INSTRUCTION,
  'Use grounded contemporary Rap and R&B imagery: receipts, unread messages, court dates, lobbies, consoles, wire alerts, DND, and ordinary rooms.',
  'Prefer conversational phrasing that sounds like a person talking on a record right now.',
  `Strictly ban these cliches and their close variants: ${BANNED_CLICHES.join(', ')}.`,
  'Before returning lyrics, scan every line and replace any banned cliche with a concrete modern detail.',
].join(' ');

export function normalizeLyricMood(mood?: string): string {
  if (!mood) return 'emotional';
  const lower = mood.toLowerCase();
  if (lower.includes('dark')) return 'dark';
  if (lower.includes('uplift') || lower.includes('euphoric')) return 'uplifting';
  if (lower.includes('dream') || lower.includes('ethereal')) return 'dreamy';
  if (lower.includes('nostalg') || lower.includes('melanch')) return 'nostalgic';
  if (lower.includes('grit') || lower.includes('aggressive')) return 'gritty';
  return lower.replace(/[^a-z\s-]/g, '').trim() || 'emotional';
}

export function normalizeArchetype(archetype?: string): string {
  if (!archetype) return 'clean';
  const clean = archetype.toLowerCase().replace(/[^a-z\s-]/g, '').trim();
  if (clean.includes('badu') || clean.includes('neo')) return 'neo-soul';
  if (clean.includes('rap') || clean.includes('flow')) return 'tight rap cadence';
  if (clean.includes('belt') || clean.includes('power')) return 'belted';
  return clean || 'clean';
}

export function buildSectionMetatag(params: {
  sectionLabel: string;
  kind: string;
  mood?: string;
  archetype?: string;
  structure?: 'pop' | 'hiphop' | 'ballad';
  extra?: string[];
}): string {
  const mood = normalizeLyricMood(params.mood);
  const archetype = normalizeArchetype(params.archetype);
  const extras = (params.extra ?? []).filter(Boolean);
  const base = (() => {
    switch (params.kind) {
      case 'Intro':
        return `[Intro | atmospheric ${mood} tone${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
      case 'Verse':
        return `[Verse ${params.sectionLabel.replace(/^[^\d]*/, '') || '1'} | intimate close-mic delivery | ${archetype} | light fingerpicking${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
      case 'Pre-Chorus':
        return `[Pre-Chorus | building energy | rising snare fill | vocal crescendo${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
      case 'Chorus':
        return `[Chorus | anthemic explosive belt | stacked harmonies | 808 sub drops${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
      case 'Bridge':
        return `[Bridge | stripped back acoustic | emotional vocal break${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
      case 'Guitar Solo':
        return `[Guitar Solo | blues overdrive | expressive lead phrasing${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
      case 'Instrumental Solo':
        return `[Instrumental Solo | textured breakdown | ${mood} ambience${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
      case 'Outro':
        return `[Outro | slow atmospheric fade | whispered ad-libs | reverb tail${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
      case 'Drop':
        return `[Drop | full-band peak energy | sub-heavy impact | tight syncopation${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
      case 'Build-up':
        return `[Build-up | rising anticipation | tension swell | layered drums${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
      case 'Breakdown':
        return `[Breakdown | stripped back pulse | breathy textures | restrained low-end${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
      default:
        return `[${params.sectionLabel} | ${mood} ${archetype} tone${extras.length ? ` | ${extras.join(' | ')}` : ''}]`;
    }
  })();

  return base;
}

export function formatSunoLyrics(lyricsData: {
  intro?: string;
  verse1: string[];
  chorus: string[];
  verse2?: string[];
  bridge?: string[];
  outro?: string;
}, options: LyricTemplateOptions): string {
  const { mood = 'emotional', archetype = 'clean' } = options;

  return [
    `[Intro | atmospheric ${normalizeLyricMood(mood)} tone]`,
    lyricsData.intro || '',
    '',
    `[Verse 1 | ${normalizeArchetype(archetype)} | intimate delivery]`,
    ...lyricsData.verse1,
    '',
    `[Chorus | soaring anthemic energy | stacked vocal harmonies]`,
    ...lyricsData.chorus,
    '',
    lyricsData.verse2 ? `[Verse 2 | dynamic rhythm | ${normalizeArchetype(archetype)}]\n${lyricsData.verse2.join('\n')}\n` : '',
    `[Chorus | full band peak energy]\n${lyricsData.chorus.join('\n')}`,
    '',
    lyricsData.bridge ? `[Bridge | stripped back | emotional vocal break]\n${lyricsData.bridge.join('\n')}\n` : '',
    `[Outro | atmospheric fadeout | ad-libs]`,
    lyricsData.outro || '(Fading out...)'
  ].filter(Boolean).join('\n');
}
