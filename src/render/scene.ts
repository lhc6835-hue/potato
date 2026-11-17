// 건물 단면 장면: 레이아웃, 카메라, 손님 연출, 이펙트, 그리기.

import { createFrame, clearFrame, createFx, composite, painterFor, mix, hex } from "../vendor/pixelfx/core/index.js";
import { FX } from "../fx/index";
import { MENU, type MenuDef } from "../data/menus";
import { CUSTOMERS, type CustomerDef } from "../data/customers";
import * as E from "../sim/econ";
import { bus } from "../sim/bus";
import type { BranchState, GameState } from "../sim/state";
import { managerOf } from "../sim/econ";
import { fmt } from "../util/format";
import { C, K, food, potato, prepStation, cookStation, finishStation, table, stool, crate, ST_W } from "../art/draw";
import { personRows, personPal, staffLook, COOK_LOOK, type Look } from "../art/people";

// ---------------------------------------------------------------- 레이아웃

export const BW = 172;
export const FH = 46;
export const HALL_H = 58;
export const BASE_H = 40;
export const ROOF_H = 30;
export const SHAFT_W = 22;
const WALL = 3;
/** 한 층의 손질·조리·마무리 시설 x (실내 왼쪽 기준) */
export const STATION_X = [14, 55, 96];

export interface Layout {
  W: number;
  bx: number;
  /** 실내 왼쪽, 오른쪽 */
  ix0: number;
  ix1: number;
  /** 덤웨이터 칸 */
  sx0: number;
  sx1: number;
  floors: number;
  roofTop: number;
  /** 층 i의 위쪽 y */
  floorTop: (i: number) => number;
}

export function layout(W: number, b: BranchState): Layout {
  const bx = Math.floor((W - BW) / 2);
  const ix0 = bx + WALL, ix1 = bx + BW - WALL;
  const sx1 = ix1, sx0 = ix1 - SHAFT_W;
  const floors = b.maxLines;
  return {
    W, bx, ix0, ix1, sx0, sx1, floors,
    roofTop: -HALL_H - floors * FH - ROOF_H,
    floorTop: (i) => -HALL_H - (i + 1) * FH,
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
  state: "in" | "queue" | "buy" | "sit" | "out";
  t: number;
  seat: number;
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
  private offs: (() => void)[] = [];

  constructor(public s: GameState) {
    this.resize(192, 320);
    this.offs.push(
      bus.on("upgrade", (d) => this.onUpgrade(d)),
      bus.on("build", (d) => d.branch === this.branchId && this.flashFloor(this.branch().lines.length - 1, true)),
      bus.on("floor", (d) => d.branch === this.branchId && this.flashFloor(this.branch().maxLines - 1, true)),
      bus.on("batch", (d) => d.branch === this.branchId && this.onBatch(d)),
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
    return [Math.min(top, bottom), bottom];
  }
  clampCam(y: number) {
    const [a, b] = this.camBounds();
    return Math.max(a, Math.min(b, y));
  }
  /** 홀이 화면 아래쪽 2/3에 오게 */
  focusHall(immediate = false) {
    const y = this.clampCam(-HALL_H - this.H * 0.55);
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
      y = L.floorTop(t.line) + FH - 3;
    } else if (t.kind === "lift") {
      x = (L.sx0 + L.sx1) / 2;
      y = -2;
    } else if (t.kind === "counter") {
      x = L.sx0 - 18;
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
      this.oneshots.push({ fx: createFx(FX.levelUp, { x: L.ix0 + 20 + k * 45, y: L.floorTop(i) + FH - 3, big, seed: k }), layer: "front" });
  }

  private onBatch(d: any) {
    // 완성품이 트레이로: 작은 반짝임은 생략, 대신 트레이가 차오르는 걸로 보인다
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
      this.floaters.push({ text: "+" + fmt(this.saleAcc), x: L.sx0 - 16, y: -HALL_H + 8, born: this.time, kind: "money" });
      this.oneshots.push({ fx: createFx(FX.coinPop, { x: L.sx0 - 16, y: -16, seed: Math.floor(this.time * 10) }), layer: "front" });
      this.saleAcc = 0;
      this.lastSale = this.time;
    }

    this.updateWalkers(dt);
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
    if (this.spawnT <= 0 && this.walkers.length < 11) {
      this.spawnT = (1.6 + Math.random() * 1.6) / Math.max(0.25, Math.min(2.2, traffic));
      this.walkers.push({ def: this.pickCustomer(), x: -10, state: "in", t: 0, seat: -1, menu: null, speed: 16 + Math.random() * 8, flip: false });
    }
    const counterX = L.sx0 - 34;
    const queue = this.walkers.filter((w) => w.state === "queue" || w.state === "buy");
    const seats = [L.ix0 + 14, L.ix0 + 36, L.ix0 + 50, L.ix0 + 72];
    for (const w of this.walkers) {
      w.t += dt;
      if (w.state === "in") {
        const idx = queue.length;
        const target = counterX - 4 - idx * 9;
        w.x += w.speed * dt;
        w.flip = false;
        if (w.x >= target || w.x >= counterX - 4) {
          w.state = "queue";
          w.t = 0;
          queue.push(w);
        }
      } else if (w.state === "queue") {
        const idx = queue.indexOf(w);
        const target = counterX - 4 - idx * 9;
        if (w.x < target) w.x = Math.min(target, w.x + w.speed * dt);
        if (idx === 0 && w.t > 0.4) {
          if (stocked.length) {
            w.state = "buy";
            w.t = 0;
            w.menu = stocked[Math.floor(Math.random() * stocked.length)];
          } else if (w.t > 4) {
            w.state = "out";
            w.flip = true;
            this.say(w, "…품절이네.");
          }
        }
      } else if (w.state === "buy") {
        if (w.t > 0.7) {
          const freeSeat = seats.findIndex((_, i) => !this.walkers.some((o) => o.state === "sit" && o.seat === i));
          if (freeSeat >= 0 && Math.random() < 0.55) {
            w.state = "sit";
            w.seat = freeSeat;
            w.t = 0;
            w.x = seats[freeSeat];
          } else {
            w.state = "out";
            w.flip = true;
          }
          if (Math.random() < 0.18) this.say(w);
        }
      } else if (w.state === "sit") {
        if (w.t > 5 + Math.random() * 0.05 * 100) {
          w.state = "out";
          w.flip = true;
        }
      } else if (w.state === "out") {
        w.x -= w.speed * dt;
      }
    }
    this.walkers = this.walkers.filter((w) => w.x > -14);
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
    this.drawBuildingShell(p, L, day, h);
    this.drawBasement(p, L, b);
    this.drawHall(p, L, b, h);
    for (let i = 0; i < L.floors; i++) {
      if (i < b.lines.length) this.drawLine(p, L, b, i);
      else this.drawEmpty(p, L, i);
      this.drawSlab(p, L, L.floorTop(i) + FH);
    }
    this.drawSlab(p, L, 0);
    this.drawRoof(p, L, b, h, day);
    this.drawLift(p, L, b);

    for (const o of this.oneshots) {
      o.fx.draw(this.frame, "back");
      o.fx.draw(this.frame, "front");
    }

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
    p.rect(0, 3, this.W, BASE_H + 40, C("#4a3424"));
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

  private drawBuildingShell(p: any, L: Layout, day: number, h: number) {
    const top = L.roofTop + ROOF_H;
    // 외벽(벽돌) 양옆
    const brick = dim(C("#b0644a"), Math.max(day, 0.7)), brickD = dim(C("#86483a"), Math.max(day, 0.7));
    p.rect(L.bx, top, WALL, -top, brick);
    p.rect(L.ix1, top, WALL, -top, brick);
    for (let y = top; y < 0; y += 4) {
      p.px(L.bx + 1, y, brickD);
      p.px(L.ix1 + 1, y + 2, brickD);
    }
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
    // 콘크리트 지하
    p.rect(L.bx, 1, BW, BASE_H, C("#5a524c"));
    p.rect(L.ix0, 2, L.ix1 - L.ix0, BASE_H - 4, C("#7a7068"));
    for (let x = L.ix0; x < L.ix1; x += 16) p.rect(x, 2, 1, BASE_H - 4, C("#6e6660"));
    p.rect(L.ix0, BASE_H - 3, L.ix1 - L.ix0, 1, C("#5a524c"));
    // 전구
    const lx = (L.ix0 + L.ix1) / 2;
    p.rect(lx, 2, 1, 4, C("#2a2a2a"));
    p.rect(lx - 1, 6, 3, 2, C("#fff0b0"));
    p.glow(lx, 8, 40, C("#ffd890"), 0.22);
    // 상자: 저장량에 따라
    const fill = Math.min(1, b.storage / Math.max(1, E.storageCap(b)));
    const n = 8;
    for (let i = 0; i < n; i++) {
      const row = i >= 5 ? 1 : 0, col = row ? i - 5 : i;
      const x = L.ix0 + 6 + col * 13 + row * 6, y = BASE_H - 3 - row * 8;
      const f = fill * n - i;
      if (f > 0 || row === 0) crate(p, x, y, Math.max(0, Math.min(1, f)), i);
    }
    // 감자 자루 (비축분)
    if (this.s.market.bank > 0) {
      p.ellipse(L.ix1 - 30, BASE_H - 8, 7, 5, C("#b89a6a"));
      p.rect(L.ix1 - 32, BASE_H - 14, 4, 2, C("#8a7048"));
    }
    // 위로 가는 컨베이어 파이프
    p.rect(L.ix1 - 10, 2, 3, BASE_H - 6, C(K.steelD));
    p.rect(L.ix1 - 10, 2, 1, BASE_H - 6, C(K.steelL));
  }

  private drawHall(p: any, L: Layout, b: BranchState, h: number) {
    const top = -HALL_H, floorY = -2;
    // 벽지 + 아래 나무 벽
    p.rect(L.ix0, top, L.sx0 - L.ix0, HALL_H, C("#efe2c8"));
    for (let x = L.ix0 + 4; x < L.sx0; x += 8) p.rect(x, top, 1, HALL_H - 18, C("#e6d6b8"));
    p.rect(L.ix0, floorY - 16, L.sx0 - L.ix0, 16, C("#b07c52"));
    p.rect(L.ix0, floorY - 16, L.sx0 - L.ix0, 1, C("#c8946a"));
    for (let x = L.ix0 + 6; x < L.sx0; x += 12) p.rect(x, floorY - 15, 1, 14, C("#966440"));
    // 바닥 타일
    p.rect(L.ix0, floorY - 1, L.sx0 - L.ix0, 1, C("#8a6a50"));
    // 창문 (하늘이 보인다)
    const [sky] = skyAt(h);
    for (const wx of [L.ix0 + 18, L.ix0 + 58]) {
      p.rect(wx, top + 10, 22, 16, C("#6a4a34"));
      p.rect(wx + 1, top + 11, 20, 14, sky);
      p.rect(wx + 11, top + 11, 1, 14, C("#6a4a34"));
      p.rect(wx + 1, top + 18, 20, 1, C("#6a4a34"));
      p.rect(wx + 2, top + 12, 3, 1, C("#ffffff"));
    }
    // 문 (왼쪽 벽 아래 뚫림)
    p.rect(L.bx, floorY - 22, WALL, 22, C("#3a2a24"));
    p.rect(L.bx, floorY - 23, WALL + 2, 1, C("#6a4a34"));
    // 펜던트 조명
    for (const lx of [L.ix0 + 30, L.ix0 + 70, L.sx0 - 18]) {
      p.rect(lx, top + 1, 1, 6, C("#3a3a3a"));
      p.rect(lx - 2, top + 7, 5, 2, C("#d8a040"));
      p.px(lx, top + 9, C("#fff0c0"));
      p.glow(lx, top + 10, 26, C("#ffd890"), 0.2);
    }
    // 테이블 & 의자
    for (const tx of [L.ix0 + 18, L.ix0 + 54]) {
      stool(p, tx - 7, floorY);
      table(p, tx, floorY);
      stool(p, tx + 19, floorY);
    }
    // 앉은 손님
    for (const w of this.walkers) if (w.state === "sit") this.drawWalker(p, w, floorY - 3);
    // 카운터
    const cx0 = L.sx0 - 32, cx1 = L.sx0 - 1;
    // 계산원
    const cashier = managerOf(this.s, b.counter.manager);
    const look = cashier ? staffLook(cashier.data.look) : { look: { ...COOK_LOOK, shirt: "#a83a32" }, style: 0 as const };
    // 카운터 뒤 단 위에 선다 (머리와 어깨가 보이게)
    const crows = personRows(look.style, Math.floor(this.time * 2) % 4 === 0 ? "work2" : "stand", { tie: !!cashier, cap: !cashier });
    p.sprite(crows, personPal({ ...look.look, acc: "#a83a32" }), cx0 + 20, floorY - 8 - crows.length);
    p.rect(cx0, floorY - 13, cx1 - cx0, 13, C("#a85a3a"));
    p.rect(cx0, floorY - 14, cx1 - cx0, 2, C("#e8dcc8"));
    p.rect(cx0, floorY - 12, cx1 - cx0, 1, C("#7a3a2a"));
    p.rect(cx0 + 2, floorY - 9, cx1 - cx0 - 4, 1, C("#c87a5a"));
    // 진열장: 재고 있는 메뉴
    const shown = b.lines.filter((l) => (b.stock[l.menu] ?? 0) >= 1).slice(-2);
    p.rect(cx0 + 1, floorY - 22, 18, 8, C("#d8eef4"));
    p.rect(cx0 + 1, floorY - 22, 18, 1, C("#ffffff"));
    p.rect(cx0 + 19, floorY - 22, 1, 8, C("#a8c0c8"));
    shown.forEach((l, i) => food(p, cx0 + 2 + i * 8, floorY - 21, MENU[l.menu]));
    // 계산기
    p.rect(cx1 - 6, floorY - 17, 5, 3, C("#3a3a44"));
    p.px(cx1 - 5, floorY - 16, C("#7aff8a"));
    // 줄 선 손님/걷는 손님
    for (const w of this.walkers) if (w.state !== "sit") this.drawWalker(p, w, floorY);
  }

  private drawWalker(p: any, w: Walker, floorY: number) {
    const d = w.def;
    const pose = w.state === "sit" ? "sit" : w.state === "in" || w.state === "out" ? (Math.floor(w.t * 6) % 2 ? "walk1" : "walk2") : "stand";
    const opts: any = {};
    if (d.look.acc === "glasses") opts.glasses = true;
    if (d.look.acc === "shades") opts.shades = true;
    if (d.look.acc === "monocle") opts.monocle = true;
    if (d.look.acc === "cap" || d.look.acc === "hat") opts.cap = true;
    const rows = personRows(d.hairStyle, pose, opts);
    const accColor = d.look.acc === "monocle" ? "#d8b040" : d.look.acc === "hat" ? "#e8d8a0" : d.look.acc === "cap" ? "#4a6aa8" : "#2a2a3a";
    p.sprite(rows, personPal({ ...d.look, acc: accColor }), Math.round(w.x), floorY - rows.length, { flip: w.flip });
    if (w.state === "buy" || (w.state === "sit" && w.menu)) {
      if (w.menu) food(p, Math.round(w.x) + (w.state === "sit" ? 9 : 8), floorY - 10, MENU[w.menu]);
    }
  }

  private person(p: any, x: number, footY: number, style: any, pose: any, look: Look, opts: any) {
    const rows = personRows(style, pose, opts);
    p.sprite(rows, personPal(look), Math.round(x), Math.round(footY - rows.length + 16));
  }

  private drawLine(p: any, L: Layout, b: BranchState, i: number) {
    const s = this.s, l = b.lines[i], m = MENU[l.menu];
    const top = L.floorTop(i), floorY = top + FH - 2;
    this.drawKitchenWall(p, L, top, m);
    const busy = l.cooking;
    const t = this.time + i * 0.37;
    const xs = STATION_X.map((x) => L.ix0 + x);
    // 시설
    prepStation(p, m.prep, xs[0], floorY, t, busy, m);
    const anchor = cookStation(p, m.cook, xs[1], floorY, t, busy);
    finishStation(p, m.finish, xs[2], floorY, t, busy, m);
    // 직원: 각 시설 왼쪽에 선다. 매니저는 조리 담당 자리에 넥타이 차림으로
    const mgr = managerOf(s, l.manager);
    for (let k = 0; k < 3; k++) {
      const isMgr = mgr && k === 1;
      const look = isMgr ? staffLook(mgr!.data.look) : { look: COOK_LOOK, style: 0 as const };
      const pose = busy ? (Math.floor(t * 4 + k) % 2 ? "work1" : "work2") : "stand";
      const rows = personRows(look.style, pose, isMgr ? { tie: true } : { chefHat: true, apron: true });
      p.sprite(rows, personPal(look.look), xs[k] - 10, floorY - rows.length);
    }
    // 이펙트 루프
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
    // 병목 표시: 바쁜데 가장 느린 스테이션 위에 빨간 점
    if (l.lv[0] !== l.lv[1] || l.lv[1] !== l.lv[2]) {
      const bn = E.bottleneck(l);
      const bx = xs[bn] + ST_W / 2;
      if (Math.floor(this.time * 2) % 2) {
        p.rect(bx - 1, top + 6, 2, 4, C("#e84a3a"));
        p.rect(bx - 1, top + 11, 2, 1, C("#e84a3a"));
        p.light(bx, top + 8, C("#ff4a3a"), 0.4);
      }
    }
    // 트레이 (덤웨이터 앞 선반)
    const tx = L.ix0 + 122, ty = floorY - 12;
    p.rect(tx, ty, 13, 1, C(K.steelL));
    p.rect(tx + 1, ty + 1, 1, 11, C(K.steelD));
    p.rect(tx + 11, ty + 1, 1, 11, C(K.steelD));
    p.rect(tx, ty + 6, 13, 1, C(K.steelL));
    const n = Math.min(4, Math.ceil(Math.min(l.tray, 4)));
    for (let k = 0; k < n; k++) food(p, tx + 3, ty - 6 + (k >= 2 ? 6 : 0) - (k % 2) * 3, m);
    // 진행 바
    const pw = 108;
    p.rect(L.ix0 + 6, floorY + 1, pw, 1, C("#5a5048"));
    if (busy) p.rect(L.ix0 + 6, floorY + 1, Math.round(pw * l.progress), 1, C(l.manager !== null ? "#7ad07a" : "#f0c040"));
  }

  private drawKitchenWall(p: any, L: Layout, top: number, m: MenuDef | null) {
    const tint = m ? CAT_WALL[m.cat] ?? "#e4e8ea" : "#d8d2c8";
    p.rect(L.ix0, top, L.sx0 - L.ix0, FH, C(tint));
    // 타일 줄눈
    const line = mix(C(tint), C("#000000"), 0.08);
    for (let y = top + 18; y < top + FH - 2; y += 5) p.rect(L.ix0, y, L.sx0 - L.ix0, 1, line);
    for (let y = top + 18, r = 0; y < top + FH - 2; y += 5, r++) for (let x = L.ix0 + (r % 2) * 4; x < L.sx0; x += 8) p.rect(x, y, 1, 5, line);
    // 위쪽 선반 + 조명
    p.rect(L.ix0, top + 16, L.sx0 - L.ix0, 1, mix(C(tint), C("#000000"), 0.2));
    for (const lx of [L.ix0 + 30, L.ix0 + 90]) {
      p.rect(lx - 6, top + 1, 12, 1, C("#4a4a54"));
      p.rect(lx - 5, top + 2, 10, 1, C("#fff6d8"));
      p.glow(lx, top + 6, 30, C("#fff0c8"), 0.14);
    }
  }

  private drawEmpty(p: any, L: Layout, i: number) {
    const top = L.floorTop(i);
    p.rect(L.ix0, top, L.sx0 - L.ix0, FH, C("#b8b0a4"));
    for (let x = L.ix0; x < L.sx0; x += 10) p.rect(x, top, 1, FH, C("#aaa296"));
    // 공사 테이프
    for (let x = L.ix0 + 6; x < L.sx0 - 6; x += 6) {
      p.rect(x, top + FH - 14, 3, 2, C("#f0c040"));
      p.rect(x + 3, top + FH - 14, 3, 2, C("#2a2a2a"));
    }
    // 빈 방 전구
    const lx = L.ix0 + 60;
    p.rect(lx, top, 1, 6, C("#2a2a2a"));
    p.rect(lx - 1, top + 6, 3, 2, C("#e8e0c0"));
  }

  private drawLift(p: any, L: Layout, b: BranchState) {
    const s = this.s;
    const topY = b.lines.length ? L.floorTop(b.lines.length - 1) : -HALL_H;
    // 통로
    p.rect(L.sx0, topY, SHAFT_W, -topY, C("#3a3638"));
    p.rect(L.sx0 + 2, topY, 1, -topY, C("#5a5458"));
    p.rect(L.sx1 - 3, topY, 1, -topY, C("#5a5458"));
    // 각 층 출입구 표시
    for (let i = 0; i < b.lines.length; i++) p.rect(L.sx0, L.floorTop(i) + FH - 14, 1, 12, C(K.steelL));
    p.rect(L.sx0, -14, 1, 12, C(K.steelL));
    // 케이블
    const lift = b.lift;
    const span = -topY - 14;
    const k = lift.moving ? (lift.t < 0.5 ? lift.t * 2 : 2 - lift.t * 2) : 0;
    const carY = -2 - k * span;
    p.rect(L.sx0 + SHAFT_W / 2, topY, 1, carY - 14 - topY, C("#2a2a2a"));
    // 카
    const cx = L.sx0 + 3;
    p.rect(cx, carY - 14, SHAFT_W - 6, 14, C(K.steelD));
    p.rect(cx + 1, carY - 13, SHAFT_W - 8, 12, C(K.steel));
    p.rect(cx + 1, carY - 13, SHAFT_W - 8, 1, C(K.steelH));
    const loaded = Object.entries(lift.load).filter(([, v]) => v > 0);
    loaded.slice(0, 2).forEach(([id], j) => food(p, cx + 1 + j * 7, carY - 8, MENU[id]));
    const op = managerOf(s, lift.manager);
    if (op) {
      const lk = staffLook(op.data.look);
      const rows = personRows(lk.style, "stand", { tie: true });
      p.sprite(rows.slice(0, 9), personPal(lk.look), cx + 4, carY - 13);
    }
    if (lift.moving) p.light(cx + 8, carY - 16, C("#ffe080"), 0.5);
  }

  // ---------------------------------------------------------- 입력

  /** 화면 좌표(논리 픽셀) → 무엇을 눌렀나 */
  hit(sx: number, sy: number): Hit | null {
    const L = this.lay(), b = this.branch();
    const y = sy + this.camY;
    if (sx < L.bx - 4 || sx > L.bx + BW + 4) return null;
    if (y > 0 && y < BASE_H) return { kind: "storage" };
    if (sx >= L.sx0 && y < 0 && y > L.floorTop(b.lines.length - 1)) return { kind: "lift" };
    if (y >= -HALL_H && y <= 0) return { kind: "hall" };
    for (let i = 0; i < L.floors; i++) {
      const top = L.floorTop(i);
      if (y >= top && y < top + FH) return i < b.lines.length ? { kind: "line", i } : { kind: "empty", i };
    }
    if (y < L.floorTop(L.floors - 1) && y > L.roofTop - 10) return { kind: "roof" };
    return null;
  }

  /** 층 i의 화면 y (논리 픽셀) */
  screenY(worldY: number) {
    return worldY - this.camY;
  }

  /** 탭 연출: 조리 탭에 작은 반짝임 */
  tapFx(i: number) {
    const L = this.lay();
    const x = L.ix0 + 62, y = L.floorTop(i) + FH - 16;
    this.oneshots.push({ fx: createFx(FX.coinPop, { x, y, seed: Math.floor(this.time * 50), gold: ["#3a2a0a", "#8a6a2a", "#e0c070", "#fff0b0", "#ffffff"] }), layer: "front" });
  }

  smoke(i: number) {
    const L = this.lay();
    this.oneshots.push({ fx: createFx(FX.smokePuff, { x: L.ix0 + 62, y: L.floorTop(i) + FH - 18, seed: Math.floor(this.time * 10) }), layer: "front" });
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
