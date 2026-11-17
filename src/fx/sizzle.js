// 철판 지글지글: 작은 기름 방울이 튀어 오르고 떨어진다. 루프.
import { cycle, fly, hex, ramp, at } from "../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Sizzle", desc: "Griddle sizzle: tiny drops of oil spit up and fall, with flecks of light.", tags: ["kitchen", "loop"],
  size: [36, 24], origin: [18, 18], duration: 1.2, loop: true, fps: 30, bg: "dark",
  options: { seed: 3, width: 16, spark: ["#a8640e", "#f0b040", "#fff0b0"] },
};

export function draw(p, t, o) {
  const C = ramp(o.spark), w = o.width;
  cycle(t, meta.duration, 14, o.seed, (g) => g.range(0.18, 0.4), (age, life, r) => {
    const k = age / life;
    const [x, y] = fly(r.range(-w / 2, w / 2), 0, r.range(-25, 25), r.range(-55, -30), age, 260);
    if (y > 0.5) return;
    p.px(x, y, at(C, 1 - k));
    p.light(x, y, C[1], 0.35 * (1 - k));
  });
}
