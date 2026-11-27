// 공격 방식 9종의 조작과 1인칭 무기 연출.
// 공통 규칙(pixelfx 액트의 원리): 반대 방향으로 감는 예비 동작 → 빠른 타격 → 접촉 순간 히트스톱 → 회복.
import { Painter, Color, P, PF, B, hex, ramp, clamp, ease, TAU, WHITE, scale, mix } from "../vendor/pixelfx/core/index.js";
import type { WeaponDef } from "../data/weapons";
import { ELEM } from "../data/elements";
import { G, INK } from "./world";
import * as St from "./state";
import { S } from "./state";
import { sfx } from "../engine/audio";
import { htext } from "../engine/htext";
import { drawFist, drawWeapon, drawGun, drawThrown, drawArrow, drawBow, drawFlailHead, cols } from "../art/weapons";
import * as slashFx from "../fx/melee/slash.js";
import * as muzzleFx from "../fx/hit/muzzle.js";
import * as sparkFx from "../fx/hit/spark.js";
import * as pierceFx from "../fx/melee/pierce.js";
import * as novaFx from "../fx/magic/nova.js";
import * as thunderFx from "../fx/magic/thunder.js";
import * as popFx from "../fx/magic/pop.js";
import * as blastFx from "../fx/boom/blast.js";
import * as shardsFx from "../fx/boom/shards.js";
import * as beamFx from "../fx/magic/beam.js";
import * as vortexFx from "../fx/magic/vortex.js";
import * as slamFx from "../fx/hit/slam.js";

export interface Hud { label: string; v: number; warn?: boolean }
export interface Controller {
  down(x: number, y: number): void;
  move(x: number, y: number): void;
  up(x: number, y: number): void;
  update(dt: number, frozen: boolean): void;
  draw(p: Painter): void;
  hint?(p: Painter, t: number, a: number): void;
  hud?(): Hud | null;
  dispose?(): void;
}

const ER = (w: WeaponDef) => ELEM[w.elem].ramp;
const live = () => G.bag && !G.bag.dead && !G.bag.entering;
const now = () => G.t;

/** 손가락 모양 커서 (조작 시범용) */
const HAND = ["..##....", ".#ww#...", ".#ww#...", ".#ww###.", "##wwwww#", "#wwwwww#", "#wwwwww#", ".#wwww#.", "..####.."];
function hand(p: Painter, x: number, y: number, press: boolean, a: number) {
  p.sprite(HAND, { "#": "#1a1018", w: press ? "#ffe0b0" : "#ffffff" }, Math.round(x - 2), Math.round(y - (press ? 0 : 1)), { a });
  if (press) p.ring(x + 0.5, y, 5, 1, hex("#ffffff"), a * 0.7);
}

class Sampler {
  pts: { x: number; y: number; t: number }[] = [];
  push(x: number, y: number) {
    const t = performance.now() / 1000;
    this.pts.push({ x, y, t });
    while (this.pts.length > 2 && t - this.pts[0].t > 0.12) this.pts.shift();
  }
  vel(): [number, number] {
    const a = this.pts[0], b = this.pts[this.pts.length - 1];
    if (!a || !b || b.t - a.t < 0.008) return [0, 0];
    return [(b.x - a.x) / (b.t - a.t), (b.y - a.y) / (b.t - a.t)];
  }
  clear() { this.pts.length = 0; }
}

// ============================================================ 1. 연타 (권갑)
class TapCtl implements Controller {
  punches: { side: number; fx: number; fy: number; tx: number; ty: number; t: number; hit: boolean; big: number }[] = [];
  side = 1;
  t = 0;
  constructor(public w: WeaponDef) {}
  down(x: number, y: number) {
    const b = G.bag;
    const [tx, ty] = live() ? b.aimPoint(x, y) : [x, y];
    this.side = -this.side;
    const n = G.combo + 1, sp = this.w.sp ?? {};
    let big = n % 10 === 0 ? 1 : 0;
    if (sp.every && n % sp.every === 0) big = 2;
    const [rx, ry] = this.rest(this.side);
    this.punches.push({ side: this.side, fx: rx, fy: ry, tx, ty, t: 0, hit: false, big });
    if (this.punches.length > 6) this.punches.shift();
    sfx.whoosh(0.6);
  }
  move() {}
  up() {}
  /** 가드 자세의 주먹 위치: 샌드백 아래 양옆 */
  rest(side: number): [number, number] {
    const [cx, cy] = live() ? G.bag.center() : [G.W / 2, G.H * 0.45];
    return [cx + side * 34, Math.min(G.floorY - 6, cy + 30)];
  }
  strike(q: TapCtl["punches"][0]) {
    const w = this.w, sp = w.sp ?? {};
    let k = 1, power = 0.9, freeze = 0.035, shake = 1.2, label: string | undefined;
    if (sp.ramp) k *= 1 + Math.min(G.combo, 60) * sp.ramp;
    if (q.big === 1) { k *= 3 * (sp.combo ?? 1); power = 2.2; freeze = 0.09; shake = 3.5; label = "강타!"; }
    const dir: [number, number] = [q.tx - q.fx, q.ty - q.fy];
    const l = Math.hypot(dir[0], dir[1]) || 1;
    G.hit({ x: q.tx, y: q.ty, k, kind: "punch", power, freeze, shake, dir: [dir[0] / l, dir[1] / l], label });
    if (q.big === 2) {
      const [cx, cy] = G.bag.center();
      if (w.elem === "volt") {
        G.spawn(thunderFx, { x: cx, y: cy + 6, height: cy + 20, palette: ER(w), seed: G.R.int(1, 999) });
        sfx.zap();
        G.queue.push({ t: 0.06, f: () => G.hit({ x: cx, y: cy, k: 3, kind: "thunder", power: 2, freeze: 0.08, shake: 4, noFx: true, label: "뇌신권!" }) });
      } else {
        G.spawn(beamFx, { x: cx, y: cy + G.bag.geo.H * 0.5, height: cy + 30, width: 22, palette: ER(w) });
        G.queue.push({ t: 0.1, f: () => G.hit({ x: cx, y: cy, k: 6, kind: "slam", power: 2.8, freeze: 0.14, shake: 6, label: "천공권!" }) });
      }
    }
  }
  update(dt: number) {
    this.t += dt;
    for (let i = this.punches.length - 1; i >= 0; i--) {
      const q = this.punches[i];
      q.t += dt;
      if (!q.hit && q.t >= 0.045) {
        q.hit = true;
        if (live()) this.strike(q);
      }
      if (q.t > 0.26) this.punches.splice(i, 1);
    }
  }
  fistAt(q: TapCtl["punches"][0]): [number, number, number] {
    const a = Math.atan2(q.ty - q.fy, q.tx - q.fx);
    let u: number;
    // 뒤로 살짝 당겼다가(예비 동작) 쭉 뻗고, 맞힌 자리에 잠깐 머물렀다가 가드로 돌아온다
    if (q.t < 0.045) u = -0.15 + 1.15 * ease.outQuad(q.t / 0.045);
    else if (q.t < 0.09) u = 1;
    else u = 1 - ease.inOutQuad(clamp((q.t - 0.09) / 0.17));
    return [q.fx + (q.tx - q.fx) * u - Math.cos(a) * 7 * u, q.fy + (q.ty - q.fy) * u - Math.sin(a) * 7 * u, a];
  }
  draw(p: Painter) {
    const B2 = cols(this.w).B;
    const sleeve = this.w.art === "wrap" ? hex("#3a5a8a") : B2[1];
    const drawArm = (x: number, y: number, a: number, speed: number) => {
      p.reset();
      // 짧은 팔뚝 + 속도선
      const bx = x - Math.cos(a) * 16, by = y - Math.sin(a) * 16;
      if (speed > 0) for (const o of [-4, 0, 4]) p.line(bx - Math.cos(a) * 10 * speed - Math.sin(a) * o, by - Math.sin(a) * 10 * speed + Math.cos(a) * o, bx - Math.sin(a) * o, by + Math.cos(a) * o, WHITE, 0.6 * speed);
      p.beam(bx, by, x - Math.cos(a) * 6, y - Math.sin(a) * 6, 9, INK);
      p.beam(bx, by, x - Math.cos(a) * 6, y - Math.sin(a) * 6, 7, (_u: number, v: number) => (v < 0.45 ? mix(sleeve, WHITE, 0.18) : sleeve));
      p.place(x, y, false, a);
      drawFist(p, this.w, this.t);
    };
    for (const s of [-1, 1]) {
      if (this.punches.some((q) => q.side === s)) continue;
      const [x, y] = this.rest(s), bob = Math.sin(this.t * 3 + s) * 1.5;
      drawArm(x, y + bob, s < 0 ? -0.75 : -2.39, 0);
    }
    for (const q of this.punches) {
      const [x, y, a] = this.fistAt(q);
      drawArm(x, y, a, q.t < 0.07 ? 1 - q.t / 0.07 : 0);
    }
  }
  hint(p: Painter, t: number, a: number) {
    if (!live()) return;
    const [cx, cy] = G.bag.center(), ph = (t * 2.5) % 1;
    hand(p, cx + 10, cy + 6 + (ph < 0.3 ? 2 : 0), ph < 0.3, a);
  }
}

// ============================================================ 2. 베기 (도검)
class SwipeCtl implements Controller {
  trail: { x: number; y: number; t: number }[] = [];
  held = false;
  px = 0;
  py = 0;
  pt = 0;
  cd = 0;
  head = 0;
  constructor(public w: WeaponDef) {}
  downAt(x: number, y: number) { this.held = true; this.px = x; this.py = y; this.pt = performance.now(); this.trail = [{ x, y, t: now() }]; }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  down(x: number, y?: number) { this.downAt(x, y!); }
  move(x: number, y: number) {
    if (!this.held) return;
    const t = performance.now(), dt = Math.max(1, t - this.pt) / 1000;
    const dx = x - this.px, dy = y - this.py, d = Math.hypot(dx, dy), speed = d / dt;
    this.trail.push({ x, y, t: now() });
    this.head = Math.atan2(dy, dx);
    if (speed > 260 && d > 1) sfx.whoosh(speed / 700);
    if (this.cd <= 0 && speed > 170 && live()) {
      for (let s = 0; s <= 1; s += 0.2) {
        const sx = this.px + dx * s, sy = this.py + dy * s;
        if (G.bag.hitTest(sx, sy, 1)) { this.slash(sx, sy, dx / d, dy / d, speed); break; }
      }
    }
    this.px = x; this.py = y; this.pt = t;
  }
  up() { this.held = false; }
  slash(x: number, y: number, ux: number, uy: number, speed: number) {
    const w = this.w, sp = w.sp ?? {};
    this.cd = 0.13;
    const k = clamp(speed / 650, 0.6, 1.35 + (sp.speedCap ?? 0));
    const ang = Math.atan2(uy, ux), E = ER(w);
    const [cx, cy] = G.bag.center();
    // 칼자국은 샌드백 중심 쪽으로 붙여서 그린다
    const mx = (x + cx) / 2, my = (y + cy) / 2;
    G.spawn(slashFx, { x: mx, y: my, angle: ang, len: 56 + k * 22, width: 5 + k * 3, palette: E, sparks: ELEM[w.elem].sparks, bend: 0.18 + G.R.range(0, 0.12), flip: G.R.chance(0.5), seed: G.R.int(1, 9999) });
    G.hit({ x: mx, y: my, k, kind: "slash", power: k * 1.2, freeze: 0.04 + k * 0.025, shake: 1 + k * 1.5, dir: [ux, uy], noFx: true });
    if (sp.twin) G.queue.push({ t: 0.07, f: () => { if (!live()) return; G.spawn(slashFx, { x: mx + uy * 6, y: my - ux * 6, angle: ang + 0.35, len: 50, width: 5, palette: E, seed: G.R.int(1, 999) }); G.hit({ x: mx, y: my, k: k * 0.8, kind: "slash", power: 0.9, freeze: 0.03, shake: 1, dir: [ux, uy], noFx: true }); } });
    if (sp.wave) G.queue.push({ t: 0.12, f: () => { if (!live()) return; G.spawn(slashFx, { x: cx, y: cy, angle: ang, len: 120, width: 12, palette: ELEM.holy.ramp, seed: G.R.int(1, 999) }); G.hit({ x: cx, y: cy, k: k * 1.2, kind: "slash", power: 1.8, freeze: 0.06, shake: 3, dir: [ux, uy], noFx: true, label: "검기!" }); } });
    if (w.elem === "fire") for (let i = 0; i < 8; i++) G.ps.spawn(P.FIRE, mx + ux * (i - 4) * 5, my + uy * (i - 4) * 5, G.R.range(-15, 15), -G.R.range(20, 60), G.R.range(0.3, 0.6), 0, G.R.range(2, 4), i * 0.02, PF.SMOKES);
  }
  update(dt: number, frozen: boolean) {
    if (!frozen) this.cd -= dt;
    const t = now();
    while (this.trail.length && t - this.trail[0].t > 0.13) this.trail.shift();
  }
  draw(p: Painter) {
    const w = this.w, E = ER(w).map(hex), tr = this.trail, t = now();
    p.reset();
    // 칼 궤적 리본: 앞쪽이 굵고 흰색, 꼬리로 갈수록 가늘고 속성색
    for (let i = 1; i < tr.length; i++) {
      const a = tr[i - 1], b = tr[i], age = (t - b.t) / 0.13, u = i / tr.length;
      const wd = Math.max(1, 7 * u * (1 - age));
      p.beam(a.x, a.y, b.x, b.y, wd + 2, E[3], 1 - age * 0.5);
      p.beam(a.x, a.y, b.x, b.y, wd, u > 0.6 ? WHITE : E[5]);
      if (i % 2) p.glowLine(a.x, a.y, b.x, b.y, 6, E[4], 0.3 * u);
    }
    // 칼: 손가락 끝을 따라오거나, 쉴 때는 오른쪽 아래에 비스듬히
    if (this.held && tr.length) {
      const h = tr[tr.length - 1];
      p.place(h.x - Math.cos(this.head) * 30, h.y - Math.sin(this.head) * 30, false, this.head);
      drawWeapon(p, w, t);
    } else {
      p.place(G.W * 0.82, G.H - 6 + Math.sin(t * 2.5) * 1.2, false, -2.1);
      drawWeapon(p, w, t);
    }
  }
  hint(p: Painter, t: number, a: number) {
    if (!live()) return;
    const [cx, cy] = G.bag.center(), ph = (t * 0.9) % 1;
    const x = cx - 44 + ph * 88, y = cy - 18 + ph * 30;
    if (ph < 0.85) hand(p, x, y, true, a);
    p.line(cx - 44, cy - 18, x, y, hex("#ffffff"), a * 0.5);
  }
}

// ============================================================ 3. 사격 (총기)
class HoldCtl implements Controller {
  held = false;
  ax = 0;
  ay = 0;
  heat = 0;
  over = 0;
  fireT = 0;
  spin = 0;
  spinA = 0;
  recoil = 0;
  tracers: { x0: number; y0: number; x1: number; y1: number; t: number; beam?: boolean }[] = [];
  orbs: { x: number; y: number; vx: number; vy: number; t: number }[] = [];
  flameT = 0;
  constructor(public w: WeaponDef) { this.ax = G.W / 2; this.ay = G.H * 0.45; }
  down(x: number, y: number) { this.held = true; this.ax = x; this.ay = y; }
  move(x: number, y: number) { this.ax = x; this.ay = y; }
  up() { this.held = false; }
  pivot(): [number, number] { return [G.W * 0.8, G.H - 4]; }
  angle() { const [px, py] = this.pivot(); return Math.atan2(this.ay - py, this.ax - px); }
  muzzle(): [number, number] {
    const [px, py] = this.pivot(), a = this.angle(), L = this.w.art === "pistol" ? 17 : this.w.art === "musket" ? 28 : this.w.art === "gatling" ? 25 : 24;
    return [px + Math.cos(a) * L, py + Math.sin(a) * L];
  }
  rate() {
    const sp = this.w.sp ?? {};
    return sp.spin ? 3 + this.spin * ((sp.rate ?? 20) - 3) : sp.rate ?? 4;
  }
  fire() {
    const w = this.w, sp = w.sp ?? {}, E = ER(w);
    const [mx, my] = this.muzzle(), a = this.angle();
    this.recoil = 1;
    this.heat += sp.heat ?? 8;
    if (this.heat >= 100) {
      this.over = 1.6;
      sfx.overheat();
      G.callout("과열!", mx, my - 18, WHITE, hex("#ff6040"), 1, 1);
      for (let i = 0; i < 10; i++) G.ps.spawn(P.VAPOUR, mx, my, G.R.range(-20, 20), -G.R.range(20, 60), G.R.range(0.5, 1), hex("#d0d8e0"), G.R.range(2, 4), i * 0.05);
    }
    if (sp.flame) {
      // 화염방사: 불덩이 입자가 조준점 쪽으로 쏟아진다
      for (let i = 0; i < 3; i++) {
        const s = 220 + G.R.range(0, 120), aa = a + G.R.range(-0.12, 0.12);
        G.ps.spawn(P.FIRE, mx, my, Math.cos(aa) * s, Math.sin(aa) * s, G.R.range(0.35, 0.55), 0, G.R.range(2, 4), 0, G.R.chance(0.3) ? PF.SMOKES : 0);
      }
      sfx.flame();
      const d = Math.hypot(this.ax - mx, this.ay - my);
      if (live() && d < 170 && G.bag.hitTest(this.ax, this.ay, 4)) G.hit({ x: this.ax, y: this.ay, k: 1, kind: "bullet", power: 0.3, noFx: true, quiet: true, dir: [Math.cos(a), Math.sin(a)] });
      return;
    }
    G.spawn(muzzleFx, { x: mx, y: my, angle: a, size: sp.power ? 1.3 : sp.spin ? 0.6 : 0.9, palette: w.elem === "none" ? ELEM.fire.ramp : E, seed: G.R.int(1, 999) });
    sfx.shot(sp.spin ? 2 : sp.power || sp.pellets ? 1 : 0);
    if (!sp.beam && !sp.orb) {
      // 탄피
      G.bits.add({ kind: B.SHARD, x: mx - Math.cos(a) * 10, y: my - Math.sin(a) * 10, vx: G.R.range(40, 120), vy: -G.R.range(120, 220), a: G.R.range(0, 6), va: G.R.range(-20, 20), s: 2, c: hex("#e0b040"), g: 0.7, drag: 0.2, bounce: 0.4, life: 1.2 });
      if (G.R.chance(0.5)) sfx.shell();
    }
    if (sp.beam) {
      // 레일건: 화면 끝까지 꿰뚫는 광선
      const ex = mx + Math.cos(a) * 400, ey = my + Math.sin(a) * 400;
      this.tracers.push({ x0: mx, y0: my, x1: ex, y1: ey, t: 0, beam: true });
      sfx.beam();
      G.shake(2.5, 0.15);
      if (live()) {
        for (let s = 0; s < 400; s += 3) {
          const x = mx + Math.cos(a) * s, y = my + Math.sin(a) * s;
          if (G.bag.hitTest(x, y, 1)) { G.spawn(sparkFx, { x, y, angle: a + Math.PI, size: 2, palette: E }); G.hit({ x, y, k: sp.power ?? 3, kind: "thunder", power: 2.4, freeze: 0.07, shake: 3, dir: [Math.cos(a), Math.sin(a)] }); break; }
        }
      }
      return;
    }
    if (sp.orb) {
      this.orbs.push({ x: mx, y: my, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, t: 0 });
      return;
    }
    const n = sp.pellets ?? 1;
    for (let i = 0; i < n; i++) {
      const spread = n > 1 ? 16 : sp.spin ? 5 : 2;
      const tx = this.ax + G.R.range(-spread, spread), ty = this.ay + G.R.range(-spread, spread);
      this.tracers.push({ x0: mx, y0: my, x1: tx, y1: ty, t: 0 });
      if (live() && G.bag.hitTest(tx, ty, 1)) {
        const big = !!sp.power;
        G.hit({ x: tx, y: ty, k: (sp.power ?? 1) / (n > 1 ? n / 1.8 : 1), kind: "bullet", power: big ? 1.6 : 0.6, freeze: big ? 0.05 : 0.012, shake: big ? 2.5 : 0.6, dir: [Math.cos(a), Math.sin(a)], quiet: i > 0, critAdd: 0 });
      } else if (i === 0) G.spawn(sparkFx, { x: tx, y: ty, size: 0.4, palette: ELEM.none.ramp, angle: a + Math.PI });
    }
  }
  update(dt: number, frozen: boolean) {
    if (frozen) return;
    const sp = this.w.sp ?? {};
    this.recoil = Math.max(0, this.recoil - dt * 9);
    if (this.over > 0) { this.over -= dt; this.heat = Math.max(0, this.heat - 60 * dt); if (this.over <= 0) this.heat = 0; }
    else this.heat = Math.max(0, this.heat - (this.held ? 14 : 45) * dt);
    if (sp.spin) this.spin = clamp(this.spin + (this.held && this.over <= 0 ? dt / 1.2 : -dt / 0.6));
    this.spinA += (this.spin * 40 + (this.held ? 4 : 0)) * dt;
    this.fireT -= dt;
    if (this.held && this.over <= 0 && this.fireT <= 0) {
      this.fireT = 1 / this.rate();
      this.fire();
    }
    for (const tr of this.tracers) tr.t += dt;
    this.tracers = this.tracers.filter((t) => t.t < (t.beam ? 0.25 : 0.05));
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.t += dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (G.R.chance(0.7)) G.ps.spawn(P.MOTE, o.x, o.y, -o.vx * 0.2 + G.R.range(-20, 20), -o.vy * 0.2 + G.R.range(-20, 20), 0.3, hex(ER(this.w)[5]), 0.8);
      if (live() && G.bag.hitTest(o.x, o.y, 2)) {
        G.spawn(blastFx, { x: o.x, y: o.y, size: 1.3, palette: ER(this.w), floor: G.floorY - o.y });
        sfx.boom(1.2);
        G.hit({ x: o.x, y: o.y, k: sp.power ?? 4, kind: "blast", power: 2.4, freeze: 0.09, shake: 4.5, noFx: true });
        this.orbs.splice(i, 1);
      } else if (o.t > 2) this.orbs.splice(i, 1);
    }
  }
  draw(p: Painter) {
    const w = this.w, E = ER(w).map(hex);
    p.reset();
    for (const tr of this.tracers) {
      if (tr.beam) {
        const k = 1 - tr.t / 0.25;
        p.beam(tr.x0, tr.y0, tr.x1, tr.y1, 1 + 6 * k, (_u: number, v: number) => (v < 0.35 ? WHITE : E[4]));
        p.glowLine(tr.x0, tr.y0, tr.x1, tr.y1, 10 * k + 2, E[4], 0.6 * k);
      } else {
        const u = tr.t / 0.05, x0 = tr.x0 + (tr.x1 - tr.x0) * u * 0.6;
        p.line(x0, tr.y0 + (tr.y1 - tr.y0) * u * 0.6, tr.x1, tr.y1, hex("#fff6c0"));
      }
    }
    for (const o of this.orbs) {
      p.circle(o.x, o.y, 4, E[4]);
      p.circle(o.x, o.y, 2.5, WHITE);
      p.glow(o.x, o.y, 14, E[4], 0.7);
    }
    // 조준점
    if (this.held) {
      const c = this.over > 0 ? hex("#ff5040") : E[5], x = Math.round(this.ax), y = Math.round(this.ay), g = 3 + this.recoil * 2;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.line(x + dx * g, y + dy * g, x + dx * (g + 4), y + dy * (g + 4), c);
      p.px(x, y, c);
    }
    const [px, py] = this.pivot(), a = this.angle();
    p.place(px - Math.cos(a) * this.recoil * 4, py - Math.sin(a) * this.recoil * 4, false, a);
    drawGun(p, w, now(), this.heat / 100, this.spinA);
  }
  hud(): Hud { return { label: this.over > 0 ? "과열!" : "열", v: this.heat / 100, warn: this.over > 0 || this.heat > 75 }; }
  hint(p: Painter, t: number, a: number) {
    if (!live()) return;
    const [cx, cy] = G.bag.center();
    hand(p, cx + 8, cy + 10, true, a);
    if ((t * 4) % 1 < 0.5) p.ring(cx + 8, cy + 10, 8 + ((t * 8) % 4), 1, WHITE, a * 0.6);
  }
}

// ============================================================ 4. 강타 (둔기)
class ChargeCtl implements Controller {
  charging = false;
  ct = 0;
  swing = -1;
  rest = 1;
  level = 0;
  perfect = false;
  readyPlayed = false;
  meteor: { x: number; y: number; t: number; k: number } | null = null;
  T: number;
  constructor(public w: WeaponDef) { this.T = w.art === "claymore" ? 0.8 : w.art === "meteor" ? 1.1 : 0.9; }
  pivot(): [number, number] { return [G.W * 0.24, G.H + 30]; }
  target(): [number, number] { return live() ? G.bag.center() : [G.W / 2, G.H * 0.45]; }
  impactAngle() { const [px, py] = this.pivot(), [tx, ty] = this.target(); return Math.atan2(ty - py, tx - px); }
  length() { const [px, py] = this.pivot(), [tx, ty] = this.target(); return Math.hypot(tx - px, ty - py) - 4; }
  down() { if (this.swing >= 0) return; this.charging = true; this.ct = 0; this.readyPlayed = false; }
  move() {}
  up() {
    if (!this.charging) return;
    this.charging = false;
    this.level = clamp(this.ct / this.T);
    this.perfect = this.ct >= this.T * 0.88 && this.ct <= this.T * 1.3;
    this.swing = 0;
    sfx.whoosh(1.4);
  }
  impact() {
    const w = this.w, sp = w.sp ?? {}, E = ER(w), lv = this.level;
    if (!live()) return;
    const b = G.bag, [cx, cy] = b.center(), a = this.impactAngle();
    const x = cx - Math.cos(a) * b.geo.W * 0.2, y = cy - Math.sin(a) * b.geo.W * 0.2;
    let k = 0.2 + 0.9 * Math.pow(lv, 1.6);
    if (this.perfect) k *= 1.5 + (sp.perfect ?? 0);
    const power = 0.7 + lv * 1.4 + (this.perfect ? 0.6 : 0);
    const dir: [number, number] = [Math.cos(a), Math.sin(a)];
    if (sp.slash) {
      G.spawn(slashFx, { x: cx, y: cy, angle: a + Math.PI / 2 * 0.9, len: 70 + lv * 60, width: 6 + lv * 8, palette: E, seed: G.R.int(1, 999) });
      G.hit({ x: cx, y: cy, k, kind: "slash", power, freeze: 0.05 + lv * 0.09, shake: 2 + lv * 4, dir, crit: this.perfect, noFx: true, label: this.perfect ? "퍼펙트!" : undefined });
    } else {
      G.hit({ x, y, k, kind: "slam", power, freeze: 0.05 + lv * 0.1, shake: 2 + lv * 5, dir, crit: this.perfect, label: this.perfect ? "퍼펙트!" : undefined });
    }
    if (this.perfect) { S.stats.perfects++; sfx.perfect(); G.flash(WHITE, 0.5); }
    if (lv > 0.6) {
      if (sp.quake) {
        G.spawn(slamFx, { x: cx, y: G.floorY - 2, size: 1.4, floor: 2, stone: "#6a5a4a" });
        for (let i = 0; i < 6; i++) G.queue.push({ t: 0.05 * i, f: () => G.ps.spawn(P.GRIT, G.R.range(0, G.W), G.floorY - 1, G.R.range(-30, 30), -G.R.range(150, 320), 1.2, hex("#8a7a6a"), 2) });
      }
      if (sp.bolt) { G.spawn(thunderFx, { x: cx, y: cy + 8, height: cy + 20, palette: E, seed: G.R.int(1, 99) }); sfx.zap(); G.queue.push({ t: 0.07, f: () => G.hit({ x: cx, y: cy, k: k * 0.6, kind: "thunder", power: 1.5, noFx: true }) }); }
      if (sp.shatter) { G.spawn(shardsFx, { x, y, floor: G.floorY - y }); if (b.frozen <= 0) { b.frozen = 2.2; sfx.freeze(); } }
      if (sp.meteor && lv >= 0.98) this.meteor = { x: G.W + 20, y: -30, t: 0, k };
    }
  }
  update(dt: number, frozen: boolean) {
    if (this.charging) {
      this.ct += dt;
      const lv = clamp(this.ct / this.T);
      sfx.charge(lv);
      if (!this.readyPlayed && this.ct >= this.T * 0.88) { this.readyPlayed = true; sfx.ready(); }
      if (!frozen && G.R.chance(0.5 + lv)) {
        const [hx, hy] = this.headPos(), aa = G.R.range(0, TAU), d = 26 + G.R.range(0, 10);
        G.ps.spawn(P.STREAK, hx + Math.cos(aa) * d, hy + Math.sin(aa) * d, -Math.cos(aa) * 70, -Math.sin(aa) * 70, 0.3, hex(ER(this.w)[5]));
      }
    }
    if (frozen) return;
    if (this.swing >= 0) {
      const before = this.swing;
      this.swing += dt;
      if (before < 0.07 && this.swing >= 0.07) this.impact();
      if (this.swing > 0.5) this.swing = -1;
    }
    if (this.meteor) {
      const m = this.meteor, [tx, ty] = this.target();
      m.t += dt;
      const u = clamp(m.t / 0.45);
      m.x = G.W + 20 + (tx - G.W - 20) * ease.inQuad(u);
      m.y = -30 + (ty + 30) * ease.inQuad(u);
      G.ps.spawn(P.FIRE, m.x, m.y, G.R.range(-20, 20), -G.R.range(10, 40), 0.5, 0, G.R.range(3, 6), 0, PF.SMOKES | PF.BIG);
      if (u >= 1) {
        G.spawn(blastFx, { x: tx, y: ty, size: 2.6, floor: G.floorY - ty });
        sfx.boom(2);
        G.hit({ x: tx, y: ty, k: m.k * 1.5, kind: "blast", power: 3, freeze: 0.18, shake: 9, noFx: true, label: "운석 낙하!" });
        G.flash(hex("#ffb040"), 0.9);
        this.meteor = null;
      }
    }
  }
  /** 현재 망치 각도: 쉬는 자세 → 들어 올림(충전) → 내려침 → 회복 */
  angle(): number {
    const imp = this.impactAngle(), raised = imp - 0.62, restA = imp - 0.32;
    if (this.charging) {
      const lv = clamp(this.ct / this.T);
      const shake = lv >= 0.88 ? Math.sin(G.t * 70) * 0.02 : 0;
      return restA + (raised - restA) * ease.outCubic(lv) + shake;
    }
    if (this.swing >= 0) {
      if (this.swing < 0.07) return raised + (imp + 0.04 - raised) * ease.inQuad(this.swing / 0.07);
      if (this.swing < 0.2) return imp + 0.04;
      return imp + 0.04 + (restA - imp - 0.04) * ease.inOutQuad(clamp((this.swing - 0.2) / 0.3));
    }
    return restA + Math.sin(G.t * 2) * 0.02;
  }
  headPos(): [number, number] {
    const [px, py] = this.pivot(), a = this.angle(), L = this.length();
    return [px + Math.cos(a) * L, py + Math.sin(a) * L];
  }
  draw(p: Painter) {
    const w = this.w, { B: Bc, T } = cols(w), E = ER(w).map(hex);
    const [px, py] = this.pivot(), a = this.angle(), L = this.length();
    p.reset();
    // 내려치는 순간의 잔상 호
    if (this.swing >= 0 && this.swing < 0.14) {
      const imp = this.impactAngle(), k = 1 - this.swing / 0.14;
      p.arc(px, py, L + 8, 10 * k + 2, imp - 0.62, imp + 0.05, (u: number, v: number) => (v > 0.7 ? WHITE : u > 0.6 ? E[5] : E[3]), (u: number) => Math.min(1, u * 2) * k);
    }
    // 긴 자루 (화면 밖 손에서부터)
    const hx = px + Math.cos(a) * (L - 30), hy = py + Math.sin(a) * (L - 30);
    p.beam(px, py, hx, hy, 5, INK);
    p.beam(px, py, hx, hy, 3, (_u: number, v: number) => (v < 0.4 ? (T[4] ?? Bc[4]) : (T[2] ?? Bc[2])));
    p.place(hx, hy, false, a);
    drawWeapon(p, w, now());
    // 충전 게이지: 샌드백 둘레를 도는 호
    if (this.charging && live()) {
      p.reset();
      const [cx, cy] = G.bag.center(), lv = clamp(this.ct / this.T), pf = this.ct >= this.T * 0.88 && this.ct <= this.T * 1.3;
      const R = G.bag.geo.H * 0.6 + 6;
      p.arc(cx, cy, R, 2, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.01, lv), pf ? WHITE : E[4]);
      p.glowRing(cx, cy, R - 1, 4, pf ? WHITE : E[4], pf ? 0.6 : 0.2 + lv * 0.2);
      if (pf) htext(p, "지금!", cx, cy - R - 14, WHITE, hex("#ffd84a"), INK, 1, (G.t * 10) % 1 < 0.6 ? 1 : 0.5);
    }
    if (this.meteor) {
      const m = this.meteor;
      p.reset();
      p.circle(m.x, m.y, 9, hex("#2a1a20"));
      p.circle(m.x - 1, m.y - 1, 7, hex("#ff8a2a"));
      p.circle(m.x - 2, m.y - 2, 4, hex("#fff0a0"));
      p.glow(m.x, m.y, 30, hex("#ff8a2a"), 0.8);
    }
  }
  hud(): Hud | null { return this.charging ? { label: "힘", v: clamp(this.ct / this.T), warn: this.ct >= this.T * 0.88 } : null; }
  hint(p: Painter, t: number, a: number) {
    if (!live()) return;
    const [cx, cy] = G.bag.center(), ph = (t * 0.7) % 1;
    hand(p, cx + 10, cy + 8, ph < 0.75, a);
    if (ph < 0.75) p.arc(cx + 10.5, cy + 8, 9, 1.5, -Math.PI / 2, -Math.PI / 2 + TAU * ph / 0.75, WHITE, a);
  }
}

// ============================================================ 5. 찌르기 (창)
class TimingCtl implements Controller {
  ph = 0;
  wait = 0;
  streak = 0;
  thrust = -1;
  grade = 0;
  R0 = 46;
  RT = 11;
  flashT = 0;
  constructor(public w: WeaponDef) {}
  period() { return Math.max(0.55, 1.05 - Math.min(this.streak, 15) * 0.025); }
  radius() { return this.RT + (this.R0 - this.RT) * (1 - this.ph) - (this.RT) * 0 - 0; }
  down() {
    if (this.thrust >= 0 && this.thrust < 0.12) return;
    if (this.wait > 0) return;
    const r = this.RT + (this.R0) * (1 - this.ph) - this.RT * (1 - this.ph) * 0;
    const ringR = this.ringR(), d = Math.abs(ringR - this.RT);
    this.grade = d <= 3 ? 2 : d <= 7.5 ? 1 : 0;
    void r;
    this.thrust = 0;
    this.ph = 0;
    this.wait = 0.18;
    sfx.whoosh(1.2);
  }
  ringR() { return this.RT * 0.4 + (this.R0 - this.RT * 0.4) * (1 - this.ph); }
  move() {}
  up() {}
  strike() {
    if (!live()) return;
    const w = this.w, sp = w.sp ?? {}, g = this.grade, E = ER(w);
    const [cx, cy] = G.bag.center(), [px, py] = this.pivot(), a = Math.atan2(cy - py, cx - px);
    if (g === 2) { this.streak++; S.stats.perfects++; } else if (g === 0) this.streak = 0;
    const streakK = 1 + Math.min(this.streak, 20) * 0.05 * (sp.streak ?? 1);
    const k = g === 2 ? 2.5 * streakK : g === 1 ? (sp.good ? 2.5 * sp.good : 1) : 0.3;
    G.spawn(pierceFx, { x: cx, y: cy, angle: a, grade: g, palette: E, sparks: ELEM[w.elem].sparks, seed: G.R.int(1, 999) });
    const lbl = g === 2 ? (this.streak > 1 ? `퍼펙트 x${this.streak}` : "퍼펙트!") : g === 1 ? "굿" : "빗나감";
    G.callout(lbl, cx, cy - 34, WHITE, g === 2 ? hex("#ffd84a") : g === 1 ? hex("#80e0ff") : hex("#8090a0"), 1, 0.7);
    G.hit({ x: cx, y: cy, k, kind: "pierce", power: 0.6 + g * 0.7, freeze: [0.015, 0.045, 0.09][g], shake: [0.5, 1.5, 3.5][g], dir: [Math.cos(a), Math.sin(a)], critAdd: g === 2 ? 0.4 : 0, noFx: true });
    if (g === 2) sfx.perfect();
    if (sp.prongs && g > 0) for (const s of [-1, 1]) G.queue.push({ t: 0.04, f: () => { if (!live()) return; G.spawn(pierceFx, { x: cx + s * 7, y: cy, angle: a, grade: 1, palette: E, seed: G.R.int(1, 99) }); G.hit({ x: cx + s * 7, y: cy, k: k * 0.3, kind: "pierce", power: 0.6, noFx: true, quiet: true }); } });
    if (w.art === "divine" && g === 2) {
      G.spawn(beamFx, { x: cx, y: cy + G.bag.geo.H * 0.5, height: cy + 30, width: 10, palette: E });
      G.queue.push({ t: 0.1, f: () => G.hit({ x: cx, y: cy, k: k * 0.6, kind: "pierce", power: 1.6, freeze: 0.06, shake: 3, noFx: true, label: "신창!" }) });
    }
  }
  pivot(): [number, number] { const c = live() ? G.bag.center() : [G.W / 2, G.H / 2]; return [c[0] + 8, G.H + 30]; }
  update(dt: number, frozen: boolean) {
    if (this.thrust >= 0) {
      const before = this.thrust;
      if (!frozen) this.thrust += dt;
      if (before < 0.045 && this.thrust >= 0.045) this.strike();
      if (this.thrust > 0.32) this.thrust = -1;
    }
    if (frozen) return;
    if (this.wait > 0) { this.wait -= dt; return; }
    this.ph += dt / this.period();
    if (this.ph >= 1) {
      this.ph = 0;
      if (this.streak > 0 && live()) { const [cx, cy] = G.bag.center(); G.callout("놓침", cx, cy - 34, WHITE, hex("#8090a0"), 1, 0.6); }
      this.streak = 0;
      this.wait = 0.12;
    }
  }
  draw(p: Painter) {
    const w = this.w, E = ER(w).map(hex);
    p.reset();
    if (live()) {
      const [cx, cy] = G.bag.center();
      // 목표 링 (고정)과 다가오는 링
      p.ring(cx, cy, this.RT + 1, 2, hex("#ffffff"), 0.85);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + G.t; p.px(cx + Math.cos(a) * (this.RT + 4), cy + Math.sin(a) * (this.RT + 4), WHITE); }
      if (this.wait <= 0) {
        const r = this.ringR(), d = Math.abs(r - this.RT), c = d <= 3 ? hex("#ffd84a") : d <= 7.5 ? hex("#80e0ff") : E[4];
        p.ring(cx, cy, r + 1, 2, c);
        p.glowRing(cx, cy, r, 4, c, 0.4);
      }
      if (this.streak >= 2) p.text(`x${this.streak}`, cx + this.RT + 6, cy - 4, hex("#ffd84a"), { font: "big", outline: INK });
    }
    // 창: 화면 아래에서 샌드백을 향해, 찌르면 쭉 뻗는다
    const [px, py] = this.pivot(), [cx, cy] = live() ? G.bag.center() : [G.W / 2, G.H / 2];
    const a = Math.atan2(cy - py, cx - px), dist = Math.hypot(cx - px, cy - py);
    let reach = dist - 74;
    if (this.thrust >= 0) {
      const t = this.thrust;
      reach += t < 0.045 ? 70 * ease.outExpo(t / 0.045) : t < 0.12 ? 70 : 70 * (1 - ease.inOutQuad(clamp((t - 0.12) / 0.2)));
    } else reach += Math.sin(G.t * 2.5) * 1.5;
    p.place(px + Math.cos(a) * reach, py + Math.sin(a) * reach, false, a);
    drawWeapon(p, w, now());
    p.reset();
    void E;
  }
  hint(p: Painter, t: number, a: number) {
    if (!live()) return;
    const [cx, cy] = G.bag.center(), r = this.ringR(), d = Math.abs(r - this.RT);
    hand(p, cx + 16, cy + 14, d < 4, a);
  }
}

// ============================================================ 6. 투척
interface Proj { x: number; y: number; vx: number; vy: number; a: number; va: number; t: number; kind: string; hit: number; back?: boolean; split?: boolean; k: number; trail: number[][] }
class ThrowCtl implements Controller {
  s = new Sampler();
  held = false;
  sx = 0;
  sy = 0;
  cx = 0;
  cy = 0;
  cd = 0;
  proj: Proj[] = [];
  constructor(public w: WeaponDef) {}
  down(x: number, y: number) { this.held = true; this.sx = this.cx = x; this.sy = this.cy = y; this.s.clear(); this.s.push(x, y); }
  move(x: number, y: number) { if (!this.held) return; this.cx = x; this.cy = y; this.s.push(x, y); }
  up(x: number, y: number) {
    if (!this.held) return;
    this.held = false;
    this.s.push(x, y);
    if (this.cd > 0) return;
    let [vx, vy] = this.s.vel();
    let ox = x, oy = y;
    const sp = Math.hypot(vx, vy);
    if (sp < 200) {
      // 그냥 탭: 화면 아래에서 샌드백(또는 누른 곳)으로 던진다
      ox = G.W / 2 + G.R.range(-20, 20); oy = G.H - 6;
      const [tx, ty] = live() ? (G.bag.hitTest(x, y) ? [x, y] : G.bag.center()) : [x, y];
      const d = Math.hypot(tx - ox, ty - oy), s2 = 520;
      vx = ((tx - ox) / d) * s2; vy = ((ty - oy) / d) * s2 - 40;
    } else {
      const k = clamp(sp, 300, 800) / sp;
      vx *= k; vy *= k;
    }
    this.launch(ox, oy, vx, vy);
    this.cd = 0.1;
  }
  launch(x: number, y: number, vx: number, vy: number) {
    const w = this.w, sp = w.sp ?? {};
    sfx.throwIt();
    const n = sp.fan ?? 1;
    for (let i = 0; i < n; i++) {
      const off = n > 1 ? (i - (n - 1) / 2) * 0.16 : 0, c = Math.cos(off), s = Math.sin(off);
      const spin = w.art === "shuriken" ? 28 : w.art === "axe" ? 18 : w.art === "boomerang" ? 22 : w.art === "bomb" ? 6 : 0;
      this.proj.push({ x, y, vx: vx * c - vy * s, vy: vx * s + vy * c, a: Math.atan2(vy, vx), va: spin, t: 0, kind: w.art, hit: 0, k: n > 1 ? 1.4 / n : 1, trail: [] });
    }
  }
  impact(q: Proj) {
    const w = this.w, sp = w.sp ?? {}, b = G.bag, E = ER(w);
    const dir: [number, number] = [q.vx, q.vy], l = Math.hypot(dir[0], dir[1]) || 1;
    dir[0] /= l; dir[1] /= l;
    if (q.kind === "bomb") {
      G.spawn(blastFx, { x: q.x, y: q.y, size: 1.3, palette: E, floor: G.floorY - q.y });
      sfx.boom(1.3);
      G.hit({ x: q.x, y: q.y, k: 1.6, kind: "blast", power: 2.2, freeze: 0.08, shake: 4.5, dir, noFx: true });
      return true;
    }
    const heavy = !!sp.heavy;
    G.hit({ x: q.x, y: q.y, k: q.k * (heavy ? 1.5 : 1), kind: "stab", power: heavy ? 1.8 : 0.9, freeze: heavy ? 0.07 : 0.03, shake: heavy ? 3 : 1, dir });
    if (q.kind === "boomerang") {
      if (q.hit >= 2) return true;
      q.back = true;
      q.vx = -q.vx * 0.5; q.vy = Math.abs(q.vy) * 0.4 + 100;
      return false;
    }
    // 꽂힌다
    const [lx, ly] = b.toLocal(q.x, q.y);
    const vis = q.kind === "shuriken" ? q.a : Math.atan2(q.vy, q.vx);
    b.stuck.push({ lx, ly, ang: vis - (b.th + b.wob), kind: q.kind, wid: w.id, life: 3.5, depth: q.kind === "axe" ? 4 : 5 });
    if (b.stuck.length > 14) b.stuck.shift();
    return true;
  }
  update(dt: number, frozen: boolean) {
    if (frozen) return;
    this.cd -= dt;
    const sp = this.w.sp ?? {};
    for (let i = this.proj.length - 1; i >= 0; i--) {
      const q = this.proj[i];
      q.t += dt;
      q.vy += 260 * dt;
      if (q.kind === "boomerang" && q.back) { q.vy -= 500 * dt; q.vx += (G.W / 2 - q.x) * 2 * dt; }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.a = q.va ? q.a + q.va * dt : Math.atan2(q.vy, q.vx);
      q.trail.push([q.x, q.y]);
      if (q.trail.length > 6) q.trail.shift();
      if (sp.split && !q.split && q.t > 0.1) {
        q.split = true;
        for (const off of [-0.3, -0.15, 0.15, 0.3]) {
          const c = Math.cos(off), s = Math.sin(off);
          this.proj.push({ ...q, vx: q.vx * c - q.vy * s, vy: q.vx * s + q.vy * c, k: 0.5, trail: [], split: true });
        }
        G.spawn(popFx, { x: q.x, y: q.y, size: 0.8, palette: ER(this.w) });
      }
      let gone = false;
      if (live() && G.bag.hitTest(q.x, q.y, 1) && (q.hit === 0 || (q.kind === "boomerang" && q.t > 0.35 && q.hit < 2))) {
        q.hit++;
        gone = this.impact(q);
      }
      if (!gone && (q.y > G.floorY || q.x < -30 || q.x > G.W + 30 || q.y < -60 || q.t > 3)) {
        if (q.y > G.floorY && q.x > 0 && q.x < G.W) G.loose.push({ x: q.x, y: G.floorY - 2, vx: q.vx * 0.3, vy: -Math.abs(q.vy) * 0.3, a: q.a, va: q.va * 0.3 + 4, w: this.w, life: 1.2 });
        gone = true;
      }
      if (gone) this.proj.splice(i, 1);
    }
  }
  draw(p: Painter) {
    const w = this.w, E = ER(w).map(hex);
    p.reset();
    for (const q of this.proj) {
      for (let i = 1; i < q.trail.length; i++) p.line(q.trail[i - 1][0], q.trail[i - 1][1], q.trail[i][0], q.trail[i][1], i > 3 ? E[5] : E[3], i / q.trail.length);
      p.place(q.x, q.y, false, q.a);
      drawThrown(p, w, now());
      p.reset();
    }
    if (this.held) {
      const dx = this.cx - this.sx, dy = this.cy - this.sy;
      if (Math.hypot(dx, dy) > 8) {
        p.line(this.sx, this.sy, this.cx, this.cy, E[4], 0.6);
        p.circle(this.cx, this.cy, 2, E[5]);
      }
    }
    // 손에 든 다음 투척물
    p.place(G.W / 2, G.H - 10 + Math.sin(G.t * 3) * 1.2 + (this.cd > 0 ? 6 : 0), false, -Math.PI / 2 + 0.3);
    drawThrown(p, w, now());
  }
  hint(p: Painter, t: number, a: number) {
    if (!live()) return;
    const [cx, cy] = G.bag.center(), ph = (t * 1.2) % 1;
    const x = cx + 6, y = G.H - 20 - ph * (G.H - 20 - cy) * 0.5;
    hand(p, x, y, ph < 0.6, a);
    p.line(cx + 6, G.H - 20, x, y, WHITE, a * 0.4);
  }
}

// ============================================================ 7. 궁술 (활)
interface Arrow { x: number; y: number; vx: number; vy: number; t: number; k: number; pull: number; rain?: boolean; trail: number[][] }
class BowCtl implements Controller {
  held = false;
  ax = 0;
  ay = 0;
  cx = 0;
  cy = 0;
  arrows: Arrow[] = [];
  reload = 0;
  constructor(public w: WeaponDef) {}
  down(x: number, y: number) { this.held = true; this.ax = this.cx = x; this.ay = this.cy = y; }
  move(x: number, y: number) {
    if (!this.held) return;
    this.cx = x; this.cy = y;
    const pull = this.pull();
    if (pull > 0.1) sfx.draw(pull);
  }
  pull() { return clamp(Math.hypot(this.ax - this.cx, this.ay - this.cy) / 56); }
  aim(): number { return Math.atan2(this.ay - this.cy, this.ax - this.cx); }
  up(x: number, y: number) {
    if (!this.held) return;
    this.held = false;
    const w = this.w, sp = w.sp ?? {};
    if (this.reload > 0) return;
    let pull = this.pull(), a = this.aim(), ox = this.ax, oy = this.ay;
    if (sp.cross || Math.hypot(this.ax - this.cx, this.ay - this.cy) < 6) {
      // 탭: 화면 아래에서 누른 곳(또는 샌드백)으로 바로 쏜다
      ox = G.W * 0.3; oy = G.H - 12;
      const [tx, ty] = live() && !G.bag.hitTest(x, y) && !sp.cross ? G.bag.center() : [x, y];
      a = Math.atan2(ty - oy, tx - ox);
      pull = sp.cross ? 0.9 : 0.55;
    }
    this.fire(ox, oy, a, pull);
    this.reload = sp.cross ? 0.3 : 0.18;
  }
  fire(x: number, y: number, a: number, pull: number) {
    const w = this.w, sp = w.sp ?? {};
    sfx.twang(pull);
    const speed = 260 + 600 * pull, n = sp.multi ?? 1;
    for (let i = 0; i < n; i++) {
      const off = n > 1 ? (i - (n - 1) / 2) * 0.07 : 0;
      this.arrows.push({ x, y, vx: Math.cos(a + off) * speed, vy: Math.sin(a + off) * speed, t: 0, k: (n > 1 ? 1.6 / n : 1) * (0.25 + Math.pow(pull, 1.4) * (1 + (sp.full ?? 0))), pull, trail: [] });
    }
    if (sp.rain && pull > 0.5 && live()) {
      const [cx] = G.bag.center();
      for (let i = 0; i < sp.rain; i++)
        G.queue.push({ t: 0.25 + i * 0.06, f: () => { const x2 = cx + G.R.range(-14, 14); this.arrows.push({ x: x2 - 20, y: -10, vx: 60, vy: 520, t: 0, k: 0.3, pull: 0.6, rain: true, trail: [] }); } });
      G.callout("유성우!", cx, 40, WHITE, hex("#c684ff"), 1, 1);
    }
  }
  update(dt: number, frozen: boolean) {
    if (frozen) return;
    this.reload -= dt;
    const sp = this.w.sp ?? {};
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const q = this.arrows[i];
      q.t += dt;
      q.vy += 380 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.trail.push([q.x, q.y]);
      if (q.trail.length > 5) q.trail.shift();
      let gone = false;
      if (live() && G.bag.hitTest(q.x, q.y, 1)) {
        const b = G.bag, [lx, ly] = b.toLocal(q.x, q.y), head = ly < b.geo.H * 0.3 && !q.rain;
        const a = Math.atan2(q.vy, q.vx);
        const dir: [number, number] = [Math.cos(a), Math.sin(a)];
        if (sp.boom) { G.spawn(blastFx, { x: q.x, y: q.y, size: 0.8 + q.pull * 0.5, palette: ER(this.w), floor: G.floorY - q.y }); sfx.boom(0.8); }
        G.hit({ x: q.x, y: q.y, k: q.k * (sp.boom ? 1.3 : 1), kind: "arrow", power: 0.5 + q.pull * 1.3, freeze: 0.02 + q.pull * 0.05, shake: 0.5 + q.pull * 2.5, dir, crit: head || undefined, label: head ? "헤드샷!" : undefined });
        b.stuck.push({ lx, ly, ang: a - (b.th + b.wob), kind: "arrow", wid: this.w.id, life: 3, depth: 5 });
        if (b.stuck.length > 14) b.stuck.shift();
        gone = true;
      } else if (q.y > G.floorY || q.x < -30 || q.x > G.W + 30 || q.t > 3) {
        if (q.y > G.floorY) G.loose.push({ x: q.x, y: G.floorY - 2, vx: q.vx * 0.2, vy: -60, a: Math.atan2(q.vy, q.vx), va: 3, w: this.w, arrow: true, life: 1 });
        gone = true;
      }
      if (gone) this.arrows.splice(i, 1);
    }
  }
  draw(p: Painter) {
    const w = this.w, E = ER(w).map(hex);
    p.reset();
    for (const q of this.arrows) {
      for (let i = 1; i < q.trail.length; i++) p.line(q.trail[i - 1][0], q.trail[i - 1][1], q.trail[i][0], q.trail[i][1], E[4], i / q.trail.length * 0.8);
      p.place(q.x, q.y, false, Math.atan2(q.vy, q.vx));
      drawArrow(p, w, 16);
      p.reset();
    }
    if (this.held && !(w.sp?.cross)) {
      const pull = this.pull(), a = this.aim();
      if (pull > 0.08) {
        // 궤적 미리보기
        const speed = 260 + 600 * pull;
        let x = this.ax, y = this.ay, vx = Math.cos(a) * speed, vy = Math.sin(a) * speed;
        for (let i = 0; i < 14; i++) {
          for (let k = 0; k < 4; k++) { vy += 380 * 0.01; x += vx * 0.01; y += vy * 0.01; }
          p.dot(x, y, i % 2 ? E[5] : WHITE, 1 - i / 14);
        }
      }
      p.place(this.ax, this.ay, false, a);
      drawBow(p, w, pull, now());
      if (pull > 0.02) { p.place(this.ax - Math.cos(a) * pull * 14, this.ay - Math.sin(a) * pull * 14, false, a); drawArrow(p, w, 18); p.place(this.ax, this.ay, false, a); }
    } else {
      // 쉬는 활
      const x = G.W * 0.18, y = G.H - 18 + Math.sin(G.t * 2.4) * 1.2;
      p.place(x, y, false, -0.9);
      drawBow(p, w, 0, now());
      if (this.reload <= 0) drawArrow(p, w, 14);
    }
  }
  hint(p: Painter, t: number, a: number) {
    if (!live()) return;
    const [cx, cy] = G.bag.center(), ph = (t * 0.8) % 1;
    const sx = cx - 30, sy = cy + 40, k = Math.min(1, ph / 0.6);
    hand(p, sx - k * 24, sy + k * 22, ph < 0.75, a);
    if (ph < 0.75) p.line(sx, sy, sx - k * 24, sy + k * 22, WHITE, a * 0.5);
  }
}

// ============================================================ 8. 주문 (지팡이)
class RuneCtl implements Controller {
  mana = 100;
  stroke: number[][] = [];
  burn: { pts: number[][]; t: number }[] = [];
  held = false;
  cast = 0;
  bolts: { x: number; y: number; vx: number; vy: number; t: number; k: number }[] = [];
  constructor(public w: WeaponDef) {}
  tip(): [number, number] { return [G.W / 2 + 18, G.H - 34 - this.cast * 6]; }
  down(x: number, y: number) { this.held = true; this.stroke = [[x, y]]; }
  move(x: number, y: number) {
    if (!this.held) return;
    const l = this.stroke[this.stroke.length - 1];
    if (Math.hypot(x - l[0], y - l[1]) < 2.5) return;
    this.stroke.push([x, y]);
    if (this.stroke.length > 160) this.stroke.shift();
    sfx.rune();
    if (G.R.chance(0.5)) G.ps.spawn(P.STAR, x, y, G.R.range(-10, 10), G.R.range(-20, 0), 0.4, hex(ER(this.w)[5]), 0.6);
  }
  up() {
    if (!this.held) return;
    this.held = false;
    const pts = this.stroke;
    this.stroke = [];
    this.classify(pts);
  }
  spend(c: number) {
    const cost = c * (this.w.sp?.cheap ?? 1);
    if (this.mana < cost) { sfx.fizzle(); const [x, y] = this.tip(); G.callout("마나 부족", x, y - 20, WHITE, hex("#6080ff"), 1, 0.8); return false; }
    this.mana -= cost;
    return true;
  }
  classify(pts: number[][]) {
    const w = this.w, sp = w.sp ?? {}, E = ER(w), mul = sp.cheap ? 1.5 : 1;
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1];
    this.burn.push({ pts, t: 0 });
    this.cast = 1;
    if (L < 14) {
      // 탭: 마법탄
      if (!this.spend(5)) return;
      const [tx, ty] = this.tip(), [ax, ay] = live() ? G.bag.aimPoint(x1, y1) : [x1, y1], d = Math.hypot(ax - tx, ay - ty) || 1;
      this.bolts.push({ x: tx, y: ty, vx: (ax - tx) / d * 380, vy: (ay - ty) / d * 380, t: 0, k: 0.6 * mul });
      sfx.spell("missile");
      return;
    }
    // 방향 전환 횟수 (지그재그 판정)
    let turns = 0, lastSign = 0, acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      acc += dx;
      if (Math.abs(acc) > 5) { const s = Math.sign(acc); if (lastSign && s !== lastSign) turns++; lastSign = s; acc = 0; }
    }
    const closed = Math.hypot(x1 - x0, y1 - y0) < Math.max(20, L * 0.22) && L > 60;
    if (!live()) return;
    const [cx, cy] = G.bag.center();
    if (closed) {
      if (!this.spend(35)) return;
      if (sp.hole) {
        G.spawn(vortexFx, { x: cx, y: cy, size: 1.2, palette: E });
        sfx.spell("hole");
        G.callout("심연의 소용돌이!", cx, cy - 40, WHITE, hex(E[4]), 1, 1.2);
        for (let i = 0; i < 8; i++) G.queue.push({ t: 0.25 * i, f: () => live() && G.hit({ x: cx + G.R.range(-6, 6), y: cy + G.R.range(-8, 8), k: 0.8 * mul, kind: "magic", power: 0.8, freeze: 0.02, shake: 1 }) });
        G.queue.push({ t: 2.05, f: () => live() && G.hit({ x: cx, y: cy, k: 2 * mul, kind: "magic", power: 2.4, freeze: 0.1, shake: 5, noFx: true }) });
        return;
      }
      G.spawn(novaFx, { x: cx, y: cy, size: 1.1, palette: E, sparks: ELEM[w.elem].sparks, seed: G.R.int(1, 999) });
      G.callout(ELEM[w.elem].name === "비전" ? "비전 노바!" : `${ELEM[w.elem].name} 노바!`, cx, cy - 44, WHITE, hex(E[4]), 1, 1);
      G.queue.push({ t: 0.32, f: () => { sfx.spell("nova"); if (live()) G.hit({ x: cx, y: cy, k: 3.2 * mul, kind: "magic", power: 2.4, freeze: 0.1, shake: 4.5, noFx: true }); } });
      return;
    }
    if (turns >= 3) {
      if (!this.spend(25)) return;
      G.spawn(thunderFx, { x: cx, y: cy + 4, height: cy + 30, palette: w.elem === "none" || w.elem === "arcane" ? ELEM.volt.ramp : E, seed: G.R.int(1, 999) });
      sfx.spell("zap");
      G.flash(hex(E[5]), 0.4);
      G.queue.push({ t: 0.05, f: () => live() && G.hit({ x: cx, y: cy, k: 2.4 * (sp.zig ?? 1) * mul, kind: "thunder", power: 2, freeze: 0.08, shake: 3.5, noFx: true, label: "낙뢰!" }) });
      return;
    }
    // 직선: 그은 방향으로 마력탄
    if (!this.spend(12)) return;
    const d = Math.hypot(x1 - x0, y1 - y0) || 1;
    this.bolts.push({ x: x0, y: y0, vx: (x1 - x0) / d * 430, vy: (y1 - y0) / d * 430, t: 0, k: 1.5 * mul });
    sfx.spell("bolt");
  }
  update(dt: number, frozen: boolean) {
    if (frozen) return;
    this.mana = Math.min(100, this.mana + 24 * (1 + (this.w.sp?.regen ?? 0)) * dt);
    this.cast = Math.max(0, this.cast - dt * 4);
    for (const b of this.burn) b.t += dt;
    this.burn = this.burn.filter((b) => b.t < 0.35);
    const E = ER(this.w);
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const o = this.bolts[i];
      o.t += dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (G.R.chance(0.8)) G.ps.spawn(P.MOTE, o.x, o.y, -o.vx * 0.15 + G.R.range(-15, 15), -o.vy * 0.15 + G.R.range(-15, 15), 0.25, hex(E[5]), 0.7);
      if (live() && G.bag.hitTest(o.x, o.y, 2)) {
        const big = o.k > 1;
        G.hit({ x: o.x, y: o.y, k: o.k, kind: "magic", power: big ? 1.6 : 0.8, freeze: big ? 0.05 : 0.02, shake: big ? 2.5 : 1, dir: [o.vx / 430, o.vy / 430] });
        this.bolts.splice(i, 1);
      } else if (o.t > 1.5 || o.x < -20 || o.x > G.W + 20 || o.y < -20 || o.y > G.H + 20) this.bolts.splice(i, 1);
    }
  }
  draw(p: Painter) {
    const w = this.w, E = ER(w).map(hex);
    p.reset();
    const line = (pts: number[][], k: number) => {
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        p.beam(x0, y0, x1, y1, 3 * k + 1, E[4]);
        p.line(x0, y0, x1, y1, WHITE);
        if (i % 3 === 0) p.glow(x1, y1, 8, E[4], 0.3 * k);
      }
    };
    if (this.stroke.length > 1) line(this.stroke, 1);
    for (const b of this.burn) {
      const k = 1 - b.t / 0.35;
      p.fade = k;
      line(b.pts, k);
      p.fade = 1;
    }
    for (const o of this.bolts) {
      const big = o.k > 1;
      p.circle(o.x, o.y, big ? 4 : 2.5, E[4]);
      p.circle(o.x, o.y, big ? 2.5 : 1.5, WHITE);
      p.glow(o.x, o.y, big ? 14 : 9, E[4], 0.7);
    }
    // 지팡이: 화면 아래 가운데, 시전할 때 번쩍 들어 올린다
    p.place(G.W / 2 + 4, G.H + 6 - this.cast * 6, false, -Math.PI / 2 + 0.35 - this.cast * 0.2);
    drawWeapon(p, w, now());
  }
  hud(): Hud { return { label: "마나", v: this.mana / 100, warn: this.mana < 25 }; }
  hint(p: Painter, t: number, a: number) {
    if (!live()) return;
    const [cx, cy] = G.bag.center(), ph = (t * 0.6) % 1, R = G.bag.geo.H * 0.55;
    const an = -Math.PI / 2 + ph * TAU * 1.1;
    for (let i = 0; i < 30 * Math.min(1, ph); i++) { const aa = -Math.PI / 2 + (i / 30) * TAU * 1.1 * Math.min(1, ph); p.dot(cx + Math.cos(aa) * R, cy + Math.sin(aa) * R, WHITE, a * 0.5); }
    hand(p, cx + Math.cos(an) * R, cy + Math.sin(an) * R, true, a);
  }
}

// ============================================================ 9. 휘두르기 (사슬)
class WhirlCtl implements Controller {
  pts: { x: number; y: number; px: number; py: number }[] = [];
  hx: number;
  hy: number;
  tx: number;
  ty: number;
  held = false;
  cd = 0;
  ghost: number[][] = [];
  N = 8;
  LINK = 6.5;
  constructor(public w: WeaponDef) {
    this.hx = this.tx = G.W * 0.22;
    this.hy = this.ty = G.H * 0.62;
    for (let i = 0; i < this.N; i++) this.pts.push({ x: this.hx, y: this.hy + i * this.LINK, px: this.hx, py: this.hy + i * this.LINK });
  }
  down(x: number, y: number) { this.held = true; this.tx = x; this.ty = y; }
  move(x: number, y: number) { if (this.held) { this.tx = x; this.ty = y; } }
  up() { this.held = false; }
  ball() { return this.pts[this.N - 1]; }
  update(dt: number, frozen: boolean) {
    if (frozen) return;
    this.cd -= dt;
    if (!this.held) { this.tx += (G.W * 0.22 - this.tx) * dt * 0.8; this.ty += (G.H * 0.62 - this.ty) * dt * 0.8; }
    const steps = 3, h = dt / steps;
    for (let s = 0; s < steps; s++) {
      this.hx += (this.tx - this.hx) * Math.min(1, h * 40);
      this.hy += (this.ty - this.hy) * Math.min(1, h * 40);
      const P0 = this.pts[0];
      P0.x = P0.px = this.hx; P0.y = P0.py = this.hy;
      for (let i = 1; i < this.N; i++) {
        const q = this.pts[i], vx = (q.x - q.px) * 0.995, vy = (q.y - q.py) * 0.995;
        q.px = q.x; q.py = q.y;
        q.x += vx;
        q.y += vy + 520 * h * h * (i === this.N - 1 ? 1.5 : 1);
      }
      for (let it = 0; it < 6; it++)
        for (let i = 1; i < this.N; i++) {
          const a = this.pts[i - 1], b = this.pts[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, diff = (d - this.LINK) / d;
          const wa = i === 1 ? 0 : 0.5, wb = i === 1 ? 1 : 0.5 * (i === this.N - 1 ? 0.6 : 1);
          a.x += dx * diff * wa; a.y += dy * diff * wa;
          b.x -= dx * diff * wb; b.y -= dy * diff * wb;
        }
    }
    const b = this.ball(), vx = (b.x - b.px) / h, vy = (b.y - b.py) / h, sp = Math.hypot(vx, vy);
    sfx.chainWhoosh(sp / 420);
    this.ghost.push([b.x, b.y, sp]);
    if (this.ghost.length > 7) this.ghost.shift();
    if (this.w.art === "comet" && sp > 200) G.ps.spawn(P.FIRE, b.x, b.y, G.R.range(-10, 10), G.R.range(-20, 0), 0.4, 0, G.R.range(2, 3.5), 0, PF.SMOKES);
    if (this.cd <= 0 && live() && G.bag.hitTest(b.x, b.y, 4) && sp > 130) {
      const k = clamp(Math.pow(sp / 380, 1.3), 0.35, 2.6), w = this.w, sp2 = w.sp ?? {};
      const dir: [number, number] = [vx / sp, vy / sp];
      if (sp2.blade) {
        G.spawn(slashFx, { x: b.x, y: b.y, angle: Math.atan2(vy, vx), len: 40 + k * 20, width: 4 + k * 2, palette: ER(w), seed: G.R.int(1, 999) });
        G.hit({ x: b.x, y: b.y, k, kind: "slash", power: k, freeze: 0.02 + k * 0.025, shake: k * 1.6, dir, noFx: true });
      } else G.hit({ x: b.x, y: b.y, k, kind: "flail", power: k, freeze: 0.02 + k * 0.03, shake: k * 2, dir });
      if (sp2.boom && k > 1.5) { G.spawn(blastFx, { x: b.x, y: b.y, size: 1.1, palette: ER(w), floor: G.floorY - b.y }); sfx.boom(1); G.hit({ x: b.x, y: b.y, k: k * 0.6, kind: "blast", power: 1.5, noFx: true, quiet: true }); }
      // 튕겨 나간다: 샌드백 중심에서 바깥쪽으로
      const [cx, cy] = G.bag.center(), nx = b.x - cx, ny = b.y - cy, nl = Math.hypot(nx, ny) || 1;
      const out = 0.45 * sp * h;
      b.px = b.x - (nx / nl) * out; b.py = b.y - (ny / nl) * out;
      this.cd = 0.12;
    }
  }
  draw(p: Painter) {
    const w = this.w, { T } = cols(w), E = ER(w).map(hex), b = this.ball();
    p.reset();
    // 빠를 때 잔상
    for (let i = 1; i < this.ghost.length; i++) {
      const [x0, y0, s0] = this.ghost[i - 1], [x1, y1] = this.ghost[i];
      if (s0 < 220) continue;
      p.beam(x0, y0, x1, y1, 2 + i, E[i > 4 ? 5 : 3], (i / this.ghost.length) * 0.8);
    }
    for (let i = 1; i < this.N - 1; i++) {
      const q = this.pts[i], q0 = this.pts[i - 1];
      const a = Math.atan2(q.y - q0.y, q.x - q0.x);
      p.place(q.x, q.y, false, a);
      p.ellipse(0, 0, 2.4, 1.4, INK);
      p.ellipse(0, 0, 1.8, 0.8, i % 2 ? T[2] : T[4]);
      p.reset();
    }
    const n2 = this.pts[this.N - 2];
    drawFlailHead(p, w, b.x, b.y, Math.atan2(b.y - n2.y, b.x - n2.x), now());
    // 손잡이
    p.place(this.hx, this.hy, false, Math.atan2(this.pts[1].y - this.hy, this.pts[1].x - this.hx) + Math.PI);
    p.rect(-1, -2, 9, 4, INK);
    p.rect(0, -1, 7, 2, T[3]);
    p.px(1, -1, T[5]);
  }
  hint(p: Painter, t: number, a: number) {
    if (!live()) return;
    const [cx, cy] = G.bag.center(), an = t * 6;
    hand(p, cx - 40 + Math.cos(an) * 14, cy + 30 + Math.sin(an) * 14, true, a);
  }
}

export function makeController(w: WeaponDef): Controller {
  const c = (() => {
    switch (w.mode) {
      case "tap": return new TapCtl(w);
      case "swipe": return new SwipeCtl(w);
      case "hold": return new HoldCtl(w);
      case "charge": return new ChargeCtl(w);
      case "timing": return new TimingCtl(w);
      case "throw": return new ThrowCtl(w);
      case "bow": return new BowCtl(w);
      case "rune": return new RuneCtl(w);
      default: return new WhirlCtl(w);
    }
  })();
  return c as Controller;
}
void St; void ramp; void scale;
