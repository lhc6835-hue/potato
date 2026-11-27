// 총알·작은 타격: 튕겨 나가는 불똥 몇 개, 작은 하얀 점 섬광, 파편 먼지 한 줌. angle = 총알이 날아온 방향.
import { Particles, Lights, P, Rng, fit, WHITE } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Bullet spark",
  desc: "A small hit: a white pinpoint, sparks kicked back the way the shot came, a pinch of dust.",
  tags: ["impact", "bullet", "spark", "one-shot"],
  size: [64, 48],
  origin: [32, 24],
  duration: 0.4,
  loop: false,
  fps: 30,
  options: { palette: ["#1d2a5c", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8d4f0", "#e8f1ff", "#ffffff"], sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"], size: 1, seed: 4 },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), S = o.size;
  const ps = new Particles({ rng: R, sparks: o.sparks }), lights = new Lights();
  lights.add(0, 0, 12 * S, C[4], 0.6, 0.1);
  for (let i = 0; i < Math.round(5 * S + 1); i++) {
    const a = Math.PI + R.range(-0.9, 0.9), sp = R.range(90, 220);
    ps.spawn(P.SPARK, 0, 0, Math.cos(a) * sp, Math.sin(a) * sp - 30, R.range(0.1, 0.25));
  }
  for (let i = 0; i < 3; i++) ps.spawn(P.VAPOUR, 0, 0, R.range(-30, -5), R.range(-20, 20), R.range(0.15, 0.3), C[5], R.range(1.2, 2.2) * S);
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); lights.update(dt); },
    draw(p) {
      ps.draw(p, "back");
      if (t < 0.05) {
        const r = 2.5 * S;
        p.circle(0, 0, r + 1, C[4]);
        p.circle(0, 0, r, WHITE);
        p.line(-r * 2.5, 0, r * 2.5, 0, C[5]);
        p.line(0, -r * 2, 0, r * 2, C[5]);
      } else if (t < 0.1) p.ring(0, 0, 4 * S, 1, C[5]);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
