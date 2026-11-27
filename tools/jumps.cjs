// 개발용: 무기 9종에 같은 입력을 넣고 프레임마다 무기 위치·각도가 얼마나 튀는지 잰다. dev 서버 필요: node tools/jumps.cjs
// 무기 9종: 같은 입력을 넣고 프레임마다 무기 그림의 위치·각도를 기록, 한 프레임에 크게 바뀐 곳을 센다
const { chromium, devices } = require("playwright");
const { execSync } = require("child_process");
const W = ["fist0", "sw3", "gun2", "ham2", "sp2", "th1", "bw2", "st2", "fl2"];
(async () => {
  const b = await chromium.launch();
  const res = {};
  for (const w of W) {
    const ctx = await b.newContext({ ...devices["iPhone 13"] }); const p = await ctx.newPage();
    const save = execSync(`node tools/mksave.cjs ${w} 4`).toString();
    await p.addInitScript((s) => localStorage.setItem("sandbag-tycoon-v1", s), save);
    await p.goto("http://localhost:5173/"); await p.waitForTimeout(700);
    for (const sel of [".modal.title .btn", ".modal .btn"]) { const e = await p.$(sel); if (e) await e.click(); }
    const ok = await p.evaluate(() => !!(window.__G && window.__G.ctl.probe));
    if (!ok) { res[w] = "probe 없음"; await ctx.close(); continue; }
    await p.evaluate(() => {
      window.__f = []; window.__ev = 0;
      const f = () => { const G = window.__G; window.__f.push({ pts: G.ctl.probe(), ev: window.__ev, empty: !G.bag || G.bag.dead || G.bag.entering, frz: G.freeze > 0 }); requestAnimationFrame(f); };
      requestAnimationFrame(f);
    });
    const c = await (await p.$("canvas.scene")).boundingBox();
    const at = (fx, fy) => [c.x + c.width * fx, c.y + c.height * fy];
    const m = p.mouse;
    const mark = () => p.evaluate(() => window.__ev++);
    for (let r = 0; r < 3; r++) {
      for (const [fx, fy] of [[0.5, 0.45], [0.2, 0.9], [0.85, 0.3], [0.5, 0.95], [0.1, 0.2]]) { await mark(); await m.click(...at(fx, fy)); await p.waitForTimeout(45); }
      await mark(); await m.move(...at(0.15, 0.35)); await m.down(); await m.move(...at(0.85, 0.5), { steps: 6 }); await m.up(); await p.waitForTimeout(80);
      await mark(); await m.move(...at(0.6, 0.6)); await m.down(); await m.move(...at(0.61, 0.6)); await p.waitForTimeout(350); await m.move(...at(0.3, 0.85), { steps: 5 }); await m.up(); await p.waitForTimeout(80);
      await mark(); const [cx, cy] = at(0.5, 0.45); await m.move(cx + 50, cy); await m.down(); for (let i = 0; i <= 20; i++) { const a = (i / 18) * Math.PI * 2; await m.move(cx + Math.cos(a) * 50, cy + Math.sin(a) * 55); } await m.up();
      await p.waitForTimeout(300);
    }
    await p.waitForTimeout(600);
    res[w] = await p.evaluate(() => {
      const f = window.__f; let maxD = 0, maxA = 0, big = 0, emptyBig = 0;
      for (let i = 1; i < f.length; i++) {
        const a = f[i - 1].pts, bb = f[i].pts;
        for (let k = 0; k < Math.min(a.length, bb.length); k++) {
          const d = Math.hypot(bb[k][0] - a[k][0], bb[k][1] - a[k][1]);
          let da = Math.abs(bb[k][2] - a[k][2]); da = Math.min(da, Math.PI * 2 - da);
          if (!isFinite(d)) continue;
          maxD = Math.max(maxD, d); maxA = Math.max(maxA, da);
          if (d > 25 || da > 0.7) { big++; if (f[i].empty) emptyBig++; }
        }
      }
      return { frames: f.length, 최대이동px: +maxD.toFixed(1), 최대회전rad: +maxA.toFixed(2), 큰튐: big, 빈샌드백중: emptyBig };
    });
    await ctx.close();
  }
  for (const [k, v] of Object.entries(res)) console.log(k.padEnd(6), JSON.stringify(v));
  await b.close();
})();
