// 둔기 강타: 하얀 히어로 프레임 → 두 겹 충격 링 → 사방으로 굵은 충격선 → 돌 파편이 튀고 굴러 떨어지며
// 먼지 구름이 피어오른다. floor 옵션이 있으면 그 높이에 바닥 충격파(납작한 타원)가 앞뒤로 퍼진다.
import { Particles, Bits, Lights, P, PF, B, Rng, fit, band, clamp, ease, TAU, WHITE, hex, mix, scale } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Heavy slam",
  desc: "A hammer lands: a white hero frame, twin shock rings, thick rays, rocks thrown and tumbling, dust rolling, a floor shockwave.",
  tags: ["impact", "hammer", "heavy", "one-shot"],
  size: [220, 160],
  origin: [110, 80],
  duration: 1.6,
  loop: false,
  fps: 30,
  bg: "ground",
  options: {
    palette: ["#1d2a5c", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8d4f0", "#e8f1ff", "#ffffff"],
    sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
    stone: "#6a5a4a",
    size: 1,
    floor: 40,
    seed: 9,
  },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), S = o.size, FY = o.floor;
  const st = hex(o.stone), stL = mix(scale(st, 1.35), WHITE, 0.1), stD = scale(st, 0.62), dust = mix(st, hex("#a89a8a"), 0.5);
  const ground = () => FY;
  const ps = new Particles({ rng: R, sparks: o.sparks, ground }), rocks = new Bits({ ground }), lights = new Lights();
  lights.add(0, 0, 60 * S, C[4], 0.8, 0.35);
  lights.add(0, 0, 20 * S, WHITE, 1, 0.07);
  const rays = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + R.range(-0.3, 0.3);
    rays.push({ a, len: R.range(18, 44) * S, d: R.range(0, 0.05), w: R.chance(0.4) ? 3 : 1.5 });
  }
  for (let i = 0; i < Math.round(22 * S); i++) {
    const a = R.range(0, TAU), sp = R.range(160, 380) * Math.sqrt(S);
    ps.spawn(P.SPARK, 0, 0, Math.cos(a) * sp, Math.sin(a) * sp - 60, R.range(0.2, 0.5));
  }
  for (let i = 0; i < Math.round(14 * S); i++)
    rocks.add({ kind: B.CHUNK, x: R.range(-5, 5), y: R.range(-4, 4), vx: R.range(-200, 200) * S, vy: -R.range(100, 330) * S, g: 1, drag: 0.4, bounce: 0.35, life: R.range(0.9, 1.4), a: R.range(0, TAU), va: R.range(-14, 14), s: R.int(1, 3) });
  for (let i = 0; i < Math.round(10 * S); i++) {
    const a = R.range(0, TAU), sp = R.range(30, 110) * S;
    ps.spawn(P.SMOKE, Math.cos(a) * 6, Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp * 0.5 - 20, R.range(0.7, 1.3), dust, R.range(4, 7) * S, R.range(0, 0.06), PF.BIG);
  }
  if (FY < 200)
    for (let i = 0; i < Math.round(12 * S); i++) {
      const s = R.sign();
      ps.spawn(P.DUST, s * R.range(0, 14), FY - 2, s * R.range(60, 200) * S, -R.range(4, 26), R.range(0.5, 1), dust, R.range(3, 6) * S, R.range(0, 0.05));
      ps.spawn(P.GRIT, s * R.range(0, 10), FY - 1, s * R.range(30, 140), -R.range(80, 240), R.range(0.6, 1.1), R.pick([stL, st, stD]), R.chance(0.4) ? 2 : 1);
    }
  let t = 0;
  const rock = (p, b) => {
    const r = 0.7 + b.s * 0.8, fade = Math.min(1, b.life / 0.4), lx = Math.cos(b.a) * 0.4, ly = Math.sin(b.a) * 0.4;
    p.shade(b.x - r - 1, b.y - r - 1, b.x + r + 1, b.y + r + 1, (x, y, out) => {
      const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx * 1.15, dy);
      if (d > r + 0.9) return;
      const lit = dx * lx + dy * ly;
      out.c = d > r ? hex("#1a1422") : lit < -0.3 ? stL : lit > 0.5 ? stD : st;
      out.a = fade;
    });
  };
  return {
    update(dt) { t += dt; ps.update(dt); rocks.update(dt); lights.update(dt); },
    drawBack(p) {
      ps.draw(p, "back");
      const k = t / 0.6;
      if (k < 1 && FY < 200) band(p, 0, FY, 110 * S * ease.outCubic(k), 0.16, Math.max(1, 4 * (1 - k)), 1.1 - k, [stD, st, C[3], C[6]], (g) => Math.sin(g) < 0);
    },
    draw(p) {
      const k = t / 0.6;
      if (k < 1 && FY < 200) band(p, 0, FY, 110 * S * ease.outCubic(k), 0.16, Math.max(1, 4 * (1 - k)), 1.1 - k, [stD, st, C[3], C[6]], (g) => Math.sin(g) >= 0);
      if (t < 0.09) {
        const r = (10 + 8 * (t / 0.09)) * S;
        p.circle(0, 0, r + 2, C[3]);
        p.circle(0, 0, r, t < 0.045 ? WHITE : C[6]);
        p.circle(0, 0, r * 0.55, WHITE);
      }
      for (const [d, r1, th] of [[0, 52, 4], [0.05, 34, 2]]) {
        const u = clamp((t - d) / 0.32);
        if (u > 0 && u < 1) p.ring(0, 0, (10 + r1 * ease.outExpo(u)) * S, Math.max(1, th * (1 - u) * S), u < 0.25 ? WHITE : C[5 - (u > 0.6 ? 1 : 0)], 1 - u * 0.5);
      }
      for (const r of rays) {
        const u = clamp((t - r.d) / 0.22);
        if (u <= 0 || u >= 1) continue;
        const e = ease.outExpo(u), c = Math.cos(r.a), s = Math.sin(r.a), r0 = r.len * 0.75 * e + 12 * S, r1 = r.len * e + 16 * S;
        p.beam(c * r0, s * r0, c * r1, s * r1, r.w * (1 - u) + 1, u < 0.3 ? WHITE : C[5]);
        p.glowLine(c * r0, s * r0, c * r1, s * r1, 5, C[4], 0.3 * (1 - u));
      }
      for (const b of rocks.list) rock(p, b);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
