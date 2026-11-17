// 판매 동전: 계산대에서 동전이 튀어 오르며 돌고, 반짝이고 사라진다. 원샷 (simulated 아님, 순수 함수).
import { fly, seg, ease, hex, ramp, at, sparkle, burst } from "../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Coin pop", desc: "A coin hops up spinning, glints at the top and fades; a few sparks fall away.", tags: ["ui", "pickup"],
  size: [32, 40], origin: [16, 32], duration: 0.9, loop: false, fps: 30, bg: "dark",
  options: { seed: 4, gold: ["#5a3a0a", "#a8700e", "#e8b020", "#ffe066", "#fffbe0"] },
};

export function draw(p, t, o) {
  const C = ramp(o.gold);
  const up = ease.outQuart(seg(t, 0, 0.45)) * 18 - ease.inQuad(seg(t, 0.55, 0.9)) * 4;
  const y = -4 - up;
  const fade = 1 - seg(t, 0.6, 0.9);
  if (fade <= 0) return;
  // 회전: 폭이 5 → 1 → 5
  const spin = Math.abs(Math.cos(t * 14));
  const hw = Math.max(0, Math.round(spin * 2));
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -hw; dx <= hw; dx++) {
      const edge = Math.abs(dx) === hw || Math.abs(dy) === 2;
      if (Math.abs(dy) === 2 && Math.abs(dx) === hw && hw > 0) continue;
      p.dot(dx, y + dy, edge ? C[1] : dx < 0 || dy < 0 ? C[3] : C[2], fade);
    }
  if (hw > 0) p.dot(0, y - 1, C[4], fade);
  p.glow(0, y, 7, C[3], 0.35 * fade);
  if (t > 0.4 && t < 0.62) sparkle(p, 2, y - 3, 3 * (1 - seg(t, 0.4, 0.62)), C[4], C[3], 0.8);
  burst(5, o.seed, (r) => {
    const t0 = 0.42, age = t - t0, life = r.range(0.25, 0.45);
    if (age < 0 || age > life) return;
    const [x, yy] = fly(0, y, r.range(-30, 30), r.range(-30, -5), age, 200);
    p.px(x, yy, at(C.slice(2), 1 - age / life));
  });
}
