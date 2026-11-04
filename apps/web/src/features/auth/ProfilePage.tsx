import { Link } from 'react-router';
import { UserRole } from '@uni/shared';
import { UserRound, ShieldCheck, Fingerprint, Clock3, ArrowRight } from 'lucide-react';
import { useSession } from './auth';
import { ApiStatus } from '@/components/feedback/ApiStatus';

function date(value: number | null) { return value ? new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(value) : 'No registrado'; }
export function ProfilePage() {
  const { data: user } = useSession();
  if (!user) return null;
  return <section>
    <p className="text-xs font-semibold tracking-wide text-primary">Tu espacio en La Pizzara</p>
    <h1 className="mt-2 text-3xl font-semibold">Hola, {user.displayName}</h1>
    <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">Tu información de acceso y tus departamentos, en un mismo lugar.</p>
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <article className="rounded-xl border border-border bg-card p-6"><div className="mb-6 flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><UserRound size={22}/></div><h2 className="font-semibold">Mi perfil</h2></div>
        <dl className="grid gap-6 sm:grid-cols-2">{[['Nombre', user.displayName], ['Usuario', user.username], ['Correo', user.email ?? 'No informado'], ['Rol interno', user.role], ['Identidad', user.authProvider === 'local' ? 'Local · solo desarrollo' : 'Directorio institucional · LDAPS'], ['Último acceso', date(user.lastLoginAt)]].map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl>
        <div className="mt-6 border-t pt-5"><p className="flex items-center gap-2 text-xs text-muted-foreground"><Fingerprint size={14}/>Identificador del perfil</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{user.id}</p></div>
      </article>
      <article className="rounded-xl border border-border bg-card p-6"><div className="mb-6 flex items-center gap-3"><div className="rounded-lg bg-success/10 p-2 text-success"><ShieldCheck size={22}/></div><h2 className="font-semibold">Sesión activa</h2></div><p className="text-sm leading-relaxed text-muted-foreground">Cookie HttpOnly, comprobación de permisos en el servidor y protección CSRF. No se almacenan tokens de sesión en el navegador mediante localStorage.</p><dl className="mt-6 space-y-4"><div><dt className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 size={14}/>Vigencia por inactividad</dt><dd className="mt-1 text-sm font-medium">{date(user.sessionExpiresAt)}</dd></div><div><dt className="text-xs text-muted-foreground">Caducidad absoluta</dt><dd className="mt-1 text-sm font-medium">{date(user.sessionAbsoluteExpiresAt)}</dd></div></dl><p className="mt-3 text-xs text-muted-foreground">Fechas en la hora local del navegador.</p><div className="mt-6 border-t pt-4"><ApiStatus/></div></article>
    </div>
    <article className="mt-6 rounded-xl border border-border bg-card p-6"><h2 className="font-semibold">Departamentos</h2>{user.departments.length ? <ul className="mt-4 flex flex-wrap gap-2">{user.departments.map(d => <li key={d.id} className="rounded-md bg-secondary px-3 py-2 text-sm">{d.name}</li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">Todavía no hay pertenencias asignadas a esta cuenta.</p>}</article>
    {user.role !== UserRole.USER && <div className="mt-6 flex flex-wrap gap-3">{user.role === UserRole.ADMIN && <Link to="/admin/access" className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-3 text-sm text-primary">Verificar acceso administrativo<ArrowRight size={16}/></Link>}<Link to="/staff/access" className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-3 text-sm text-primary">Verificar acceso de atención<ArrowRight size={16}/></Link></div>}
    <p className="mt-8 text-xs leading-relaxed text-muted-foreground">MVP: tickets, tareas vinculadas, notificaciones personales en vivo y estadísticas reales disponibles.</p>
  </section>;
}
