import React from 'react';
import {eachDayOfInterval,startOfMonth,endOfMonth,startOfWeek,endOfWeek,isSameMonth,isSameDay,isToday,format} from 'date-fns';
import {uk} from 'date-fns/locale';
export default function PublicationCalendarGrid({month,selected,rows,onSelect,loading}){
 const days=eachDayOfInterval({start:startOfWeek(startOfMonth(month),{weekStartsOn:1}),end:endOfWeek(endOfMonth(month),{weekStartsOn:1})});
 const grouped=new Map();
 rows.forEach(row=>{const key=format(new Date(row.scheduled_at),'yyyy-MM-dd');grouped.set(key,[...(grouped.get(key)||[]),row]);});
 return <section className="min-w-0 rounded-xl border border-border bg-card overflow-hidden" aria-label="Дні місяця" aria-busy={loading}>
  <div className="grid grid-cols-7 border-b border-border bg-muted">{['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map(day=><div key={day} className="py-3 text-center text-xs text-muted-foreground font-medium">{day}</div>)}</div>
  <div className="grid grid-cols-7 gap-px bg-border">{days.map(day=>{
   const key=format(day,'yyyy-MM-dd'),items=grouped.get(key)||[],active=isSameDay(day,selected);
   return <button key={key} type="button" onClick={()=>onSelect(day)} aria-pressed={active} aria-current={isToday(day)?'date':undefined} aria-label={`${format(day,'d MMMM yyyy',{locale:uk})}${loading?'':`, планів: ${items.length}`}`} className={`min-w-0 min-h-20 sm:min-h-28 p-1.5 sm:p-2 text-left flex flex-col gap-2 focus-visible:relative focus-visible:z-10 ${active?'bg-accent ring-2 ring-inset ring-primary':'bg-card hover:bg-muted'}`}>
    <span className="flex items-center justify-between gap-1"><span className={`text-xs w-6 h-6 grid place-items-center rounded-full ${isToday(day)?'bg-primary text-primary-foreground':isSameMonth(day,month)?'text-foreground':'text-muted-foreground'}`}>{format(day,'d')}</span>{items.length>0&&<span className="text-[10px] text-primary tabular-nums">{items.length}</span>}</span>
    <span className="hidden sm:flex flex-col gap-1 w-full">{items.slice(0,2).map(item=><span key={item.id} title={item.title_snapshot||item.account_name} className={`block rounded px-1.5 py-1 text-[10px] truncate ${['needs_time','needs_attention','ERROR','failed','uncertain'].includes(item.state)?'bg-destructive/10 text-destructive':'bg-secondary text-secondary-foreground'}`}>{item.mode==='schedule'?format(new Date(item.scheduled_at),'HH:mm'):'•'} {item.title_snapshot||item.account_name||'Публікація'}</span>)}{items.length>2&&<span className="text-[10px] text-muted-foreground">Ще {items.length-2}</span>}</span>
    {items.length>0&&<span className="sm:hidden flex gap-1 justify-center" aria-hidden="true">{items.slice(0,3).map(item=><span key={item.id} className="h-1.5 w-1.5 rounded-full bg-primary"/>)}</span>}
   </button>;
  })}</div>
 </section>;
}