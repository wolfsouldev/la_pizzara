import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { universityServiceSchema } from '@uni/shared';
import { useServices } from './services';
import { api } from '@/lib/api-client';
import { SelectInput, SelectOption } from '@/components/common/select-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/common/data-view';
export function ServicePicker({ value, onChange, disabled, id }: { value: string | null; onChange: (id: string | null) => void; disabled?: boolean; id?: string }) {
  const generatedId = useId(); const searchId = `${generatedId}-search`;
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const query = useServices({ page, limit: 20, search: debounced });
  const selected = useQuery({ queryKey: ['services', 'public', 'detail', value], enabled: !!value, queryFn: async () => universityServiceSchema.parse((await api<unknown>(`/services/${value}`)).data) });
  return <div className="space-y-2"><label htmlFor={searchId} className="text-xs text-muted-foreground">Buscar servicio por nombre</label><Input id={searchId} type="search" maxLength={200} value={search} disabled={disabled} placeholder="Busca en el catálogo…" onChange={e => { setSearch(e.target.value); setPage(1); }}/>
    <SelectInput id={id} aria-label="Servicio relacionado" disabled={disabled || query.isPending || !!query.error} value={value ?? ''} onValueChange={v => onChange(v || null)}><SelectOption value="">Sin servicio relacionado</SelectOption>{value && !query.data?.data.some(s => s.id === value) && <SelectOption value={value}>{selected.data?.name ?? 'Servicio seleccionado (revisar disponibilidad)'}</SelectOption>}{query.data?.data.map(s => <SelectOption key={s.id} value={s.id}>{s.name}</SelectOption>)}</SelectInput>
    {query.data && (query.data.meta.totalPages > 1 || page > 1) && <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><Button type="button" variant="ghost" size="sm" disabled={disabled || page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>{page} / {Math.max(page, query.data.meta.totalPages)}</span><Button type="button" variant="ghost" size="sm" disabled={disabled || page >= query.data.meta.totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button></div>}
    {query.isPending && <p role="status" className="text-xs text-muted-foreground">Cargando catálogo…</p>}{query.data?.meta.total === 0 && <p className="text-xs text-muted-foreground">No hay servicios disponibles con esa búsqueda.</p>}<Notice error={query.error}/>{query.error && <Button variant="outline" type="button" size="sm" onClick={() => void query.refetch()}>Reintentar catálogo</Button>}
  </div>;
}
