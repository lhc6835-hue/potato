// 무기 그림: 전부 코드로 그린 픽셀 아트. 기준: 손잡이 = 원점, 무기는 오른쪽(+x)을 향한다.
// 1인칭 무기, 날아가는 투척물, 꽂힌 무기, UI 아이콘이 모두 이 함수를 쓴다.
import { Painter, Color, ramp, hex, WHITE, TAU } from "../vendor/pixelfx/core/index.js";
import type { WeaponDef } from "../data/weapons";
import { ELEM } from "../data/elements";

const cache = new Map<string, { B: Color[]; T: Color[]; E: Color[] }>();
export function cols(w: WeaponDef) {
  let c = cache.get(w.id);
  if (!c) cache.set(w.id, (c = { B: ramp(w.body), T: ramp(w.trim), E: ramp(ELEM[w.elem].ramp) }));
  return c;
}
const OUT = hex("#0c0a12");

/** 가늘어지는 칼날: x0→x1, 위쪽 날은 밝게, 아래는 어둡게, 1px 테두리 */
function blade(p: Painter, x0: number, x1: number, w0: number, w1: number, B: Color[], curve = 0, tip = 1) {
  const L = x1 - x0;
  p.shade(x0 - 1, -w0 - Math.abs(curve) - 2, x1 + tip + 1, w0 + Math.abs(curve) + 2, (x, y) => {
    const u = (x - x0) / L;
    if (u < 0 || u > 1 + tip / L) return;
    const cy = -curve * u * u;
    const hw = u > 1 ? 0 : w0 + (w1 - w0) * u, tipCut = u > 0.82 ? (1 - (u - 0.82) / 0.18) : 1;
    const top = cy - hw * Math.max(0, tipCut), bot = cy + hw;
    if (y < top - 1 || y > bot + 1) return;
    if (y < top || y > bot) return OUT;
    const v = (y - top) / Math.max(0.5, bot - top);
    return v < 0.25 ? B[B.length - 1] : v < 0.5 ? B[B.length - 2] : v < 0.8 ? B[B.length - 3] : B[1];
  });
}
function grip(p: Painter, x0: number, x1: number, T: Color[], w = 1.5) {
  p.rect(x0, -w, x1 - x0, w * 2, OUT);
  for (let x = x0 + 0.5; x < x1 - 0.5; x++) {
    p.px(x, -w + 0.5, ((x | 0) & 1) ? T[3] : T[4]);
    if (w > 1) p.px(x, w - 0.5, T[1]);
  }
}
function guard(p: Painter, x: number, h: number, C: Color[]) {
  p.rect(x - 1, -h - 1, 3, h * 2 + 2, OUT);
  p.rect(x - 0.5, -h, 2, h * 2, C[3]);
  p.px(x - 0.5, -h, C[5]);
}
function shaft(p: Painter, x0: number, x1: number, C: Color[], w = 1) {
  p.rect(x0, -w - 0.5, x1 - x0, w * 2 + 1, OUT);
  p.rect(x0, -w + 0.5, x1 - x0, w * 2 - 1, C[3]);
  p.line(x0, -w + 0.5, x1, -w + 0.5, C[4]);
}

export function drawWeapon(p: Painter, w: WeaponDef, t = 0) {
  const { B, T, E } = cols(w);
  const glow = w.elem !== "none" ? E[4] : 0;
  switch (w.mode) {
    case "tap": return drawFist(p, w, t);
    case "swipe": {
      grip(p, 0, 6, T);
      if (w.art === "katana" || w.art === "curved") {
        p.ellipse(7, 0, 1.5, 3.5, OUT); p.ellipse(7, 0, 1, 3, T[4]);
        blade(p, 8, 34, 1.8, 1.4, B, w.art === "curved" ? 5 : 3);
      } else if (w.art === "rapier") {
        p.ring(5, 0, 3.5, 1, T[4]);
        blade(p, 7, 36, 1.2, 0.8, B);
      } else if (w.art === "wood") {
        p.rect(6, -3, 2, 6, T[2]);
        blade(p, 8, 30, 2.2, 2, B);
      } else if (w.art === "twin") {
        blade(p, 8, 28, 1.6, 1.2, B, 2);
        guard(p, 7, 3, T);
      } else if (w.art === "flame") {
        guard(p, 7, 4, T);
        blade(p, 8, 34, 2.6, 1.6, B);
        for (let i = 0; i < 4; i++) p.tri(12 + i * 6, -2.5, 15 + i * 6, -5 - Math.sin(t * 12 + i) * 1.5, 16 + i * 6, -2.5, B[4]);
      } else if (w.art === "holy") {
        p.poly([[6, -5], [9, -1], [9, 1], [6, 5], [7.5, 0]], T[4]);
        blade(p, 9, 38, 2.6, 1.8, B);
        p.line(10, 0, 32, 0, T[5]);
      } else {
        guard(p, 7, 4, T);
        blade(p, 8, 34, 2, 1.6, B);
        p.line(9, 0.5, 28, 0.5, B[2]);
      }
      p.circle(-0.5, 0, 1.6, T[4]);
      break;
    }
    case "hold": return drawGun(p, w, t);
    case "charge": {
      const L = w.art === "claymore" ? 10 : 30;
      if (w.art === "claymore") {
        grip(p, 0, 9, T, 1.6);
        guard(p, 10, 6, T);
        blade(p, 11, 46, 3.4, 2.8, B);
        p.line(12, 0, 40, 0, B[2]);
        break;
      }
      shaft(p, -2, L, T[1] ? T : B, 1.2);
      const hx = L, hw = w.art === "mallet" ? 6 : 7, hh = w.art === "mallet" ? 5 : w.art === "quake" ? 8 : 7;
      p.rect(hx - hw / 2 - 1, -hh - 1, hw + 2, hh * 2 + 2, OUT);
      p.shade(hx - hw / 2, -hh, hx + hw / 2, hh, (x, y) => (x < hx - hw / 2 + 1.5 ? B[4] : y < -hh + 1.5 ? B[5] : x > hx + hw / 2 - 1.5 ? B[1] : B[3]));
      if (w.art === "warhammer" || w.art === "quake") p.tri(hx + hw / 2, -2, hx + hw / 2 + 5, 0, hx + hw / 2, 2, B[4]);
      if (w.art === "thunder") { p.line(hx - 1, -5, hx + 1, 0, E[5]); p.line(hx + 1, 0, hx - 1, 5, E[5]); }
      if (w.art === "glacier") for (const s of [-1, 1]) p.tri(hx - 3, s * hh, hx + 3, s * hh, hx, s * (hh + 5), B[5]);
      if (w.art === "meteor") { p.circle(hx, 0, 7.5, OUT); p.circle(hx, 0, 6.5, B[3]); for (let i = 0; i < 5; i++) p.px(hx - 3 + i * 1.5, Math.sin(i * 2.1) * 3, T[3 + (i & 1)]); }
      p.rect(hx - hw / 2 - 1, -1.5, hw + 2, 3, T[2]);
      break;
    }
    case "timing": {
      const L = 44;
      shaft(p, -4, L - 6, w.art === "bamboo" ? B : T, 1);
      if (w.art === "bamboo") { for (let x = 4; x < L - 8; x += 9) p.rect(x, -1.5, 1, 3, B[1]); p.tri(L - 7, -2.5, L + 4, 0, L - 7, 2.5, B[4]); break; }
      if (w.art === "halberd") {
        p.poly([[L - 12, -1], [L - 10, -9], [L - 4, -7], [L - 6, -1]], B[3]);
        p.line(L - 10, -9, L - 4, -7, B[5]);
      }
      if (w.art === "trident") {
        p.rect(L - 9, -6, 2, 12, B[3]);
        for (const y of [-5, 0, 5]) p.tri(L - 8, y - 1.5, L + (y ? 1 : 4), y, L - 8, y + 1.5, B[4]);
        break;
      }
      if (w.art === "lance") {
        p.poly([[L - 22, -4.5], [L + 6, 0], [L - 22, 4.5]], OUT);
        p.poly([[L - 21, -3.5], [L + 4, 0], [L - 21, 3.5]], B[3]);
        p.line(L - 21, -3, L + 3, 0, B[5]);
        p.ellipse(L - 23, 0, 2, 6, T[3]);
        break;
      }
      if (w.art === "harpoon") { p.tri(L - 8, -3, L + 4, 0, L - 8, 3, B[4]); p.tri(L - 6, -3, L - 10, -6, L - 8, -1, B[3]); p.tri(L - 6, 3, L - 10, 6, L - 8, 1, B[3]); break; }
      p.poly([[L - 9, -3], [L + 4, 0], [L - 9, 3]], OUT);
      p.poly([[L - 8, -2.2], [L + 2.5, 0], [L - 8, 2.2]], B[w.art === "divine" ? 4 : 3]);
      p.line(L - 8, -1.5, L + 2, 0, B[5]);
      if (w.art === "divine") { for (const s of [-1, 1]) p.tri(L - 12, s * 1, L - 16, s * 7, L - 8, s * 2, T[4]); }
      break;
    }
    case "throw": return drawThrown(p, w, t);
    case "bow": return drawBow(p, w, 0, t);
    case "rune": {
      if (w.art === "book") {
        p.rect(-6, -8, 13, 16, OUT);
        p.rect(-5, -7, 11, 14, B[3]);
        p.rect(-5, -7, 1, 14, B[1]);
        p.rect(-3, -6, 8, 12, T[4]);
        p.ring(1, 0, 3, 1, E[5]);
        p.glow(1, 0, 8, E[4], 0.4);
        break;
      }
      shaft(p, -2, 26, B, 1);
      const hx = 30;
      if (w.art === "crystal" || w.art === "sage") {
        p.poly([[hx - 4, 0], [hx, -5], [hx + 6, 0], [hx, 5]], T[4]);
        p.line(hx, -5, hx + 6, 0, T[5]);
        if (w.art === "sage") p.ring(hx + 1, 0, 7, 1, B[4]);
      } else if (w.art === "fork") {
        p.line(hx - 4, 0, hx + 2, -5, B[4]); p.line(hx - 4, 0, hx + 2, 5, B[4]);
        p.circle(hx, 0, 2.5, T[4]);
      } else {
        p.ring(hx - 1, 0, 4.5, 1.2, B[2]);
        p.circle(hx, 0, 3.2, T[3]);
        p.px(hx - 1, -1, T[5]);
      }
      p.glow(hx, 0, 10, E[4], 0.5 + 0.2 * Math.sin(t * 5));
      break;
    }
    case "whirl": {
      grip(p, -6, 2, T);
      for (let i = 0; i < 6; i++) p.ellipse(4 + i * 3, Math.sin(i * 0.9) * 2, 1.6, 1, i & 1 ? T[2] : T[4]);
      drawFlailHead(p, w, 24, 2, 0, t);
      break;
    }
  }
  if (glow) p.glow(14, 0, 14, glow, 0.18);
}

export function drawFist(p: Painter, w: WeaponDef, t = 0) {
  const { B, T, E } = cols(w);
  // 팔뚝 (왼쪽) + 주먹 (오른쪽), 손가락 마디가 앞을 향한다
  p.rect(-14, -5, 12, 10, OUT);
  p.rect(-13, -4, 11, 8, w.art === "wrap" ? T[3] : B[2]);
  if (w.art === "wrap") for (let x = -12; x < -3; x += 3) p.line(x, -4, x + 2, 3, T[1]);
  p.circle(3, 0, 7.5, OUT);
  p.shade(-3, -7, 10, 7, (x, y) => {
    const d = Math.hypot((x - 3) * 1.05, y);
    if (d > 6.6) return;
    return y < -3 && x < 5 ? B[5] : y > 3 ? B[1] : x > 7 ? B[2] : B[3];
  });
  for (const y of [-4, -1.5, 1, 3.5]) p.line(8, y, 9.5, y, B[1]);
  p.line(1, -5, 6, -6, B[5]);
  if (w.art === "knuckle") for (const y of [-4, -1, 2]) p.px(10, y, T[4]);
  if (w.art === "gauntlet" || w.art === "divine") { p.rect(-13, -5, 11, 2, T[4]); p.line(-2, -6, -2, 6, B[4]); }
  if (w.art === "spiked") for (const y of [-4, 0, 4]) p.tri(9, y - 1.2, 13, y, 9, y + 1.2, T[4]);
  if (w.art === "claw") for (const y of [-4, 0, 4]) { p.tri(8, y - 1, 16, y + 1, 8, y + 1.5, T[4]); p.line(9, y - 0.5, 15, y + 0.8, T[5]); }
  if (w.elem !== "none") {
    p.glow(4, 0, 12, E[4], 0.35 + 0.15 * Math.sin(t * 8));
    if (w.elem === "fire") for (let i = 0; i < 3; i++) p.px(-2 + i * 4, -8 - ((t * 20 + i * 3) % 5), E[5]);
  }
}

export function drawGun(p: Painter, w: WeaponDef, t = 0, heat = 0, spin = 0) {
  const { B, T, E } = cols(w);
  const hot = heat > 0.6 ? hex("#ff5a2a") : 0;
  switch (w.art) {
    case "pistol":
      p.poly([[-2, 1], [2, 1], [0, 8], [-4, 7]], B[3]);
      p.rect(-3, -3, 20, 4, OUT); p.rect(-2, -2, 18, 2, T[3]); p.line(-2, -2, 16, -2, T[5]);
      p.rect(-4, -4, 4, 3, B[3]);
      break;
    case "musket":
      p.poly([[-14, -1], [-2, -2], [-2, 3], [-12, 5]], B[3]);
      p.rect(-2, -3, 30, 3, OUT); p.rect(-1, -2.5, 28, 2, T[3]); p.line(-1, -2.5, 27, -2.5, T[5]);
      p.poly([[0, 0], [3, 0], [1, 6], [-2, 5]], B[2]);
      break;
    case "blunder":
      p.poly([[-12, -1], [-2, -2], [-2, 3], [-10, 5]], B[3]);
      p.rect(-2, -3, 18, 4, T[3]);
      p.poly([[16, -3], [24, -6], [24, 5], [16, 2]], T[4]);
      p.line(16, -3, 24, -6, T[5]);
      p.poly([[0, 1], [3, 1], [1, 7], [-2, 6]], B[2]);
      break;
    case "gatling": {
      p.rect(-8, -6, 14, 12, OUT); p.rect(-7, -5, 12, 10, B[3]); p.line(-7, -5, 4, -5, B[5]);
      for (let i = 0; i < 3; i++) {
        const y = Math.sin(spin + (i * TAU) / 3) * 3.5, z = Math.cos(spin + (i * TAU) / 3);
        p.rect(5, y - 1, 20, 2, z > 0 ? B[4] : B[1]);
      }
      p.rect(22, -5, 3, 10, B[2]);
      p.circle(-1, 0, 3, T[4]);
      p.glow(-1, 0, 8, E[4], 0.4);
      break;
    }
    case "flamer":
      p.circle(-6, 2, 6, OUT); p.circle(-6, 2, 5, B[3]); p.px(-8, 0, B[5]);
      p.rect(-1, -2, 22, 4, T[2]); p.line(-1, -2, 21, -2, T[4]);
      p.rect(20, -3, 4, 6, B[2]);
      p.circle(25, 0, 1.4, E[5]); p.glow(25, 0, 6, E[4], 0.6);
      break;
    case "rail":
      p.rect(-8, -4, 34, 8, OUT); p.rect(-7, -3, 32, 6, B[3]);
      p.rect(2, -5, 24, 2, T[3]); p.rect(2, 3, 24, 2, T[3]);
      for (let x = 4; x < 24; x += 4) p.px(x, 0, E[3 + ((x + Math.floor(t * 20)) % 3)]);
      p.glowLine(2, 0, 24, 0, 4, E[4], 0.35);
      p.poly([[-2, 3], [2, 3], [0, 9], [-4, 8]], B[2]);
      break;
    case "cannon":
      p.circle(-4, 0, 7, OUT); p.circle(-4, 0, 6, B[3]);
      p.rect(0, -5, 22, 10, OUT); p.rect(1, -4, 20, 8, B[2]); p.line(1, -4, 20, -4, B[4]);
      p.ring(21, 0, 5.5, 2, T[3]);
      p.circle(21, 0, 3, T[5]); p.glow(21, 0, 10, E[4], 0.5);
      break;
  }
  if (hot) p.glowLine(0, 0, 20, 0, 5, hot, (heat - 0.6) * 1.2);
}

export function drawThrown(p: Painter, w: WeaponDef, t = 0) {
  const { B, T, E } = cols(w);
  switch (w.art) {
    case "shuriken":
      p.poly([[0, -7], [1.6, -1.6], [7, 0], [1.6, 1.6], [0, 7], [-1.6, 1.6], [-7, 0], [-1.6, -1.6]], OUT);
      p.poly([[0, -6], [1.2, -1.2], [6, 0], [1.2, 1.2], [0, 6], [-1.2, 1.2], [-6, 0], [-1.2, -1.2]], B[4]);
      p.line(0, -5, 0, 5, B[2]); p.circle(0, 0, 1.2, OUT);
      break;
    case "axe":
      shaft(p, -9, 6, T, 1);
      p.poly([[3, -2], [6, -9], [11, -7], [11, 3], [6, 4]], OUT);
      p.poly([[4, -2], [6.5, -8], [10, -6], [10, 2], [6, 3]], B[3]);
      p.line(10, -6, 10, 2, B[5]);
      break;
    case "boomerang":
      p.poly([[-8, 5], [0, -4], [8, 5], [6, 6], [0, 0], [-6, 6]], OUT);
      p.poly([[-7, 4], [0, -3], [7, 4], [6, 5], [0, -0.5], [-6, 5]], B[3]);
      p.line(-7, 4, 0, -3, T[4]); p.line(0, -3, 7, 4, B[4]);
      break;
    case "bomb":
      p.circle(0, 1, 6, OUT); p.circle(0, 1, 5, B[3]); p.circle(-2, -1, 1.6, B[5]);
      p.rect(-1.5, -6, 3, 2, T[2]);
      p.line(0, -6, 3, -10, hex("#8a6a4a"));
      p.px(3, -11, Math.sin(t * 40) > 0 ? hex("#fff0a0") : hex("#ff8a2a"));
      p.glow(3, -11, 6, E[4], 0.6);
      break;
    case "kunai":
      p.ring(-8, 0, 2.2, 1, T[4]);
      grip(p, -6, 0, T, 1);
      blade(p, 0, 10, 2.6, 0.6, B);
      p.glow(4, 0, 8, E[4], 0.4);
      break;
    default:
      grip(p, -5, 0, T, 1.2);
      guard(p, 0, 2.5, B);
      blade(p, 1, 12, 1.6, 1, B);
  }
}

export function drawArrow(p: Painter, w: WeaponDef, len = 22) {
  const { B, T, E } = cols(w);
  const fire = w.elem !== "none";
  p.line(-len, 0, 0, 0, hex("#8a6a42"));
  p.line(-len, 0.5, -1, 0.5, hex("#5a4028"));
  p.tri(-len, -2.5, -len + 5, 0, -len, 2.5, T[w.art === "cross" ? 2 : 4] ?? WHITE);
  p.tri(0, -2, 4, 0, 0, 2, OUT);
  p.tri(0, -1.4, 3, 0, 0, 1.4, B[4] ?? WHITE);
  if (fire) p.glow(1, 0, 6, E[4], 0.5);
}

export function drawBow(p: Painter, w: WeaponDef, pull = 0, t = 0) {
  const { B, T, E } = cols(w);
  const H = w.art === "long" ? 16 : w.art === "short" ? 10 : 13;
  if (w.art === "cross") {
    p.rect(-10, -1.5, 18, 3, B[3]); p.line(-10, -1.5, 8, -1.5, B[5]);
    p.arc(6, 0, 9, 1.5, -1.25, 1.25, T[3]);
    const sx = 6 - 9 * Math.cos(1.25) - pull * 4;
    p.line(6 + 9 * Math.cos(-1.25), -9 * Math.sin(1.25), sx, 0, hex("#e8e0d0"));
    p.line(sx, 0, 6 + 9 * Math.cos(1.25), 9 * Math.sin(1.25), hex("#e8e0d0"));
    return;
  }
  // 활대: 오른쪽으로 휜 호, 시위는 당긴 만큼 왼쪽으로
  const bend = 5 + pull * 2;
  const pts: number[][] = [];
  for (let i = 0; i <= 12; i++) {
    const v = i / 12 * 2 - 1;
    pts.push([bend * (1 - v * v) - pull * 1.5 * (1 - v * v), v * H]);
  }
  for (let i = 1; i < pts.length; i++) {
    p.line(pts[i - 1][0] - 1, pts[i - 1][1], pts[i][0] - 1, pts[i][1], OUT);
    p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], B[3]);
    p.line(pts[i - 1][0] + 1, pts[i - 1][1], pts[i][0] + 1, pts[i][1], i < 6 ? B[5] : B[4]);
  }
  const sx = -pull * 14;
  p.line(pts[0][0], -H, sx, 0, hex("#f0ead8"));
  p.line(sx, 0, pts[12][0], H, hex("#f0ead8"));
  p.rect(bend - 1.5, -2.5, 3, 5, T[3]);
  if (w.art === "elf") for (const s of [-1, 1]) p.tri(pts[s < 0 ? 1 : 11][0], s * (H - 2), pts[s < 0 ? 1 : 11][0] + 4, s * (H - 5), pts[s < 0 ? 2 : 10][0], s * (H - 5), T[4]);
  if (w.elem !== "none") p.glow(bend, 0, 10, E[4], 0.25 + 0.1 * Math.sin(t * 6));
}

/** 사슬 무기의 머리 (월드 좌표 x, y), ang = 회전 */
export function drawFlailHead(p: Painter, w: WeaponDef, x: number, y: number, ang = 0, t = 0) {
  const { B, T, E } = cols(w);
  if (w.art === "sickle") {
    const c = Math.cos(ang), s = Math.sin(ang);
    p.line(x - c * 4, y - s * 4, x + c * 3, y + s * 3, T[3]);
    p.arc(x + c * 3, y + s * 3, 9, (u) => 3 * Math.sin(Math.PI * u), ang - 0.2, ang + 2.2, (u, v) => (v > 0.6 ? B[5] : B[3]));
    return;
  }
  const r = w.art === "ball" ? 4.5 : 5;
  if (w.art !== "ball") {
    for (let i = 0; i < 8; i++) {
      const a = ang + (i / 8) * TAU, L = w.art === "spike" ? 9 : w.art === "frost" ? 8 : 7.5;
      p.tri(x + Math.cos(a - 0.3) * r, y + Math.sin(a - 0.3) * r, x + Math.cos(a) * L, y + Math.sin(a) * L, x + Math.cos(a + 0.3) * r, y + Math.sin(a + 0.3) * r, w.art === "frost" ? E[5] : B[4]);
    }
  }
  p.circle(x, y, r + 1, OUT);
  p.shade(x - r, y - r, x + r, y + r, (px, py) => {
    const dx = px - x, dy = py - y, d = Math.hypot(dx, dy);
    if (d > r) return;
    const l = -(dx + dy) / r;
    return l > 0.9 ? B[5] : l > 0.2 ? B[4] : l > -0.5 ? B[3] : B[1];
  });
  if (w.art === "comet") { p.glow(x, y, 12, E[4], 0.6); p.circle(x - 1, y - 1, 2, E[5]); }
  if (w.elem !== "none") p.glow(x, y, 10, E[4], 0.3 + 0.1 * Math.sin(t * 9));
}
