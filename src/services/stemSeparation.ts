/** Client for the local AudioPilot Demucs engine (http://127.0.0.1:8000). */

import type { StemPreviewTrack } from '@/components/audio/StemPreviewRow';

export const AUDIOPILOT_ENGINE_URL = 'http://127.0.0.1:8000';

export const ENGINE_OFFLINE_MESSAGE =
  'Local AudioPilot engine offline. Ensure server.py is running on port 8000.';

/** Canonical stem list returned by /api/separate */
export type SeparateStemsResult = {
  trackName: string;
  stems: StemPreviewTrack[];
};

/** Backend may return either the array shape or the legacy dict shape */
interface SeparateStemsResponse {
  success?: boolean;
  status?: string;
  trackName?: string;
  track_id?: string;
  stems?: StemPreviewTrack[] | Record<string, string>;
  urls?: Record<string, string>;
}

const STEM_LABELS: Record<string, string> = {
  vocals: 'Vocals',
  drums: 'Drums',
  bass: 'Bass',
  other: 'Instruments',
};

function mapDictToStems(dict: Record<string, string>): StemPreviewTrack[] {
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

  // Preferred shape: { success, trackName, stems: [{ id, name, audioUrl }] }
  if (Array.isArray(data.stems)) {
    const stems = data.stems
      .filter(
        (s): s is StemPreviewTrack =>
          Boolean(s) &&
          typeof s === 'object' &&
          typeof s.id === 'string' &&
          typeof s.audioUrl === 'string' &&
          s.audioUrl.length > 0
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

  // Legacy shape: { stems|urls: { vocals, drums, bass, other } }
  const dict =
    (data.urls && typeof data.urls === 'object' ? data.urls : null) ||
    (data.stems && typeof data.stems === 'object' ? data.stems : null);

  if (!dict) {
    throw new Error('Stem separation response missing stem URLs');
  }

  const stems = mapDictToStems(dict as Record<string, string>);
  if (stems.length === 0) {
    throw new Error('Stem separation response missing stem URLs');
  }
  return { trackName, stems };
}

export async function separateStems(file: File): Promise<SeparateStemsResult> {
  const form = new FormData();
  form.append('file', file, file.name);

  let response: Response;
  try {
    response = await fetch(`${AUDIOPILOT_ENGINE_URL}/api/separate`, {
      method: 'POST',
      body: form,
    });
  } catch {
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
