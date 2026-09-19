import { requireSupabase } from "../../lib/supabase";

export async function uploadMessageMedia(file:File){
 const client=requireSupabase(); const {data:{user}}=await client.auth.getUser(); if(!user)return{path:null,error:new Error("Authentication required")};
 const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,""); const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
 const signed=await client.storage.from("message-media").createSignedUploadUrl(path); if(signed.error||!signed.data)return{path:null,error:signed.error??new Error("Could not create upload URL")};
 const uploaded=await client.storage.from("message-media").uploadToSignedUrl(path,signed.data.token,file,{contentType:file.type,cacheControl:"3600"}); return{path:uploaded.error?null:path,error:uploaded.error};
}

export type MessageRow={id:number;conversation_id:number;sender_id:number;kind:string;body:string|null;media_url:string|null;duration_ms:number|null;delivered_at:string|null;read_at:string|null;created_at:string};

export async function createDirectConversation(otherUserId:number){
 const client=requireSupabase(); return client.rpc("create_dm",{p_other_user:otherUserId});
}
export async function listConversations(){
 const client=requireSupabase(); const {data:{user}}=await client.auth.getUser(); if(!user)return{data:null,error:new Error("Authentication required")};
 return client.from("conversations").select("id,created_at,updated_at,conversation_members(user_id,last_read_at,muted)").order("updated_at",{ascending:false});
}
export async function listMessages(conversationId:number,limit=50){
 const client=requireSupabase(); return client.from("messages").select("*").eq("conversation_id",conversationId).order("created_at",{ascending:false}).limit(Math.min(limit,100));
}
export async function sendMessage(conversationId:number,kind:"text"|"image"|"audio",body?:string,mediaUrl?:string,durationMs?:number){
 const client=requireSupabase(); const {data:{user}}=await client.auth.getUser(); if(!user)return{data:null,error:new Error("Authentication required")};
 const legacy=await client.from("users").select("id").eq("auth_user_id",user.id).single(); if(legacy.error)return{data:null,error:legacy.error};
 return client.from("messages").insert({conversation_id:conversationId,sender_id:legacy.data.id,kind,body:body??null,media_url:mediaUrl??null,duration_ms:durationMs??null}).select("*").single<MessageRow>();
}
export async function markMessageRead(messageId:number){return requireSupabase().rpc("mark_message_read",{p_message_id:messageId});}
export function subscribeToConversation(conversationId:number,onMessage:(message:MessageRow)=>void){
 const client=requireSupabase();
 const channel=client.channel(`yuniko:conversation:${conversationId}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`conversation_id=eq.${conversationId}`},payload=>onMessage(payload.new as MessageRow)).subscribe();
 return()=>{void client.removeChannel(channel)};
}
