/** Client for the local AudioPilot Demucs engine (http://127.0.0.1:8000). */

export const AUDIOPILOT_ENGINE_URL = 'http://127.0.0.1:8000';

export const ENGINE_OFFLINE_MESSAGE =
  'Local AudioPilot engine offline. Ensure server.py is running on port 8000.';

export interface SeparatedStemUrls {
  vocals: string;
  drums: string;
  bass: string;
  other: string;
}

export interface SeparateStemsResponse {
  status: string;
  track_id: string;
  model: string;
  stems?: SeparatedStemUrls;
  urls?: SeparatedStemUrls;
}

export async function separateStems(file: File): Promise<SeparatedStemUrls> {
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
  const urls = data.urls ?? data.stems;
  if (!urls?.vocals || !urls?.drums || !urls?.bass || !urls?.other) {
    throw new Error('Stem separation response missing stem URLs');
  }
  return urls;
}
