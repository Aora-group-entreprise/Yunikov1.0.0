import { requireSupabase } from "../../lib/supabase";
export async function listNotifications(){
  const client=requireSupabase();
  const {data:{user}}=await client.auth.getUser();
  if(!user) return {data:[],error:new Error("Not authenticated")};
  const mapped=await client.from("users").select("id").eq("auth_user_id",user.id).single<{id:number}>();
  if(mapped.error||!mapped.data) return {data:[],error:mapped.error??new Error("Account bridge is not ready")};
  return client.from("notifications").select("id,actor_id,type,post_id,story_id,message,read_at,created_at").eq("user_id",mapped.data.id).order("created_at",{ascending:false}).limit(100);
}
export async function markNotificationsRead(){
  const client=requireSupabase(); const {data:{user}}=await client.auth.getUser();
  if(!user)return {error:new Error("Not authenticated")};
  const mapped=await client.from("users").select("id").eq("auth_user_id",user.id).single<{id:number}>();
  if(mapped.error||!mapped.data)return {error:mapped.error??new Error("Account bridge is not ready")};
  return client.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",mapped.data.id).is("read_at",null);
}
