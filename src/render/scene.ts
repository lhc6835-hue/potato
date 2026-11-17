// 건물 단면 장면: 레이아웃, 카메라, 손님 연출, 이펙트, 그리기.
// 구조: 지하 창고 / 1층 = 첫 주방 + 카운터 / 2층부터 주방. 왼쪽에 계단, 오른쪽에 덤웨이터(2층이 생기면).

import { createFrame, clearFrame, createFx, composite, painterFor, mix } from "../vendor/pixelfx/core/index.js";
import { FX } from "../fx/index";
import { MENU, type MenuDef } from "../data/menus";
import { CUSTOMERS, type CustomerDef } from "../data/customers";
import * as E from "../sim/econ";
import { bus } from "../sim/bus";
import type { BranchState, GameState } from "../sim/state";
import { managerOf } from "../sim/econ";
import { SPOT, bossAt } from "../sim/boss";
import { fmt } from "../util/format";
import { C, K, food, potato, prepStation, cookStation, finishStation, crate, ST_W } from "../art/draw";
import { personRows, personPal, staffLook, COOK_LOOK, bossRows, BOSS_PAL } from "../art/people";

// ---------------------------------------------------------------- 레이아웃

export const BW = 172;
export const FH = 46;
/** 1층 높이 (주방 + 카운터 + 손님) */
export const GF_H = 58;
export const HALL_H = GF_H;
export const BASE_H = 40;
export const ROOF_H = 30;
export const SHAFT_W = 22;
const WALL = 3;
/** 계단칸 폭 */
export const STAIR_W = 10;
/** 한 층의 손질·조리·마무리 시설 x (실내 왼쪽 기준) */
export const STATION_X = [20, 53, 86];
/** 1층 카운터 시작 x (실내 왼쪽 기준) */
export const COUNTER_X = 114;

export interface Layout {
  W: number;
  bx: number;
  ix0: number;
  ix1: number;
  /** 덤웨이터 칸 (2층이 없으면 그리지 않지만 좌표는 같다) */
  sx0: number;
  sx1: number;
  floors: number;
  roofTop: number;
  /** 층 i의 위쪽 y (0 = 1층) */
  floorTop: (i: number) => number;
  /** 층 i의 바닥 y (-1 = 지하) */
  floorY: (i: number) => number;
  /** 사장/직원 위치 0..1 → x 픽셀 */
  spotX: (f: number) => number;
}

export function layout(W: number, b: BranchState): Layout {
  const bx = Math.floor((W - BW) / 2);
  const ix0 = bx + WALL, ix1 = bx + BW - WALL;
  const sx1 = ix1, sx0 = ix1 - SHAFT_W;
  const floors = Math.max(1, b.maxLines);
  const floorTop = (i: number) => (i === 0 ? -GF_H : -GF_H - i * FH);
  return {
    W, bx, ix0, ix1, sx0, sx1, floors,
    roofTop: floorTop(floors - 1) - ROOF_H,
    floorTop,
    floorY: (i) => (i < 0 ? BASE_H - 3 : i === 0 ? -2 : floorTop(i) + FH - 2),
    spotX: (f) => ix0 + f * (sx0 - ix0),
  };
}

export type Hit =
  | { kind: "line"; i: number }
  | { kind: "empty"; i: number }
  | { kind: "hall" }
  | { kind: "lift" }
  | { kind: "storage" }
  | { kind: "roof" };

// ---------------------------------------------------------------- 하늘

const SKY: [number, string, string][] = [
  [0, "#0c1230", "#1c2648"], [4.5, "#141c40", "#2e3560"], [6, "#3a5490", "#e89a78"], [8, "#5a9ee0", "#bfe2f4"],
  [16, "#5596d6", "#c8e2ee"], [18, "#4a5a9a", "#f2a070"], [19.5, "#262e68", "#7a4a78"], [21, "#121a40", "#2a2a58"], [24, "#0c1230", "#1c2648"],
];
function skyAt(h: number): [number, number] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0] = SKY[i], [h1, t1, b1] = SKY[i + 1];
    if (h >= h0 && h <= h1) {
      const k = (h - h0) / (h1 - h0);
      return [mix(C(t0), C(t1), k), mix(C(b0), C(b1), k)];
    }
  }
  return [C(SKY[0][1]), C(SKY[0][2])];
}
/** 바깥 밝기 0.45(밤) ~ 1(낮) */
function daylight(h: number) {
  if (h >= 7 && h <= 17.5) return 1;
  if (h >= 21 || h <= 4.5) return 0.45;
  if (h < 7) return 0.45 + 0.55 * ((h - 4.5) / 2.5);
  return 1 - 0.55 * ((h - 17.5) / 3.5);
}
const dim = (c: number, k: number) => mix(C("#0a0c1a"), c, k);



// ---------------------------------------------------------------- 손님 (연출용)

interface Walker {
  def: CustomerDef;
  x: number;
  state: "in" | "queue" | "buy" | "out";
  t: number;
  menu: string | null;
  speed: number;
  flip: boolean;
}

export interface Bubble {
  text: string;
  who: string;
  x: number;
  y: number;
  until: number;
}

export interface Floater {
  text: string;
  x: number;
  y: number;
  born: number;
  kind: "money" | "milestone" | "info";
}

// ---------------------------------------------------------------- 장면

export class Scene {
  W = 192;
  H = 320;
  camY = -160;
  camTarget: number | null = null;
  frame: any;
  img!: ImageData;
  time = 0;
  walkers: Walker[] = [];
  spawnT = 0;
  bubbles: Bubble[] = [];
  floaters: Floater[] = [];
  oneshots: { fx: any; layer: "back" | "front" }[] = [];
  loops = new Map<string, any>();
  branchId = "";
  lastSale = 0;
  saleAcc = 0;
  shake = 0;
  smokeT = 0;
  private offs: (() => void)[] = [];

  constructor(public s: GameState) {
    this.resize(192, 320);
    this.offs.push(
      bus.on("upgrade", (d) => this.onUpgrade(d)),
      bus.on("build", (d) => d.branch === this.branchId && this.flashFloor(this.branch().lines.length - 1, true)),
      bus.on("floor", (d) => d.branch === this.branchId && this.flashFloor(this.branch().maxLines - 1, true)),
    );
  }

  dispose() {
    this.offs.forEach((f) => f());
  }

  resize(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.frame = createFrame(W, H, 0, Math.round(this.camY));
    this.img = new ImageData(W, H);
  }

  branch() {
    const s = this.s;
    return s.branches[Math.min(s.active, s.branches.length - 1)];
  }

  lay() {
    return layout(this.W, this.branch());
  }

  // ---------------------------------------------------------- 카메라

  camBounds(): [number, number] {
    const L = this.lay();
    const top = L.roofTop - 40;
    const bottom = BASE_H + 26 - this.H;
    // 건물이 화면보다 작으면 가운데에 둔다
    if (bottom - top < 0) {
      const c = Math.round((top + BASE_H + 26) / 2 - this.H / 2);
      return [c, c];
    }
    return [top, bottom];
  }
  clampCam(y: number) {
    const [a, b] = this.camBounds();
    return Math.max(a, Math.min(b, y));
  }
  /** 1층과 지하가 화면 아래쪽에 오게 */
  focusHall(immediate = false) {
    const y = this.clampCam(BASE_H + 30 - this.H);
    if (immediate) this.camY = y;
    else this.camTarget = y;
  }
  focusFloor(i: number) {
    const L = this.lay();
    this.camTarget = this.clampCam(L.floorTop(i) - this.H * 0.4);
  }

  // ---------------------------------------------------------- 이벤트 반응

  private onUpgrade(d: any) {
    if (d.branch !== this.branchId) return;
    const L = this.lay();
    let x = 0, y = 0;
    const t = d.target;
    if (t.kind === "station") {
      x = L.ix0 + STATION_X[t.st] + ST_W / 2;
      y = L.floorY(t.line) - 1;
    } else if (t.kind === "lift") {
      x = (L.sx0 + L.sx1) / 2;
      y = -2;
    } else if (t.kind === "counter") {
      x = L.ix0 + COUNTER_X + 14;
      y = -2;
    } else {
      x = (L.ix0 + L.ix1) / 2;
      y = BASE_H - 4;
    }
    this.oneshots.push({ fx: createFx(FX.levelUp, { x, y, big: !!d.milestone, seed: Math.floor(this.time * 100) }), layer: "front" });
    if (d.milestone) {
      this.floaters.push({ text: "마일스톤! ×2", x, y: y - 30, born: this.time, kind: "milestone" });
      this.shake = 0.25;
    }
  }

  private flashFloor(i: number, big: boolean) {
    const L = this.lay();
    for (let k = 0; k < 3; k++)
      this.oneshots.push({ fx: createFx(FX.levelUp, { x: L.ix0 + 30 + k * 40, y: L.floorY(i) - 1, big, seed: k }), layer: "front" });
  }

  // ---------------------------------------------------------- 갱신

  update(dt: number) {
    const s = this.s, b = this.branch();
    if (b.id !== this.branchId) {
      this.branchId = b.id;
      this.walkers = [];
      this.loops.clear();
      this.oneshots = [];
      this.bubbles = [];
      this.focusHall(true);
    }
    this.time += dt;
    if (this.camTarget !== null) {
      this.camY += (this.camTarget - this.camY) * Math.min(1, dt * 8);
      if (Math.abs(this.camTarget - this.camY) < 0.5) {
        this.camY = this.camTarget;
        this.camTarget = null;
      }
    }
    this.camY = this.clampCam(this.camY);
    this.shake = Math.max(0, this.shake - dt);

    for (const o of this.oneshots) o.fx.update(dt);
    this.oneshots = this.oneshots.filter((o) => !o.fx.done());
    for (const fx of this.loops.values()) fx.update(dt);

    this.bubbles = this.bubbles.filter((x) => x.until > this.time);
    this.floaters = this.floaters.filter((x) => this.time - x.born < 1.6);

    // 판매 금액을 모아서 떠오르는 숫자로
    this.saleAcc += b._salePulse ?? 0;
    b._salePulse = 0;
    if (this.saleAcc > 0 && this.time - this.lastSale > 0.8) {
      const L = this.lay();
      const cx = L.ix0 + COUNTER_X + 14;
      this.floaters.push({ text: "+" + fmt(this.saleAcc), x: cx, y: -GF_H + 24, born: this.time, kind: "money" });
      this.oneshots.push({ fx: createFx(FX.coinPop, { x: cx, y: -18, seed: Math.floor(this.time * 10) }), layer: "front" });
      bus.emit("sfx", "coin");
      this.saleAcc = 0;
      this.lastSale = this.time;
    }

    this.updateWalkers(dt);

    // 튀김기 과열: 주방에서 연기가 피어오른다
    if (s.events.some((e) => e.id === "overheat" && e.branch === b.id) && b.lines.length) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = 0.9 + Math.random();
        this.smoke(Math.floor(Math.random() * b.lines.length));
      }
    }
  }

  private pickCustomer(): CustomerDef {
    const ch = Math.max(this.s.chapter, this.s.prestige.best);
    const pool = CUSTOMERS.filter((c) => c.chapter <= ch);
    const W = pool.reduce((a, c) => a + c.weight, 0);
    let r = Math.random() * W;
    return pool.find((c) => (r -= c.weight) <= 0) ?? pool[0];
  }


  private updateWalkers(dt: number) {
    const s = this.s, b = this.branch(), L = this.lay();
    const stocked = b.lines.filter((l) => (b.stock[l.menu] ?? 0) >= 1).map((l) => l.menu);
    const traffic = E.traffic(s, b);
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.walkers.length < 8 && b.lines.length) {
      this.spawnT = (1.8 + Math.random() * 1.8) / Math.max(0.25, Math.min(2.2, traffic));
      this.walkers.push({ def: this.pickCustomer(), x: L.bx - 12, state: "in", t: 0, menu: null, speed: 16 + Math.random() * 8, flip: false });
    }
    const front = L.ix0 + COUNTER_X - 10;
    const queue = this.walkers.filter((w) => w.state === "queue" || w.state === "buy");
    for (const w of this.walkers) {
      w.t += dt;
      if (w.state === "in") {
        const target = front - queue.length * 9;
        w.x += w.speed * dt;
        w.flip = false;
        if (w.x >= target) {
          w.state = "queue";
          w.t = 0;
          queue.push(w);
        }
      } else if (w.state === "queue") {
        const idx = queue.indexOf(w);
        const target = front - idx * 9;
        if (w.x < target) w.x = Math.min(target, w.x + w.speed * dt);
        if (idx === 0 && w.t > 0.4) {
          if (stocked.length) {
            w.state = "buy";
            w.t = 0;
            w.menu = stocked[Math.floor(Math.random() * stocked.length)];
          } else if (w.t > 5) {
            w.state = "out";
            w.flip = true;
            this.say(w, "다 팔렸네요.");
          }
        }
      } else if (w.state === "buy") {
        if (w.t > 0.7) {
          w.state = "out";
          w.flip = true;
          if (Math.random() < 0.15) this.say(w);
        }
      } else {
        w.x -= w.speed * dt;
      }
    }
    this.walkers = this.walkers.filter((w) => w.x > L.bx - 16);
  }

  private say(w: Walker, text?: string) {
    if (this.bubbles.length >= 2) return;
    const s = this.s;
    const idx = Math.floor(Math.random() * w.def.lines.length);
    const line = text ?? w.def.lines[idx];
    if (!text) {
      const key = `${w.def.id}:${idx}`;
      if (!s.reviews.includes(key)) s.reviews.push(key);
    }
    if (!s.seenCustomers.includes(w.def.id)) s.seenCustomers.push(w.def.id);
    this.bubbles.push({ text: line, who: w.def.name, x: w.x + 4, y: -22, until: this.time + 3.2 });
  }


  // ---------------------------------------------------------- 그리기

  render(ctx: CanvasRenderingContext2D) {
    const s = this.s, b = this.branch(), L = this.lay();
    const sh = this.shake > 0 ? Math.round((Math.random() - 0.5) * 2) : 0;
    this.frame.oy = Math.round(this.camY) + sh;
    this.frame.ox = 0;
    clearFrame(this.frame);
    const p = painterFor(this.frame);
    p.place(0, 0);
    const h = E.hour(s.clock), day = daylight(h);

    this.drawSky(p, L, h, day);
    this.drawGround(p, L, day);
    this.drawShell(p, L, day);
    this.drawBasement(p, L, b);
    for (let i = 0; i < L.floors; i++) {
      if (i < b.lines.length) this.drawLine(p, L, b, i);
      else this.drawEmpty(p, L, i);
      this.drawSlab(p, L, L.floorTop(i));
    }
    this.drawSlab(p, L, 1);
    this.drawStairs(p, L);
    this.drawRoof(p, L, b, h, day);
    if (L.floors > 1) this.drawLift(p, L, b);
    this.drawBoss(p, L, b);
    for (const w of this.walkers) this.drawWalker(p, w, -2);

    for (const o of this.oneshots) {
      o.fx.draw(this.frame, "back");
      o.fx.draw(this.frame, "front");
    }
    restore(p);

    composite(this.frame, this.img.data, C("#000000") as any);
    ctx.putImageData(this.img, 0, 0);
  }

  private drawSky(p: any, L: Layout, h: number, day: number) {
    const [top, bot] = skyAt(h);
    const y0 = this.frame.oy, y1 = y0 + this.H;
    // 하늘은 화면 기준 그라데이션, 단계는 8칸으로 끊는다 (픽셀 느낌)
    const bands = 10;
    for (let i = 0; i < bands; i++) {
      const ya = y0 + Math.floor((i * this.H) / bands), yb = y0 + Math.floor(((i + 1) * this.H) / bands);
      if (ya > 0) break;
      p.rect(0, ya, this.W, Math.min(yb, 0) - ya, mix(top, bot, i / (bands - 1)));
    }
    // 별 (밤)
    if (day < 0.8) {
      const a = (0.8 - day) / 0.35;
      for (let i = 0; i < 40; i++) {
        const sx = (i * 73) % this.W, sy = y0 + ((i * 131) % Math.max(1, this.H));
        if (sy > -40) continue;
        p.dot(sx, sy, C("#e8e8ff"), a * (0.5 + 0.5 * Math.sin(this.time * 2 + i)));
      }
    }
    // 해 / 달 (화면 위쪽에 고정)
    const ty = y0 + 26;
    if (h >= 6 && h <= 19) {
      const k = (h - 6) / 13, sx = 16 + k * (this.W - 32), sy = ty + Math.abs(k - 0.5) * 30;
      if (sy < -10) {
        p.circle(sx, sy, 6, C("#fff2c0"));
        p.glow(sx, sy, 30, C("#ffd890"), 0.25);
      }
    } else {
      const hh = h < 6 ? h + 24 : h, k = (hh - 19) / 11, sx = 16 + k * (this.W - 32), sy = ty + Math.abs(k - 0.5) * 30;
      if (sy < -10) {
        p.circle(sx, sy, 5, C("#e8ecf8"));
        p.circle(sx + 2, sy - 1, 4, mix(top, bot, 0.2));
        p.glow(sx, sy, 20, C("#a8b8ff"), 0.12);
      }
    }
    // 구름
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 97 + this.time * (2 + i)) % (this.W + 60)) - 30, cy = y0 + 14 + i * 22;
      if (cy > L.roofTop - 4) continue;
      const cc = dim(C("#f4f6fa"), day);
      p.ellipse(cx, cy, 12, 3, cc);
      p.ellipse(cx + 6, cy - 2, 7, 3, cc);
    }
    // 먼 도시 실루엣
    for (let x = 0; x < this.W; x += 6) {
      const hh = 10 + ((x * 37) % 23);
      const c = dim(C("#7a8aa8"), day * 0.9);
      p.rect(x, -hh, 6, hh, c);
      if (day < 0.8 && (x * 13) % 5 === 0) p.px(x + 2, -hh + 4, C("#ffe08a"));
    }
  }


  private drawGround(p: any, L: Layout, day: number) {
    // 보도
    p.rect(0, 0, this.W, 3, dim(C("#9a948c"), day));
    p.rect(0, 0, this.W, 1, dim(C("#c4beb4"), day));
    // 흙
    p.rect(0, 3, this.W, BASE_H + 600, C("#4a3424"));
    for (let i = 0; i < 60; i++) {
      const x = (i * 53) % this.W, y = 6 + ((i * 29) % (BASE_H + 30));
      p.px(x, y, C(i % 3 ? "#5a4230" : "#3a2818"));
    }
    // 가로등
    for (const lx of [L.bx - 9, L.bx + BW + 6]) {
      if (lx < 1 || lx > this.W - 2) continue;
      p.rect(lx, -26, 1, 26, C("#3a3a44"));
      p.rect(lx - 2, -27, 5, 2, C("#4a4a54"));
      if (day < 0.85) {
        p.rect(lx - 1, -25, 3, 1, C("#ffe8a0"));
        p.glow(lx, -22, 22, C("#ffd88a"), 0.35 * (1 - day));
      }
    }
  }


  private drawShell(p: any, L: Layout, day: number) {
    const top = L.roofTop + ROOF_H;
    const brick = dim(C("#b0644a"), Math.max(day, 0.7)), brickD = dim(C("#86483a"), Math.max(day, 0.7));
    p.rect(L.bx, top, WALL, -top, brick);
    p.rect(L.ix1, top, WALL, -top, brick);
    for (let y = top; y < 0; y += 4) {
      p.px(L.bx + 1, y, brickD);
      p.px(L.ix1 + 1, y + 2, brickD);
    }
    // 1층 문 (왼쪽 아래)
    p.rect(L.bx, -24, WALL, 22, C("#3a2a24"));
    p.rect(L.bx, -25, WALL + 1, 1, C("#6a4a34"));
  }

  private drawSlab(p: any, L: Layout, y: number) {
    p.rect(L.bx, y - 2, BW, 3, C("#7a7068"));
    p.rect(L.bx, y - 2, BW, 1, C("#9a9088"));
  }

  private drawRoof(p: any, L: Layout, b: BranchState, h: number, day: number) {
    const y = L.roofTop + ROOF_H;
    // 지붕 슬래브와 난간
    p.rect(L.bx - 2, y - 3, BW + 4, 3, C("#6a6058"));
    p.rect(L.bx - 2, y - 3, BW + 4, 1, C("#8a8078"));
    p.rect(L.bx, y - 6, 2, 3, C("#6a6058"));
    p.rect(L.bx + BW - 2, y - 6, 2, 3, C("#6a6058"));
    // 간판 받침대
    const sx = L.bx + 26, sw = BW - 52, sy = y - 26;
    p.rect(sx + 8, sy + 18, 2, 6, C("#4a4a54"));
    p.rect(sx + sw - 10, sy + 18, 2, 6, C("#4a4a54"));
    // 간판
    const night = day < 0.85;
    const rush = E.isRush(h);
    p.rect(sx, sy, sw, 18, C("#2e2a30"));
    p.rect(sx + 1, sy + 1, sw - 2, 16, C("#f2e6c8"));
    const blink = rush ? Math.floor(this.time * 3) % 2 : 1;
    // 테두리 전구
    for (let x = sx + 2; x < sx + sw - 1; x += 4) {
      const on = (x / 4 + Math.floor(this.time * (rush ? 6 : 1))) % 2 < 1 || !rush;
      p.px(x, sy + 1, C(on ? "#ffd060" : "#a08040"));
      p.px(x, sy + 16, C(on ? "#ffd060" : "#a08040"));
      if (night && on) p.light(x, sy + 1, C("#ffb040"), 0.4);
    }
    // 감자 엠블럼
    const ex = sx + 6, ey = sy + 4;
    p.ellipse(ex + 5, ey + 5, 5, 4, C("#c8964e"));
    p.ellipse(ex + 4, ey + 4, 3, 2, C("#e8bc78"));
    p.px(ex + 3, ey + 6, C("#8a6030"));
    p.px(ex + 7, ey + 4, C("#8a6030"));
    // 브랜드 글씨 (라틴 미니 폰트)
    p.text("GAMJA", sx + 20, sy + 4, C("#3a2a20"), { font: "mini", scale: 1 });
    p.text("INC.", sx + 20, sy + 10, C("#a83a32"), { font: "mini", scale: 1 });
    if (night) p.glow(sx + sw / 2, sy + 9, sw * 0.7, C("#ffd890"), 0.18 * blink);
    // 안테나
    p.rect(L.bx + BW - 18, y - 16, 1, 13, C("#4a4a54"));
    p.px(L.bx + BW - 18, y - 17, C(Math.floor(this.time * 1.5) % 2 ? "#ff4a3a" : "#6a2a2a"));
  }


  private drawBasement(p: any, L: Layout, b: BranchState) {
    p.rect(L.bx, 1, BW, BASE_H, C("#5a524c"));
    p.rect(L.ix0, 2, L.ix1 - L.ix0, BASE_H - 4, C("#7a7068"));
    for (let x = L.ix0; x < L.ix1; x += 16) p.rect(x, 2, 1, BASE_H - 4, C("#6e6660"));
    p.rect(L.ix0, BASE_H - 3, L.ix1 - L.ix0, 1, C("#5a524c"));
    const lx = (L.ix0 + L.ix1) / 2;
    p.rect(lx, 2, 1, 4, C("#2a2a2a"));
    p.rect(lx - 1, 6, 3, 2, C("#fff0b0"));
    p.glow(lx, 8, 40, C("#ffd890"), 0.22);
    // 상자: 저장량에 따라
    const fill = Math.min(1, b.storage / Math.max(1, E.storageCap(b)));
    const n = 8;
    for (let i = 0; i < n; i++) {
      const row = i >= 5 ? 1 : 0, col = row ? i - 5 : i;
      const x = L.ix0 + STAIR_W + 34 + col * 13 + row * 6, y = BASE_H - 3 - row * 8;
      const f = fill * n - i;
      if (f > 0 || row === 0) crate(p, x, y, Math.max(0, Math.min(1, f)), i);
    }
    if (this.s.market.bank > 0) {
      p.ellipse(L.ix1 - 14, BASE_H - 8, 7, 5, C("#b89a6a"));
      p.rect(L.ix1 - 16, BASE_H - 14, 4, 2, C("#8a7048"));
    }
    // 납품구 (오른쪽 위 해치)
    p.rect(L.ix1 - 20, 2, 14, 3, C("#4a4a54"));
    p.rect(L.ix1 - 19, 3, 12, 1, C("#6a6a74"));
    // 운반 매니저: 상자와 계단을 오간다
    const porter = managerOf(this.s, b.supply.manager);
    if (porter || b.staff) {
      const lk = porter ? staffLook(porter.data.look) : { look: { ...COOK_LOOK, shirt: "#6a8a5a" }, style: 0 as const };
      const period = 3.2, ph = (this.time % period) / period;
      const k = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      const x = L.spotX(SPOT.stairs + 0.02) + k * (L.spotX(SPOT.crates) - L.spotX(SPOT.stairs + 0.02));
      const rows = personRows(lk.style, Math.floor(this.time * 6) % 2 ? "walk1" : "walk2", { tie: !!porter });
      p.sprite(rows, personPal(lk.look), Math.round(x), L.floorY(-1) - rows.length, { flip: ph < 0.5 });
      if (ph >= 0.5) this.sack(p, Math.round(x), L.floorY(-1) - rows.length - 4);
    }
  }

  private drawStairs(p: any, L: Layout) {
    const x0 = L.ix0, top = L.floorTop(L.floors - 1);
    p.rect(x0, top, STAIR_W, BASE_H - 3 - top, C("#5e5650"));
    // 층마다 지그재그 계단
    for (let f = -1; f < L.floors - 1; f++) {
      const y0 = L.floorY(f), y1 = L.floorY(f + 1);
      const steps = 7;
      for (let k = 0; k < steps; k++) {
        const y = Math.round(y0 - ((y0 - y1) * (k + 1)) / steps);
        const x = f % 2 === 0 ? x0 + 1 + k : x0 + STAIR_W - 2 - k;
        p.rect(x, y, 2, 1, C("#9a9088"));
      }
    }
    p.rect(x0 + STAIR_W - 1, top, 1, BASE_H - 3 - top, C("#4a4440"));
  }

  private sack(p: any, x: number, y: number) {
    p.rect(x + 1, y, 6, 4, C("#b89a6a"));
    p.rect(x + 2, y - 1, 4, 1, C("#8a7048"));
    p.px(x + 3, y + 1, C("#d8bc88"));
  }

  /** 박감자 사장 */
  private drawBoss(p: any, L: Layout, b: BranchState) {
    const s = this.s, boss = s.boss;
    if (b.id !== "b0") return;
    let x: number, y: number;
    if (boss.stair) {
      const { from, to, t } = boss.stair;
      y = L.floorY(from) + (L.floorY(to) - L.floorY(from)) * t;
      x = L.ix0 + 1;
    } else {
      x = L.spotX(boss.x) - 4;
      y = L.floorY(boss.floor);
    }
    const moving = !!boss.stair || (boss.task && !(boss.task.kind === "cook" && bossAt(s, boss.task.line)) && boss.wait <= 0);
    const working = boss.task?.kind === "cook" && bossAt(s, boss.task.line) && b.lines[boss.task.line]?.cooking;
    const pose = moving ? (Math.floor(this.time * 7) % 2 ? "walk1" : "walk2") : working ? (Math.floor(this.time * 4) % 2 ? "work1" : "work2") : "stand";
    const rows = bossRows(pose);
    p.sprite(rows, BOSS_PAL, Math.round(x), Math.round(y) - rows.length, { flip: boss.facing < 0 });
    if (boss.carry > 0) {
      this.sack(p, Math.round(x), Math.round(y) - rows.length - 5);
      p.text(String(Math.floor(boss.carry)), Math.round(x) + 9, Math.round(y) - rows.length - 6, C("#ffffff"), { font: "mini", shadow: C("#000000") });
    }
    // 머리 위 작은 화살표: 플레이어 표시
    const ay = Math.round(y) - rows.length - (boss.carry > 0 ? 11 : 4) + (Math.floor(this.time * 2) % 2);
    p.px(Math.round(x) + 3, ay, C("#f0c040"));
    p.px(Math.round(x) + 4, ay, C("#f0c040"));
    p.px(Math.round(x) + 3, ay - 1, C("#f0c040"));
    p.px(Math.round(x) + 4, ay - 1, C("#f0c040"));
    p.rect(Math.round(x) + 2, ay - 2, 4, 1, C("#f0c040"));
  }

  private drawWalker(p: any, w: Walker, floorY: number) {
    const d = w.def;
    const pose = w.state === "in" || w.state === "out" ? (Math.floor(w.t * 6) % 2 ? "walk1" : "walk2") : "stand";
    const opts: any = {};
    if (d.look.acc === "glasses") opts.glasses = true;
    if (d.look.acc === "shades") opts.shades = true;
    if (d.look.acc === "monocle") opts.monocle = true;
    if (d.look.acc === "cap" || d.look.acc === "hat") opts.cap = true;
    const rows = personRows(d.hairStyle, pose, opts);
    const accColor = d.look.acc === "monocle" ? "#d8b040" : d.look.acc === "hat" ? "#e8d8a0" : d.look.acc === "cap" ? "#4a6aa8" : "#2a2a3a";
    p.sprite(rows, personPal({ ...d.look, acc: accColor }), Math.round(w.x), floorY - rows.length, { flip: w.flip });
    if ((w.state === "buy" || w.state === "out") && w.menu) food(p, Math.round(w.x) + (w.flip ? -7 : 8), floorY - 10, MENU[w.menu]);
  }


  /** 주방 한 층 (i = 0이면 1층: 주방 + 카운터) */
  private drawLine(p: any, L: Layout, b: BranchState, i: number) {
    const s = this.s, l = b.lines[i], m = MENU[l.menu];
    const top = L.floorTop(i), floorY = L.floorY(i), hgt = i === 0 ? GF_H : FH;
    this.drawKitchenWall(p, L, top, m, hgt, i === 0);
    const busy = l.cooking;
    const t = this.time + i * 0.37;
    const xs = STATION_X.map((x) => L.ix0 + x);

    // 감자 통 (손질대 왼쪽)
    const bx = L.ix0 + STAIR_W + 1;
    const fill = l.bin / Math.max(1, E.binCap(s, b, l));
    p.rect(bx, floorY - 6, 9, 6, C(K.wood));
    p.rect(bx, floorY - 6, 9, 1, C(K.woodL));
    p.rect(bx, floorY - 1, 9, 1, C(K.woodD));
    if (fill > 0.02) potato(p, bx + 1, floorY - 9, 0);
    if (fill > 0.4) potato(p, bx + 4, floorY - 9, 1);
    if (fill > 0.75) potato(p, bx + 2, floorY - 11, 0);
    const per = E.potatoesPer(s, m);
    if (per > 0 && l.bin < per && Math.floor(this.time * 2) % 2) {
      p.rect(bx + 4, floorY - 17, 1, 4, C("#e84a3a"));
      p.rect(bx + 4, floorY - 12, 1, 1, C("#e84a3a"));
    }

    prepStation(p, m.prep, xs[0], floorY, t, busy, m);
    const anchor = cookStation(p, m.cook, xs[1], floorY, t, busy);
    finishStation(p, m.finish, xs[2], floorY, t, busy, m);

    // 직원: 매니저가 있으면 매니저(조리) + 보조 둘, 분점 기본 직원은 한 명
    const mgr = managerOf(s, l.manager);
    const staff: { k: number; look: any; style: any; opts: any }[] = [];
    if (mgr) {
      const lk = staffLook(mgr.data.look);
      staff.push({ k: 1, look: lk.look, style: lk.style, opts: { tie: true } });
      staff.push({ k: 0, look: COOK_LOOK, style: 0, opts: { chefHat: true, apron: true } });
      staff.push({ k: 2, look: COOK_LOOK, style: 0, opts: { chefHat: true, apron: true } });
    } else if (b.staff) {
      staff.push({ k: 1, look: COOK_LOOK, style: 0, opts: { chefHat: true, apron: true } });
    }
    for (const st of staff) {
      const pose = busy ? (Math.floor(t * 4 + st.k) % 2 ? "work1" : "work2") : "stand";
      const rows = personRows(st.style, pose, st.opts);
      p.sprite(rows, personPal(st.look), xs[st.k] - 10, floorY - rows.length);
    }

    if (anchor.fx === "steam" || anchor.fx === "oil" || anchor.fx === "sizzle") {
      const key = `${i}:${anchor.fx}`;
      let fx = this.loops.get(key);
      if (!fx) {
        const mod = anchor.fx === "steam" ? FX.steam : anchor.fx === "oil" ? FX.oilBubbles : FX.sizzle;
        fx = createFx(mod, { x: anchor.ax, y: anchor.ay, seed: i + 1, ...(anchor.fx === "steam" ? { height: 22, width: 8 } : {}) });
        this.loops.set(key, fx);
      }
      fx.draw(this.frame, "front");
      restore(p);
    }
    // 병목 표시
    if (l.lv[0] !== l.lv[1] || l.lv[1] !== l.lv[2]) {
      const bn = E.bottleneck(l);
      const bxx = xs[bn] + ST_W / 2;
      if (Math.floor(this.time * 2) % 2) {
        p.rect(bxx - 1, floorY - 30, 2, 4, C("#e84a3a"));
        p.rect(bxx - 1, floorY - 25, 2, 1, C("#e84a3a"));
        p.light(bxx, floorY - 28, C("#ff4a3a"), 0.4);
      }
    }
    // 진행 바
    const pw = xs[2] + ST_W - (L.ix0 + STAIR_W + 2);
    p.rect(L.ix0 + STAIR_W + 2, floorY + 1, pw, 1, C("#5a5048"));
    if (busy) p.rect(L.ix0 + STAIR_W + 2, floorY + 1, Math.round(pw * l.progress), 1, C(l.manager !== null ? "#7ad07a" : "#f0c040"));

    if (i === 0) this.drawCounter(p, L, b, floorY);
    else {
      // 덤웨이터 앞 트레이
      const tx = L.ix0 + 114, ty = floorY - 12;
      p.rect(tx, ty, 13, 1, C(K.steelL));
      p.rect(tx + 1, ty + 1, 1, 11, C(K.steelD));
      p.rect(tx + 11, ty + 1, 1, 11, C(K.steelD));
      p.rect(tx, ty + 6, 13, 1, C(K.steelL));
      const n = Math.min(4, Math.ceil(Math.min(l.tray, 4)));
      for (let k = 0; k < n; k++) food(p, tx + 3, ty - 6 + (k >= 2 ? 6 : 0) - (k % 2) * 3, m);
    }
  }

  /** 1층 카운터 */
  private drawCounter(p: any, L: Layout, b: BranchState, floorY: number) {
    const s = this.s;
    const cx0 = L.ix0 + COUNTER_X, cx1 = (L.floors > 1 ? L.sx0 : L.ix1) - 1;
    const cashier = managerOf(s, b.counter.manager);
    if (cashier) {
      const lk = staffLook(cashier.data.look);
      const rows = personRows(lk.style, Math.floor(this.time * 2) % 4 === 0 ? "work2" : "stand", { tie: true });
      p.sprite(rows, personPal(lk.look), cx0 + 14, floorY - 8 - rows.length);
    }
    p.rect(cx0, floorY - 13, cx1 - cx0, 13, C("#a85a3a"));
    p.rect(cx0, floorY - 14, cx1 - cx0, 2, C("#e8dcc8"));
    p.rect(cx0, floorY - 12, cx1 - cx0, 1, C("#7a3a2a"));
    p.rect(cx0 + 2, floorY - 9, cx1 - cx0 - 4, 1, C("#c87a5a"));
    const shown = b.lines.filter((l) => (b.stock[l.menu] ?? 0) >= 1).slice(-2);
    p.rect(cx0 + 1, floorY - 22, 17, 8, C("#d8eef4"));
    p.rect(cx0 + 1, floorY - 22, 17, 1, C("#ffffff"));
    p.rect(cx0 + 18, floorY - 22, 1, 8, C("#a8c0c8"));
    shown.forEach((l, i) => food(p, cx0 + 2 + i * 8, floorY - 21, MENU[l.menu]));
    p.rect(cx1 - 6, floorY - 17, 5, 3, C("#3a3a44"));
    p.px(cx1 - 5, floorY - 16, C("#7aff8a"));
  }

  private drawKitchenWall(p: any, L: Layout, top: number, m: MenuDef | null, hgt: number, ground: boolean) {
    const right = L.floors > 1 ? L.sx0 : L.ix1;
    const tint = m ? CAT_WALL[m.cat] ?? "#e4e8ea" : "#d8d2c8";
    const x0 = L.ix0 + STAIR_W;
    p.rect(x0, top, right - x0, hgt, C(tint));
    const line = mix(C(tint), C("#000000"), 0.08);
    const tile0 = top + hgt - 28;
    for (let y = tile0; y < top + hgt - 2; y += 5) p.rect(x0, y, right - x0, 1, line);
    for (let y = tile0, r = 0; y < top + hgt - 2; y += 5, r++) for (let x = x0 + (r % 2) * 4; x < right; x += 8) p.rect(x, y, 1, 5, line);
    p.rect(x0, tile0 - 2, right - x0, 1, mix(C(tint), C("#000000"), 0.2));
    if (ground) {
      // 1층: 카운터 쪽 벽은 따뜻한 색, 창문 하나
      const cx = L.ix0 + COUNTER_X - 2;
      p.rect(cx, top, right - cx, hgt, C("#efe2c8"));
      p.rect(cx, top + hgt - 18, right - cx, 16, C("#b07c52"));
      const [sky] = skyAt(E.hour(this.s.clock));
      p.rect(cx + 6, top + 8, 18, 14, C("#6a4a34"));
      p.rect(cx + 7, top + 9, 16, 12, sky);
      p.rect(cx + 15, top + 9, 1, 12, C("#6a4a34"));
    }
    for (const lx of [L.ix0 + 40, L.ix0 + 96]) {
      p.rect(lx - 6, top + 1, 12, 1, C("#4a4a54"));
      p.rect(lx - 5, top + 2, 10, 1, C("#fff6d8"));
      p.glow(lx, top + 6, 30, C("#fff0c8"), 0.14);
    }
  }

  private drawEmpty(p: any, L: Layout, i: number) {
    const top = L.floorTop(i), right = L.sx0;
    p.rect(L.ix0 + STAIR_W, top, right - L.ix0 - STAIR_W, FH, C("#b8b0a4"));
    for (let x = L.ix0 + STAIR_W; x < right; x += 10) p.rect(x, top, 1, FH, C("#aaa296"));
    for (let x = L.ix0 + 16; x < right - 6; x += 6) {
      p.rect(x, top + FH - 14, 3, 2, C("#f0c040"));
      p.rect(x + 3, top + FH - 14, 3, 2, C("#2a2a2a"));
    }
    const lx = L.ix0 + 70;
    p.rect(lx, top, 1, 6, C("#2a2a2a"));
    p.rect(lx - 1, top + 6, 3, 2, C("#e8e0c0"));
  }

  private drawLift(p: any, L: Layout, b: BranchState) {
    const s = this.s;
    const topY = L.floorTop(Math.max(0, b.lines.length - 1));
    p.rect(L.sx0, topY, SHAFT_W, -topY, C("#3a3638"));
    p.rect(L.sx0 + 2, topY, 1, -topY, C("#5a5458"));
    p.rect(L.sx1 - 3, topY, 1, -topY, C("#5a5458"));
    for (let i = 0; i < b.lines.length; i++) p.rect(L.sx0, L.floorY(i) - 12, 1, 12, C(K.steelL));
    const lift = b.lift;
    const span = -topY - 14;
    const k = lift.moving ? (lift.t < 0.5 ? lift.t * 2 : 2 - lift.t * 2) : 0;
    const carY = -2 - k * span;
    p.rect(L.sx0 + SHAFT_W / 2, topY, 1, carY - 14 - topY, C("#2a2a2a"));
    const cx = L.sx0 + 3;
    p.rect(cx, carY - 14, SHAFT_W - 6, 14, C(K.steelD));
    p.rect(cx + 1, carY - 13, SHAFT_W - 8, 12, C(K.steel));
    p.rect(cx + 1, carY - 13, SHAFT_W - 8, 1, C(K.steelH));
    Object.entries(lift.load).filter(([, v]) => v > 0).slice(0, 2).forEach(([id], j) => food(p, cx + 1 + j * 7, carY - 8, MENU[id]));
    const op = managerOf(s, lift.manager);
    if (op) {
      const lk = staffLook(op.data.look);
      const rows = personRows(lk.style, "stand", { tie: true });
      p.sprite(rows.slice(0, 9), personPal(lk.look), cx + 4, carY - 13);
    }
    if (lift.moving) p.light(cx + 8, carY - 16, C("#ffe080"), 0.5);
    // 기다리는 음식이 있는데 아무도 안 보내면 버튼이 깜빡인다
    const waiting = b.lines.some((l, i) => i > 0 && l.tray >= 1);
    if (!lift.moving && waiting && lift.manager === null && Math.floor(this.time * 2) % 2) {
      p.rect(L.sx0 + 7, -26, 8, 5, C("#f0c040"));
      p.rect(L.sx0 + 10, -25, 2, 3, C("#2a2220"));
    }
  }

  // ---------------------------------------------------------- 입력

  hit(sx: number, sy: number): Hit | null {
    const L = this.lay(), b = this.branch();
    const y = sy + this.camY;
    if (sx < L.bx - 4 || sx > L.bx + BW + 4) return null;
    if (y > 0 && y < BASE_H) return { kind: "storage" };
    if (L.floors > 1 && sx >= L.sx0 && y < 0 && y > L.floorTop(Math.max(0, b.lines.length - 1))) return { kind: "lift" };
    if (y >= -GF_H && y <= 0) {
      if (sx >= L.ix0 + COUNTER_X - 4 || !b.lines.length) return { kind: "hall" };
      return { kind: "line", i: 0 };
    }
    for (let i = 1; i < L.floors; i++) {
      const top = L.floorTop(i);
      if (y >= top && y < top + FH) return i < b.lines.length ? { kind: "line", i } : { kind: "empty", i };
    }
    if (y < L.floorTop(L.floors - 1) && y > L.roofTop - 10) return { kind: "roof" };
    return null;
  }

  tapFx(i: number) {
    const L = this.lay();
    const x = L.ix0 + STATION_X[1] + 12, y = L.floorY(i) - 14;
    this.oneshots.push({ fx: createFx(FX.coinPop, { x, y, seed: Math.floor(this.time * 50), gold: ["#3a2a0a", "#8a6a2a", "#e0c070", "#fff0b0", "#ffffff"] }), layer: "front" });
  }

  smoke(i: number) {
    const L = this.lay();
    this.oneshots.push({ fx: createFx(FX.smokePuff, { x: L.ix0 + STATION_X[1] + 12, y: L.floorY(i) - 16, seed: Math.floor(this.time * 10) }), layer: "front" });
  }
}

/** 이펙트가 같은 painter의 위치를 바꿔 놓으므로 원래대로 */
function restore(p: any) {
  p.place(0, 0);
  p.fade = 1;
  p.lightK = 1;
  p.layer = "front";
}

const CAT_WALL: Record<string, string> = {
  basic: "#e8e4dc", fried: "#f2e2c4", mashed: "#efe8d2", pan: "#ecdcc4", braised: "#e2d4c4", salad: "#dceadc", soup: "#e4e0d0",
  pasta: "#ecdcd0", oven: "#ead6c8", burger: "#f0dcc8", dessert: "#f0e0e4", premium: "#dcd8e8", legend: "#f4ecc8",
};

