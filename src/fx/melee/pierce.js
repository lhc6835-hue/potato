// 창 찌르기: 앞으로 길게 꿰뚫는 빛줄기(2프레임) → 뚫린 자리 링 → 뒤로 뿜어지는 파편과 속도선.
// 오른쪽으로 찌르는 기준, (0,0) = 뚫린 지점. grade 0~2 (빗나감·굿·퍼펙트)로 크기가 변한다.
import { Particles, Lights, P, Rng, fit, clamp, ease, WHITE } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Spear pierce",
  desc: "A thrust punches through: a long white streak for two frames, an entry ring, debris and speed lines blown out the back.",
  tags: ["melee", "spear", "pierce", "directional", "one-shot"],
  size: [160, 64],
  origin: [60, 32],
  duration: 0.55,
  loop: false,
  fps: 30,
  options: { palette: ["#1d2a5c", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8d4f0", "#e8f1ff", "#ffffff"], sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"], grade: 2, seed: 6 },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), G = o.grade, S = 0.6 + G * 0.3;
  const ps = new Particles({ rng: R, sparks: o.sparks }), lights = new Lights();
  lights.add(0, 0, 30 * S, C[4], 0.6 + G * 0.15, 0.2);
  const lines = [];
  for (let i = 0; i < 4 + G * 3; i++) lines.push({ y: R.range(-7, 7) * S, x0: R.range(-10, 20), len: R.range(18, 50) * S, d: R.range(0, 0.06) });
  for (let i = 0; i < 6 + G * 6; i++) {
    const a = R.range(-0.45, 0.45), sp = R.range(150, 360) * S;
    ps.spawn(P.SPARK, 8, 0, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.3));
  }
  for (let i = 0; i < 4 + G * 4; i++) ps.spawn(P.MOTE, 6, R.range(-3, 3), R.range(80, 200), R.range(-50, 50), R.range(0.2, 0.4), C[5], 0.7);
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); lights.update(dt); },
    draw(p) {
      const k = clamp(t / 0.08);
      if (k < 1) {
        const L = (60 + 40 * G) * ease.outExpo(clamp(t / 0.03)), w = (2 + G) * (1 - k);
        p.beam(-30, 0, L, 0, w * 2 + 1, (u) => (u > 0.7 ? C[5] : WHITE), (u) => Math.min(1, u * 3));
        p.glowLine(-30, 0, L, 0, 8, C[4], 0.6 * (1 - k));
      }
      const rk = clamp(t / 0.25);
      if (rk < 1) {
        // 뚫린 자리: 세로로 납작한 링 (원근)
        p.shade(-14 * S, -16 * S, 14 * S, 16 * S, (x, y, out) => {
          const r = (5 + 12 * ease.outExpo(rk)) * S, d = Math.hypot(x * 2.2, y) - r;
          if (d > 0 || d < -Math.max(1, 2.5 * (1 - rk))) return;
          out.c = rk < 0.3 ? WHITE : C[5];
          out.a = 1 - rk * 0.5;
        });
      }
      for (const l of lines) {
        const u = clamp((t - l.d) / 0.25);
        if (u <= 0 || u >= 1) continue;
        const x0 = l.x0 + u * 70 * S, x1 = x0 + l.len * (1 - u);
        p.line(x0, l.y, x1, l.y, u < 0.4 ? C[6] : C[4], 1 - u * 0.6);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
