import { requireSupabase } from "../../lib/supabase";
async function currentLegacyUserId(){
  const client=requireSupabase(); const {data:{user}}=await client.auth.getUser();
  if(!user) throw new Error("Not authenticated");
  const mapped=await client.from("users").select("id").eq("auth_user_id",user.id).single<{id:number}>();
  if(mapped.error||!mapped.data) throw mapped.error??new Error("Account bridge is not ready");
  return mapped.data.id;
}
export async function listNotifications(){
  const userId=await currentLegacyUserId();
  return requireSupabase().from("notifications").select("id,actor_id,type,post_id,story_id,message,read_at,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(100);
}
export async function markNotificationsRead(){
  const userId=await currentLegacyUserId();
  return requireSupabase().from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",userId).is("read_at",null);
}
export async function subscribeToNotifications(onChange:()=>void){
  const client=requireSupabase(); const userId=await currentLegacyUserId();
  return client.channel(`notifications:${userId}`).on("postgres_changes",{event:"*",schema:"public",table:"notifications",filter:`user_id=eq.${userId}`},onChange).subscribe();
}
