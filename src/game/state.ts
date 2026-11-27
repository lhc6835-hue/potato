// 저장 데이터와 경제 공식. 숫자는 전부 JS number (1e308까지).
import { WEAPON, WEAPONS, WeaponDef } from "../data/weapons";
import { CREW, CrewDef, FACILITIES, TALENTS, FacilityDef, TalentDef } from "../data/crew";
import { BAGS, BagDef, REGIONS, STAGES_PER_REGION, BOSS_EVERY } from "../data/bags";

export interface Stats { hits: number; breaks: number; crits: number; fevers: number; bosses: number; ascends: number; goblins: number; perfects: number; dmg: number; gold: number; maxStage: number; owned: number }

export interface Save {
  v: number;
  gold: number;
  gems: number;
  souls: number;
  soulsTotal: number;
  stones: number;
  stage: number;
  maxStage: number;
  best: number;
  bossFail: boolean;
  weapons: Record<string, { lv: number; enh: number }>;
  equip: string;
  crew: Record<string, number>;
  fac: Record<string, number>;
  tal: Record<string, number>;
  stats: Stats;
  ach: Record<string, boolean>;
  codex: Record<string, number>;
  boost: number;
  last: number;
  opts: { sfx: number; music: number; haptic: boolean; shake: number; dmgText: boolean };
  seen: Record<string, boolean>;
}

const KEY = "sandbag-tycoon-v1";

export function fresh(): Save {
  return {
    v: 1, gold: 0, gems: 0, souls: 0, soulsTotal: 0, stones: 0,
    stage: 1, maxStage: 1, best: 1, bossFail: false,
    weapons: { fist0: { lv: 1, enh: 0 } }, equip: "fist0",
    crew: {}, fac: {}, tal: {},
    stats: { hits: 0, breaks: 0, crits: 0, fevers: 0, bosses: 0, ascends: 0, goblins: 0, perfects: 0, dmg: 0, gold: 0, maxStage: 1, owned: 1 },
    ach: {}, codex: {}, boost: 0, last: Date.now(),
    opts: { sfx: 0.8, music: 0.5, haptic: true, shake: 1, dmgText: true },
    seen: {},
  };
}

export let S: Save = load();

export function load(): Save {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const f = fresh();
      return { ...f, ...d, stats: { ...f.stats, ...d.stats }, opts: { ...f.opts, ...d.opts } };
    }
  } catch { /* 저장소를 못 쓰면 새로 시작 */ }
  return fresh();
}
export function save() {
  S.last = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 무시 */ }
}
export function wipe() {
  try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
  S = fresh();
}
export function replace(s: Save) { S = s; }

// ---- 스테이지
export const isBoss = (s: number) => s % BOSS_EVERY === 0;
export const isRegionBoss = (s: number) => s % STAGES_PER_REGION === 0;
export const regionOf = (s: number) => Math.min(REGIONS.length - 1, Math.floor((s - 1) / STAGES_PER_REGION));
export const stageHp = (s: number) => 10 * Math.pow(1.19, Math.min(s, 100) - 1) * Math.pow(1.16, Math.max(0, s - 100)) * (isBoss(s) ? (isRegionBoss(s) ? 8 : 4) : 1);
function hash(n: number) { let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function bagFor(s: number): { def: BagDef; boss: boolean; elite: boolean } {
  const r = regionOf(s);
  if (isRegionBoss(s) || (r === 7 && isBoss(s))) return { def: BAGS.find((b) => b.region === r && b.boss)!, boss: true, elite: false };
  let pool = BAGS.filter((b) => b.region === r && !b.boss);
  if (r === 7) pool = [...pool, ...BAGS.filter((b) => !b.boss && b.region < 7)];
  return { def: pool[Math.floor(hash(s * 7 + 3) * pool.length)], boss: false, elite: isBoss(s) };
}
export const bossTime = () => 30 + tal("chrono") * 3;

// ---- 수치 헬퍼
export const fac = (id: string) => S.fac[id] ?? 0;
export const tal = (id: string) => S.tal[id] ?? 0;
const facDef = (id: string) => FACILITIES.find((f) => f.id === id)!;
const talDef = (id: string) => TALENTS.find((f) => f.id === id)!;
const facV = (id: string) => fac(id) * facDef(id).per;
const talV = (id: string) => tal(id) * talDef(id).per;

export const milestone = (lv: number) => Math.pow(2, Math.floor(lv / 25)) * Math.pow(4, Math.floor(lv / 100));
export function weaponDmg(w: WeaponDef, lv = S.weapons[w.id]?.lv ?? 1, enh = S.weapons[w.id]?.enh ?? 0) {
  return w.pow * lv * milestone(lv) * (1 + 0.3 * enh + 0.04 * enh * enh);
}
export const weaponCost = (w: WeaponDef, lv: number) => Math.pow(w.pow, 0.72) * 6 * Math.pow(1.1, lv - 1) * (1 + Math.floor(lv / 25) * 0.6);
export const unlockCost = (w: WeaponDef) => (w.id === "fist0" ? 0 : Math.max(25, Math.pow(w.pow, 1.5) * 28));
export const enhanceCost = (enh: number) => enh + 1;
export const enhanceRate = (enh: number) => Math.max(0.25, 1 - enh * 0.08);
export const ENH_MAX = 10;

export const crewDps = (c: CrewDef, lv = S.crew[c.id] ?? 0) => (lv <= 0 ? 0 : c.dps * lv * milestone(lv));
export const crewCost = (c: CrewDef, lv: number) => c.cost * Math.pow(1.1, lv);
export const facCost = (f: FacilityDef, lv: number) => f.cost * Math.pow(f.grow, lv);
export const talCost = (t: TalentDef, lv: number) => Math.ceil(t.cost * Math.pow(t.grow, lv));

/** 영혼 1개당 피해 +3% (평생 모은 영혼 기준) */
export const soulMul = () => 1 + S.soulsTotal * 0.03;
export const dmgMul = () => (1 + facV("forge")) * (1 + talV("might")) * soulMul();
export const crewMul = () => (1 + facV("drill")) * (1 + talV("crew")) * soulMul();
/** 초반 30스테이지는 골드를 더 준다 (첫 무기들을 빨리 만져 보도록) */
export const earlyMul = () => 1 + Math.max(0, 30 - S.stage) / 5;
export const goldMul = () => (1 + facV("vault")) * (1 + talV("midas")) * (S.boost > Date.now() ? 2 : 1) * earlyMul();
export const critChance = (w?: WeaponDef) => 0.05 + facV("zen") + (w?.sp?.crit ?? 0);
export const critDmg = (w?: WeaponDef) => 2 + facV("drum") + talV("fury") + (w?.sp?.critDmg ?? 0) + (w?.elem === "shadow" ? 0.5 : 0);
export const feverGain = () => 1 + facV("altar");
export const feverTime = () => 12 * (1 + facV("altar")) + talV("frenzy");
export const offlineHours = () => 2 + fac("storage");
export const offlineEff = () => 0.25 + fac("storage") * 0.02 + talV("dream");
export const luck = () => facV("spring");
export const gemMul = () => 1 + talV("luck");

export function totalCrewDps() {
  let d = 0;
  for (const c of CREW) d += crewDps(c);
  return d * crewMul();
}
export const goldPerDmg = () => 0.08;
export const killGold = (hp: number) => hp * 0.3;

export const soulsFor = (maxStage: number) => (maxStage < 60 ? 0 : Math.floor(3 * Math.pow(1.045, maxStage - 60)));
export const canAscend = () => S.maxStage >= 60;

export const equipped = () => WEAPON[S.equip] ?? WEAPONS[0];
export const owned = (id: string) => !!S.weapons[id];
export const ownedCount = () => Object.keys(S.weapons).length;
