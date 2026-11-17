// 튀김기 기름: 수면에서 거품이 올라와 터지고, 뜨거운 기름이 아래에서 빛난다. 루프.
import { cycle, TAU, hex, ramp, at } from "../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Oil bubbles", desc: "Frying oil: bubbles rise, pop with a spark of light; the oil glows warm.", tags: ["kitchen", "loop"],
  size: [32, 20], origin: [16, 12], duration: 1.5, loop: true, fps: 30, bg: "dark",
  options: { seed: 2, width: 14, oil: ["#6a3a0a", "#a8640e", "#e0a01e", "#ffd65a", "#fff3b0"] },
};

export function draw(p, t, o) {
  const C = ramp(o.oil), w = o.width;
  // 기름 수면
  for (let x = -w / 2; x < w / 2; x++) {
    const wave = Math.sin(x * 0.9 + t * TAU * 2 / meta.duration) > 0.6 ? 1 : 0;
    p.px(x, -wave, C[2 + wave]);
    p.px(x, 1, C[1]);
    p.px(x, 2, C[0]);
  }
  cycle(t, meta.duration, 10, o.seed, (g) => g.range(0.25, 0.5), (age, life, r) => {
    const k = age / life, x = Math.round(r.range(-w / 2 + 1, w / 2 - 1));
    if (k < 0.75) {
      const y = Math.round(1 - k * 2);
      p.px(x, y - 1, at(C.slice(2), k));
    } else {
      // 팡: 십자 모양 작은 튐
      const s = Math.round(1 + (k - 0.75) * 6);
      p.px(x - s, -2, C[4]);
      p.px(x + s, -2, C[4]);
      p.px(x, -2 - s, C[3]);
      p.light(x, -2, C[3], 0.6);
    }
  });
  p.glow(0, 0, w * 0.9, C[3], 0.22);
}
