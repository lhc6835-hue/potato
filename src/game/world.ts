// 게임 세계: 타격 처리(피해·골드·피버·이펙트·소리·히트스톱), 샌드백 교체, 보스, 이벤트, 렌더 순서.
import {
  Painter, Color, Particles, Bits, P, PF, B, Rng, hex, ramp, mix, scale, clearFrame, painterFor, createFx, FxInstance, WHITE, TAU, clamp,
} from "../vendor/pixelfx/core/index.js";
import { View } from "../engine/view";
import { htext } from "../engine/htext";
import { sfx, haptic, music, Mat } from "../engine/audio";
import { short } from "../engine/num";
import { ELEM, Elem } from "../data/elements";
import { MODES } from "../data/modes";
import { WEAPON, WeaponDef } from "../data/weapons";
import { REGIONS } from "../data/bags";
import { Bag, Stuck } from "./bag";
import * as St from "./state";
import { S } from "./state";
import { drawThrown, drawArrow, drawWeapon } from "../art/weapons";
import { makeController, Controller } from "./controls";
import { Crew } from "./crew";
import { drawBackdrop, drawAmbient, drawBeam } from "./backdrop";
import { emit } from "../ui/bus";
import * as punchFx from "../fx/hit/punch.js";
import * as sparkFx from "../fx/hit/spark.js";
import * as slamFx from "../fx/hit/slam.js";
import * as critFx from "../fx/hit/crit.js";
import * as blastFx from "../fx/boom/blast.js";
import * as shardsFx from "../fx/boom/shards.js";
import * as thunderFx from "../fx/magic/thunder.js";
import * as beamFx from "../fx/magic/beam.js";
import * as popFx from "../fx/magic/pop.js";
import * as levelFx from "../fx/hit/levelup.js";

export type HitKind = "punch" | "slash" | "bullet" | "slam" | "pierce" | "magic" | "thunder" | "blast" | "flail" | "arrow" | "stab" | "dot" | "crew";

export interface HitOpts {
  x: number;
  y: number;
  /** 무기 위력에 곱하는 배율 */
  k?: number;
  /** 동료·도트처럼 정해진 피해 */
  amount?: number;
  dir?: [number, number];
  kind: HitKind;
  /** 화면 연출 세기 0.3~3 */
  power?: number;
  freeze?: number;
  shake?: number;
  crit?: boolean;
  critAdd?: number;
  elem?: Elem;
  weapon?: WeaponDef;
  /** 이펙트를 직접 띄운다면 true */
  noFx?: boolean;
  quiet?: boolean;
  src?: "player" | "crew" | "dot";
  label?: string;
}

interface Floater { x: number; y: number; vy: number; s: string; c: Color; o: Color; big: number; life: number; max: number }
interface Coin { x: number; y: number; vx: number; vy: number; t: number; gem?: boolean; spin: number }
interface Loose { x: number; y: number; vx: number; vy: number; a: number; va: number; w: WeaponDef; arrow?: boolean; life: number; bounced?: boolean }
interface Callout { s: string; x: number; y: number; c1: Color; c2: Color; k: number; t: number; max: number }
interface Fx { fx: FxInstance; layer: number }

const FLOOR_PAD = 46;
const GOLD_C = ramp(["#5a3a08", "#a06a10", "#e0a020", "#ffd040", "#fff0a0"]);
const GEM_C = ramp(["#2a0a4a", "#6a1ab0", "#b048ff", "#e0a0ff", "#ffffff"]);
const INK = hex("#0c0810");

class World {
  view!: View;
  W = 200;
  H = 260;
  floorY = 210;
  bag!: Bag;
  fx: Fx[] = [];
  ps = new Particles({ rng: new Rng(77), ground: () => this.floorY });
  bits = new Bits({ ground: () => this.floorY });
  floaters: Floater[] = [];
  coins: Coin[] = [];
  loose: Loose[] = [];
  callouts: Callout[] = [];
  ctl!: Controller;
  crew = new Crew();
  R = new Rng(1234);
  t = 0;
  freeze = 0;
  slow = 0;
  shakeA = 0;
  shakeT = 0;
  flashA = 0;
  flashC: Color = WHITE;
  combo = 0;
  comboT = 0;
  fever = 0;
  feverT = 0;
  idle = 0;
  bossT = 0;
  bossMax = 0;
  respawn = 0;
  region = -1;
  dotT = 0;
  phantomT = 0;
  goblinT = 90;
  goblin: { x: number; dir: number; t: number; hit: boolean } | null = null;
  chest: { x: number; y: number; vy: number; t: number; open: number } | null = null;
  coinTarget: [number, number] = [10, 8];
  gemTarget: [number, number] = [60, 8];
  lastHitT = 0;
  hintT = 0;
  stuckDraw = (p: Painter, s: Stuck) => this.drawStuck(p, s);

  attach(view: View) {
    this.view = view;
    view.onResize = () => this.layout();
    this.layout();
    this.spawnBag(true);
    this.equip(S.equip);
  }

  layout() {
    const v = this.view;
    this.W = v.W;
    this.H = v.H;
    this.floorY = this.H - Math.max(FLOOR_PAD, Math.round(this.H * 0.17));
    if (this.bag) this.placeBag(this.bag);
    this.region = -1;
    this.checkRegion();
    this.crew.layout(this);
  }

  placeBag(b: Bag) {
    b.ax = Math.round(this.W / 2);
    b.ay = 14;
    b.L = clamp(this.floorY - 26 - b.geo.H - b.ay, 10, 90);
  }

  checkRegion() {
    const r = St.regionOf(S.stage);
    if (r === this.region || !this.view) return;
    const first = this.region >= 0;
    this.region = r;
    clearFrame(this.view.bg);
    const p = painterFor(this.view.bg);
    drawBackdrop(p, REGIONS[r], this.W, this.H, this.floorY);
    music(REGIONS[r].music, this.fever > 0);
    if (first) {
      this.callout(REGIONS[r].name, this.W / 2, this.H * 0.3, hex("#ffffff"), hex(REGIONS[r].accent), 2, 2.2);
      sfx.victory();
    }
    emit("region");
  }

  equip(id: string) {
    const w = WEAPON[id];
    if (!w || !S.weapons[id]) return;
    S.equip = id;
    this.ctl?.dispose?.();
    this.ctl = makeController(w);
    this.hintT = S.seen[w.mode] ? 0 : 6;
    emit("equip");
  }

  // ---------------------------------------------------------------- 샌드백
  spawnBag(first = false) {
    const s = S.stage, info = St.bagFor(s);
    const golden = !info.boss && !info.elite && !first && this.R.chance(0.03 + St.luck());
    const hp = St.stageHp(s) * info.def.hp;
    const b = new Bag(info.def, hp, { boss: info.boss, elite: info.elite, golden, seed: s * 13 + 1 });
    this.placeBag(b);
    b.drop = first ? 0 : -(b.L + b.geo.H + 30);
    b.entering = !first;
    this.bag = b;
    if (St.isBoss(s) && !S.bossFail) {
      this.bossT = this.bossMax = St.bossTime();
      if (!first) sfx.boss();
      this.callout(info.boss ? "보스 등장!" : "정예 샌드백!", this.W / 2, this.H * 0.28, hex("#ffffff"), hex("#ff4060"), 2, 1.8);
    } else this.bossT = this.bossMax = 0;
    if (golden) this.callout("황금 샌드백!", this.W / 2, this.H * 0.3, hex("#fff8c0"), hex("#ffb020"), 2, 1.6);
    if (!first) sfx.drop();
    this.checkRegion();
    emit("bag");
  }

  breakBag() {
    const b = this.bag;
    b.dead = true;
    const [cx, cy] = b.center();
    const gm = St.goldMul() * b.def.gold * (b.golden ? 10 : 1) * (this.fever > 0 ? 2 : 1);
    const g = St.killGold(b.max) * gm;
    this.addGold(g);
    S.stats.breaks++;
    S.codex[b.def.id] = (S.codex[b.def.id] ?? 0) + 1;
    this.debris(b, cx, cy);
    for (let i = 0; i < 12 + (b.boss ? 14 : 0); i++) this.coin(cx, cy);
    this.hitstop(b.boss ? 0.2 : 0.11);
    this.shake(b.boss ? 6 : 3, 0.35);
    this.flash(WHITE, b.boss ? 0.8 : 0.45);
    sfx.shatter(b.mat as Mat);
    haptic(b.boss ? 60 : 25);
    this.floater(cx, cy - 18, "+" + short(g), GOLD_C[3], INK, 1.2, 1.1);
    if (b.boss || b.elite) {
      this.slow = 0.7;
      S.stats.bosses++;
      const first = !S.seen["boss" + S.stage];
      S.seen["boss" + S.stage] = true;
      const stones = b.boss ? 3 : 1;
      S.stones += stones;
      let gems = 0;
      if (first) gems = Math.round((b.boss ? 15 : 5) * St.gemMul());
      S.gems += gems;
      this.callout(b.boss ? "보스 격파!" : "정예 격파!", this.W / 2, this.H * 0.26, hex("#fff8c0"), hex("#ffb020"), 2, 2);
      this.floater(cx, cy - 30, `강화석 +${stones}${gems ? `  보석 +${gems}` : ""}`, hex("#c8f0ff"), INK, 1, 1.6);
      for (let i = 0; i < Math.min(8, gems); i++) this.coin(cx, cy, true);
      sfx.victory();
    }
    // 꽂힌 무기들은 떨어진다
    for (const s of b.stuck) {
      const [x, y] = b.toWorld(s.lx, s.ly), w = WEAPON[s.wid];
      if (w) this.loose.push({ x, y, vx: this.R.range(-60, 60), vy: -this.R.range(60, 160), a: s.ang + b.th, va: this.R.range(-10, 10), w, arrow: s.kind === "arrow", life: 1.6 });
    }
    b.stuck.length = 0;
    // 상자
    if (!this.chest && this.R.chance(0.035 + St.luck() + (b.boss ? 0.5 : 0))) this.chest = { x: cx + this.R.range(-30, 30), y: cy, vy: -120, t: 0, open: 0 };
    // 다음 스테이지
    if (!S.bossFail || b.boss || b.elite) {
      if (b.boss || b.elite) S.bossFail = false;
      S.stage++;
      if (S.stage > S.maxStage) S.maxStage = S.stage;
      if (S.stage > S.best) S.best = S.stage;
      S.stats.maxStage = Math.max(S.stats.maxStage, S.maxStage);
    }
    this.bossT = 0;
    this.respawn = 0.55;
    emit("stage");
  }

  /** 보스 시간 초과 */
  bossFailed() {
    S.bossFail = true;
    S.stage = Math.max(1, S.stage - 1);
    this.callout("시간 초과…", this.W / 2, this.H * 0.3, hex("#ffffff"), hex("#8090b0"), 2, 1.8);
    sfx.fail();
    // 보스가 위로 끌려 올라간다
    this.bag.dead = true;
    this.respawn = 0.4;
    this.bossT = 0;
    emit("stage");
  }
  retryBoss() {
    if (!S.bossFail) return;
    S.bossFail = false;
    S.stage++;
    this.bag.dead = true;
    this.respawn = 0.05;
    emit("stage");
  }

  // ---------------------------------------------------------------- 타격
  hit(o: HitOpts): { dmg: number; crit: boolean } {
    const b = this.bag;
    if (!b || b.dead || b.entering) return { dmg: 0, crit: false };
    const w = o.weapon ?? St.equipped();
    const elem = o.elem ?? (o.src === "crew" ? "none" : w.elem);
    const player = (o.src ?? "player") === "player";
    let dmg = o.amount ?? St.weaponDmg(w) * St.dmgMul() * MODES[w.mode].k * (o.k ?? 1);
    if (b.def.weak === elem && elem !== "none") dmg *= 2;
    if (b.def.resist === elem && elem !== "none") dmg *= 0.5;
    if (elem === "arcane") dmg *= 1.2;
    if (this.fever > 0 && o.src !== "dot") dmg *= 3;
    if (b.frozen > 0 && (w.sp?.shatter || o.kind === "slam") && player) dmg *= 2;
    let crit = !!o.crit;
    if (!crit && o.src !== "dot") {
      let ch = St.critChance(w) + (o.critAdd ?? 0);
      if (b.frozen > 0 && w.sp?.frostCrit) ch += w.sp.frostCrit;
      if (o.src === "crew") ch = 0.05;
      crit = this.R.chance(ch);
    }
    if (crit) dmg *= St.critDmg(w);
    const before = b.hp;
    b.hp -= dmg;
    const dealt = Math.min(before, dmg);
    S.stats.dmg += dmg;
    // 골드
    const gold = dealt * St.goldPerDmg() * St.goldMul() * b.def.gold * (b.golden ? 10 : 1) * (this.fever > 0 ? 2 : 1);
    this.addGold(gold);
    const dir = o.dir ?? [b.center()[0] < o.x ? -1 : 1, 0];
    const pw = o.power ?? 1;
    // 속성 부가효과
    if (o.src !== "dot") this.applyElem(elem, dmg, o.x, o.y);
    // 연출
    if (o.src !== "dot") {
      const E = ELEM[elem];
      b.impact(o.x, o.y, dir[0], dir[1], o.src === "crew" ? pw * 0.4 : pw, elem === "none" ? WHITE : hex(E.ramp[6]));
      if (!o.noFx) this.hitFx(o.kind, o.x, o.y, dir, pw, elem);
      if (crit && player) {
        this.spawn(critFx, { x: o.x, y: o.y, size: 0.6 + pw * 0.3 }, 2);
        S.stats.crits++;
      }
      if (player) {
        S.stats.hits++;
        this.combo++;
        this.comboT = 1.4;
        this.idle = 0;
        this.lastHitT = this.t;
        if (this.fever <= 0) {
          this.feverT = Math.min(100, this.feverT + MODES[w.mode].fever * St.feverGain() * (o.k && o.k > 1 ? Math.min(2.5, o.k) : 1));
          if (this.feverT >= 100) this.startFever();
        }
        if (o.freeze) this.hitstop(o.freeze * (crit ? 1.4 : 1));
        if (o.shake) this.shake(o.shake * (crit ? 1.5 : 1), 0.12 + o.shake * 0.04);
        if (S.opts.haptic) haptic(Math.round(8 + pw * 8));
        if (!S.seen[w.mode]) { S.seen[w.mode] = true; this.hintT = 0; }
        if (Math.random() < 0.25 + pw * 0.1) this.coin(o.x, o.y);
        if (!o.quiet) this.hitSound(o.kind, pw, b.mat as Mat);
      }
    }
    if (S.opts.dmgText) {
      const E = ELEM[elem];
      const col = o.src === "dot" ? hex(E.ramp[4]) : o.src === "crew" ? hex("#c8c8d8") : crit ? hex("#ffd84a") : elem !== "none" ? hex(E.ramp[5]) : WHITE;
      const big = o.src === "crew" || o.src === "dot" ? 0 : crit ? 2 : pw >= 1.6 ? 1.5 : 1;
      this.floater(o.x + this.R.range(-6, 6), o.y - 8, short(dmg) + (crit ? "!" : ""), col, crit ? hex("#7a1010") : INK, big, crit ? 0.9 : 0.7);
    }
    if (o.label) this.callout(o.label, o.x, o.y - 30, WHITE, hex(ELEM[elem].ramp[4]), 1, 0.9);
    if (b.hp <= 0) this.breakBag();
    emit("hit");
    return { dmg, crit };
  }

  applyElem(e: Elem, dmg: number, x: number, y: number) {
    const b = this.bag;
    switch (e) {
      case "fire": b.burn = 3; b.burnDps = Math.max(b.burnDps * (b.burn > 0 ? 1 : 0), dmg * 0.18); break;
      case "ice":
        b.frost += 1;
        if (b.frost >= 7 && b.frozen <= 0) {
          b.frozen = 2.6; b.frost = 0;
          sfx.freeze();
          this.callout("빙결!", x, y - 24, WHITE, hex("#7ccaf4"), 1, 0.9);
        }
        break;
      case "volt":
        if (this.R.chance(0.22)) {
          b.shock = 0.35;
          const [cx, cy] = b.center();
          this.spawn(thunderFx, { x: cx + this.R.range(-8, 8), y: cy + this.R.range(-14, 14), height: 60, seed: this.R.int(1, 999) }, 2);
          sfx.zap();
          this.queue.push({ t: 0.08, f: () => this.hit({ x: cx, y: cy, amount: dmg * 0.5, kind: "dot", src: "dot", elem: "volt" }) });
        }
        break;
      case "poison": b.poison = Math.min(10, b.poison + 1); b.poisonDps = Math.max(b.poisonDps, dmg * 0.06); break;
      case "holy":
        this.holyN = (this.holyN + 1) % 9;
        if (this.holyN === 0) {
          const [cx, cy] = b.center();
          this.spawn(beamFx, { x: cx, y: cy + b.geo.H * 0.45, height: cy + 40, width: 12 }, 2);
          this.queue.push({ t: 0.12, f: () => this.hit({ x: cx, y: cy, amount: dmg * 3, kind: "dot", src: "dot", elem: "holy", label: "심판!" }) });
          b.holy = 0.6;
        }
        break;
      case "shadow": b.curse = 1.5; break;
    }
  }
  holyN = 0;
  queue: { t: number; f: () => void }[] = [];

  hitFx(kind: HitKind, x: number, y: number, dir: [number, number], pw: number, elem: Elem) {
    const E = ELEM[elem], ang = Math.atan2(dir[1], dir[0]);
    const base = { x, y, palette: E.ramp, sparks: E.sparks, seed: this.R.int(1, 9999) };
    switch (kind) {
      case "punch": case "flail": this.spawn(punchFx, { ...base, size: 0.5 + pw * 0.45, angle: ang }, 2); break;
      case "bullet": case "arrow": case "stab": this.spawn(sparkFx, { ...base, size: 0.6 + pw * 0.4, angle: ang }, 2); break;
      case "slam": this.spawn(slamFx, { ...base, size: 0.5 + pw * 0.35, floor: this.floorY - y }, 2); break;
      case "magic": this.spawn(popFx, { ...base, size: 0.7 + pw * 0.4 }, 2); break;
      case "crew": this.spawn(sparkFx, { ...base, size: 0.5, angle: ang }, 2); break;
      default: break;
    }
  }

  hitSound(kind: HitKind, pw: number, m: Mat) {
    switch (kind) {
      case "punch": sfx.punch(pw, m); break;
      case "slash": sfx.slash(pw, m); break;
      case "bullet": sfx.thunk(0, m); break;
      case "slam": sfx.slam(pw, m); break;
      case "pierce": case "stab": sfx.stab(pw, m); break;
      case "arrow": sfx.thunk(pw > 1.5 ? 1 : 0, m); break;
      case "flail": sfx.clank(pw, m); break;
      case "blast": sfx.boom(pw); break;
      case "thunder": sfx.zap(); break;
      default: sfx.punch(pw * 0.6, m);
    }
  }

  startFever() {
    this.fever = St.feverTime();
    this.feverT = 100;
    S.stats.fevers++;
    sfx.fever();
    this.callout("피버 타임!", this.W / 2, this.H * 0.25, hex("#fff8c0"), hex("#ff5030"), 2, 1.6);
    this.flash(hex("#ffb040"), 0.6);
    music(REGIONS[this.region].music, true);
    emit("fever");
  }

  addGold(g: number) {
    S.gold += g;
    S.stats.gold += g;
  }

  // ---------------------------------------------------------------- 연출 유틸
  spawn(mod: unknown, o: Record<string, unknown>, layer = 2) {
    if (this.fx.length > 60) this.fx.shift();
    this.fx.push({ fx: createFx(mod, o), layer });
  }
  hitstop(s: number) { this.freeze = Math.max(this.freeze, s); }
  shake(a: number, t: number) { const k = S.opts.shake; if (k <= 0) return; this.shakeA = Math.max(this.shakeA, a * k); this.shakeT = Math.max(this.shakeT, t); }
  flash(c: Color, a: number) { this.flashC = c; this.flashA = Math.max(this.flashA, a); }
  floater(x: number, y: number, s: string, c: Color, o: Color, big: number, life: number) {
    if (this.floaters.length > 40) this.floaters.shift();
    this.floaters.push({ x, y, vy: -40 - big * 10, s, c, o, big, life, max: life });
  }
  callout(s: string, x: number, y: number, c1: Color, c2: Color, k = 1, life = 1.2) {
    this.callouts = this.callouts.filter((c) => !(k >= 2 && c.k >= 2));
    this.callouts.push({ s, x, y, c1, c2, k, t: 0, max: life });
  }
  coin(x: number, y: number, gem = false) {
    if (this.coins.length > 80) return;
    const a = -Math.PI / 2 + this.R.range(-1.2, 1.2), sp = this.R.range(80, 190);
    this.coins.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, gem, spin: this.R.range(0, 6) });
  }

  debris(b: Bag, x: number, y: number) {
    const R = this.R, C = b.R, n = C.length, f = this.floorY;
    // 몸통 조각
    for (let i = 0; i < 10 + (b.boss ? 8 : 0); i++)
      this.bits.add({ kind: B.CHUNK, x: x + R.range(-10, 10), y: y + R.range(-14, 14), vx: R.range(-180, 180), vy: -R.range(80, 300), a: R.range(0, TAU), va: R.range(-15, 15), s: R.int(2, 4), c: C[R.int(2, n - 2)], ramp: C, g: 1, drag: 0.4, bounce: 0.3, life: R.range(1.2, 2.2) });
    const spray = (k: number, n2: number, col: Color | 0, size = 1, life = 1) => {
      for (let i = 0; i < n2; i++) {
        const a = R.range(0, TAU), sp = R.range(40, 220);
        this.ps.spawn(k, x + R.range(-8, 8), y + R.range(-12, 12), Math.cos(a) * sp, Math.sin(a) * sp - 60, R.range(0.6, 1.4) * life, col, size);
      }
    };
    const d = b.golden ? "gold" : b.def.debris;
    switch (d) {
      case "straw": spray(P.MOTE, 30, hex("#f4d070"), 0.9); spray(P.GRIT, 20, hex("#c89a40"), 1, 1.5); break;
      case "sand": case "powder": spray(P.GRIT, 50, hex("#d8b878"), 1, 1.6); spray(P.DUST, 10, hex("#b89868"), 5); break;
      case "wood": spray(P.GRIT, 20, C[3], 2, 1.5); break;
      case "leaf": case "spore": spray(P.FLAKE, 30, d === "leaf" ? hex("#6ab040") : hex("#f0d0e0"), 2, 2); spray(P.VAPOUR, 8, hex("#c0e0a0"), 5); break;
      case "goo": for (let i = 0; i < 20; i++) this.bits.add({ kind: B.DRIP, x, y, vx: R.range(-200, 200), vy: -R.range(60, 260), s: R.range(1.5, 3), c: C[4], ramp: C, g: 1, drag: 0.5, bounce: 0.1, life: R.range(1, 1.8) }); break;
      case "rock": case "bone": spray(P.GRIT, 30, C[3], 2, 1.4); spray(P.DUST, 8, C[4], 6); break;
      case "metal": case "gear": spray(P.SPARK, 30, 0, 1, 0.5); spray(P.GRIT, 20, C[4], 2, 1.5); break;
      case "ice": case "crystal": this.spawn(shardsFx, { x, y, palette: d === "ice" ? ELEM.ice.ramp : b.def.ramp, floor: f - y, size: 1.1 }, 2); break;
      case "snow": case "feather": spray(P.FLAKE, 40, WHITE, 2, 2.4); spray(P.VAPOUR, 10, hex("#e0ecff"), 6); break;
      case "lava": this.spawn(blastFx, { x, y, size: 0.9, floor: f - y }, 2); break;
      case "gold": for (let i = 0; i < 20; i++) this.coin(x, y); spray(P.STAR, 16, hex("#ffe066"), 2); break;
      case "ecto": case "void": spray(P.VAPOUR, 16, C[4], 7, 1.4); spray(P.STAR, 14, C[5], 1.5); break;
    }
    if (b.def.id === "keg") { this.spawn(blastFx, { x, y, size: 1.4, floor: f - y }, 2); sfx.boom(1.4); this.shake(7, 0.5); }
    // 흰 섬광 링
    this.spawn(punchFx, { x, y, size: 2.4, palette: ELEM.none.ramp }, 2);
  }

  // ---------------------------------------------------------------- 입력
  pointer(type: "down" | "move" | "up", x: number, y: number) {
    if (type === "down") {
      // 상자·고블린이 먼저
      if (this.chest && !this.chest.open && Math.hypot(x - this.chest.x, y - (this.chest.y - 6)) < 14) { this.openChest(); return; }
      if (this.goblin && !this.goblin.hit && Math.hypot(x - this.goblin.x, y - (this.floorY - 8)) < 16) { this.catchGoblin(); return; }
    }
    if (type === "down") this.ctl.down(x, y);
    else if (type === "move") this.ctl.move(x, y);
    else this.ctl.up(x, y);
  }

  openChest() {
    const c = this.chest!;
    c.open = 0.001;
    const R = this.R;
    const roll = R.next();
    sfx.gem();
    this.spawn(levelFx, { x: c.x, y: c.y }, 2);
    if (roll < 0.45) {
      const g = St.stageHp(S.stage) * 3 * St.goldMul();
      this.addGold(g);
      for (let i = 0; i < 16; i++) this.coin(c.x, c.y - 6);
      this.floater(c.x, c.y - 20, "+" + short(g), GOLD_C[3], INK, 1.2, 1.4);
    } else if (roll < 0.8) {
      const n = R.int(1, 3);
      S.stones += n;
      this.floater(c.x, c.y - 20, `강화석 +${n}`, hex("#c8f0ff"), INK, 1, 1.4);
    } else {
      const n = Math.round(R.int(3, 8) * St.gemMul());
      S.gems += n;
      for (let i = 0; i < n; i++) this.coin(c.x, c.y - 6, true);
      this.floater(c.x, c.y - 20, `보석 +${n}`, GEM_C[3], INK, 1, 1.4);
    }
    emit("gold");
  }

  catchGoblin() {
    const g = this.goblin!;
    g.hit = true;
    S.stats.goblins++;
    const n = Math.round(this.R.int(4, 9) * St.gemMul());
    S.gems += n;
    const gold = St.stageHp(S.stage) * 6 * St.goldMul();
    this.addGold(gold);
    for (let i = 0; i < n; i++) this.coin(g.x, this.floorY - 10, true);
    for (let i = 0; i < 12; i++) this.coin(g.x, this.floorY - 10);
    this.spawn(punchFx, { x: g.x, y: this.floorY - 8, size: 1.4, palette: ELEM.holy.ramp }, 2);
    this.floater(g.x, this.floorY - 30, `보석 +${n}`, GEM_C[3], INK, 1.3, 1.6);
    this.callout("고블린 포획!", this.W / 2, this.H * 0.3, WHITE, hex("#60e060"), 2, 1.4);
    sfx.goblin();
    sfx.punch(1.2);
    this.hitstop(0.08);
    this.shake(3, 0.2);
  }

  // ---------------------------------------------------------------- 갱신
  update(dtReal: number) {
    const dt0 = Math.min(0.05, dtReal);
    this.t += dt0;
    if (this.shakeT > 0) { this.shakeT -= dt0; if (this.shakeT <= 0) this.shakeA = 0; }
    this.flashA = Math.max(0, this.flashA - dt0 * 4);
    for (const c of this.callouts) c.t += dt0;
    this.callouts = this.callouts.filter((c) => c.t < c.max);
    this.hintT = Math.max(0, this.hintT - dt0 * (this.lastHitT > this.t - 3 ? 0 : 0.2));
    // 히트스톱: 세계는 멈추고, 연출(숫자·코인)과 입력만 흐른다
    if (this.freeze > 0) {
      this.freeze -= dt0;
      this.ctl.update(0, true);
      this.updateUi(dt0);
      return;
    }
    let dt = dt0;
    if (this.slow > 0) { this.slow -= dt0; dt *= 0.3; }
    for (let i = this.queue.length - 1; i >= 0; i--) if ((this.queue[i].t -= dt) <= 0) { const q = this.queue[i]; this.queue.splice(i, 1); q.f(); }
    const b = this.bag;
    b.update(dt);
    if (b.dead) {
      // 부서진 뒤 빈 사슬 → 새 샌드백
      this.respawn -= dt;
      if (this.respawn <= 0) this.spawnBag();
    }
    // 보스 타이머
    if (this.bossT > 0 && !b.dead && !b.entering) {
      this.bossT -= dt;
      if (this.bossT <= 0) this.bossFailed();
    }
    // 도트 피해 (화상·중독), 0.3초마다
    this.dotT -= dt;
    if (this.dotT <= 0) {
      this.dotT = 0.3;
      if (!b.dead && !b.entering) {
        const [cx, cy] = b.center();
        if (b.burn > 0 && b.burnDps > 0) this.hit({ x: cx + this.R.range(-10, 10), y: cy + this.R.range(-15, 10), amount: b.burnDps * 0.3, kind: "dot", src: "dot", elem: "fire" });
        if (b.poison > 0.5 && b.poisonDps > 0 && !b.dead) this.hit({ x: cx + this.R.range(-10, 10), y: cy + this.R.range(-15, 10), amount: b.poisonDps * Math.floor(b.poison) * 0.3, kind: "dot", src: "dot", elem: "poison" });
      }
    }
    if (b.burn <= 0) b.burnDps = 0;
    this.statusParticles(dt);
    // 유령 손
    const ph = St.tal("phantom");
    if (ph > 0 && !b.dead && !b.entering) {
      this.phantomT -= dt;
      if (this.phantomT <= 0) {
        this.phantomT = 1 / ph;
        const [cx, cy] = b.center();
        const x = cx + this.R.range(-10, 10), y = cy + this.R.range(-16, 16);
        this.hit({ x, y, k: 0.5 / MODES[St.equipped().mode].k, kind: "punch", power: 0.5, src: "crew", quiet: true });
      }
    }
    // 콤보·피버
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;
    this.idle += dt;
    if (this.fever > 0) {
      this.fever -= dt;
      this.feverT = Math.max(0, (this.fever / St.feverTime()) * 100);
      if (this.fever <= 0) { this.fever = 0; this.feverT = 0; music(REGIONS[this.region].music, false); emit("fever"); }
    } else if (this.idle > 3) this.feverT = Math.max(0, this.feverT - dt * 6);
    // 고블린
    this.goblinT -= dt;
    if (this.goblinT <= 0 && !this.goblin) {
      this.goblinT = this.R.range(80, 160);
      const dir = this.R.sign();
      this.goblin = { x: dir > 0 ? -12 : this.W + 12, dir, t: 0, hit: false };
      this.callout("보물 고블린이 나타났다!", this.W / 2, this.H * 0.34, WHITE, hex("#60e060"), 1, 1.6);
      sfx.goblin();
    }
    if (this.goblin) {
      const g = this.goblin;
      g.t += dt;
      if (g.hit) { if (g.t > 99) this.goblin = null; g.x += g.dir * 160 * dt; if (g.x < -30 || g.x > this.W + 30) this.goblin = null; }
      else {
        g.x += g.dir * 34 * dt;
        if ((g.dir > 0 && g.x > this.W + 14) || (g.dir < 0 && g.x < -14)) this.goblin = null;
      }
    }
    if (this.chest) {
      const c = this.chest;
      c.t += dt;
      c.vy += 600 * dt;
      c.y += c.vy * dt;
      if (c.y > this.floorY) { c.y = this.floorY; c.vy = c.vy > 120 ? -c.vy * 0.3 : 0; }
      if (c.open > 0) { c.open += dt; if (c.open > 1.2) this.chest = null; }
      else if (c.t > 14) this.chest = null;
    }
    // 이펙트·입자
    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].fx.update(dt);
      if (this.fx[i].fx.done()) this.fx.splice(i, 1);
    }
    this.ps.update(dt);
    this.bits.update(dt);
    for (let i = this.loose.length - 1; i >= 0; i--) {
      const l = this.loose[i];
      l.vy += 700 * dt;
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.a += l.va * dt;
      if (l.y > this.floorY - 2) {
        l.y = this.floorY - 2;
        if (l.vy > 80) { l.vy = -l.vy * 0.3; l.vx *= 0.6; l.va *= 0.5; if (!l.bounced) { l.bounced = true; sfx.clatter(); } }
        else { l.vy = 0; l.vx *= 0.8; l.va *= 0.7; }
      }
      if ((l.life -= dt) <= 0) this.loose.splice(i, 1);
    }
    this.crew.update(dt, this);
    this.ctl.update(dt, false);
    this.updateUi(dt0);
  }

  updateUi(dt: number) {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.y += f.vy * dt;
      f.vy *= Math.pow(0.04, dt);
      if ((f.life -= dt) <= 0) this.floaters.splice(i, 1);
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.t += dt;
      c.spin += dt * 12;
      if (c.t < 0.45) {
        c.vy += 600 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > this.floorY - 2) { c.y = this.floorY - 2; c.vy = -Math.abs(c.vy) * 0.45; c.vx *= 0.7; }
      } else {
        // 지갑으로 날아간다
        const [tx, ty] = c.gem ? this.gemTarget : this.coinTarget, dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
        const sp = 120 + (c.t - 0.45) * 900;
        if (d < sp * dt + 3) { this.coins.splice(i, 1); sfx.coin(this.combo); emit("coin"); continue; }
        c.x += (dx / d) * sp * dt;
        c.y += (dy / d) * sp * dt;
      }
    }
  }

  statusParticles(dt: number) {
    const b = this.bag;
    if (b.dead || b.entering) return;
    const R = this.R;
    const rp = (): [number, number] => {
      for (let i = 0; i < 8; i++) {
        const lx = R.range(-b.geo.W / 2, b.geo.W / 2), ly = R.range(4, b.geo.H);
        if (b.dist(lx, ly) < -1) return b.toWorld(lx, ly);
      }
      return b.center();
    };
    const rate = (r: number) => R.chance(r * dt * 60);
    if (b.burn > 0 && rate(0.45)) { const [x, y] = rp(); this.ps.spawn(P.FIRE, x, y, R.range(-10, 10), -R.range(20, 50), R.range(0.3, 0.6), 0, R.range(1.5, 3), 0, R.chance(0.3) ? PF.SMOKES : 0); }
    if (b.poison > 0.5 && rate(0.12 * Math.min(4, b.poison))) { const [x, y] = rp(); this.ps.spawn(P.VAPOUR, x, y, R.range(-6, 6), -R.range(10, 30), R.range(0.4, 0.8), hex("#8ad040"), R.range(1.5, 3)); }
    if (b.frost > 0 && rate(0.08 * b.frost)) { const [x, y] = rp(); this.ps.spawn(P.FLAKE, x, y, R.range(-10, 10), R.range(-10, 10), R.range(0.5, 1), hex("#c8f0ff"), 1); }
    if (b.shock > 0 && rate(0.8)) { const [x, y] = rp(); this.ps.spawn(P.SPARK, x, y, R.range(-120, 120), R.range(-120, 60), 0.15, 0, 1); }
    if (b.curse > 0 && rate(0.3)) { const [x, y] = rp(); this.ps.spawn(P.VAPOUR, x, y, 0, -R.range(10, 30), R.range(0.4, 0.8), hex("#6a2a9a"), R.range(2, 4)); }
    if (b.golden && rate(0.25)) { const [x, y] = rp(); this.ps.spawn(P.STAR, x, y, 0, -10, R.range(0.4, 0.8), hex("#fff0a0"), R.chance(0.3) ? 2 : 0.6); }
  }

  // ---------------------------------------------------------------- 그리기
  render() {
    const v = this.view, f = v.frame;
    clearFrame(f);
    const p = painterFor(f);
    drawAmbient(p, REGIONS[this.region], this.W, this.H, this.floorY, this.t, false);
    p.reset();
    // 샌드백 그림자
    const b = this.bag;
    if (b && !b.dead) {
      const [cx] = b.center(), w = b.geo.W * 0.7 * (1 - Math.max(0, -b.drop) / 200);
      if (w > 2) for (let y = -2; y <= 2; y++) for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) if ((x / w) ** 2 + (y / 2.6) ** 2 < 1) p.blend(cx + x, this.floorY + 1 + y, INK, 0.4);
    }
    for (const x of this.fx) x.fx.draw(f, "back");
    p.reset();
    this.ps.draw(p, "back");
    this.crew.draw(p, this, false);
    drawBeam(p, REGIONS[this.region], this.W, b ? b.ay : 14);
    p.reset();
    if (b && (!b.dead || this.respawn > 0.5)) {
      if (!b.dead) b.draw(p, this.stuckDraw);
    }
    if (b && b.dead) {
      // 빈 사슬이 흔들린다
      p.place(b.ax, b.ay, false, Math.sin(this.t * 5) * 0.15 * this.respawn);
      for (let y = 0; y < b.L * 0.6; y += 4) p.rect(-1, y, 2, 3, hex("#50505e"));
    }
    p.reset();
    for (const l of this.loose) {
      p.place(l.x, l.y, false, l.a);
      p.fade = Math.min(1, l.life / 0.4);
      if (l.arrow) drawArrow(p, l.w, 16);
      else if (l.w.mode === "throw") drawThrown(p, l.w, this.t);
      else drawWeapon(p, l.w, this.t);
    }
    p.reset();
    this.drawBits(p);
    this.ps.draw(p, "front");
    this.crew.draw(p, this, true);
    p.reset();
    for (const x of this.fx) x.fx.draw(f, "front");
    p.reset();
    this.drawChestGoblin(p);
    p.reset();
    this.ctl.draw(p);
    p.reset();
    drawAmbient(p, REGIONS[this.region], this.W, this.H, this.floorY, this.t, true);
    if (this.fever > 0) this.drawFever(p);
    this.drawUiLayer(p);
    if (this.flashA > 0.02) {
      p.reset();
      p.shade(0, 0, this.W, this.H, (_x, _y, out) => { out.l = this.flashC; out.k = this.flashA * 0.6; return 0; });
    }
    const sh = this.shakeA * (this.shakeT > 0 ? 1 : 0);
    const sx = sh ? Math.round((Math.random() * 2 - 1) * sh) : 0, sy = sh ? Math.round((Math.random() * 2 - 1) * sh) : 0;
    v.present(sx, sy, "#000");
  }

  drawBits(p: Painter) {
    this.bits.draw(p);
  }

  /** 샌드백 로컬 좌표계(painter가 이미 놓여 있음)에 꽂힌 무기: 끝이 깊이만큼 박혀 보인다 */
  drawStuck(p: Painter, s: Stuck) {
    const w = WEAPON[s.wid];
    if (!w) return;
    const q = p as unknown as { tx: number; ty: number; cs: number; sn: number };
    const tx = q.tx, ty = q.ty, base = Math.atan2(q.sn, q.cs);
    const wx = p.toX(s.lx, s.ly), wy = p.toY(s.lx, s.ly), a = base + s.ang;
    // 무기 그림은 오른쪽 끝이 날 끝: 날 끝을 (깊이)만큼 안으로 밀어 넣는다
    const tip = s.kind === "arrow" ? 3 : w.art === "shuriken" ? 4 : w.art === "axe" ? 9 : w.art === "kunai" ? 10 : 12;
    const off = tip - s.depth;
    p.place(wx - Math.cos(a) * off, wy - Math.sin(a) * off, false, a);
    p.fade = Math.min(1, s.life / 0.4);
    if (s.kind === "arrow") drawArrow(p, w, 16);
    else drawThrown(p, w, this.t);
    p.fade = 1;
    p.place(tx, ty, false, base);
  }

  drawChestGoblin(p: Painter) {
    if (this.chest) {
      const c = this.chest, open = c.open > 0;
      const x = Math.round(c.x), y = Math.round(c.y), bob = !open && c.vy === 0 ? Math.round(Math.sin(this.t * 6)) : 0;
      p.fade = open ? Math.max(0, 1 - c.open / 1.2) : 1;
      const Wd = ramp(["#2a1606", "#5a3412", "#8a5420", "#b87a34"]);
      p.rect(x - 8, y - 10 + bob, 16, 10, INK);
      p.rect(x - 7, y - 9 + bob, 14, 8, Wd[2]);
      p.rect(x - 7, y - 9 + bob, 14, 1, Wd[3]);
      p.rect(x - 8, y - (open ? 18 : 14) + bob, 16, 5, INK);
      p.rect(x - 7, y - (open ? 17 : 13) + bob, 14, 3, Wd[3]);
      p.rect(x - 1, y - 11 + bob, 3, 4, GOLD_C[3]);
      p.glow(x, y - 8, 16, GOLD_C[3], open ? 0.8 : 0.25 + 0.15 * Math.sin(this.t * 5));
      if (!open && Math.sin(this.t * 3) > 0.6) htext(p, "열기!", x, y - 32 + bob, WHITE, GOLD_C[3], INK, 1, 1);
      p.fade = 1;
    }
    if (this.goblin) {
      const g = this.goblin, x = Math.round(g.x), y = this.floorY, step = Math.floor(this.t * 12) % 2;
      const flip = g.dir < 0;
      const rows = step
        ? ["...gg...", "..gggg..", ".gge eg.", ".gggggg.", "..gssg..", ".bbsssb.", "..bsss..", "..g..g..", ".g....g."]
        : ["...gg...", "..gggg..", ".gge eg.", ".gggggg.", "..gssg..", ".bbsssb.", "..bsss..", "...gg...", "...gg..."];
      p.sprite(rows, { g: "#4ab84a", e: "#fff060", s: "#8a5a2a", b: "#c89048" }, x - 4, y - 9 - (step ? 1 : 0), { flip });
      // 등에 진 보물 자루
      p.circle(x + (flip ? 4 : -4), y - 8, 4, hex("#a07840"));
      p.px(x + (flip ? 4 : -4), y - 11, GOLD_C[4]);
      p.glow(x, y - 6, 14, GOLD_C[3], 0.3);
      if (!g.hit && Math.sin(this.t * 8) > 0) htext(p, "잡아라!", x, y - 28, WHITE, hex("#60e060"), INK, 1, 1);
    }
  }

  drawFever(p: Painter) {
    // 화면 가장자리에서 일렁이는 불꽃
    const t = this.t, W = this.W, H = this.H, F = ramp(["#8a1f17", "#f2561d", "#ffae35", "#ffe27a"]);
    p.shade(0, 0, W, H, (x, y, out) => {
      const e = Math.min(x, W - x, y, H - y);
      if (e > 14) return;
      const n = Math.sin(x * 0.31 + t * 9) * Math.sin(y * 0.27 - t * 7) * 3 + Math.sin((x + y) * 0.13 + t * 5) * 2;
      const v = e + n;
      if (v > 9) { out.l = F[1]; out.k = 0.12 * (1 - e / 14); return 0; }
      out.l = F[2]; out.k = 0.25;
      return v < 3 ? F[3] : v < 6 ? F[2] : F[1];
    });
  }

  drawUiLayer(p: Painter) {
    p.reset();
    for (const c of this.coins) {
      const w = Math.abs(Math.cos(c.spin)) * 2.5 + 0.5;
      const C = c.gem ? GEM_C : GOLD_C;
      p.ellipse(c.x, c.y, w + 0.8, 3.3, INK);
      p.ellipse(c.x, c.y, w, 2.5, C[3]);
      if (w > 1.5) p.px(c.x - 1, c.y - 1, C[4]);
      p.glow(c.x, c.y, 5, C[3], 0.3);
    }
    for (const f of this.floaters) {
      const age = 1 - f.life / f.max, a = f.life < 0.2 ? f.life / 0.2 : 1;
      if (/[가-힣]/.test(f.s)) { htext(p, f.s, f.x, f.y, f.c, scale(f.c, 0.75), f.o, 1, a); continue; }
      const pop = f.big >= 2 ? (age < 0.12 ? 3 : 2) : f.big >= 1.5 ? (age < 0.1 ? 2 : 2) : 1;
      p.text(f.s, f.x, f.y, (_gx: number, gy: number) => (gy < 3 ? f.c : scale(f.c, 0.78)), { font: "big", scale: pop, align: "center", outline: f.o, a });
    }
    for (const c of this.callouts) {
      const u = c.t / c.max, k = c.k, pop = u < 0.08 ? 1.4 : 1;
      const a = u > 0.8 ? (1 - u) / 0.2 : 1, y = c.y - u * 10;
      htext(p, c.s, c.x, y - (pop > 1 ? 3 : 0), c.c1, c.c2, INK, k, a);
    }
    // 콤보
    if (this.combo >= 5) {
      const s = `${this.combo} COMBO`, k = this.combo >= 50 ? 2 : 1;
      const c = this.combo >= 100 ? hex("#ff5050") : this.combo >= 30 ? hex("#ffb040") : hex("#ffffff");
      p.text(s, this.W - 6, Math.round(this.H * 0.36), c, { font: "big", scale: k, align: "right", outline: INK, a: Math.min(1, this.comboT * 2) });
    }
    // 처음 쓰는 무기의 조작 시범
    if (this.hintT > 0) this.ctl.hint?.(p, this.t, Math.min(1, this.hintT));
  }
}

export const G = new World();
export { GOLD_C, GEM_C, INK };
void mix;
