import {alignNarrationMetadata} from './campaignAI.ts';
export function normalizeGeneratedContent(value){
 let data=value;
 // Split only a two-scene response at an existing sentence boundary; never invent text or change total duration.
 if(Array.isArray(value?.scenes)&&value.scenes.length===2){
  const index=value.scenes.findIndex(s=>!s.is_ad&&Number.isFinite(s.seconds)&&s.seconds>=2&&typeof s.narration==='string'&&/^([\s\S]*?[.!?])\s+([\s\S]+)$/u.test(s.narration.trim()));
  if(index>=0){
   const scene=value.scenes[index],parts=scene.narration.trim().match(/^([\s\S]*?[.!?])\s+([\s\S]+)$/u);
   const first=Math.min(scene.seconds-1,Math.max(1,Math.round(scene.seconds*parts[1].length/(parts[1].length+parts[2].length)*10)/10));
   const scenes=[...value.scenes];scenes.splice(index,1,{...scene,narration:parts[1],seconds:first},{...scene,narration:parts[2],seconds:Number((scene.seconds-first).toFixed(6))});data={...value,scenes};
  }
 }
 return alignNarrationMetadata(data);
}