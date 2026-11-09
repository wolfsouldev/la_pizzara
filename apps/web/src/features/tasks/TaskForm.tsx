import { SelectInput, FormSelect, SelectOption } from '@/components/common/select-input';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { priorities, type BoardDetail, type TaskDetail } from '@uni/shared';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Notice } from '@/components/common/data-view';
import { priorityLabels } from '@/features/tickets/tickets';
import { useBoardTasks, useBoardTemplates, useBoardLabels, useBoardMembers, useKanbanMutation } from '@/features/boards/kanban';

import { LabelBadge } from '@/features/boards/BoardLabels';

const schema = z.strictObject({ parentTaskId: z.uuid().nullable(), title: z.string().trim().min(3).max(200), description: z.string().trim().max(10000), priority: z.enum(priorities), dueAtLocal: z.string().refine(v => !v || Number.isFinite(new Date(v).getTime()), 'Fecha inválida'), columnId: z.uuid(), labelIds: z.array(z.uuid()).max(20), assigneeIds: z.array(z.uuid()).max(50) });
export function TaskForm({ board, task, initialColumnId, initialParentTaskId, sourceTicket, done }: { board: BoardDetail; task?: TaskDetail; initialColumnId?: string; initialParentTaskId?: string; sourceTicket?: { id: string; title: string; description: string }; done?: () => void }) {
  const id = useId(); const [templateId, setTemplateId] = useState('');
  const templates = useBoardTemplates(board.id, !task && !sourceTicket);
  const candidates = useBoardTasks(board.id, false, !task);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { parentTaskId: initialParentTaskId ?? null, title: task?.title ?? sourceTicket?.title ?? '', description: task?.description ?? sourceTicket?.description ?? '', priority: task?.priority ?? 'NORMAL', dueAtLocal: task?.dueAt !== null && task?.dueAt !== undefined ? format(task.dueAt, "yyyy-MM-dd'T'HH:mm") : '', columnId: task?.columnId ?? initialColumnId ?? board.columns[0]?.id ?? '', assigneeIds: [], labelIds: task?.labels.map(l => l.id) ?? [] } });
  const labels = useBoardLabels(board.id);
  const members = useBoardMembers(board.id, !task);
  const mutation = useKanbanMutation(() => done?.());
  const errors = form.formState.errors;
  return <form noValidate className="space-y-5" onSubmit={form.handleSubmit(v => {
    const body = { title: v.title, description: v.description, priority: v.priority, labelIds: v.labelIds, dueAt: v.dueAtLocal ? new Date(v.dueAtLocal).getTime() : null };
    mutation.mutate(task ? { path: `/tasks/${task.id}`, method: 'PATCH', body } : { path: sourceTicket ? `/staff/tickets/${sourceTicket.id}/tasks` : templateId ? `/boards/${board.id}/templates/${templateId}/tasks` : `/boards/${board.id}/tasks`, method: 'POST', body: { ...body, ...(!templateId || sourceTicket ? { boardId: board.id } : {}), parentTaskId: v.parentTaskId, columnId: v.columnId, assigneeIds: v.assigneeIds } });
  })}>
    <Notice error={mutation.error ?? members.error ?? labels.error ?? templates.error ?? candidates.error} success={mutation.isSuccess && 'Tarea guardada.'}/>
    <fieldset disabled={mutation.isPending} className="space-y-5">
      {!task && !sourceTicket && <Field id={`${id}-template`} label="Usar plantilla (opcional)" hint="Puedes revisar y ajustar sus valores antes de crear. El checklist se copia al guardar."><SelectInput id={`${id}-template`} value={templateId} disabled={templates.isPending} onValueChange={value => {
        if (form.formState.isDirty && !confirm('¿Cargar la plantilla? Se sustituirán título, descripción, prioridad y fecha del formulario.')) return;
        setTemplateId(value); const template = templates.data?.find(t => t.id === value); if (!template) return;
        form.setValue('title', template.title, { shouldDirty: true }); form.setValue('description', template.description ?? '', { shouldDirty: true }); form.setValue('priority', template.priority, { shouldDirty: true }); form.setValue('dueAtLocal', template.dueInDays === null ? '' : format(Date.now() + template.dueInDays * 86400000, "yyyy-MM-dd'T'HH:mm"), { shouldDirty: true });
      }}><SelectOption value="">Sin plantilla</SelectOption>{templates.data?.map(t => <SelectOption key={t.id} value={t.id}>{t.name}</SelectOption>)}</SelectInput>{templateId && <p className="mt-2 text-xs text-muted-foreground">{templates.data?.find(t => t.id === templateId)?.checklist.length ?? 0} elementos de checklist nuevos, sin completar.</p>}</Field>}
      <Field id={`${id}-title`} label="Título" error={errors.title?.message}><Input id={`${id}-title`} maxLength={200} aria-invalid={!!errors.title} aria-describedby={errors.title ? `${id}-title-error` : undefined} {...form.register('title')}/></Field>
      <Field id={`${id}-description`} label="Descripción" error={errors.description?.message}><textarea id={`${id}-description`} rows={4} maxLength={10000} aria-invalid={!!errors.description} aria-describedby={errors.description ? `${id}-description-error` : undefined} {...form.register('description')}/></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={`${id}-priority`} label="Prioridad" error={errors.priority?.message}><FormSelect id={`${id}-priority`} control={form.control} name="priority">{priorities.map(p => <SelectOption key={p} value={p}>{priorityLabels[p]}</SelectOption>)}</FormSelect></Field>
        <Field id={`${id}-due`} label="Fecha límite (opcional)" error={errors.dueAtLocal?.message}><Input id={`${id}-due`} type="datetime-local" aria-invalid={!!errors.dueAtLocal} aria-describedby={errors.dueAtLocal ? `${id}-due-error` : undefined} {...form.register('dueAtLocal')}/></Field>
      </div>
      <fieldset className="rounded-lg border border-border p-4"><legend className="px-1 text-sm font-medium">Categorías (opcionales)</legend>
        <div className="flex flex-wrap gap-3">{labels.data?.map(label => <label key={label.id} className="flex min-h-9 items-center gap-2"><input type="checkbox" value={label.id} {...form.register('labelIds')}/><LabelBadge label={label}/></label>)}</div>
        {labels.isPending && <p role="status" className="text-sm text-muted-foreground">Cargando categorías…</p>}
        {labels.data?.length === 0 && <p className="text-xs text-muted-foreground">Todavía no hay categorías. Se crean desde el botón Categorías del tablero.</p>}
        {errors.labelIds && <p role="alert" className="text-sm text-destructive">{errors.labelIds.message}</p>}
      </fieldset>
      {!task && <>
        <Field id={`${id}-parent`} label="Tarea principal (opcional)" hint="Mismo tablero. La subtarea conserva sus propios responsables, columna y fecha." error={errors.parentTaskId?.message}><FormSelect id={`${id}-parent`} control={form.control} name="parentTaskId" emptyAsNull disabled={candidates.isPending}><SelectOption value="">Tarea independiente</SelectOption>{candidates.data?.map(t => <SelectOption key={t.id} value={t.id}>{t.title}</SelectOption>)}</FormSelect></Field>
        <Field id={`${id}-column`} label="Columna inicial" error={errors.columnId?.message}><FormSelect id={`${id}-column`} aria-invalid={!!errors.columnId} aria-describedby={errors.columnId ? `${id}-column-error` : undefined} control={form.control} name="columnId">{board.columns.map(c => <SelectOption key={c.id} value={c.id}>{c.name}</SelectOption>)}</FormSelect></Field>
        <fieldset className="rounded-lg border border-border p-4"><legend className="px-1 text-sm font-medium">Responsables iniciales (opcionales)</legend>
          {members.data?.filter(m => m.eligible).map(m => <label key={m.userId} className="my-2 flex min-h-8 items-center gap-3"><input type="checkbox" value={m.userId} {...form.register('assigneeIds')}/>{m.displayName}</label>)}
          {!members.data?.some(m => m.eligible) && <p className="text-xs leading-5 text-muted-foreground">Sin miembros elegibles todavía. Puedes añadir responsables después.</p>}
          {errors.assigneeIds && <p role="alert" className="mt-2 text-xs text-destructive">{errors.assigneeIds.message}</p>}
        </fieldset>
      </>}
      <div className="flex justify-end border-t border-border pt-5"><Button type="submit" disabled={labels.isPending || !!labels.error}>{mutation.isPending ? 'Guardando…' : task ? 'Guardar cambios de tarea' : 'Crear tarea'}</Button></div>
    </fieldset>
  </form>;
}
