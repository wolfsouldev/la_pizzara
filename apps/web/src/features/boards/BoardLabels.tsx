import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { boardLabelInputSchema, labelColors, type BoardLabel, type BoardLabelInput, type BoardDetail } from '@uni/shared';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Notice, ListState } from '@/components/common/data-view';
import { useBoardLabels, useKanbanMutation } from './kanban';

const colors: Record<BoardLabel['color'], string> = {
  violet: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
  blue: 'border-blue-400/30 bg-blue-400/10 text-blue-300',
  green: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  rose: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  gray: 'border-border bg-secondary text-muted-foreground',
};
const colorNames = { violet: 'Violeta', blue: 'Azul', green: 'Verde', amber: 'Ámbar', rose: 'Rosa', gray: 'Gris' };
export function LabelBadge({ label }: { label: BoardLabel }) {
  return <span className={`inline-flex max-w-full items-center gap-1.5 rounded border px-2 py-0.5 text-xs ${colors[label.color]}`}><span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current"/><span className="truncate">{label.name}</span></span>;
}
function LabelForm({ boardId, label, done }: { boardId: string; label?: BoardLabel; done: () => void }) {
  const form = useForm<BoardLabelInput>({ resolver: zodResolver(boardLabelInputSchema), defaultValues: { name: label?.name ?? '', color: label?.color ?? 'violet' } });
  const mutation = useKanbanMutation(() => { form.reset(); done(); });
  return <form className="space-y-4 rounded-lg border border-border bg-muted/30 p-4" onSubmit={form.handleSubmit(body => mutation.mutate({ path: `/boards/${boardId}/labels${label ? `/${label.id}` : ''}`, method: label ? 'PATCH' : 'POST', body }))}>
    <fieldset disabled={mutation.isPending} className="grid gap-4 sm:grid-cols-[1fr_140px]">
      <Field id="label-name" label={label ? 'Editar categoría' : 'Nueva categoría'} error={form.formState.errors.name?.message}><input id="label-name" placeholder="Por ejemplo, Infraestructura" maxLength={40} {...form.register('name')}/></Field>
      <Field id="label-color" label="Color" error={form.formState.errors.color?.message}><select id="label-color" {...form.register('color')}>{labelColors.map(c => <option key={c} value={c}>{colorNames[c]}</option>)}</select></Field>
    </fieldset>
    <div className="flex gap-2"><Button type="submit" disabled={mutation.isPending}>{label ? 'Guardar categoría' : 'Crear categoría'}</Button>{label && <Button variant="ghost" type="button" onClick={done}>Cancelar</Button>}</div><Notice error={mutation.error}/>
  </form>;
}
export function BoardLabels({ board, close }: { board: BoardDetail; close: () => void }) {
  const labels = useBoardLabels(board.id); const [editing, setEditing] = useState<BoardLabel>(); const mutation = useKanbanMutation();
  return <Dialog open title="Categorías del tablero" description="Clasifica las tareas con varias categorías, sin cambiar su estado. Solo se comparten dentro de este tablero." onOpenChange={open => { if (!open) close(); }}>
    <div className="space-y-5"><ListState pending={labels.isPending} error={labels.error} empty={!labels.data?.length} retry={() => void labels.refetch()}/>
      <ul className="divide-y divide-border">{labels.data?.map(label => <li key={label.id} className="flex items-center justify-between gap-3 py-3"><LabelBadge label={label}/>{board.canManage && <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={`Editar ${label.name}`} onClick={() => setEditing(label)}><Pencil/></Button><Button size="icon" variant="ghost" disabled={mutation.isPending} aria-label={`Eliminar ${label.name}`} onClick={() => { if (confirm(`¿Eliminar la categoría «${label.name}»? Las tareas se conservarán, pero perderán esta categoría.`)) { if (editing?.id === label.id) setEditing(undefined); mutation.mutate({ path: `/boards/${board.id}/labels/${label.id}`, method: 'DELETE' }); } }}><Trash2/></Button></div>}</li>)}</ul>
      <Notice error={mutation.error}/>{board.canManage && <><h3 className="flex items-center gap-2 text-sm font-medium"><Plus size={16}/>Organizar categorías</h3><LabelForm key={editing?.id ?? 'new'} boardId={board.id} label={editing} done={() => setEditing(undefined)}/></>}
    </div>
  </Dialog>;
}
