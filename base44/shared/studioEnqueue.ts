import {takeStudioLock} from './studioProviders.ts';
import {publicationSettings} from './studioPublishSettings.ts';
import {plannedDate,nowIso} from './studioQueueState.ts';
export async function enqueuePublication(client,body){
 const {videoId,accountId,mode,date,content,options={},confirmed}=body;
 if(confirmed!==true||typeof videoId!=='string'||!videoId||videoId.length>100||typeof accountId!=='string'||!accountId||accountId.length>100||!['draft','schedule','now'].includes(mode))throw new Error('Підтвердьте передачу, акаунт і режим.');
 if(typeof content!=='string'||!content.trim()||content.length>5000)throw new Error('Опис має містити 1–5000 символів.');
 if(!options||typeof options!=='object'||Array.isArray(options))throw new Error('Некоректні параметри публікації.');
 const scheduledAt=plannedDate(mode,date);
 const lock=await takeStudioLock(client);
 try{
  const previous=(await client.entities.StudioPublication.filter({video_id:videoId,account_id:accountId},'-created_date',1))[0];
  if(previous&&previous.state!=='failed')return {ok:true,duplicate:true,state:previous.state,message:'Цей матеріал уже є в черзі або переданий. Другий запис не створено; керуйте збереженим планом нижче.'};
  const video=await client.entities.StudioVideo.get(videoId);
  if(!video?.approved||!video.video_uri)throw new Error('Спочатку перегляньте та погодьте збережений MP4.');
  const account=(lock.settings.postiz_accounts||[]).find(a=>a.id===accountId&&!a.disabled);
  if(!account)throw new Error('Акаунт відсутній у збереженому списку. Один раз оновіть акаунти, коли Postiz доступний.');
  const snapshot=publicationSettings(account.platform,video,options);
  if((account.platform.startsWith('instagram')||account.platform==='tiktok')&&content.length>2200)throw new Error('Опис для цієї платформи — максимум 2200 символів.');
  const item=await client.entities.StudioPublication.create({video_id:videoId,video_uri:video.video_uri,title_snapshot:video.title,account_id:accountId,account_name:account.name,platform:account.platform,mode,scheduled_at:scheduledAt,state:'waiting_postiz',content,settings_snapshot:snapshot,dispatch_token:'',worker_token:'',worker_until:'',next_attempt_at:nowIso(),attempt_count:0,message:'Очікує Postiz. План, опис і погоджена версія MP4 збережені незалежно від нього.'});
  return {ok:true,publicationId:item.id,state:item.state,message:lock.settings.publication_paused&&mode!=='draft'?'План збережено в черзі. Передача почнеться після дозволу нових публікацій.':'План збережено в черзі. Передача до Postiz перевіряється автоматично кожні 5 хвилин.'};
 }finally{await lock.release();}
}