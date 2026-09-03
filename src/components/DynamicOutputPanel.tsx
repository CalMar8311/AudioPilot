// Dynamic Right-Side Panel: Changes based on active tab

import { OutputPanel } from '@/components/OutputPanel';
import { RemixOutputCard } from '@/components/RemixOutputCard';
import type { PromptEngine } from '@/engine/usePromptEngine';

type Tab = 'style' | 'lyrics' | 'remix' | 'export';

interface DynamicOutputPanelProps {
  eng: PromptEngine;
  activeTab: Tab;
}

export function DynamicOutputPanel({ eng, activeTab }: DynamicOutputPanelProps) {
  // Tab 1: Remix Engine - Show Remix Output with Direction Cards & MIDI Export
  if (activeTab === 'remix') {
    return <RemixOutputCard eng={eng} />;
  }

  // Tab 2, 3, 4: Show Standard Output Panel (Style Prompt & Lyrics)
  return <OutputPanel eng={eng} />;
}
