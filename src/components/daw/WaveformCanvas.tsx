// WaveformCanvas — decodes an audio File into peak buckets and renders a
// colored bar waveform on <canvas>, with a synced playback scrubber line and
// click-to-seek. Used by every track row in the Wingman dual-deck workspace.

import { useEffect, useRef, useState, type MouseEvent } from 'react';

interface WaveformCanvasProps {
  audioFile: File | null;
  /** Hex accent color for the waveform bars, e.g. "#a855f7". */
  accentColor: string;
  /** Current playback position in seconds, drives the scrubber line. */
  progressSec: number;
  /** Total duration in seconds used to map progressSec → x position. */
  totalDurationSec: number;
  heightPx?: number;
  /** Dims the waveform to indicate a muted / non-soloed track. */
  dimmed?: boolean;
  onSeek?: (sec: number) => void;
  /** Fires once per decoded file with the actual buffer duration (seconds). */
  onDuration?: (durationSec: number) => void;
  /** Number of subtle vertical bar-grid divisions drawn behind the waveform (DAW channel-strip look). Default 8. */
  gridDivisions?: number;
}

const BUCKET_COUNT = 300;

export function WaveformCanvas({
  audioFile,
  accentColor,
  progressSec,
  totalDurationSec,
  heightPx = 56,
  dimmed = false,
  onSeek,
  onDuration,
  gridDivisions = 8,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  // ── Decode audio → peak buckets (min/max amplitude per bucket) ───────────
  useEffect(() => {
    let cancelled = false;
    if (!audioFile) { setPeaks(null); return; }

    setIsDecoding(true);
    (async () => {
      try {
        const arrayBuffer = await audioFile.arrayBuffer();
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        let buffer: AudioBuffer;
        try {
          buffer = await ctx.decodeAudioData(arrayBuffer);
        } finally {
          await ctx.close();
        }
        if (cancelled) return;
        onDuration?.(buffer.duration);

        const channel = buffer.getChannelData(0);
        const bucketSize = Math.max(1, Math.floor(channel.length / BUCKET_COUNT));
        const result = new Float32Array(BUCKET_COUNT);
        for (let b = 0; b < BUCKET_COUNT; b++) {
          const start = b * bucketSize;
          const end = Math.min(channel.length, start + bucketSize);
          let max = 0;
          for (let i = start; i < end; i++) {
            const v = Math.abs(channel[i]);
            if (v > max) max = v;
          }
          result[b] = max;
        }
        if (!cancelled) setPeaks(result);
      } catch {
        if (!cancelled) setPeaks(null);
      } finally {
        if (!cancelled) setIsDecoding(false);
      }
    })();

    return () => { cancelled = true; };
  }, [audioFile]);

  // ── Draw ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = container.clientWidth || 480;
    const cssH = heightPx;

    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    // Background
    ctx.fillStyle = '#0b0d11';
    ctx.fillRect(0, 0, cssW, cssH);

    // Subtle bar-grid divisions — gives empty channels a "ready to record" look
    if (gridDivisions > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 1; i < gridDivisions; i++) {
        const gx = Math.round((cssW / gridDivisions) * i) + 0.5;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, cssH);
        ctx.stroke();
      }
    }

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cssH / 2);
    ctx.lineTo(cssW, cssH / 2);
    ctx.stroke();

    if (peaks && peaks.length > 0) {
      const barWidth = cssW / peaks.length;
      const opacity = dimmed ? 0.28 : 0.85;
      ctx.fillStyle = hexToRgba(accentColor, opacity);
      for (let i = 0; i < peaks.length; i++) {
        const amp = Math.max(0.02, peaks[i]);
        const barH = amp * (cssH * 0.9);
        const x = i * barWidth;
        const y = (cssH - barH) / 2;
        ctx.fillRect(x, y, Math.max(1, barWidth - 0.6), barH);
      }
    } else {
      // Placeholder flat-line while decoding / no file
      ctx.strokeStyle = dimmed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(0, cssH / 2);
      ctx.lineTo(cssW, cssH / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Scrubber line
    if (totalDurationSec > 0 && progressSec >= 0) {
      const x = Math.min(cssW, (progressSec / totalDurationSec) * cssW);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(x, 0, 1.5, cssH);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x - 2, 0, 5, cssH);
    }

    ctx.restore();
  }, [peaks, accentColor, progressSec, totalDurationSec, heightPx, dimmed, gridDivisions]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onSeek || totalDurationSec <= 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * totalDurationSec);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative w-full rounded-lg overflow-hidden border border-ink-800/60 ${onSeek ? 'cursor-pointer' : ''}`}
      style={{ height: heightPx }}
    >
      <canvas ref={canvasRef} className="block" style={{ imageRendering: 'pixelated' }} />
      {isDecoding && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-950/40">
          <span className="text-[9px] text-ink-500 font-mono animate-pulse">decoding waveform…</span>
        </div>
      )}
      {!audioFile && !isDecoding && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] text-ink-600 italic">No audio loaded</span>
        </div>
      )}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
