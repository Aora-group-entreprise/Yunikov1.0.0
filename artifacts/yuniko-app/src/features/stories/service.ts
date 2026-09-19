import { requireSupabase } from "../../lib/supabase";

export async function uploadStoryMedia(file:File){
 const client=requireSupabase();
 const {data:{user}}=await client.auth.getUser();
 if(!user) return {path:null,error:new Error("Authentication required")};
 const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");
 const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
 const signed=await client.storage.from("stories").createSignedUploadUrl(path);
 if(signed.error||!signed.data) return {path:null,error:signed.error??new Error("Could not create upload URL")};
 const uploaded=await client.storage.from("stories").uploadToSignedUrl(path,signed.data.token,file,{contentType:file.type,cacheControl:"3600"});
 return {path:uploaded.error?null:path,error:uploaded.error};
}

export type StoryRow={id:number;user_id:number;media_url:string;media_type:string;caption:string|null;expires_at:string;created_at:string};

export async function listActiveStories(){ const client=requireSupabase(); const result=await client.from("stories").select("*").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}); if(result.error||!result.data?.length)return result; const paths=result.data.map((x:any)=>x.media_url).filter((x:any)=>typeof x==="string"&&x.length>0); const signed=paths.length?await client.storage.from("stories").createSignedUrls(paths,3600):{data:[],error:null}; const urls=new Map((signed.data??[]).map((x:any)=>[x.path,x.signedUrl])); return {data:result.data.map((x:any)=>({...x,media_url:urls.get(x.media_url)??x.media_url})),error:signed.error??null}; }
export async function createStory(mediaUrl:string,mediaType:"image"|"video",caption?:string){return requireSupabase().rpc("create_story",{p_media_url:mediaUrl,p_media_type:mediaType,p_caption:caption??null,p_hours:24})}
export async function markStoryView(storyId:number){return requireSupabase().rpc("mark_story_view",{p_story_id:storyId})}
export async function deleteStory(storyId:number){return requireSupabase().from("stories").delete().eq("id",storyId)}
export function subscribeToStories(onStory:(story:StoryRow)=>void){
 const client=requireSupabase(); const channel=client.channel("yuniko:stories").on("postgres_changes",{event:"INSERT",schema:"public",table:"stories"},payload=>onStory(payload.new as StoryRow)).subscribe();
 return()=>{void client.removeChannel(channel)};
}
