// 폭발 (폭탄·불화살·운석·혜성): 하얀 불덩이 → 불 구름이 식으며 연기 기둥으로, 불똥·불씨, 충격 링.
// size로 규모 조절. 바닥(floor)이 있으면 먼지가 바닥을 따라 퍼진다.
import { Particles, Lights, P, PF, Rng, fit, clamp, ease, TAU, WHITE, rgb } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Fire blast",
  desc: "A fireball: a white core, fire puffs that cool into a smoke column, sparks and embers, a shock ring.",
  tags: ["explosion", "fire", "smoke", "one-shot"],
  size: [200, 180],
  origin: [100, 110],
  duration: 3,
  loop: false,
  fps: 30,
  options: { palette: ["#4a1712", "#c9281f", "#f2561d", "#ff8a2a", "#ffc23d", "#ffe26b", "#fff3a6"], size: 1, floor: 999, seed: 21 },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), S = o.size, RAD = 16 * S, FY = o.floor;
  const ps = new Particles({ rng: R, sparks: [C[6], C[5], C[3], C[2]], ground: () => FY }), lights = new Lights();
  lights.add(0, 0, RAD * 4, rgb(255, 170, 90), 0.75, 0.6);
  lights.add(0, 0, RAD * 1.6, WHITE, 0.8, 0.08);
  for (let i = 0; i < Math.round(22 * S); i++) {
    const a = R.range(0, TAU), d = R.range(0, RAD * 0.5), sp = R.range(40, 180) * Math.sqrt(S);
    ps.spawn(P.FIRE, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * sp, Math.sin(a) * sp * 0.8 - 30, R.range(0.45, 0.95), 0, R.range(RAD * 0.25, RAD * 0.48), 0, R.chance(0.5) ? PF.SMOKES | PF.BIG : 0);
  }
  for (let i = 0; i < Math.round(8 * S); i++) {
    const a = R.range(0, TAU), d = R.range(0, RAD * 0.6), sp = R.range(10, 60);
    ps.spawn(P.SMOKE, Math.cos(a) * d, Math.sin(a) * d, Math.cos(a) * sp, Math.sin(a) * sp * 0.5 - 30, R.range(1.2, 1.9), 0, R.range(RAD * 0.25, RAD * 0.42), R.range(0.08, 0.3), PF.BIG);
  }
  for (let i = 0; i < Math.round(40 * S); i++) {
    const a = R.range(0, TAU), sp = R.range(130, 360) * Math.sqrt(S);
    ps.spawn(P.SPARK, 0, 0, Math.cos(a) * sp, Math.sin(a) * sp - 60, R.range(0.2, 0.55));
  }
  for (let i = 0; i < Math.round(16 * S); i++) {
    const a = R.range(0, TAU), sp = R.range(30, 120);
    ps.spawn(P.EMBER, Math.cos(a) * RAD * 0.4, Math.sin(a) * RAD * 0.4, Math.cos(a) * sp, Math.sin(a) * sp - 60, R.range(0.9, 1.8), C[3]);
  }
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); lights.update(dt); },
    drawBack(p) { ps.draw(p, "back"); },
    draw(p) {
      if (t < 0.08) {
        const k = t / 0.08, r = RAD * (0.9 + 0.3 * k);
        p.circle(0, 0, r + 1.5, C[2]);
        p.circle(0, 0, r, k < 0.5 ? C[6] : C[5]);
        p.circle(0, 0, r * 0.6, WHITE);
      }
      for (const [d, k, th] of [[0, 3, 3], [0.03, 1.8, 1.6]]) {
        const u = clamp((t - d) / 0.34);
        if (u > 0 && u < 1) p.ring(0, 0, RAD * (0.5 + k * ease.outExpo(u)), Math.max(1, th * (1 - u) * Math.sqrt(S)), u < 0.25 ? C[6] : C[4], 1 - u * 0.4);
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
