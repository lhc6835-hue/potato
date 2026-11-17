// 게임 전체 틱과 플레이어 행동. UI는 여기 있는 함수만 부른다.

import { MENU, MENUS } from "../data/menus";
import { regionById, REGIONS, newMarket, type RegionDef } from "../data/regions";
import { makeCandidate, type SlotKind } from "../data/managers";
import { CHAPTERS, LAST_CHAPTER, EXPO_STAGES, featureOn } from "../data/story";
import { EVENTS, EVENT } from "../data/events";
import { ACHIEVEMENTS } from "../data/achievements";
import { RECIPES, comboKey, failText, tryCost } from "../data/research";
import { VARIETIES, VARIETY } from "../data/varieties";
import { PATENT, patentCost, RULES } from "../data/patents";
import * as E from "./econ";
import { tickBranch, automation } from "./branch";
import { newBranch, newGame, newLine, type BranchState, type GameState } from "./state";
import { bus } from "./bus";

// ======================================================= 틱

let achTimer = 0;

export function tick(s: GameState, dt: number) {
  s.clock += dt;
  s.played += dt;
  for (const b of s.branches) tickBranch(s, b, dt);

  // 아이디어 (연구 포인트): 라인 수에 비례
  if (featureOn(s, "research")) {
    const lines = s.branches.reduce((a, b) => a + b.lines.length, 0);
    s.research.ideas += dt * 0.12 * lines * Math.pow(1.5, E.patent(s, "ideas"));
  }

  tickEvents(s, dt);
  tickOrder(s, dt);
  tickRival(s, dt);
  tickMarket(s, dt);

  const inc = E.idleIncome(s);
  if (inc > s.stats.maxIncome) s.stats.maxIncome = inc;

  achTimer -= dt;
  if (achTimer <= 0) {
    achTimer = 1;
    checkAchievements(s);
    checkGoals(s);
    unlockChapterMenus(s);
  }
}

// ======================================================= 챕터

export function chapterDef(s: GameState) {
  return CHAPTERS[Math.min(s.chapter, LAST_CHAPTER) - 1];
}

export function checkGoals(s: GameState) {
  if (s.chapter > LAST_CHAPTER) return;
  const c = chapterDef(s);
  for (const g of c.goals) {
    if (s.goals[g.id]) continue;
    const [a, b] = g.prog(s);
    if (a >= b) {
      s.goals[g.id] = true;
      bus.emit("goal", g);
    }
  }
}

export const chapterDone = (s: GameState) => s.chapter <= LAST_CHAPTER && chapterDef(s).goals.every((g) => s.goals[g.id]);

/** 챕터 클리어 → 다음 챕터. 보상은 현재 수입 n초어치 (최소 금액 보장) */
export function advanceChapter(s: GameState) {
  if (!chapterDone(s)) return false;
  const c = chapterDef(s);
  const reward = Math.max(E.idleIncome(s) * c.reward, 2000 * Math.pow(10, c.n));
  s.money += reward;
  if (c.n === LAST_CHAPTER) {
    s.ended = true;
  }
  s.chapter++;
  s.prestige.best = Math.max(s.prestige.best, s.chapter);
  if (s.chapter === 6 && s.rival.share === 0 && !s.rival.defeated) s.rival.share = 50;
  unlockChapterMenus(s);
  bus.emit("chapter", { n: s.chapter, reward });
  return reward;
}

function unlockChapterMenus(s: GameState) {
  for (const m of MENUS) {
    if (m.research || m.country) continue;
    if (m.chapter <= s.chapter && !s.menus.includes(m.id)) {
      s.menus.push(m.id);
      bus.emit("menu", m.id);
    }
  }
}

// ======================================================= 업적

function checkAchievements(s: GameState) {
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue;
    if (a.check(s)) {
      s.achievements.push(a.id);
      bus.emit("achievement", a);
    }
  }
}

// ======================================================= 업그레이드

export type Target = { kind: "station"; line: number; st: number } | { kind: "lift" } | { kind: "counter" } | { kind: "supply" };

function levelOf(b: BranchState, t: Target) {
  if (t.kind === "station") return b.lines[t.line].lv[t.st];
  if (t.kind === "lift") return b.lift.lv;
  if (t.kind === "counter") return b.counter.lv;
  return b.supply.lv;
}
function baseGrow(b: BranchState, t: Target): [number, number] {
  if (t.kind === "station") return [E.stationCostBase(b, b.lines[t.line], t.st), E.STATION_GROW];
  if (t.kind === "lift") return [E.liftCostBase(b), E.LIFT_GROW];
  if (t.kind === "counter") return [E.counterCostBase(b), E.COUNTER_GROW];
  return [E.supplyCostBase(b), E.SUPPLY_GROW];
}

/** 구매 모드(1, 10, 최대)에 맞는 [레벨 수, 비용] */
export function upgradeQuote(s: GameState, b: BranchState, t: Target): [number, number] {
  const [base, r] = baseGrow(b, t);
  const lv = levelOf(b, t);
  let n: number = s.settings.buyMode;
  if (n === 0) n = Math.max(1, E.maxAffordable(base, r, lv, s.money));
  return [n, E.bulkCost(base, r, lv, n)];
}

export function upgrade(s: GameState, b: BranchState, t: Target) {
  const [n, cost] = upgradeQuote(s, b, t);
  if (s.money < cost) return false;
  s.money -= cost;
  const before = levelOf(b, t);
  if (t.kind === "station") b.lines[t.line].lv[t.st] += n;
  else if (t.kind === "lift") b.lift.lv += n;
  else if (t.kind === "counter") b.counter.lv += n;
  else b.supply.lv += n;
  const after = levelOf(b, t);
  bus.emit("upgrade", { branch: b.id, target: t, milestone: E.milestones(after) > E.milestones(before) });
  return true;
}

/** 라인의 세 스테이션을 병목부터 고르게 올린다 (돈이 되는 만큼) */
export function upgradeLineEven(s: GameState, b: BranchState, line: number, budgetLevels = 1) {
  const l = b.lines[line];
  let bought = 0;
  for (let k = 0; k < budgetLevels * 3; k++) {
    const st = E.bottleneck(l);
    const cost = E.stationCost(b, l, st, 1);
    if (s.money < cost) break;
    s.money -= cost;
    l.lv[st]++;
    bought++;
  }
  if (bought) bus.emit("upgrade", { branch: b.id, target: { kind: "station", line, st: 0 }, milestone: false });
  return bought;
}

// ======================================================= 라인/층

export function buildableMenus(s: GameState, b: BranchState) {
  const nofry = s.prestige.rules.includes("nofry");
  return s.menus.filter((id) => !b.lines.some((l) => l.menu === id) && !(nofry && MENU[id].cat === "fried"));
}

export function buildLine(s: GameState, b: BranchState, menuId: string) {
  if (b.lines.length >= b.maxLines) return false;
  const cost = E.lineBuildCost(b, menuId);
  if (s.money < cost) return false;
  s.money -= cost;
  b.lines.push(newLine(menuId));
  bus.emit("build", { branch: b.id, menu: menuId });
  return true;
}

export function maxFloors(s: GameState) {
  return s.prestige.rules.includes("tiny") ? 3 : E.MAX_FLOORS;
}

export function addFloor(s: GameState, b: BranchState) {
  if (b.maxLines >= maxFloors(s)) return false;
  const cost = E.floorCost(b);
  if (s.money < cost) return false;
  s.money -= cost;
  b.maxLines++;
  bus.emit("floor", { branch: b.id });
  return true;
}

/** 라인 메뉴 교체: 레벨 절반 유지 */
export function swapLineMenu(s: GameState, b: BranchState, line: number, menuId: string) {
  const cost = E.lineBuildCost(b, menuId) * 0.5;
  if (s.money < cost) return false;
  s.money -= cost;
  const l = b.lines[line];
  l.menu = menuId;
  l.lv = l.lv.map((v) => Math.max(1, Math.floor(v / 2))) as [number, number, number];
  l.tray = 0;
  l.cooking = false;
  return true;
}

export function setPrice(b: BranchState, m: number) {
  b.priceMult = Math.round(Math.min(2, Math.max(0.6, m)) * 20) / 20;
}

// ======================================================= 매니저

export function ensureCandidates(s: GameState) {
  if (s.candidates.length === 3) return;
  const tier = s.chapter + s.prestige.reboots;
  s.candidates = [0, 1, 2].map((i) => makeCandidate(s.candSeed + i, tier));
}

export function hire(s: GameState, idx: number) {
  if (s.prestige.rules.includes("strike")) return false;
  ensureCandidates(s);
  const cost = E.hireCost(s);
  if (s.money < cost) return false;
  s.money -= cost;
  const data = s.candidates[idx];
  s.managers.push({ data, at: null });
  s.hires++;
  s.candSeed += 3;
  s.candidates = [];
  ensureCandidates(s);
  bus.emit("hire", data);
  return data;
}

export function reroll(s: GameState) {
  const cost = E.rerollCost(s);
  if (s.money < cost) return false;
  s.money -= cost;
  s.candSeed += 3;
  s.candidates = [];
  ensureCandidates(s);
  return true;
}

function clearSlot(s: GameState, id: number) {
  const m = s.managers.find((x) => x.data.id === id);
  if (!m || !m.at) return;
  const b = s.branches.find((x) => x.id === m.at!.branch);
  if (b) {
    if (m.at.slot === "line" && b.lines[m.at.line]?.manager === id) b.lines[m.at.line].manager = null;
    if (m.at.slot === "lift" && b.lift.manager === id) b.lift.manager = null;
    if (m.at.slot === "counter" && b.counter.manager === id) b.counter.manager = null;
  }
  m.at = null;
}

export function assign(s: GameState, managerId: number, b: BranchState, slot: SlotKind, line = 0) {
  // 자리에 있던 사람은 대기로
  const current = slot === "line" ? b.lines[line].manager : slot === "lift" ? b.lift.manager : b.counter.manager;
  if (current !== null) clearSlot(s, current);
  clearSlot(s, managerId);
  const m = s.managers.find((x) => x.data.id === managerId);
  if (!m) return;
  if (slot === "line") b.lines[line].manager = managerId;
  else if (slot === "lift") b.lift.manager = managerId;
  else b.counter.manager = managerId;
  m.at = { branch: b.id, slot, line };
}

export function unassign(s: GameState, managerId: number) {
  clearSlot(s, managerId);
}

/** 빈 자리에 대기 매니저를 자동 배치 (라인 → 덤웨이터 → 카운터) */
export function autoAssign(s: GameState, b: BranchState) {
  const free = () => s.managers.filter((m) => !m.at).sort((x, y) => y.data.power - x.data.power);
  b.lines.forEach((l, i) => {
    if (l.manager === null) {
      const f = free()[0];
      if (f) assign(s, f.data.id, b, "line", i);
    }
  });
  if (b.lift.manager === null && free()[0]) assign(s, free()[0].data.id, b, "lift");
  if (b.counter.manager === null && free()[0]) assign(s, free()[0].data.id, b, "counter");
}

// ======================================================= 연구

export type ResearchResult = { ok: true; menu: string } | { ok: false; text: string; early?: boolean; known?: boolean };

export function tryRecipe(s: GameState, method: string, top: string): ResearchResult | null {
  const cost = tryCost(s.research.tries);
  if (s.research.ideas < cost) return null;
  const r = RECIPES.find((x) => x.method === method && x.top === top);
  if (r && s.research.found.includes(r.menu)) return { ok: false, text: `이미 아는 레시피다. ${MENU[r.menu].name}.`, known: true };
  s.research.ideas -= cost;
  s.research.tries++;
  if (r) {
    const m = MENU[r.menu];
    if (r.variety && s.farm.active !== r.variety) {
      return { ok: false, text: "뭔가 될 것 같았다. 감자가 평범해서 안 됐다." };
    }
    if (m.chapter > s.chapter) return { ok: false, text: "맛은 있다. 그런데 손님들이 아직 이걸 받아들일 준비가 안 됐다.", early: true };
    s.research.found.push(r.menu);
    if (!s.menus.includes(r.menu)) s.menus.push(r.menu);
    bus.emit("discover", r.menu);
    return { ok: true, menu: r.menu };
  }
  const k = comboKey(method, top);
  if (!s.research.fails.includes(k)) s.research.fails.push(k);
  return { ok: false, text: failText(method, top) };
}

/** 힌트: 아직 못 찾은 레시피 중 지금 챕터에서 가능한 것 하나 */
export function nextHint(s: GameState) {
  return RECIPES.find((r) => !s.research.found.includes(r.menu) && MENU[r.menu].chapter <= s.chapter);
}
export const hintCost = (s: GameState) => 30 + s.research.found.length * 15;

// ======================================================= 분점

export function availableRegions(s: GameState): RegionDef[] {
  const list = REGIONS.filter((r) => {
    if (r.tier === 0) return true;
    if (r.tier === 1) return featureOn(s, "branches");
    if (r.tier === 2) return featureOn(s, "cities");
    return featureOn(s, "overseas") && r.chapter <= Math.max(s.chapter, s.prestige.best);
  });
  if (s.ended) for (let i = 0; i <= s.newMarkets; i++) list.push(newMarket(i));
  return list;
}

export function slotTaken(s: GameState, regionId: string, slot: number) {
  return s.branches.some((b) => b.region === regionId && b.slot === slot);
}

export function openBranch(s: GameState, regionId: string, slot: number) {
  if (slotTaken(s, regionId, slot)) return null;
  const r = regionById(regionId);
  const cost = E.branchCost(s, regionId, slot);
  if (s.money < cost) return null;
  s.money -= cost;
  const b = newBranch(`b${Date.now().toString(36)}${s.branches.length}`, regionId, slot, r.slots[slot], null);
  // 프랜차이즈 키트: 가장 좋은 메뉴 3개를 들고 시작, 레벨은 본점 평균의 일부
  const best = [...s.branches].sort((x, y) => y.revenue - x.revenue)[0];
  const avg = best && best.lines.length ? best.lines.reduce((a, l) => a + Math.min(...l.lv), 0) / best.lines.length : 1;
  const startLv = Math.max(1, Math.floor(avg * (0.3 + 0.1 * E.patent(s, "franchise"))));
  const menus = [...s.menus].filter((id) => !MENU[id].country).sort((x, y) => MENU[y].price - MENU[x].price).slice(0, 3);
  if (r.localMenu) {
    if (!s.menus.includes(r.localMenu)) s.menus.push(r.localMenu);
    menus.unshift(r.localMenu);
    menus.length = Math.min(menus.length, 3);
  }
  b.lines = menus.reverse().map((id) => newLine(id, startLv));
  b.lift.lv = b.counter.lv = b.supply.lv = Math.max(1, startLv);
  b.storage = E.storageCap(b) * 0.5;
  s.branches.push(b);
  if (regionId.startsWith("nm-")) {
    const n = parseInt(regionId.slice(3), 10);
    if (n >= s.newMarkets) s.newMarkets = n + 1;
    s.bestMarket = Math.max(s.bestMarket, s.newMarkets);
  }
  bus.emit("branch", b);
  return b;
}

// ======================================================= 이벤트

function tickEvents(s: GameState, dt: number) {
  for (const e of s.events) e.left -= dt;
  const ended = s.events.filter((e) => e.left <= 0);
  if (ended.length) {
    s.events = s.events.filter((e) => e.left > 0);
    for (const e of ended) bus.emit("eventEnd", e);
  }
  if (!featureOn(s, "events")) return;
  s.eventTimer -= dt;
  if (s.eventTimer > 0) return;
  s.eventTimer = 100 + Math.random() * 120;
  const luck = 1 + 0.2 * E.patent(s, "luck");
  const pool = EVENTS.filter((e) => e.chapter <= Math.max(s.chapter, s.prestige.best) && !s.events.some((x) => x.id === e.id));
  if (!pool.length) return;
  const W = pool.reduce((a, e) => a + e.weight * (e.good ? luck : 1), 0);
  let r = Math.random() * W;
  const def = pool.find((e) => (r -= e.weight * (e.good ? luck : 1)) <= 0) ?? pool[0];
  const branch = def.local ? s.branches[Math.floor(Math.random() * s.branches.length)].id : undefined;
  const ev = { id: def.id, left: def.dur, dur: def.dur, branch };
  s.events.push(ev);
  if (def.id === "rival") s.rival.share = Math.min(60, s.rival.share + 3);
  bus.emit("event", ev);
}

export function fixEvent(s: GameState, id: string) {
  const def = EVENT[id];
  if (!def?.fixable) return;
  const e = s.events.find((x) => x.id === id);
  if (!e) return;
  e.left -= Math.max(4, e.dur * 0.12);
  s.stats.taps++;
}

// ======================================================= 특별 주문

function tickOrder(s: GameState, dt: number) {
  if (!featureOn(s, "orders")) return;
  const o = s.order;
  if (o) {
    o.left -= dt;
    if (o.got >= o.need - 1e-6) {
      s.money += o.reward;
      s.stats.ordersDone++;
      s.rival.share = Math.max(0, s.rival.share - 7);
      bus.emit("orderDone", o);
      s.order = null;
      s.orderTimer = 120 + Math.random() * 100;
    } else if (o.left <= 0) {
      bus.emit("orderFail", o);
      s.order = null;
      s.orderTimer = 150 + Math.random() * 100;
    }
    return;
  }
  s.orderTimer -= dt;
  if (s.orderTimer > 0) return;
  const b = s.branches[s.active] ?? s.branches[0];
  if (!b.lines.length) return;
  const l = b.lines[Math.floor(Math.random() * b.lines.length)];
  const rate = E.lineRate(s, b, l);
  const need = Math.max(5, Math.ceil(rate * 35));
  const time = 75;
  s.order = { menu: l.menu, need, got: 0, left: time, reward: need * E.salePrice(s, b, MENU[l.menu]) * 3, branch: b.id };
  bus.emit("order", s.order);
}

export function declineOrder(s: GameState) {
  s.order = null;
  s.orderTimer = 90;
}

// ======================================================= 고구마 그룹

function tickRival(s: GameState, dt: number) {
  if (!featureOn(s, "rival") || s.rival.defeated) return;
  const avg = s.branches.reduce((a, b) => a + b.rating, 0) / Math.max(1, s.branches.length);
  s.rival.share = Math.max(0, Math.min(60, s.rival.share - dt * 0.012 * (avg - 3.3)));
  if (s.rival.share <= 0 && s.chapter >= 6) {
    s.rival.defeated = true;
    bus.emit("rivalDefeated");
  }
}

// ======================================================= 감자 시장 & 농장

let marketTimer = 0;
function tickMarket(s: GameState, dt: number) {
  marketTimer -= dt;
  if (marketTimer > 0) return;
  marketTimer = E.HOUR;
  if (!featureOn(s, "market")) return;
  const m = s.market;
  m.trend = m.trend * 0.8 + (Math.random() - 0.5) * 0.16 + (1 - m.price) * 0.05;
  m.price = Math.min(2.6, Math.max(0.4, m.price + m.trend));
  m.history.push(m.price);
  if (m.history.length > 48) m.history.shift();
}

/** 전 분점 감자 소모량 (초당) */
export function potatoUse(s: GameState) {
  let n = 0;
  for (const b of s.branches) for (const l of b.lines) n += E.lineRate(s, b, l) * E.potatoesPer(s, MENU[l.menu]);
  return n;
}

/** 시세로 10분치 감자 비축 */
export function bankQuote(s: GameState): [number, number] {
  const amount = Math.max(100, potatoUse(s) * 600);
  const b = s.branches[s.active] ?? s.branches[0];
  return [amount, amount * E.potatoPrice(s, b) / E.regionMult(b)];
}
export function buyBank(s: GameState) {
  const [amount, cost] = bankQuote(s);
  if (s.money < cost) return false;
  s.money -= cost;
  s.market.bank += amount;
  return true;
}

export function upgradeFarm(s: GameState) {
  const cost = E.farmCost(s);
  if (s.money < cost) return false;
  s.money -= cost;
  s.farm.lv++;
  bus.emit("farm", s.farm.lv);
  return true;
}

export const varietyCost = (s: GameState, id: string) => Math.max(1e14, E.idleIncome(s) * 40) * Math.sqrt(VARIETY[id].cost);

export function unlockVariety(s: GameState, id: string) {
  const v = VARIETY[id];
  if (!v || s.farm.varieties.includes(id) || s.farm.lv < v.farm) return false;
  if (id === "golden" && !E.patent(s, "golden")) return false;
  const cost = varietyCost(s, id);
  if (s.money < cost) return false;
  s.money -= cost;
  s.farm.varieties.push(id);
  s.farm.active = id;
  bus.emit("variety", id);
  return true;
}

// ======================================================= 엑스포

export function expoCost(s: GameState) {
  const st = EXPO_STAGES[s.expo.stage];
  return st ? st.cost : Infinity;
}
export function investExpo(s: GameState) {
  const c = expoCost(s);
  if (s.money < c) return false;
  s.money -= c;
  s.expo.stage++;
  bus.emit("expo", s.expo.stage);
  return true;
}

// ======================================================= 브랜드 리부트

export function goldenGain(s: GameState) {
  const base = Math.floor(Math.pow(s.earned / 1e15, 0.3));
  const rule = s.prestige.rules.reduce((a, id) => a * (RULES.find((r) => r.id === id)?.mult ?? 1), 1);
  return Math.max(0, Math.floor(base * rule));
}

export function reboot(s: GameState, rules: string[]) {
  const gain = goldenGain({ ...s, prestige: { ...s.prestige, rules } } as GameState);
  const keep = newGame();
  keep.prestige = { ...s.prestige, golden: s.prestige.golden + gain, reboots: s.prestige.reboots + 1, rules };
  keep.achievements = s.achievements;
  keep.earnedAll = s.earnedAll;
  keep.stats = s.stats;
  keep.seen = s.seen;
  keep.seenCustomers = s.seenCustomers;
  keep.reviews = s.reviews;
  keep.settings = s.settings;
  keep.ended = s.ended;
  keep.bestMarket = s.bestMarket;
  keep.played = s.played;
  keep.clock = s.clock;
  keep.hires = 0;
  // 스토리는 이어진다: 챕터, 달성한 목표, 엑스포, 고구마 그룹과의 관계
  keep.chapter = s.chapter;
  keep.goals = s.goals;
  keep.expo = s.expo;
  keep.rival = s.rival.defeated ? s.rival : { share: Math.min(s.rival.share, 30), defeated: false };
  keep.money = 20000 * Math.pow(10, E.patent(s, "start"));
  if (E.patent(s, "memory")) {
    keep.research.found = s.research.found.filter((id) => MENU[id]?.research);
    keep.research.fails = s.research.fails;
  }
  const keepN = E.patent(s, "manager");
  if (keepN && !rules.includes("strike")) {
    keep.managers = [...s.managers].sort((a, b) => b.data.power - a.data.power).slice(0, keepN).map((m) => ({ data: m.data, at: null }));
  }
  if (E.patent(s, "golden") && s.farm.varieties.includes("golden")) keep.farm.varieties = ["sumi"];
  Object.assign(s, keep);
  bus.emit("reboot", gain);
  return gain;
}

export function buyPatent(s: GameState, id: string) {
  const p = PATENT[id];
  const lv = E.patent(s, id);
  if (!p || lv >= p.max) return false;
  if (p.req && !E.patent(s, p.req)) return false;
  const c = patentCost(p, lv);
  if (s.prestige.golden < c) return false;
  s.prestige.golden -= c;
  s.prestige.spent += c;
  s.prestige.patents[id] = lv + 1;
  return true;
}

// ======================================================= 오프라인

export function offlineSeconds(s: GameState) {
  return 2 * 3600 + E.patent(s, "offline") * 2 * 3600;
}

/** 자리를 비운 동안의 수익 (자동화된 비율만큼, 70% 효율) */
export function offlineEarnings(s: GameState, sec: number) {
  const capped = Math.min(sec, offlineSeconds(s));
  let total = 0;
  for (const b of s.branches) total += b.income * automation(b) * 0.7 * capped;
  return { sec: capped, money: total };
}

export function applyOffline(s: GameState, now = Date.now()) {
  const away = (now - s.lastTick) / 1000;
  if (away < 30) return null;
  const r = offlineEarnings(s, away);
  s.money += r.money;
  s.earned += r.money;
  s.earnedAll += r.money;
  s.clock += Math.min(away, r.sec);
  return { away, ...r };
}

export function activeBranch(s: GameState) {
  return s.branches[Math.min(s.active, s.branches.length - 1)];
}

export { VARIETIES };
