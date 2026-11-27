// 얼음·수정 파쇄: 하얀 섬광 → 회전하는 날카로운 파편들이 튀어 바닥에서 미끄러지고, 반짝이는 가루가 내린다.
import { Particles, Bits, Lights, P, B, Rng, fit, clamp, ease, TAU, WHITE } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Shatter",
  desc: "Ice shatters: a white flash, spinning shards thrown out that skid on the floor, glittering powder drifting down.",
  tags: ["ice", "shatter", "impact", "one-shot"],
  size: [180, 140],
  origin: [90, 70],
  duration: 1.4,
  loop: false,
  fps: 30,
  options: { palette: ["#162c5c", "#1f4f94", "#2f7fcc", "#58b4ec", "#9bdcff", "#d8f4ff", "#ffffff"], size: 1, floor: 60, seed: 31 },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), S = o.size;
  const ground = () => o.floor, ps = new Particles({ rng: R, sparks: [C[6], C[5], C[4], C[3]], ground }), bits = new Bits({ ground }), lights = new Lights();
  lights.add(0, 0, 40 * S, C[4], 0.8, 0.3);
  for (let i = 0; i < Math.round(18 * S); i++)
    bits.add({ kind: B.SHARD, x: R.range(-6, 6), y: R.range(-8, 8), vx: R.range(-220, 220) * S, vy: -R.range(60, 280), a: R.range(0, TAU), va: R.range(-18, 18), s: R.range(2, 5) * S, c: R.pick([C[4], C[5], C[3]]), ramp: C, g: 1, drag: 0.6, bounce: 0.25, life: R.range(0.8, 1.3) });
  for (let i = 0; i < Math.round(26 * S); i++) {
    const a = R.range(0, TAU), sp = R.range(30, 140);
    ps.spawn(P.FLAKE, Math.cos(a) * 6, Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp - 40, R.range(0.6, 1.2), C[R.int(4, 6)], R.chance(0.3) ? 2 : 1);
  }
  for (let i = 0; i < 6; i++) ps.spawn(P.VAPOUR, R.range(-8, 8), R.range(-8, 8), R.range(-40, 40), R.range(-30, 10), R.range(0.5, 0.9), C[5], R.range(4, 7) * S);
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); bits.update(dt); lights.update(dt); },
    draw(p) {
      ps.draw(p, "back");
      if (t < 0.07) { p.circle(0, 0, 12 * S, C[5]); p.circle(0, 0, 8 * S, WHITE); }
      const k = clamp(t / 0.3);
      if (k < 1) p.ring(0, 0, (8 + 36 * ease.outExpo(k)) * S, Math.max(1, 3 * (1 - k)), k < 0.3 ? WHITE : C[5], 1 - k * 0.5);
      bits.draw(p);
      ps.draw(p, "front");
      lights.draw(p);
    },
  };
}
