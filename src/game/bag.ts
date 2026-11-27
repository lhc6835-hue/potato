// 매달린 샌드백: 진자 운동, 찌그러짐(스쿼시), 움푹 들어감(덴트), 금, 상태이상, 꽂힌 무기.
// 몸통은 SDF로 그린다: 경사(gradient)로 법선을 구해 왼쪽 위에서 빛을 받는 입체 음영을 단계 램프로 칠한다.
import { Painter, Color, ramp, hex, mix, scale, clamp, Rng, WHITE } from "../vendor/pixelfx/core/index.js";
import type { BagDef } from "../data/bags";
import { geometry, Geo } from "./sdf";
import { drawDeco, drawFace, drawCracks, makeCracks, Crack } from "./bagdeco";

export interface Stuck { lx: number; ly: number; ang: number; kind: string; wid: string; life: number; depth: number; fall?: boolean }
export interface Dent { x: number; y: number; r: number; a: number; life: number; max: number }

const ICE = ramp(["#0e1e44", "#1a3a72", "#2a5ea6", "#4a8ad0", "#7ab8ec", "#b4e0ff", "#ecf8ff"]);
const GOLD = ramp(["#2a1804", "#5a360a", "#8e5a10", "#c48a18", "#ecb828", "#ffe066", "#fff8c8"]);
const LX = -0.45, LY = -0.62, LZ = 0.64; // 빛 방향 (왼쪽 위 앞)

export type MatKind = "soft" | "wood" | "metal" | "stone" | "goo" | "ice" | "ghost";
export function matOf(d: BagDef): MatKind {
  switch (d.debris) {
    case "wood": case "leaf": return "wood";
    case "metal": case "gear": case "gold": return "metal";
    case "rock": case "lava": case "bone": return "stone";
    case "goo": return "goo";
    case "ice": case "crystal": case "snow": return "ice";
    case "ecto": case "void": return "ghost";
    default: return "soft";
  }
}

// 재질 질감: 샌드백 로컬 좌표의 정수 셀로 해시를 만들어, 흔들려도 무늬가 몸통에 붙어 있다.
function h2(x: number, y: number) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function texture(kind: string, x: number, y: number): number {
  const fx = Math.floor(x), fy = Math.floor(y);
  switch (kind) {
    case "straw": return (h2(fx, fy >> 2) - 0.5) * 0.5 + (fx % 3 === 0 ? -0.12 : 0);
    case "sand": case "powder": return ((fx + fy) & 1 ? 0.05 : -0.05) + (h2(fx >> 1, fy >> 1) - 0.5) * 0.12;
    case "wood": return Math.sin(fy * 0.9 + Math.sin(fx * 0.35) * 2.2) > 0.82 ? -0.32 : 0;
    case "leaf": case "spore": return (h2(fx >> 2, fy >> 2) - 0.5) * 0.4;
    case "rock": case "lava": return (h2(fx >> 1, fy >> 1) - 0.5) * 0.25 + (h2(fx >> 3, fy >> 3) - 0.5) * 0.3;
    case "snow": case "feather": return (h2(fx >> 1, fy >> 1) - 0.5) * 0.14;
    case "bone": return (h2(fx >> 2, fy) - 0.5) * 0.18;
    default: return 0;
  }
}

export class Bag {
  def: BagDef;
  geo: Geo;
  R: Color[];
  T: Color[];
  hp = 1;
  max = 1;
  boss = false;
  elite = false;
  golden = false;
  ax = 0;
  ay = 0;
  L = 30;
  th = 0;
  om = 0;
  wob = 0;
  wv = 0;
  sqx = 0;
  vqx = 0;
  sqy = 0;
  vqy = 0;
  drop = -200;
  dropV = 0;
  entering = true;
  dead = false;
  t = 0;
  flash = 0;
  flashC: Color = WHITE;
  hurt = 0;
  dents: Dent[] = [];
  stuck: Stuck[] = [];
  cracks: Crack[];
  mat: MatKind;
  // 상태이상
  burn = 0; burnDps = 0;
  frost = 0; frozen = 0;
  poison = 0; poisonDps = 0;
  shock = 0; curse = 0; holy = 0;
  scale: number;

  constructor(def: BagDef, hp: number, opts: { boss?: boolean; elite?: boolean; golden?: boolean; seed?: number } = {}) {
    this.def = def;
    this.boss = !!opts.boss;
    this.elite = !!opts.elite;
    this.golden = !!opts.golden;
    this.scale = this.boss ? 1.28 : this.elite ? 1.14 : 1;
    const W = Math.round(34 * this.scale), H = Math.round(60 * this.scale);
    this.geo = geometry(def.shape, W, H);
    this.R = this.golden ? GOLD : ramp(def.ramp);
    this.T = ramp(def.trim);
    this.hp = this.max = hp;
    this.mat = this.golden ? "metal" : matOf(def);
    this.cracks = makeCracks(new Rng(opts.seed ?? 7), this.geo);
  }

  get frac() { return clamp(this.hp / this.max); }

  /** 화면 좌표 → 샌드백 로컬 */
  toLocal(wx: number, wy: number): [number, number] {
    const a = this.th + this.wob, c = Math.cos(a), s = Math.sin(a);
    const dx = wx - this.ax, dy = wy - (this.ay + this.drop);
    const lx = dx * c + dy * s, ly = -dx * s + dy * c - this.L;
    return [lx, ly];
  }
  toWorld(lx: number, ly: number): [number, number] {
    const a = this.th + this.wob, c = Math.cos(a), s = Math.sin(a), y = ly + this.L;
    return [this.ax + lx * c - y * s, this.ay + this.drop + lx * s + y * c];
  }
  /** 찌그러짐을 되돌린 로컬 좌표 */
  private unsquash(x: number, y: number): [number, number] {
    const cy = this.geo.cy, kx = 1 - this.sqx * 0.22 + this.sqy * 0.12, ky = 1 - this.sqy * 0.2 + this.sqx * 0.14;
    return [x / kx, cy + (y - cy) / ky];
  }
  dist(lx: number, ly: number) {
    const [x, y] = this.unsquash(lx, ly);
    let d = this.geo.sdf(x, y, this.t);
    for (const n of this.dents) {
      const dx = x - n.x, dy = y - n.y, k = n.life / n.max;
      d += n.a * k * k * Math.exp(-(dx * dx + dy * dy) / (n.r * n.r));
    }
    return d;
  }
  hitTest(wx: number, wy: number, pad = 0) {
    if (this.dead || this.entering) return false;
    const [lx, ly] = this.toLocal(wx, wy);
    return this.dist(lx, ly) < pad;
  }
  center(): [number, number] {
    return this.toWorld(0, this.geo.cy);
  }
  /** 화면 아무 곳이나 눌렀을 때 맞을 지점: 몸통 안이면 그대로, 밖이면 중심 쪽으로 당겨 표면 근처로 */
  aimPoint(wx: number, wy: number): [number, number] {
    if (this.hitTest(wx, wy)) return [wx, wy];
    const [cx, cy] = this.center();
    let [x, y] = [wx, wy];
    for (let i = 0; i < 24; i++) {
      x = x + (cx - x) * 0.18;
      y = y + (cy - y) * 0.18;
      if (this.hitTest(x, y, -3)) break;
    }
    return [x, y];
  }

  /** 맞았다: 진자에 충격, 찌그러짐, 덴트, 번쩍임 */
  impact(wx: number, wy: number, dirx: number, diry: number, power: number, flashC: Color = WHITE) {
    const [lx, ly] = this.toLocal(wx, wy);
    const lever = this.L + this.geo.cy;
    const k = Math.min(3, power) / this.scale;
    this.om += ((dirx * 30 * k) / Math.max(40, lever)) * (this.frozen > 0 ? 0.15 : 1);
    this.om = clamp(this.om, -2.6, 2.6);
    this.wv += dirx * 9 * k * (ly > this.geo.cy ? -1 : 1) * 0.5;
    const ax = Math.abs(dirx), ay = Math.abs(diry);
    this.vqx += (ax * 9 + 2) * k;
    this.vqy += ay * 9 * k;
    this.dents.push({ x: lx, y: ly, r: 7 + 5 * Math.min(2, power), a: 2.2 + 2.2 * Math.min(2, power), life: 0.32, max: 0.32 });
    if (this.dents.length > 6) this.dents.shift();
    this.flash = 0.05;
    this.flashC = flashC;
    this.hurt = 0.28;
  }

  update(dt: number) {
    this.t += dt;
    // 등장: 위에서 떨어져서 튕기며 멈춘다
    if (this.entering) {
      this.dropV += 1600 * dt;
      this.drop += this.dropV * dt;
      if (this.drop >= 0) {
        this.drop = 0;
        if (this.dropV > 160) {
          this.dropV = -this.dropV * 0.28;
          this.vqy += 4;
        } else {
          this.dropV = 0;
          this.entering = false;
        }
      }
    }
    const g = 900, lever = this.L + this.geo.cy;
    const damp = this.frozen > 0 ? 6 : 1.7;
    this.om += (-(g / lever) * Math.sin(this.th) - damp * this.om) * dt;
    this.th += this.om * dt;
    if (Math.abs(this.th) > 0.55) { this.th = clamp(this.th, -0.55, 0.55); this.om *= -0.3; }
    // 몸통 흔들림 (고리 기준 작은 비틀림)
    this.wv += (-160 * this.wob - 9 * this.wv) * dt;
    this.wob += this.wv * dt;
    this.wob = clamp(this.wob, -0.35, 0.35);
    // 스쿼시 스프링
    this.vqx += (-420 * this.sqx - 16 * this.vqx) * dt;
    this.sqx += this.vqx * dt;
    this.vqy += (-420 * this.sqy - 16 * this.vqy) * dt;
    this.sqy += this.vqy * dt;
    this.sqx = clamp(this.sqx, -0.6, 0.8);
    this.sqy = clamp(this.sqy, -0.6, 0.8);
    for (let i = this.dents.length - 1; i >= 0; i--) if ((this.dents[i].life -= dt) <= 0) this.dents.splice(i, 1);
    this.flash -= dt;
    this.hurt -= dt;
    this.burn -= dt; this.frozen -= dt; this.shock -= dt; this.curse -= dt; this.holy -= dt;
    if (this.frost > 0) this.frost = Math.max(0, this.frost - dt * 0.8);
    this.poison = Math.max(0, this.poison - dt * 0.12);
    for (let i = this.stuck.length - 1; i >= 0; i--) if ((this.stuck[i].life -= dt) <= 0) this.stuck.splice(i, 1);
  }

  /** 사슬 + 몸통 + 장식 + 얼굴. drawStuck은 꽂힌 무기를 그리는 콜백 */
  draw(p: Painter, drawStuck: (p: Painter, s: Stuck, bag: Bag) => void) {
    const a = this.th + this.wob;
    // 사슬: 고리 하나하나가 앞뒤로 번갈아 보인다
    p.place(this.ax, this.ay + this.drop, false, a);
    const M = ramp(["#14141c", "#2c2c3a", "#50505e", "#80808e", "#b8b8c4"]);
    for (let y = -2 - (this.drop < -10 ? 0 : 0); y < this.L; y += 4) {
      const front = ((y / 4) | 0) % 2 === 0;
      if (front) {
        p.rect(-1, y, 3, 5, M[0]);
        p.rect(-1, y + 1, 1, 3, M[3]);
        p.px(1, y + 1, M[2]);
        p.px(-1, y, M[4]);
      } else {
        p.rect(0, y, 1, 5, M[0]);
        p.px(0, y + 1, M[3]);
      }
    }
    // 고리
    p.ring(0, this.L - 1, 3, 1.5, M[2]);
    p.px(-2, this.L - 3, M[4]);

    const o = this.toWorld(0, 0);
    p.place(o[0], o[1], false, a);
    const G = this.geo, R = this.frozen > 0 ? this.mixRamp(ICE, 0.65) : this.R, n = R.length;
    const flash = this.flash > 0, tk = this.golden ? "metal" : this.def.debris;
    const kx = 1 + this.sqy * 0.12 + 0.3, ky = 1 + this.sqx * 0.14 + 0.3;
    const bx = G.W * 0.5 * 1.35 * kx + 3, y0 = -3, y1 = G.H * ky + 5;
    const wDepth = 1 / (G.W * 0.32), facet = G.facet;
    const shadowC = scale(R[0], 0.7);
    p.shade(-bx, y0, bx, y1, (x, y) => {
      const d = this.dist(x, y);
      if (d > 1.1) return;
      if (d > 0) return flash ? this.flashC : shadowC;
      if (flash) return d > -1.6 ? scale(this.flashC, 0.85) : this.flashC;
      const gx = this.dist(x + 0.7, y) - d, gy = this.dist(x, y + 0.7) - d, gl = Math.hypot(gx, gy) || 1;
      const nx = gx / gl, ny = gy / gl;
      let lum: number;
      if (facet) {
        // 결정: 면마다 평평한 음영
        const fy = y - G.cy, inner = insidePoly(x, y, facet);
        const ang = Math.atan2(fy, x), face = Math.round(ang / (Math.PI / 3));
        lum = inner ? 0.78 + (x < 0 ? 0.08 : -0.06) : 0.1 + 0.55 * Math.cos(face * (Math.PI / 3) - Math.atan2(LY, LX));
        if (-d < 1.5) lum -= 0.25;
      } else {
        const e = Math.pow(clamp(1 - -d * wDepth), 0.85);
        const vx = nx * e, vy = ny * e, vz = Math.sqrt(Math.max(0, 1 - e * e));
        lum = vx * LX + vy * LY + vz * LZ;
        // 아래쪽 반사광
        if (e > 0.82 && ny > 0.45) lum += 0.22;
      }
      lum += texture(tk, x, y);
      if (this.mat === "metal" && !facet) {
        // 금속: 세로로 길게 맺히는 반사 띠
        const band = Math.abs(x + G.W * 0.18 + (y - G.cy) * 0.08);
        if (band < 1.6 && -d > 1.5) lum += 0.55;
        else if (band < 3) lum += 0.15;
      }
      if (this.mat === "goo" && Math.hypot(x + G.W * 0.2, y - G.cy + G.H * 0.18) < 3) lum = 1.2;
      let idx = Math.floor(clamp((lum + 0.42) / 1.4) * (n - 1.01)) + 1;
      if (-d < 1 && nx > 0.2) idx -= 1;
      idx = Math.max(1, Math.min(n - 1, idx));
      return R[idx];
    });
    if (!flash) {
      drawDeco(p, this);
      drawCracks(p, this);
      for (const s of this.stuck) drawStuck(p, s, this);
      drawFace(p, this);
      if (this.frozen > 0) this.drawIce(p);
    } else for (const s of this.stuck) drawStuck(p, s, this);
    // 몸통 빛: 황금·정예·보스
    if (this.mat === "ghost") p.glow(0, G.cy, G.W, this.R[4], 0.2 + 0.08 * Math.sin(this.t * 3));
    if (this.golden) p.glow(0, G.cy, G.W * 1.3, hex("#ffd040"), 0.22 + 0.06 * Math.sin(this.t * 6));
    if (this.elite || this.boss) p.glow(0, G.cy, G.W * 1.2, hex(this.boss ? "#ff3050" : "#ff7040"), 0.12 + 0.05 * Math.sin(this.t * 4));
  }

  private mixRamp(r: Color[], k: number) {
    return this.R.map((c, i) => mix(c, r[Math.min(r.length - 1, i)], k));
  }

  private drawIce(p: Painter) {
    const G = this.geo, C = ICE;
    // 얼음 껍질: 몸통 테두리 바깥으로 1px, 결정 몇 개, 반짝임
    p.shade(-G.W, -2, G.W, G.H + 4, (x, y, out) => {
      const d = this.dist(x, y);
      if (d > 2 || d < -1) return;
      out.a = 0.85;
      return d > 0.8 ? C[2] : C[5];
    });
    for (let i = 0; i < 5; i++) {
      const yy = G.H * (0.15 + i * 0.17), side = i % 2 ? 1 : -1, xx = side * (G.W * 0.45 + 1);
      p.tri(xx, yy - 4, xx + side * 5, yy - 1, xx, yy + 2, C[4]);
      p.line(xx, yy - 4, xx + side * 5, yy - 1, C[6]);
    }
    const s = (this.t * 1.5) % 1;
    p.glow(-G.W * 0.2, G.H * (0.2 + s * 0.6), 5, C[6], 0.5);
  }
}

function insidePoly(x: number, y: number, pts: number[][]) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
