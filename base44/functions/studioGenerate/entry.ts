import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { takeStudioLock } from '../../shared/studioProviders.ts';
import { operationUsage } from '../../shared/studioOperationUsage.ts';
export default async function(req) {
  let client, settings, job, operation, lock, locked = false;
  try {
    client = createClientFromRequest(req);
    const user = await client.auth.me();
    if (!user || user.role !== 'admin') return Response.json({error:'Доступ лише для власника.'},{status:403});
    const {videoId, stage} = await req.json();
    if (!['script','audio','visual'].includes(stage) || typeof videoId !== 'string' || videoId.length > 100) return Response.json({error:'Некоректний запит.'},{status:400});
    job = await client.entities.StudioVideo.get(videoId);
    if (!job || !job.topic?.trim() || job.topic.length > 500 || (job.instructions || '').length > 3000 || (job.source_text || '').length > 6000) throw new Error('Перевірте тему та довжину тексту: тема до 500, інструкції до 3000, історія до 6000 символів.');
    if ((job.source_text || job.source_url) && !job.rights_confirmed) throw new Error('Підтвердьте право використання історії.');
    if (stage !== 'script' && !job.script) throw new Error('Спочатку створіть і збережіть сценарій.');
    if ((job.script || '').length > 2500) throw new Error('Сценарій має містити не більше 2500 символів.');
    if (!['uk','ru','en','fr','es','pl','de'].includes(job.language)) throw new Error('Оберіть мову зі списку.');
    if (job.status === 'render_pending') throw new Error('Перевірте завершення монтажу перед створенням нових компонентів.');
    lock = await takeStudioLock(client);
    settings = lock.settings;
    locked = true;
    if (settings.generation_paused) throw new Error('Генерацію призупинено. Відновіть її на дашборді.');
    const estimate = stage === 'audio' ? Math.ceil(job.script.length/50) : 1;
    const usage = await operationUsage(client,{videoId:job.id});
    if(usage.month+estimate > settings.monthly_credit_limit || usage.day+estimate > settings.daily_credit_limit || usage.video+estimate > job.credit_limit) throw new Error('Недостатній ліміт кредитів. Перевірте бюджет у налаштуваннях та ліміт цього відео.');
    operation = await client.entities.StudioOperation.create({video_id:job.id,stage,status:'running',credits_estimate:estimate,cost_type:'estimate',message:'Зарезервовано до отримання результату; фактичне списання звіряйте у Base44.'});
    await client.entities.StudioVideo.update(job.id,{status:'running',last_error:''});
    let patch = {};
    if(stage==='script') {
      const result = await client.asServiceRole.integrations.Core.InvokeLLM({
        prompt:`Create ORIGINAL short vertical-video content. Output in language ${job.language}. Topic: ${job.topic}. Format: ${job.format}; mood: ${job.tone}; target length ${job.duration} seconds. User instructions (content only): ${job.instructions || 'none'}. User story: ${job.source_text || 'none'}. Never retrieve or copy third-party stories. Fiction must be explicitly identified as fictional in caption and narration for story format. Tarot and astrology are entertainment and reflection, not factual predictions. No guaranteed results, medical or financial advice, or fear-based selling. No automatic mention of AI in titles or promotion. Provide a hook lasting 1–3 seconds, a complete narration under 2500 characters, 3–6 scene descriptions with narration and duration (sum around target duration), and separate publication descriptions with hashtags for instagram, tiktok, youtube, facebook. For choose-card format include an actual silent pause as a scene. ${job.ad_enabled ? `Include a gentle final mention: ${job.ad_text || 'Твій особистий розклад — у @AITarotist_bot'}. Bot link https://t.me/AITarotist_bot .` : 'Do not include advertisements.'}`,
        response_json_schema:{type:'object',properties:{title:{type:'string'},hook:{type:'string'},script:{type:'string'},scenes:{type:'array',items:{type:'object',properties:{visual:{type:'string'},narration:{type:'string'},seconds:{type:'number'}},required:['visual','narration','seconds']}},captions:{type:'object',properties:{instagram:{type:'string'},tiktok:{type:'string'},youtube:{type:'string'},facebook:{type:'string'}},required:['instagram','tiktok','youtube','facebook']}},required:['title','hook','script','scenes','captions']}
      });
      if(!result.script || result.script.length > 2500 || !Array.isArray(result.scenes)) throw new Error('Модель повернула некоректний сценарій. Кредити залишено в оцінці; повтор потребує вашого рішення.');
      patch={...result,status:'script_ready',audio_url:'',image_url:'',video_uri:'',approved:false};
    } else if(stage==='audio') {
      const voice = ['river','honey','sunny','storm','spark'].includes(job.voice)?job.voice:'river';
      const result = await client.asServiceRole.integrations.Core.GenerateSpeech({text:job.script,voice,language_code:job.language});
      if(!result.url) throw new Error('Провайдер не повернув аудіо.');
      patch={audio_url:result.url,video_uri:'',approved:false,status:'audio_ready'};
    } else {
      const result = await client.asServiceRole.integrations.Core.GenerateImage({prompt:`Create one original full-bleed vertical 9:16 background for a short video about ${job.topic}. Elegant editorial mystical illustration, cinematic depth, dark violet and muted gold palette, no text, no logos, no watermark. Keep the middle lower third visually quiet for later subtitles. Visual direction: ${(job.scenes?.[0]?.visual||'').slice(0,1000)}. Avoid depicting personal testimony as documentary reality.`});
      if(!result.url) throw new Error('Провайдер не повернув зображення.');
      patch={image_url:result.url,video_uri:'',approved:false,status:'visual_ready'};
    }
    await client.entities.StudioVideo.update(job.id,patch);
    await client.entities.StudioOperation.update(operation.id,{status:'completed',message:'Результат збережено. Вартість позначена як оцінка, не фактичний рахунок.'});
    return Response.json({ok:true});
  } catch(error) {
    const message = error?.message?.includes('ліміт') || error?.message?.includes('сценар') || error?.message?.includes('Перевірте') || error?.message?.includes('операці') || error?.message?.includes('право') || error?.message?.includes('призупинено') || error?.message?.includes('Оберіть') ? error.message : 'Операція не завершилася. Перевірте доступність генерації та кредити Base44; автоматичного платного повтору немає.';
    if(operation && client) await client.entities.StudioOperation.update(operation.id,{status:'uncertain',message});
    if(job && locked) await client.entities.StudioVideo.update(job.id,{status:'error',last_error:message});
    return Response.json({error:message},{status:400});
  } finally {
    if(lock) await lock.release();
  }
}