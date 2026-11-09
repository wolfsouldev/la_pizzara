import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pageSchema, publicTicketCommentSchema, staffCommentSchema, staffCommentCreateSchema, type PageMeta, type StaffCommentCreate } from '@uni/shared';
import { ArrowDown, Check, ChevronUp, Globe, LoaderCircle, LockKeyhole, MessageCircle, RefreshCw, Send, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/common/data-view';
import { api, ApiError } from '@/lib/api-client';
import { useSession } from '@/features/auth/auth';
import { useNotificationStatus } from '@/features/notifications/notifications';
import { dateTime } from './tickets';

type Message = { id: string; body: string; createdAt: number; author: { id: string; displayName: string }; internal: boolean; isRequester: boolean };
type ChatPage = { data: Message[]; meta: PageMeta };

export function TicketChat({ ticketId, staff = false, requesterId, canReply, closed }: { ticketId: string; staff?: boolean; requesterId?: string; canReply: boolean; closed: boolean }) {
  const id = useId();
  const session = useSession();
  const client = useQueryClient();
  const connection = useNotificationStatus();
  const scope = staff ? 'staff' : 'public';
  const endpoint = `${staff ? '/staff' : ''}/tickets/${ticketId}/comments`;
  const form = useForm<StaffCommentCreate>({ resolver: zodResolver(staffCommentCreateSchema), defaultValues: { body: '', visibility: 'PUBLIC' } });
  const query = useInfiniteQuery({
    queryKey: ['ticket-chat', scope, ticketId, session.data?.id],
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<ChatPage> => {
      const response = await api<unknown>(`${endpoint}?page=${pageParam}&limit=20`);
      if (staff) {
        const result = pageSchema(staffCommentSchema).parse(response);
        return { ...result, data: result.data.map(comment => ({ ...comment, internal: comment.visibility === 'INTERNAL', isRequester: comment.author.id === requesterId })) };
      }
      const result = pageSchema(publicTicketCommentSchema).parse(response);
      return { ...result, data: result.data.map(comment => ({ ...comment, internal: false, isRequester: comment.author.isRequester })) };
    },
    getNextPageParam: last => last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: !!session.data?.id,
    refetchInterval: 30000,
    retry: (attempt, error) => !(error instanceof ApiError && [401, 403, 404].includes(error.status)) && attempt < 2,
  });
  const viewport = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const latest = useRef<string | undefined>(undefined);
  const anchor = useRef<{ height: number; top: number; pages: number } | null>(null);
  const [unseen, setUnseen] = useState(false);
  const messages = [...new Map(query.data?.pages.flatMap(page => page.data.map(message => [message.id, message] as const)) ?? []).values()].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const newestId = messages.at(-1)?.id;
  const oldestId = messages[0]?.id;
  const pages = query.data?.pages.length ?? 0;
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    if (anchor.current && pages > anchor.current.pages) {
      element.scrollTop = anchor.current.top + element.scrollHeight - anchor.current.height;
      anchor.current = null;
    } else if (newestId !== latest.current) {
      if (atBottom.current) element.scrollTop = element.scrollHeight;
      else setUnseen(true);
    }
    latest.current = newestId;
  }, [newestId, oldestId, pages, messages.length]);
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['ticket-chat'] });
    void client.invalidateQueries({ queryKey: ['tickets'] });
    void client.invalidateQueries({ queryKey: ['staff'] });
  };
  const send = useMutation({
    mutationFn: async (input: StaffCommentCreate) => {
      const response = await api<unknown>(endpoint, { method: 'POST', body: staff ? input : { body: input.body } });
      return staff ? staffCommentSchema.parse(response.data) : publicTicketCommentSchema.parse(response.data);
    },
    onSuccess: (_message, input) => { form.reset({ body: '', visibility: input.visibility }); atBottom.current = true; setUnseen(false); refresh(); },
    onError: refresh,
  });
  const inaccessible = query.error instanceof ApiError && [401, 403, 404].includes(query.error.status);
  const internal = staff && form.watch('visibility') === 'INTERNAL';
  const body = form.watch('body');
  const online = connection.status === 'connected' && !query.error;
  const jumpToLatest = () => { if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight; atBottom.current = true; setUnseen(false); };
  const loadOlder = () => {
    if (query.isFetching || !query.hasNextPage) return;
    const element = viewport.current;
    if (element) anchor.current = { height: element.scrollHeight, top: element.scrollTop, pages };
    void query.fetchNextPage().then(result => { if (result.isError) anchor.current = null; });
  };
  return <article className="overflow-hidden rounded-xl border border-border bg-card" aria-labelledby={`${id}-heading`}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
      <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageCircle className="size-4" aria-hidden="true"/></span><div><h2 id={`${id}-heading`} className="text-sm font-semibold">Chat de la solicitud</h2><p className="mt-0.5 text-xs text-muted-foreground">{staff ? 'Respuestas al solicitante y notas privadas' : 'Habla con el equipo de atención'} · Historial guardado</p></div></div>
      <div className="flex items-center gap-2"><span role="status" className={`inline-flex items-center gap-1.5 text-xs ${online ? 'text-success' : 'text-muted-foreground'}`}>{online ? <span className="size-1.5 rounded-full bg-success" aria-hidden="true"/> : <WifiOff className="size-3" aria-hidden="true"/>}{online ? 'En vivo' : 'Sin conexión en vivo'}</span>{!online && <Button type="button" size="icon" variant="ghost" aria-label="Reconectar chat" onClick={() => { connection.retry(); void query.refetch(); }}><RefreshCw aria-hidden="true"/></Button>}</div>
    </header>
    {inaccessible ? <div className="p-5"><Notice error={query.error}/></div> : <>
      <p role="status" className="sr-only">{query.data ? `Conversación actualizada: ${query.data.pages[0]?.meta.total ?? 0} mensajes guardados.` : ''}</p>
      <div className="relative">
        <div ref={viewport} role="region" aria-label="Historial de mensajes" tabIndex={0} className="h-[min(28rem,60dvh)] min-h-64 overflow-y-auto overscroll-contain bg-background/40 px-4 py-5 max-md:h-[min(22rem,42dvh)] sm:px-5" onScroll={event => { const element = event.currentTarget; atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 70; if (atBottom.current) setUnseen(false); }}>
          {query.hasNextPage && <div className="mb-5 flex justify-center"><Button type="button" size="sm" variant="outline" disabled={query.isFetching} onClick={loadOlder}>{query.isFetchingNextPage ? <LoaderCircle className="animate-spin" aria-hidden="true"/> : <ChevronUp aria-hidden="true"/>}Cargar mensajes anteriores</Button></div>}
          {query.isPending && <p role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true"/>Cargando conversación…</p>}
          {!query.isPending && !query.error && !messages.length && <div className="flex h-full flex-col items-center justify-center gap-3 text-center"><MessageCircle className="size-7 text-muted-foreground" aria-hidden="true"/><h3 className="text-sm font-medium">La conversación empieza aquí</h3><p className="max-w-xs text-xs leading-5 text-muted-foreground">Comparte dudas o información sobre esta solicitud. Las respuestas quedarán guardadas en su historial.</p></div>}
          <ol className="space-y-4">{messages.map((message, index) => {
            const own = message.author.id === session.data?.id;
            const date = new Date(message.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
            const previousDate = index > 0 ? new Date(messages[index - 1]!.createdAt).toDateString() : null;
            return <li key={message.id} data-message-id={message.id}>
              {(index === 0 || previousDate !== new Date(message.createdAt).toDateString()) && <p className="mb-4 flex items-center gap-3 text-center text-[11px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">{date}</p>}
              <div className={`flex ${message.internal ? 'justify-center' : own ? 'justify-end' : 'justify-start'}`}><div className={`min-w-0 max-w-[92%] rounded-xl border px-3.5 py-3 sm:max-w-[85%] ${message.internal ? 'w-full border-warning/25 bg-warning/5' : own ? 'rounded-br-sm border-primary/20 bg-primary/10' : 'rounded-bl-sm border-border bg-card'}`}>
                <p className={`mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium ${message.internal ? 'text-warning' : own ? 'text-primary' : 'text-foreground'}`}>{message.internal && <LockKeyhole className="size-3" aria-hidden="true"/>}{message.author.displayName}{own && <span className="font-normal text-muted-foreground">(tú)</span>}<span className="font-normal text-muted-foreground">{message.internal ? 'Nota interna · No visible al solicitante' : message.isRequester ? 'Solicitante' : 'Atención'}</span></p>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{message.body}</p><div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground"><time dateTime={new Date(message.createdAt).toISOString()} title={dateTime(message.createdAt)}>{new Date(message.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</time>{own && <Check className="size-3" aria-label="Guardado"/>}</div>
              </div></div>
            </li>;
          })}</ol>
        </div>
        {unseen && <div className="absolute right-4 bottom-3"><Button type="button" size="sm" onClick={jumpToLatest}><ArrowDown aria-hidden="true"/>Nuevos mensajes</Button></div>}
      </div>
      <div className="px-4 sm:px-5"><Notice error={query.error}/>{query.error && <Button type="button" variant="ghost" size="sm" onClick={() => void query.refetch()}>Actualizar conversación</Button>}</div>
      <div className={`border-t px-4 py-4 sm:px-5 ${internal ? 'border-warning/25 bg-warning/5' : 'border-border'}`}>
        {closed || !canReply ? <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground"><LockKeyhole className="size-4 shrink-0" aria-hidden="true"/>{closed ? 'Solicitud cerrada. El historial se conserva y ya no admite mensajes.' : 'Solo el técnico responsable o un administrador puede responder. Puedes consultar el historial.'}</p> : <form noValidate onSubmit={form.handleSubmit(input => send.mutate(input))}>
          {staff && <div role="group" aria-label="Visibilidad del mensaje" className="mb-3 flex flex-wrap gap-1.5"><Button type="button" size="sm" variant={!internal ? 'secondary' : 'ghost'} disabled={send.isPending} aria-pressed={!internal} onClick={() => form.setValue('visibility', 'PUBLIC')}><Globe aria-hidden="true"/>Respuesta pública</Button><Button type="button" size="sm" variant={internal ? 'secondary' : 'ghost'} className={internal ? 'text-warning' : ''} disabled={send.isPending} aria-pressed={internal} onClick={() => form.setValue('visibility', 'INTERNAL')}><LockKeyhole aria-hidden="true"/>Nota interna</Button></div>}
          <label htmlFor={`${id}-message`} className="sr-only">{internal ? 'Escribir nota interna' : 'Escribir mensaje'}</label>
          <textarea id={`${id}-message`} rows={3} maxLength={5000} disabled={send.isPending} placeholder={internal ? 'Nota privada para el personal autorizado…' : 'Escribe tu mensaje…'} aria-invalid={!!form.formState.errors.body} aria-describedby={`${id}-hint${form.formState.errors.body ? ` ${id}-error` : ''}`} className="resize-none! border-border! bg-background/60!" {...form.register('body')} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); if (!send.isPending && body.trim()) event.currentTarget.form?.requestSubmit(); } }}/>
          {form.formState.errors.body && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">{form.formState.errors.body.message}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p id={`${id}-hint`} className={`max-w-sm text-xs leading-5 ${internal ? 'text-warning' : 'text-muted-foreground'}`}>{internal ? 'Solo personal autorizado. Esta nota no se envía al solicitante.' : 'No compartas contraseñas ni datos sensibles.'}<span className="hidden sm:block">Ctrl/⌘ + Enter para enviar</span></p><div className="ml-auto flex items-center gap-3"><span className="text-[10px] tabular-nums text-muted-foreground" aria-label={`${body.length} de 5000 caracteres`}>{body.length}/5000</span><Button type="submit" size="sm" disabled={send.isPending || !body.trim()}>{send.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true"/> : <Send aria-hidden="true"/>}{send.isPending ? 'Guardando…' : internal ? 'Guardar nota' : 'Enviar'}</Button></div></div>
        </form>}
        <Notice error={send.error}/>{send.error && <p className="text-xs leading-5 text-muted-foreground">El borrador se conserva. Si hubo un corte de red, revisa el historial antes de reenviar para evitar duplicados.</p>}
      </div>
    </>}
  </article>;
}
