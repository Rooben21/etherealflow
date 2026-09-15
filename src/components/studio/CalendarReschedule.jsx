import React,{useState} from 'react';
import {format} from 'date-fns';
export default function CalendarReschedule({item,busy,onSave}){
 const [open,setOpen]=useState(false);const [date,setDate]=useState(()=>item.scheduled_at?format(new Date(item.scheduled_at),"yyyy-MM-dd'T'HH:mm"):'');const [error,setError]=useState('');
 const submit=async e=>{
  e.preventDefault();setError('');const value=new Date(date);
  if(!Number.isFinite(value.getTime())||value.getTime()<Date.now()+120000||value.getTime()>Date.now()+90*86400000){setError('Оберіть час від 2 хвилин до 90 днів у майбутньому.');return;}
  if(await onSave(value)){setOpen(false);}
 };
 if(!open)return <button type="button" className="studio-button w-full" disabled={busy} onClick={()=>setOpen(true)}>Перенести публікацію</button>;
 return <form onSubmit={submit} className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
  <label className="studio-field">Новий час ({Intl.DateTimeFormat().resolvedOptions().timeZone})<input className="studio-input" type="datetime-local" required value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label>
  <p className="text-xs text-muted-foreground">Змінюється цей самий план; відео та опис залишаться незмінними.</p>
  {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
  <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className="studio-button primary flex-1">{busy?'Збереження…':'Зберегти час'}</button><button type="button" disabled={busy} className="studio-button" onClick={()=>setOpen(false)}>Скасувати</button></div>
 </form>;
}