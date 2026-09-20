import {test,expect} from "@playwright/test";

test("Yuniko boots",async({page})=>{
  await page.goto("/");
  await expect(page).toHaveTitle(/Yuniko/i);
});
