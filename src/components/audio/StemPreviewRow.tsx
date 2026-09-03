import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Play, Pause, Download } from 'lucide-react';

export interface StemPreviewTrack {
  id: string;
  name: string;
  audioUrl: string;
}

interface StemPreviewRowProps {
  stem: StemPreviewTrack;
  onDownload?: (stem: StemPreviewTrack) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function StemPreviewRow({ stem, onDownload }: StemPreviewRowProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    audio.pause();
    audio.load();
  }, [stem.audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('durationchange', onLoaded);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('durationchange', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [stem.audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
    }
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(e.target.value);
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-ink-700/60 bg-ink-950/70 px-2.5 py-2 hover:border-neon-amber/40 transition">
      <audio ref={audioRef} src={stem.audioUrl} preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        className="shrink-0 w-8 h-8 rounded-full bg-neon-amber/15 border border-neon-amber/40 text-neon-amber hover:bg-neon-amber/25 hover:border-neon-amber flex items-center justify-center transition"
        title={isPlaying ? `Pause ${stem.name}` : `Play ${stem.name}`}
        aria-label={isPlaying ? `Pause ${stem.name}` : `Play ${stem.name}`}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-ink-100 truncate">{stem.name}</span>
          <span className="text-[9px] font-mono text-ink-400 shrink-0 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          disabled={!duration}
          className="fx-range w-full h-1.5"
          style={{ ['--val' as string]: `${progress}%` }}
          aria-label={`${stem.name} progress`}
        />
      </div>

      {onDownload && (
        <button
          type="button"
          onClick={() => onDownload(stem)}
          className="shrink-0 p-1.5 rounded-md border border-ink-700/60 bg-ink-900/80 text-ink-400 hover:text-neon-amber hover:border-neon-amber/50 transition"
          title={`Download ${stem.name}`}
          aria-label={`Download ${stem.name}`}
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
