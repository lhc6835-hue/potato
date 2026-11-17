// 플레이어가 움직이는 사장. 본점(b0)에만 있다.
// 창고를 누르면 지하로 내려가 감자를 들고 주방 통에 붓고, 주방을 누르면 그 자리에서 조리한다.

import { MENU } from "../data/menus";
import * as E from "./econ";
import type { BranchState, GameState, LineState } from "./state";
import { bus } from "./bus";

/** 층 안의 위치 (실내 폭 0..1). 렌더러도 같은 값을 쓴다 */
export const SPOT = {
  stairs: 0.035,
  crates: 0.42,
  bin: 0.1,
  cook: 0.3,
  prep: 0.07,
};
const WALK = 0.6; // 초당 실내 폭 비율
const STAIR = 0.75; // 한 층 오르내리는 시간(초)

export const home = (s: GameState) => s.branches.find((b) => b.id === "b0") ?? s.branches[0];

/** 사장이 한 번에 들 수 있는 감자 */
export const bossCarry = (s: GameState, b: BranchState) => Math.floor(6 * Math.pow(E.power(b.supply.lv), 0.7));

export function bossAt(s: GameState, line: number) {
  const t = s.boss.task;
  return !!t && t.kind === "cook" && t.line === line && !s.boss.stair && s.boss.floor === line && Math.abs(s.boss.x - SPOT.cook) < 0.02;
}

/** 감자 가져오기: 가장 비어 있는 통(또는 지금 조리 중인 라인)으로 */
export function orderFetch(s: GameState) {
  const b = home(s);
  if (!b.lines.length) return false;
  const boss = s.boss;
  const cur = boss.task?.kind === "cook" ? boss.task.line : -1;
  let line = cur;
  if (line < 0 || b.lines[line].bin / E.binCap(s, b, b.lines[line]) > 0.6) {
    line = 0;
    let best = Infinity;
    b.lines.forEach((l, i) => {
      if (l.manager !== null && b.supply.manager !== null) return;
      const r = l.bin / E.binCap(s, b, l);
      if (r < best) {
        best = r;
        line = i;
      }
    });
  }
  // 이미 들고 있으면 바로 그 라인으로 간다
  boss.task = { kind: "fetch", line, picked: boss.carry > 0 };
  return true;
}

export function orderCook(s: GameState, line: number) {
  s.boss.task = { kind: "cook", line };
}

/** 목표 지점으로 한 틱만큼 이동. 도착하면 true */
function moveTo(s: GameState, floor: number, x: number, dt: number) {
  const boss = s.boss;
  if (boss.stair) {
    boss.stair.t += dt / (STAIR * Math.abs(boss.stair.to - boss.stair.from));
    if (boss.stair.t >= 1) {
      boss.floor = boss.stair.to;
      boss.x = SPOT.stairs;
      boss.stair = null;
    }
    return false;
  }
  const tx = boss.floor === floor ? x : SPOT.stairs;
  const dx = tx - boss.x;
  const step = WALK * dt;
  if (Math.abs(dx) > step) {
    boss.x += Math.sign(dx) * step;
    boss.facing = dx > 0 ? 1 : -1;
    return false;
  }
  boss.x = tx;
  if (boss.floor !== floor) {
    boss.stair = { from: boss.floor, to: floor, t: 0 };
    return false;
  }
  return true;
}

/** 사장이 들고 있는 감자를 라인 통에 붓는다 */
function dropInto(s: GameState, b: BranchState, l: LineState) {
  const room = Math.max(0, E.binCap(s, b, l) - l.bin);
  const put = Math.min(room, s.boss.carry);
  if (put > 0) {
    l.bin += put;
    s.boss.carry -= put;
    bus.emit("sfx", "drop");
  }
}

export function tickBoss(s: GameState, dt: number) {
  const boss = s.boss, b = home(s);
  if (!b) return;
  if (boss.wait > 0) {
    boss.wait -= dt;
    return;
  }
  const t = boss.task;
  if (!t) return;
  if (t.line >= b.lines.length) {
    boss.task = null;
    return;
  }
  if (t.kind === "fetch") {
    if (!t.picked) {
      if (moveTo(s, -1, SPOT.crates, dt)) {
        const take = Math.min(bossCarry(s, b) - boss.carry, Math.floor(b.storage));
        if (take <= 0 && boss.carry <= 0) {
          bus.emit("toast", "창고에 감자가 없다. 납품이 들어올 때까지 기다리자.");
          boss.task = null;
          return;
        }
        b.storage -= take;
        boss.carry += take;
        t.picked = true;
        boss.wait = 0.35;
        s.stats.fetches++;
        bus.emit("sfx", "pickup");
      }
    } else if (moveTo(s, t.line, SPOT.bin, dt)) {
      dropInto(s, b, b.lines[t.line]);
      boss.wait = 0.25;
      // 다 부었으면 그 자리에서 조리를 이어 한다
      boss.task = { kind: "cook", line: t.line };
    }
    return;
  }
  if (t.kind === "cook") {
    const l = b.lines[t.line];
    if (moveTo(s, t.line, SPOT.cook, dt)) {
      if (boss.carry > 0) dropInto(s, b, l);
      boss.facing = 1;
    } else if (boss.floor === t.line && !boss.stair && boss.carry > 0 && Math.abs(boss.x - SPOT.bin) < 0.03) {
      dropInto(s, b, l);
    }
  }
}

/** 사장이 이 라인에서 일하는 중이면 라인을 탭했을 때 진행을 당긴다 */
export function bossTap(s: GameState, line: number) {
  const b = home(s);
  const l = b.lines[line];
  s.stats.taps++;
  // 감자를 가지러 가는 중에는 연타해도 그 일을 취소하지 않는다 (가져온 뒤 그 주방에서 조리한다)
  if (s.boss.task?.kind === "fetch") return "fetch";
  // 감자가 빈 주방을 누르면: 운반 매니저가 없으면 사장이 감자부터 가지러 간다
  const per = E.potatoesPer(s, MENU[l.menu]);
  if (per > 0 && l.bin < per && !l.cooking && b.supply.manager === null && s.boss.carry <= 0) {
    s.boss.task = { kind: "fetch", line, picked: false };
    return "fetch";
  }
  if (!bossAt(s, line)) {
    orderCook(s, line);
    return "walk";
  }
  if (l.cooking) {
    l.progress = Math.min(1, l.progress + 0.12);
    return "boost";
  }
  if (l.bin < Math.min(1, E.potatoesPer(s, MENU[l.menu]))) return "empty";
  return "start";
}
