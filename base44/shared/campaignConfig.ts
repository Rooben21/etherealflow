export function localInstant(local,zone){
 if(typeof local!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(local))throw new Error('Некоректна дата й час.');
 const target=Date.parse(local+':00Z');if(!Number.isFinite(target))throw new Error('Некоректна дата.');
 const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const text=t=>{const p=Object.fromEntries(fmt.formatToParts(new Date(t)).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;};
 const candidates=[-36,-12,0,12,36].map(h=>{const sample=target+h*3600000;return target-(Date.parse(text(sample)+':00Z')-sample);}).filter(t=>text(t)===local).sort((a,b)=>a-b);
 if(!candidates.length)throw new Error('Цей місцевий час не існує через переведення годинника. Оберіть інший.');return new Date(candidates[0]).toISOString();
}
export function campaignDate(start,offset){const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}
const text=(v,max,label)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error(`Перевірте поле «${label}» (до ${max} символів).`);return v.trim();};
export function validateConfig(input){
 const c={...input};c.brief=text(c.brief,3000,'Завдання');c.topic=text(c.topic,500,'Тема');c.goal=text(c.goal,500,'Мета');c.audience=text(c.audience,500,'Аудиторія');c.visual_style=text(c.visual_style,800,'Візуальний стиль');
 for(const [key,min,max] of [['days',1,60],['per_day',1,10],['duration',10,90],['ad_every',0,20],['ad_seconds',2,10],['daily_limit',1,100000],['monthly_limit',1,1000000],['video_limit',1,1000]])if(!Number.isInteger(c[key])||c[key]<min||c[key]>max)throw new Error(`Перевірте ${key}: ${min}–${max}.`);
 if(c.days*c.per_day>300)throw new Error('Одна кампанія — до 300 унікальних відео.');
 if(!['uk','en','pl','ru','de','fr','es'].includes(c.language)||!['river','honey','sunny','storm','spark'].includes(c.voice))throw new Error('Оберіть мову та голос зі списку.');
 if(!['start','middle','end'].includes(c.ad_position))throw new Error('Оберіть місце реклами.');
 c.ad_text=c.ad_every?text(c.ad_text,250,'Рекламна згадка'):'';
 if(typeof c.timezone!=='string'||c.timezone.length>100)throw new Error('Перевірте часовий пояс.');new Intl.DateTimeFormat('uk',{timeZone:c.timezone});
 if(!/^\d{4}-\d\d-\d\d$/.test(c.start_date)||!Number.isFinite(Date.parse(c.start_date+'T00:00:00Z')))throw new Error('Оберіть дату початку.');
 if(!Array.isArray(c.times)||c.times.length!==c.per_day||new Set(c.times).size!==c.times.length||c.times.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw new Error('Вкажіть окремий час для кожного унікального відео.');c.times.sort();
 if(!Array.isArray(c.account_ids)||c.account_ids.length>20||c.account_ids.some(x=>typeof x!=='string'||x.length>100))throw new Error('Оберіть до 20 акаунтів.');c.account_ids=[...new Set(c.account_ids)];
 for(let day=0;day<c.days;day++)for(const time of c.times)localInstant(campaignDate(c.start_date,day)+'T'+time,c.timezone);
 return Object.fromEntries(['brief','topic','goal','audience','visual_style','days','per_day','duration','ad_every','ad_seconds','daily_limit','monthly_limit','video_limit','language','voice','ad_position','ad_text','timezone','start_date','times','account_ids'].map(k=>[k,c[k]]));
}