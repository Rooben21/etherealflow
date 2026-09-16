import {validateConfig,localInstant} from './campaignConfig.ts';
import {allCampaignItems} from './campaignLock.ts';
import {validateContent} from './campaignAI.ts';
export async function createCampaign(client,body){
 const config=validateConfig(body.config||{}),settings=(await client.entities.StudioSettings.list('created_date',1))[0];
 const supported=['instagram','instagram-standalone','tiktok','youtube','facebook'];
 const accounts=(settings?.postiz_accounts||[]).filter(a=>config.account_ids.includes(a.id)&&!a.disabled&&supported.includes(a.platform));
 if(accounts.length!==config.account_ids.length)throw new Error('Оновіть акаунти у Postiz: обраний акаунт відсутній або недоступний.');
 if(typeof body.name!=='string'||!body.name.trim()||body.name.length>160)throw new Error('Вкажіть назву кампанії до 160 символів.');
 const campaign=await client.entities.ContentCampaign.create({name:body.name.trim(),config:{...config,accounts},status:'draft',total_count:config.days*config.per_day,ready_count:0,worker_token:'',message:'Чернетка: платна генерація ще не запускалася.'});return {id:campaign.id};
}
export async function changeCampaign(client,c,b){
 if(b.action==='start'||b.action==='resume'){
  if(!['draft','paused','budget_paused'].includes(c.status)||b.confirmed!==true)throw new Error('Підтвердіть запуск кампанії та оцінку платних операцій.');
  const open=await client.entities.CampaignStep.filter({campaign_id:c.id,state:{$in:['reserved','calling','uncertain','result']}},'-created_date',1);if(open.length)throw new Error('Спочатку відновіть незавершений крок.');
  await client.entities.ContentCampaign.update(c.id,{status:'running',message:'Підготовка у фоні. За цикл — одна стратегія або до двох сценаріїв.'});return {};
 }
 if(b.action==='budgets'){
  if(!['draft','paused','budget_paused','needs_attention'].includes(c.status))throw new Error('Спочатку призупиніть кампанію.');
  if(!Number.isInteger(b.daily)||b.daily<1||b.daily>100000||!Number.isInteger(b.monthly)||b.monthly<1||b.monthly>1000000)throw new Error('Перевірте ліміти.');
  await client.entities.ContentCampaign.update(c.id,{config:{...c.config,daily_limit:b.daily,monthly_limit:b.monthly}});return {};
 }
 if(b.action==='group'){
  if(!['day','rubric'].includes(b.scope)||typeof b.source!=='string'||b.source.length>180||typeof b.newRubric!=='string'||b.newRubric.length>180)throw new Error('Оберіть день або рубрику.');
  if(b.scope==='rubric'&&!b.newRubric.trim())throw new Error('Вкажіть нову назву рубрики.');
  if(b.scope==='day'&&(!/^\d{4}-\d\d-\d\d$/.test(b.source)||!/^\d{4}-\d\d-\d\d$/.test(b.newDate)))throw new Error('Оберіть коректну дату.');
  const rows=await allCampaignItems(client,c.id),selected=rows.filter(i=>b.scope==='day'?i.scheduled_local.slice(0,10)===b.source:i.rubric===b.source);
  if(!selected.length||selected.some(i=>i.video_id))throw new Error('Немає роликів або частину вже передано до майстерні. Змініть їх окремо.');
  const ids=new Set(selected.map(i=>i.id)),occupied=new Set(rows.filter(i=>!ids.has(i.id)).map(i=>i.scheduled_at));
  const updates=selected.map(i=>{const local=b.scope==='day'?b.newDate+i.scheduled_local.slice(10):i.scheduled_local,instant=localInstant(local,c.config.timezone);if(occupied.has(instant))throw new Error('Новий час перетинається з іншим роликом кампанії.');occupied.add(instant);return {id:i.id,scheduled_local:local,scheduled_at:instant,rubric:b.newRubric.trim()||i.rubric,revision:(i.revision||0)+1};});
  await client.entities.CampaignItem.bulkUpdate(updates);return {changed:updates.length};
 }
 const item=typeof b.itemId==='string'?await client.entities.CampaignItem.get(b.itemId):null;
 if(!item||item.campaign_id!==c.id)throw new Error('Оберіть ролик цієї кампанії.');
 if(b.action==='export'){
  if(item.state!=='ready')throw new Error('Спочатку підготуйте сценарій.');
  let video=item.video_id?await client.entities.StudioVideo.get(item.video_id):(await client.entities.StudioVideo.filter({campaign_item_id:item.id},'created_date',1))[0];
  if(!video){const s=item.content,ad=c.config.ad_every>0&&(item.sequence+1)%c.config.ad_every===0;video=await client.entities.StudioVideo.create({campaign_id:c.id,campaign_item_id:item.id,title:s.title,topic:c.config.topic,format:'daily',language:c.config.language,tone:'За стратегією кампанії',duration:c.config.duration,instructions:`${c.config.visual_style}\nРубрика: ${item.rubric}. Серія: ${item.series}. ${ad?`Реклама ${c.config.ad_seconds} с, ${c.config.ad_position}: ${c.config.ad_text}`:'Без реклами.'}`.slice(0,3000),script:s.script,hook:s.hook,ending:s.ending,scenes:s.scenes,captions:s.captions,voice:c.config.voice,ad_enabled:ad,ad_text:c.config.ad_text,approved:false,status:'script_ready',credit_limit:c.config.video_limit});}
  await client.entities.CampaignItem.update(item.id,{video_id:video.id,message:'Передано знімок сценарію до майстерні; наступні зміни виконуйте там.'});return {videoId:video.id};
 }
 if(item.video_id)throw new Error('Ролик передано до майстерні. Змінюйте його там, щоб не розійшлися версії.');
 if(b.revision!==item.revision)throw new Error('Ролик уже оновлено. Відкрийте актуальну версію перед збереженням.');
 if(b.action==='edit'){
  if(item.state!=='ready')throw new Error('Дочекайтеся готового сценарію.');
  const content=validateContent(b.content,c.config,item.sequence),scheduled_at=localInstant(b.local,c.config.timezone);
  for(const key of ['rubric','series','format'])if(typeof b[key]!=='string'||!b[key].trim()||b[key].length>180)throw new Error('Перевірте рубрику, серію та формат.');
  const collision=await client.entities.CampaignItem.filter({campaign_id:c.id,scheduled_at},'sequence',2);if(collision.some(i=>i.id!==item.id))throw new Error('Цей час уже зайнятий іншим роликом кампанії.');
  await client.entities.CampaignItem.update(item.id,{content,previous_content:item.content,scheduled_at,scheduled_local:b.local,rubric:b.rubric,series:b.series,format:b.format,manual_edit:true,revision:item.revision+1,message:'Ручні правки збережено й захищено від фонової генерації.'});return {};
 }
 if(b.action==='regenerate'){
  if(b.confirmed!==true||c.status==='stopped')throw new Error('Підтвердіть нову платну генерацію; зупинену кампанію не можна відновити.');
  if(c.regenerate_item_id)throw new Error('Дочекайтеся завершення вже вибраної перегенерації.');
  const open=await client.entities.CampaignStep.filter({campaign_id:c.id,state:{$in:['reserved','calling','uncertain','result']}},'-created_date',1);if(open.length)throw new Error('Спочатку відновіть незавершений крок.');
  await client.entities.CampaignItem.update(item.id,{state:'pending',previous_content:item.content||{},manual_edit:false,revision:item.revision+1,message:'Перегенерацію лише цього сценарію поставлено в чергу.'});
  const rows=await allCampaignItems(client,c.id);await client.entities.ContentCampaign.update(c.id,{ready_count:rows.filter(i=>i.state==='ready').length,status:'running',regenerate_item_id:item.id,resume_status:c.status});return {};
 }
 throw new Error('Некоректна дія.');
}