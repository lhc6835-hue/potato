// 밸런스 봇: 탐욕적으로 사고 때리며 시간당 진행도를 본다. npx tsx tools/bot.ts [시간]
import * as St from "../src/game/state";
import { S } from "../src/game/state";
import { WEAPONS } from "../src/data/weapons";
import { CREW, FACILITIES, TALENTS } from "../src/data/crew";
import { BAGS } from "../src/data/bags";

const hours = +(process.argv[2] ?? 4);
St.replace(St.fresh());
const main = () => WEAPONS.filter((w) => S.weapons[w.id]).sort((a, b) => b.pow - a.pow)[0];
const playerDps = () => {
  let best = 0;
  for (const w of WEAPONS) if (S.weapons[w.id]) best = Math.max(best, St.weaponDmg(w) * St.dmgMul() * 5);
  return best * 1.25 * (1 + 0.05 * (St.critDmg() - 1)); // 피버·치명 평균
};
const log: string[] = [];
let t = 0, lastLog = -1;
const bagHp = (s: number) => St.stageHp(s) * (St.bagFor(s).def.hp);
let bossTry = 0, lastMax = 0, lastMaxT = 0, asc = 0;
const reached: Record<number, number> = {};
while (t < hours * 3600) {
  const dps = playerDps() + St.totalCrewDps();
  const s = S.stage, hp = bagHp(s), boss = St.isBoss(s);
  const tt = hp / dps + 0.6;
  if (boss && !S.bossFail && tt > St.bossTime()) { S.bossFail = true; S.stage--; bossTry = t; }
  else {
    t += tt;
    S.gold += hp * (St.goldPerDmg() + 0.3) * St.goldMul() * St.bagFor(s).def.gold * 1.15;
    if (!S.bossFail || boss) { S.bossFail = false; S.stage++; S.maxStage = Math.max(S.maxStage, S.stage); }
  }
  if (S.maxStage > lastMax) { lastMax = S.maxStage; lastMaxT = t; for (const g of [50, 100, 150, 200, 250, 300, 350, 400]) if (S.maxStage >= g && !reached[g]) { reached[g] = t; console.log(`${(t / 60).toFixed(0)}분: 스테이지 ${g} (환생 ${asc}회, 영혼 ${S.soulsTotal})`); } }
  if (t - lastMaxT > 900 && St.soulsFor(S.maxStage) > S.soulsTotal * 0.5) {
    const g = St.soulsFor(S.maxStage); S.souls += g; S.soulsTotal += g; asc++;
    // 특성: 영혼의 힘·동료의 맹세·계승 위주
    for (let k = 0; k < 200; k++) { let did = false; for (const id of ["might", "crew", "legacy", "midas"]) { const T = TALENTS.find((x) => x.id === id)!; const lv = S.tal[id] ?? 0; if (lv < T.max && St.talCost(T, lv) <= S.souls * (id === "might" ? 1 : 0.3)) { S.souls -= St.talCost(T, lv); S.tal[id] = lv + 1; did = true; } } if (!did) break; }
    S.gold = 0; S.stage = 1 + St.tal("legacy") * 10; S.maxStage = S.stage; S.bossFail = false; for (const id of Object.keys(S.weapons)) S.weapons[id].lv = 1; S.crew = {}; S.fac = {}; lastMax = 0; lastMaxT = t;
  }
  if (S.bossFail && t - bossTry > 30) { S.bossFail = false; S.stage++; bossTry = t; }
  // 구매: 효율(늘어나는 DPS / 비용)이 가장 좋은 것
  for (const w of WEAPONS) if (!S.weapons[w.id] && S.maxStage >= w.req && w.pow > main().pow * 2 && St.unlockCost(w) < S.gold * 0.7) { S.gold -= St.unlockCost(w); S.weapons[w.id] = { lv: 1, enh: 0 }; }
  for (let k = 0; k < 50; k++) {
    let bestR = 0, act: (() => void) | null = null;
    const base = playerDps() + St.totalCrewDps();
    const tryIt = (cost: number, apply: () => void, undo: () => void) => {
      if (cost > S.gold) return;
      apply(); const gain = playerDps() + St.totalCrewDps() - base; undo();
      const r = gain / cost;
      if (r > bestR) { bestR = r; act = () => { S.gold -= cost; apply(); }; }
    };
    for (const w of WEAPONS) {
      if (!S.weapons[w.id]) { if (S.maxStage >= w.req) tryIt(St.unlockCost(w), () => (S.weapons[w.id] = { lv: 1, enh: 0 }), () => delete S.weapons[w.id]); }
      else if (w === main()) { const st = S.weapons[w.id]; const c = St.weaponCost(w, st.lv); if (c <= S.gold) { const r = (St.weaponDmg(w, st.lv + 1) - St.weaponDmg(w)) * St.dmgMul() * 5 / c; if (r > bestR || playerDps() < St.weaponDmg(w) * St.dmgMul() * 5 * 1.3) { bestR = Math.max(bestR, r); act = () => { S.gold -= c; st.lv++; }; } } }
    }
    for (const c of CREW) if (S.maxStage >= c.req) { const lv = S.crew[c.id] ?? 0; tryIt(St.crewCost(c, lv), () => (S.crew[c.id] = lv + 1), () => (S.crew[c.id] = lv)); }
    for (const f of FACILITIES.filter((f) => f.id === "forge" || f.id === "drill")) { const lv = S.fac[f.id] ?? 0; tryIt(St.facCost(f, lv), () => (S.fac[f.id] = lv + 1), () => (S.fac[f.id] = lv)); }
    if (!act) break;
    (act as () => void)();
  }
  const m = Math.floor(t / (t < 3600 ? 300 : 1800));
  if (m !== lastLog) { lastLog = m; log.push(`${(t / 60).toFixed(0).padStart(4)}분  스테이지 ${String(S.maxStage).padStart(3)}  무기 ${St.ownedCount()}  동료Lv ${Object.values(S.crew).reduce((a, b) => a + b, 0)}  DPS ${dps.toExponential(1)} 플레이어 ${(playerDps() / dps * 100).toFixed(0)}%  주무기 ${main().id} Lv${S.weapons[main().id].lv}  hp ${hp.toExponential(1)}`); }
}
if (process.argv[3]) console.log(log.join("\n"));
void BAGS;
