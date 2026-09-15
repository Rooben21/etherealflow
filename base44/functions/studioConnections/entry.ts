import {createClientFromRequest} from 'npm:@base44/sdk@0.8.44';
import {providerRequest,connectedAccounts,postizBase} from '../../shared/studioProviders.ts';
export default async function(req) {
  try {
    const client=createClientFromRequest(req); const user=await client.auth.me();
    if(user?.role!=='admin')return Response.json({error:'Доступ лише для власника.'},{status:403});
    const [postiz,creatomate]=await Promise.allSettled([connectedAccounts(),providerRequest('creatomate','/templates')]);
    return Response.json({checked_at:new Date().toISOString(),postiz:postiz.status==='fulfilled'?{connected:true,accounts:postiz.value,manage_url:new URL(postizBase()).origin}:{connected:false,accounts:[],message:postiz.reason.message},creatomate:creatomate.status==='fulfilled'&&Array.isArray(creatomate.value)?{connected:true}:{connected:false,message:creatomate.status==='rejected'?creatomate.reason.message:'Creatomate: нерозпізнана відповідь.'}});
  }catch{return Response.json({error:'Не вдалося перевірити підключення.'},{status:400});}
}