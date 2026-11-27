const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  if (process.env.SAVE) await page.addInitScript((s) => localStorage.setItem("sandbag-tycoon-v1", s), process.env.SAVE);
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(700);
  await page.screenshot({ path: "records/f-title.png" });
  for (const sel of [".modal.title .btn", ".modal .btn"]) { const b = await page.$(sel); if (b) await b.click(); }
  const c = await page.$("canvas.scene"), box = await c.boundingBox();
  if (process.env.FLOW === "asc") {
    await page.click("text=환생");
    await page.waitForTimeout(200);
    await page.click("button:has-text('환생하기')");
    await page.click("button:has-text('정말 환생')");
    await page.waitForTimeout(900);
    await page.screenshot({ path: "records/f-asc.png" });
  } else {
    for (let i = 0; i < 60; i++) { await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45); await page.waitForTimeout(80); }
    const gold = await page.textContent(".chip.gold");
    await page.click("button.fbtn:has-text('베기')");
    const btn = await page.$("button.btn.buy:has-text('해금')");
    console.log("gold", gold, "unlock enabled", btn && !(await btn.isDisabled()));
    if (btn && !(await btn.isDisabled())) await btn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "records/f-unlock.png" });
  }
  console.log(errs.length ? errs.join("\n") : "no errors");
  await browser.close();
})();
