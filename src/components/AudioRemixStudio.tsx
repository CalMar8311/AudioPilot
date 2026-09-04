// Tab 1: Audio Remix Studio — 2-Column Fixed Layout (Left: Controls, Right: Output Panel)

import { AudioUploadRemixSection } from '@/components/sections/AudioUploadRemixSection';
import { RemixOutputCard } from '@/components/RemixOutputCard';
import type { PromptEngine } from '@/engine/usePromptEngine';

interface AudioRemixStudioProps {
  eng: PromptEngine;
  onJumpToLyrics?: () => void;
}

export function AudioRemixStudio({ eng, onJumpToLyrics }: AudioRemixStudioProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Left Column: Sub-tabs + content live inside AudioUploadRemixSection */}
      <div className="lg:col-span-8 space-y-5 min-w-0 relative z-10">
        <AudioUploadRemixSection
          eng={eng}
          onJumpToLyrics={onJumpToLyrics}
        />
      </div>

      {/* Right Column: Remix Output Card (Sticky) */}
      <div className="lg:col-span-4 space-y-4 sticky top-6 min-w-0 relative z-10">
        <RemixOutputCard eng={eng} />
      </div>
    </div>
  );
}
