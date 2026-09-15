export const videoPlatforms=['instagram','instagram-standalone','youtube','tiktok','facebook'];
export function publicationSettings(platform,video,options) {
  if(!videoPlatforms.includes(platform))throw new Error('Ця платформа поки не підтримується для відео.');
  if(platform.startsWith('instagram'))return {__type:platform,post_type:'post',is_trial_reel:false,collaborators:[]};
  if(platform==='facebook')return {__type:'facebook',post_type:'post'};
  if(platform==='youtube'){
    if(!['public','unlisted','private'].includes(options.visibility)||typeof options.madeForKids!=='boolean')throw new Error('Вкажіть видимість YouTube та чи призначене відео для дітей.');
    if(!video.title||video.title.length<2||video.title.length>100)throw new Error('Для YouTube назва має містити 2–100 символів.');
    return {__type:'youtube',title:video.title,type:options.visibility,selfDeclaredMadeForKids:options.madeForKids?'yes':'no',tags:[]};
  }
  if(!['PUBLIC_TO_EVERYONE','MUTUAL_FOLLOW_FRIENDS','FOLLOWER_OF_CREATOR','SELF_ONLY'].includes(options.privacy))throw new Error('Оберіть приватність TikTok.');
  return {__type:'tiktok',privacy_level:options.privacy,duet:!!options.duet,stitch:!!options.stitch,comment:!!options.comment,autoAddMusic:'no',brand_content_toggle:!!options.branded,brand_organic_toggle:!!options.ownBrand,video_made_with_ai:!!options.ai,content_posting_method:'DIRECT_POST',title:(video.title||'').slice(0,90)};
}