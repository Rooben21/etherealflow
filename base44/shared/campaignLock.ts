export async function lockCampaign(client,id,stale=false){
 const item=await client.entities.ContentCampaign.get(id);if(!item)throw new Error('Кампанію не знайдено.');
 if(item.worker_token&&(!stale||Date.now()-Date.parse(item.worker_started_at)<15*60000))throw new Error('Кампанія обробляється. Для відновлення завислого кроку зачекайте 15 хвилин.');
 const token=crypto.randomUUID();await client.entities.ContentCampaign.updateMany({id,worker_token:item.worker_token||''},{$set:{worker_token:token,worker_started_at:new Date().toISOString()}});
 if((await client.entities.ContentCampaign.get(id)).worker_token!==token)throw new Error('Кампанія вже обробляється.');
 return {item,token,release:()=>client.entities.ContentCampaign.updateMany({id,worker_token:token},{$set:{worker_token:''}})};
}
export async function allCampaignItems(client,id){let rows=[],page;do{page=await client.entities.CampaignItem.filter({campaign_id:id},'sequence',100,rows.length);rows.push(...page);}while(page.length===100);return rows;}