import { Moon, Sun } from 'lucide-react';
import { setThemeAction } from '@/features/settings/theme-actions';
import { cn } from '@/lib/utils/cn';
import type { Theme } from '@/lib/theme';

const OPTIONS = [
  { value: 'amber' as const, label: 'Amber Minimal', Icon: Sun },
  { value: 'graphite' as const, label: 'Graphite Terminal', Icon: Moon },
];

export function ThemeToggle({ current }: { current: Theme }) {
  return (
    <div
      role="group"
      aria-label="Interface theme"
      className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <form key={value} action={setThemeAction}>
            <input type="hidden" name="theme" value={value} />
            <button
              type="submit"
              aria-pressed={active}
              title={label}
              className={cn(
                'grid size-8 place-items-center rounded-full transition-colors',
                active
                  ? 'bg-surface-raised text-primary'
                  : 'text-muted hover:bg-surface-raised hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </button>
          </form>
        );
      })}
    </div>
  );
}
