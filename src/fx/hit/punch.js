// 주먹 타격: 하얀 섬광 한두 프레임 → 별 모양 충격선이 바깥으로 튀고 → 충격 링 → 불똥과 먼지.
// 방향 효과: 오른쪽(+x)으로 치는 기준. angle로 돌린다.
import { Particles, Lights, P, Rng, fit, clamp, ease, TAU, WHITE } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Punch impact",
  desc: "A fist lands: a white hero frame, a burst of impact rays thrown forward, a shock ring, sparks and a puff of dust.",
  tags: ["impact", "punch", "melee", "one-shot"],
  size: [96, 80],
  origin: [40, 40],
  duration: 0.5,
  loop: false,
  fps: 30,
  options: {
    palette: ["#1d2a5c", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8d4f0", "#e8f1ff", "#ffffff"],
    sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
    size: 1,
    seed: 3,
  },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), S = o.size;
  const ps = new Particles({ rng: R, sparks: o.sparks }), lights = new Lights();
  lights.add(0, 0, 26 * S, C[4], 0.7, 0.16);
  lights.add(0, 0, 10 * S, WHITE, 0.8, 0.05);
  // 충격선: 앞쪽(+x)으로 몰려서 튄다
  const rays = [];
  const nr = Math.round(7 + 3 * S);
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * TAU + R.range(-0.2, 0.2), fwd = Math.cos(a);
    rays.push({ a, len: (8 + R.range(0, 8) + fwd * 6) * S, w: R.chance(0.4) ? 2 : 1, d: R.range(0, 0.03) });
  }
  for (let i = 0; i < Math.round(8 * S); i++) {
    const a = R.range(-1.1, 1.1), sp = R.range(110, 280) * Math.sqrt(S);
    ps.spawn(P.SPARK, 2, 0, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.12, 0.3));
  }
  for (let i = 0; i < Math.round(5 * S); i++) {
    const a = R.range(0, TAU), sp = R.range(20, 60);
    ps.spawn(P.VAPOUR, Math.cos(a) * 3, Math.sin(a) * 3, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.35), C[5], R.range(1.5, 2.6) * S);
  }
  for (let i = 0; i < Math.round(6 * S); i++) {
    const a = R.range(-0.9, 0.9) + (R.chance(0.3) ? Math.PI : 0), sp = R.range(60, 150);
    ps.spawn(P.MOTE, 0, 0, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.4), C[5], 0.7);
  }
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); lights.update(dt); },
    draw(p) {
      ps.draw(p, "back");
      // 섬광: 첫 두 프레임은 흰 원, 그다음 링이 퍼진다
      if (t < 0.07) {
        const k = t / 0.07, r = (5 + 4 * k) * S;
        p.circle(0, 0, r + 1.5, C[4]);
        p.circle(0, 0, r, k < 0.5 ? WHITE : C[6]);
      }
      const rk = clamp(t / 0.22);
      if (rk < 1) p.ring(0, 0, (6 + 16 * ease.outExpo(rk)) * S, Math.max(1, 2.5 * (1 - rk) * S), rk < 0.3 ? C[6] : C[4], 1 - rk * 0.6);
      for (const r of rays) {
        const u = clamp((t - r.d) / 0.16);
        if (u <= 0 || u >= 1) continue;
        const e = ease.outExpo(u), r0 = r.len * (0.35 + 0.65 * e) * 0.6, r1 = r.len * (0.5 + 0.9 * e);
        const cx = Math.cos(r.a), sy = Math.sin(r.a);
        const c = u < 0.4 ? WHITE : u < 0.7 ? C[5] : C[3];
        p.line(cx * r0, sy * r0, cx * r1, sy * r1, c);
        if (r.w > 1 && u < 0.6) p.line(cx * r0 + sy, sy * r0 - cx, cx * r1 * 0.9 + sy, sy * r1 * 0.9 - cx, C[4]);
        p.glowLine(cx * r0, sy * r0, cx * r1, sy * r1, 3, C[4], 0.25 * (1 - u));
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
