import {createClientFromRequest} from 'npm:@base44/sdk@0.8.44';
import {enqueuePublication} from '../../shared/studioEnqueue.ts';
import {processPublication} from '../../shared/studioQueueDispatch.ts';
import {claimPublication,hasDispatched,plannedDate,queuePatch,nowIso} from '../../shared/studioQueueState.ts';
export default async function(req){
 try{
  const client=createClientFromRequest(req),user=await client.auth.me();
  if(user?.role!=='admin')return Response.json({error:'Доступ лише для власника.'},{status:403});
  const body=await req.json();
  if(!['send','check','reschedule','bind'].includes(body.action))throw new Error('Некоректна дія.');
  if(body.action==='send')return Response.json(await enqueuePublication(client,body));
  if(typeof body.publicationId!=='string'||!body.publicationId||body.publicationId.length>100)throw new Error('Некоректний номер плану.');
  const item=await client.entities.StudioPublication.get(body.publicationId);
  if(!item)throw new Error('План не знайдено.');
  if(body.action==='reschedule'){
   if(!['schedule','now'].includes(body.mode))throw new Error('Оберіть новий час або публікацію зараз.');
   const date=plannedDate(body.mode,body.date);
   const claim=await claimPublication(client,item);
   if(!claim)throw new Error('План обробляється. Дочекайтеся завершення перевірки.');
   try{
    if(hasDispatched(claim.item)||!['needs_time','waiting_postiz'].includes(claim.item.state))throw new Error('План уже переданий або має невідомий результат. Зміна можлива лише після звірки в Postiz.');
    await queuePatch(client,claim.item,{mode:body.mode,scheduled_at:date,state:'waiting_postiz',next_attempt_at:nowIso(),attempt_count:0,message:'Новий час збережено. Очікує Postiz.'});
   }finally{await claim.release();}
   return Response.json({ok:true,state:'waiting_postiz',message:'Рішення збережено в тому самому плані, без дублювання.'});
  }
  if(body.action==='bind'&&(body.confirmed!==true||typeof body.postId!=='string'||!body.postId||body.postId.length>100||item.state!=='uncertain'))throw new Error('Спочатку перевірте й підтвердьте знайдений запис Postiz.');
  const result=await processPublication(client,item,{allowSend:body.action==='check',bindId:body.action==='bind'?body.postId:undefined});
  return Response.json({ok:true,...result});
 }catch(error){return Response.json({error:error.message||'Не вдалося зберегти план.'},{status:400});}
}