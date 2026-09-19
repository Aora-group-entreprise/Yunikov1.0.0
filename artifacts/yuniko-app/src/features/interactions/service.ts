import { requireSupabase } from "../../lib/supabase";

async function legacyUserId(){
  const client=requireSupabase();
  const {data:{user}}=await client.auth.getUser();
  if(!user) throw new Error("Not authenticated");
  const {data,error}=await client.from("users").select("id").eq("auth_user_id",user.id).single<{id:number}>();
  if(error||!data) throw new Error("Account bridge is not ready");
  return data.id;
}

export async function getMyEngagements(postIds:number[]){
  if(!postIds.length) return {data:[],error:null};
  const client=requireSupabase(); const userId=await legacyUserId();
  return client.from("post_engagements").select("post_id,liked,saved,shared").eq("user_id",userId).in("post_id",postIds);
}
export async function toggleLike(postId:number,liked:boolean){
  const client=requireSupabase(); const userId=await legacyUserId();
  const current=await client.from("post_engagements").select("id").eq("user_id",userId).eq("post_id",postId).maybeSingle();
  if(current.error) return current;
  if(current.data) return client.from("post_engagements").update({liked}).eq("id",current.data.id).select().single();
  return client.from("post_engagements").insert({user_id:userId,post_id:postId,liked,saved:false,shared:false}).select().single();
}
export async function toggleSave(postId:number,saved:boolean){
  const client=requireSupabase(); const userId=await legacyUserId();
  const current=await client.from("post_engagements").select("id").eq("user_id",userId).eq("post_id",postId).maybeSingle();
  if(current.error) return current;
  if(current.data) return client.from("post_engagements").update({saved}).eq("id",current.data.id).select().single();
  return client.from("post_engagements").insert({user_id:userId,post_id:postId,liked:false,saved,shared:false}).select().single();
}
export async function sharePost(postId:number,channel:string){
  const client=requireSupabase(); const userId=await legacyUserId();
  const current=await client.from("post_engagements").select("id").eq("user_id",userId).eq("post_id",postId).maybeSingle();
  if(current.error) return current;
  if(current.data) return client.from("post_engagements").update({shared:true}).eq("id",current.data.id).select().single();
  return client.from("post_engagements").insert({user_id:userId,post_id:postId,liked:false,saved:false,shared:true}).select().single();
}
export async function addComment(postId:number,body:string,parentId?:number){
  const client=requireSupabase(); const userId=await legacyUserId();
  return client.from("comments").insert({post_id:postId,user_id:userId,text:body.trim(),parent_id:parentId??null}).select().single();
}
export async function listComments(postId:number){
  return requireSupabase().from("comments").select("id,post_id,user_id,text,parent_id,created_at,like_count").eq("post_id",postId).is("deleted_at",null).order("created_at",{ascending:true});
}
