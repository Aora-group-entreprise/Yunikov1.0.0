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
  const [likes,saves]=await Promise.all([
    client.from("likes").select("post_id").eq("user_id",userId).in("post_id",postIds),
    client.from("saves").select("post_id,collection_id").eq("user_id",userId).in("post_id",postIds),
  ]);
  return {data:[...(likes.data??[]).map((x:any)=>({post_id:x.post_id,liked:true,saved:false})),...(saves.data??[]).map((x:any)=>({post_id:x.post_id,liked:false,saved:true,collection_id:x.collection_id}))],error:likes.error??saves.error};
}

export async function toggleLike(postId:number,liked:boolean){
  const client=requireSupabase(); const userId=await legacyUserId();
  if(liked) return client.from("likes").upsert({user_id:userId,post_id:postId},{onConflict:"user_id,post_id"}).select().single();
  return client.from("likes").delete().eq("user_id",userId).eq("post_id",postId);
}
export async function toggleSave(postId:number,saved:boolean,collectionId?:number){
  const client=requireSupabase(); const userId=await legacyUserId();
  if(saved) return client.from("saves").upsert({user_id:userId,post_id:postId,collection_id:collectionId??null},{onConflict:"user_id,post_id"}).select().single();
  return client.from("saves").delete().eq("user_id",userId).eq("post_id",postId);
}
export async function sharePost(postId:number,channel:string){
  const client=requireSupabase(); const userId=await legacyUserId();
  return client.from("shares").insert({user_id:userId,post_id:postId,channel}).select().single();
}
export async function createCollection(name:string){
  const client=requireSupabase(); const userId=await legacyUserId();
  return client.from("collections").insert({user_id:userId,name:name.trim()}).select().single();
}
export async function saveToCollection(postId:number,collectionId:number){
  return toggleSave(postId,true,collectionId);
}
export async function listCollections(){
  const client=requireSupabase(); const userId=await legacyUserId();
  return client.from("collections").select("id,name,created_at").eq("user_id",userId).order("created_at",{ascending:false});
}
export async function addComment(postId:number,body:string,parentId?:number){
  const client=requireSupabase(); const userId=await legacyUserId();
  return client.from("comments").insert({post_id:postId,user_id:userId,text:body.trim(),parent_id:parentId??null}).select().single();
}
export async function listComments(postId:number){
  return requireSupabase().from("comments").select("id,post_id,user_id,text,parent_id,created_at,like_count").eq("post_id",postId).is("deleted_at",null).order("created_at",{ascending:true});
}
