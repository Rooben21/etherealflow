import {createClientFromRequest} from 'npm:@base44/sdk@0.8.44';
import {lockCampaign} from '../../shared/campaignLock.ts';
import {createCampaign,changeCampaign} from '../../shared/campaignCommands.ts';
import {recoverCampaign} from '../../shared/campaignRecovery.ts';
export default async function(req){
 let claim;
 try{
  const client=createClientFromRequest(req),user=await client.auth.me();if(user?.role!=='admin')return Response.json({error:'Доступ лише для власника.'},{status:403});
  const body=await req.json();if(!['create','start','resume','pause','stop','recover','edit','regenerate','export','budgets','group'].includes(body.action))throw new Error('Некоректна дія.');
  if(body.action==='create')return Response.json({ok:true,...await createCampaign(client,body)});
  if(typeof body.campaignId!=='string'||!body.campaignId||body.campaignId.length>100)throw new Error('Некоректний номер кампанії.');
  const c=await client.entities.ContentCampaign.get(body.campaignId);if(!c)throw new Error('Кампанію не знайдено.');
  if(body.action==='pause'||body.action==='stop'){
   if(c.status==='stopped')throw new Error('Кампанію вже зупинено.');
   await client.entities.ContentCampaign.updateMany({id:c.id,status:c.status},{$set:{status:body.action==='pause'?'paused':'stopped',message:body.action==='pause'?'На паузі. Уже розпочатий крок збереже результат.':'Зупинено. Збережені результати доступні; нових платних кроків не буде.'}});return Response.json({ok:true});
  }
  if(c.status==='stopped'&&body.action==='recover'&&body.retry===true)throw new Error('Для зупиненої кампанії можна лише зберегти результат і зняти блокування, без нової платної спроби.');
  claim=await lockCampaign(client,c.id,body.action==='recover');const current=await client.entities.ContentCampaign.get(c.id);
  const result=body.action==='recover'?await recoverCampaign(client,current,{...body,previousWorkerToken:claim.item.worker_token}):await changeCampaign(client,current,body);
  return Response.json({ok:true,...result});
 }catch(error){return Response.json({error:error.message||'Не вдалося змінити кампанію.'},{status:400});}
 finally{if(claim)await claim.release();}
}