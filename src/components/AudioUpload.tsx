import { AudioUploadRemixSection } from '@/components/sections/AudioUploadRemixSection';
import type { PromptEngine } from '@/engine/usePromptEngine';

export function AudioUpload({ eng, onJumpToLyrics }: { eng: PromptEngine; onJumpToLyrics?: () => void }) {
  return <AudioUploadRemixSection eng={eng} onJumpToLyrics={onJumpToLyrics} />;
}

export default AudioUpload;
