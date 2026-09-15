import {useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
export default function usePublicationActions(){
 const qc=useQueryClient();const [busy,setBusy]=useState('');const [error,setError]=useState('');const [links,setLinks]=useState({});
 const action=async(item,name,extra={})=>{
  setBusy(item.id);setError('');
  try{
   const {data}=await base44.functions.invoke(name==='media'?'studioAssetAccess':'studioPublish',name==='media'?{id:item.id,kind:'publication'}:{action:name,publicationId:item.id,...extra});
   if(data.error)throw new Error(data.error);
   if(name==='media')setLinks(v=>({...v,[item.id]:data.url}));
   await qc.invalidateQueries({queryKey:['studio-publications']});return true;
  }catch(e){setError(e.response?.data?.error||e.message);return false;}finally{setBusy('');}
 };
 return {busy,error,links,action};
}