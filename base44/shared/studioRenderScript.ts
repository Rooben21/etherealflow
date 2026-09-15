export function studioRenderScript(video, seconds, musicUrl) {
  const elements = [
    {name:'Background',type:'image',track:1,time:0,duration:seconds,source:video.image_url,width:'100%',height:'100%',fit:'cover'},
    {name:'Narration',type:'audio',track:2,time:0,source:video.audio_url},
    {name:'Subtitles',type:'text',track:3,time:0,duration:seconds,transcript_source:'Narration',transcript_effect:'highlight',transcript_maximum_length:32,y:'73%',width:'82%',height:'25%',x_alignment:'50%',y_alignment:'50%',fill_color:'#ffffff',stroke_color:'#16121f',stroke_width:'0.5 vmin',font_family:'Arial',font_weight:'700',font_size:'5.5 vmin'},
  ];
  if(musicUrl)elements.push({name:'Music',type:'audio',track:4,time:0,duration:seconds,source:musicUrl,loop:true,volume:'12%',audio_fade_out:2});
  return {output_format:'mp4',width:1080,height:1920,frame_rate:30,duration:seconds,elements};
}