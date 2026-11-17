// 분점 하나의 생산 사슬 시뮬레이션: 창고 → 주방 라인 → 덤웨이터 → 카운터 → 손님.

import { MENU } from "../data/menus";
import { DISTRICTS } from "../data/regions";
import * as E from "./econ";
import type { BranchState, GameState, LineState } from "./state";
import { bus } from "./bus";

/** 라인이 직접(탭) 배치를 시작할 수 있는가 */
export function canStart(s: GameState, b: BranchState, l: LineState) {
  return !l.cooking && b.storage >= Math.min(1, E.potatoesPer(s, MENU[l.menu]));
}

/** 배치 시작: 감자를 꺼내 쓴다 */
export function startBatch(s: GameState, b: BranchState, l: LineState) {
  if (l.cooking) return false;
  const m = MENU[l.menu];
  const cyc = E.lineCycle(s, b, l);
  const per = E.potatoesPer(s, m);
  let count = cyc.count;
  if (per > 0) {
    const need = count * per;
    if (b.storage <= 0) return false;
    if (b.storage < need) count = b.storage / per;
    b.storage -= count * per;
  }
  if (count <= 0) return false;
  l.batchOut = count;
  l.cooking = true;
  l.progress = 0;
  return true;
}

export const PART_TIME = 0.35;
export const partTimers = (s: GameState) => Math.max(s.chapter, s.prestige.best) >= 3;

/** 직접 탭: 멈춰 있으면 시작, 조리 중이면 진행 가속 */
export function tapLine(s: GameState, b: BranchState, l: LineState) {
  s.stats.taps++;
  if (!l.cooking) return startBatch(s, b, l);
  l.progress = Math.min(1, l.progress + 0.15);
  return true;
}

export function callLift(b: BranchState) {
  b.lift.call = true;
}

const trayTotal = (b: BranchState) => b.lines.reduce((a, l) => a + l.tray, 0);

function loadLift(s: GameState, b: BranchState) {
  let cap = E.liftCapacity(s, b);
  const load: Record<string, number> = {};
  // 비싼 메뉴부터 싣는다
  const order = [...b.lines].sort((x, y) => MENU[y.menu].price - MENU[x.menu].price);
  for (const l of order) {
    if (cap <= 0) break;
    const take = Math.min(l.tray, cap);
    if (take <= 0) continue;
    l.tray -= take;
    cap -= take;
    load[l.menu] = (load[l.menu] ?? 0) + take;
  }
  b.lift.load = load;
}

export function tickBranch(s: GameState, b: BranchState, dt: number) {
  // 1) 감자 입고: 농장 몫은 공짜, 비축분(시장에서 사 둔 감자)을 먼저 쓰고, 나머지는 시세대로 산다
  const cap = E.storageCap(b);
  if (b.storage < cap) {
    let want = Math.min(cap - b.storage, E.supplyRate(s, b) * dt);
    const free = want * E.farmShare(s);
    b.storage += free;
    want -= free;
    if (s.market.bank > 0 && want > 0) {
      const use = Math.min(s.market.bank, want);
      s.market.bank -= use;
      b.storage += use;
      want -= use;
    }
    const price = E.potatoPrice(s, b);
    const afford = price > 0 ? Math.min(want, s.money / price) : want;
    if (afford > 0) {
      b.storage += afford;
      s.money -= afford * price;
    }
  }

  // 2) 주방 라인
  for (const l of b.lines) {
    if (!l.cooking && l.manager !== null) startBatch(s, b, l);
    // 챕터 3부터: 매니저 없는 라인은 알바생이 느리게 돌린다
    if (!l.cooking && l.manager === null && partTimers(s) && startBatch(s, b, l)) l.auto = true;
    if (l.cooking) {
      const cyc = E.lineCycle(s, b, l);
      l.progress += (dt / cyc.time) * (l.auto && l.manager === null ? PART_TIME : 1);
      if (l.progress >= 1) {
        l.tray += l.batchOut;
        l.made += l.batchOut;
        l.cooking = false;
        l.auto = false;
        l.progress = 0;
        bus.emit("batch", { branch: b.id, line: b.lines.indexOf(l), count: l.batchOut });
        const o = s.order;
        if (o && o.branch === b.id && o.menu === l.menu && o.got < o.need) {
          const give = Math.min(l.tray, o.need - o.got);
          l.tray -= give;
          o.got += give;
        }
        // 매니저가 있으면 바로 다음 배치
        if (l.manager !== null) startBatch(s, b, l);
      }
    }
  }

  // 3) 덤웨이터
  const lift = b.lift;
  if (lift.moving) {
    lift.t += dt / E.liftTrip(b);
    if (lift.t >= 1) {
      for (const [k, v] of Object.entries(lift.load)) b.stock[k] = (b.stock[k] ?? 0) + v;
      lift.load = {};
      lift.moving = false;
      lift.t = 0;
      lift.call = false;
      s.stats.lifts++;
    }
  } else if (trayTotal(b) > 0.0001) {
    loadLift(s, b);
    lift.moving = true;
    lift.t = 0;
  }

  // 4) 카운터: 메뉴마다 손님이 따로 있다 (메뉴가 많을수록 손님도 많다)
  const base = E.counterCap(s, b) * E.traffic(s, b) * E.priceDemand(b);
  let earned = 0, sold = 0, demand = 0, want = 0;
  const d = DISTRICTS[b.district];
  for (const l of b.lines) {
    const m = MENU[l.menu];
    const dm = base * m.pop * (d.likes.includes(m.cat) ? 1.3 : 1) * dt;
    demand += dm;
    const have = b.stock[l.menu] ?? 0;
    const take = Math.min(have, dm);
    want += dm - take;
    if (take <= 0) continue;
    b.stock[l.menu] = have - take;
    sold += take;
    earned += take * E.salePrice(s, b, m);
    s.soldBy[l.menu] = (s.soldBy[l.menu] ?? 0) + take;
  }
  demand /= Math.max(dt, 1e-6);
  const unmet = Math.max(0, want);
  b._unmet = demand > 0 ? unmet / (demand * dt) : 0;
  b._demand = demand;
  if (earned > 0) {
    s.money += earned;
    s.earned += earned;
    s.earnedAll += earned;
    b.revenue += earned;
    b.sold += sold;
    b._salePulse = (b._salePulse ?? 0) + earned;
  }

  // 5) 별점: 손님을 놓치면 떨어지고, 잘 팔면 오른다
  const served = demand > 0 ? 1 - (b._unmet ?? 0) : 1;
  const target = 1.5 + 3.5 * served * Math.min(1, 1.25 / Math.max(0.5, b.priceMult) + 0.2);
  b.rating += (Math.max(1, Math.min(5, target)) - b.rating) * Math.min(1, dt * 0.015);

  // 6) 수입 평균 (오프라인 계산용)
  const inst = earned / Math.max(dt, 1e-6);
  b.income += (inst - b.income) * Math.min(1, dt * 0.05);
}

/** 이 분점이 사람 손 없이 굴러가는 비율 (오프라인 수익에 쓴다) */
export function automation(b: BranchState) {
  if (!b.lines.length) return 0;
  const lines = b.lines.filter((l) => l.manager !== null).length / b.lines.length;
  const lift = b.lift.manager !== null ? 1 : 0;
  return lines * lift;
}
