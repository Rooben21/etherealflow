import {createClientFromRequest} from 'npm:@base44/sdk@0.8.44';
import {providerRequest,connectedAccounts,takeStudioLock} from '../../shared/studioProviders.ts';
import {publicationSettings} from '../../shared/studioPublishSettings.ts';

export default async function(req) {
  let client,lock,publication,sending=false;
  try {
    client=createClientFromRequest(req);const user=await client.auth.me();
    if(user?.role!=='admin')return Response.json({error:'Доступ лише для власника.'},{status:403});
    const body=await req.json();
    if(!['send','check'].includes(body.action))return Response.json({error:'Некоректна дія.'},{status:400});
    if(body.action==='check'){
      if(typeof body.publicationId!=='string'||body.publicationId.length>100)throw new Error('Некоректний номер передачі.');
      const item=await client.entities.StudioPublication.get(body.publicationId);
      if(!item?.post_id)throw new Error('Postiz не повернув номер. Перевірте календар Postiz перед повторним надсиланням.');
      const target=new Date(item.scheduled_at||item.created_date).getTime();
      const query=new URLSearchParams({startDate:new Date(target-7*86400000).toISOString(),endDate:new Date(target+7*86400000).toISOString()});
      const result=await providerRequest('postiz','/posts?'+query.toString());
      if(!Array.isArray(result.posts))throw new Error('Postiz повернув нерозпізнаний список публікацій.');
      const post=result.posts.find(p=>p.id===item.post_id);
      if(!post)throw new Error('Публікації не знайдено в цьому діапазоні дат. Якщо дату змінили у Postiz, перевірте її там; повторне надсилання заблоковано.');
      const state=['QUEUE','PUBLISHED','ERROR','DRAFT'].includes(post.state)?post.state:'accepted';
      const publishedUrl=typeof post.releaseURL==='string'&&post.releaseURL.startsWith('https://')?post.releaseURL:'';
      await client.entities.StudioPublication.update(item.id,{state,published_url:publishedUrl,message:state==='PUBLISHED'?'Postiz повідомив про публікацію.':state==='ERROR'?'Postiz повідомив про помилку. Подробиці й повтор — у Postiz.':'Статус оновлено з Postiz.'});
      return Response.json({ok:true,state});
    }
    const {videoId,accountId,mode,date,content,options={},confirmed}=body;
    if(confirmed!==true||typeof videoId!=='string'||videoId.length>100||typeof accountId!=='string'||accountId.length>100||!['draft','schedule','now'].includes(mode))throw new Error('Підтвердьте передачу, акаунт і режим.');
    if(typeof content!=='string'||!content.trim()||content.length>5000)throw new Error('Опис має містити 1–5000 символів.');
    const scheduledAt=mode==='schedule'?new Date(date):new Date();
    if(!Number.isFinite(scheduledAt.getTime())||(mode==='schedule'&&(scheduledAt.getTime()<Date.now()+120000||scheduledAt.getTime()>Date.now()+90*86400000)))throw new Error('Оберіть час від 2 хвилин до 90 днів у майбутньому.');
    lock=await takeStudioLock(client);
    if(lock.settings.publication_paused&&mode!=='draft')throw new Error('Нові публікації призупинено. Увімкніть передачу або оберіть чернетку.');
    const video=await client.entities.StudioVideo.get(videoId);
    if(!video?.approved||!video.video_uri)throw new Error('Спочатку перегляньте та погодьте збережений MP4.');
    const previous=(await client.entities.StudioPublication.filter({video_id:videoId,account_id:accountId},'-created_date',1))[0];
    if(previous&&previous.state!=='failed')return Response.json({ok:true,duplicate:true,state:previous.state,message:'Цей матеріал уже передано або результат невідомий. Перевірте запис у Postiz; дубль не створено.'});
    const accounts=await connectedAccounts();const account=accounts.find(a=>a.id===accountId&&!a.disabled);
    if(!account)throw new Error('Акаунт відсутній або вимкнений у Postiz. Оновіть список.');
    const settings=publicationSettings(account.platform,video,options);
    if(account.platform.startsWith('instagram')&&content.length>2200)throw new Error('Опис Instagram — максимум 2200 символів.');
    if(account.platform==='tiktok'&&content.length>2200)throw new Error('Скоротіть опис TikTok до 2200 символів.');
    publication=await client.entities.StudioPublication.create({video_id:videoId,video_uri:video.video_uri,account_id:accountId,account_name:account.name,platform:account.platform,mode,scheduled_at:scheduledAt.toISOString(),state:'uploading',content,message:'MP4 передається в сховище Postiz.'});
    const access=await client.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:video.video_uri,expires_in:3600});
    const media=await providerRequest('postiz','/upload-from-url',{url:access.signed_url});
    if(typeof media.id!=='string'||typeof media.path!=='string'||!media.path.startsWith('https://'))throw new Error('Postiz має повернути ідентифікатор і публічну HTTPS-адресу завантаженого MP4. Перевірте сховище Postiz.');
    await client.entities.StudioPublication.update(publication.id,{media:{id:media.id,path:media.path},state:'sending',message:'MP4 збережено в Postiz; надсилання запиту на публікацію.'});
    sending=true;
    const result=await providerRequest('postiz','/posts',{type:mode,date:scheduledAt.toISOString(),shortLink:false,tags:[],posts:[{integration:{id:accountId},value:[{content,image:[{id:media.id,path:media.path}]}],settings}]});
    const post=Array.isArray(result)?result.find(p=>p.integration===accountId)||result[0]:null;
    if(typeof post?.postId!=='string')throw new Error('Postiz не повернув номер публікації. Повторне надсилання заблоковано до звірки.');
    await client.entities.StudioPublication.update(publication.id,{post_id:post.postId,state:mode==='draft'?'DRAFT':'accepted',message:mode==='draft'?'Чернетку збережено. Для публікації відкрийте її у Postiz.':'Запит прийнято Postiz. Це ще не підтвердження публікації — перевірте статус.'});
    return Response.json({ok:true,state:mode==='draft'?'DRAFT':'accepted'});
  }catch(error){
    if(publication)await client.entities.StudioPublication.update(publication.id,{state:sending?'uncertain':'failed',message:sending?'Результат надсилання невідомий. Перевірте Postiz; дублювання заблоковано.':'Передача MP4 не завершена; запит публікації не надсилався.'});
    return Response.json({error:error.message||'Не вдалося передати відео.'},{status:400});
  }finally{if(lock)await lock.release();}
}