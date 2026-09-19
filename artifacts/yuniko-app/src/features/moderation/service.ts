import { requireSupabase } from "../../lib/supabase";

export async function submitReport(targetType:"post"|"comment"|"user"|"message"|"story",targetId:number,reason:string,details?:string){
 const client=requireSupabase(); return client.rpc("submit_report",{p_target_type:targetType,p_target_id:targetId,p_reason:reason,p_details:details??null});
}
export async function allowRate(key:string,limit:number,windowSeconds:number){
 const client=requireSupabase(); const {data,error}=await client.rpc("check_rate_limit",{p_key:key,p_limit:limit,p_window_seconds:windowSeconds}); return {allowed:Boolean(data),error};
}
export async function blockUser(blockedId:number){
 const client=requireSupabase(); const {data:{user}}=await client.auth.getUser(); if(!user)throw new Error("Authentication required");
 const me=await client.from("users").select("id").eq("auth_user_id",user.id).single(); if(me.error)throw me.error;
 return client.from("blocked_users").insert({blocker_id:me.data.id,blocked_id:blockedId});
}
export async function unblockUser(blockedId:number){
 const client=requireSupabase(); const {data:{user}}=await client.auth.getUser(); if(!user)throw new Error("Authentication required");
 const me=await client.from("users").select("id").eq("auth_user_id",user.id).single(); if(me.error)throw me.error;
 return client.from("blocked_users").delete().eq("blocker_id",me.data.id).eq("blocked_id",blockedId);
}
