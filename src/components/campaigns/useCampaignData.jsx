import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
export default function useCampaignData(id){
 const qc=useQueryClient(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const query=useQuery({queryKey:['content-campaign',id],enabled:!!id,refetchInterval:15000,queryFn:async()=>{const campaign=await base44.entities.ContentCampaign.get(id);let items=[],page;do{page=await base44.entities.CampaignItem.filter({campaign_id:id},'sequence',100,items.length);items.push(...page);}while(page.length===100);const steps=await base44.entities.CampaignStep.filter({campaign_id:id},'-created_date',10);return {campaign,items,steps};}});
 useEffect(()=>{if(!id)return;const refresh=e=>{if(e.id===id||e.data?.campaign_id===id)qc.invalidateQueries({queryKey:['content-campaign',id]});};const a=base44.entities.ContentCampaign.subscribe(refresh),b=base44.entities.CampaignItem.subscribe(refresh);return ()=>{a();b();};},[id,qc]);
 const action=async(name,extra={})=>{setBusy(true);setError('');try{const {data}=await base44.functions.invoke('campaignControl',{action:name,campaignId:id,...extra});if(data.error)throw new Error(data.error);await Promise.all([['content-campaign'],['content-campaigns'],['studio-publications'],['studio-videos'],['studio-operations']].map(queryKey=>qc.invalidateQueries({queryKey})));return data;}catch(e){setError(e.response?.data?.error||e.message);return null;}finally{setBusy(false);}};
 return {...query,busy,action,error:error||query.error?.message};
}