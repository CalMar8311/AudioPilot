// Shared UI primitives for AudioCopilot

import type { ReactNode } from 'react';
import { Search, Dice5 } from 'lucide-react';

export function DiceButton({ onClick, title, color = 'cyan' }: { onClick: () => void; title?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'hover:text-neon-cyan hover:border-neon-cyan/50',
    magenta: 'hover:text-neon-magenta hover:border-neon-magenta/50',
    amber: 'hover:text-neon-amber hover:border-neon-amber/50',
    lime: 'hover:text-neon-lime hover:border-neon-lime/50',
    blue: 'hover:text-neon-blue hover:border-neon-blue/50',
    rose: 'hover:text-neon-rose hover:border-neon-rose/50',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? 'Randomize this section'}
      className={
        'inline-flex items-center justify-center w-7 h-7 rounded-lg border border-ink-700/60 bg-ink-850/60 text-ink-400 transition-all active:scale-90 ' +
        (colorMap[color] ?? colorMap.cyan)
      }
    >
      <Dice5 className="w-3.5 h-3.5" />
    </button>
  );
}

export function SectionCard({
  title,
  icon,
  accent = 'cyan',
  children,
  right,
}: {
  title: string;
  icon?: ReactNode;
  accent?: 'cyan' | 'magenta' | 'amber' | 'lime' | 'blue' | 'rose';
  children: ReactNode;
  right?: ReactNode;
}) {
  const colorMap: Record<string, string> = {
    cyan: 'from-neon-cyan to-neon-blue',
    magenta: 'from-neon-magenta to-neon-rose',
    amber: 'from-neon-amber to-neon-rose',
    lime: 'from-neon-lime to-neon-cyan',
    blue: 'from-neon-blue to-neon-cyan',
    rose: 'from-neon-rose to-neon-magenta',
  };
  return (
    <section className="glass rounded-2xl p-5 animate-slideIn">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`sec-bar h-5 bg-gradient-to-b ${colorMap[accent]}`} />
          <h3 className="text-sm font-semibold tracking-wide text-ink-100 flex items-center gap-2">
            {icon && <span className="text-ink-300">{icon}</span>}
            {title}
          </h3>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Tag({
  label,
  active,
  onClick,
  variant = 'default',
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'amber' | 'magenta';
}) {
  const cls = active
    ? variant === 'amber' ? 'tag tag-amber' : variant === 'magenta' ? 'tag tag-magenta' : 'tag tag-active'
    : 'tag';
  return (
    <button type="button" className={cls} onClick={onClick}>
      {label}
    </button>
  );
}

export function SearchInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-ink-850/60 border border-ink-700/60 rounded-lg pl-9 pr-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-neon-cyan/60 focus:ring-1 focus:ring-neon-cyan/30 transition"
      />
    </div>
  );
}

export function RangeRow({
  label, value, min, max, suffix, onChange,
}: {
  label: string;
  value: number | '';
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const pct = value === '' ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-ink-300">{label}</span>
        <span className="numeric text-sm text-neon-cyan font-semibold">{value}{suffix}</span>
      </div>
      <input
        type="range"
        className="fx-range w-full"
        min={min}
        max={max}
        value={value}
        style={{ ['--val' as string]: `${pct}%` }}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-ink-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
