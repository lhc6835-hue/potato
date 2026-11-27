// 블랙홀 (심연의 마도서): 검은 중심에 보랏빛 소용돌이 팔이 감기며 주변 알갱이를 빨아들이다가 → 안으로 무너지며 섬광.
import { Particles, Lights, P, Rng, fit, clamp, smooth, TAU, WHITE } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Void vortex",
  desc: "A black core with violet spiral arms winding in, pulling motes in, then collapsing into a flash.",
  tags: ["shadow", "vortex", "blackhole", "one-shot"],
  size: [140, 140],
  origin: [70, 70],
  duration: 2.4,
  loop: false,
  fps: 30,
  options: { palette: ["#0f0a18", "#2c1a4a", "#4a2470", "#7a3aa8", "#b060e0", "#e0a8ff", "#fff0ff"], size: 1, seed: 51 },
};

const END = 2;
export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), S = o.size, RAD = 22 * S;
  const ps = new Particles({ rng: R }), lights = new Lights();
  let t = 0, popped = false;
  return {
    update(dt) {
      t += dt;
      if (t < END && R.chance(0.5)) {
        const a = R.range(0, TAU), d = RAD * R.range(1.6, 2.4);
        ps.spawn(P.STREAK, Math.cos(a) * d, Math.sin(a) * d, -Math.cos(a + 0.6) * 70, -Math.sin(a + 0.6) * 70, 0.3, C[5]);
      }
      if (!popped && t >= END) {
        popped = true;
        lights.add(0, 0, RAD * 3, C[4], 0.9, 0.3);
        for (let i = 0; i < 30; i++) { const a = R.range(0, TAU), sp = R.range(100, 260); ps.spawn(P.SPARK, 0, 0, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.4), C[5]); }
      }
      ps.update(dt);
      lights.update(dt);
    },
    draw(p) {
      if (t < END) {
        const grow = smooth(0, 0.3, t) * (1 - smooth(END - 0.25, END, t) * 0.9), r = RAD * grow;
        p.shade(-r * 1.6, -r * 1.6, r * 1.6, r * 1.6, (x, y, out) => {
          const d = Math.hypot(x, y) / r;
          if (d > 1.5) return;
          if (d < 0.38) return C[0];
          const a = Math.atan2(y, x), sw = Math.sin(a * 3 - t * 9 + d * 7);
          if (d < 0.48) { out.c = C[5]; out.k = 0.4; out.l = C[4]; return; }
          if (sw > 0.35 - d * 0.3) { out.c = d < 0.8 ? C[4] : d < 1.1 ? C[3] : C[2]; out.a = clamp(1.5 - d); out.k = 0.15; return; }
          if (d < 1) { out.c = C[1]; out.a = 0.8; }
        });
        p.glowRing(0, 0, r * 0.45, 6, C[4], 0.5);
      } else if (t < END + 0.08) {
        p.circle(0, 0, 9 * S, C[5]);
        p.circle(0, 0, 5 * S, WHITE);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
