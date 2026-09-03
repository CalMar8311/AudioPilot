// Style blending helpers — weighted merge of genres + artist archetypes
// into compiled prompt fragments and lyric-engine context.

import { GENRES } from '@/data/catalogs';
import {
  findVocalArchetype,
  VOCAL_ARCHETYPES,
  type RhymeScheme,
  type VocalArchetype,
} from '@/data/lyricBanks';

export const MAX_BLEND_SLOTS = 3;

export type BlendPart<T> = {
  item: T;
  weight: number;
  role: 'primary' | 'accent';
};

export type FusedLyricContext = {
  enabled: boolean;
  cadence: string;
  rhymeMeter: string;
  suggestedRhyme: RhymeScheme | null;
  performanceTags: string[];
  parts: Array<{
    weight: number;
    role: 'primary' | 'accent';
    descriptors: string[];
    cadence: string;
    rhymeMeter: string;
    performanceTags: string[];
    bpmHint: string;
  }>;
};

/** Primary takes `primaryPct`; remaining mass is split 60/40 across two accents. */
export function blendWeights(count: number, primaryPct: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [100];
  const p = Math.max(20, Math.min(80, Math.round(primaryPct)));
  if (count === 2) return [p, 100 - p];
  const rest = 100 - p;
  const second = Math.round(rest * 0.6);
  const third = rest - second;
  return [p, second, third];
}

export function resolveArchetypes(ids: string[]): VocalArchetype[] {
  return ids
    .map(findVocalArchetype)
    .filter((a): a is VocalArchetype => Boolean(a));
}

export function weightedArchetypes(
  ids: string[],
  primaryPct: number,
): BlendPart<VocalArchetype>[] {
  const items = resolveArchetypes(ids).slice(0, MAX_BLEND_SLOTS);
  const weights = blendWeights(items.length, primaryPct);
  return items.map((item, i) => ({
    item,
    weight: weights[i] ?? 0,
    role: i === 0 ? 'primary' : 'accent',
  }));
}

export function compileArtistBlendPrompt(ids: string[], primaryPct: number): string {
  const parts = weightedArchetypes(ids, primaryPct);
  if (!parts.length) return '';

  const descriptorChunks = parts.map(p => {
    const tags = p.item.promptTags.join(', ');
    return parts.length === 1 ? tags : `${tags} (${p.weight}%)`;
  });

  const cues = unique(parts.flatMap(p => p.item.performanceTags));
  const bpmBits = parts.map(p => {
    const range = `${p.item.bpmMin}–${p.item.bpmMax} BPM`;
    return parts.length === 1
      ? `BPM pocket ${range}`
      : `${range} ${p.role} (${p.weight}%)`;
  });

  const chunks = [
    `artist timbre: ${descriptorChunks.join('; ')}`,
    `vocal cues: ${cues.join(', ')}`,
    `BPM suggestion: ${bpmBits.join(', ')}`,
  ];
  return chunks.join(', ');
}

export function compileGenreBlendPrompt(genreIds: string[], primaryPct: number): string {
  const ids = genreIds.slice(0, MAX_BLEND_SLOTS);
  const labels = ids
    .map(id => GENRES.find(g => g.id === id)?.label)
    .filter(Boolean) as string[];
  if (!labels.length) return '';
  if (labels.length === 1) return labels[0];
  const weights = blendWeights(labels.length, primaryPct);
  return labels.map((label, i) => `${label} (${weights[i]}%)`).join(', ');
}

export function fusedLyricContext(ids: string[], primaryPct: number): FusedLyricContext {
  const parts = weightedArchetypes(ids, primaryPct);
  if (!parts.length) {
    return {
      enabled: false,
      cadence: '',
      rhymeMeter: '',
      suggestedRhyme: null,
      performanceTags: [],
      parts: [],
    };
  }

  const cadence = parts
    .map(p => `${p.weight}% ${p.item.cadence}`)
    .join(' blended with ');
  const rhymeMeter = parts
    .map(p => `${p.weight}% ${p.item.rhymeMeter}`)
    .join('; ');
  const performanceTags = unique(parts.flatMap(p => p.item.performanceTags));

  return {
    enabled: parts.length > 1,
    cadence,
    rhymeMeter,
    suggestedRhyme: parts[0].item.suggestedRhyme,
    performanceTags,
    parts: parts.map(p => ({
      weight: p.weight,
      role: p.role,
      descriptors: p.item.promptTags,
      cadence: p.item.cadence,
      rhymeMeter: p.item.rhymeMeter,
      performanceTags: p.item.performanceTags,
      bpmHint: `${p.item.bpmTypical} BPM (${p.item.bpmMin}–${p.item.bpmMax})`,
    })),
  };
}

export function fusedDeliveryDirectives(ids: string[], extra: string[]): string[] {
  const fromArch = unique(resolveArchetypes(ids).flatMap(a => a.performanceTags));
  return unique([...fromArch, ...extra]);
}

export function relatedFlowLabels(ids: string[]): string[] {
  return unique(
    resolveArchetypes(ids)
      .map(a => a.relatedFlowId)
      .filter((x): x is string => Boolean(x)),
  );
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
