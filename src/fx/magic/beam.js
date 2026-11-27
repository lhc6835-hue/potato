// 하늘의 빛기둥 (신성 강타): 가는 빛줄기가 내려오고 → 굵은 기둥으로 터지며 → 가장자리부터 가늘어져 사라진다.
// 바닥에 빛 고리, 위로 떠오르는 빛 알갱이.
import { Particles, Lights, P, Rng, fit, clamp, ease, WHITE } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Heaven beam",
  desc: "A thin line of light comes down, bursts into a thick pillar, narrows away from the edges; a ring of light and rising motes.",
  tags: ["holy", "beam", "strike", "one-shot"],
  size: [100, 220],
  origin: [50, 190],
  duration: 0.9,
  loop: false,
  fps: 30,
  options: { palette: ["#5a3e10", "#9a6c18", "#d8a428", "#ffd84a", "#fff09a", "#fffbe6", "#ffffff"], height: 180, width: 16, seed: 41 },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), H = o.height, W = o.width;
  const ps = new Particles({ rng: R }), lights = new Lights();
  let t = 0, hit = false;
  return {
    update(dt) {
      t += dt;
      if (!hit && t > 0.1) {
        hit = true;
        lights.add(0, 0, 50, C[4], 0.9, 0.5);
        for (let i = 0; i < 24; i++) ps.spawn(P.STAR, R.range(-W, W), R.range(-H * 0.8, 0), R.range(-10, 10), -R.range(30, 90), R.range(0.4, 0.8), C[5], R.chance(0.3) ? 2 : 0.6);
        for (let i = 0; i < 14; i++) { const a = R.range(Math.PI, Math.PI * 2), sp = R.range(80, 200); ps.spawn(P.SPARK, 0, 0, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.2, 0.4), C[5]); }
      }
      ps.update(dt);
      lights.update(dt);
    },
    draw(p) {
      if (t < 0.1) {
        const k = ease.inCubic(clamp(t / 0.1)), y = -H + H * k;
        p.line(0, -H, 0, y, C[5]);
        p.glowLine(0, -H, 0, y, 5, C[4], 0.6);
      } else {
        const k = clamp((t - 0.1) / 0.5), w = W * (k < 0.1 ? 1.3 : 1 - ease.inCubic(k));
        if (w > 0.4) {
          p.shade(-w - 1, -H, w + 1, 2, (x, y, out) => {
            const v = Math.abs(x) / w;
            if (v > 1) return;
            out.c = v < 0.4 ? WHITE : v < 0.75 ? C[5] : C[3];
            out.a = 1;
          });
          p.glowLine(0, -H, 0, 0, w * 2 + 6, C[4], 0.5 * (1 - k));
        }
        const rk = clamp((t - 0.1) / 0.45);
        if (rk < 1) p.ellipse(0, 0, 10 + 30 * ease.outExpo(rk), (10 + 30 * ease.outExpo(rk)) * 0.3, (d) => (d > 0.8 ? C[5] : 0), 1 - rk);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
