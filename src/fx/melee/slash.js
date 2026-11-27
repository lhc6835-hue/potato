// 베기: 살짝 휜 초승달 칼자국이 두 프레임 만에 그어지고, 흰 날 → 램프를 따라 식으며 꼬리부터 사라진다.
// 끝에서 불똥, 칼자국을 따라 반짝이는 부스러기. angle은 베는 방향, len은 길이(px).
import { Particles, Lights, P, Rng, fit, clamp, ease, smooth, WHITE } from "../../vendor/pixelfx/core/index.js";

export const meta = {
  name: "Blade slash",
  desc: "A thin curved cut whips across in two frames, white edge cooling down the ramp, tail first; sparks fly off the tip.",
  tags: ["melee", "slash", "sword", "directional", "one-shot"],
  size: [120, 70],
  origin: [60, 35],
  duration: 0.55,
  loop: false,
  fps: 30,
  options: {
    palette: ["#1d2a5c", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8d4f0", "#e8f1ff", "#ffffff"],
    sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
    len: 70,
    width: 7,
    bend: 0.22,
    seed: 5,
  },
};

export function create(o) {
  const C = fit(o.palette, 7), R = new Rng(o.seed), L = o.len, W = o.width, bend = o.bend;
  const ps = new Particles({ rng: R, sparks: o.sparks }), lights = new Lights();
  const SW = 0.05, HOLD = 0.05, TRAIL = 0.22;
  // 칼자국 중심선: x는 -L/2..L/2, y는 포물선으로 살짝 휜다
  const yAt = (u) => -bend * L * (1 - (2 * u - 1) ** 2) * 0.5;
  let t = 0, burst = false;
  lights.add(0, 0, L * 0.5, C[3], 0.45, 0.25);
  return {
    update(dt) {
      t += dt;
      if (!burst && t >= SW) {
        burst = true;
        const tx = L / 2, ty = yAt(1);
        for (let i = 0; i < 9; i++) {
          const a = R.range(-0.5, 0.5), sp = R.range(140, 330);
          ps.spawn(P.SPARK, tx, ty, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.12, 0.3));
        }
        for (let i = 0; i < 12; i++) {
          const u = R.range(0.1, 1), x = -L / 2 + L * u, y = yAt(u), a = R.range(-2.2, -0.9) * (R.chance(0.5) ? 1 : -1);
          const sp = R.range(30, 90);
          ps.spawn(P.MOTE, x, y, Math.cos(a) * sp * 0.4 + 30, Math.sin(a) * sp, R.range(0.2, 0.45), C[4 + R.int(0, 2)], 0.6);
        }
      }
      ps.update(dt);
      lights.update(dt);
    },
    draw(p) {
      const head = ease.outExpo(clamp(t / SW)), tail = smooth(SW + HOLD, SW + HOLD + TRAIL, t), age = clamp(t / (SW + HOLD + TRAIL));
      if (tail < 1) {
        const x0 = -L / 2 + L * tail, x1 = -L / 2 + L * head;
        p.shade(x0 - 2, -L * bend * 0.5 - W - 2, x1 + 2, W + 2, (x, y, out) => {
          const u = (x + L / 2) / L;
          if (u < tail || u > head) return;
          const v = (u - tail) / Math.max(0.001, head - tail);
          // 두께: 앞쪽이 두껍고 꼬리는 머리카락처럼
          const w = W * Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.08)), 0.7) * (1 - tail * 0.5);
          const dy = y - yAt(u);
          if (dy < -w * 0.35 || dy > w * 0.65) return;
          const q = (dy + w * 0.35) / w;
          const ci = q < 0.18 && age < 0.45 ? 0 : Math.round(q * 4 + age * 3 - v * 0.6);
          out.c = C[6 - clamp(ci, 0, 6)];
          out.a = Math.min(1, v / 0.25);
          out.k = 0.25 * (1 - age);
        });
        p.glowLine(x0, yAt(tail), x1, yAt(head), 6, C[4], 0.35 * (1 - age));
      }
      if (t < 0.03) p.line(-L / 2, yAt(0), L / 2, yAt(1), WHITE);
      ps.draw(p);
      lights.draw(p);
    },
  };
}
