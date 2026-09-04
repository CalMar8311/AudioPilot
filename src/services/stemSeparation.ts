/** Client for the local AudioPilot Demucs engine (http://127.0.0.1:8000). */

export const AUDIOPILOT_ENGINE_URL = 'http://127.0.0.1:8000';

export const ENGINE_OFFLINE_MESSAGE =
  'Local AudioPilot engine offline. Ensure server.py is running on port 8000.';

export type StemTrack = {
  id: string;
  name: string;
  audioUrl: string;
};

/** Canonical result from /api/separate */
export type SeparateStemsResult = {
  trackName: string;
  stems: StemTrack[];
};

/** Backend may return either the array shape or the legacy dict shape */
interface SeparateStemsResponse {
  success?: boolean;
  status?: string;
  trackName?: string;
  track_id?: string;
  stems?: StemTrack[] | Record<string, string>;
  urls?: Record<string, string>;
}

const STEM_LABELS: Record<string, string> = {
  vocals: 'Vocals',
  drums: 'Drums',
  bass: 'Bass',
  other: 'Instruments',
};

/** Persist successful separations across Strict Mode remounts */
const stemCache = new Map<string, StemTrack[]>();
const stemInflight = new Map<string, Promise<SeparateStemsResult>>();

export function fileKeyForAudio(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function getCachedStems(fileKey: string): StemTrack[] | null {
  return stemCache.get(fileKey) ?? null;
}

function mapDictToStems(dict: Record<string, string>): StemTrack[] {
  const order = ['vocals', 'drums', 'bass', 'other'];
  const fromOrder = order
    .filter((id) => typeof dict[id] === 'string' && dict[id])
    .map((id) => ({
      id,
      name: STEM_LABELS[id] ?? id,
      audioUrl: dict[id],
    }));

  if (fromOrder.length > 0) return fromOrder;

  return Object.entries(dict)
    .filter(([, url]) => typeof url === 'string' && url)
    .map(([id, audioUrl]) => ({
      id,
      name: STEM_LABELS[id] ?? id,
      audioUrl,
    }));
}

function normalizeStemsPayload(data: SeparateStemsResponse): SeparateStemsResult {
  const trackName = data.trackName || data.track_id || 'track';

  if (Array.isArray(data.stems)) {
    const stems = data.stems
      .filter(
        (s): s is StemTrack =>
          Boolean(s) &&
          typeof s === 'object' &&
          typeof (s as StemTrack).id === 'string' &&
          typeof (s as StemTrack).audioUrl === 'string' &&
          (s as StemTrack).audioUrl.length > 0
      )
      .map((s) => ({
        id: s.id,
        name: s.name || STEM_LABELS[s.id] || s.id,
        audioUrl: s.audioUrl,
      }));

    if (stems.length === 0) {
      throw new Error('Stem separation response missing stem URLs');
    }
    return { trackName, stems };
  }

  const dict =
    (data.urls && typeof data.urls === 'object' ? data.urls : null) ||
    (data.stems && typeof data.stems === 'object' ? (data.stems as Record<string, string>) : null);

  if (!dict) {
    throw new Error('Stem separation response missing stem URLs');
  }

  const stems = mapDictToStems(dict);
  if (stems.length === 0) {
    throw new Error('Stem separation response missing stem URLs');
  }
  return { trackName, stems };
}

export async function separateStems(
  file: File,
  signal?: AbortSignal
): Promise<SeparateStemsResult> {
  const form = new FormData();
  form.append('file', file, file.name);

  let response: Response;
  try {
    response = await fetch(`${AUDIOPILOT_ENGINE_URL}/api/separate`, {
      method: 'POST',
      body: form,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new Error(ENGINE_OFFLINE_MESSAGE);
  }

  if (!response.ok) {
    let detail = `Stem separation failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(detail);
  }

  const data = (await response.json()) as SeparateStemsResponse;
  return normalizeStemsPayload(data);
}

/**
 * Deduped separation: reuses cache / in-flight promise for the same file key
 * so React Strict Mode double-mount does not leave the UI stuck waiting on a
 * discarded request while a second Demucs job is still queued.
 */
export async function separateStemsForFile(
  file: File,
  signal?: AbortSignal
): Promise<SeparateStemsResult> {
  const key = fileKeyForAudio(file);
  const cached = stemCache.get(key);
  if (cached && cached.length > 0) {
    return { trackName: key, stems: cached };
  }

  const existing = stemInflight.get(key);
  if (existing) {
    return existing;
  }

  const promise = separateStems(file, signal)
    .then((result) => {
      stemCache.set(key, result.stems);
      stemInflight.delete(key);
      return result;
    })
    .catch((err) => {
      stemInflight.delete(key);
      throw err;
    });

  stemInflight.set(key, promise);
  return promise;
}
