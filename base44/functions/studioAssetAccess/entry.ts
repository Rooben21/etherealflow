import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
export default async function(req) {
 try {
  const client = createClientFromRequest(req);
  const user = await client.auth.me();
  if(!user || user.role!=='admin') return Response.json({error:'Доступ лише для власника.'},{status:403});
  const {id,kind} = await req.json();
  if(typeof id!=='string' || id.length>100 || !['asset','video','publication'].includes(kind)) return Response.json({error:'Некоректний запит.'},{status:400});
  const record = kind==='asset' ? await client.entities.StudioAsset.get(id) : kind==='publication' ? await client.entities.StudioPublication.get(id) : await client.entities.StudioVideo.get(id);
  const uri = kind==='asset' ? record?.file_uri : record?.video_uri;
  if(!uri) return Response.json({error:'Файл відсутній.'},{status:404});
  const result = await client.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:uri,expires_in:3600});
  return Response.json({url:result.signed_url});
 } catch {
  return Response.json({error:'Не вдалося відкрити файл. Спробуйте оновити доступ.'},{status:400});
 }
}