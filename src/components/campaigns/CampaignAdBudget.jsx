import React from 'react';
export default function CampaignAdBudget({value,onChange,disabled}){
 const set=(key,v)=>onChange({...value,[key]:v});
 return <fieldset disabled={disabled} className="grid sm:grid-cols-2 gap-4">
  <label className="studio-field">Реклама в кожному N-му ролику (0 — без реклами)<input className="studio-input" type="number" min={0} max={20} required value={value.ad_every} onChange={e=>set('ad_every',Number(e.target.value))}/></label>
  <label className="studio-field">Тривалість рекламної сцени, с<input className="studio-input" type="number" min={2} max={10} required value={value.ad_seconds} onChange={e=>set('ad_seconds',Number(e.target.value))}/></label>
  <label className="studio-field">Місце реклами<select className="studio-input" value={value.ad_position} onChange={e=>set('ad_position',e.target.value)}><option value="start">Початок</option><option value="middle">Середина</option><option value="end">Завершення</option></select></label>
  <label className="studio-field">Рекламна згадка<input className="studio-input" maxLength={250} required={value.ad_every>0} value={value.ad_text} onChange={e=>set('ad_text',e.target.value)}/></label>
  {[['daily_limit','Денний ліміт кампанії, кр. (UTC)',100000],['monthly_limit','Місячний ліміт кампанії, кр. (UTC)',1000000]].map(([key,label,max])=><label key={key} className="studio-field">{label}<input className="studio-input" type="number" min={1} max={max} required value={value[key]} onChange={e=>set(key,Number(e.target.value))}/></label>)}
  <p className="sm:col-span-2 text-xs text-muted-foreground">Діють також загальні ліміти студії. Вони перевіряються за оцінками, не за фактичним рахунком; при досягненні — пауза до вашого продовження.</p>
 </fieldset>;
}