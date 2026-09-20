import {describe,expect,it} from "vitest";
import {engagementRate,freshness,score,velocity,FEED_QUOTAS} from "./scoring";

describe("feed scoring",()=>{
 it("uses the documented weighted engagement formula",()=>expect(engagementRate(10,2,1,1,100)).toBeCloseTo(.24));
 it("applies the 12 hour freshness half-life",()=>expect(freshness(12)).toBeCloseTo(.5));
 it("guards velocity against sub-half-hour ages",()=>expect(velocity(.2,.1)).toBeCloseTo(.4));
 it("keeps the documented quota sum at 100%",()=>expect(Object.values(FEED_QUOTAS).reduce((a,b)=>a+b,0)).toBeCloseTo(1));
 it("reduces a score when negative feedback increases",()=>expect(score({engagement:.5,velocity:.5,freshness:.5,relevance:.5,personalization:.5,quality:.5,negative:.5,diversity:1})).toBeLessThan(score({engagement:.5,velocity:.5,freshness:.5,relevance:.5,personalization:.5,quality:.5,negative:0,diversity:1})));
});
