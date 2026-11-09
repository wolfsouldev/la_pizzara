import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router';
import { loginSchema, preloginSchema, sessionUserSchema, type LoginInput } from '@uni/shared';
import { LockKeyhole, ArrowRight, ShieldCheck, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { api, setCsrfToken } from '@/lib/api-client';
import { homeFor, useSession } from './auth';

export function LoginPage() {
  const session = useSession(); const client = useQueryClient(); const navigate = useNavigate();
  const prelogin = useQuery({ queryKey: ['prelogin'], queryFn: async () => preloginSchema.parse((await api<unknown>('/auth/csrf')).data) });
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '' } });
  const login = useMutation({ mutationFn: async (input: { mode: 'credentials'; values: LoginInput } | { mode: 'development' }) => {
    const csrf = preloginSchema.parse((await api<unknown>('/auth/csrf')).data);
    setCsrfToken(csrf.csrfToken);
    const response = await api<unknown>(input.mode === 'development' ? '/auth/development-login' : '/auth/login', {
      method: 'POST', ...(input.mode === 'credentials' ? { body: input.values } : {}),
    });
    return sessionUserSchema.parse(response.data);
  }, onSuccess: user => {
    form.reset(); setCsrfToken(user.csrfToken); void client.cancelQueries();
    client.removeQueries({ predicate: query => query.queryKey[0] !== 'session' });
    client.setQueryData(['session'], user); navigate(homeFor(user.role), { replace: true });
  }, onError: () => form.setValue('password', '') });
  if (session.data) return <Navigate to={homeFor(session.data.role)} replace/>;
  return <div className="min-h-svh lg:grid lg:grid-cols-[1.05fr_1fr]">
    <aside className="relative hidden min-h-svh overflow-hidden border-r border-border bg-card p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
      <div className="pointer-events-none absolute inset-0 login-grid" aria-hidden="true"/>
      <BrandLogo iconSize={44} className="relative" wordmarkClassName="text-2xl"/>
      <div className="relative py-16"><p className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-primary"/>Tu espacio universitario</p><h1 className="max-w-lg text-5xl font-semibold leading-[1.12] xl:text-6xl">Menos pendientes.<br/><span className="text-muted-foreground">Más soluciones.</span></h1><p className="mt-6 max-w-sm text-base leading-7 text-muted-foreground">Solicita ayuda, da seguimiento a tus incidencias y mantén el trabajo de tu equipo en un mismo lugar.</p>
        <div className="mt-12 max-w-sm space-y-0 border-l border-border pl-6">{[['Solicita', 'Describe lo que necesitas y elige una categoría.'], ['Conecta', 'El equipo de tu departamento se encarga.'], ['Resuelve', 'Consulta respuestas y sigue cada avance.']].map(([title, detail]) => <div className="relative py-3" key={title}><span className="absolute -left-[29px] top-5 size-2 rounded-full border border-primary bg-card" aria-hidden="true"/><h2 className="text-sm font-medium">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>)}</div>
      </div>
      <p className="relative flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={16} aria-hidden="true"/>Servicio interno de la universidad</p>
    </aside>
    <main className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-12"><section className="w-full max-w-[380px]" aria-labelledby="login-title">
      <BrandLogo iconSize={38} className="mb-10 lg:hidden" wordmarkClassName="text-xl"/>
      <span className="mb-6 inline-flex size-11 items-center justify-center rounded-xl border border-border bg-card text-primary"><LockKeyhole size={21} aria-hidden="true"/></span>
      <h2 id="login-title" className="text-3xl font-semibold tracking-tight">Tu espacio te espera</h2>
      <p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">{prelogin.data?.provider === 'local' ? 'Accede al entorno de desarrollo de La Pizzara.' : 'Inicia sesión con tu cuenta institucional.'}</p>
      {prelogin.data?.developmentAccessAvailable && <div className="mb-6 rounded-xl border border-primary/25 bg-primary/10 p-4"><p className="mb-3 flex items-center gap-2 text-sm font-medium text-primary"><FlaskConical size={16} aria-hidden="true"/>Acceso de desarrollo</p><Button type="button" className="w-full" disabled={login.isPending || session.isPending} onClick={() => login.mutate({ mode: 'development' })}>{login.isPending ? 'Entrando…' : 'Entrar en desarrollo'}<ArrowRight aria-hidden="true"/></Button><p className="mt-3 text-xs leading-5 text-muted-foreground">Solo en esta máquina, con una sesión local real. No está disponible en producción.</p></div>}
      <form noValidate onSubmit={form.handleSubmit(values => login.mutate({ mode: 'credentials', values }))} className="space-y-5">
        {prelogin.data?.developmentAccessAvailable && <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>O utiliza tus credenciales<span className="h-px flex-1 bg-border"/></div>}
        <Field id="username" label={prelogin.data?.provider === 'local' ? 'Usuario local' : 'Usuario institucional'} error={form.formState.errors.username?.message}>
          <Input id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={login.isPending} aria-invalid={!!form.formState.errors.username} aria-describedby={form.formState.errors.username ? 'username-error' : undefined} {...form.register('username')}/>
        </Field>
        <Field id="password" label="Contraseña" error={form.formState.errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" disabled={login.isPending} aria-invalid={!!form.formState.errors.password} aria-describedby={form.formState.errors.password ? 'password-error' : undefined} {...form.register('password')}/>
        </Field>
        <Button type="submit" variant={prelogin.data?.developmentAccessAvailable ? 'outline' : 'default'} className="w-full" disabled={login.isPending || session.isPending || !prelogin.data}>{login.isPending ? 'Verificando…' : 'Iniciar sesión'}<ArrowRight size={16} aria-hidden="true"/></Button>
      </form>
      {login.error && <p className="mt-4 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{login.error.message}</p>}
      {prelogin.error && <div role="alert" className="mt-4 space-y-2 text-sm text-destructive"><p>{prelogin.error.message}</p><Button variant="outline" onClick={() => void prelogin.refetch()}>Reintentar conexión</Button></div>}
      <p className="mt-6 text-xs leading-5 text-muted-foreground">{prelogin.data?.provider === 'local' ? 'Las cuentas locales son exclusivas de desarrollo y no se trasladan a producción.' : 'Tu contraseña institucional se verifica de forma segura y no se guarda en La Pizzara.'}</p>
    </section></main>
  </div>;
}
