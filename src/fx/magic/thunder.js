// 낙뢰: 하늘에서 (0,0)까지 지그재그 번개가 두 번 번쩍이고, 가지가 뻗고, 맞은 자리에서 불똥과 빛 링.
import { Particles, Lights, P, Rng, fit, bolt, forks, clamp, WHITE, TAU } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Thunder strike",
  desc: "A bolt cracks down from the sky twice, forks branch off, the strike point erupts in sparks and a ring of light.",
  tags: ["magic", "lightning", "strike", "one-shot"],
  size: [120, 200],
  origin: [60, 170],
  duration: 0.6,
  loop: false,
  fps: 30,
  options: { palette: ["#172a78", "#2550d0", "#3f8cff", "#7cc8ff", "#c8f0ff", "#fff8b0", "#ffffff"], sparks: ["#ffffff", "#fff08a", "#7cc8ff", "#3f8cff"], height: 160, seed: 12 },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), H = o.height;
  const ps = new Particles({ rng: R, sparks: o.sparks, ground: () => 10 }), lights = new Lights();
  const paths = [0, 1].map(() => {
    const main = bolt(R, R.range(-20, 20), -H, 0, 0, { jag: 0.18, depth: 6 });
    return { main, br: forks(R, main, { count: 4, len: 26, jag: 0.35 }) };
  });
  lights.add(0, -H * 0.5, H * 0.8, C[4], 0.5, 0.25);
  lights.add(0, 0, 40, C[5], 0.9, 0.3);
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + R.range(-1.6, 1.6), sp = R.range(120, 320);
    ps.spawn(P.SPARK, 0, 0, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.15, 0.45));
  }
  for (let i = 0; i < 6; i++) ps.spawn(P.VAPOUR, R.range(-6, 6), R.range(-4, 2), R.range(-40, 40), R.range(-30, 0), R.range(0.3, 0.5), C[4], R.range(4, 6));
  let t = 0;
  const strokes = (p, path, c, w) => {
    for (let i = 1; i < path.length; i++) {
      const [x0, y0] = path[i - 1], [x1, y1] = path[i];
      if (w > 1) p.beam(x0, y0, x1, y1, w, c);
      else p.line(x0, y0, x1, y1, c);
    }
  };
  return {
    update(dt) { t += dt; ps.update(dt); lights.update(dt); },
    draw(p) {
      const which = t < 0.07 ? 0 : t > 0.11 && t < 0.18 ? 1 : -1;
      if (which >= 0) {
        const pa = paths[which];
        for (const b of pa.br) strokes(p, b, C[4], 1);
        strokes(p, pa.main, C[5], 3);
        strokes(p, pa.main, WHITE, 1);
        for (let i = 0; i < pa.main.length; i += 4) p.glow(pa.main[i][0], pa.main[i][1], 10, C[4], 0.35);
      } else if (t < 0.3) {
        const pa = paths[1];
        for (let i = 1; i < pa.main.length; i++) if (i % 2) p.line(pa.main[i - 1][0], pa.main[i - 1][1], pa.main[i][0], pa.main[i][1], C[3], 1 - t / 0.3);
      }
      const k = clamp(t / 0.35);
      if (k < 1) {
        p.ellipse(0, 0, 18 * k + 4, (18 * k + 4) * 0.35, (d) => (d > 0.75 ? (k < 0.3 ? WHITE : C[5]) : 0), 1 - k);
        if (t < 0.08) { p.circle(0, -2, 7, C[5]); p.circle(0, -2, 4.5, WHITE); }
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t * 20, r = 6 + t * 40;
        if (t < 0.25) p.px(Math.cos(a) * r, Math.sin(a) * r * 0.4 - 2, C[6]);
      }
      ps.draw(p);
      lights.draw(p);
    },
  };
}
