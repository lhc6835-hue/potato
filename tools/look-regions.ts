import { sheet, painterFor } from "./shot";
import { REGIONS, BAGS } from "../src/data/bags";
import { drawBackdrop, drawAmbient, drawBeam } from "../src/game/backdrop";
import { Bag } from "../src/game/bag";
import { createFrame, clearFrame } from "../src/vendor/pixelfx/core/index.js";
const W = 196, H = 250, FY = H - 46;
sheet("regions", W * 4, H * 2, 2, (f) => {
  REGIONS.forEach((r, i) => {
    const sub = createFrame(W, H, -(i % 4) * W, -Math.floor(i / 4) * H);
    void sub;
    const p = painterFor(f);
    const ox = (i % 4) * W, oy = Math.floor(i / 4) * H;
    // 오프셋 프레임 대신 painter 평행이동을 흉내: 작은 프레임에 그려서 복사
    const g = createFrame(W, H); clearFrame(g);
    const q = painterFor(g);
    drawBackdrop(q, r, W, H, FY);
    drawAmbient(q, r, W, H, FY, 1.3, false);
    drawBeam(q, r, W, 14);
    const b = new Bag(BAGS.find((x) => x.region === r.id)!, 1, { seed: 3 });
    b.ax = W / 2; b.ay = 14; b.L = FY - 26 - b.geo.H - 14; b.entering = false; b.drop = 0;
    b.draw(painterFor(g), () => {});
    drawAmbient(painterFor(g), r, W, H, FY, 1.3, true);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = g.color[y * W + x], l = g.light[y * W + x];
      if (c) f.color[(oy + y) * f.w + ox + x] = c;
      if (l) f.light[(oy + y) * f.w + ox + x] = l;
    }
    void p;
  });
});
