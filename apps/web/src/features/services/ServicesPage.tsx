import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Search, Server, ShieldCheck } from 'lucide-react';
import { serviceStatuses, serviceStatusLabels, type UniversityService } from '@uni/shared';
import { api } from '@/lib/api-client';
import { ListState, Notice, Pager } from '@/components/common/data-view';
import { SelectInput, SelectOption } from '@/components/common/select-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { ServiceCard } from './ServiceCard';
import { ServiceForm } from './ServiceForm';
import { ServiceDetail } from './ServiceDetail';
import { useServices } from './services';
export function ServicesPage({ admin = false }: { admin?: boolean }) {
  const [params, setParams] = useSearchParams(); const [search, setSearch] = useState(params.get('search') ?? '');
  const status = serviceStatuses.find(s => s === params.get('status'));
  const publication = params.get('publication') === 'archived' ? 'archived' : params.get('publication') === 'all' ? 'all' : 'active';
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1)); const selected = params.get('service');
  const [editor, setEditor] = useState<UniversityService | 'new' | null>(null); const client = useQueryClient();
  const query = useServices({ page, limit: 12, search: params.get('search') ?? '', status, ...(admin ? { publication } : {}) }, admin);
  function filter(key: string, value: string) { setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); next.delete('page'); return next; }, { replace: true }); }
  useEffect(() => { setSearch(params.get('search') ?? ''); }, [params]);
  useEffect(() => { if (search === (params.get('search') ?? '')) return; const timer = setTimeout(() => filter('search', search), 250); return () => clearTimeout(timer); }, [search, params]);
  const archive = useMutation({ mutationFn: (s: UniversityService) => api(`/admin/services/${s.id}`, { method: 'PATCH', body: { isActive: !s.isActive } }), onSuccess: () => void client.invalidateQueries({ queryKey: ['services'] }) });
  const openService = (id: string | null) => setParams(previous => { const next = new URLSearchParams(previous); if (id) next.set('service', id); else next.delete('service'); return next; });
  return <section className="space-y-4 sm:space-y-5">
    <header className="mx-auto max-w-2xl text-center">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Estado de los servicios</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Consulta los avisos y el estado informado por administración.</p>
    </header>

    <div className="mx-auto flex w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-card p-2.5 sm:p-3" role="search" aria-label="Filtros del catálogo">
      <div className="relative min-w-0 basis-full md:flex-1 md:basis-56">
        <label htmlFor="services-search" className="sr-only">Buscar en el catálogo</label>
        <Search size={16} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" aria-hidden="true"/>
        <Input id="services-search" type="search" maxLength={200} className="pl-9" placeholder="Buscar servicio…" value={search} onChange={e => setSearch(e.target.value)}/>
      </div>
      <div className="min-w-0 flex-1 basis-40 md:max-w-52">
        <label htmlFor="services-status" className="sr-only">Filtrar por estado</label>
        <SelectInput id="services-status" value={status ?? ''} onValueChange={v => filter('status', v)}>
          <SelectOption value="">Todos los estados</SelectOption>
          {serviceStatuses.map(s => <SelectOption key={s} value={s}>{serviceStatusLabels[s]}</SelectOption>)}
        </SelectInput>
      </div>
      {admin && <div className="min-w-0 flex-1 basis-36 md:max-w-44">
        <label htmlFor="services-publication" className="sr-only">Publicación</label>
        <SelectInput id="services-publication" value={publication} onValueChange={v => filter('publication', v)}><SelectOption value="active">En el catálogo</SelectOption><SelectOption value="archived">Archivados</SelectOption><SelectOption value="all">Todos</SelectOption></SelectInput>
      </div>}
      <div className="flex shrink-0 items-center justify-center gap-2">
        <Button variant="outline" size="icon" disabled={query.isFetching} onClick={() => void query.refetch()} aria-label="Actualizar servicios"><RefreshCw className={query.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden="true"/></Button>
        {admin && <Button onClick={() => setEditor('new')}><Plus size={16} aria-hidden="true"/>Nuevo servicio</Button>}
      </div>
    </div>

    <Notice error={archive.error}/>
    <ListState pending={query.isPending} error={query.error} empty={false} retry={() => void query.refetch()}/>
    {query.data && <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p role="status" aria-live="polite">{query.data.meta.total} servicios {admin && publication === 'archived' ? 'archivados' : 'encontrados'}</p>
        <p className="inline-flex items-center gap-1.5"><ShieldCheck size={13} aria-hidden="true"/>Estados manuales · no sondeo automático</p>
      </div>
      {query.data.data.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <Server size={30} className="mx-auto text-muted-foreground" aria-hidden="true"/>
        <h2 className="mt-4 font-medium">{search || status ? 'No encontramos esos servicios' : 'El catálogo está por comenzar'}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{search || status ? 'Prueba otro nombre o estado para ampliar la búsqueda.' : admin ? 'Añade el primer servicio y publica su información. No se crean servicios de ejemplo automáticamente.' : 'Administración todavía no ha publicado servicios para consultar.'}</p>
        {(search || status) && <Button className="mt-4" variant="outline" onClick={() => { setSearch(''); setParams({}); }}>Limpiar filtros</Button>}
      </div> : <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {query.data.data.map(s => <ServiceCard key={s.id} service={s} admin={admin} archivePending={archive.isPending} onOpen={() => openService(s.id)} onEdit={() => setEditor(s)} onArchive={() => {
          if (confirm(`${s.isActive ? '¿Archivar' : '¿Restaurar'} ${s.name}? ${s.isActive ? 'Sus vínculos con tickets se conservarán.' : 'Volverá a ser visible en el catálogo.'}`)) archive.mutate(s);
        }}/>) }
      </div>}
      <Pager meta={query.data.meta} onPage={p => setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(p)); return next; })}/>
    </>}
    <Dialog open={editor !== null} onOpenChange={open => { if (!open) setEditor(null); }} title={editor === 'new' ? 'Nuevo servicio' : 'Editar servicio'} description="La descripción y el estado serán visibles para toda la comunidad autenticada.">{editor && <ServiceForm key={editor === 'new' ? 'new' : editor.id} service={editor === 'new' ? undefined : editor} onSaved={() => setEditor(null)}/>}</Dialog>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) openService(null); }} title="Información del servicio" description={admin ? 'Gestiona las comunicaciones y las notas privadas de administración.' : 'Estado informado y comunicaciones publicadas por administración.'}>{selected && <ServiceDetail key={`${admin}:${selected}`} id={selected} admin={admin}/>}</Dialog>
  </section>;
}
