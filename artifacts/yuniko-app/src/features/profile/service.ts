import { requireSupabase } from "../../lib/supabase";
import type { ProfileRow } from "./types";
export async function getMyProfile(userId:string){ return requireSupabase().from("profiles").select("*").eq("id",userId).single<ProfileRow>(); }
export async function getProfile(userId:string){ return requireSupabase().from("profiles").select("*").eq("id",userId).single<ProfileRow>(); }
export async function updateProfile(userId:string,patch:Partial<Pick<ProfileRow,"username"|"display_name"|"bio"|"avatar_url"|"country"|"is_private">>){ return requireSupabase().from("profiles").update(patch).eq("id",userId).select("*").single<ProfileRow>(); }
