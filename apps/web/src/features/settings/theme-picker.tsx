import { Check } from 'lucide-react';
import type { Theme } from '@/lib/theme';
import { cn } from '@/lib/utils/cn';
import { setThemeAction } from './theme-actions';

const OPTIONS: Array<{
  value: Theme;
  label: string;
  description: string;
  swatches: [string, string, string];
}> = [
  {
    value: 'amber',
    label: 'Amber Minimal',
    description: 'Warm off-white canvas, white surfaces, amber actions.',
    swatches: ['#faf8f4', '#ffffff', '#d97706'],
  },
  {
    value: 'graphite',
    label: 'Graphite Terminal',
    description: 'Deep graphite canvas, layered dark surfaces, amber highlights.',
    swatches: ['#17191c', '#202328', '#f2a93b'],
  },
];

export function ThemePicker({ current }: { current: Theme }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((option) => {
        const active = current === option.value;
        return (
          <form key={option.value} action={setThemeAction}>
            <input type="hidden" name="theme" value={option.value} />
            <button
              type="submit"
              aria-pressed={active}
              className={cn(
                'flex w-full flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                active
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-surface hover:bg-surface-raised',
              )}
            >
              <span className="flex gap-1.5" aria-hidden="true">
                {option.swatches.map((colour) => (
                  <span
                    key={colour}
                    className="size-6 rounded-md border border-border"
                    style={{ backgroundColor: colour }}
                  />
                ))}
              </span>
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-semibold">{option.label}</span>
                {active ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-ink">
                    <Check className="size-3.5" aria-hidden="true" />
                    Current
                  </span>
                ) : null}
              </span>
              <span className="text-xs leading-relaxed text-muted">{option.description}</span>
            </button>
          </form>
        );
      })}
    </div>
  );
}
