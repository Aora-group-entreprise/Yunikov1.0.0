import { requireSupabase } from "../../lib/supabase";
import { createPostSchema, type CreatePostInput } from "../posts/schemas";
import type { PostRow } from "../posts/types";

function parseHashtags(v:string|null){if(!v)return [];try{const p=JSON.parse(v);return Array.isArray(p)?p.map(String):v.split(/\s+/).filter(Boolean)}catch{return v.split(/\s+/).filter(Boolean)}}

export async function uploadPostMedia(userId:string,file:File){
 const client=requireSupabase(); const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,""); const path=userId+"/"+crypto.randomUUID()+"."+ext;
 const signed=await client.storage.from("post-media").createSignedUploadUrl(path); if(signed.error||!signed.data)return{path:null,error:signed.error??new Error("Could not create signed upload URL")};
 const uploaded=await client.storage.from("post-media").uploadToSignedUrl(path,signed.data.token,file,{contentType:file.type,cacheControl:"3600"}); if(uploaded.error)return{path:null,error:uploaded.error}; return{path,error:null};
}

export async function createPost(userId:string,input:CreatePostInput & {mediaFile?:File}){
 const d=createPostSchema.parse(input); const client=requireSupabase(); let mediaPath=d.mediaUrl;
 if(input.mediaFile){const uploaded=await uploadPostMedia(userId,input.mediaFile);if(uploaded.error||!uploaded.path)return{data:null,error:uploaded.error??new Error("Media upload failed")};mediaPath=uploaded.path}
 const result=await client.from("posts").insert({author_id:userId,caption:d.caption,media_url:mediaPath??null,media_type:d.mediaType,location:d.location??null,hashtags:JSON.stringify(d.hashtags),visibility:d.visibility,status:"ready"}).select("*").single<PostRow>();
 if(!result.error&&result.data)await client.from("events").insert({user_id:userId,post_id:result.data.id,type:"post.created",weight:1}); return result;
}

export async function getHomeFeed(){
 const client=requireSupabase(); const {data:{user}}=await client.auth.getUser(); if(!user)return{data:null,error:new Error("Authentication required")};
 const profile=await client.from("profiles").select("country_code").eq("id",user.id).maybeSingle(); const country=profile.data?.country_code??null;
 const result=await client.rpc("get_ranked_feed",{p_user:user.id,p_country:country,p_limit:20}); if(result.error)return{data:null,error:result.error};
 const rows=(result.data??[]) as Array<PostRow & {feed_score?:number}>; const paths=rows.map(r=>r.media_url).filter((v):v is string=>Boolean(v));
 const signed=paths.length?await client.storage.from("post-media").createSignedUrls(paths,3600):{data:[],error:null}; const urls=new Map((signed.data??[]).map(item=>[item.path,item.signedUrl]));
 void Promise.all(rows.map(row=>client.rpc("mark_feed_seen",{p_post_id:row.id}))); void Promise.all(rows.map(row=>client.from("events").insert({user_id:user.id,post_id:row.id,type:"impression",weight:1,country_code:country})));
 return{data:rows.map(row=>({...row,hashtags:parseHashtags(row.hashtags),media_url:row.media_url?urls.get(row.media_url)??row.media_url:null})) as unknown as PostRow[],error:signed.error??null};
}

export const listFeed = getHomeFeed;\n\nexport async function softDeletePost(userId:string,postId:number){
 const client=requireSupabase(); const result=await client.from("posts").update({deleted_at:new Date().toISOString(),status:"deleted"}).eq("id",postId).eq("author_id",userId).select("id,media_url").single(); if(!result.error)await client.from("events").insert({user_id:userId,post_id:postId,type:"post.deleted",weight:1}); return result;
}