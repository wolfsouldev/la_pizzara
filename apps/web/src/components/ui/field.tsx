import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Field({ id, label, error, hint, children, className }: {
  id: string; label: string; error?: string; hint?: string; children: ReactNode; className?: string;
}) {
  return <div className={cn('space-y-2', className)} data-invalid={!!error}>
    <label htmlFor={id}>{label}</label>
    {children}
    {hint && <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
