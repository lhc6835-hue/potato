// 샌드백 장식·얼굴·금. 전부 샌드백 로컬 좌표, 몸통 밖으로 나가지 않게 SDF로 잘라서 그린다.
import { Painter, Color, Rng, hex, ramp, mix, scale, WHITE, TAU } from "../vendor/pixelfx/core/index.js";
import type { Bag } from "./bag";
import type { Geo } from "./sdf";

export interface Crack { lvl: number; pts: number[][] }

const INK = hex("#120a10"), BLUSH = hex("#ff7a9a"), WHT = hex("#ffffff"), RED = hex("#ff3040");
const METAL = ramp(["#14141c", "#2c2c3a", "#50505e", "#80808e", "#b8b8c4", "#e8e8f0"]);
const GOLDR = ramp(["#3a2206", "#7a4a0c", "#c48412", "#f0b424", "#ffe066", "#fff6c4"]);
const LEAF = ramp(["#0c2a10", "#1a4a1a", "#2e7a2a", "#4ea83a", "#86d054", "#c4f08a"]);
const LAVA = ramp(["#5a1008", "#c03a10", "#ff7a20", "#ffc040", "#fff0a0"]);
const ICE = ramp(["#1a3a72", "#4a8ad0", "#b4e0ff", "#ffffff"]);

export function makeCracks(R: Rng, G: Geo): Crack[] {
  const out: Crack[] = [];
  for (let lvl = 1; lvl <= 3; lvl++)
    for (let k = 0; k < 2 + lvl; k++) {
      let x = 0, y = 0;
      for (let tries = 0; tries < 30; tries++) {
        x = R.range(-G.W * 0.4, G.W * 0.4);
        y = R.range(G.H * 0.15, G.H * 0.9);
        if (G.sdf(x, y, 0) < -4) break;
      }
      let a = R.range(0, TAU);
      const pts = [[x, y]];
      const n = 3 + lvl + R.int(0, 2);
      for (let i = 0; i < n; i++) {
        a += R.range(-0.9, 0.9);
        x += Math.cos(a) * R.range(2.5, 4.5);
        y += Math.sin(a) * R.range(2.5, 4.5);
        pts.push([x, y]);
      }
      out.push({ lvl, pts });
    }
  return out;
}

function clip(p: Painter, b: Bag, x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number) => Color | 0, inset = 0.6) {
  p.shade(x0, y0, x1, y1, (x, y) => {
    if (b.dist(x, y) > -inset) return;
    return fn(x, y);
  });
}

export function drawCracks(p: Painter, b: Bag) {
  const f = b.frac, lvl = f < 0.12 ? 3 : f < 0.36 ? 2 : f < 0.68 ? 1 : 0;
  if (!lvl) return;
  const dark = scale(b.R[0], 0.8), lite = b.R[b.R.length - 2];
  for (const c of b.cracks) {
    if (c.lvl > lvl) continue;
    for (let i = 1; i < c.pts.length; i++) {
      const [x0, y0] = c.pts[i - 1], [x1, y1] = c.pts[i];
      const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
      for (let s = 0; s <= steps; s++) {
        const x = x0 + ((x1 - x0) * s) / steps, y = y0 + ((y1 - y0) * s) / steps;
        if (b.dist(x, y) > -1.2) continue;
        p.px(x, y, dark);
        if (b.dist(x, y + 1) < -1.2) p.dot(x, y + 1, lite, 0.6);
      }
    }
  }
  // 거의 다 부서지면 틈 사이로 내용물이 삐져나온다
  if (lvl >= 3 && (b.def.debris === "straw" || b.def.debris === "sand")) {
    const c = hex(b.def.debris === "straw" ? "#ffe08a" : "#d8b070");
    for (const k of b.cracks.slice(0, 3)) {
      const [x, y] = k.pts[0];
      p.line(x, y, x - 3, y - 3, c);
      p.line(x, y, x + 2, y - 4, c);
    }
  }
}

export function drawFace(p: Painter, b: Bag) {
  const face = b.def.face ?? "none";
  if (face === "none" && !b.def.deco?.includes("eyeglow")) return;
  const [fx, fy] = b.def.shape === "dummy" || b.def.shape === "snowman" ? b.geo.face : b.geo.face;
  const hurt = b.hurt > 0, low = b.frac < 0.25, t = b.t, blink = Math.sin(t * 1.3 + 1) > 0.985;
  const sp = Math.max(3, Math.round(b.geo.W * 0.13));
  if (face === "stone" || (face === "none" && b.def.deco?.includes("eyeglow"))) {
    const c = b.def.shape === "skull" ? hex("#ff4060") : b.T[b.T.length - 2];
    for (const s of [-1, 1]) {
      const ex = fx + s * sp;
      if (b.def.shape === "skull") {
        p.ellipse(ex, fy - 1, 3, 3.4, INK);
        p.rect(ex - 0.5, fy - 1.5, 2, 2, c);
      } else p.rect(ex - 2, fy - 1, 4, hurt ? 1 : 2, c);
      p.glow(ex, fy - 0.5, 7, c, 0.55 + 0.2 * Math.sin(t * 5));
    }
    if (b.def.shape === "skull") {
      p.tri(fx - 1.5, fy + 5, fx + 1.5, fy + 5, fx, fy + 3, INK);
      for (let i = -3; i <= 3; i += 2) p.rect(fx + i, fy + 9, 1, 3, INK);
    }
    return;
  }
  if (face === "evil") {
    const c = hex("#ff2a3a");
    for (const s of [-1, 1]) {
      const ex = fx + s * sp;
      p.tri(ex - 2.5 * s, fy - 3, ex + 2.5 * s, fy - 1, ex - 2 * s, fy + 1, c);
      p.glow(ex, fy - 1, 8, c, 0.6);
    }
    const my = fy + 5;
    p.rect(fx - 5, my, 11, hurt ? 4 : 2, INK);
    for (let i = -4; i <= 4; i += 2) p.tri(fx + i, my, fx + i + 1.6, my, fx + i + 0.8, my + 2, WHT);
    return;
  }
  // 귀여운·화난·졸린 얼굴
  for (const s of [-1, 1]) {
    const ex = Math.round(fx + s * sp);
    if (hurt) {
      // > <
      p.line(ex - s * 2, fy - 2, ex + s * 0.5, fy - 0.5, INK);
      p.line(ex + s * 0.5, fy - 0.5, ex - s * 2, fy + 1, INK);
    } else if (face === "sleepy" || blink) {
      p.line(ex - 1.5, fy, ex + 1.5, fy, INK);
      p.px(ex - 2, fy - 1, INK);
      p.px(ex + 2, fy - 1, INK);
    } else if (low && face === "cute") {
      // 빙글빙글 눈
      p.ring(ex, fy - 0.5, 2.3, 1, INK);
      p.px(ex, fy - 0.5, INK);
    } else {
      p.rect(ex - 1, fy - 2, 2, 3, INK);
      p.px(ex - 1, fy - 2, WHT);
    }
    if (face === "angry" && !hurt) p.line(ex - 2.5 * s, fy - 5, ex + 2 * s, fy - 3, INK);
    if (face === "cute") p.dot(ex + s * 2.5, fy + 2, BLUSH, 0.7);
  }
  const my = Math.round(fy + 4);
  if (hurt) {
    p.ellipse(fx, my + 1, 2, 2, INK);
    p.px(fx, my + 2, hex("#ff6070"));
  } else if (face === "angry") {
    p.line(fx - 2, my + 1, fx + 2, my + 1, INK);
    p.px(fx - 3, my + 2, INK);
    p.px(fx + 3, my + 2, INK);
  } else if (face === "sleepy") {
    p.px(fx, my, INK);
    const z = (t * 0.7) % 1;
    p.text("z", fx + 10 + z * 4, fy - 8 - z * 8, b.R[b.R.length - 1], { a: 1 - z });
  } else {
    p.px(fx - 2, my, INK);
    p.line(fx - 1, my + 1, fx + 1, my + 1, INK);
    p.px(fx + 2, my, INK);
  }
  if (low && face !== "sleepy") {
    // 식은땀
    const sx = fx + sp + 4, sy = fy - 5 + ((t * 2) % 1) * 3;
    p.px(sx, sy, hex("#a8dcff"));
    p.rect(sx - 1, sy + 1, 3, 2, hex("#a8dcff"));
    p.px(sx - 1, sy + 1, WHT);
  }
}

export function drawDeco(p: Painter, b: Bag) {
  const G = b.geo, T = b.T, R = b.R, t = b.t, W = G.W, H = G.H, hw = W / 2;
  const n = T.length;
  const strap = (y: number, h: number, C: Color[]) =>
    clip(p, b, -W, y, W, y + h, (_x, yy) => (yy < y + 1 ? C[C.length - 2] : yy > y + h - 1 ? C[1] : C[Math.floor(C.length / 2)]));
  for (const d of b.def.deco ?? []) {
    switch (d) {
      case "bands":
        strap(H * 0.26, 4, T);
        strap(H * 0.72, 4, T);
        p.rect(-2, H * 0.72 - 0.5, 5, 5, GOLDR[3]);
        p.rect(-1, H * 0.72 + 0.5, 3, 3, GOLDR[1]);
        break;
      case "hoops":
        strap(G.cy - H * 0.32, 3, METAL);
        strap(G.cy + H * 0.26, 3, METAL);
        if (b.def.shape === "barrel" || b.def.shape === "keg")
          clip(p, b, -W, 0, W, H, (x) => (Math.abs(((x + 200) % 7) - 3.5) < 0.5 ? scale(R[2], 0.8) : 0), 1.5);
        break;
      case "rope": {
        const y = b.def.shape === "dummy" ? G.cy - 2 : 5;
        clip(p, b, -W, y, W, y + 3, (x, yy) => (((Math.floor(x) + Math.floor(yy)) & 3) < 2 ? T[n - 2] : T[2]), 0);
        break;
      }
      case "stitch":
        for (let y = H * 0.2; y < H * 0.85; y += 4) {
          const x = -hw * 0.45;
          if (b.dist(x, y) < -1.5) { p.line(x - 1.5, y - 1, x + 1.5, y + 1, T[1]); p.line(x - 1.5, y + 1, x + 1.5, y - 1, T[1]); }
        }
        break;
      case "patch": {
        const px = hw * 0.2, py = H * 0.55;
        clip(p, b, px - 5, py - 4, px + 5, py + 5, (x, y) => (x < px - 4 || y < py - 3 ? T[n - 2] : T[3]));
        for (let i = -4; i <= 4; i += 2) { p.px(px + i, py - 4, T[1]); p.px(px + i, py + 5, T[1]); }
        break;
      }
      case "moss":
        clip(p, b, -W, 0, W, H * 0.5, (x, y) => {
          const lim = H * 0.2 + Math.sin(x * 0.7) * 3 + Math.sin(x * 1.9) * 1.5;
          if (y > lim) return 0;
          return ((Math.floor(x) * 7 + Math.floor(y) * 3) & 7) < 2 ? LEAF[4] : LEAF[2];
        });
        for (let i = -2; i <= 2; i++) p.line(i * 5, H * 0.2, i * 5, H * 0.2 + 2 + (i & 1) * 2, LEAF[1]);
        break;
      case "dots":
        for (const [x, y, r] of [[-hw * 0.5, H * 0.22, 3], [hw * 0.45, H * 0.18, 2.5], [0, H * 0.12, 2], [hw * 0.15, H * 0.33, 2], [-hw * 0.95, H * 0.34, 1.6], [hw * 1.05, H * 0.32, 1.8]])
          if (b.dist(x, y) < -1) { p.circle(x, y, r, T[n - 1]); p.px(x + r * 0.4, y + r * 0.4, T[n - 3]); }
        break;
      case "vines":
        for (let k = 0; k < 2; k++)
          for (let y = H * 0.15; y < H; y += 1) {
            const x = Math.sin(y * 0.22 + k * 3) * hw * 0.6;
            if (b.dist(x, y) < -1) {
              p.px(x, y, LEAF[2 + k]);
              if (((y | 0) + k * 3) % 9 === 0) { p.px(x + 1, y - 1, LEAF[4]); p.px(x + 2, y - 1, LEAF[3]); }
            }
          }
        break;
      case "flower": {
        const fx = hw * 0.55, fy = 3;
        for (let i = 0; i < 5; i++) p.circle(fx + Math.cos(i * 1.256) * 2, fy + Math.sin(i * 1.256) * 2, 1.4, hex("#ff9ad0"));
        p.px(fx, fy, hex("#ffe060"));
        break;
      }
      case "shine":
        p.line(-hw * 0.5, G.cy - H * 0.22, -hw * 0.2, G.cy - H * 0.3, hex("#ffffff"));
        p.px(-hw * 0.6, G.cy - H * 0.14, hex("#ffffff"));
        break;
      case "leaves":
        for (let i = -2; i <= 2; i++) {
          const x = i * 6, y = 2 + Math.abs(i);
          p.ellipse(x, y, 3.5, 2, LEAF[3 + (i & 1)]);
          p.line(x - 2, y, x + 2, y - 1, LEAF[1]);
        }
        break;
      case "ore":
        for (const [x, y] of [[-hw * 0.4, H * 0.4], [hw * 0.3, H * 0.6], [-hw * 0.1, H * 0.8], [hw * 0.45, H * 0.3]])
          if (b.dist(x, y) < -2) {
            p.poly([[x - 2, y], [x, y - 2], [x + 2.5, y], [x, y + 1.5]], GOLDR[3]);
            p.px(x, y - 1, GOLDR[5]);
            p.glow(x, y, 4, GOLDR[4], 0.25 + 0.2 * Math.sin(t * 4 + x));
          }
        break;
      case "rivets":
        for (const y of [H * 0.28, H * 0.74])
          for (let x = -hw; x <= hw; x += 5) if (b.dist(x, y) < -1.5) { p.px(x, y, METAL[5]); p.px(x + 1, y + 1, METAL[1]); }
        break;
      case "plates":
        clip(p, b, -W, 0, W, H, (x, y) => (Math.abs(y - H * 0.5) < 0.5 || Math.abs(x) < 0.5 ? scale(R[1], 0.8) : 0), 2);
        break;
      case "gears": {
        const gx = 0, gy = G.cy;
        const a0 = t * 2;
        p.shade(gx - 9, gy - 9, gx + 9, gy + 9, (x, y) => {
          const dx = x - gx, dy = y - gy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx) - a0;
          const tooth = Math.cos(a * 8) > 0.3 ? 7.5 : 6;
          if (r > tooth || r < 2.5) return;
          return r > tooth - 1.2 ? T[1] : dx + dy < 0 ? T[n - 2] : T[3];
        });
        p.circle(gx, gy, 1.5, METAL[1]);
        break;
      }
      case "skullmark": {
        const x = 0, y = G.cy;
        p.circle(x, y - 1, 4, hex("#e8e0d0"));
        p.rect(x - 2, y + 2, 5, 3, hex("#e8e0d0"));
        p.rect(x - 2, y - 2, 2, 2, INK); p.rect(x + 1, y - 2, 2, 2, INK);
        break;
      }
      case "fuse": {
        p.line(0, 4, 3, -2, hex("#3a2a1a"));
        const sp = Math.sin(t * 30) > 0;
        p.px(3, -3, sp ? hex("#fff0a0") : hex("#ff8a2a"));
        p.glow(3, -3, 6, hex("#ffa040"), 0.6);
        break;
      }
      case "runes": {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
        const c = T[n - 2];
        const marks = [[-hw * 0.4, H * 0.45], [hw * 0.35, H * 0.55], [0, H * 0.75]];
        marks.forEach(([x, y], i) => {
          if (b.dist(x, y) > -3) return;
          const k = (i + Math.floor(t * 0.5)) % 3;
          if (k === 0) { p.line(x, y - 3, x, y + 3, c); p.line(x - 2, y - 1, x + 2, y + 1, c); }
          else if (k === 1) { p.line(x - 2, y - 3, x + 2, y, c); p.line(x + 2, y, x - 2, y + 3, c); }
          else { p.ring(x, y, 2.5, 1, c); p.px(x, y, c); }
          p.glow(x, y, 7, c, 0.35 * pulse + 0.1);
        });
        break;
      }
      case "frost":
        clip(p, b, -W, 0, W, H, (x, y) => (y < H * 0.18 + Math.sin(x * 1.3) * 2 && ((Math.floor(x) + Math.floor(y)) & 1) === 0 ? ICE[3] : 0), 0.3);
        break;
      case "fur":
        for (let y = 8; y < H; y += 3)
          for (const s of [-1, 1]) {
            let x = 0;
            while (b.dist(x + s, y) < 0 && Math.abs(x) < W) x += s;
            p.px(x + s, y, R[R.length - 2]);
            p.px(x + s * 2, y + 1, R[R.length - 3]);
          }
        break;
      case "scarf": {
        const y = G.face[1] + b.geo.W * 0.3 + 1;
        clip(p, b, -W, y - 1, W, y + 3, (_x, yy) => (yy < y ? T[n - 2] : T[3]), -1.5);
        p.rect(hw * 0.25, y + 2, 3, 8 + Math.sin(t * 3) * 1, T[3]);
        p.rect(hw * 0.25, y + 9, 3, 1, T[1]);
        break;
      }
      case "carrot": {
        const [fx, fy] = G.face;
        p.tri(fx, fy + 1, fx, fy + 3, fx + 6, fy + 2, hex("#ff8a2a"));
        p.px(fx + 1, fy + 1, hex("#ffc060"));
        break;
      }
      case "glint": {
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.6 + i * 0.33) % 1;
          if (ph > 0.25) continue;
          const x = Math.sin(i * 2.3 + Math.floor(t * 0.6 + i * 0.33) * 1.7) * hw * 0.6, y = H * (0.25 + ((i * 0.37 + Math.floor(t * 0.6)) % 1) * 0.6);
          const s = Math.sin((ph / 0.25) * Math.PI) * 3.5;
          p.line(x - s, y, x + s, y, WHT);
          p.line(x, y - s, x, y + s, WHT);
          p.glow(x, y, 6, WHT, 0.5 * s / 3.5);
        }
        break;
      }
      case "horns":
        for (const s of [-1, 1]) {
          const x = s * hw * 0.55, y = b.def.shape === "statue" ? 5 : 4;
          p.poly([[x, y + 2], [x + s * 4, y + 2], [x + s * 6, y - 7], [x + s * 3, y - 3]], hex("#e8dcc8"));
          p.line(x + s * 4, y + 2, x + s * 6, y - 7, hex("#8a7a64"));
        }
        break;
      case "lavacrack": {
        const pulse = 0.6 + 0.4 * Math.sin(t * 3);
        for (const c of b.cracks) {
          for (const [x, y] of c.pts) {
            if (b.dist(x, y) > -1.5) continue;
            p.px(x, y, LAVA[2 + (c.lvl & 1)]);
            p.glow(x, y, 5, LAVA[2], 0.22 * pulse);
          }
          for (let i = 1; i < c.pts.length; i++) {
            const [x0, y0] = c.pts[i - 1], [x1, y1] = c.pts[i];
            if (b.dist(x1, y1) < -1.5 && b.dist(x0, y0) < -1.5) p.line(x0, y0, x1, y1, LAVA[1 + (c.lvl > 1 ? 1 : 0)]);
          }
        }
        break;
      }
      case "heat":
        p.glow(0, H, W * 0.8, LAVA[1], 0.3 + 0.1 * Math.sin(t * 5));
        break;
      case "scales":
        clip(p, b, -W, 0, W, H, (x, y) => {
          const row = Math.floor(y / 4), cx = ((x + (row & 1) * 3 + 300) % 6) - 3, cy = (y % 4);
          return cy < 1 && Math.abs(cx) < 2.5 ? scale(R[2], 0.85) : cy < 1.5 && Math.abs(cx) < 1 ? R[R.length - 2] : 0;
        }, 1);
        break;
      case "laurel": {
        const [fx, fy] = G.face;
        for (let i = 0; i < 7; i++) {
          for (const s of [-1, 1]) {
            const a = Math.PI * (0.55 + i * 0.07), x = fx + s * Math.cos(a) * -9, y = fy - 3 - Math.sin(a) * 5 + i * 0.4;
            p.ellipse(x, y, 1.6, 1, LEAF[3 + (i & 1)]);
          }
        }
        break;
      }
      case "halo": {
        const y = -6 + Math.sin(t * 2.4) * 1.5;
        p.ring(0, y, 7, 1.6, GOLDR[4]);
        p.glowRing(0, y, 7, 4, GOLDR[4], 0.6);
        break;
      }
      case "wings":
        for (const s of [-1, 1]) {
          const x = s * (hw * 0.85), y = G.cy - 6 + Math.sin(t * 6) * 1.5;
          for (let i = 0; i < 4; i++) p.ellipse(x + s * (3 + i * 2.5), y - 3 + i * 2.5, 3.5, 2, i === 0 ? WHT : hex("#dce4f8"));
          p.line(x, y - 4, x + s * 11, y - 6, hex("#9aa8c8"));
        }
        break;
      case "teeth": {
        const y = G.face[1] + 1, open = 1.5 + Math.max(0, Math.sin(t * 2.2)) * 2 + (b.hurt > 0 ? 2 : 0);
        p.rect(-hw * 1.2, y, W * 1.2, open, INK);
        for (let x = -hw * 1.1; x < hw * 1.1; x += 3.2) {
          p.tri(x, y, x + 2.4, y, x + 1.2, y + 2.4, WHT);
          p.tri(x + 1.6, y + open, x + 4, y + open, x + 2.8, y + open - 2.2, WHT);
        }
        if (open > 2.8) { p.ellipse(hw * 0.3, y + open + 1, 3, 2, hex("#ff4a7a")); }
        // 자물쇠
        p.rect(-2, y + open + 2, 5, 5, GOLDR[3]);
        p.px(0, y + open + 4, INK);
        break;
      }
      case "chains":
        for (let i = 0; i < 9; i++) {
          const x = -hw + i * (W / 8), y = H * 0.55 + i * 1.6;
          if (b.dist(x, y) < 1) { p.ellipse(x, y, 2.2, 1.4, METAL[i & 1 ? 2 : 4]); p.px(x, y, METAL[0]); }
        }
        break;
      case "stars":
        clip(p, b, -W, 0, W, H, (x, y) => {
          const dx = x, dy = y - G.cy, a = Math.atan2(dy, dx) + t * 0.6 + Math.hypot(dx, dy) * 0.12;
          const sw = Math.sin(a * 3) * 0.5 + 0.5;
          const st = ((Math.floor(x) * 13 + Math.floor(y) * 7 + Math.floor(t * 3)) % 37) === 0;
          return st ? WHT : sw > 0.85 ? mix(R[3], T[3], 0.5) : 0;
        }, 2);
        p.glow(0, G.cy, W * 0.8, T[3], 0.25);
        break;
      case "crown": {
        const y = b.def.shape === "dummy" || b.def.shape === "skull" ? -1 : 2;
        p.poly([[-7, y + 4], [-7, y - 3], [-4, y], [0, y - 5], [4, y], [7, y - 3], [7, y + 4]], GOLDR[3]);
        p.line(-7, y + 4, 7, y + 4, GOLDR[1]);
        p.line(-7, y - 3, -4, y, GOLDR[5]);
        p.px(0, y + 1, hex("#ff3050"));
        p.px(-4, y + 2, hex("#40a0ff"));
        p.px(4, y + 2, hex("#40ff80"));
        p.glow(0, y, 8, GOLDR[4], 0.25);
        break;
      }
      case "cape":
        for (const s of [-1, 1]) {
          const x = s * hw * 0.85;
          p.poly([[x, G.cy - 8], [x + s * 5, G.cy + 14 + Math.sin(t * 3 + s) * 2], [x + s * 1, G.cy + 16]], hex("#b0182a"));
          p.line(x, G.cy - 8, x + s * 5, G.cy + 14, hex("#e04050"));
        }
        break;
    }
  }
  void RED;
}
