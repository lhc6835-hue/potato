const { chromium, devices } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  await page.addInitScript((s) => localStorage.setItem("sandbag-tycoon-v1", s), process.env.SAVE);
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(800);
  for (const sel of [".modal.title .btn", ".modal .btn"]) { const b = await page.$(sel); if (b) await b.click(); }
  const c = await page.$("canvas.scene"), box = await c.boundingBox();
  await page.evaluate(() => { window.__ft = []; let l = performance.now(); const f = (t) => { window.__ft.push(t - l); l = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const t0 = Date.now();
  while (Date.now() - t0 < 4000) { await page.mouse.click(box.x + box.width * (0.4 + Math.random() * 0.2), box.y + box.height * 0.45); await page.waitForTimeout(60); }
  const ft = await page.evaluate(() => window.__ft.slice(5));
  ft.sort((a, b) => a - b);
  console.log("frames", ft.length, "median", ft[ft.length >> 1].toFixed(1), "p95", ft[Math.floor(ft.length * 0.95)].toFixed(1));
  await browser.close();
})();
