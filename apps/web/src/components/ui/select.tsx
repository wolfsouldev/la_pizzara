// shadcn/ui Select (Radix), adapted to the permanent La Pizzara theme.
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, children, onPointerDown, onKeyDown, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return <SelectPrimitive.Trigger data-slot="select-trigger" className={cn(
    'flex min-h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm font-normal text-foreground shadow-xs outline-none transition-colors hover:border-input hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=open]:border-ring data-[state=open]:bg-accent/40 [&>span]:min-w-0 [&>span]:truncate max-md:min-h-11 max-md:text-base', className,
  )} {...props} onPointerDown={event => {
    // Chromium delivers pointerdown even when a surrounding fieldset disables
    // the button. Prevent Radix opening its portal before native click is blocked.
    if (event.currentTarget.matches(':disabled')) event.preventDefault();
    else onPointerDown?.(event);
  }} onKeyDown={event => {
    if (event.currentTarget.matches(':disabled')) event.preventDefault();
    else onKeyDown?.(event);
  }}>{children}<SelectPrimitive.Icon asChild><ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180"/></SelectPrimitive.Icon></SelectPrimitive.Trigger>;
}

export function SelectContent({ className, children, position = 'popper', ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return <SelectPrimitive.Portal><SelectPrimitive.Content data-slot="select-content" position={position} sideOffset={6} collisionPadding={12} className={cn(
    'relative z-[80] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl shadow-black/35 data-[state=open]:animate-[select-enter_120ms_ease-out] origin-[var(--radix-select-content-transform-origin)]', className,
  )} {...props}>
    <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center bg-popover text-muted-foreground"><ChevronUp className="size-4" aria-hidden="true"/></SelectPrimitive.ScrollUpButton>
    <SelectPrimitive.Viewport className="p-1.5">{children}</SelectPrimitive.Viewport>
    <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center bg-popover text-muted-foreground"><ChevronDown className="size-4" aria-hidden="true"/></SelectPrimitive.ScrollDownButton>
  </SelectPrimitive.Content></SelectPrimitive.Portal>;
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return <SelectPrimitive.Item data-slot="select-item" className={cn('relative flex min-h-9 w-full cursor-pointer items-center rounded-md py-2 pr-9 pl-3 text-sm font-normal outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-40 max-md:min-h-11', className)} {...props}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText><span className="absolute right-3 flex size-4 items-center justify-center"><SelectPrimitive.ItemIndicator><Check className="size-4" aria-hidden="true"/></SelectPrimitive.ItemIndicator></span>
  </SelectPrimitive.Item>;
}

export function SelectGroup({ label, children, ...props }: ComponentProps<typeof SelectPrimitive.Group> & { label: string }) {
  return <SelectPrimitive.Group {...props}><SelectPrimitive.Label className="px-3 pt-3 pb-1.5 text-xs font-medium text-muted-foreground">{label}</SelectPrimitive.Label>{children}</SelectPrimitive.Group>;
}
