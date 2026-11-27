// 샌드백 모양의 부호 거리 함수. 음수 = 안쪽. 좌표는 샌드백 로컬(원점 = 고리, y 아래로).
import type { Shape } from "../data/bags";

export const len = (x: number, y: number) => Math.sqrt(x * x + y * y);
export function sdBox(x: number, y: number, hw: number, hh: number, r = 0) {
  const qx = Math.abs(x) - hw + r, qy = Math.abs(y) - hh + r;
  return len(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
export const sdCircle = (x: number, y: number, r: number) => len(x, y) - r;
export function sdEllipse(x: number, y: number, a: number, b: number) {
  const k = len(x / a, y / b);
  return (k - 1) * Math.min(a, b) * (k < 1 ? 1 : 1);
}
export function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
export function sdPoly(x: number, y: number, pts: number[][]) {
  let d = Infinity, s = 1;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i], ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    const dx = wx - ex * t, dy = wy - ey * t;
    d = Math.min(d, dx * dx + dy * dy);
    const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}

export interface Geo {
  W: number;
  H: number;
  /** 얼굴 중심 */
  face: [number, number];
  /** 몸통 중심 (타격·이펙트 기준) */
  cy: number;
  /** 결정면 음영(수정류) */
  facet?: number[][];
  sdf: (x: number, y: number, t: number) => number;
}

/** 모양 하나의 기하. W·H는 대략적인 폭·높이(px). */
export function geometry(shape: Shape, W: number, H: number): Geo {
  const hw = W / 2;
  switch (shape) {
    case "dummy": {
      const hr = W * 0.3, hy = hr + 3, by0 = hy + hr - 1, bh = (H - by0) / 2;
      return {
        W, H, face: [0, hy], cy: by0 + bh * 0.8,
        sdf: (x, y) => {
          const head = sdCircle(x, y - hy, hr);
          const body = sdBox(x, y - (by0 + bh), hw * 0.78 * (1 - 0.1 * ((y - by0) / (bh * 2))), bh, 5);
          const arms = sdBox(x, y - (by0 + 7), hw * 1.25, 3, 2.5);
          const neck = sdBox(x, y - by0, 3, 3);
          return Math.min(smin(smin(head, neck, 4), body, 4), arms);
        },
      };
    }
    case "barrel":
    case "keg": {
      const hh = shape === "keg" ? H * 0.4 : H / 2 - 2, cy = (shape === "keg" ? 6 : 2) + hh;
      return {
        W, H, face: [0, cy - hh * 0.2], cy,
        sdf: (x, y) => {
          const v = (y - cy) / hh, bul = 0.84 + 0.16 * Math.cos(Math.min(1, Math.abs(v)) * Math.PI * 0.5);
          return Math.min(sdBox(x, y - cy, hw * bul * (shape === "keg" ? 1.12 : 1), hh, 3), sdBox(x, y - 2, 3, 3));
        },
      };
    }
    case "ball": {
      const r = Math.min(W * 0.66, H * 0.48), cy = r + 7;
      return { W, H, face: [0, cy - 2], cy, sdf: (x, y) => Math.min(sdCircle(x, y - cy, r), sdBox(x, y - 4, 2.5, 4)) };
    }
    case "slime": {
      const cy = H * 0.58, rx = W * 0.62, ry = H * 0.38;
      return {
        W, H, face: [0, cy - 2], cy,
        sdf: (x, y, t) => {
          const w = Math.sin(t * 3.1) * 0.04, by = y - cy;
          const body = sdEllipse(x, by + (by > 0 ? by * 0.15 : 0), rx * (1 + w), ry * (1 - w));
          const drop = sdCircle(x, y - 10, 5);
          return Math.min(smin(body, drop, 12), sdBox(x, y - 3, 2, 3));
        },
      };
    }
    case "stump": {
      const cy = H * 0.52;
      return {
        W, H, face: [0, cy - 4], cy,
        sdf: (x, y) => {
          const v = (y - 4) / (H - 4), flare = 0.9 + Math.pow(Math.max(0, v - 0.7) / 0.3, 2) * 0.35;
          const top = 4 + Math.abs(Math.sin(x * 0.9)) * 3;
          const body = sdBox(x, y - (top + H) / 2, hw * flare, (H - top) / 2, 3);
          const branch = sdBox(x - hw * 0.9, y - H * 0.3, 7, 2.5, 2);
          return Math.min(smin(body, branch, 5), sdBox(x, y - 2, 2, 3));
        },
      };
    }
    case "mushroom": {
      const capY = H * 0.3, rx = W * 0.8, ry = H * 0.27;
      return {
        W, H, face: [0, H * 0.66], cy: H * 0.5,
        sdf: (x, y) => {
          const cap = Math.max(sdEllipse(x, y - capY, rx, ry), y - capY - ry * 0.55);
          const stem = sdBox(x, y - H * 0.7, W * 0.34 * (1 + (y - H * 0.5) / H * 0.3), H * 0.27, 6);
          return Math.min(smin(cap, stem, 3), sdBox(x, y - 2, 2, 3));
        },
      };
    }
    case "golem": {
      const cy = H * 0.52;
      return {
        W, H, face: [0, 11], cy,
        sdf: (x, y) => {
          const head = sdBox(x, y - 11, 8, 7, 2);
          const torso = sdBox(x, y - cy, hw * 0.72, H * 0.24, 4);
          const sh = Math.min(sdCircle(x - hw * 0.8, y - (cy - H * 0.12), 7), sdCircle(x + hw * 0.8, y - (cy - H * 0.12), 7));
          const hip = sdBox(x, y - H * 0.84, hw * 0.55, H * 0.13, 3);
          return Math.min(smin(Math.min(head, torso), sh, 3), hip);
        },
      };
    }
    case "crystal": {
      const pts = [[0, 1], [hw * 0.95, H * 0.24], [hw * 0.78, H * 0.78], [0, H], [-hw * 0.78, H * 0.78], [-hw * 0.95, H * 0.24]];
      // 결정면: 중심 쪽 마름모가 밝은 면
      const facet = [[0, H * 0.18], [hw * 0.45, H * 0.36], [hw * 0.36, H * 0.72], [0, H * 0.88], [-hw * 0.36, H * 0.72], [-hw * 0.45, H * 0.36]];
      return { W, H, face: [0, H * 0.45], cy: H * 0.5, facet, sdf: (x, y) => sdPoly(x, y, pts) };
    }
    case "snowman": {
      const r1 = H * 0.25, r2 = H * 0.18, r3 = H * 0.14;
      const y1 = H - r1, y2 = y1 - (r1 + r2) * 0.8, y3 = y2 - (r2 + r3) * 0.8;
      return {
        W, H, face: [0, y3], cy: y2 + 4,
        sdf: (x, y) => Math.min(smin(smin(sdCircle(x, y - y1, r1), sdCircle(x, y - y2, r2), 3), sdCircle(x, y - y3, r3), 3), sdBox(x, y - (y3 - r3), 2, 3)),
      };
    }
    case "egg": {
      const cy = H * 0.52, rx = W * 0.58, ry = H * 0.47;
      return {
        W, H, face: [0, cy], cy,
        sdf: (x, y) => {
          const v = (y - cy) / ry;
          return Math.min(sdEllipse(x / (1 + 0.16 * v), y - cy, rx, ry), sdBox(x, y - 2, 2, 3));
        },
      };
    }
    case "chest": {
      const cy = H * 0.6, bw = W * 0.66, bh = H * 0.27;
      return {
        W, H, face: [0, cy - bh + 2], cy,
        sdf: (x, y) => {
          const box = sdBox(x, y - cy, bw, bh, 2);
          const lid = Math.max(sdEllipse(x, y - (cy - bh), bw + 1, H * 0.2), y - (cy - bh) - 1);
          return Math.min(Math.min(box, lid), sdBox(x, y - 4, 2, 4));
        },
      };
    }
    case "skull": {
      const r = W * 0.6, cy = r + 6;
      return {
        W, H, face: [0, cy + 2], cy: cy + 4,
        sdf: (x, y) => {
          const cran = sdCircle(x, y - cy, r);
          const jaw = sdBox(x, y - (cy + r * 0.9), r * 0.6, r * 0.32, 3);
          return Math.min(smin(cran, jaw, 6), sdBox(x, y - 3, 2, 3));
        },
      };
    }
    case "ghost": {
      const r = W * 0.6, cy = r + 4;
      return {
        W, H, face: [0, cy + 2], cy: H * 0.5,
        sdf: (x, y, t) => {
          const head = sdCircle(x, y - cy, r);
          const wav = Math.sin(x * 0.55 + t * 5) * 2.5;
          const body = Math.max(sdBox(x * (1 + (y - cy) / H * 0.25), y - (cy + H) / 2, r, (H - cy) / 2), y - (H - 3 + wav));
          return Math.min(smin(head, body, 3), sdBox(x, y - 2, 2, 3));
        },
      };
    }
    case "statue": {
      return {
        W, H, face: [0, 11], cy: H * 0.6,
        sdf: (x, y) => {
          const head = sdCircle(x, y - 11, 8.5);
          const neck = sdBox(x, y - 21, 4, 3);
          const v = (y - 24) / (H - 24);
          const torso = sdBox(x, y - (24 + H) / 2, hw * (0.8 + 0.3 * Math.min(1, v * 3)) * (1 - Math.max(0, v - 0.6) * 0.5), (H - 24) / 2, 6);
          return Math.min(smin(smin(head, neck, 3), torso, 4), sdBox(x, y - 1, 2, 2));
        },
      };
    }
    case "cloud": {
      const cy = H * 0.5;
      const cs = [[0, cy - 10, W * 0.38], [-hw * 0.6, cy, W * 0.36], [hw * 0.6, cy + 1, W * 0.38], [-hw * 0.2, cy + 12, W * 0.38], [hw * 0.3, cy + 13, W * 0.34], [0, cy + 2, W * 0.42]];
      return {
        W, H, face: [0, cy + 2], cy,
        sdf: (x, y, t) => {
          let d = Infinity;
          for (let i = 0; i < cs.length; i++) d = smin(d, sdCircle(x - cs[i][0], y - cs[i][1] - Math.sin(t * 2 + i) * 0.6, cs[i][2]), 5);
          return Math.min(d, sdBox(x, y - 4, 1.5, 6));
        },
      };
    }
    case "rift": {
      const cy = H * 0.52;
      return {
        W, H, face: [0, cy], cy,
        sdf: (x, y, t) => Math.min(sdEllipse(x, y - cy, hw * (0.9 + Math.sin(t * 2) * 0.04), H * 0.46), sdBox(x, y - 2, 2, 3)),
      };
    }
    default: {
      // sack: 위는 묶여서 좁고 아래로 갈수록 볼록
      const cy = H / 2 + 3, hh = H / 2 - 3;
      return {
        W, H, face: [0, cy - hh * 0.35], cy,
        sdf: (x, y) => {
          const v = (y - cy) / hh, bul = 0.86 + 0.14 * (1 - v * v) + Math.max(0, v) * 0.06;
          const body = sdBox(x, y - cy, hw * bul, hh, Math.min(hw * 0.7, 9));
          const knot = sdBox(x, y - 3, 3.5, 3.5, 1);
          return smin(body, knot, 3);
        },
      };
    }
  }
}
