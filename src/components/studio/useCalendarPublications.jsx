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
  const campaignRows=[];let batch;do{batch=await base44.entities.CampaignItem.filter({scheduled_at:{$gte:from,$lte:until}},'scheduled_at',100,campaignRows.length);campaignRows.push(...batch);}while(batch.length===100);
  return [...rows,...campaignRows.map(i=>({...i,_kind:'campaign',mode:'schedule',title_snapshot:i.content?.title||`Ролик ${i.sequence+1}`,account_name:i.rubric}))].sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at));
 },refetchInterval:15000});
 useEffect(()=>{const refresh=()=>qc.invalidateQueries({queryKey:['studio-publications']});const a=base44.entities.StudioPublication.subscribe(refresh),b=base44.entities.CampaignItem.subscribe(refresh);return ()=>{a();b();};},[qc]);
 return query;
}