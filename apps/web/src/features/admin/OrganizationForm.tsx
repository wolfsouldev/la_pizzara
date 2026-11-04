import { useId, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { departmentCreateSchema, type DepartmentInput } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Notice } from './common';

export function OrganizationForm({ initial, title, pending, error, onSave, onCancel, children }: { initial?: DepartmentInput; title: string; pending: boolean; error: Error | null; onSave: (values: DepartmentInput) => void; onCancel: () => void; children?: ReactNode }) {
  const id = useId();
  const form = useForm<DepartmentInput>({ resolver: zodResolver(departmentCreateSchema), defaultValues: { name: initial?.name ?? '', slug: initial?.slug ?? '', description: initial?.description ?? '', isActive: initial?.isActive ?? true } });
  const errors = form.formState.errors;
  return <section className="my-6 rounded-xl border border-primary/25 bg-card p-5 sm:p-6"><h2 className="mb-5 text-lg font-semibold tracking-tight">{title}</h2>
    <form noValidate onSubmit={form.handleSubmit(v => onSave({ ...v, description: v.description || null }))}><fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">{children}
      <Field id={`${id}-name`} label="Nombre" error={errors.name?.message}><Input id={`${id}-name`} maxLength={120} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id}-name-error` : undefined} {...form.register('name')}/></Field>
      <Field id={`${id}-slug`} label="Identificador (slug)" error={errors.slug?.message}><Input id={`${id}-slug`} maxLength={80} placeholder="soporte-informatico…" aria-invalid={!!errors.slug} aria-describedby={errors.slug ? `${id}-slug-error` : undefined} {...form.register('slug')}/></Field>
      <Field id={`${id}-description`} className="sm:col-span-2" label="Descripción" error={errors.description?.message}><textarea id={`${id}-description`} rows={3} maxLength={2000} aria-invalid={!!errors.description} aria-describedby={errors.description ? `${id}-description-error` : undefined} {...form.register('description')}/></Field>
      <label className="flex items-center gap-3"><input type="checkbox" {...form.register('isActive')}/>Activo</label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button><Button type="submit">{pending ? 'Guardando…' : 'Guardar'}</Button></div>
    </fieldset></form><Notice error={error}/>
  </section>;
}
