import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'border border-border bg-surface text-foreground hover:bg-surface-raised',
  ghost: 'text-foreground hover:bg-surface-raised',
  danger: 'bg-error text-white hover:bg-error/90',
};

const SIZES: Record<Size, string> = {
  md: 'h-11 px-4 text-sm',
  sm: 'h-9 px-3 text-xs',
};

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'submit',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}
