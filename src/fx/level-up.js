// 업그레이드: 바닥에서 빛 기둥이 솟고, 별 조각이 올라가며 흩어진다. 마일스톤이면 더 크게.
import { burst, fly, seg, ease, hex, ramp, at, sparkle, WHITE } from "../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Level up", desc: "A quick column of light from the floor, flecks rising and scattering; bigger on milestones.", tags: ["ui"],
  size: [48, 56], origin: [24, 48], duration: 1.1, loop: false, fps: 30, bg: "dark",
  options: { seed: 5, big: false, glowc: ["#3a2a0a", "#a8740e", "#f0c040", "#fff0a0", "#ffffff"] },
};

export function draw(p, t, o) {
  const C = ramp(o.glowc), S = o.big ? 1.6 : 1;
  // 기둥: 바닥에서 솟았다가 아래부터 사라진다 (디더 없이 선으로)
  const rise = ease.outExpo(seg(t, 0, 0.14)), drain = ease.inQuad(seg(t, 0.12, 0.5));
  const top = -28 * S * rise, bottom = top * drain;
  if (drain < 1) {
    const w = Math.round(3 * S);
    p.line(-w, bottom, -w, top, C[3]);
    p.line(w, bottom, w, top, C[3]);
    p.line(0, bottom, 0, top, C[4]);
    p.glowLine(0, bottom, 0, top, 7 * S, C[3], 0.3 * (1 - drain));
  }
  if (t < 0.06) {
    p.ellipse(0, 0, 9 * S, 1.5, C[4]);
    p.glow(0, 0, 14 * S, C[3], 0.5);
  }
  burst(o.big ? 18 : 10, o.seed, (r) => {
    const d = r.range(0.03, 0.25), age = t - d, life = r.range(0.45, 0.8);
    if (age < 0 || age > life) return;
    const [x, y] = fly(r.range(-3, 3) * S, -r.range(0, 10), r.range(-22, 22) * S, -r.range(45, 85) * S, age, -10, 2.4);
    const k = age / life;
    if (r.next() < 0.18 && k < 0.5) sparkle(p, x, y, 1.5, C[4], C[3], 0.6 * (1 - k));
    else p.px(x, y, at(C.slice(1), 1 - k));
    p.light(x, y, C[3], 0.3 * (1 - k));
  });
}
