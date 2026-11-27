// 치명타: 네 갈래 긴 별빛 플레어가 번쩍 → 가늘어지며 회전, 대각선 짧은 빛, 링.
import { Lights, fit, clamp, ease, WHITE } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Critical flare",
  desc: "A four-point star flare flashes long and thin, turns a little as it shrinks, short diagonal glints, a ring.",
  tags: ["impact", "critical", "flare", "one-shot"],
  size: [120, 120],
  origin: [60, 60],
  duration: 0.45,
  loop: false,
  fps: 30,
  options: { palette: ["#5a3e10", "#9a6c18", "#d8a428", "#ffd84a", "#fff09a", "#fffbe6", "#ffffff"], size: 1 },
};

export function create(o) {
  const C = fit(o.palette, 7), S = o.size, lights = new Lights();
  lights.add(0, 0, 40 * S, C[4], 0.8, 0.25);
  let t = 0;
  return {
    update(dt) { t += dt; lights.update(dt); },
    draw(p) {
      const k = clamp(t / 0.4), e = ease.outCubic(k), L = 44 * S * (1 - e * 0.85) + 4, w = 2.6 * S * (1 - e), rot = e * 0.6;
      if (k < 1) {
        for (let i = 0; i < 4; i++) {
          const a = rot + (i * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a), ll = i % 2 ? L * 0.7 : L;
          p.tri(-s * w, c * w, c * ll, s * ll, s * w, -c * w, k < 0.2 ? WHITE : C[5]);
          p.line(0, 0, c * ll * 0.9, s * ll * 0.9, WHITE);
          p.glowLine(0, 0, c * ll, s * ll, 4, C[4], 0.4 * (1 - k));
        }
        for (let i = 0; i < 4; i++) {
          const a = rot + Math.PI / 4 + (i * Math.PI) / 2, r0 = 6 * S, r1 = r0 + 7 * S * (1 - e);
          p.line(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1, C[5]);
        }
        p.circle(0, 0, 3.5 * S * (1 - e) + 1, WHITE);
        const rk = clamp(t / 0.3);
        if (rk < 1) p.ring(0, 0, (8 + 22 * ease.outExpo(rk)) * S, Math.max(1, 2 * (1 - rk)), C[4], 1 - rk);
      }
      lights.draw(p);
    },
  };
}
