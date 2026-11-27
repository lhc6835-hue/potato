// UI에서 부르는 행동: 구매·레벨업·강화·고용·시설·환생·상점·업적.
import { WEAPON, WEAPONS } from "../data/weapons";
import { CREW, FACILITIES, TALENTS, ACHIEVEMENTS } from "../data/crew";
import * as St from "./state";
import { S } from "./state";
import { G } from "./world";
import { sfx } from "../engine/audio";
import { emit } from "../ui/bus";
import * as levelFx from "../fx/hit/levelup.js";
import { ELEM } from "../data/elements";

export type Mult = 1 | 10 | 100 | "max";
export let mult: Mult = 1;
export function setMult(m: Mult) { mult = m; emit("ui"); }

/** 레벨을 몇 개 살 수 있는지와 총비용 */
export function bulk(cost: (lv: number) => number, lv: number, cap = Infinity, m: Mult = mult): { n: number; cost: number } {
  const want = m === "max" ? 1000 : m;
  let n = 0, total = 0;
  while (n < want && lv + n < cap) {
    const c = cost(lv + n);
    if (m === "max" && total + c > S.gold) break;
    total += c;
    n++;
  }
  if (m === "max" && n === 0 && lv < cap) return { n: 1, cost: cost(lv) };
  return { n, cost: total };
}

function celebrate(x?: number, y?: number, pal?: string[]) {
  G.spawn(levelFx, { x: x ?? G.W / 2, y: y ?? G.floorY, palette: pal }, 2);
}

export function unlockWeapon(id: string) {
  const w = WEAPON[id];
  if (!w || S.weapons[id] || S.maxStage < w.req) return false;
  const c = St.unlockCost(w);
  if (S.gold < c) return fail();
  S.gold -= c;
  S.weapons[id] = { lv: 1, enh: 0 };
  S.stats.owned = St.ownedCount();
  sfx.levelUp();
  equip(id);
  G.callout(`${w.name} 획득!`, G.W / 2, G.H * 0.3, 0xffffffff, 0xff40c0ff, 1, 1.4);
  emit("ui");
  return true;
}

export function equip(id: string) {
  if (!S.weapons[id]) return;
  G.equip(id);
  const r = S.seen.recent ? (S.seen as unknown as Record<string, unknown>) : null;
  void r;
  recent = [id, ...recent.filter((x) => x !== id)].slice(0, 5);
  try { localStorage.setItem("sbt-recent", JSON.stringify(recent)); } catch { /* 무시 */ }
  sfx.click();
  emit("ui");
}
export let recent: string[] = (() => { try { return JSON.parse(localStorage.getItem("sbt-recent") ?? "[]"); } catch { return []; } })();

export function levelWeapon(id: string) {
  const w = WEAPON[id], st = S.weapons[id];
  if (!w || !st) return false;
  const { n, cost } = bulk((lv) => St.weaponCost(w, lv), st.lv);
  if (n === 0 || S.gold < cost) return fail();
  S.gold -= cost;
  const before = st.lv;
  st.lv += n;
  sfx.levelUp();
  if (Math.floor(st.lv / 25) > Math.floor(before / 25)) {
    G.callout(`${w.name} 위력 2배!`, G.W / 2, G.H * 0.3, 0xffffffff, 0xff40d0ff, 1, 1.4);
    celebrate(undefined, undefined, ELEM[w.elem].ramp);
  }
  emit("ui");
  return true;
}

export function enhance(id: string): "ok" | "fail" | "no" {
  const st = S.weapons[id];
  if (!st || st.enh >= St.ENH_MAX) return "no";
  const c = St.enhanceCost(st.enh);
  if (S.stones < c) { fail(); return "no"; }
  S.stones -= c;
  if (Math.random() < St.enhanceRate(st.enh)) {
    st.enh++;
    sfx.victory();
    celebrate(undefined, undefined, ["#3a2a0a", "#8a6a2a", "#d8b060", "#fff0b0", "#fffbe6", "#ffffff"]);
    G.callout(`강화 성공! +${st.enh}`, G.W / 2, G.H * 0.3, 0xffffffff, 0xff40d8ff, 2, 1.4);
    emit("ui");
    return "ok";
  }
  sfx.fail();
  G.callout("강화 실패…", G.W / 2, G.H * 0.3, 0xffffffff, 0xffb09080, 1, 1.2);
  emit("ui");
  return "fail";
}

export function levelCrew(id: string) {
  const c = CREW.find((x) => x.id === id)!;
  const lv = S.crew[id] ?? 0;
  if (S.maxStage < c.req) return false;
  const { n, cost } = bulk((l) => St.crewCost(c, l), lv);
  if (n === 0 || S.gold < cost) return fail();
  S.gold -= cost;
  S.crew[id] = lv + n;
  sfx.levelUp();
  if (lv === 0) { G.crew.joined(G, id); G.callout(`${c.job} ${c.name} 합류!`, G.W / 2, G.H * 0.3, 0xffffffff, 0xff60e0a0, 1, 1.5); }
  emit("ui");
  return true;
}

export function levelFac(id: string) {
  const f = FACILITIES.find((x) => x.id === id)!;
  const lv = S.fac[id] ?? 0;
  const { n, cost } = bulk((l) => St.facCost(f, l), lv, f.max);
  if (n === 0 || S.gold < cost) return fail();
  S.gold -= cost;
  S.fac[id] = lv + n;
  sfx.levelUp();
  emit("ui");
  return true;
}

export function levelTalent(id: string) {
  const t = TALENTS.find((x) => x.id === id)!;
  const lv = S.tal[id] ?? 0;
  if (lv >= t.max) return false;
  const c = St.talCost(t, lv);
  if (S.souls < c) return fail();
  S.souls -= c;
  S.tal[id] = lv + 1;
  sfx.gem();
  emit("ui");
  return true;
}

export function ascend() {
  if (!St.canAscend()) return false;
  const gain = St.soulsFor(S.maxStage);
  S.souls += gain;
  S.soulsTotal += gain;
  S.stats.ascends++;
  // 초기화: 골드, 스테이지, 무기 레벨, 동료, 시설. 유지: 무기 소유·강화, 보석, 강화석, 영혼, 특성, 업적, 도감
  S.gold = 0;
  S.stage = 1 + St.tal("legacy") * 10;
  S.maxStage = S.stage;
  S.bossFail = false;
  for (const id of Object.keys(S.weapons)) S.weapons[id].lv = 1;
  S.crew = {};
  S.fac = {};
  G.crew.layout(G);
  G.bag.dead = true;
  G.respawn = 0.1;
  G.region = -1;
  G.checkRegion();
  G.fever = 0; G.feverT = 0;
  sfx.fever();
  G.flash(0xffffffff, 1);
  G.callout(`환생! 영혼 +${gain}`, G.W / 2, G.H * 0.3, 0xffffffff, 0xffffe080, 2, 2.4);
  St.save();
  emit("ui");
  return true;
}

// ---- 보석 상점
export const SHOP = [
  { id: "chest", name: "전설의 보물 상자", desc: "아직 없는 무기 하나 (해금 조건 무시), 이미 다 있으면 강화석 10개", gems: 60 },
  { id: "stones", name: "강화석 꾸러미", desc: "강화석 5개", gems: 30 },
  { id: "boost", name: "황금 축복", desc: "10분 동안 골드 2배 (중첩 시 연장)", gems: 25 },
  { id: "gold", name: "금화 자루", desc: "현재 스테이지 샌드백 300개 분량의 골드", gems: 20 },
];
export function buyShop(id: string): string | null {
  const it = SHOP.find((s) => s.id === id)!;
  if (S.gems < it.gems) { fail(); return null; }
  S.gems -= it.gems;
  let msg = "";
  if (id === "chest") {
    const pool = WEAPONS.filter((w) => !S.weapons[w.id]);
    if (!pool.length) { S.stones += 10; msg = "강화석 +10"; }
    else {
      // 희귀할수록 덜 나온다
      const weights = pool.map((w) => Math.pow(0.45, w.rarity));
      let r = Math.random() * weights.reduce((a, b) => a + b, 0), pick = pool[0];
      for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { pick = pool[i]; break; } }
      S.weapons[pick.id] = { lv: 1, enh: 0 };
      S.stats.owned = St.ownedCount();
      msg = pick.id;
    }
  } else if (id === "stones") { S.stones += 5; msg = "강화석 +5"; }
  else if (id === "boost") { S.boost = Math.max(Date.now(), S.boost) + 10 * 60 * 1000; msg = "골드 2배!"; }
  else { const g = St.killGold(St.stageHp(S.stage)) * 300 * St.goldMul(); S.gold += g; msg = "gold"; }
  sfx.gem();
  celebrate(undefined, undefined, ["#2a0a4a", "#6a1ab0", "#b048ff", "#e0a0ff", "#f8e0ff", "#ffffff"]);
  emit("ui");
  return msg;
}

// ---- 업적
export function stat(id: string): number {
  if (id === "owned") return St.ownedCount();
  return (S.stats as unknown as Record<string, number>)[id] ?? 0;
}
export function claimable() { return ACHIEVEMENTS.filter((a) => !S.ach[a.id] && stat(a.stat) >= a.goal); }
export function claim(id: string) {
  const a = ACHIEVEMENTS.find((x) => x.id === id)!;
  if (S.ach[id] || stat(a.stat) < a.goal) return;
  S.ach[id] = true;
  S.gems += a.gems;
  sfx.gem();
  emit("ui");
}

function fail() { sfx.fail(); return false; }
