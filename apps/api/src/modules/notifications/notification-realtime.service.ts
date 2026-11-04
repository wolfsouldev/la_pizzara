import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { NotificationsRepository } from '../../database/repositories/notifications.repository';
@Injectable()
export class NotificationRealtimeService implements OnModuleDestroy {
  private listeners = new Set<(userId:string)=>void>();
  private pending = new Map<string,Set<string>>();
  private scheduled=false;
  constructor(private readonly notifications:NotificationsRepository) {}
  subscribe(listener:(userId:string)=>void) { this.listeners.add(listener);return ()=>{this.listeners.delete(listener);}; }
  changed(userId:string) { for(const listener of this.listeners) listener(userId); }
  afterInsert(id:string,userId:string) {
    const ids=this.pending.get(userId)??new Set<string>();ids.add(id);this.pending.set(userId,ids);
    if(this.scheduled)return;this.scheduled=true;
    // SQLite transactions are synchronous. Run after the complete call stack,
    // then verify persistence: a rolled-back insert must never send a wake.
    queueMicrotask(()=>{const pending=this.pending;this.pending=new Map();this.scheduled=false;for(const [user,ids] of pending)if([...ids].some(id=>this.notifications.persisted(id,user)))this.changed(user);});
  }
  onModuleDestroy() { this.listeners.clear();this.pending.clear(); }
}
