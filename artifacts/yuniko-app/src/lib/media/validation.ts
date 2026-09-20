export const MEDIA_LIMITS={image:10*1024*1024,video:100*1024*1024} as const;
const IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp","image/gif"]);
const VIDEO_TYPES=new Set(["video/mp4","video/webm","video/quicktime"]);

export function validateMedia(file:File){
  const kind=file.type.startsWith("image/")?"image":file.type.startsWith("video/")?"video":null;
  if(!kind) return {ok:false,error:"Type de média non pris en charge."};
  if(kind==="image"&&!IMAGE_TYPES.has(file.type)) return {ok:false,error:"Format image non pris en charge."};
  if(kind==="video"&&!VIDEO_TYPES.has(file.type)) return {ok:false,error:"Format vidéo non pris en charge."};
  if(file.size>MEDIA_LIMITS[kind]) return {ok:false,error:kind==="image"?"Image trop volumineuse.":"Vidéo trop volumineuse."};
  return {ok:true,kind};
}
