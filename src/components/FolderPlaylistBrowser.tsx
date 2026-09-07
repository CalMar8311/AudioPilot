// Folder-based playlist browser powered by the File System Access API.
// Lets users pick a local music folder once, then search, preview, and step through
// every .mp3 / .wav track sequentially without re-opening the folder picker.

import { useEffect, useRef, useState } from 'react';
import { FolderOpen, ListMusic, Search, SkipBack, SkipForward, PlayCircle, ArrowRightCircle } from 'lucide-react';

interface PlaylistEntry {
  name: string;
  handle: FileSystemFileHandle;
}

interface FolderPlaylistBrowserProps {
  /** Optional hook to hand the currently-loaded track off to an external analyzer/staging flow. */
  onSendToAnalyzer?: (file: File) => void;
  /** Optional toast/notification callback for status & error messages. */
  onShowToast?: (message: string) => void;
}

const isSupportedAudioName = (name: string) => /\.(mp3|wav)$/i.test(name);

export function FolderPlaylistBrowser({ onSendToAnalyzer, onShowToast }: FolderPlaylistBrowserProps) {
  const [folderName, setFolderName] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const isFileSystemAccessSupported =
    typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

  // Instant search — filters the loaded playlist by name. Next/Previous navigation and the
  // rendered track list both traverse this filtered view, not the full unfiltered playlist.
  const filteredPlaylist = playlist.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Revoke the active object URL whenever it changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (currentTrackUrl) URL.revokeObjectURL(currentTrackUrl);
    };
  }, [currentTrackUrl]);

  // Autoplay the newly-loaded track in the previewer (best-effort; browsers may
  // block autoplay without a preceding user gesture, which is fine — the native
  // controls remain available).
  useEffect(() => {
    if (currentTrackUrl && audioRef.current) {
      audioRef.current.load();
      void audioRef.current.play().catch(() => {
        // Autoplay was blocked — user can press play manually via native controls.
      });
    }
  }, [currentTrackUrl]);

  // Keep the highlighted/active row in sync with the filtered view whenever the search
  // query changes, without interrupting playback of the currently loaded track.
  useEffect(() => {
    if (!currentFile) return;
    const idx = filteredPlaylist.findIndex((item) => item.name === currentFile.name);
    setCurrentIndex(idx);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (message: string) => onShowToast?.(message);

  const loadTrackAtIndex = async (index: number, entries: PlaylistEntry[] = filteredPlaylist) => {
    const entry = entries[index];
    if (!entry) return;

    setIsLoadingTrack(true);
    try {
      const file = await entry.handle.getFile();
      setCurrentTrackUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return URL.createObjectURL(file);
      });
      setCurrentFile(file);
      setCurrentIndex(index);
    } catch {
      notify(`Could not load "${entry.name}" — it may have been moved, renamed, or deleted.`);
    } finally {
      setIsLoadingTrack(false);
    }
  };

  const handleSelectFolder = async () => {
    if (!isFileSystemAccessSupported) {
      notify('Folder browsing needs the File System Access API — please use Chrome or Edge.');
      return;
    }

    setIsLoadingFolder(true);
    try {
      const dirHandle = await window.showDirectoryPicker();
      const entries: PlaylistEntry[] = [];

      for await (const handle of dirHandle.values()) {
        if (handle.kind === 'file' && isSupportedAudioName(handle.name)) {
          entries.push({ name: handle.name, handle });
        }
      }

      entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      setFolderName(dirHandle.name);
      setPlaylist(entries);
      setSearchQuery('');
      setCurrentIndex(-1);
      setCurrentFile(null);
      setCurrentTrackUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return null;
      });

      if (entries.length === 0) {
        notify(`No .mp3 or .wav files found in "${dirHandle.name}".`);
      } else {
        notify(`Loaded ${entries.length} track${entries.length === 1 ? '' : 's'} from "${dirHandle.name}".`);
      }
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        notify('Could not open that folder — permission was denied or the browser blocked access.');
      }
    } finally {
      setIsLoadingFolder(false);
    }
  };

  const handleSelectTrack = (index: number) => {
    void loadTrackAtIndex(index);
  };

  const handleNext = () => {
    if (filteredPlaylist.length === 0) return;
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % filteredPlaylist.length;
    void loadTrackAtIndex(nextIndex);
  };

  const handlePrevious = () => {
    if (filteredPlaylist.length === 0) return;
    const prevIndex =
      currentIndex < 0 ? filteredPlaylist.length - 1 : (currentIndex - 1 + filteredPlaylist.length) % filteredPlaylist.length;
    void loadTrackAtIndex(prevIndex);
  };

  // Auto-advance to the next track once the current one finishes playing.
  const handleTrackEnded = () => {
    if (filteredPlaylist.length > 1) handleNext();
  };

  const handleSendToAnalyzer = () => {
    if (!currentFile) return;
    onSendToAnalyzer?.(currentFile);
  };

  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-950/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[10px] uppercase tracking-widest text-ink-400 font-semibold flex items-center gap-1.5">
          <ListMusic className="w-3.5 h-3.5 text-neon-cyan" />
          Folder Playlist Browser
        </p>
        <button
          type="button"
          onClick={() => { void handleSelectFolder(); }}
          disabled={isLoadingFolder}
          className="btn btn-ghost !py-1 !px-2.5 !text-xs border border-ink-700/60 hover:border-neon-cyan/60 text-ink-200 hover:text-neon-cyan flex items-center gap-1.5 transition disabled:opacity-60"
          title="Pick a local folder to browse its .mp3 / .wav tracks"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          {isLoadingFolder ? 'Opening…' : folderName ? 'Change Folder' : 'Select Music Folder'}
        </button>
      </div>

      {!isFileSystemAccessSupported && (
        <p className="text-[10px] text-neon-amber/90">
          Your browser doesn&apos;t support the File System Access API. Try Chrome or Edge to browse folders.
        </p>
      )}

      {folderName && (
        <p className="text-[10px] text-ink-400 truncate">
          Folder: <span className="text-ink-200 font-semibold">{folderName}</span> · {playlist.length} track
          {playlist.length === 1 ? '' : 's'}
        </p>
      )}

      {playlist.length > 0 && (
        <>
          {/* Instant search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks in this folder…"
              className="w-full bg-ink-950/70 border border-ink-800/70 rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-neon-cyan/60 transition"
              aria-label="Search tracks in this folder"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 hover:text-neon-rose transition text-[11px] leading-none"
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Scrollable, filtered track list */}
          {filteredPlaylist.length === 0 ? (
            <p className="text-[10px] text-ink-500 italic text-center py-3">
              No tracks match &quot;{searchQuery}&quot;.
            </p>
          ) : (
            <div className="max-h-44 overflow-y-auto rounded-lg border border-ink-800/70 bg-ink-950/60 divide-y divide-ink-800/50">
              {filteredPlaylist.map((entry, idx) => (
                <button
                  key={`${entry.name}-${idx}`}
                  type="button"
                  onClick={() => handleSelectTrack(idx)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[11px] transition ${
                    idx === currentIndex
                      ? 'bg-neon-cyan/15 text-neon-cyan'
                      : 'text-ink-300 hover:bg-ink-800/50 hover:text-ink-100'
                  }`}
                  title={entry.name}
                >
                  {idx === currentIndex ? (
                    <PlayCircle className="w-3.5 h-3.5 shrink-0 text-neon-cyan" />
                  ) : (
                    <span className="w-3.5 h-3.5 shrink-0 text-center text-[9px] text-ink-500 numeric">{idx + 1}</span>
                  )}
                  <span className="truncate">{entry.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Transport controls: Previous / Next (traverse the filtered list) + native audio previewer */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={filteredPlaylist.length === 0 || isLoadingTrack}
              className="btn btn-ghost !py-1.5 !px-2.5 !text-xs border border-ink-700/60 hover:border-neon-cyan/60 text-ink-200 hover:text-neon-cyan flex items-center gap-1 transition disabled:opacity-50"
              title="Previous track"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={filteredPlaylist.length === 0 || isLoadingTrack}
              className="btn btn-ghost !py-1.5 !px-2.5 !text-xs border border-ink-700/60 hover:border-neon-cyan/60 text-ink-200 hover:text-neon-cyan flex items-center gap-1 transition disabled:opacity-50"
              title="Next track"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {onSendToAnalyzer && currentFile && (
              <button
                type="button"
                onClick={handleSendToAnalyzer}
                className="btn btn-primary !py-1.5 !px-2.5 !text-xs flex items-center gap-1.5 ml-auto"
                title="Send this track to the analyzer for audition & analysis"
              >
                <ArrowRightCircle className="w-3.5 h-3.5" />
                Use This Track
              </button>
            )}
          </div>

          {currentTrackUrl && (
            <div className="space-y-1">
              <p className="text-[10px] text-ink-400 truncate">
                Now previewing: <span className="text-ink-100 font-semibold">{currentFile?.name}</span>
              </p>
              <audio
                ref={audioRef}
                controls
                src={currentTrackUrl}
                onEnded={handleTrackEnded}
                className="w-full h-9"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
