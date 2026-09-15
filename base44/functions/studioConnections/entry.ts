import {createClientFromRequest} from 'npm:@base44/sdk@0.8.44';
import {providerRequest,connectedAccounts,postizBase} from '../../shared/studioProviders.ts';
export default async function(req) {
  try {
    const client=createClientFromRequest(req); const user=await client.auth.me();
    if(user?.role!=='admin')return Response.json({error:'Доступ лише для власника.'},{status:403});
    const [postiz,creatomate,settingsRows]=await Promise.all([Promise.resolve().then(connectedAccounts).then(value=>({status:'fulfilled',value}),reason=>({status:'rejected',reason})),Promise.resolve().then(()=>providerRequest('creatomate','/templates')).then(value=>({status:'fulfilled',value}),reason=>({status:'rejected',reason})),client.entities.StudioSettings.list('created_date',1)]);
    const settings=settingsRows[0],checkedAt=new Date().toISOString();
    if(postiz.status==='fulfilled'&&settings)await client.entities.StudioSettings.update(settings.id,{postiz_accounts:postiz.value,postiz_accounts_checked_at:checkedAt});
    let manageUrl;try{manageUrl=new URL(postizBase()).origin;}catch{manageUrl=undefined;}
    return Response.json({checked_at:checkedAt,postiz:postiz.status==='fulfilled'?{connected:true,accounts:postiz.value,accounts_checked_at:checkedAt,manage_url:manageUrl}:{connected:false,accounts:settings?.postiz_accounts||[],cached:true,accounts_checked_at:settings?.postiz_accounts_checked_at,manage_url:manageUrl,message:postiz.reason.message},creatomate:creatomate.status==='fulfilled'&&Array.isArray(creatomate.value)?{connected:true}:{connected:false,message:creatomate.status==='rejected'?creatomate.reason.message:'Creatomate: нерозпізнана відповідь.'}});
  }catch{return Response.json({error:'Не вдалося перевірити підключення.'},{status:400});}
}