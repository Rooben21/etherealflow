import {useEffect} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {startOfMonth,endOfMonth,startOfWeek,endOfWeek} from 'date-fns';
import {base44} from '@/api/base44Client';
export default function useCalendarPublications(month){
 const qc=useQueryClient();
 const from=startOfWeek(startOfMonth(month),{weekStartsOn:1}).toISOString();
 const until=endOfWeek(endOfMonth(month),{weekStartsOn:1}).toISOString();
 const query=useQuery({queryKey:['studio-publications','calendar',from,until],queryFn:async()=>{
  const rows=[];let page;
  do{page=await base44.entities.StudioPublication.filter({scheduled_at:{$gte:from,$lte:until}},'scheduled_at',100,rows.length);rows.push(...page);}while(page.length===100);
  return rows;
 },refetchInterval:15000});
 useEffect(()=>base44.entities.StudioPublication.subscribe(()=>qc.invalidateQueries({queryKey:['studio-publications']})),[qc]);
 return query;
}