// 지역 배경: 하늘 → 먼 실루엣 → 벽·소품 → 바닥. 한 번 그려 배경 프레임에 굽고,
// 횃불·반딧불·눈·불씨 같은 움직이는 것은 drawAmbient가 매 프레임 그린다.
import { Painter, Color, hex, ramp, mix, scale, noise2, fbm, WHITE, TAU } from "../vendor/pixelfx/core/index.js";
import type { RegionDef } from "../data/bags";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dith = (x: number, y: number) => BAYER[((Math.floor(y) & 3) << 2) | (Math.floor(x) & 3)];
const h1 = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

export function drawBackdrop(p: Painter, r: RegionDef, W: number, H: number, FY: number) {
  const SKY = ramp(r.sky), FAR = ramp(r.far), FL = ramp(r.floor), WL = ramp(r.wall);
  p.reset();
  // 하늘: 단계 램프 + 경계 디더
  p.shade(0, 0, W, FY, (x, y) => {
    const v = (y / FY) * (SKY.length - 1), i = Math.floor(v), f = v - i;
    return SKY[Math.min(SKY.length - 1, f > 0.82 + dith(x, y) * 0.18 ? i + 1 : i)];
  });
  const props = r.props;
  // 먼 실루엣
  if (props === "forest") {
    for (let layer = 0; layer < 3; layer++) {
      const base = FY - 40 + layer * 14, c = FAR[layer];
      p.shade(0, 0, W, FY, (x, y) => {
        const tx = Math.floor((x + layer * 37) / 9), tip = base - 22 - h1(tx + layer * 13) * 26 + Math.abs(((x + layer * 37) % 9) - 4.5) * 3;
        return y > tip ? c : 0;
      });
    }
    // 빛줄기
    for (let i = 0; i < 4; i++) {
      const x0 = W * (0.15 + i * 0.25);
      p.shade(x0 - 10, 0, x0 + 30, FY, (x, y) => (Math.abs(x - x0 - y * 0.25) < 3 + i && dith(x, y) < 0.35 ? mix(SKY[4], WHITE, 0.3) : 0));
    }
    // 양옆 큰 나무
    for (const s of [-1, 1]) {
      const cx = s < 0 ? 8 : W - 8;
      p.shade(cx - 14, 0, cx + 14, FY, (x, y) => {
        const w = 9 + Math.sin(y * 0.05) * 2 + (y > FY - 12 ? (FY - y - 12) * -0.8 : 0);
        if (Math.abs(x - cx) > w) return;
        const l = (x - cx) / w;
        return l < -0.5 ? hex("#4a3420") : l < 0.3 ? hex("#3a2616") : hex("#24160c");
      });
    }
  } else if (props === "ice" || props === "volcano") {
    // 산·절벽
    for (let layer = 0; layer < 3; layer++) {
      p.shade(0, 0, W, FY, (x, y) => {
        const hgt = FY - 30 - layer * -10 - (fbm(x * 0.02 + layer * 5, layer, 7, 3) * 70 + 20) * (1 - layer * 0.25);
        if (y < hgt) return 0;
        const snow = props === "ice" && y < hgt + 5 && layer < 2;
        return snow ? mix(FAR[layer], WHITE, 0.6) : FAR[layer];
      });
    }
    if (props === "volcano") {
      // 화산: 원뿔 실루엣, 분화구의 용암, 흘러내리는 용암 줄기
      const vx = W * 0.72, top = FY - 118, base = FY - 4;
      p.poly([[vx - 70, base], [vx - 9, top], [vx + 9, top], [vx + 70, base]], hex("#2a0c0c"));
      p.poly([[vx - 70, base], [vx - 9, top], [vx - 2, top], [vx - 40, base]], hex("#3a1410"));
      p.rect(vx - 9, top - 1, 18, 3, hex("#ff8a2a"));
      p.rect(vx - 6, top - 2, 12, 1, hex("#ffe08a"));
      for (const [sx, k] of [[-4, 1], [3, -0.7], [6, 1.6]] as number[][]) {
        let x = vx + sx;
        for (let y = top + 1; y < base - 6; y++) {
          x += Math.sin(y * 0.21 + sx) * 0.5 + k * 0.18;
          p.px(x, y, (y & 3) ? hex("#d84010") : hex("#ff8a2a"));
        }
      }
    }
  } else if (props === "sky") {
    for (let i = 0; i < 7; i++) {
      const cx = h1(i) * W, cy = 20 + h1(i + 9) * (FY - 80), rw = 16 + h1(i + 3) * 24;
      for (let k = 0; k < 4; k++) p.circle(cx + (k - 1.5) * rw * 0.4, cy + Math.abs(k - 1.5) * 2, rw * 0.35, k % 2 ? FAR[0] : FAR[1]);
    }
    // 떠 있는 섬
    for (const [fx, fy, s] of [[W * 0.18, FY - 70, 1], [W * 0.84, FY - 90, 0.7]]) {
      p.ellipse(fx, fy, 18 * s, 4 * s, hex("#5ab050"));
      p.tri(fx - 18 * s, fy, fx, fy + 22 * s, fx + 18 * s, fy, hex("#8a7a6a"));
      p.line(fx - 18 * s, fy, fx + 18 * s, fy, hex("#86d070"));
    }
  } else if (props === "abyss") {
    p.shade(0, 0, W, FY, (x, y) => {
      const n = fbm(x * 0.03, y * 0.03, 3, 3);
      if (h1(Math.floor(x) * 12.9898 + Math.floor(y) * 78.233) > 0.993) return WHITE;
      return n > 0.62 ? mix(SKY[3], hex("#ff60c0"), 0.25) : n > 0.55 ? SKY[3] : 0;
    });
    for (let i = 0; i < 5; i++) {
      const cx = h1(i + 2) * W, cy = 30 + h1(i + 7) * (FY - 90);
      p.poly([[cx - 8, cy], [cx + 7, cy - 2], [cx + 4, cy + 7], [cx - 5, cy + 6]], FAR[1]);
      p.line(cx - 8, cy, cx + 7, cy - 2, FAR[0]);
    }
  }
  // 실내 벽 (수련장·광산·마왕성)
  if (props === "dojo" || props === "mine" || props === "castle") {
    const wallTop = props === "dojo" ? 0 : 0;
    p.shade(0, wallTop, W, FY, (x, y) => {
      if (props === "dojo") {
        // 나무 판자 벽, 가운데 큰 창
        const win = Math.abs(x - W / 2) < W * 0.3 && y > 24 && y < FY - 50;
        if (win) {
          const fr = Math.abs(x - W / 2) > W * 0.3 - 3 || y < 27 || y > FY - 53 || Math.abs(x - W / 2) < 1.5 || Math.abs(y - (24 + FY - 50) / 2) < 1.5;
          return fr ? WL[1] : 0;
        }
        const plank = Math.floor(x / 11), seam = x % 11 < 1;
        if (seam) return WL[0];
        const n = noise2(plank * 3.1, y * 0.08, 4);
        return n > 0.7 ? WL[3] : n < 0.25 ? WL[1] : WL[2];
      }
      if (props === "mine") {
        const n = fbm(x * 0.06, y * 0.06, 9, 3), m = noise2(x * 0.25, y * 0.25, 2);
        if (m > 0.93) return hex("#ffd060");
        return n > 0.62 ? WL[3] : n > 0.5 ? WL[2] : n > 0.38 ? WL[1] : WL[0];
      }
      // 성벽: 벽돌 + 아치 창
      const winC = Math.abs(x - W / 2) < 18 && y > 30 && y < FY - 60 && (y > 46 || Math.hypot(x - W / 2, y - 46) < 18);
      if (winC) return 0;
      const row = Math.floor(y / 6), bx = (x + (row % 2) * 7) % 14;
      if (y % 6 < 1 || bx < 1) return WL[0];
      return noise2(Math.floor((x + (row % 2) * 7) / 14), row, 5) > 0.6 ? WL[2] : WL[1];
    });
    if (props === "castle") {
      p.circle(W / 2 + 6, 52, 9, hex("#e8d0ff"));
      p.circle(W / 2 + 9, 50, 8, hex("#2a1838"));
    }
    if (props === "mine") {
      // 나무 갱목
      for (const x0 of [W * 0.1, W * 0.9]) {
        p.rect(x0 - 4, 0, 8, FY, hex("#3a2412"));
        p.rect(x0 - 4, 0, 2, FY, hex("#5a3a1e"));
      }
      p.rect(0, 6, W, 7, hex("#3a2412"));
      p.rect(0, 6, W, 2, hex("#5a3a1e"));
    }
    if (props === "dojo") {
      // 깃발
      for (const [x0, c] of [[W * 0.1, "#b02a2a"], [W * 0.9, "#2a5ab0"]] as [number, string][]) {
        p.rect(x0 - 6, 14, 12, 40, hex(c));
        p.rect(x0 - 6, 14, 3, 40, scale(hex(c), 1.25));
        p.tri(x0 - 6, 54, x0, 60, x0 + 6, 54, hex(c));
        p.circle(x0, 30, 3, hex("#ffd27a"));
        p.rect(x0 - 8, 12, 16, 2, hex("#5a3a1e"));
      }
    }
  }
  if (props === "sky") {
    for (const x0 of [W * 0.08, W * 0.92]) {
      p.shade(x0 - 7, 0, x0 + 7, FY, (x) => { const v = (x - x0 + 7) / 14; return v < 0.2 ? WL[3] : v < 0.6 ? WL[2] : v < 0.85 ? WL[1] : WL[0]; });
      for (let y = 0; y < FY; y += 8) p.line(x0 - 4, y, x0 - 4, y + 5, WL[3]);
    }
  }
  if (props === "forest") {
    // 덤불
    p.shade(0, FY - 12, W, FY, (x, y) => (y > FY - 6 - Math.abs(Math.sin(x * 0.3)) * 6 ? (y < FY - 4 - Math.abs(Math.sin(x * 0.3)) * 6 ? hex("#3a6a2a") : hex("#1e3a16")) : 0));
  }
  // 바닥: 원근 판자/타일 + 윗단 하이라이트
  const FH = H - FY;
  p.shade(0, FY, W, H, (x, y) => {
    const v = (y - FY) / FH;
    if (y < FY + 1) return FL[4];
    if (y < FY + 2) return FL[3];
    const persp = (x - W / 2) * (1 + v * 1.6);
    let c: number;
    if (props === "ice") c = noise2(x * 0.1, y * 0.2, 3) > 0.6 ? FL[4] : FL[3];
    else if (props === "forest") c = noise2(x * 0.3, y * 0.5, 3) > 0.55 ? FL[3] : FL[2];
    else {
      const seam = Math.abs((persp / 14) % 1) < 0.08 / (1 + v) || (props !== "dojo" && Math.abs(((y - FY) / (4 + v * 6)) % 1) < 0.15);
      c = seam ? FL[1] : noise2(Math.floor(persp / 14), y * 0.05, 9) > 0.6 ? FL[3] : FL[2];
    }
    const dark = v * 1.2 + dith(x, y) * 0.3;
    return dark > 1.05 ? scale(c, 0.6) : dark > 0.75 ? scale(c, 0.8) : c;
  });
  if (props === "volcano") p.shade(0, FY + 6, W, H, (x, y) => (Math.abs(Math.sin(x * 0.05 + y * 0.3)) < 0.06 ? hex("#ff6020") : 0));
  // 비네트
  p.shade(0, 0, W, H, (x, y, o) => {
    const dx = (x / W - 0.5) * 2, dy = (y / H - 0.45) * 2, d = dx * dx * 0.8 + dy * dy * 0.6;
    if (d < 0.55) return;
    const c = p.get(x, y);
    if (!c) return;
    o.a = 1;
    return d > 0.95 + dith(x, y) * 0.1 ? scale(c, 0.6) : d > 0.7 + dith(x, y) * 0.1 ? scale(c, 0.8) : c;
  });
}

/** 샌드백을 매다는 들보 */
export function drawBeam(p: Painter, r: RegionDef, W: number, ay: number) {
  p.reset();
  const metal = r.props === "mine" || r.props === "castle" || r.props === "abyss";
  const gold = r.props === "sky";
  const C = metal ? ramp(["#14141c", "#2c2c3a", "#4a4a5a", "#70707e"]) : gold ? ramp(["#5a4a2a", "#9a7a3a", "#d0a850", "#ffe08a"]) : ramp(["#2a160a", "#4a2c14", "#6e4420", "#946030"]);
  const y0 = ay - 9;
  p.rect(0, y0, W, 8, C[0]);
  p.rect(0, y0 + 1, W, 6, C[2]);
  p.rect(0, y0 + 1, W, 1, C[3]);
  p.rect(0, y0 + 6, W, 1, C[1]);
  for (let x = 6; x < W; x += 24) { p.px(x, y0 + 3, C[0]); p.px(x + 1, y0 + 2, C[3]); }
  // 고리 받침
  const cx = Math.round(W / 2);
  p.rect(cx - 4, y0 + 6, 9, 4, C[0]);
  p.rect(cx - 3, y0 + 7, 7, 2, C[3]);
}

/** 움직이는 배경 요소. front면 샌드백 앞쪽(눈발·불씨 등) */
export function drawAmbient(p: Painter, r: RegionDef, W: number, H: number, FY: number, t: number, front: boolean) {
  p.reset();
  const ac = hex(r.accent);
  const parts = (n: number, f: (i: number, u: number, s: number) => void) => {
    for (let i = 0; i < n; i++) f(i, h1(i * 3.7 + 1), h1(i * 7.1 + 2));
  };
  if (!front) {
    switch (r.props) {
      case "dojo":
        for (const x0 of [W * 0.22, W * 0.78]) torch(p, x0, FY - 58, t, x0);
        break;
      case "mine":
        for (const x0 of [W * 0.1, W * 0.9]) lantern(p, x0, 26, t);
        break;
      case "castle":
        for (const x0 of [W * 0.2, W * 0.8]) torch(p, x0, FY - 70, t, x0, hex("#c060ff"));
        p.glow(W / 2 + 6, 52, 30, hex("#c8a0ff"), 0.15);
        break;
      case "volcano":
        p.glow(W * 0.7, FY - 100, 50, hex("#ff5a20"), 0.25 + 0.08 * Math.sin(t * 2));
        p.glow(W / 2, FY + 10, W * 0.6, hex("#ff4010"), 0.12);
        break;
      case "ice": {
        // 오로라
        for (let x = 0; x < W; x += 2) {
          const y = 22 + Math.sin(x * 0.04 + t * 0.6) * 8 + Math.sin(x * 0.11 - t) * 3;
          p.glowLine(x, y, x, y + 16 + Math.sin(x * 0.07 + t) * 6, 3, x % 6 ? hex("#40ffb0") : hex("#60a0ff"), 0.07);
        }
        break;
      }
      case "forest":
        parts(14, (i, u, s) => {
          const x = (u * W + Math.sin(t * 0.7 + i) * 12 + W) % W, y = 30 + s * (FY - 40) + Math.sin(t * 1.3 + i * 2) * 6;
          const on = Math.sin(t * 2 + i * 1.7) > -0.2;
          if (on) { p.px(x, y, hex("#d8ff80")); p.glow(x, y, 6, hex("#b0ff60"), 0.5); }
        });
        break;
      case "sky":
        parts(10, (i, u, s) => {
          const x = (u * W + t * (4 + s * 6)) % (W + 40) - 20, y = 20 + s * 70;
          for (let k = -1; k <= 1; k++) p.disc(x + k * (5 + s * 3), y - (k === 0 ? 2 : 0), 3 + s * 2 + (k === 0 ? 1 : 0), hex("#ffffff"), 0.35);
        });
        break;
      case "abyss":
        parts(12, (i, u, s) => {
          const a = t * 0.3 + i, x = u * W + Math.cos(a) * 10, y = s * FY + Math.sin(a) * 10;
          p.px(x, y, hex("#ff80e0"));
          p.glow(x, y, 7, hex("#c040ff"), 0.4);
        });
        break;
    }
    return;
  }
  // 앞쪽 입자
  switch (r.props) {
    case "ice":
      parts(36, (i, u, s) => {
        const y = ((s * H + t * (14 + u * 16)) % (H + 10)) - 5, x = (u * W + Math.sin(t + i) * 8 + W) % W;
        p.px(x, y, i % 3 ? hex("#e8f4ff") : WHITE);
      });
      break;
    case "volcano":
      parts(20, (i, u, s) => {
        const y = H - ((s * H + t * (20 + u * 30)) % (H + 10)), x = (u * W + Math.sin(t * 2 + i) * 10 + W) % W;
        p.px(x, y, i % 2 ? hex("#ffb040") : hex("#ff6020"));
        p.glow(x, y, 4, hex("#ff7020"), 0.3);
      });
      break;
    case "dojo":
    case "mine":
      parts(10, (i, u, s) => {
        const x = (u * W + Math.sin(t * 0.4 + i) * 20 + W) % W, y = 20 + ((s * FY + t * 3) % FY);
        p.dot(x, y, scale(ac, 0.8), 0.5);
      });
      break;
    case "sky":
      parts(12, (i, u, s) => {
        const tw = Math.sin(t * 3 + i * 2);
        if (tw > 0.6) { const x = u * W, y = s * FY; p.px(x, y, WHITE); p.glow(x, y, 4, hex("#fff0a0"), 0.4); }
      });
      break;
    case "castle":
      // 박쥐
      parts(3, (i, u, s) => {
        const x = ((u * W + t * (18 + i * 6)) % (W + 40)) - 20, y = 30 + s * 40 + Math.sin(t * 3 + i) * 6, f = Math.sin(t * 18 + i) > 0;
        p.px(x, y, hex("#0a0610"));
        p.line(x - 3, y + (f ? -2 : 1), x, y, hex("#0a0610"));
        p.line(x + 3, y + (f ? -2 : 1), x, y, hex("#0a0610"));
      });
      break;
  }
  void TAU; void ac;
}

function torch(p: Painter, x: number, y: number, t: number, seed: number, flame: Color = hex("#ff9a30")) {
  p.rect(x - 1, y, 3, 9, hex("#3a2412"));
  p.rect(x - 2, y - 1, 5, 2, hex("#6a6a7a"));
  const f = Math.sin(t * 13 + seed) * 0.5 + Math.sin(t * 7.3 + seed) * 0.5;
  const h = 5 + f * 1.5;
  p.tri(x - 2.5, y - 1, x + 0.5 + f, y - 1 - h, x + 3.5, y - 1, flame);
  p.tri(x - 1, y - 1, x + 0.5 + f * 0.6, y - 1 - h * 0.6, x + 2, y - 1, hex("#ffe080"));
  p.glow(x + 0.5, y - 3, 26 + f * 3, flame, 0.32);
}
function lantern(p: Painter, x: number, y: number, t: number) {
  p.line(x, y - 10, x, y - 4, hex("#2a2a30"));
  p.rect(x - 3, y - 4, 7, 8, hex("#2a2a30"));
  p.rect(x - 2, y - 3, 5, 6, hex("#ffc050"));
  p.glow(x + 0.5, y, 30 + Math.sin(t * 9) * 2, hex("#ffa040"), 0.35);
}
