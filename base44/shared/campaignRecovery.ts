import {applyCampaignStep} from './campaignSteps.ts';
export async function recoverCampaign(client,c,body){
 const step=(await client.entities.CampaignStep.filter({campaign_id:c.id},'-created_date',1))[0];
 if(!step)throw new Error('Незавершеного кроку немає.');
 if(['reserved','calling'].includes(step.state)&&Date.now()-Date.parse(step.created_date)<15*60000)throw new Error('Запит ще може виконуватися. Зачекайте 15 хвилин.');
 if(step.studio_lock_token&&step.studio_settings_id)await client.entities.StudioSettings.updateMany({id:step.studio_settings_id,operation_lock:step.studio_lock_token},{$set:{operation_lock:''}});
 if(step.state==='result'&&body.retry!==true){await applyCampaignStep(client,c,step);await client.entities.ContentCampaign.update(c.id,{status:'paused',message:'Збережений результат відновлено без нової платної генерації. Можна продовжити.'});return {};}
 if(['reserved','calling','uncertain','result'].includes(step.state)){
  if(body.retry!==true||body.confirmed!==true)throw new Error('Результат невідомий або не пройшов перевірку. Для нового платного запиту потрібне окреме підтвердження; попередня оцінка витрат залишається.');
  await client.entities.CampaignStep.update(step.id,{state:'abandoned',message:'Власник дозволив нову спробу; попередня оцінка не списана з обліку.'});
  if(step.operation_id)await client.entities.StudioOperation.update(step.operation_id,{status:'uncertain',message:'Попередній результат не використано. Повтор окремо погоджено власником.'});
 }
 await client.entities.ContentCampaign.update(c.id,{status:'paused',message:'Крок розблоковано. Успішні сценарії збережено; натисніть «Продовжити», щоб обробити решту.'});return {};
}