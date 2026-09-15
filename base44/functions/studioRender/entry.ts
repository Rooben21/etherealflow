import {createClientFromRequest} from 'npm:@base44/sdk@0.8.44';
import {providerRequest,takeStudioLock} from '../../shared/studioProviders.ts';
import {studioRenderScript} from '../../shared/studioRenderScript.ts';

export default async function(req) {
  let client, lock, job, sent=false;
  try {
    client=createClientFromRequest(req); const user=await client.auth.me();
    if(user?.role!=='admin')return Response.json({error:'Доступ лише для власника.'},{status:403});
    const {videoId,action,seconds,musicId,confirmed}=await req.json();
    if(typeof videoId!=='string'||videoId.length>100||!['start','check'].includes(action))return Response.json({error:'Некоректний запит.'},{status:400});
    lock=await takeStudioLock(client);
    const video=await client.entities.StudioVideo.get(videoId);
    if(!video)throw new Error('Матеріал не знайдено.');
    const previous=(await client.entities.StudioRender.filter({video_id:videoId},'-created_date',1))[0];
    if(action==='check') {
      if(!previous?.provider_id)throw new Error('Немає номера монтажу. За невідомого результату перевірте Creatomate; новий платний запит не запускається.');
      const result=await providerRequest('creatomate','/renders/'+encodeURIComponent(previous.provider_id));
      if(result.status==='failed') {
        await client.entities.StudioRender.update(previous.id,{state:'failed',message:'Creatomate повідомив про помилку монтажу. Перевірте завдання у своєму Creatomate.'});
        await client.entities.StudioVideo.update(videoId,{status:'error',last_error:'Монтаж не завершено. Перевірте завдання у Creatomate.'});
        return Response.json({ok:true,state:'failed'});
      }
      if(result.status!=='succeeded')return Response.json({ok:true,state:'submitted'});
      if(result.output_format!=='mp4'||result.width!==1080||result.height!==1920||result.file_size>50*1024*1024)throw new Error('Результат не відповідає MP4 1080 × 1920 до 50 МБ.');
      if(previous.audio_url!==video.audio_url||previous.image_url!==video.image_url)throw new Error('Матеріали змінилися після запуску монтажу. Попередній результат не замінюватиме нову версію.');
      let uri=previous.file_uri;
      if(!uri) {
        const url=new URL(result.url);
        if(url.protocol!=='https:'||!(url.hostname==='cdn.creatomate.com'||url.hostname.endsWith('.creatomate.com')))throw new Error('Creatomate повернув неочікувану адресу файлу.');
        const media=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(45000)});
        if(!media.ok)throw new Error('Готовий файл поки недоступний. Повторіть перевірку без нового монтажу.');
        const reader=media.body.getReader();let size=0;const chunks=[];
        while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>50*1024*1024){await reader.cancel();throw new Error('Відео перевищує 50 МБ.');}chunks.push(value);}
        const uploaded=await client.integrations.Core.UploadPrivateFile({file:new File(chunks,'studio-video.mp4',{type:'video/mp4'})});
        uri=uploaded.file_uri;
        await client.entities.StudioRender.update(previous.id,{state:'succeeded',file_uri:uri,result_url:result.url,message:'MP4 збережено у приватному сховищі.'});
      }
      if(video.video_uri!==uri)await client.entities.StudioVideo.update(videoId,{video_uri:uri,status:'ready',approved:false,last_error:''});
      return Response.json({ok:true,state:'succeeded'});
    }
    if(confirmed!==true)throw new Error('Підтвердіть платний монтаж у Creatomate.');
    if(lock.settings.generation_paused)throw new Error('Генерацію призупинено на дашборді.');
    if(video.status==='running')throw new Error('Дочекайтеся завершення генерації компонентів.');
    if(!video.audio_url||!video.image_url)throw new Error('Спочатку збережіть озвучку та зображення.');
    if(!Number.isFinite(seconds)||seconds<1||seconds>90)throw new Error('Озвучка має тривати від 1 до 90 секунд.');
    if(previous&&['reserved','uncertain','submitted'].includes(previous.state))return Response.json({ok:true,state:previous.state});
    if(previous?.state==='succeeded'&&previous.audio_url===video.audio_url&&previous.image_url===video.image_url)return Response.json({ok:true,state:'succeeded',message:'Ці компоненти вже змонтовано. Перевірте готовий результат.'});
    let musicUrl;
    if(musicId){if(typeof musicId!=='string'||musicId.length>100)throw new Error('Некоректна музика.');const music=await client.entities.StudioAsset.get(musicId);if(!music?.rights_confirmed||!music.type?.startsWith('audio/'))throw new Error('Оберіть власне аудіо з підтвердженими правами.');musicUrl=(await client.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:music.file_uri,expires_in:86400})).signed_url;}
    job=await client.entities.StudioRender.create({video_id:videoId,state:'reserved',audio_url:video.audio_url,image_url:video.image_url,duration:seconds,message:'Зарезервовано один монтаж. Вартість — за тарифом Creatomate, окремо від Base44.'});
    await client.entities.StudioVideo.update(videoId,{status:'render_pending',approved:false,last_error:''});
    sent=true;
    const result=await providerRequest('creatomate','/renders',studioRenderScript(video,seconds,musicUrl));
    const render=Array.isArray(result)?result[0]:result;
    if(!render?.id)throw new Error('Creatomate не повернув номер завдання; повтор заблоковано до звірки.');
    await client.entities.StudioRender.update(job.id,{provider_id:render.id,state:'submitted',message:'Монтаж виконується у Creatomate. Перевірка стану не створює нового платного завдання.'});
    return Response.json({ok:true,state:'submitted'});
  }catch(error){
    if(job&&sent)await client.entities.StudioRender.update(job.id,{state:'uncertain',message:'Результат запиту невідомий. Перевірте Creatomate; автоматичного платного повтору немає.'});
    return Response.json({error:error.message||'Не вдалося виконати монтаж.'},{status:400});
  }finally{if(lock)await lock.release();}
}