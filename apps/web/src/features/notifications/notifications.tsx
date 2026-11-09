import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { notificationSchema, notificationCountSchema, notificationReadAllSchema, pageSchema } from '@uni/shared';
import { api } from '@/lib/api-client';
import { useSession } from '@/features/auth/auth';
type Status='connecting'|'connected'|'offline';
const Context=createContext<{status:Status;count:number|undefined;error:Error|null;retry:()=>void}>({status:'offline',count:undefined,error:null,retry:()=>undefined});
export const useNotificationStatus=()=>useContext(Context);
export function NotificationsProvider({children}:{children:ReactNode}) {
  const session=useSession();const client=useQueryClient();const[status,setStatus]=useState<Status>('connecting');const[attempt,setAttempt]=useState(0);const[toast,setToast]=useState(false);const previous=useRef<number|undefined>(undefined);
  const userId=session.data?.id;const csrfToken=session.data?.csrfToken;
  const counter=useQuery({queryKey:['notifications','count',userId],queryFn:async()=>notificationCountSchema.parse((await api<unknown>('/notifications/unread-count')).data),enabled:!!userId,refetchInterval:30000});
  useEffect(()=>{previous.current=undefined;setToast(false);},[userId]);
  useEffect(()=>{const count=counter.data?.count;if(count!==undefined&&previous.current!==undefined&&count>previous.current)setToast(true);previous.current=count;},[counter.data?.count]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(false),5000);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{
    if(!userId||!csrfToken)return;setStatus('connecting');
    let retryTimer:ReturnType<typeof setTimeout>|undefined;
    const refresh=()=>{void client.invalidateQueries({queryKey:['notifications']});void client.invalidateQueries({queryKey:['staff','dashboard']});};
    const refreshTickets=()=>{void client.invalidateQueries({queryKey:['ticket-chat']});void client.invalidateQueries({queryKey:['tickets','detail']});void client.invalidateQueries({queryKey:['staff','detail']});void client.invalidateQueries({queryKey:['staff','events']});};
    const socket=io({path:'/api/v1/realtime',transports:['websocket'],withCredentials:true,auth:{csrfToken},reconnection:true,reconnectionDelay:1000,reconnectionDelayMax:10000});
    socket.on('connect',()=>{setStatus('connected');refresh();refreshTickets();});socket.on('notifications:changed',refresh);socket.on('tickets:changed',refreshTickets);
    socket.on('disconnect',reason=>{setStatus('offline');if(reason==='io server disconnect')retryTimer=setTimeout(()=>socket.connect(),1000);});
    socket.on('connect_error',error=>{setStatus('offline');if(error.message==='Sesión no válida')void client.invalidateQueries({queryKey:['session']});});
    return()=>{if(retryTimer)clearTimeout(retryTimer);socket.removeAllListeners();socket.disconnect();};
  },[userId,csrfToken,attempt,client]);
  return <Context.Provider value={{status,count:counter.data?.count,error:counter.error,retry:()=>{setAttempt(v=>v+1);void counter.refetch();}}}>{children}{toast&&<div role="status" className="fixed bottom-5 right-5 z-[60] max-md:top-20 max-md:bottom-auto flex max-w-[calc(100vw-40px)] items-center gap-4 rounded-xl border border-primary/25 bg-card p-4 text-sm shadow-lg"><p>Tienes una nueva notificación.</p><button type="button" aria-label="Cerrar aviso" className="text-muted-foreground" onClick={()=>setToast(false)}>×</button></div>}</Context.Provider>;
}
export function useNotifications(page:number,unreadOnly=false,enabled=true,limit=20) {
  const session=useSession();return useQuery({queryKey:['notifications','list',session.data?.id,page,unreadOnly,limit],queryFn:async()=>pageSchema(notificationSchema).parse(await api<unknown>(`/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`)),enabled:enabled&&!!session.data,refetchInterval:30000});
}
export function useReadNotification() {
  const client=useQueryClient();return useMutation({mutationFn:async(id:string|null)=>{const response=await api<unknown>(id?`/notifications/${id}/read`:'/notifications/read-all',{method:id?'PATCH':'POST'});return id?notificationSchema.parse(response.data):notificationReadAllSchema.parse(response.data);},onSuccess:()=>{void client.invalidateQueries({queryKey:['notifications']});}});
}
export const notificationsArea=(role:string|undefined)=>role==='SUPER_ADMIN'||role==='ADMIN'?'/admin':role==='TECHNICIAN'?'/staff':'/app';
