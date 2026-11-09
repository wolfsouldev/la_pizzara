import { useState } from 'react';
import { Heading,ListState,Notice,Pager } from '@/components/common/data-view';
import { Button } from '@/components/ui/button';
import { useNotifications,useNotificationStatus,useReadNotification } from './notifications';
import { NotificationRow } from './NotificationRow';
export function NotificationsPage() {
  const[page,setPage]=useState(1);const[unread,setUnread]=useState(false);const list=useNotifications(page,unread);const{status,count,retry,error}=useNotificationStatus();const read=useReadNotification();
  return <section><Heading title="Notificaciones" description="Tus avisos personales y novedades. Solo se muestran recursos a los que conservas acceso."><Button variant="outline" disabled={read.isPending||!count} onClick={()=>read.mutate(null)}>Marcar todas como leídas</Button></Heading><div className="my-5 flex flex-wrap items-center gap-4"><label className="flex items-center gap-2"><input type="checkbox" checked={unread} className="h-4 w-4" onChange={e=>{setUnread(e.target.checked);setPage(1);}}/>Solo no leídas</label><p className="text-xs text-muted-foreground">{status==='connected'?'Actualización en vivo':status==='connecting'?'Actualizando…':'Actualización temporalmente interrumpida'}{count!==undefined&&` · ${count} no leídas`}</p>{status==='offline'&&<Button variant="ghost" onClick={retry}>Reintentar</Button>}</div><Notice error={read.error??error}/><ListState pending={list.isPending} error={list.error} empty={!list.data?.data.length} retry={()=>void list.refetch()}/><div className="my-5 space-y-3">{list.data?.data.map(item=><NotificationRow key={item.id} item={item} pending={read.isPending} read={id=>read.mutate(id)}/>)}</div><Pager meta={list.data?.meta} onPage={setPage}/></section>;
}
