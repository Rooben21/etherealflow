import React from 'react';
import {Link} from 'react-router-dom';
import {format,isSameDay} from 'date-fns';
import {uk} from 'date-fns/locale';
import PublicationQueueItem from '@/components/studio/PublicationQueueItem';
import CalendarReschedule from '@/components/studio/CalendarReschedule';
import CampaignCalendarEntry from '@/components/campaigns/CampaignCalendarEntry';
import usePublicationActions from '@/components/studio/usePublicationActions';
import useStudioConnections from '@/components/studio/useStudioConnections';
export default function CalendarAgenda({selected,rows,loading,loadError,onMoved}){
 const {busy,error,links,action}=usePublicationActions();const {data:connections}=useStudioConnections();
 const items=rows.filter(item=>isSameDay(new Date(item.scheduled_at),selected));
 const perform=async(item,name,extra)=>{const ok=await action(item,name,extra);if(ok&&name==='reschedule')onMoved(extra.mode==='schedule'?new Date(extra.date):new Date());return ok;};
 return <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4" aria-label="Публікації вибраного дня">
  <div><h2 className="text-base font-semibold" aria-live="polite">{format(selected,'d MMMM yyyy',{locale:uk})}</h2><p className="mt-1 text-xs text-muted-foreground">{loading?'Завантаження…':loadError?'Дані недоступні':`Планів на цей день: ${items.length}`}</p></div>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  {!loading&&!loadError&&!items.length&&<div className="py-6 space-y-3"><p className="text-sm text-muted-foreground">На цей день публікацій немає.</p><p className="text-xs text-muted-foreground leading-relaxed">Створіть і погодьте відео, а потім оберіть дату в розділі публікації — план з’явиться в календарі.</p><Link to="/studio" className="studio-button">Створити відео</Link></div>}
  {!loading&&items.map(item=>item._kind==='campaign'?<CampaignCalendarEntry key={item.id} item={item}/>:<div key={item.id} className="space-y-3">
   <PublicationQueueItem item={item} busy={!!busy} showVideo onAction={(name,extra)=>perform(item,name,extra)}/>
   {item.state==='waiting_postiz'&&!item.post_id&&!item.dispatch_token&&<CalendarReschedule key={`${item.id}-${item.scheduled_at}`} item={item} busy={!!busy||new Date(item.worker_until).getTime()>Date.now()} onSave={date=>perform(item,'reschedule',{mode:'schedule',date:date.toISOString()})}/>}
   {['accepted','QUEUE','DRAFT','ERROR'].includes(item.state)&&<p className="text-xs text-muted-foreground leading-relaxed">Цей план уже прийнято Postiz. Щоб не створити дубль, змінюйте його час безпосередньо там. Календар показує збережену дату студії — зміни часу в Postiz сюди не переносяться; статус можна перевірити кнопкою вище.</p>}
   {links[item.id]&&<a href={links[item.id]} target="_blank" rel="noreferrer" className="studio-button w-full">Переглянути збережений MP4</a>}
  </div>)}
  {items.some(item=>['accepted','QUEUE','DRAFT','ERROR'].includes(item.state))&&connections?.postiz?.manage_url&&<a href={connections.postiz.manage_url} target="_blank" rel="noreferrer" className="studio-button w-full">Відкрити ваш Postiz</a>}
 </section>;
}