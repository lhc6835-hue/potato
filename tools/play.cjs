// 개발용: 브라우저로 게임을 열어 조작하고 스크린샷을 찍는다. node tools/play.cjs <시나리오> <출력.png>
const { chromium, devices } = require("playwright");
(async () => {
  const [, , scen = "tap", out = "records/play.png", dev = "phone"] = process.argv;
  const browser = await chromium.launch();
  const ctx = dev === "phone" ? await browser.newContext({ ...devices["iPhone 13"] }) : await browser.newContext({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.addInitScript((s) => { if (s) localStorage.setItem("sandbag-tycoon-v1", s); }, process.env.SAVE || "");
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(800);
  const title = await page.$(".modal.title .btn");
  if (title) await title.click();
  const off = await page.$(".modal .btn");
  if (off) await off.click();
  await page.waitForTimeout(300);
  const c = await page.$("canvas.scene");
  const box = await c.boundingBox();
  const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
  const m = page.mouse;
  const steps = { 
    tap: async () => { for (let i = 0; i < 12; i++) { const [x, y] = at(0.5 + (i % 3 - 1) * 0.05, 0.42); await m.click(x, y); await page.waitForTimeout(70); } },
    swipe: async () => { for (let i = 0; i < 3; i++) { const [x0, y0] = at(0.15, 0.35), [x1, y1] = at(0.85, 0.5); await m.move(x0, y0); await m.down(); await m.move(x1, y1, { steps: 6 }); await m.up(); await page.waitForTimeout(120); } const [x0, y0] = at(0.2, 0.3), [x1, y1] = at(0.8, 0.55); await m.move(x0, y0); await m.down(); await m.move(x1, y1, { steps: 5 }); },
    hold: async () => { const [x, y] = at(0.5, 0.42); await m.move(x, y); await m.down(); await page.waitForTimeout(900); },
    charge: async () => { const [x, y] = at(0.5, 0.42); await m.move(x, y); await m.down(); await page.waitForTimeout(850); await m.up(); await page.waitForTimeout(110); },
    charging: async () => { const [x, y] = at(0.5, 0.42); await m.move(x, y); await m.down(); await page.waitForTimeout(800); },
    timing: async () => { for (let i = 0; i < 4; i++) { const [x, y] = at(0.5, 0.5); await m.click(x, y); await page.waitForTimeout(260); } },
    throw: async () => { for (let i = 0; i < 5; i++) { const [x0, y0] = at(0.4 + i * 0.05, 0.85), [x1, y1] = at(0.45 + i * 0.03, 0.6); await m.move(x0, y0); await m.down(); await m.move(x1, y1, { steps: 2 }); await m.up(); await page.waitForTimeout(90); } },
    bow: async () => { const [x0, y0] = at(0.35, 0.6), [x1, y1] = at(0.15, 0.8); await m.move(x0, y0); await m.down(); await m.move(x1, y1, { steps: 8 }); await page.waitForTimeout(200); },
    bowshot: async () => { const [x0, y0] = at(0.35, 0.6), [x1, y1] = at(0.15, 0.8); await m.move(x0, y0); await m.down(); await m.move(x1, y1, { steps: 8 }); await m.up(); await page.waitForTimeout(140); },
    rune: async () => { const [cx, cy] = at(0.5, 0.45); await m.move(cx + 50, cy); await m.down(); for (let i = 0; i <= 26; i++) { const a = (i / 24) * Math.PI * 2; await m.move(cx + Math.cos(a) * 50, cy + Math.sin(a) * 60); } await m.up(); await page.waitForTimeout(450); },
    zig: async () => { const [cx, cy] = at(0.5, 0.45); await m.move(cx - 40, cy - 40); await m.down(); for (let i = 0; i < 6; i++) await m.move(cx + (i % 2 ? 40 : -40), cy - 40 + i * 16, { steps: 3 }); await m.up(); await page.waitForTimeout(60); },
    whirl: async () => { const [cx, cy] = at(0.35, 0.62); await m.move(cx, cy); await m.down(); for (let i = 0; i < 70; i++) { const a = i * 0.45; await m.move(cx + Math.cos(a) * 45, cy + Math.sin(a) * 45); await page.waitForTimeout(12); } },
    none: async () => {},
  };
  await (steps[scen] || steps.none)();
  if (process.env.WAIT) await page.waitForTimeout(+process.env.WAIT);
  await page.screenshot({ path: out });
  console.log(out, errs.length ? "ERRORS:\n" + errs.join("\n") : "no errors");
  await browser.close();
})();
