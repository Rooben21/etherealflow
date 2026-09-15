import {createClientFromRequest} from 'npm:@base44/sdk@0.8.44';
import {queueStates,nowIso} from '../../shared/studioQueueState.ts';
import {processPublication} from '../../shared/studioQueueDispatch.ts';
export default async function(req){
 try{
  const client=createClientFromRequest(req),user=await client.auth.me();
  if(user?.role!=='admin')return Response.json({error:'Доступ лише для власника.'},{status:403});
  const now=nowIso();
  const rows=await client.entities.StudioPublication.filter({state:{$in:queueStates}},'next_attempt_at',100);
  const due=rows.find(p=>(!p.next_attempt_at||p.next_attempt_at<=now)&&(!p.worker_until||p.worker_until<=now));
  if(!due)return Response.json({ok:true,processed:0});
  const result=await processPublication(client,due,{allowSend:true});
  return Response.json({ok:true,processed:1,...result});
 }catch(error){return Response.json({error:error.message||'Не вдалося перевірити чергу.'},{status:400});}
}