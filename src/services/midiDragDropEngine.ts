/**
 * Client for the local AudioPilot engine's optional MIDI relay endpoint
 * (http://127.0.0.1:8000). GPU-based audio stem separation has been fully
 * removed — MIDI transcription now runs entirely client-side, directly on
 * the uploaded audio file/buffer. This module only exists to opportunistically
 * upgrade the "Drag MIDI to DAW" feature from a browser-internal `blob:` URL to a
 * real absolute HTTP URL when the local engine happens to be running.
 */

export const AUDIOPILOT_ENGINE_URL = 'http://127.0.0.1:8000';

export const ENGINE_OFFLINE_MESSAGE =
  'Local AudioPilot engine offline — drag-to-DAW will use an in-browser Blob URL instead.';

/**
 * Uploads a generated MIDI buffer to the local AudioPilot engine so it can be served
 * back over a real absolute HTTP(S) URL (e.g. `http://127.0.0.1:8000/api/download-midi?...`).
 *
 * Chromium's native OS drag-and-drop ("DownloadURL" data type) can be unreliable when the
 * URL is a browser-internal `blob:` URI — some DAWs / native drop targets refuse to resolve
 * it outside the browser process. Serving the same bytes from a real HTTP endpoint sidesteps
 * that entirely. If the local engine is offline or doesn't expose this endpoint, this throws
 * and callers should fall back to a `blob:` object URL instead — the engine is entirely
 * optional and nothing in the MIDI extraction pipeline depends on it being online.
 */
export async function uploadMidiForDragDrop(
  data: Uint8Array,
  fileName: string,
  signal?: AbortSignal
): Promise<string> {
  const form = new FormData();
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' });
  form.append('file', blob, fileName);

  let response: Response;
  try {
    response = await fetch(`${AUDIOPILOT_ENGINE_URL}/api/upload-midi`, {
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
    throw new Error(`MIDI upload failed (${response.status})`);
  }

  const body = (await response.json().catch(() => ({}))) as {
    url?: string;
    file?: string;
    filename?: string;
  };

  if (body.url) {
    return body.url.startsWith('http') ? body.url : `${AUDIOPILOT_ENGINE_URL}${body.url}`;
  }

  const servedFileName = body.file || body.filename || fileName;
  return `${AUDIOPILOT_ENGINE_URL}/api/download-midi?file=${encodeURIComponent(servedFileName)}`;
}
