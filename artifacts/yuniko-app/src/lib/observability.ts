type EventPayload=Record<string,unknown>;

const POSTHOG_URL=import.meta.env.VITE_POSTHOG_CAPTURE_URL as string|undefined;
const POSTHOG_KEY=import.meta.env.VITE_POSTHOG_KEY as string|undefined;
const SENTRY_URL=import.meta.env.VITE_SENTRY_ENVELOPE_URL as string|undefined;

export function trackEvent(name:string,payload:EventPayload={}) {
  if (typeof window!=="undefined") window.dispatchEvent(new CustomEvent("yuniko:telemetry",{detail:{name,payload}}));
  if(POSTHOG_URL&&POSTHOG_KEY){
    void fetch(POSTHOG_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key:POSTHOG_KEY,event:name,properties:payload})}).catch(()=>{});
  }
}

export function captureError(error:unknown,context:EventPayload={}) {
  const normalized=error instanceof Error?error:new Error(String(error));
  trackEvent("error",{message:normalized.message,name:normalized.name,...context});
  if(SENTRY_URL){
    void fetch(SENTRY_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:normalized.message,level:"error",tags:context,platform:"javascript"} )}).catch(()=>{});
  }
}

export function startTrace(name:string,attributes:EventPayload={}) {
  const started=performance.now();
  return {end(extra:EventPayload={}){trackEvent("trace",{name,duration_ms:Math.round(performance.now()-started),...attributes,...extra});}};
}
