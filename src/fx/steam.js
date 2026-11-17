// 찜기·냄비 김: 뚜껑 틈에서 올라와 흔들리며 퍼지고 옅어진다. 루프.
import { cycle, smooth, TAU, hex } from "../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Steam", desc: "Soft steam rising from a pot, swaying and thinning out.", tags: ["kitchen", "loop"],
  size: [40, 48], origin: [20, 40], duration: 2.4, loop: true, fps: 30, bg: "dark",
  options: { seed: 1, width: 10, height: 30, color: "#f4f0ea" },
};

export function draw(p, t, o) {
  const c = hex(o.color), w = o.width, H = o.height;
  cycle(t, meta.duration, 16, o.seed, (g) => g.range(1.3, 2.2), (age, life, r) => {
    const k = age / life;
    const x0 = r.range(-w / 2, w / 2);
    const sway = Math.sin(age * 2.2 + r.range(0, TAU)) * (0.5 + k * 3.5);
    const x = x0 + sway * (x0 < 0 ? -1 : 1), y = -k * H * r.range(0.8, 1.1);
    const rad = 0.8 + k * r.range(2.5, 4.5);
    const a = 0.32 * smooth(0, 0.12, k) * (1 - smooth(0.35, 1, k));
    p.disc(x, y, rad, c, a);
    // 위쪽이 조금 더 밝다
    p.disc(x - rad * 0.25, y - rad * 0.3, rad * 0.55, c, a * 0.6);
  });
}
