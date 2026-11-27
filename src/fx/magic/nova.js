// 원 주문(노바): 룬 원진이 그려지며 돌다가(0.25초) 안쪽으로 빨려 들어가 → 하얀 폭발 →
// 두 겹 링과 속성색 불똥이 사방으로, 위로 떠오르는 빛 알갱이로 마무리.
import { Particles, Lights, P, Rng, fit, clamp, ease, TAU, WHITE, smooth } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Rune nova",
  desc: "A rune circle draws itself and spins, collapses inward, then bursts: a white core, twin rings, element sparks and rising motes.",
  tags: ["magic", "nova", "rune", "one-shot"],
  size: [160, 160],
  origin: [80, 80],
  duration: 1.3,
  loop: false,
  fps: 30,
  options: { palette: ["#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff", "#ffffff"], sparks: ["#ffffff", "#ecc8ff", "#c684ff", "#9a48ec"], size: 1, seed: 8 },
};

const BOOM = 0.32;
export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), S = o.size, RAD = 30 * S;
  const ps = new Particles({ rng: R, sparks: o.sparks }), lights = new Lights();
  let t = 0, boomed = false;
  const glyphs = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * TAU, k: R.int(0, 3) }));
  return {
    update(dt) {
      t += dt;
      if (!boomed && t >= BOOM) {
        boomed = true;
        lights.add(0, 0, RAD * 3, C[4], 0.9, 0.5);
        lights.add(0, 0, RAD, WHITE, 1, 0.08);
        for (let i = 0; i < 40 * S; i++) {
          const a = R.range(0, TAU), sp = R.range(120, 340) * S;
          ps.spawn(P.SPARK, Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.55));
        }
        for (let i = 0; i < 16 * S; i++) {
          const a = R.range(0, TAU), sp = R.range(20, 70);
          ps.spawn(P.VAPOUR, Math.cos(a) * RAD * 0.3, Math.sin(a) * RAD * 0.3, Math.cos(a) * sp, Math.sin(a) * sp - 10, R.range(0.4, 0.8), C[3], R.range(4, 7) * S);
        }
        for (let i = 0; i < 18; i++) ps.spawn(P.STAR, R.range(-RAD, RAD), R.range(-RAD, RAD * 0.5), R.range(-10, 10), -R.range(20, 60), R.range(0.5, 0.9), C[5], R.chance(0.3) ? 2 : 0.6);
      }
      if (t < BOOM && R.chance(0.6)) {
        const a = R.range(0, TAU), d = RAD * 1.3;
        ps.spawn(P.STREAK, Math.cos(a) * d, Math.sin(a) * d, -Math.cos(a) * 60, -Math.sin(a) * 60, 0.18, C[5]);
      }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) { ps.draw(p, "back"); },
    draw(p) {
      if (t < BOOM + 0.05) {
        // 원진: 바깥 원을 그려 나가고, 안쪽에 룬, 끝에는 안으로 수축
        const draw = ease.outCubic(clamp(t / 0.16)), shrink = 1 - 0.75 * ease.inCubic(smooth(BOOM - 0.1, BOOM, t)), rot = t * 3;
        const r = RAD * shrink;
        p.arc(0, 0, r, 1.5, rot, rot + TAU * draw, C[5]);
        p.arc(0, 0, r * 0.72, 1, -rot * 1.4, -rot * 1.4 + TAU * draw, C[4]);
        for (const g of glyphs) {
          const a = g.a + rot, x = Math.cos(a) * r * 0.86, y = Math.sin(a) * r * 0.86;
          if (draw < 0.9) continue;
          if (g.k === 0) p.line(x - 1.5, y - 1.5, x + 1.5, y + 1.5, C[6]);
          else if (g.k === 1) { p.px(x, y, C[6]); p.px(x, y - 2, C[6]); }
          else p.line(x - 1.5, y, x + 1.5, y, C[6]);
        }
        for (let i = 0; i < 3; i++) {
          const a = rot * 0.7 + (i / 3) * TAU;
          p.line(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, Math.cos(a + 2.094) * r * 0.72, Math.sin(a + 2.094) * r * 0.72, C[3]);
        }
        p.glowRing(0, 0, r, 6, C[4], 0.35);
        p.glow(0, 0, r, C[4], 0.25 + 0.4 * smooth(0, BOOM, t));
      }
      const u = t - BOOM;
      if (u >= 0) {
        if (u < 0.1) {
          const r = RAD * (0.5 + u * 4);
          p.circle(0, 0, r + 2, C[4]);
          p.circle(0, 0, r, u < 0.05 ? WHITE : C[6]);
        }
        for (const [d, k, th] of [[0, 1.6, 4], [0.06, 1.1, 2]]) {
          const e = clamp((u - d) / 0.45);
          if (e > 0 && e < 1) p.ring(0, 0, RAD * (0.4 + k * ease.outExpo(e)), Math.max(1, th * (1 - e)), e < 0.2 ? WHITE : C[5], 1 - e * 0.5);
        }
      }
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
