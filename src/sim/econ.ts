// 경제 공식. 생산량·비용·수요·배수 계산은 전부 여기서 한다.

import { MENU, type MenuDef } from "../data/menus";
import { DISTRICTS, regionById } from "../data/regions";
import { TRAIT, traitsOf, type SlotKind } from "../data/managers";
import { VARIETY } from "../data/varieties";
import type { BranchState, GameState, LineState } from "./state";

// ---------- 레벨 & 마일스톤

export const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000];
export const milestones = (lv: number) => {
  let n = 0;
  for (const m of MILESTONES) if (lv >= m) n++;
  return n;
};
export const nextMilestone = (lv: number) => MILESTONES.find((m) => m > lv) ?? Infinity;
/** 레벨의 힘: 레벨 × 2^(지난 마일스톤 수) */
export const power = (lv: number) => lv * Math.pow(2, milestones(lv));

/** n레벨 연속 구매 비용 (등비 합) */
export function bulkCost(base: number, r: number, lv: number, n: number) {
  return (base * Math.pow(r, lv - 1) * (Math.pow(r, n) - 1)) / (r - 1);
}
/** 돈으로 살 수 있는 최대 레벨 수 */
export function maxAffordable(base: number, r: number, lv: number, money: number, cap = 1000) {
  const first = base * Math.pow(r, lv - 1);
  if (money < first) return 0;
  const n = Math.floor(Math.log((money * (r - 1)) / first + 1) / Math.log(r));
  return Math.max(0, Math.min(cap, n));
}

// ---------- 전역 배수

export function patent(s: GameState, id: string) {
  return s.prestige.patents[id] ?? 0;
}

/** 업적 하나당 매출 +2% (복리) */
export const achievementMult = (s: GameState) => Math.pow(1.02, s.achievements.length);

export function eventMult(s: GameState, key: "price" | "traffic" | "speed" | "potato", branchId?: string) {
  let m = 1;
  for (const e of s.events) {
    if (e.branch && branchId && e.branch !== branchId) continue;
    const d = EVENT_EFFECTS[e.id];
    if (d && d[key]) m *= d[key]!;
  }
  return m;
}

/** 이벤트 효과표 (events.ts에서 쓰는 id와 같다) */
export const EVENT_EFFECTS: Record<string, Partial<Record<"price" | "traffic" | "speed" | "potato", number>>> = {
  influencer: { traffic: 4 },
  festival: { traffic: 2, price: 1.2 },
  shortage: { potato: 3 },
  harvest: { potato: 0.4 },
  rain: { traffic: 0.8 },
  rival: { traffic: 0.6 },
  overheat: { speed: 0.3 },
  inspection: { traffic: 0.5 },
  tv: { traffic: 2.5, price: 1.1 },
  sale: { traffic: 2.2, price: 0.7 },
};

export function globalPrice(s: GameState) {
  return achievementMult(s) * Math.pow(1.05, s.farm.lv) * Math.pow(1.1, patent(s, "price")) * (1 + s.prestige.golden * 0.02) * eventMult(s, "price");
}

export function globalSpeed(s: GameState) {
  return Math.pow(1.25, patent(s, "speed")) * eventMult(s, "speed");
}

export function varietyMult(s: GameState, m: MenuDef) {
  const v = VARIETY[s.farm.active];
  if (!v) return 1;
  let k = v.bonus.all ?? 1;
  if (v.bonus.cats && v.bonus.cats.includes(m.cat)) k *= v.bonus.mult ?? 1;
  return k;
}

// ---------- 분점

export const regionMult = (b: BranchState) => regionById(b.region).mult;
export const district = (b: BranchState) => DISTRICTS[b.district];
export const costMult = (b: BranchState) => regionMult(b) * district(b).rent;

/** 분점의 가장 비싼 메뉴 가격 (시설 비용 기준) */
export function topPrice(b: BranchState) {
  let p = 1000;
  for (const l of b.lines) p = Math.max(p, MENU[l.menu].price);
  return p;
}

// ---------- 매니저

export function managerOf(s: GameState, id: number | null) {
  if (id === null) return null;
  return s.managers.find((m) => m.data.id === id) ?? null;
}

/** 자리에 앉은 매니저의 배수 (speed/carry/serve/price) */
export function managerMult(s: GameState, id: number | null, slot: SlotKind, key: "speed" | "carry" | "serve" | "price", menu?: MenuDef) {
  const m = managerOf(s, id);
  if (!m) return 1;
  let k = key === "price" ? 1 : m.data.power;
  const h = hour(s.clock);
  for (const t of traitsOf(m.data)) {
    if (t.slot && t.slot !== slot) continue;
    const v = (t as any)[key] as number | undefined;
    if (v !== undefined && (!t.cat || (menu && menu.cat === t.cat))) k *= v;
    if (key !== "price") {
      if (t.rush && isRush(h)) k *= t.rush;
      if (t.night && isNight(h)) k *= t.night;
    }
  }
  return k;
}

// ---------- 라인

export const STATION_COST = [0.6, 1.0, 0.75];
export const STATION_GROW = 1.14;

export function stationPower(l: LineState) {
  return [power(l.lv[0]), power(l.lv[1]), power(l.lv[2])];
}
/** 병목 스테이션 인덱스 */
export function bottleneck(l: LineState) {
  const p = stationPower(l);
  let i = 0;
  if (p[1] < p[i]) i = 1;
  if (p[2] < p[i]) i = 2;
  return i;
}

export function lineSpeed(s: GameState, b: BranchState, l: LineState) {
  const m = MENU[l.menu];
  return Math.min(...stationPower(l)) * managerMult(s, l.manager, "line", "speed", m) * globalSpeed(s);
}

/** 한 배치 시간(초)과 개수 */
export function lineCycle(s: GameState, b: BranchState, l: LineState) {
  const m = MENU[l.menu];
  const sp = lineSpeed(s, b, l);
  const MIN = 0.7;
  const fast = Math.min(sp, m.cycle / MIN);
  return { time: m.cycle / fast, count: (m.batch * sp) / fast };
}

/** 초당 생산 개수 */
export function lineRate(s: GameState, b: BranchState, l: LineState) {
  const m = MENU[l.menu];
  return (m.batch * lineSpeed(s, b, l)) / m.cycle;
}

export function stationCostBase(b: BranchState, l: LineState, i: number) {
  return MENU[l.menu].price * 3 * STATION_COST[i] * costMult(b);
}
export function stationCost(b: BranchState, l: LineState, i: number, n = 1) {
  return bulkCost(stationCostBase(b, l, i), STATION_GROW, l.lv[i], n);
}

export function lineBuildCost(b: BranchState, menuId: string) {
  const m = MENU[menuId];
  if (menuId === "steamed" && b.id === "b0") return 0;
  return m.price * 40 * costMult(b);
}

/** 층(라인 슬롯) 증축 비용 */
export function floorCost(b: BranchState) {
  return topPrice(b) * 120 * Math.pow(6, b.maxLines - 3) * costMult(b);
}
export const MAX_FLOORS = 12;

// ---------- 덤웨이터

export const LIFT_GROW = 1.15;
export function liftCapacity(s: GameState, b: BranchState) {
  return 8 * power(b.lift.lv) * managerMult(s, b.lift.manager, "lift", "carry") * Math.pow(1.3, patent(s, "carry"));
}
/** 왕복 시간. 매니저가 없으면 두 배 느리다 (탭하면 한 번 빨라진다) */
export function liftTrip(b: BranchState) {
  return (1.6 + 0.35 * b.lines.length) * (b.lift.manager === null && !b.lift.call ? 2 : 1);
}
export function liftRate(s: GameState, b: BranchState) {
  return liftCapacity(s, b) / liftTrip(b);
}
export const liftCostBase = (b: BranchState) => topPrice(b) * 2.5 * costMult(b);
export const liftCost = (b: BranchState, n = 1) => bulkCost(liftCostBase(b), LIFT_GROW, b.lift.lv, n);

// ---------- 카운터 (홀)

export const COUNTER_GROW = 1.15;
/** 기본 손님 흐름에서의 초당 판매 처리량 */
export function counterCap(s: GameState, b: BranchState) {
  return 0.5 * power(b.counter.lv) * managerMult(s, b.counter.manager, "counter", "serve") * Math.pow(1.3, patent(s, "serve"));
}
export const counterCostBase = (b: BranchState) => topPrice(b) * 3 * costMult(b);
export const counterCost = (b: BranchState, n = 1) => bulkCost(counterCostBase(b), COUNTER_GROW, b.counter.lv, n);

// ---------- 창고 (감자 공급)

export const SUPPLY_GROW = 1.13;
export function supplyRate(s: GameState, b: BranchState) {
  return 4 * power(b.supply.lv);
}
export function storageCap(b: BranchState) {
  return 120 * power(b.supply.lv);
}
export const supplyCostBase = (b: BranchState) => topPrice(b) * 1.5 * costMult(b);
export const supplyCost = (b: BranchState, n = 1) => bulkCost(supplyCostBase(b), SUPPLY_GROW, b.supply.lv, n);

/** 농장이 공짜로 대 주는 감자 비율 */
export const farmShare = (s: GameState) => Math.min(0.9, s.farm.lv * 0.09);
export const farmCost = (s: GameState) => Math.max(1e14, idleIncome(s) * 60) * Math.pow(1.35, s.farm.lv);

/** 감자 한 개 값 */
export function potatoPrice(s: GameState, b: BranchState) {
  const rule = s.prestige.rules.includes("pricey") ? 2 : 1;
  return 60 * Math.sqrt(topPrice(b) / 1000) * s.market.price * rule * eventMult(s, "potato") * regionMult(b);
}

/** 감자 소모량 (품종 보너스 반영) */
export function potatoesPer(s: GameState, m: MenuDef) {
  const v = VARIETY[s.farm.active];
  return m.potatoes * (v?.bonus.potatoes ?? 1);
}

// ---------- 시간대

/** 게임 시계: 1시간 = 20초, 하루 = 8분 */
export const HOUR = 20;
export const hour = (clock: number) => (clock / HOUR) % 24;
export const day = (clock: number) => Math.floor(clock / HOUR / 24) + 1;
export const isLunch = (h: number) => h >= 11 && h < 13.5;
export const isDinner = (h: number) => h >= 18 && h < 20.5;
export const isRush = (h: number) => isLunch(h) || isDinner(h);
export const isNight = (h: number) => h >= 22 || h < 6;

/** 시간대별 손님 흐름 */
export function traffic(s: GameState, b: BranchState) {
  const h = hour(s.clock), d = district(b);
  const bumpAt = (c: number, w: number) => Math.max(0, 1 - Math.abs(h - c) / w);
  let t = 0.55;
  t += 0.75 * d.lunch * bumpAt(12.2, 1.6);
  t += 0.75 * d.dinner * bumpAt(19.2, 1.6);
  if (isNight(h)) t *= 0.35;
  else if (h < 8) t *= 0.6;
  const v = VARIETY[s.farm.active];
  const rival = 1 - s.rival.share / 200;
  return t * d.traffic * eventMult(s, "traffic", b.id) * (v?.bonus.traffic ?? 1) * rival;
}

/** 가격 배수에 따른 수요 배수 */
export function priceDemand(b: BranchState) {
  return Math.pow(b.priceMult, -1.4 * district(b).elastic);
}

/** 메뉴 하나의 실제 판매가 */
export function salePrice(s: GameState, b: BranchState, m: MenuDef) {
  const fame = 0.7 + b.rating * 0.1;
  const likes = district(b).likes.includes(m.cat) || regionById(b.region).likes?.includes(m.cat) ? 1.3 : 1;
  const rain = m.cat === "pan" && s.events.some((e) => e.id === "rain") ? 2 : 1;
  return m.price * regionMult(b) * district(b).price * b.priceMult * fame * likes * rain * globalPrice(s) * varietyMult(s, m) *
    managerMult(s, b.counter.manager, "counter", "price");
}

/** 분점 개설 비용: 지역 배수와 그 지역에 이미 있는 분점 수로 정해진다 */
export function branchCost(s: GameState, regionId: string, slot: number) {
  const r = regionById(regionId);
  const kind = r.slots[slot];
  if (s.branches.length === 0) return 0;
  const k = s.branches.filter((b) => b.region === regionId).length;
  return 3e11 * Math.pow(r.mult, 1.9) * Math.pow(5, k) * DISTRICTS[kind].rent * Math.pow(0.85, patent(s, "rent"));
}

/** 헤드헌팅 비용 */
export function hireCost(s: GameState) {
  // 초반엔 고정 곡선, 이후엔 '현재 수입 약 45초어치'로 맞춰서 언제나 손이 닿게
  return Math.max(4000 * Math.pow(s.hires + 1, 2), idleIncome(s) * 45 * (1 + s.hires * 0.04));
}
export const rerollCost = (s: GameState) => hireCost(s) * 0.1;

export function idleIncome(s: GameState) {
  return s.branches.reduce((a, b) => a + b.income, 0);
}

export { TRAIT };
