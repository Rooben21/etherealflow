export const queueStates=['waiting_postiz','uploading','sending','uncertain','accepted','QUEUE','DRAFT'];
export const nowIso=()=>new Date().toISOString();
export const hasDispatched=p=>!!p.dispatch_token||!!p.post_id||['sending','uncertain','accepted','QUEUE','DRAFT','PUBLISHED','ERROR'].includes(p.state);
export function plannedDate(mode,date){
 const time=mode==='schedule'?new Date(date):new Date();
 if(!Number.isFinite(time.getTime())||(mode==='schedule'&&(time.getTime()<Date.now()+120000||time.getTime()>Date.now()+90*86400000)))throw new Error('Оберіть час від 2 хвилин до 90 днів у майбутньому.');
 return time.toISOString();
}
export const overdue=p=>p.mode==='schedule'&&new Date(p.scheduled_at).getTime()<Date.now()+120000;
export async function claimPublication(client,item){
 const token=crypto.randomUUID(),now=nowIso();
 if(item.worker_until&&item.worker_until>now)return null;
 await client.entities.StudioPublication.updateMany({id:item.id,state:item.state,worker_token:item.worker_token??{$exists:false},worker_until:item.worker_until??{$exists:false}},{$set:{worker_token:token,worker_until:new Date(Date.now()+300000).toISOString()}});
 const current=await client.entities.StudioPublication.get(item.id);
 if(current.worker_token!==token)return null;
 return {item:current,token,release:()=>client.entities.StudioPublication.updateMany({id:item.id,worker_token:token},{$set:{worker_token:'',worker_until:''}})};
}
export async function queuePatch(client,item,patch){
 await client.entities.StudioPublication.updateMany({id:item.id,worker_token:item.worker_token},{$set:patch});
}
export function retryPatch(item,message){
 const count=(item.attempt_count||0)+1;
 return {attempt_count:count,last_checked_at:nowIso(),next_attempt_at:new Date(Date.now()+Math.min(30,5*2**Math.min(count-1,3))*60000).toISOString(),message};
}