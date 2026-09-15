import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {ChevronLeft,ChevronRight,RefreshCw,Plus} from 'lucide-react';
import {addMonths,startOfMonth,isSameMonth,format} from 'date-fns';
import {uk} from 'date-fns/locale';
import useCalendarPublications from '@/components/studio/useCalendarPublications';
import PublicationCalendarGrid from '@/components/studio/PublicationCalendarGrid';
import CalendarAgenda from '@/components/studio/CalendarAgenda';
export default function PublicationCalendar(){
 const [selected,setSelected]=useState(()=>new Date());const [month,setMonth]=useState(()=>startOfMonth(new Date()));const [notice,setNotice]=useState('');
 const {data:rows=[],isLoading,isFetching,error,refetch}=useCalendarPublications(month);
 const select=date=>{setSelected(date);setMonth(startOfMonth(date));};
 const moveMonth=amount=>select(addMonths(month,amount));
 const moved=date=>{select(date);setNotice(`План перенесено на ${format(date,'d MMMM yyyy, HH:mm',{locale:uk})}. Відео й опис збережені.`);};
 return <div className="space-y-5">
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Календар публікацій</h1><p className="mt-2 text-xs text-muted-foreground leading-relaxed">Збережені плани доступні навіть коли Postiz вимкнений.</p></div><Link to="/studio" className="studio-button primary"><Plus size={16}/>Створити відео</Link></div>
  <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><button type="button" onClick={()=>moveMonth(-1)} className="studio-button" aria-label="Попередній місяць"><ChevronLeft size={16}/></button><h2 className="text-sm sm:text-lg font-semibold capitalize min-w-32 text-center" aria-live="polite">{format(month,'LLLL yyyy',{locale:uk})}</h2><button type="button" onClick={()=>moveMonth(1)} className="studio-button" aria-label="Наступний місяць"><ChevronRight size={16}/></button></div><div className="flex gap-2"><button type="button" className="studio-button" onClick={()=>select(new Date())}>Сьогодні</button><button type="button" className="studio-button" disabled={isFetching} onClick={()=>refetch()}><RefreshCw size={15} className={isFetching?'animate-spin':''}/>{isFetching?'Оновлення…':'Оновити'}</button></div></div>
  <p className="text-xs text-muted-foreground leading-relaxed">Часовий пояс: {Intl.DateTimeFormat().resolvedOptions().timeZone} · {isLoading?'Завантаження планів…':error?'Не вдалося отримати плани':`Планів у місяці: ${rows.filter(item=>isSameMonth(new Date(item.scheduled_at),month)).length}`}<span className="block mt-1">Оберіть день для деталей. Чернетки та «публікувати зараз» показані за датою постановки в чергу.</span></p>
  {error&&<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Не вдалося завантажити календар. Натисніть «Оновити», щоб повторити.</p>}
  {notice&&<p role="status" className="rounded-lg border border-border bg-accent p-3 text-sm text-accent-foreground">{notice}</p>}
  <div className="grid xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-5 items-start"><PublicationCalendarGrid month={month} selected={selected} rows={rows} loading={isLoading} onSelect={select}/><CalendarAgenda selected={selected} rows={rows} loading={isLoading} loadError={error} onMoved={moved}/></div>
 </div>;
}