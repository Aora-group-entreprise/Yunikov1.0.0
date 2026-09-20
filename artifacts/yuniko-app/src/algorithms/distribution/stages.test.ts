import {describe,expect,it} from "vitest";
import {DISTRIBUTION_STAGES,countryScore,shouldAdvance} from "./stages";

describe("global distribution",()=>{
 it("keeps the four stage thresholds ordered",()=>{
  expect(DISTRIBUTION_STAGES.stage1.impressions).toBeLessThan(DISTRIBUTION_STAGES.stage2.impressions);
  expect(DISTRIBUTION_STAGES.stage2.impressions).toBeLessThan(DISTRIBUTION_STAGES.stage3.impressions);
  expect(DISTRIBUTION_STAGES.stage3.impressions).toBe(DISTRIBUTION_STAGES.stage4.impressions);
 });
 it("uses the documented country-score weights",()=>expect(countryScore(1,1,1,1)).toBeCloseTo(1));
 it("requires all thresholds before advancing",()=>{
  expect(shouldAdvance(2299,.10,.10,1)).toBe(false);
  expect(shouldAdvance(2300,.06,.04,1)).toBe(true);
 });
});
