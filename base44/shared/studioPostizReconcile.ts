import {providerRequest} from './studioProviders.ts';
import {nowIso,queuePatch} from './studioQueueState.ts';
export async function listPublicationPosts(item){
 const target=new Date(item.dispatch_date||(item.mode==='schedule'?item.scheduled_at:item.send_started_at)||item.scheduled_at||item.created_date).getTime();
 const query=new URLSearchParams({startDate:new Date(target-7*86400000).toISOString(),endDate:new Date(target+7*86400000).toISOString()});
 const result=await providerRequest('postiz','/posts?'+query,undefined,12000);
 if(!Array.isArray(result.posts))throw new Error('Postiz повернув нерозпізнаний список публікацій.');
 return result.posts;
}
export const samePublication=(post,item)=>post.integration?.id===item.account_id&&post.content===item.content;
export async function storePostState(client,item,post){
 if(typeof post.id!=='string')throw new Error('Postiz не повернув ідентифікатор.');
 const state=['QUEUE','PUBLISHED','ERROR','DRAFT'].includes(post.state)?post.state:'accepted';
 const late=state==='QUEUE'&&new Date(post.publishDate||item.scheduled_at).getTime()<Date.now();
 await queuePatch(client,item,{post_id:post.id,state,accepted_at:item.accepted_at||nowIso(),...(state==='PUBLISHED'?{published_confirmed_at:item.published_confirmed_at||nowIso()}:{}),published_url:typeof post.releaseURL==='string'&&post.releaseURL.startsWith('https://')?post.releaseURL:'',last_checked_at:nowIso(),next_attempt_at:new Date(Date.now()+30*60000).toISOString(),candidates:[],attempt_count:0,message:state==='PUBLISHED'?'Опубліковано — підтверджено станом PUBLISHED у Postiz.':state==='ERROR'?'Прийнято Postiz, але публікація завершилася помилкою. Виправте її у Postiz; повторної передачі немає.':state==='DRAFT'?'Прийнято Postiz як чернетку, не опубліковано.':late?'Час уже прийнятого плану минув. Оберіть новий час або публікацію зараз безпосередньо у Postiz; студія не створюватиме дубль.':'Прийнято Postiz, публікацію ще не підтверджено.'});
 return state;
}
export async function reconcilePublication(client,item,bindId){
 const posts=await listPublicationPosts(item);
 if(item.post_id){
  const post=posts.find(p=>p.id===item.post_id);
  if(post)return await storePostState(client,item,post);
  await queuePatch(client,item,{last_checked_at:nowIso(),next_attempt_at:new Date(Date.now()+30*60000).toISOString(),message:'Postiz доступний, але запис не знайдено біля збереженої дати. Перевірте зміну дати або видалення у Postiz. Повторне надсилання заблоковано.'});
  return item.state;
 }
 const matches=posts.filter(p=>samePublication(p,item)&&!(item.baseline_ids||[]).includes(p.id));
 if(bindId){
  const post=matches.find(p=>p.id===bindId);
  if(!post)throw new Error('Обраний запис не підтверджено в Postiz. Оновіть перевірку.');
  return await storePostState(client,item,post);
 }
 await queuePatch(client,item,{state:'uncertain',last_checked_at:nowIso(),next_attempt_at:new Date(Date.now()+30*60000).toISOString(),candidates:matches.slice(0,10).map(p=>({id:p.id,state:p.state,date:p.publishDate})),message:matches.length?'У Postiz знайдено схожі записи. Звірте їх у Postiz і підтвердьте потрібний нижче — новий запит не надсилається.':'Стан перевірено у Postiz, відповідність не знайдена. Це не доказ невдалої передачі: повтор заблоковано. Звірте календар Postiz.'});
 return 'uncertain';
}