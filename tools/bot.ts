// 밸런스 봇: 적당히 성실한 플레이어처럼 굴려서 챕터별 소요 시간을 잰다.
// 실행: npx tsx tools/bot.ts [시간]
import { newGame } from "../src/sim/state";
import * as G from "../src/sim/game";
import * as E from "../src/sim/econ";
import { MENU } from "../src/data/menus";
import { RECIPES } from "../src/data/research";
import { VARIETIES } from "../src/data/varieties";
import { callLift } from "../src/sim/branch";
import { orderFetch, orderCook, bossTap, bossAt, home } from "../src/sim/boss";
import { fmt, duration } from "../src/util/format";

(globalThis as any).Math.random = (() => { let x = 12345; return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648); })();

const HOURS = Number(process.argv[2] ?? 40);
const s = newGame();
import { bus } from "../src/sim/bus";
bus.on("goal", (g: any) => log(`  목표 완료: ${g.text}`));
const dt = 0.5;
let t = 0, last = 0, lastCh = 1, lastReboot = 0;
const log = (m: string) => console.log(`[${duration(t).padStart(10)}] ${m}`);

function bestUpgrade() {
  // 병목 노드가 있으면 그걸, 없으면 가장 싼 라인 병목 스테이션
  let best: any = null;
  for (const b of s.branches) {
    const P = b.lines.reduce((a, l) => a + E.lineRate(s, b, l), 0);
    const U = b.lines.reduce((a, l) => a + E.lineRate(s, b, l) * E.potatoesPer(s, MENU[l.menu]), 0);
    const C = E.counterCap(s, b) * 0.8 * b.lines.reduce((a, l) => a + MENU[l.menu].pop, 0);
    const ratios: [number, number, () => void][] = [
      [E.liftRate(s, b) / P, E.liftCost(b), () => G.upgrade(s, b, { kind: "lift" })],
      [C / P, E.counterCost(b), () => G.upgrade(s, b, { kind: "counter" })],
      [E.supplyRate(s, b) / Math.max(U, 1e-9), E.supplyCost(b), () => G.upgrade(s, b, { kind: "supply" })],
    ];
    ratios.sort((x, y) => x[0] - y[0]);
    if (ratios[0][0] < 1.1) { const o = ratios[0]; if (!best || 0 < (best[2] ?? 0)) best = [o[1], o[2], 0]; continue; }
    b.lines.forEach((l, i) => {
      const st = E.bottleneck(l);
      const cost = E.stationCost(b, l, st);
      const gain = (E.salePrice(s, b, MENU[l.menu]) * E.lineRate(s, b, l)) / Math.min(...l.lv);
      const score = cost / Math.max(gain, 1e-9);
      if (!best || score < best[2]) best = [cost, () => G.upgrade(s, b, { kind: "station", line: i, st }), score];
    });
  }
  return best;
}

while (t < HOURS * 3600) {
  // 초반 1.5시간은 열심히 탭(초당 2회 상당)
  const b0 = G.activeBranch(s);
  // 사장: 감자가 모자라면 가져오고, 아니면 매니저 없는 라인에서 조리 (초당 2번 탭)
  {
    const h = home(s), boss = s.boss;
    const unmanaged = h.lines.map((l, i) => i).filter((i) => h.lines[i].manager === null);
    const needPot = h.supply.manager === null ? h.lines.findIndex((l) => l.bin < E.potatoesPer(s, MENU[l.menu]) * 2 && (l.manager !== null || unmanaged.length)) : -1;
    if (boss.task?.kind !== "fetch" && boss.carry <= 0 && needPot >= 0 && h.storage >= 1) orderFetch(s);
    else if (unmanaged.length && boss.task?.kind !== "fetch" && (!boss.task || !unmanaged.includes(boss.task.line))) orderCook(s, unmanaged[0]);
    if (boss.task?.kind === "cook" && bossAt(s, boss.task.line) && Math.floor(t * 2) % 2 === 0) bossTap(s, boss.task.line);
    for (const b of s.branches) if (b.lift.manager === null && !b.lift.moving && b.lines.some((l, i) => i > 0 && l.tray >= 1)) callLift(b);
  }
  G.tick(s, dt);
  t += dt;
  if (t - last >= 2) {
    last = t;
    // 챕터
    if (G.chapterDone(s)) { G.advanceChapter(s); log(`== 챕터 ${s.chapter} 시작 (돈 ${fmt(s.money)}, 수입 ${fmt(E.idleIncome(s))}/s, 분점 ${s.branches.length})`); }
    // 매니저
    for (let k = 0; k < 3; k++) {
      const empty = s.branches.some((b) => b.lines.some((l) => l.manager === null) || b.supply.manager === null || (b.lines.length > 1 && b.lift.manager === null) || b.counter.manager === null);
      if (empty && s.money > E.hireCost(s) * 1.05) { G.hire(s, 0); for (const b of s.branches) G.autoAssign(s, b); } else break;
    }
    // 라인 짓기/층
    for (const b of s.branches) {
      const menus = G.buildableMenus(s, b).sort((x, y) => MENU[x].price - MENU[y].price);
      if (menus.length && b.lines.length < b.maxLines && s.money > E.lineBuildCost(b, menus[0]) * 1.2) G.buildLine(s, b, menus[0]);
      else if (menus.length && b.lines.length >= b.maxLines && s.chapter >= 3 && s.money > E.floorCost(b) * 1.5) G.addFloor(s, b);
      // 낡은 메뉴 교체
      if (menus.length && b.lines.length >= b.maxLines) {
        const worst = b.lines.reduce((w, l, i) => (MENU[l.menu].price < MENU[b.lines[w].menu].price ? i : w), 0);
        const top = menus[menus.length - 1];
        if (MENU[top].price > MENU[b.lines[worst].menu].price * 30 && s.money > E.lineBuildCost(b, top)) G.swapLineMenu(s, b, worst, top);
      }
    }
    // 연구: 몇 번 틀리고 맞힌다
    if (s.chapter >= 5) {
      const r = RECIPES.find((x) => !s.research.found.includes(x.menu) && MENU[x.menu].chapter <= s.chapter && (!x.variety || s.farm.active === x.variety));
      if (r) { if (s.research.fails.length < 6) G.tryRecipe(s, "fry", ["none", "mayo", "cream", "sugar", "tomato", "truffle"][s.research.fails.length]); else G.tryRecipe(s, r.method, r.top); }
    }
    // 분점
    if (s.chapter >= 6) {
      for (const r of G.availableRegions(s)) for (let i = 0; i < r.slots.length; i++) {
        if (G.slotTaken(s, r.id, i)) continue;
        if (s.money > E.branchCost(s, r.id, i) * 1.5) G.openBranch(s, r.id, i);
      }
    }
    // 농장
    if (s.chapter >= 8) {
      if (s.money > E.farmCost(s) * 1.1) G.upgradeFarm(s);
      for (const v of VARIETIES) if (s.farm.lv >= v.farm && !s.farm.varieties.includes(v.id) && s.money > G.varietyCost(s, v.id) * 1.1) G.unlockVariety(s, v.id);
    }
    if (s.chapter >= 11 && s.money > G.expoCost(s) * 1.2) G.investExpo(s);
    // 리부트: 황금감자가 지금 가진 만큼 이상 모이면
    if (s.chapter >= 9 && t - lastReboot > 3600 && G.goldenGain(s) >= Math.max(15, s.prestige.golden + s.prestige.spent)) {
      const g = G.reboot(s, []);
      lastReboot = t;
      for (let k = 0; k < 100; k++) {
        const ids = ["speed", "price", "start", "carry", "serve", "franchise", "offline", "ideas", "memory", "manager", "rent"];
        let any = false;
        for (const id of ids) if (G.buyPatent(s, id)) any = true;
        if (!any) break;
      }
      log(`** 리부트 +${g} 황금감자 (보유 ${s.prestige.golden}, 특허 ${JSON.stringify(s.prestige.patents)})`);
    }
    // 업그레이드 (빈 매니저 자리가 있고 곧 살 수 있으면 아낀다)
    const saving = (s.chapter >= 8 && s.farm.lv < 8 && E.farmCost(s) < E.idleIncome(s) * 400) || s.branches.some((b) => b.lines.some((l) => l.manager === null) || b.supply.manager === null) && E.hireCost(s) < E.idleIncome(s) * 120 + 2e4;
    for (let k = 0; k < 200 && !saving; k++) {
      const u = bestUpgrade();
      if (!u || u[0] > s.money) break;
      u[1]();
    }
    // 가격: 공급 병목이면 비싸게
    for (const b of s.branches) {
      const stock = Object.values(b.stock).reduce((a, v) => a + v, 0);
      G.setPrice(b, stock < 1 ? Math.min(1.6, b.priceMult + 0.05) : Math.max(0.9, b.priceMult - 0.05));
    }
  }
  if (t % 1800 < dt) log(`ch${s.chapter} 돈 ${fmt(s.money)} 누적 ${fmt(s.earned)} 수입 ${fmt(E.idleIncome(s))}/s 라인 ${s.branches.map((b) => b.lines.length).join(",")} 매니저 ${s.managers.length} 분점 ${s.branches.length} 레벨 ${s.branches[0].lines.map((l) => Math.min(...l.lv)).join("/")}`);
  if (s.ended) { log("엔딩!"); break; }
}
console.log("goals:", G.chapterDef(s).goals.map((g) => `${g.text} ${g.prog(s).map((x) => fmt(x)).join("/")}`).join(" | "));
const B = s.branches[0];
console.log(B.lines.map((l) => `${MENU[l.menu].name} lv${l.lv} tray=${fmt(l.tray)} rate=${fmt(E.lineRate(s, B, l))} mgr=${l.manager}`).join("\n"));
console.log("stock", B.stock, "lift", fmt(E.liftRate(s, B)), "counter", fmt(E.counterCap(s, B)), "traffic", E.traffic(s, B).toFixed(2), "supply", fmt(E.supplyRate(s, B)), "storage", fmt(B.storage), "price", B.priceMult, "rating", B.rating.toFixed(2));
console.log("soldBy", Object.fromEntries(Object.entries(s.soldBy).map(([k, v]) => [k, fmt(v)])));
