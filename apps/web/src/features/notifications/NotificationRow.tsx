import { Link } from 'react-router';
import type { AppNotification } from '@uni/shared';
import { Button } from '@/components/ui/button';
import { dateTime } from '@/features/tickets/tickets';
export function NotificationRow({item,read,pending,close}:{item:AppNotification;read:(id:string)=>void;pending:boolean;close?:()=>void}) {
  return <article className={`rounded-lg border p-4 ${item.readAt===null?'border-primary/25 bg-primary/10':'border-border bg-card'}`}><div className="flex items-start gap-2">{item.readAt===null&&<span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="No leída"/>}{item.href?<Link className="break-words text-sm font-semibold text-primary" to={item.href} onClick={()=>{if(item.readAt===null)read(item.id);close?.();}}>{item.title}</Link>:<h3 className="text-sm font-semibold">{item.title}</h3>}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.message}</p><time className="mt-2 block text-xs text-muted-foreground" dateTime={new Date(item.createdAt).toISOString()}>{dateTime(item.createdAt)}</time>{item.readAt===null&&<Button variant="ghost" className="mt-2 h-auto px-0 py-1 text-xs" disabled={pending} onClick={()=>read(item.id)}>Marcar como leída</Button>}</article>;
}
