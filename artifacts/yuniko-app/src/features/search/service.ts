import { requireSupabase } from "../../lib/supabase";
export async function searchYuniko(term:string){
  const q=term.trim();
  if(q.length<2) return {users:[],posts:[],error:null};
  const client=requireSupabase();
  const [users,posts]=await Promise.all([
    client.from("users").select("id,username,display_name,avatar_url,bio").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(20),
    client.from("posts").select("id,user_id,caption,media_url,created_at").ilike("caption",`%${q}%`).is("deleted_at",null).order("created_at",{ascending:false}).limit(30),
  ]);
  return {users:users.data??[],posts:posts.data??[],error:users.error??posts.error};
}
