import {connectedAccounts,providerRequest} from './studioProviders.ts';
import {claimPublication,queuePatch,hasDispatched,overdue,retryPatch,nowIso} from './studioQueueState.ts';
import {listPublicationPosts,reconcilePublication} from './studioPostizReconcile.ts';
export async function processPublication(client,original,{allowSend=false,bindId}={}){
 const claim=await claimPublication(client,original);
 if(!claim)return {state:original.state,message:'Цей запис уже обробляється. Повторної передачі немає.'};
 const item=claim.item;
 try{
  if(hasDispatched(item))return {state:await reconcilePublication(client,item,bindId)};
  if(!['waiting_postiz','uploading','needs_time','needs_attention'].includes(item.state))return {state:item.state};
  if(item.state==='needs_time'||overdue(item)){
   await queuePatch(client,item,{state:'needs_time',message:'Потрібен новий час або ваше підтвердження публікації зараз. Автоматичне розміщення простроченого плану зупинено.'});return {state:'needs_time'};
  }
  if(!allowSend)return {state:item.state,message:'План збережено. Автоматична перевірка черги — кожні 5 хвилин.'};
  const studio=(await client.entities.StudioSettings.list('created_date',1))[0];
  if(studio?.publication_paused&&item.mode!=='draft'){
   await queuePatch(client,item,{next_attempt_at:new Date(Date.now()+300000).toISOString(),message:'План збережено. Передачу призупинено вашим налаштуванням.'});return {state:item.state};
  }
  if(!item.settings_snapshot||!item.video_uri){await queuePatch(client,item,{state:'needs_attention',message:'У старому записі бракує збережених параметрів або MP4. Потрібна ручна перевірка.'});return {state:'needs_attention'};}
  const accounts=await connectedAccounts();
  await client.entities.StudioSettings.update(studio.id,{postiz_accounts:accounts,postiz_accounts_checked_at:nowIso()});
  if(!accounts.some(a=>a.id===item.account_id&&!a.disabled&&a.platform===item.platform)){
   await queuePatch(client,item,{state:'needs_attention',message:'Акаунт відсутній або вимкнений у Postiz. Відновіть його там і натисніть перевірку.'});return {state:'needs_attention'};
  }
  if(!item.media){
   await queuePatch(client,item,{state:'uploading',message:'Завантаження копії MP4 у Postiz; оригінал залишається у студії.'});
   const access=await client.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:item.video_uri,expires_in:3600});
   const media=await providerRequest('postiz','/upload-from-url',{url:access.signed_url},45000);
   if(typeof media.id!=='string'||typeof media.path!=='string'||!media.path.startsWith('https://'))throw new Error('Postiz має повернути ідентифікатор і HTTPS-адресу MP4. Перевірте сховище.');
   item.media={id:media.id,path:media.path};await queuePatch(client,item,{media:item.media});
  }
  item.dispatch_date=item.mode==='schedule'?item.scheduled_at:nowIso();
  const existing=await listPublicationPosts(item);
  if(existing.length>1000)throw new Error('Забагато записів Postiz для безпечної звірки в одному запиті.');
  const latestSettings=await client.entities.StudioSettings.get(studio.id);
  if(latestSettings.publication_paused&&item.mode!=='draft'){
   await queuePatch(client,item,{state:'waiting_postiz',next_attempt_at:new Date(Date.now()+300000).toISOString(),message:'Передачу призупинено. Копія MP4 вже підготовлена.'});return {state:'waiting_postiz'};
  }
  if(overdue(item)){await queuePatch(client,item,{state:'needs_time',message:'Час минув під час підготовки. Оберіть новий час або публікацію зараз.'});return {state:'needs_time'};}
  const dispatch=crypto.randomUUID();
  const fence={dispatch_token:dispatch,dispatch_date:item.dispatch_date,state:'sending',send_started_at:nowIso(),baseline_ids:existing.map(p=>p.id),message:'Запит зарезервовано для одноразової передачі. Невідомий результат спочатку звіряється з Postiz.'};
  await client.entities.StudioPublication.updateMany({id:item.id,worker_token:claim.token,worker_until:{$gt:nowIso()},dispatch_token:item.dispatch_token??{$exists:false}},{$set:fence});
  const reserved=await client.entities.StudioPublication.get(item.id);
  if(reserved.dispatch_token!==dispatch||reserved.worker_token!==claim.token||reserved.worker_until<=nowIso())return {state:reserved.state};
  Object.assign(item,fence);
  const result=await providerRequest('postiz','/posts',{type:item.mode,date:item.dispatch_date,shortLink:false,tags:[],posts:[{integration:{id:item.account_id},value:[{content:item.content,image:[item.media]}],settings:item.settings_snapshot}]},20000);
  const post=Array.isArray(result)?result.find(p=>p.integration===item.account_id):null;
  if(typeof post?.postId!=='string')throw new Error('Postiz не повернув номер. Передача не повторюється.');
  const state=item.mode==='draft'?'DRAFT':'accepted';
  await queuePatch(client,item,{post_id:post.postId,state,accepted_at:nowIso(),last_checked_at:nowIso(),attempt_count:0,next_attempt_at:new Date(Date.now()+300000).toISOString(),message:'Прийнято Postiz. Це ще не підтверджує фактичну публікацію.'});
  return {state};
 }catch(error){
  const current=await client.entities.StudioPublication.get(item.id);
  const uncertain=hasDispatched(current);
  const state=current.post_id?current.state:uncertain?'uncertain':'waiting_postiz';
  const message=uncertain?'Не вдалося підтвердити стан у Postiz. Збережено попередній результат; повторне надсилання заблоковано.':'Очікує Postiz. MP4, опис і план збережено; передача продовжиться автоматично. '+String(error.message||'').slice(0,280);
  await queuePatch(client,item,{state,...retryPatch(current,message)});
  return {state,message};
 }finally{await claim.release();}
}