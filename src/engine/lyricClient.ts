// Frontend client for the generate-lyrics edge function.
// Calls the Supabase Edge Function which proxies to OpenAI server-side.
// Falls back to the local generation engine if the edge function is unavailable
// or the OpenAI key isn't configured yet.

import {
  generateLyrics as localGenerate,
  regenerateSection as localRegenerate,
} from '@/engine/lyricEngine';
import type {
  RhymeScheme, Tone, Lang, StructureTemplate,
} from '@/data/lyricBanks';
import { GENRES, INSTRUMENTS, VOCAL_TYPES, MOOD_TAGS } from '@/data/catalogs';
import type { PromptState } from '@/engine/usePromptEngine';
import type { FusedLyricContext } from '@/engine/styleFusion';
import { fusedDeliveryDirectives, fusedLyricContext } from '@/engine/styleFusion';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type GenerateParams = {
  theme: string;
  scheme: RhymeScheme;
  tone: Tone;
  lang: Lang;
  structure: StructureTemplate;
  studioContext: Pick<PromptState, 'genres' | 'instruments' | 'vocalTypes' | 'moods' | 'bpm' | 'blend' | 'artistArchetypes' | 'artistBlend'>;
  vocalArchetypes: string[];
  regionalFlows: string[];
  deliveryDirectives: string[];
  fusedStyle?: FusedLyricContext;
};

export type GenerateResult =
  | { lyrics: string; source: 'openai' }
  | { lyrics: string; source: 'local'; warning?: string };

function labelize(ids: string[], labels: { id: string; label: string }[]): string[] {
  const map = new Map(labels.map(l => [l.id, l.label]));
  return ids.map(id => map.get(id)).filter(Boolean) as string[];
}

function resolveFusion(params: GenerateParams): { fused: FusedLyricContext; directives: string[] } {
  const ids = params.studioContext.artistArchetypes?.length
    ? params.studioContext.artistArchetypes
    : params.vocalArchetypes;
  const fused = params.fusedStyle ?? fusedLyricContext(ids, params.studioContext.artistBlend ?? 70);
  const directives = fusedDeliveryDirectives(ids, params.deliveryDirectives);
  return { fused, directives };
}

export async function generateLyricsViaEdge(params: GenerateParams): Promise<GenerateResult> {
  const { theme, scheme, tone, lang, structure, studioContext } = params;
  const { fused, directives } = resolveFusion(params);

  const genreLabels = studioContext.genres
    .map(id => GENRES.find(g => g.id === id)?.label)
    .filter(Boolean) as string[];
  const instrumentLabels = labelize(studioContext.instruments, INSTRUMENTS);
  const vocalLabels = labelize(studioContext.vocalTypes, VOCAL_TYPES);
  const moodLabels = labelize(studioContext.moods, MOOD_TAGS);

  const endpoint = `${SUPABASE_URL}/functions/v1/generate-lyrics`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        theme,
        scheme,
        tone,
        lang,
        structureName: structure.name,
        structureBlurb: structure.blurb,
        sections: structure.sections.map(s => s.label),
        genres: genreLabels,
        instruments: instrumentLabels,
        vocalTypes: vocalLabels,
        moods: moodLabels,
        bpm: studioContext.bpm,
        blend: studioContext.blend,
        vocalArchetypes: params.vocalArchetypes,
        regionalFlows: params.regionalFlows,
        deliveryDirectives: directives,
        fusedStyle: fused,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (body?.fallback) {
        return localFallback(params, 'OpenAI key not configured — using built-in generator.');
      }
      return localFallback(params, `AI service unavailable — using built-in generator.`);
    }

    const data = await response.json();
    if (typeof data?.lyrics !== "string" || !data.lyrics.trim()) {
      return localFallback(params, 'AI returned empty — using built-in generator.');
    }

    return { lyrics: data.lyrics.trim(), source: 'openai' };
  } catch {
    return localFallback(params, 'AI service unreachable — using built-in generator.');
  }
}

function localFallback(params: GenerateParams, warning?: string): GenerateResult {
  const { directives } = resolveFusion(params);
  const lyrics = localGenerate({
    theme: params.theme,
    scheme: params.scheme,
    tone: params.tone,
    lang: params.lang,
    structure: params.structure,
    vocalArchetypes: params.vocalArchetypes,
    regionalFlows: params.regionalFlows,
    deliveryDirectives: directives,
  });
  return { lyrics, source: 'local', warning };
}

export function regenerateSectionLocal(
  fullLyrics: string,
  sectionLabel: string,
  params: GenerateParams,
): string {
  const { directives } = resolveFusion(params);
  return localRegenerate(fullLyrics, sectionLabel, {
    theme: params.theme,
    scheme: params.scheme,
    tone: params.tone,
    lang: params.lang,
    structure: params.structure,
    vocalArchetypes: params.vocalArchetypes,
    regionalFlows: params.regionalFlows,
    deliveryDirectives: directives,
  });
}
