import {allCampaignItems} from './campaignLock.ts';
import {campaignDate,localInstant} from './campaignConfig.ts';
import {validateStrategy,validateContent,duplicateContent} from './campaignAI.ts';
import {normalizeGeneratedContent} from './campaignNormalize.ts';
export async function seedCampaign(client,c){
 const rows=await allCampaignItems(client,c.id),existing=new Set(rows.map(r=>r.sequence)),batch=[];
 for(let sequence=0;sequence<c.total_count&&batch.length<100;sequence++){if(existing.has(sequence))continue;
  const local=campaignDate(c.config.start_date,Math.floor(sequence/c.config.per_day))+'T'+c.config.times[sequence%c.config.per_day];
  const percentile=(sequence*37)%100;let accumulated=0;const format=c.strategy.formats.find(f=>{accumulated+=f.share;return percentile<accumulated;})||c.strategy.formats[0];
  batch.push({campaign_id:c.id,sequence,scheduled_local:local,scheduled_at:localInstant(local,c.config.timezone),rubric:c.strategy.pillars[sequence%c.strategy.pillars.length].name,series:c.strategy.series[Math.floor(sequence/c.config.per_day)%c.strategy.series.length].name,format:format.name,state:'pending',manual_edit:false,revision:0});
 }
 if(batch.length){await client.entities.CampaignItem.bulkCreate(batch);await client.entities.ContentCampaign.update(c.id,{message:`Календар: ${rows.length+batch.length} із ${c.total_count} відеопланів. Далі — сценарії.`});}return batch.length;
}
export async function applyCampaignStep(client,c,step){
 if(step.kind==='strategy'){const strategy=validateStrategy(step.result);if(!c.strategy?.summary)await client.entities.ContentCampaign.update(c.id,{strategy});}
 else{
  const all=await allCampaignItems(client,c.id),values=step.result?.items;
  if(!Array.isArray(values)||values.length!==step.item_ids.length||new Set(values.map(v=>v.item_id)).size!==values.length||values.some(v=>!step.item_ids.includes(v.item_id)))throw new Error('ШІ повернув не всі потрібні сценарії; результат збережено.');
  const changes=[];
  for(const value of values){const item=all.find(i=>i.id===value.item_id);if(!item)throw new Error('Ролик не знайдено.');if(item.state!=='pending'||item.manual_edit||item.video_id)continue;
   const aligned=normalizeGeneratedContent(value),content=validateContent(aligned,c.config,item.sequence,true);if(duplicateContent(content,all,item.id))throw new Error('Виявлено повтор назви або вступу; інші сценарії не змінено.');
   const adjusted=aligned.hook!==value.hook||aligned.ending!==value.ending||aligned.scenes.length!==value.scenes.length;
   item.content=content;changes.push({id:item.id,content,state:'ready',message:adjusted?'Сценарій збережено. Структуру узгоджено з наявною озвучкою без нового запиту ШІ; текст і загальну тривалість збережено.':'Сценарій збережено; виробництво ще не запускалося.',revision:(item.revision||0)+1});
  }
  if(changes.length){await client.entities.CampaignItem.bulkUpdate(changes);for(const change of changes){const stored=await client.entities.CampaignItem.get(change.id);if(stored.state!=='ready'||stored.content?.script!==change.content.script)throw new Error('Не всі результати збережено. Відновіть крок із записаної відповіді без повторної генерації.');}}
 }
 if(step.operation_id)await client.entities.StudioOperation.update(step.operation_id,{status:'completed',message:'Результат збережено. Оцінка кредитів, не фактичний рахунок.'});
 await client.entities.CampaignStep.update(step.id,{state:'completed',message:'Результат застосовано без повторної генерації.'});
 const rows=await allCampaignItems(client,c.id),ready=rows.filter(i=>i.state==='ready').length;
 await client.entities.ContentCampaign.update(c.id,{ready_count:ready,message:step.kind==='strategy'?'Стратегію збережено. Наступний крок — календар і сценарії.':`Готово ${ready} із ${c.total_count} сценаріїв.`});
 if(c.regenerate_item_id&&step.item_ids?.includes(c.regenerate_item_id)){
  const resume=['running','paused','budget_paused','completed'].includes(c.resume_status)?c.resume_status:'paused';
  await client.entities.ContentCampaign.updateMany({id:c.id,status:'running'},{$set:{status:resume==='completed'&&ready!==c.total_count?'paused':resume}});
  await client.entities.ContentCampaign.update(c.id,{regenerate_item_id:'',resume_status:''});
 }
 if(ready===c.total_count)await client.entities.ContentCampaign.updateMany({id:c.id,status:'running'},{$set:{status:'completed',message:'Усі сценарії готові. Автоматичне виробництво не запускалося.'}});
}