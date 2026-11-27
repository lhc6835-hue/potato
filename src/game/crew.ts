// 동료: 샌드백 양옆 바닥에 서서 자동으로 때린다. 근접은 달려들어 치고, 원거리는 투사체를 쏜다.
// 동작: 대기(숨쉬기) → 예비 동작(뒤로 젖힘) → 타격(앞으로 쭉) → 회복.
import { Painter, Color, hex, ramp, scale, P, PF, WHITE, clamp, ease } from "../vendor/pixelfx/core/index.js";
import { CREW, CrewDef } from "../data/crew";
import { ELEM } from "../data/elements";
import * as St from "./state";
import { S } from "./state";
import { sfx } from "../engine/audio";
import type { G as GT } from "./world";
import * as popFx from "../fx/magic/pop.js";
import * as blastFx from "../fx/boom/blast.js";
import * as levelFx from "../fx/hit/levelup.js";

type World = typeof GT;
const INK = hex("#0c0810");

interface Member { def: CrewDef; x: number; home: number; side: number; t: number; act: number; hitDone: boolean; dash: number }
interface Shot { x: number; y: number; vx: number; vy: number; t: number; kind: string; c: CrewDef; dmg: number; a: number }

export class Crew {
  list: Member[] = [];
  shots: Shot[] = [];

  layout(g: World) {
    const ids = CREW.filter((c) => (S.crew[c.id] ?? 0) > 0);
    const cx = g.W / 2, n = ids.length;
    const gap = Math.min(22, (g.W / 2 - 30) / Math.max(1, Math.ceil(n / 2)));
    this.list = ids.map((def, i) => {
      const side = i % 2 === 0 ? -1 : 1, slot = Math.floor(i / 2);
      const home = cx + side * (30 + slot * gap);
      const old = this.list.find((m) => m.def.id === def.id);
      return { def, x: old ? old.x : home, home, side, t: old ? old.t : -Math.random() * def.every, act: -1, hitDone: false, dash: 0 };
    });
  }

  joined(g: World, id: string) {
    this.layout(g);
    const m = this.list.find((q) => q.def.id === id);
    if (m) g.spawn(levelFx, { x: m.home, y: g.floorY }, 2);
  }

  update(dt: number, g: World) {
    const live = g.bag && !g.bag.dead && !g.bag.entering;
    const mul = St.crewMul();
    for (const m of this.list) {
      m.t += dt;
      if (m.act < 0 && m.t >= m.def.every && live) { m.act = 0; m.hitDone = false; m.t = 0; }
      if (m.act >= 0) {
        m.act += dt;
        const melee = m.def.kind === "melee", strikeAt = melee ? 0.2 : 0.16;
        if (!m.hitDone && m.act >= strikeAt) {
          m.hitDone = true;
          const lv = S.crew[m.def.id] ?? 0, dmg = St.crewDps(m.def, lv) * mul * m.def.every;
          if (melee) {
            if (live) {
              const [cx, cy] = g.bag.center();
              const x = cx - m.side * g.bag.geo.W * 0.35, y = cy + 8 + Math.random() * 10;
              g.hit({ x, y, amount: dmg, kind: "crew", power: 0.6, dir: [-m.side, 0], src: "crew", elem: m.def.elem });
              if (m.def.id === "paladin") g.spawn(popFx, { x, y, palette: ELEM.holy.ramp, size: 1 });
              sfx.punch(0.35, g.bag.mat as never);
            }
          } else {
            const [hx, hy] = this.hand(m, g), [tx, ty] = live ? g.bag.center() : [g.W / 2, g.H / 2];
            const d = Math.hypot(tx - hx, ty - hy) || 1, sp = m.def.kind === "magic" ? 180 : 320;
            const kind = m.def.look.weapon;
            this.shots.push({ x: hx, y: hy, vx: ((tx - hx) / d) * sp, vy: ((ty - hy) / d) * sp - (kind === "bow" ? 60 : 0), t: 0, kind, c: m.def, dmg, a: 0 });
            if (kind === "bow") sfx.twang(0.3); else sfx.spell("missile");
          }
        }
        if (m.act > (melee ? 0.55 : 0.45)) m.act = -1;
      }
      // 근접은 샌드백 앞까지 달려들었다가 돌아온다
      if (m.def.kind === "melee" && live) {
        const reach = g.bag.center()[0] - m.side * (g.bag.geo.W * 0.5 + 8);
        let target = m.home;
        if (m.act >= 0 && m.act < 0.4) target = reach;
        m.x += (target - m.x) * Math.min(1, dt * (m.act >= 0 && m.act < 0.2 ? 18 : 8));
      } else m.x += (m.home - m.x) * Math.min(1, dt * 6);
    }
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.t += dt;
      if (s.kind === "bow") s.vy += 300 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.a += dt * 20;
      if (s.kind === "staff" && Math.random() < 0.6) g.ps.spawn(P.FIRE, s.x, s.y, Math.random() * 20 - 10, -10, 0.25, 0, 1.6, 0, PF.SMOKES);
      if (s.kind === "orb" && Math.random() < 0.6) g.ps.spawn(P.VAPOUR, s.x, s.y, 0, -5, 0.3, hex("#7a3aa8"), 2);
      if (live && g.bag.hitTest(s.x, s.y, 2)) {
        g.hit({ x: s.x, y: s.y, amount: s.dmg, kind: "crew", power: 0.5, dir: [Math.sign(s.vx), 0], src: "crew", elem: s.c.elem, noFx: s.kind === "staff" || s.kind === "orb" });
        if (s.kind === "staff") g.spawn(blastFx, { x: s.x, y: s.y, size: 0.45, floor: 999 }, 2);
        if (s.kind === "orb") g.spawn(popFx, { x: s.x, y: s.y, size: 1, palette: ELEM.shadow.ramp }, 2);
        sfx.thunk(0, g.bag.mat as never);
        this.shots.splice(i, 1);
      } else if (s.t > 2) this.shots.splice(i, 1);
    }
  }

  hand(m: Member, g: World): [number, number] {
    return [m.x + (m.side < 0 ? 5 : -5), g.floorY - 10];
  }

  draw(p: Painter, g: World, front: boolean) {
    if (front) {
      p.reset();
      for (const s of this.shots) {
        if (s.kind === "bow") {
          const a = Math.atan2(s.vy, s.vx);
          p.line(s.x - Math.cos(a) * 7, s.y - Math.sin(a) * 7, s.x, s.y, hex("#c8a070"));
          p.px(s.x, s.y, WHITE);
        } else if (s.kind === "star") {
          const c = Math.cos(s.a) * 3, sn = Math.sin(s.a) * 3;
          p.line(s.x - c, s.y - sn, s.x + c, s.y + sn, hex("#c8c8d8"));
          p.line(s.x + sn, s.y - c, s.x - sn, s.y + c, hex("#c8c8d8"));
        } else if (s.kind === "staff") {
          p.circle(s.x, s.y, 2.5, hex("#ff8a2a"));
          p.px(s.x, s.y, hex("#fff0a0"));
          p.glow(s.x, s.y, 8, hex("#ff8a2a"), 0.6);
        } else {
          p.circle(s.x, s.y, 2.5, hex("#7a3aa8"));
          p.px(s.x, s.y, hex("#e0a8ff"));
          p.glow(s.x, s.y, 8, hex("#b060e0"), 0.6);
        }
      }
      return;
    }
    for (const m of this.list) drawCrewChar(p, m.def, m.x, g.floorY, m.side < 0 ? 1 : -1, m.act, m.t + m.home, S.crew[m.def.id] ?? 0);
  }
}

/** 동료 한 명 (12x20 정도). face = 1이면 오른쪽을 본다. act = 공격 진행 시간 (없으면 -1) */
export function drawCrewChar(p: Painter, d: CrewDef, x: number, y: number, face: number, act: number, t: number, lv = 1) {
  const C = ramp(d.look.cloth), skin = hex(d.look.skin), hair = hex(d.look.hair);
  const melee = d.kind === "melee";
  // 자세: 0 대기, 예비 동작 -1, 타격 +1
  let lean = 0, arm = 0;
  if (act >= 0) {
    const s = melee ? 0.2 : 0.16;
    if (act < s) { lean = -ease.outQuad(act / s); arm = -1; }
    else if (act < s + 0.12) { lean = 1; arm = 1; }
    else { lean = 1 - clamp((act - s - 0.12) / 0.2); arm = lean > 0.3 ? 1 : 0; }
  }
  const bob = act < 0 ? Math.round(Math.sin(t * 3) * 0.6) : 0;
  const X = Math.round(x + lean * 2 * face), Y = Math.round(y);
  p.reset();
  for (let i = -5; i <= 5; i++) p.blend(x + i, y + 1, INK, 0.35);
  // 다리
  const step = act >= 0 && melee && act < 0.4 ? Math.round(Math.sin(act * 40)) : 0;
  p.rect(X - 3, Y - 5, 2, 5, scale(C[0], 1.2));
  p.rect(X + 1, Y - 5 + step, 2, 5 - step, scale(C[0], 1.2));
  p.rect(X - 3, Y - 1, 3, 1, INK);
  p.rect(X + 1, Y - 1, 3, 1, INK);
  // 몸통
  const by = Y - 12 + bob;
  p.rect(X - 4, by - 1, 9, 9, INK);
  p.rect(X - 3, by, 7, 7, C[2]);
  p.rect(X - 3, by, 2, 7, C[3]);
  p.rect(X - 3, by + 5, 7, 1, C[1]);
  // 머리
  const hx = X + Math.round(lean * face), hy = by - 5;
  p.circle(hx + 0.5, hy, 5, INK);
  p.circle(hx + 0.5, hy, 4, skin);
  const hat = d.look.hat;
  if (hat !== "bald" && hat !== "mask" && hat !== "cowl") { p.rect(hx - 3, hy - 4, 8, 3, hair); p.px(hx + (face > 0 ? -3 : 4), hy - 1, hair); }
  // 눈
  p.px(hx + face * 1 + (face > 0 ? 1 : 0), hy, INK);
  p.px(hx + face * 3 + (face > 0 ? 1 : 0), hy, INK);
  switch (hat) {
    case "helm": p.rect(hx - 4, hy - 5, 10, 4, hex("#8a96a8")); p.rect(hx - 4, hy - 5, 10, 1, hex("#c8d0dc")); p.px(hx + 0.5, hy - 6, hex("#d04040")); break;
    case "hood": p.tri(hx - 5, hy - 1, hx + 0.5, hy - 9, hx + 6, hy - 1, C[2]); p.line(hx - 5, hy - 1, hx + 0.5, hy - 9, C[3]); p.px(hx + face * 4 + 0.5, hy - 1, skin); break;
    case "horns": p.rect(hx - 4, hy - 5, 10, 3, hex("#7a7a8a")); p.tri(hx - 5, hy - 4, hx - 7, hy - 9, hx - 3, hy - 5, hex("#e8dcc8")); p.tri(hx + 6, hy - 4, hx + 8, hy - 9, hx + 4, hy - 5, hex("#e8dcc8")); p.rect(hx - 3, hy + 2, 8, 4, hair); break;
    case "witch": p.tri(hx - 6, hy - 3, hx + 1 - face * 2, hy - 13, hx + 7, hy - 3, C[1]); p.rect(hx - 6, hy - 4, 13, 2, C[2]); p.px(hx, hy - 7, hex("#ffd040")); break;
    case "bald": p.rect(hx - 4, hy - 3, 9, 1, hex("#d02020")); p.px(hx - face * 4, hy - 2, hex("#d02020")); break;
    case "mask": p.circle(hx + 0.5, hy, 4, C[2]); p.rect(hx - 2 + face, hy - 1, 6, 2, skin); p.px(hx + face * 2 + 1, hy, INK); p.line(hx - face * 4, hy - 2, hx - face * 7, hy - 1 + Math.sin(t * 8), C[3]); break;
    case "halo": p.ring(hx + 0.5, hy - 7, 3.5, 1, hex("#ffe060")); p.glow(hx, hy - 7, 6, hex("#ffe060"), 0.4); break;
    case "cowl": p.circle(hx + 0.5, hy, 4.5, C[1]); p.rect(hx - 2 + face, hy - 1, 5, 3, hex("#140818")); p.px(hx + face * 2 + 1, hy, hex("#c060ff")); p.glow(hx + face * 2, hy, 4, hex("#c060ff"), 0.5); break;
  }
  // 팔과 무기
  const ax = X + face * (arm === 1 ? 6 : arm === -1 ? -3 : 3), ay = by + (arm === -1 ? -3 : arm === 1 ? 2 : 3);
  p.rect(ax - 1, ay - 1, 3, 3, INK);
  p.px(ax, ay, skin);
  const wcol: Record<string, Color> = { sword: hex("#d0d8e6"), axe: hex("#b0b8c8"), hammer: hex("#e0e0f0"), staff: hex("#8a5a2a"), bow: hex("#a0703a"), fist: skin, star: hex("#c8c8d8"), orb: hex("#7a3aa8") };
  const wc = wcol[d.look.weapon] ?? WHITE;
  const ang = arm === -1 ? -2.2 : arm === 1 ? -0.1 : -1.2;
  const dx = Math.cos(ang) * face, dy = Math.sin(ang);
  switch (d.look.weapon) {
    case "sword": p.line(ax, ay, ax + dx * 9, ay + dy * 9, wc); p.line(ax - dy * 2, ay + dx * 2 * face, ax + dy * 2, ay - dx * 2 * face, hex("#c8a040")); break;
    case "axe": p.line(ax, ay, ax + dx * 8, ay + dy * 8, hex("#8a5a2a")); p.rect(ax + dx * 8 - 2, ay + dy * 8 - 2, 4, 4, wc); break;
    case "hammer": p.line(ax, ay, ax + dx * 8, ay + dy * 8, hex("#c8a040")); p.rect(ax + dx * 8 - 2.5, ay + dy * 8 - 2.5, 5, 5, wc); p.glow(ax + dx * 8, ay + dy * 8, 6, hex("#ffe060"), 0.3); break;
    case "staff": p.line(ax, ay + 4, ax + face, ay - 8, wc); p.circle(ax + face, ay - 9, 1.8, hex("#ff8a2a")); p.glow(ax + face, ay - 9, 6, hex("#ff8a2a"), 0.5); break;
    case "orb": p.circle(ax + face * 2, ay - 2, 2, wc); p.glow(ax + face * 2, ay - 2, 6, hex("#b060e0"), 0.5); break;
    case "bow": p.arc(ax, ay, 5, 1, face > 0 ? -1.3 : Math.PI - 1.3 + 0.01, face > 0 ? 1.3 : Math.PI + 1.3, wc); break;
    case "star": if (arm !== 1) { p.px(ax + face, ay - 1, wc); p.px(ax + face, ay + 1, wc); } break;
    default: break;
  }
  // 강해지면 발밑이 빛난다 (25레벨 단위)
  if (lv >= 25) p.glow(x, y, 10, hex(lv >= 100 ? "#ff60c0" : lv >= 50 ? "#ffd040" : "#60c0ff"), 0.25);
}
