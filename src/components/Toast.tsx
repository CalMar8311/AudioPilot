// Toast notification

import { CheckCircle2 } from 'lucide-react';

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 toast">
      <div className="glass rounded-xl px-4 py-3 flex items-center gap-2 shadow-glow">
        <CheckCircle2 className="w-4 h-4 text-neon-lime" />
        <span className="text-sm text-ink-100">{message}</span>
      </div>
    </div>
  );
}
