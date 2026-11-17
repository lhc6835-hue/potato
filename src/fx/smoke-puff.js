// 연기 뭉치: 과열·고구마 그룹 방해. 회색 덩어리가 부풀며 올라가 흩어진다.
import { burst, fly, seg, hex, ramp } from "../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Smoke puff", desc: "A grey puff that swells, rises and thins away.", tags: ["kitchen"],
  size: [48, 48], origin: [24, 40], duration: 1.6, loop: false, fps: 30, bg: "ground",
  options: { seed: 6, smoke: ["#3a363e", "#5c5664", "#8a8490", "#b8b2bc"] },
};

export function draw(p, t, o) {
  const C = ramp(o.smoke);
  burst(9, o.seed, (r) => {
    const d = r.range(0, 0.3), age = t - d, life = r.range(0.9, 1.3);
    if (age < 0 || age > life) return;
    const k = age / life;
    const [x, y] = fly(r.range(-5, 5), -r.range(2, 8), r.range(-18, 18), -r.range(14, 30), age, 0, 1.5);
    const rad = 2 + k * r.range(4, 7);
    const a = 0.75 * (1 - k) * Math.min(1, age * 10);
    p.disc(x, y, rad, C[1], a);
    p.disc(x - rad * 0.3, y - rad * 0.3, rad * 0.6, C[3], a * 0.6);
  });
}
