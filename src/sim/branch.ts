// 분점 하나의 생산 사슬 시뮬레이션:
// 납품(자동) → 지하 창고 → [운반: 사장 / 운반 매니저] → 라인 감자 통 → [조리: 사장 / 조리 매니저]
// → 1층 라인은 바로 카운터, 위층 라인은 트레이 → [덤웨이터: 직접 누르기 / 덤웨이터 매니저] → 카운터 → 손님

import { MENU } from "../data/menus";
import { DISTRICTS } from "../data/regions";
import * as E from "./econ";
import type { BranchState, GameState, LineState } from "./state";
import { bus } from "./bus";
import { bossAt } from "./boss";

/** 이 라인에서 지금 누가 조리하나: 배속 (0이면 아무도 없음) */
export function cookPower(s: GameState, b: BranchState, i: number) {
  const l = b.lines[i];
  let k = 0;
  if (l.manager !== null) k += 1;
  if (b.id === "b0" && bossAt(s, i)) k += l.manager !== null ? 0.5 : 1;
  if (k === 0 && b.staff) k = E.STAFF;
  return k;
}

/** 배치 시작: 라인 통의 감자를 쓴다 */
export function startBatch(s: GameState, b: BranchState, l: LineState) {
  if (l.cooking) return false;
  const m = MENU[l.menu];
  const cyc = E.lineCycle(s, b, l);
  const per = E.potatoesPer(s, m);
  let count = cyc.count;
  if (per > 0) {
    if (l.bin < per * 0.999) return false;
    const need = count * per;
    if (l.bin < need) count = l.bin / per;
    l.bin -= count * per;
  }
  if (count <= 0) return false;
  l.batchOut = count;
  l.cooking = true;
  l.progress = 0;
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
  // 1) 납품 트럭: 지하 창고로 감자가 들어온다. 농장 몫은 공짜, 비축분 먼저, 나머지는 시세대로
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

  // 2) 운반: 지하 → 각 라인 감자 통 (가장 빈 통부터)
  const pr = E.porterRate(s, b) * dt;
  if (pr > 0 && b.storage > 0 && b.lines.length) {
    let left = Math.min(pr, b.storage);
    const order = b.lines.map((l, i) => i).sort((x, y) => b.lines[x].bin / E.binCap(s, b, b.lines[x]) - b.lines[y].bin / E.binCap(s, b, b.lines[y]));
    for (const i of order) {
      const l = b.lines[i];
      const room = E.binCap(s, b, l) - l.bin;
      const give = Math.min(room, left);
      if (give <= 0) continue;
      l.bin += give;
      b.storage -= give;
      left -= give;
    }
  }

  // 3) 주방 라인
  b.lines.forEach((l, i) => {
    const k = cookPower(s, b, i);
    if (!l.cooking && k > 0) startBatch(s, b, l);
    if (!l.cooking || k <= 0) return;
    const cyc = E.lineCycle(s, b, l);
    l.progress += (dt / cyc.time) * k;
    if (l.progress < 1) return;
    l.cooking = false;
    l.progress = 0;
    l.made += l.batchOut;
    let out = l.batchOut;
    const o = s.order;
    if (o && o.branch === b.id && o.menu === l.menu && o.got < o.need) {
      const give = Math.min(out, o.need - o.got);
      out -= give;
      o.got += give;
    }
    // 1층 주방은 카운터 바로 옆이라 바로 진열된다
    if (i === 0) b.stock[l.menu] = (b.stock[l.menu] ?? 0) + out;
    else l.tray += out;
    bus.emit("batch", { branch: b.id, line: i, count: l.batchOut });
    if (cookPower(s, b, i) > 0) startBatch(s, b, l);
  });

  // 4) 덤웨이터: 매니저가 있거나, 직접 눌렀을 때만 움직인다 (분점은 기본 직원이 느리게)
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
      if (b.id === s.branches[s.active]?.id) bus.emit("sfx", "arrive");
    }
  } else if ((lift.manager !== null || lift.call || b.staff) && trayTotal(b) > 0.0001) {
    loadLift(s, b);
    lift.moving = true;
    lift.t = 0;
    if (lift.call && b.id === s.branches[s.active]?.id) bus.emit("sfx", "lift");
  } else if (lift.call && trayTotal(b) <= 0.0001) {
    lift.call = false;
  }

  // 5) 카운터: 메뉴마다 손님이 따로 있다 (메뉴가 많을수록 손님도 많다)
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
  b._unmet = demand > 0 ? Math.max(0, want) / (demand * dt) : 0;
  b._demand = demand;
  if (earned > 0) {
    s.money += earned;
    s.earned += earned;
    s.earnedAll += earned;
    b.revenue += earned;
    b.sold += sold;
    b._salePulse = (b._salePulse ?? 0) + earned;
  }

  // 6) 별점: 손님을 놓치면 떨어지고, 잘 팔면 오른다 (가게가 막 열렸을 땐 천천히)
  const served = demand > 0 ? 1 - (b._unmet ?? 0) : 1;
  const target = 1.5 + 3.5 * served * Math.min(1, 1.25 / Math.max(0.5, b.priceMult) + 0.2);
  b.rating += (Math.max(1, Math.min(5, target)) - b.rating) * Math.min(1, dt * 0.008);

  // 7) 수입 평균 (오프라인 계산용)
  const inst = earned / Math.max(dt, 1e-6);
  b.income += (inst - b.income) * Math.min(1, dt * 0.05);
}

/** 이 분점이 사람 손 없이 굴러가는 비율 (오프라인 수익에 쓴다) */
export function automation(b: BranchState) {
  if (!b.lines.length) return 0;
  const st = b.staff ? E.STAFF : 0;
  const lines = b.lines.reduce((a, l) => a + (l.manager !== null ? 1 : st), 0) / b.lines.length;
  const porter = b.supply.manager !== null ? 1 : st;
  const lift = b.lines.length <= 1 ? 1 : b.lift.manager !== null ? 1 : st;
  return lines * Math.min(1, porter * 1.5) * lift;
}
