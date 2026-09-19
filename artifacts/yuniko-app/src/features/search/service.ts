import { requireSupabase } from "../../lib/supabase";
export async function searchYuniko(term:string, signal?:AbortSignal){
  const q=term.trim();
  if(q.length<2) return {data:[],error:null};
  const request=requireSupabase().rpc("search_yuniko",{q});
  return signal ? request.abortSignal(signal) : request;
}
