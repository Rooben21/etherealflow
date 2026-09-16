import { secrets } from 'base44:runtime';

export function postizBase() {
  const value = secrets.get('POSTIZ_API_URL');
  if (!value) throw new Error('Postiz: потрібна адреса сервісу.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Postiz: потрібна коректна базова HTTPS-адреса.');
  return url.href.replace(/\/+$/, '');
}
export async function providerRequest(provider, path, body, timeout=45000) {
  const key = provider === 'postiz' ? secrets.get('POSTIZ_API_KEY') : secrets.get('CREATOMATE_API_KEY');
  const label = provider === 'postiz' ? 'Postiz' : 'Creatomate';
  if (!key) throw new Error(`${label}: потрібен ключ.`);
  const base = provider === 'postiz' ? postizBase() : 'https://api.creatomate.com/v2';
  let response;
  try {
    response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: provider === 'postiz' ? key : `Bearer ${key}`, ...(body === undefined ? {} : {'Content-Type':'application/json'}) }, ...(body === undefined ? {} : {body:JSON.stringify(body)}), redirect:'manual', signal:AbortSignal.timeout(timeout) });
  } catch (error) { const detail=String(error.message).replaceAll(key,'[redacted]').slice(0,240); throw new Error(`${label}: HTTPS-запит не виконано (${detail}).`); }
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}. ${[401,403].includes(response.status)?'Перевірте ключ і дозволи.':response.status===404?'Перевірте адресу та версію сервісу.':response.status===429?'Досягнуто ліміт запитів.':'Сервіс відхилив запит; перевірте його журнал.'}`);
  if (!(response.headers.get('content-type')||'').includes('json')) throw new Error(`${label}: замість відповіді сервісу отримано вебсторінку; перевірте адресу та проксі.`);
  return await response.json();
}
export async function connectedAccounts() {
  const rows = await providerRequest('postiz','/integrations',undefined,12000);
  if (!Array.isArray(rows)) throw new Error('Postiz: нерозпізнаний формат списку акаунтів.');
  return rows.slice(0,200).map(r=>({id:r.id,name:r.name||r.profile||r.identifier,platform:r.identifier,disabled:!!r.disabled,profile:r.profile||''}));
}
export async function takeStudioLock(client, ownerToken) {
  const settings = (await client.entities.StudioSettings.list('created_date',1))[0];
  if (!settings) throw new Error('Налаштування студії відсутні.');
  if (settings.operation_lock) throw new Error('Інша операція виконується або має невідомий результат.');
  const token = ownerToken || crypto.randomUUID();
  await client.entities.StudioSettings.updateMany({id:settings.id,operation_lock:''},{$set:{operation_lock:token,lock_started_at:new Date().toISOString()}});
  if ((await client.entities.StudioSettings.get(settings.id)).operation_lock !== token) throw new Error('Інша операція вже виконується.');
  return {settings,token,release:()=>client.entities.StudioSettings.updateMany({id:settings.id,operation_lock:token},{$set:{operation_lock:''}})};
}