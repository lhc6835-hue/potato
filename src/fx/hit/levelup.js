// 레벨업: 발밑에서 링이 퍼지고, 빛 기둥 조각과 별이 위로 솟아오른다.
import { Particles, Lights, P, Rng, fit, clamp, ease, WHITE } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Level up",
  desc: "A ring spreads at the feet, light slivers and stars rise up.",
  tags: ["ui", "levelup", "one-shot"],
  size: [80, 100],
  origin: [40, 90],
  duration: 1.1,
  loop: false,
  fps: 30,
  options: { palette: ["#5a3e10", "#9a6c18", "#d8a428", "#ffd84a", "#fff09a", "#fffbe6", "#ffffff"], seed: 61 },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), ps = new Particles({ rng: R }), lights = new Lights();
  lights.add(0, -10, 30, C[4], 0.6, 0.6);
  const slivers = Array.from({ length: 7 }, () => ({ x: R.range(-12, 12), d: R.range(0, 0.25), h: R.range(10, 22), v: R.range(60, 110) }));
  for (let i = 0; i < 14; i++) ps.spawn(P.STAR, R.range(-14, 14), R.range(-6, 0), R.range(-8, 8), -R.range(30, 80), R.range(0.5, 1), C[5], R.chance(0.3) ? 2 : 0.6, R.range(0, 0.3));
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); lights.update(dt); },
    draw(p) {
      const k = clamp(t / 0.5);
      if (k < 1) p.ellipse(0, 0, 6 + 18 * ease.outExpo(k), (6 + 18 * ease.outExpo(k)) * 0.35, (d) => (d > 0.75 ? (k < 0.2 ? WHITE : C[5]) : 0), 1 - k);
      for (const s of slivers) {
        const u = clamp((t - s.d) / 0.6);
        if (u <= 0 || u >= 1) continue;
        const y = -u * s.v, h = s.h * (1 - u);
        p.line(s.x, y, s.x, y - h, u < 0.3 ? WHITE : C[5], 1 - u * 0.5);
        p.glowLine(s.x, y, s.x, y - h, 3, C[4], 0.3 * (1 - u));
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
