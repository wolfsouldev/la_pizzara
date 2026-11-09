import { OnModuleDestroy } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WebSocketGateway, type OnGatewayInit, type OnGatewayConnection } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { IncomingMessage } from 'node:http';
import type { TLSSocket } from 'node:tls';
import type { Application } from 'express';
import { z } from 'zod';
import { env } from '../../config/environment';
import { SessionService } from '../auth/session.service';
import { NotificationRealtimeService } from './notification-realtime.service';
import { TicketRealtimeService } from './ticket-realtime.service';
interface ClientEvents { [key:string]:(...args:unknown[])=>void }
interface ServerEvents { 'notifications:changed':()=>void; 'tickets:changed':()=>void }
interface SocketData { userId:string; token:string; csrfToken:string }
type Client=Socket<ClientEvents,ServerEvents,Record<string,never>,SocketData>;
type RealtimeServer=Server<ClientEvents,ServerEvents,Record<string,never>,SocketData>;
let connections=()=>0;
const authSchema=z.strictObject({csrfToken:z.string().regex(/^[a-f0-9]{64}$/)});
@WebSocketGateway({path:'/api/v1/realtime',transports:['websocket'],maxHttpBufferSize:4096,connectTimeout:10000,allowRequest:(req:IncomingMessage,done:(err:string|null,ok:boolean)=>void)=>done(null,req.headers.origin===env.APP_ORIGIN&&(req.headers.cookie?.length??0)<=4096&&connections()<500)})
export class NotificationsGateway implements OnGatewayInit<RealtimeServer>,OnGatewayConnection<Client>,OnModuleDestroy {
  private server?:RealtimeServer;
  private timer?:ReturnType<typeof setInterval>;
  private unsubscribe?:()=>void;
  private unsubscribeTickets?:()=>void;
  private checking=false;
  constructor(private readonly sessions:SessionService,private readonly realtime:NotificationRealtimeService,private readonly adapter:HttpAdapterHost,private readonly tickets:TicketRealtimeService) {}
  private secure(req:IncomingMessage) {
    if((req.socket as TLSSocket).encrypted)return true;
    const app=this.adapter.httpAdapter.getInstance<Application>();const trust:unknown=app.get('trust proxy fn');
    return typeof trust==='function'&&!!trust(req.socket.remoteAddress,0)&&req.headers['x-forwarded-proto']?.toString().split(',')[0]?.trim()==='https';
  }
  private token(req:IncomingMessage) {
    const values=(req.headers.cookie??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(this.sessions.cookieName+'='));
    if(values.length!==1)return '';return values[0]!.slice(this.sessions.cookieName.length+1);
  }
  afterInit(server:RealtimeServer) {
    this.server=server;connections=()=>server.engine.clientsCount;
    server.use((socket,next)=>{void(async()=>{
      const auth=authSchema.safeParse(socket.handshake.auth);if(!auth.success)throw new Error('Sesión no válida');
      const token=this.token(socket.request);const context=await this.sessions.resolveRealtime(token,auth.data.csrfToken,socket.handshake.headers.origin,this.secure(socket.request));
      if(!context)throw new Error('Sesión no válida');
      socket.data={userId:context.user.id,token,csrfToken:auth.data.csrfToken};next();
    })().catch(()=>next(new Error('Sesión no válida')));});
    this.unsubscribe=this.realtime.subscribe(userId=>{void this.wake(userId);});
    this.unsubscribeTickets=this.tickets.subscribe(change=>{void this.wakeTicket(change);});
    this.timer=setInterval(()=>{if(this.checking)return;this.checking=true;void Promise.all([...server.sockets.sockets.values()].map(client=>this.valid(client))).finally(()=>{this.checking=false;});},30000);this.timer.unref();
  }
  handleConnection(client:Client) {
    const own=[...(this.server?.sockets.sockets.values()??[])].filter(s=>s.data.userId===client.data.userId);
    if(own.length>5){client.disconnect(true);return;}
    // No client-supplied rooms, recipient IDs or application messages.
    client.onAny(()=>client.disconnect(true));
  }
  private async valid(client:Client) {
    try { const context=await this.sessions.resolveRealtime(client.data.token,client.data.csrfToken,client.handshake.headers.origin,this.secure(client.request));if(context&&context.user.id===client.data.userId&&client.connected)return context.user; }catch{ /* Directory unavailable must fail closed. */ }
    client.disconnect(true);return undefined;
  }
  private async wake(userId:string) {
    for(const client of this.server?.sockets.sockets.values()??[])if(client.data.userId===userId&&await this.valid(client))client.emit('notifications:changed');
  }
  private async wakeTicket(change:Parameters<TicketRealtimeService['canReceive']>[1]) {
    for(const client of this.server?.sockets.sockets.values()??[]) {
      const user=await this.valid(client);
      if(user&&this.tickets.canReceive(user,change))client.emit('tickets:changed');
    }
  }
  onModuleDestroy() { if(this.timer)clearInterval(this.timer);this.unsubscribe?.();this.unsubscribeTickets?.();for(const client of this.server?.sockets.sockets.values()??[])client.disconnect(true);connections=()=>0; }
}
