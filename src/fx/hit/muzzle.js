// 총구 화염: 앞으로 뻗는 별꼴 섬광(2프레임) → 연기 한 줌이 앞으로 굴러 나가며 흩어진다.
import { Particles, Lights, P, Rng, fit, WHITE, ease, clamp } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Muzzle flash",
  desc: "A forward star of flame for two frames, side spurts, then a puff of smoke rolling out ahead.",
  tags: ["gun", "muzzle", "flash", "directional", "one-shot"],
  size: [80, 48],
  origin: [16, 24],
  duration: 0.5,
  loop: false,
  fps: 30,
  options: { palette: ["#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"], size: 1, seed: 2 },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), S = o.size;
  const ps = new Particles({ rng: R }), lights = new Lights();
  lights.add(4, 0, 22 * S, C[4], 0.8, 0.08);
  for (let i = 0; i < 3; i++) ps.spawn(P.SMOKE, 4, 0, R.range(30, 90) * S, R.range(-12, 6), R.range(0.3, 0.45), 0, R.range(2, 3.5) * S, 0.02);
  for (let i = 0; i < 3; i++) ps.spawn(P.SPARK, 2, 0, R.range(150, 300), R.range(-60, 60), R.range(0.06, 0.14));
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); lights.update(dt); },
    draw(p) {
      ps.draw(p, "back");
      const k = clamp(t / 0.07);
      if (k < 1) {
        const L = 19 * S * (1 - k * 0.4), w = 5 * S * (1 - k);
        p.tri(0, -w, L, 0, 0, w, k < 0.5 ? C[5] : C[4]);
        p.tri(0, -w * 0.5, L * 0.75, 0, 0, w * 0.5, WHITE);
        p.tri(2, 0, 7 * S, -8 * S * (1 - k), 9 * S, 0, C[4]);
        p.tri(2, 0, 7 * S, 8 * S * (1 - k), 9 * S, 0, C[4]);
        p.circle(1, 0, 3.5 * S * (1 - k * 0.5), WHITE);
        p.glowLine(0, 0, L, 0, 6 * S, C[4], 0.6 * (1 - k));
      } else if (t < 0.12) {
        const r = 4 * S * ease.outQuad(clamp((t - 0.07) / 0.05));
        p.ring(4, 0, r + 2, 1, C[3], 0.7);
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
