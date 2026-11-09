import { CircleAlert, LoaderCircle, RefreshCw, Unplug } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';

type SessionStatusPageProps = {
  error: Error | null;
  pending: boolean;
  retry: () => void;
};

export function SessionStatusPage({ error, pending, retry }: SessionStatusPageProps) {
  return <main className="flex min-h-svh flex-col items-center justify-center bg-background px-5 py-10 sm:px-8">
    <BrandLogo iconSize={32} className="mb-8"/>
    <section aria-labelledby="session-status-title" aria-busy={pending} className="w-full max-w-md rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-xl shadow-black/10 motion-safe:animate-[session-status-enter_300ms_ease-out_both] sm:px-9 sm:py-10">
      <div aria-hidden="true" className="relative mx-auto mb-7 flex size-28 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-border/60"/>
        <span className="absolute inset-3 rounded-full border border-border"/>
        <span className={`relative flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary ${pending ? '' : 'motion-safe:animate-[session-status-signal_2s_ease-in-out_2]'}`}>
          {pending ? <LoaderCircle size={30} strokeWidth={1.6} className="motion-safe:animate-spin"/> : <Unplug size={30} strokeWidth={1.6}/>}
        </span>
      </div>
      <h1 id="session-status-title" className="text-2xl font-semibold tracking-tight text-foreground">{pending ? 'Verificando tu sesión' : 'No se pudo verificar la sesión'}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{pending ? 'Un momento mientras confirmamos tu acceso a La Pizzara.' : 'No hemos podido confirmar tu acceso. Espera unos segundos y vuelve a intentarlo.'}</p>
      <div className="mt-6 flex min-h-14 items-center gap-2.5 rounded-lg border border-border bg-background/60 px-3.5 py-3 text-left text-xs leading-5 text-muted-foreground">
        {pending ? <LoaderCircle size={15} className="shrink-0 motion-safe:animate-spin" aria-hidden="true"/> : <CircleAlert size={15} className="shrink-0" aria-hidden="true"/>}
        <p role={pending ? 'status' : 'alert'} className="min-w-0 break-words">{pending ? 'Comprobando la conexión…' : error?.message}</p>
      </div>
      <Button type="button" className="mt-6 min-h-11 w-full" disabled={pending} onClick={retry}>
        <RefreshCw aria-hidden="true" className={pending ? 'motion-safe:animate-spin' : ''}/>{pending ? 'Comprobando…' : 'Reintentar'}
      </Button>
    </section>
    <p className="mt-6 max-w-sm text-center text-xs leading-5 text-muted-foreground">{pending ? 'Tu espacio de trabajo estará disponible al confirmar la sesión.' : 'Si el problema continúa, contacta con el equipo de soporte.'}</p>
  </main>;
}
