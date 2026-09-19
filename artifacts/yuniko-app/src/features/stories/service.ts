import { requireSupabase } from "../../lib/supabase";

export type StoryRow={id:number;user_id:number;media_url:string;media_type:string;caption:string|null;expires_at:string;created_at:string};

export async function listActiveStories(){const client=requireSupabase();return client.from("stories").select("*").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false})}
export async function createStory(mediaUrl:string,mediaType:"image"|"video",caption?:string){return requireSupabase().rpc("create_story",{p_media_url:mediaUrl,p_media_type:mediaType,p_caption:caption??null,p_hours:24})}
export async function markStoryView(storyId:number){return requireSupabase().rpc("mark_story_view",{p_story_id:storyId})}
export async function deleteStory(storyId:number){return requireSupabase().from("stories").delete().eq("id",storyId)}
export function subscribeToStories(onStory:(story:StoryRow)=>void){
 const client=requireSupabase(); const channel=client.channel("yuniko:stories").on("postgres_changes",{event:"INSERT",schema:"public",table:"stories"},payload=>onStory(payload.new as StoryRow)).subscribe();
 return()=>{void client.removeChannel(channel)};
}
