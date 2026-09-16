export async function operationUsage(client, {videoId, campaignId} = {}) {
 const now=new Date(), start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString(), day=now.toISOString().slice(0,10);
 const usage={month:0,day:0,video:0,campaignMonth:0,campaignDay:0};let offset=0,page;
 do {page=await client.entities.StudioOperation.filter({created_date:{$gte:start}},'created_date',100,offset);offset+=page.length;
  for(const row of page){const credits=Math.max(0,Number(row.credits_estimate)||0),today=row.created_date.slice(0,10)===day;usage.month+=credits;if(today)usage.day+=credits;if(campaignId&&row.campaign_id===campaignId){usage.campaignMonth+=credits;if(today)usage.campaignDay+=credits;}}
 }while(page.length===100);
 if(videoId){offset=0;do{page=await client.entities.StudioOperation.filter({video_id:videoId},'created_date',100,offset);offset+=page.length;usage.video+=page.reduce((sum,row)=>sum+Math.max(0,Number(row.credits_estimate)||0),0);}while(page.length===100);}
 return usage;
}