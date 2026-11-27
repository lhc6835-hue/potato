// 마법탄 명중: 작은 하얀 점 → 속성색 다이아몬드 링이 퍼지고 → 빛 알갱이 몇 개가 흩어진다.
import { Particles, Lights, P, Rng, fit, clamp, ease, TAU, WHITE } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Magic pop",
  desc: "A small magic hit: a white point, a diamond ring of element color, a few twinkling motes.",
  tags: ["magic", "impact", "one-shot"],
  size: [64, 64],
  origin: [32, 32],
  duration: 0.5,
  loop: false,
  fps: 30,
  options: { palette: ["#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff", "#ffffff"], sparks: ["#ffffff", "#ecc8ff", "#c684ff", "#9a48ec"], size: 1, seed: 1 },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), S = o.size;
  const ps = new Particles({ rng: R, sparks: o.sparks }), lights = new Lights();
  lights.add(0, 0, 18 * S, C[4], 0.7, 0.2);
  for (let i = 0; i < 8 * S; i++) {
    const a = R.range(0, TAU), sp = R.range(40, 140) * S;
    ps.spawn(R.chance(0.5) ? P.SPARK : P.STAR, 0, 0, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.45), C[5], R.chance(0.3) ? 1.6 : 0.6);
  }
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); lights.update(dt); },
    draw(p) {
      const k = clamp(t / 0.3);
      if (t < 0.05) { p.circle(0, 0, 4 * S, C[5]); p.circle(0, 0, 2.5 * S, WHITE); }
      if (k < 1) {
        const r = (4 + 12 * ease.outExpo(k)) * S;
        p.shade(-r - 1, -r - 1, r + 1, r + 1, (x, y, out) => {
          const d = Math.abs(x) + Math.abs(y);
          if (d > r || d < r - Math.max(1, 2 * (1 - k))) return;
          out.c = k < 0.3 ? WHITE : C[5];
          out.a = 1 - k * 0.6;
        });
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
