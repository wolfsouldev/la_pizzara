import { SelectInput, SelectOption } from '@/components/common/select-input';
import type { PageMeta } from '@uni/shared';
import { LoaderCircle, Inbox, ChevronLeft, ChevronRight, CircleAlert, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

export function Notice({ error, success }: { error?: Error | null; success?: string | false }) {
  return <>{error && <p role="alert" className="my-4 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>{error.message}</p>}{!error && success && <p role="status" className="my-4 flex items-start gap-2 rounded-lg border border-success/25 bg-success/10 p-3 text-sm text-success"><CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>{success}</p>}</>;
}
export function ListState({ pending, error, empty, retry }: { pending: boolean; error: Error | null; empty: boolean; retry: () => void }) {
  if (pending) return <p role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true"/>Cargando…</p>;
  if (error) return <div className="p-4"><Notice error={error}/><Button variant="outline" onClick={retry}>Reintentar</Button></div>;
  if (empty) return <div className="flex flex-col items-center gap-3 px-6 py-12 text-center"><span className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted"><Inbox className="size-5 text-muted-foreground" aria-hidden="true"/></span><p className="text-sm text-muted-foreground">No hay resultados para estos filtros.</p></div>;
  return null;
}
export function Pager({ meta, onPage }: { meta?: PageMeta; onPage: (page: number) => void }) {
  if (!meta) return null;
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs"><span className="tabular-nums text-muted-foreground">{meta.total} resultados · Página {meta.page} de {Math.max(1, meta.totalPages)}</span><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft aria-hidden="true"/>Anterior</Button><Button type="button" size="sm" variant="outline" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>Siguiente<ChevronRight aria-hidden="true"/></Button></div></div>;
}
export function Filters({ search, active, onSearch, onActive, children }: { search: string; active: string; onSearch: (v: string) => void; onActive: (v: string) => void; children?: ReactNode }) {
  return <div className="my-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label>Buscar<input type="search" maxLength={200} placeholder="Nombre o identificador…" value={search} onChange={e => onSearch(e.target.value)}/></label><label>Activación<SelectInput value={active} onValueChange={selectedValue => onActive(selectedValue)}><SelectOption value="">Todos</SelectOption><SelectOption value="true">Activos</SelectOption><SelectOption value="false">Inactivos</SelectOption></SelectInput></label>{children}</div>;
}
export function Status({ active }: { active: boolean }) { return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs ${active ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}><span className="size-1.5 rounded-full bg-current" aria-hidden="true"/>{active ? 'Activo' : 'Inactivo'}</span>; }
export function Heading({ title, description, children }: { title: string; description: string; children?: ReactNode }) { return <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-6"><div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{children && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{children}</div>}</header>; }
export const tableClass = 'w-full text-left text-sm [&_thead]:bg-muted/60 [&_th]:whitespace-nowrap [&_th]:px-5 [&_th]:py-3.5 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:px-5 [&_td]:py-4 [&_td]:tabular-nums [&_tbody_tr]:border-t [&_tbody_tr]:border-border [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-accent/35';
