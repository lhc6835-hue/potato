// 건물을 눌렀을 때 올라오는 바텀시트들.

import { ui, useUi, openSheet, closeSheet, bump, toast } from "./store";
import { Sheet, BuyBtn, BuyMode, FoodIcon, ManagerFace, Bar, PotatoIcon } from "./common";
import { MENU, PREP_NAME, COOK_NAME, FINISH_NAME, CATEGORY_NAME } from "../data/menus";
import { regionById } from "../data/regions";
import { RARITY_NAME, RARITY_COLOR, traitsOf } from "../data/managers";
import { featureOn, CHAPTERS, LAST_CHAPTER } from "../data/story";
import * as E from "../sim/econ";
import * as G from "../sim/game";
import { fmt, won, pct, cnt } from "../util/format";
import { bossCarry } from "../sim/boss";
import type { BranchState } from "../sim/state";

export function Sheets() {
  useUi();
  const sh = ui.sheet;
  if (!sh) return null;
  const b = G.activeBranch(ui.s);
  switch (sh.kind) {
    case "line": return b.lines[sh.i] ? <LineSheet b={b} i={sh.i} /> : null;
    case "build": return <BuildSheet b={b} />;
    case "swap": return <SwapSheet b={b} i={sh.i} />;
    case "hall": return <HallSheet b={b} />;
    case "lift": return <LiftSheet b={b} />;
    case "storage": return <StorageSheet b={b} />;
    case "roof": return <RoofSheet b={b} />;
    case "goals": return <GoalsSheet />;
    case "assign": return <AssignSheet b={b} slot={sh.slot} line={sh.line} />;
  }
  return null;
}

// ---------------------------------------------------------------- 매니저 자리

function ManagerSlot({ b, slot, line, id }: { b: BranchState; slot: "line" | "lift" | "counter" | "porter"; line: number; id: number | null }) {
  const s = ui.s;
  if (!featureOn(s, "managers")) return null;
  const m = E.managerOf(s, id);
  const hint = slot === "line" ? "조리 매니저가 있으면 사장 없이도 계속 조리한다" : slot === "lift" ? "덤웨이터 매니저가 있으면 음식을 알아서 내린다" : slot === "porter" ? "운반 매니저가 있으면 감자를 알아서 주방으로 나른다" : "카운터 매니저가 있으면 손님 응대가 빨라진다";
  return (
    <>
      <div class="section"><span>매니저</span></div>
      <div class="item" onClick={() => openSheet({ kind: "assign", slot, line })} style={{ cursor: "pointer" }}>
        <div class="ico">{m ? <ManagerFace look={m.data.look} /> : "＋"}</div>
        <div class="info">
          {m ? (
            <>
              <div class="name">{m.data.name} <span style={{ color: RARITY_COLOR[m.data.rarity], fontSize: 10 }}>{RARITY_NAME[m.data.rarity]}</span></div>
              <div class="stat">효율 ×{m.data.power.toFixed(2)} · {traitsOf(m.data).map((t) => t.name).join(", ")}</div>
            </>
          ) : (
            <>
              <div class="name">비어 있음</div>
              <div class="stat">{hint}</div>
            </>
          )}
        </div>
        <span class="muted">›</span>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- 라인

function LineSheet({ b, i }: { b: BranchState; i: number }) {
  const s = ui.s, l = b.lines[i], m = MENU[l.menu];
  const bn = E.bottleneck(l);
  const rate = E.lineRate(s, b, l);
  const names = [PREP_NAME[m.prep], COOK_NAME[m.cook], FINISH_NAME[m.finish]];
  const roles = ["손질", "조리", "마무리"];
  const others = G.buildableMenus(s, b);
  return (
    <Sheet title={<>{m.name} <span class="muted" style={{ fontSize: 11 }}>{i + 1}층 · {CATEGORY_NAME[m.cat]}</span></>} sub={m.desc}>
      <div class="item">
        <div class="ico"><FoodIcon id={m.id} /></div>
        <div class="info">
          <div class="stat">생산 <b class="acc">{fmt(rate)}</b>개/초 · 판매가 {won(E.salePrice(s, b, m))}</div>
          <div class="stat">감자 통 {cnt(l.bin)}/{cnt(E.binCap(s, b, l))} · {i > 0 ? `트레이 ${cnt(l.tray)} · ` : ""}진열 {cnt(b.stock[l.menu] ?? 0)} · 1개에 감자 {fmt(E.potatoesPer(s, m))}개</div>
        </div>
      </div>
      <div class="section"><span>스테이션 — 가장 느린 곳이 속도를 정한다</span></div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 7 }}><BuyMode /></div>
      {[0, 1, 2].map((st) => {
        const [n, cost] = G.upgradeQuote(s, b, { kind: "station", line: i, st });
        const lv = l.lv[st];
        const next = E.nextMilestone(lv);
        return (
          <div class={`item ${st === bn ? "bottleneck" : ""}`}>
            <div class="info">
              <div class="name">{names[st]} <span class="lv">Lv {lv}</span> {st === bn && <span class="tag">병목</span>}</div>
              <div class="stat">{roles[st]} 속도 ×{fmt(E.power(lv))} · 다음 ×2 까지 {isFinite(next) ? next - lv : "-"}레벨</div>
            </div>
            <BuyBtn cost={cost} n={n} onBuy={() => G.upgrade(s, b, { kind: "station", line: i, st })} />
          </div>
        );
      })}
      <button class="btn ghost wide" onClick={() => { const k = G.upgradeLineEven(s, b, i, s.settings.buyMode === 0 ? 300 : s.settings.buyMode); if (!k) toast("돈이 부족하다."); bump(); }}>
        병목부터 고르게 올리기
      </button>
      <ManagerSlot b={b} slot="line" line={i} id={l.manager} />
      {others.length > 0 && (
        <>
          <div class="section"><span>메뉴 교체 (레벨 절반 유지)</span></div>
          <button class="btn ghost wide" onClick={() => openSheet({ kind: "swap", i })}>다른 메뉴로 바꾸기</button>
        </>
      )}
    </Sheet>
  );
}

function MenuChoices({ b, onPick, costMul = 1 }: { b: BranchState; onPick: (id: string) => any; costMul?: number }) {
  const s = ui.s;
  const list = G.buildableMenus(s, b).sort((x, y) => MENU[x].price - MENU[y].price);
  if (!list.length) return <div class="list-empty">지을 수 있는 메뉴가 없다. 연구소나 챕터 진행으로 새 메뉴를 얻자.</div>;
  return (
    <>
      {list.map((id) => {
        const m = MENU[id];
        const cost = E.lineBuildCost(b, id) * costMul;
        return (
          <div class="item">
            <div class="ico"><FoodIcon id={id} /></div>
            <div class="info">
              <div class="name">{m.name} <span class="muted" style={{ fontSize: 10 }}>{CATEGORY_NAME[m.cat]}</span></div>
              <div class="stat">기본가 {won(m.price * E.regionMult(b))} · {m.cycle}초 · 감자 {m.potatoes}개</div>
            </div>
            <BuyBtn cost={cost} label="짓기" onBuy={() => onPick(id)} />
          </div>
        );
      })}
    </>
  );
}

function BuildSheet({ b }: { b: BranchState }) {
  const s = ui.s;
  return (
    <Sheet title="새 주방 라인" sub="층마다 메뉴 하나. 위로 갈수록 비싼 메뉴를 올려도 된다. 순서는 상관없다.">
      <MenuChoices b={b} onPick={(id) => {
        if (G.buildLine(s, b, id)) {
          toast(`${MENU[id].name} 라인 완공`, true);
          closeSheet();
        }
      }} />
    </Sheet>
  );
}

function SwapSheet({ b, i }: { b: BranchState; i: number }) {
  const s = ui.s;
  return (
    <Sheet title="메뉴 교체" sub={`${MENU[b.lines[i].menu].name} → ? 스테이션 레벨은 절반이 남는다.`}>
      <MenuChoices b={b} costMul={0.5} onPick={(id) => {
        if (G.swapLineMenu(s, b, i, id)) {
          toast(`${MENU[id].name}(으)로 교체했다`);
          closeSheet();
        }
      }} />
    </Sheet>
  );
}

// ---------------------------------------------------------------- 홀

function HallSheet({ b }: { b: BranchState }) {
  const s = ui.s;
  const [n, cost] = G.upgradeQuote(s, b, { kind: "counter" });
  const prod = b.lines.reduce((a, l) => a + E.lineRate(s, b, l), 0);
  const traffic = E.traffic(s, b);
  const r = regionById(b.region);
  const d = E.district(b);
  const demand = b._demand ?? 0;
  return (
    <Sheet title={<>홀 & 카운터 <span class="muted" style={{ fontSize: 11 }}>{r.name} · {d.name}</span></>} sub={d.desc}>
      <div class="item">
        <div class="info">
          <div class="stat">손님 수요 <b class="acc">{fmt(demand)}</b>개/초 · 주방 생산 {fmt(prod)}개/초</div>
          <div class="stat">지금 손님 흐름 {pct(traffic)} · 별점 ★{b.rating.toFixed(2)}</div>
          <Bar v={demand > 0 ? Math.min(1, prod / demand) : 0} green />
          <div class="stat" style={{ marginTop: 4 }}>{prod < demand * 0.8 ? "손님이 더 많다. 주방을 키우자." : demand < prod * 0.8 ? "음식이 남는다. 홀을 키우거나 가격을 내려 손님을 늘리자." : "균형이 맞다."}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "8px 0 7px" }}><BuyMode /></div>
      <div class="item">
        <div class="info">
          <div class="name">카운터 <span class="lv">Lv {b.counter.lv}</span></div>
          <div class="stat">메뉴당 손님 ×{fmt(E.counterCap(s, b))} · 다음 ×2 까지 {E.nextMilestone(b.counter.lv) - b.counter.lv}레벨</div>
        </div>
        <BuyBtn cost={cost} n={n} onBuy={() => G.upgrade(s, b, { kind: "counter" })} />
      </div>
      {featureOn(s, "price") && (
        <>
          <div class="section"><span>가격</span><span class="acc">×{b.priceMult.toFixed(2)}</span></div>
          <input class="slider" type="range" min={0.6} max={2} step={0.05} value={b.priceMult} onInput={(e) => { G.setPrice(b, +(e.target as HTMLInputElement).value); bump(); }} />
          <div class="desc">비싸게 받으면 손님이 줄고, 싸게 받으면 늘어난다. 이 상권의 가격 민감도: {d.elastic >= 1.5 ? "높음" : d.elastic <= 0.6 ? "낮음" : "보통"}. 너무 비싸면 별점도 떨어진다.</div>
        </>
      )}
      {d.likes.length > 0 && <div class="desc">이 상권이 좋아하는 메뉴: {d.likes.map((c) => CATEGORY_NAME[c]).join(", ")} (+30%)</div>}
      <ManagerSlot b={b} slot="counter" line={0} id={b.counter.manager} />
    </Sheet>
  );
}

// ---------------------------------------------------------------- 덤웨이터

function LiftSheet({ b }: { b: BranchState }) {
  const s = ui.s;
  const [n, cost] = G.upgradeQuote(s, b, { kind: "lift" });
  const prod = b.lines.reduce((a, l) => a + E.lineRate(s, b, l), 0);
  const rate = E.liftRate(s, b);
  return (
    <Sheet title="덤웨이터" sub="위층 주방에서 만든 음식을 1층 카운터로 내린다. 매니저가 없으면 덤웨이터를 눌러서 한 번씩 보내야 한다.">
      <div class="item">
        <div class="info">
          <div class="stat">운반 <b class="acc">{fmt(rate)}</b>개/초 · 주방 생산 {fmt(prod)}개/초</div>
          <div class="stat">한 번에 {fmt(E.liftCapacity(s, b))}개 · 왕복 {E.liftTrip(b).toFixed(1)}초 {b.lift.manager === null ? "· 수동 운행" : "· 자동 운행"}</div>
          <Bar v={prod > 0 ? Math.min(1, rate / prod) : 1} green />
          {rate < prod * 0.9 && <div class="stat bad" style={{ marginTop: 4 }}>덤웨이터가 병목이다. 트레이에 음식이 쌓인다.</div>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "8px 0 7px" }}><BuyMode /></div>
      <div class="item">
        <div class="info">
          <div class="name">덤웨이터 <span class="lv">Lv {b.lift.lv}</span></div>
          <div class="stat">다음 ×2 까지 {E.nextMilestone(b.lift.lv) - b.lift.lv}레벨</div>
        </div>
        <BuyBtn cost={cost} n={n} onBuy={() => G.upgrade(s, b, { kind: "lift" })} />
      </div>
      <ManagerSlot b={b} slot="lift" line={0} id={b.lift.manager} />
    </Sheet>
  );
}

// ---------------------------------------------------------------- 창고

function StorageSheet({ b }: { b: BranchState }) {
  const s = ui.s;
  const [n, cost] = G.upgradeQuote(s, b, { kind: "supply" });
  const use = b.lines.reduce((a, l) => a + E.lineRate(s, b, l) * E.potatoesPer(s, MENU[l.menu]), 0);
  const sup = E.supplyRate(s, b);
  return (
    <Sheet title="지하 창고" sub="납품 트럭이 감자를 채운다. 주방까지는 사장이 직접 들고 가거나, 운반 매니저가 나른다.">
      <div class="item">
        <div class="ico"><PotatoIcon /></div>
        <div class="info">
          <div class="stat">입고 <b class="acc">{fmt(sup)}</b>개/초 · 주방 소모 {fmt(use)}개/초</div>
          <div class="stat">보관 {cnt(b.storage)} / {cnt(E.storageCap(b))} · 감자 한 개 {won(E.potatoPrice(s, b))}</div>
          {featureOn(s, "farm") && <div class="stat">농장 직송 {pct(E.farmShare(s))} 무료 · 비축분 {fmt(s.market.bank)}개</div>}
          <Bar v={use > 0 ? Math.min(1, sup / use) : 1} green />
          {sup < use * 0.95 && <div class="stat bad" style={{ marginTop: 4 }}>감자가 모자라다. 입고량을 늘리자.</div>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "8px 0 7px" }}><BuyMode /></div>
      <div class="item">
        <div class="info">
          <div class="name">창고 <span class="lv">Lv {b.supply.lv}</span></div>
          <div class="stat">납품량·보관량·운반량 증가 · 다음 ×2 까지 {E.nextMilestone(b.supply.lv) - b.supply.lv}레벨</div>
        </div>
        <BuyBtn cost={cost} n={n} onBuy={() => G.upgrade(s, b, { kind: "supply" })} />
      </div>
      <div class="item">
        <div class="info">
          {b.id === "b0" && <div class="stat">사장이 한 번에 드는 감자 {fmt(bossCarry(s, b))}개</div>}
          <div class="stat">운반 {b.supply.manager !== null ? `${fmt(E.porterRate(s, b))}개/초 (자동)` : b.staff ? `${fmt(E.porterRate(s, b))}개/초 (기본 직원)` : "수동: 창고를 누르면 사장이 나른다"}</div>
        </div>
      </div>
      <ManagerSlot b={b} slot="porter" line={0} id={b.supply.manager} />
    </Sheet>
  );
}

// ---------------------------------------------------------------- 증축

function RoofSheet({ b }: { b: BranchState }) {
  const s = ui.s;
  const r = regionById(b.region);
  const max = Math.min(E.MAX_FLOORS, G.maxFloors(s));
  return (
    <Sheet title={`${r.name} · ${E.district(b).name}`} sub={`매출 배수 ×${fmt(r.mult)} · 누적 매출 ${won(b.revenue)}`}>
      {featureOn(s, "floors") ? (
        <div class="item">
          <div class="info">
            <div class="name">건물 증축 <span class="lv">{b.maxLines + 1}/{max + 1}층</span></div>
            <div class="stat">주방 라인을 지을 층이 하나 늘어난다. 2층부터는 덤웨이터로 음식을 내려야 한다.</div>
          </div>
          <BuyBtn cost={b.maxLines >= max ? Infinity : E.floorCost(b)} label="증축" onBuy={() => { if (G.addFloor(s, b)) { toast("한 층 올렸다", true); ui.scene.focusFloor(b.maxLines - 1); } }} />
        </div>
      ) : (
        <div class="desc">챕터 2에서 증축할 수 있다.</div>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- 목표

function GoalsSheet() {
  const s = ui.s;
  if (s.chapter > LAST_CHAPTER) {
    return (
      <Sheet title="엔딩 이후" sub="계속 플레이">
        <div class="desc">지도 끝의 신시장, 브랜드 리부트, 도감과 업적이 기다리고 있다.</div>
        <div class="item"><div class="info"><div class="name">신시장 개척</div><div class="stat">최고 {s.bestMarket}곳</div></div></div>
      </Sheet>
    );
  }
  const c = G.chapterDef(s);
  const done = G.chapterDone(s);
  return (
    <Sheet title={`챕터 ${c.n}. ${c.title}`} sub="목표를 모두 채우면 다음 챕터로 넘어간다.">
      {c.goals.map((g) => {
        const [a, t] = g.prog(s);
        const ok = s.goals[g.id] || a >= t;
        return (
          <div class="item">
            <div class="info">
              <div class="name">{ok ? "✅" : "▫️"} {g.text}</div>
              <div class="stat">{cnt(Math.min(a, t))} / {cnt(t)}</div>
              <Bar v={a / t} green={ok} />
            </div>
          </div>
        );
      })}
      <button class="btn wide" disabled={!done} onClick={() => { closeSheet(); advance(); }}>
        {done ? "다음 챕터로" : "아직 남은 목표가 있다"}
      </button>
      <div class="section"><span>지난 챕터</span></div>
      {CHAPTERS.filter((x) => x.n < s.chapter).map((x) => (
        <div class="desc">✓ {x.n}. {x.title}</div>
      ))}
    </Sheet>
  );
}

export function advance() {
  const s = ui.s;
  const c = G.chapterDef(s);
  const reward = G.advanceChapter(s);
  if (reward === false) return;
  const after = () => {
    toast(`챕터 보상 ${won(reward)}`, true);
    if (s.ended && s.chapter === LAST_CHAPTER + 1) ui.modal = { kind: "ending" };
    bump();
  };
  // 아웃트로 → 다음 챕터 카드와 인트로
  ui.dialog = [...c.outro];
  ui.dialogKey = `out-${c.n}`;
  (ui as any).afterDialog = () => {
    after();
    startChapterIntro();
  };
  bump();
}

export function startChapterIntro() {
  const s = ui.s;
  if (s.chapter > LAST_CHAPTER) return;
  const c = G.chapterDef(s);
  if (s.seen[`in-${c.n}`]) return;
  ui.chapterCard = { n: c.n, title: c.title, until: performance.now() + 1800 };
  bump();
  setTimeout(() => {
    ui.chapterCard = null;
    ui.dialog = [...c.intro];
    ui.dialogKey = `in-${c.n}`;
    bump();
  }, 1800);
}

// ---------------------------------------------------------------- 매니저 배치

function AssignSheet({ b, slot, line }: { b: BranchState; slot: "line" | "lift" | "counter" | "porter"; line: number }) {
  const s = ui.s;
  const current = G.slotHolder(b, slot, line);
  const list = [...s.managers].sort((x, y) => (x.at ? 1 : 0) - (y.at ? 1 : 0) || y.data.power - x.data.power);
  const back = () => openSheet(slot === "line" ? { kind: "line", i: line } : slot === "lift" ? { kind: "lift" } : slot === "porter" ? { kind: "storage" } : { kind: "hall" });
  return (
    <Sheet title="매니저 배치" sub="다른 곳에서 일하던 매니저를 데려오면 그 자리는 빈다.">
      {current !== null && current !== undefined && (
        <button class="btn ghost wide" style={{ marginBottom: 8 }} onClick={() => { G.unassign(s, current); back(); }}>현재 매니저 빼기</button>
      )}
      {!list.length && <div class="list-empty">고용한 매니저가 없다. 아래 '직원' 탭에서 고용하자.</div>}
      {list.map((m) => {
        const where = m.at ? s.branches.find((x) => x.id === m.at!.branch) : null;
        const whereText = m.at && where ? `${regionById(where.region).name} ${m.at.slot === "line" ? (where.lines[m.at.line] ? MENU[where.lines[m.at.line].menu].name : "") : m.at.slot === "lift" ? "덤웨이터" : m.at.slot === "porter" ? "창고 운반" : "카운터"}` : "대기 중";
        const fit = traitsOf(m.data).filter((t) => !t.slot || t.slot === slot);
        return (
          <div class="item" style={{ cursor: "pointer", opacity: m.data.id === current ? 0.5 : 1 }} onClick={() => { G.assign(s, m.data.id, b, slot, line); back(); }}>
            <div class="ico"><ManagerFace look={m.data.look} /></div>
            <div class="info">
              <div class="name">{m.data.name} <span style={{ color: RARITY_COLOR[m.data.rarity], fontSize: 10 }}>{RARITY_NAME[m.data.rarity]}</span></div>
              <div class="stat">×{m.data.power.toFixed(2)} · {fit.map((t) => t.name).join(", ") || "특성 해당 없음"}</div>
              <div class="stat muted">{whereText}</div>
            </div>
          </div>
        );
      })}
    </Sheet>
  );
}
