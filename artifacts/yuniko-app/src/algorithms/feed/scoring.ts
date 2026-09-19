export type FeedSignal={engagement:number;velocity:number;freshness:number;relevance:number;personalization:number;quality:number;negative:number;diversity:number};

export function engagementRate(likes:number,comments:number,saves:number,shares:number,impressions:number){return impressions<=0?0:(likes+3*comments+4*saves+5*shares)/impressions}
export function velocity(rate:number,hours:number){return rate/Math.max(hours,0.5)}
export function freshness(hours:number){return Math.exp(-Math.max(0,hours)*Math.log(2)/12)}
export function score(s:FeedSignal){return(0.30*s.engagement+0.20*s.velocity+0.15*s.freshness+0.20*s.relevance+0.10*s.personalization+0.05*s.quality)*(1-s.negative)*s.diversity}
export const FEED_QUOTAS={following:.40,affinity:.15,topic:.20,localTrending:.15,exploration:.10} as const;
export const FEED_RULES={candidatePool:2000,lightRank:200,heavyRank:50,finalPage:20,maxAuthorSlots:2,seenTtlDays:7,freshnessHalfLifeHours:12,secondChanceImpressions:200} as const;
