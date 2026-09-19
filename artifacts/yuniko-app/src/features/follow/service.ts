import { requireSupabase } from "../../lib/supabase";
export async function isFollowing(userId:string,targetId:string){ const {data,error}=await requireSupabase().from("follows").select("id").eq("follower_uuid",userId).eq("following_uuid",targetId).eq("status","accepted").maybeSingle(); return {data:Boolean(data),error}; }
export async function followUser(userId:string,targetId:string,pending=false){ return requireSupabase().from("follows").insert({follower_uuid:userId,following_uuid:targetId,status:pending?"pending":"accepted"}).select("id").single(); }
export async function unfollowUser(userId:string,targetId:string){ return requireSupabase().from("follows").delete().eq("follower_uuid",userId).eq("following_uuid",targetId); }
