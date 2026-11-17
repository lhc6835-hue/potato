// 하단 탭 패널: 직원, 연구소, 지도, 더보기(농장·시장, 본사, 엑스포, 도감, 업적, 설정).

import { useState } from "preact/hooks";
import { ui, useUi, setTab, bump, toast } from "./store";
import { Sheet, BuyBtn, FoodIcon, ManagerFace, Bar, PotatoIcon, Portrait } from "./common";
import { MENUS, MENU, CATEGORY_NAME } from "../data/menus";
import { RARITY_NAME, RARITY_COLOR, traitsOf } from "../data/managers";
import { METHODS, TOPPINGS, RECIPES, tryCost, failText } from "../data/research";
import { DISTRICTS, regionById } from "../data/regions";
import { VARIETIES } from "../data/varieties";
import { PATENTS, PATENT, patentCost, RULES } from "../data/patents";
import { ACHIEVEMENTS } from "../data/achievements";
import { CUSTOMERS } from "../data/customers";
import { EXPO_STAGES, featureOn, FEATURE_CHAPTER } from "../data/story";
import * as E from "../sim/econ";
import * as G from "../sim/game";
import { exportSave, importSave, save, wipe } from "../sim/save";
import { fmt, won, pct, duration } from "../util/format";

export function Panels() {
  useUi();
  switch (ui.tab) {
    case "staff": return <StaffPanel />;
    case "lab": return <LabPanel />;
    case "map": return <MapPanel />;
    case "more": return <MorePanel />;
  }
  return null;
}

const Full = ({ title, sub, children }: any) => (
  <div class="sheet full" style={{ zIndex: 9, bottom: "calc(58px + var(--safe-b))", animation: "fade .15s" }}>
    <div class="sheet-head">
      <div style={{ flex: 1 }}>
        <h2>{title}</h2>
        {sub && <div class="sub">{sub}</div>}
      </div>
      <button class="close" onClick={() => setTab("shop")}>✕</button>
    </div>
    <div class="sheet-body">{children}</div>
  </div>
);

// ================================================================ 직원

function StaffPanel() {
  const s = ui.s;
  G.ensureCandidates(s);
  const cost = E.hireCost(s);
  const strike = s.prestige.rules.includes("strike");
  const b = G.activeBranch(s);
  const free = s.managers.filter((m) => !m.at).length;
  return (
    <Full title="직원" sub={`고용 ${s.managers.length}명 · 대기 ${free}명`}>
      {strike ? <div class="desc bad">이번 회차 규칙: 매니저 파업. 고용할 수 없다.</div> : (
        <>
          <div class="section"><span>헤드헌팅 — 셋 중 한 명</span><span>{won(cost)}</span></div>
          {s.candidates.map((c, i) => (
            <div class="item">
              <div class="ico"><ManagerFace look={c.look} /></div>
              <div class="info">
                <div class="name">{c.name} <span style={{ color: RARITY_COLOR[c.rarity], fontSize: 10 }}>{RARITY_NAME[c.rarity]}</span></div>
                <div class="stat">효율 ×{c.power.toFixed(2)}</div>
                {traitsOf(c).map((t) => <div class="stat">· {t.name} <span class="muted">{t.desc}</span></div>)}
              </div>
              <BuyBtn cost={cost} label="고용" onBuy={() => { const m = G.hire(s, i); if (m) toast(`${m.name} 입사. "${["잘 부탁드립니다.", "감자 좋아합니다.", "…네.", "열심히 하겠습니다. 적당히."][m.id % 4]}"`); }} />
            </div>
          ))}
          <button class="btn ghost wide" disabled={s.money < E.rerollCost(s)} onClick={() => { G.reroll(s); bump(); }}>
            다른 후보 보기 ({won(E.rerollCost(s))})
          </button>
        </>
      )}
      <div class="section"><span>배치</span></div>
      <button class="btn blue wide" disabled={!free} onClick={() => { G.autoAssign(s, b); toast("빈자리에 배치했다"); bump(); }}>
        이 가게 빈자리에 자동 배치
      </button>
      <div class="section"><span>우리 직원</span></div>
      {!s.managers.length && <div class="list-empty">아직 아무도 없다. 사장님과 김비서뿐이다.</div>}
      {[...s.managers].sort((a, b2) => b2.data.rarity - a.data.rarity || b2.data.power - a.data.power).map((m) => {
        const where = m.at ? s.branches.find((x) => x.id === m.at!.branch) : null;
        return (
          <div class="item">
            <div class="ico"><ManagerFace look={m.data.look} /></div>
            <div class="info">
              <div class="name">{m.data.name} <span style={{ color: RARITY_COLOR[m.data.rarity], fontSize: 10 }}>{RARITY_NAME[m.data.rarity]}</span> <span class="lv">×{m.data.power.toFixed(2)}</span></div>
              <div class="stat">{traitsOf(m.data).map((t) => t.name).join(" · ")}</div>
              <div class="stat muted">{m.at && where ? `${regionById(where.region).name} · ${m.at.slot === "line" ? (where.lines[m.at.line] ? MENU[where.lines[m.at.line].menu].name : "?") : m.at.slot === "lift" ? "덤웨이터" : "카운터"}` : "대기 중"}</div>
            </div>
            {m.at && <button class="btn ghost small" onClick={() => { G.unassign(s, m.data.id); bump(); }}>빼기</button>}
          </div>
        );
      })}
    </Full>
  );
}

// ================================================================ 연구소

function LabPanel() {
  const s = ui.s;
  const [method, setMethod] = useState<string>("fry");
  const [top, setTop] = useState<string>("none");
  const [result, setResult] = useState<null | { ok: boolean; text: string; menu?: string }>(null);
  if (!featureOn(s, "research")) return <Full title="연구소"><div class="list-empty">챕터 {FEATURE_CHAPTER.research}에서 열린다.</div></Full>;
  const cost = tryCost(s.research.tries);
  const hint = G.nextHint(s);
  const hc = G.hintCost(s);
  return (
    <Full title="연구소" sub={`아이디어 ${fmt(s.research.ideas)} · 라인이 많을수록 빨리 쌓인다`}>
      <div class="desc">조리법과 곁들임을 하나씩 골라 시험 조리한다. 맞으면 새 메뉴, 틀리면 실패작 도감에 남는다.</div>
      <div class="section"><span>조리법</span></div>
      <div class="grid3">
        {METHODS.map((m) => <button class={`tile ${method === m.id ? "on" : ""}`} onClick={() => setMethod(m.id)}><div class="n">{m.name}</div></button>)}
      </div>
      <div class="section"><span>곁들임</span></div>
      <div class="grid3">
        {TOPPINGS.map((t) => <button class={`tile ${top === t.id ? "on" : ""}`} onClick={() => setTop(t.id)}><div class="n">{t.name}</div></button>)}
      </div>
      <div style={{ marginTop: 12 }}>
        <BuyBtn cls="wide" cost={cost} currency="아이디어" label="시험 조리" onBuy={() => {
          const r = G.tryRecipe(s, method, top);
          if (!r) return false;
          if (r.ok) {
            setResult({ ok: true, text: `새 메뉴 발견: ${MENU[r.menu].name}!`, menu: r.menu });
            toast(`레시피 발견: ${MENU[r.menu].name}`, true);
          } else setResult({ ok: false, text: r.text });
        }} />
      </div>
      {result && (
        <div class="item" style={{ marginTop: 10, borderColor: result.ok ? "var(--accent)" : "transparent" }}>
          <div class="ico">{result.menu ? <FoodIcon id={result.menu} /> : "💭"}</div>
          <div class="info"><div class="name">{result.ok ? "성공" : "결과"}</div><div class="stat">{result.text}</div></div>
        </div>
      )}
      <div class="section"><span>김비서의 메모</span></div>
      {hint ? (
        s.seen[`hint-${hint.menu}`] ? <div class="desc">"{hint.hint}"</div> : (
          <BuyBtn cls="ghost wide" cost={hc} currency="아이디어" label="힌트 듣기" onBuy={() => {
            if (s.research.ideas < hc) return false;
            s.research.ideas -= hc;
            s.seen[`hint-${hint.menu}`] = true;
          }} />
        )
      ) : <div class="desc">지금 챕터에서 찾을 수 있는 레시피는 다 찾았다.</div>}
      <div class="section"><span>발견한 레시피 {s.research.found.length}/{RECIPES.length}</span></div>
      <div class="grid2">
        {RECIPES.map((r) => {
          const f = s.research.found.includes(r.menu);
          return (
            <div class={`tile ${f ? "" : "off"}`}>
              <div class="n">{f ? MENU[r.menu].name : "???"}</div>
              <div class="d">{f ? `${METHODS.find((m) => m.id === r.method)!.name} + ${TOPPINGS.find((t) => t.id === r.top)!.name}` : `챕터 ${MENU[r.menu].chapter}~`}</div>
            </div>
          );
        })}
      </div>
    </Full>
  );
}

// ================================================================ 지도

function MapPanel() {
  const s = ui.s;
  if (!featureOn(s, "branches")) return <Full title="지도"><div class="list-empty">챕터 {FEATURE_CHAPTER.branches}에서 분점을 낼 수 있다.<br />지금은 본점 하나뿐이다.</div></Full>;
  const regions = G.availableRegions(s);
  const total = E.idleIncome(s);
  return (
    <Full title="지도" sub={`분점 ${s.branches.length}개 · 전체 수입 ${won(total)}/초`}>
      {regions.map((r) => {
        const mine = s.branches.filter((b) => b.region === r.id);
        return (
          <>
            <div class="section"><span>{r.flag ?? (r.tier === 0 ? "🏘" : r.tier === 1 ? "🏙" : "🗾")} {r.name} <span class="muted">×{fmt(r.mult)}</span></span><span>{mine.length}/{r.slots.length}</span></div>
            <div class="desc" style={{ marginTop: 0 }}>{r.desc}{r.localMenu ? ` 현지 메뉴: ${MENU[r.localMenu].name}.` : ""}</div>
            {r.slots.map((kind, i) => {
              const b = s.branches.find((x) => x.region === r.id && x.slot === i);
              const d = DISTRICTS[kind];
              if (b) {
                const idx = s.branches.indexOf(b);
                return (
                  <div class="item" style={{ cursor: "pointer", borderColor: idx === s.active ? "var(--accent)" : "transparent" }} onClick={() => { s.active = idx; setTab("shop"); }}>
                    <div class="ico">🏪</div>
                    <div class="info">
                      <div class="name">{d.name} <span class="lv">{b.lines.length}층</span> <span style={{ color: "#ffd27a", fontSize: 11 }}>★{b.rating.toFixed(1)}</span></div>
                      <div class="stat">{won(b.income)}/초 · 자동화 {pct(autoRatio(b))}</div>
                    </div>
                    <span class="muted">{idx === s.active ? "보는 중" : "가기 ›"}</span>
                  </div>
                );
              }
              const cost = E.branchCost(s, r.id, i);
              return (
                <div class="item">
                  <div class="ico" style={{ opacity: 0.5 }}>📍</div>
                  <div class="info">
                    <div class="name">{d.name} <span class="muted" style={{ fontSize: 10 }}>빈 부지</span></div>
                    <div class="stat">{d.desc}</div>
                  </div>
                  <BuyBtn cost={cost} label="개점" onBuy={() => {
                    const nb = G.openBranch(s, r.id, i);
                    if (!nb) return false;
                    toast(`${r.name} ${d.name}점 개점!`, true);
                    s.active = s.branches.length - 1;
                    setTab("shop");
                  }} />
                </div>
              );
            })}
          </>
        );
      })}
      {s.ended && <div class="desc acc" style={{ textAlign: "center", marginTop: 14 }}>신시장은 하나를 열 때마다 다음 땅이 보인다.</div>}
    </Full>
  );
}

const autoRatio = (b: any) => (b.lines.length ? b.lines.filter((l: any) => l.manager !== null).length / b.lines.length : 0);

// ================================================================ 더보기

type MoreView = "home" | "farm" | "hq" | "expo" | "codex" | "ach" | "settings";

function MorePanel() {
  const s = ui.s;
  const [v, setV] = useState<MoreView>("home");
  const tiles: [MoreView, string, string, boolean][] = [
    ["farm", "🌱 농장 & 시장", featureOn(s, "farm") ? `농장 Lv ${s.farm.lv} · 시세 ×${s.market.price.toFixed(2)}` : `챕터 ${FEATURE_CHAPTER.farm}`, featureOn(s, "farm")],
    ["hq", "🏢 본사 (리부트)", featureOn(s, "prestige") ? `황금감자 ${fmt(s.prestige.golden)}` : `챕터 ${FEATURE_CHAPTER.prestige}`, featureOn(s, "prestige")],
    ["expo", "🎪 감자 엑스포", featureOn(s, "expo") ? `${s.expo.stage}/5 단계` : `챕터 ${FEATURE_CHAPTER.expo}`, featureOn(s, "expo")],
    ["codex", "📖 도감", `메뉴 ${new Set(Object.keys(s.soldBy)).size}/${MENUS.length}`, true],
    ["ach", "🏆 업적", `${s.achievements.length}/${ACHIEVEMENTS.length} · 매출 ×${E.achievementMult(s).toFixed(2)}`, true],
    ["settings", "⚙️ 설정", "저장, 진동", true],
  ];
  if (v === "home")
    return (
      <Full title="더보기" sub={`플레이 ${duration(s.played)} · 게임 내 ${E.day(s.clock)}일째`}>
        <div class="grid2">
          {tiles.map(([id, n, d, on]) => (
            <button class={`tile ${on ? "" : "off"}`} disabled={!on} onClick={() => setV(id)} style={{ padding: 14 }}>
              <div class="n" style={{ fontSize: 14 }}>{n}</div>
              <div class="d">{d}</div>
            </button>
          ))}
        </div>
      </Full>
    );
  const back = <button class="btn ghost small" style={{ marginBottom: 10 }} onClick={() => setV("home")}>‹ 뒤로</button>;
  if (v === "farm") return <Full title="농장 & 감자 시장">{back}<FarmView /></Full>;
  if (v === "hq") return <Full title="본사">{back}<HqView /></Full>;
  if (v === "expo") return <Full title="세계 감자 엑스포">{back}<ExpoView /></Full>;
  if (v === "codex") return <Full title="도감">{back}<CodexView /></Full>;
  if (v === "ach") return <Full title="업적" sub="업적 하나마다 영구 매출 +2% (복리)">{back}<AchView /></Full>;
  return <Full title="설정">{back}<SettingsView /></Full>;
}

function FarmView() {
  const s = ui.s;
  const [amount, bankCost] = G.bankQuote(s);
  const hist = s.market.history;
  return (
    <>
      <div class="section"><span>감자 시세</span><span class={s.market.price > 1.2 ? "bad" : s.market.price < 0.8 ? "good" : ""}>×{s.market.price.toFixed(2)}</span></div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 54, background: "#00000030", borderRadius: 10, padding: 6 }}>
        {hist.length ? hist.map((h) => <div style={{ flex: 1, height: `${(h / 2.6) * 100}%`, background: h > 1.2 ? "var(--bad)" : h < 0.8 ? "var(--good)" : "var(--accent)", borderRadius: 2 }} />) : <span class="muted" style={{ fontSize: 11 }}>시세 기록이 쌓이는 중…</span>}
      </div>
      <div class="desc">쌀 때 10분치를 사 두면 비쌀 때 버틸 수 있다. 비축분은 모든 분점이 같이 쓴다.</div>
      <div class="item">
        <div class="ico"><PotatoIcon /></div>
        <div class="info"><div class="name">감자 비축</div><div class="stat">{fmt(amount)}개 · 지금 비축 {fmt(s.market.bank)}개</div></div>
        <BuyBtn cost={bankCost} label="사기" onBuy={() => G.buyBank(s)} />
      </div>
      <div class="section"><span>농장</span><span>직송 {pct(E.farmShare(s))} 무료</span></div>
      <div class="item">
        <div class="ico">🌱</div>
        <div class="info"><div class="name">농장 확장 <span class="lv">Lv {s.farm.lv}</span></div><div class="stat">감자 무료 공급 +9%, 판매가 +5% (산지 직송)</div></div>
        <BuyBtn cost={E.farmCost(s)} label="확장" onBuy={() => G.upgradeFarm(s)} />
      </div>
      <div class="section"><span>품종 — 하나를 골라 전 분점에 쓴다</span><span>{s.farm.varieties.length}/{VARIETIES.length}</span></div>
      {VARIETIES.map((v) => {
        const have = s.farm.varieties.includes(v.id);
        const locked = s.farm.lv < v.farm || (v.id === "golden" && !E.patent(s, "golden"));
        return (
          <div class="item" style={{ borderColor: s.farm.active === v.id ? "var(--accent)" : "transparent", opacity: locked && !have ? 0.5 : 1 }}>
            <div class="ico"><PotatoIcon cols={v.colors} /></div>
            <div class="info">
              <div class="name">{v.name}</div>
              <div class="stat">{v.desc}</div>
              <div class="stat acc">{bonusText(v)}</div>
            </div>
            {have ? (
              <button class="btn ghost small" disabled={s.farm.active === v.id} onClick={() => { s.farm.active = v.id; bump(); }}>{s.farm.active === v.id ? "사용 중" : "사용"}</button>
            ) : locked ? (
              <span class="muted" style={{ fontSize: 10 }}>{v.id === "golden" && !E.patent(s, "golden") ? "특허 필요" : `농장 Lv ${v.farm}`}</span>
            ) : (
              <BuyBtn cost={G.varietyCost(s, v.id)} label="재배" onBuy={() => G.unlockVariety(s, v.id)} />
            )}
          </div>
        );
      })}
    </>
  );
}

function bonusText(v: (typeof VARIETIES)[number]) {
  const b = v.bonus, out: string[] = [];
  if (b.cats) out.push(`${b.cats.map((c) => CATEGORY_NAME[c]).join("·")} +${Math.round(((b.mult ?? 1) - 1) * 100)}%`);
  if (b.potatoes) out.push(`감자 소모 -${Math.round((1 - b.potatoes) * 100)}%`);
  if (b.traffic) out.push(`손님 +${Math.round((b.traffic - 1) * 100)}%`);
  if (b.all) out.push(`전 메뉴 +${Math.round((b.all - 1) * 100)}%`);
  return out.join(", ") || "보너스 없음";
}

function HqView() {
  const s = ui.s;
  const [rules, setRules] = useState<string[]>([]);
  const gain = G.goldenGain({ ...s, prestige: { ...s.prestige, rules } } as any);
  return (
    <>
      <div class="item">
        <div class="ico"><Portrait who="sec" size={30} /></div>
        <div class="info"><div class="stat">"회사를 팔고 다시 시작하면 황금감자를 받습니다. 스토리와 업적, 도감은 그대로입니다. 돈, 가게, 직원은 처음으로 돌아갑니다."</div></div>
      </div>
      <div class="section"><span>브랜드 리부트</span><span>보유 {fmt(s.prestige.golden)} · {s.prestige.reboots}회</span></div>
      <div class="desc">이번 회차 매출 {won(s.earned)} → 황금감자 <b class="acc">+{fmt(gain)}</b>. 황금감자 1개마다 판매가 +2%.</div>
      <div class="section"><span>회차 규칙 (선택) — 어려워지는 대신 더 받는다</span></div>
      {RULES.map((r) => {
        const on = rules.includes(r.id);
        return (
          <button class={`tile ${on ? "on" : ""}`} style={{ width: "100%", marginBottom: 6 }} onClick={() => setRules(on ? rules.filter((x) => x !== r.id) : [...rules, r.id])}>
            <div class="n">{on ? "☑" : "☐"} {r.name} <span class="acc">×{r.mult}</span></div>
            <div class="d">{r.desc}</div>
          </button>
        );
      })}
      <button class="btn red wide" disabled={gain < 1} onClick={() => {
        ui.modal = { kind: "confirm", text: `정말 리부트할까? 황금감자 ${fmt(gain)}개를 받고 처음부터 시작한다.`, ok: () => { const g = G.reboot(s, rules); toast(`황금감자 +${fmt(g)}`, true); ui.scene.focusHall(true); setTab("shop"); } };
        bump();
      }}>{gain < 1 ? "아직 받을 황금감자가 없다" : `리부트 (+${fmt(gain)})`}</button>
      <div class="section"><span>특허</span></div>
      {PATENTS.map((p) => {
        const lv = E.patent(s, p.id);
        const locked = p.req && !E.patent(s, p.req);
        return (
          <div class="item" style={{ opacity: locked ? 0.5 : 1 }}>
            <div class="info">
              <div class="name">{p.name} <span class="lv">{lv}/{p.max}</span></div>
              <div class="stat">{p.desc}{locked ? ` (먼저: ${PATENT[p.req!].name})` : ""}</div>
            </div>
            <BuyBtn cost={lv >= p.max || locked ? Infinity : patentCost(p, lv)} currency="황금감자" label="취득" onBuy={() => G.buyPatent(s, p.id)} />
          </div>
        );
      })}
    </>
  );
}

function ExpoView() {
  const s = ui.s;
  return (
    <>
      <div class="desc">세계 감자의 날을 위해 엑스포를 짓는다. 5단계를 모두 지으면…</div>
      {EXPO_STAGES.map((st, i) => (
        <div class="item" style={{ opacity: i > s.expo.stage ? 0.5 : 1 }}>
          <div class="ico">{i < s.expo.stage ? "✅" : "🏗"}</div>
          <div class="info"><div class="name">{i + 1}. {st.name}</div><div class="stat">{won(st.cost)}</div></div>
          {i === s.expo.stage && <BuyBtn cost={st.cost} label="건설" onBuy={() => { if (G.investExpo(s)) toast(`${st.name} 완공`, true); }} />}
        </div>
      ))}
    </>
  );
}

function CodexView() {
  const s = ui.s;
  const [v, setV] = useState<"menu" | "cust" | "fail">("menu");
  return (
    <>
      <div class="seg" style={{ marginBottom: 10 }}>
        <button class={v === "menu" ? "on" : ""} onClick={() => setV("menu")}>메뉴</button>
        <button class={v === "cust" ? "on" : ""} onClick={() => setV("cust")}>손님 · 리뷰</button>
        <button class={v === "fail" ? "on" : ""} onClick={() => setV("fail")}>실패작</button>
      </div>
      {v === "menu" && MENUS.map((m) => {
        const sold = s.soldBy[m.id] ?? 0;
        const known = sold > 0 || s.menus.includes(m.id);
        return (
          <div class="item" style={{ opacity: known ? 1 : 0.4 }}>
            <div class="ico">{known ? <FoodIcon id={m.id} /> : "?"}</div>
            <div class="info">
              <div class="name">{known ? m.name : "???"} <span class="muted" style={{ fontSize: 10 }}>{CATEGORY_NAME[m.cat]}</span></div>
              <div class="stat">{known ? m.desc : m.country ? "어딘가의 현지 메뉴" : m.research ? "연구소에서 발견" : `챕터 ${m.chapter}`}</div>
              {sold > 0 && <div class="stat acc">판매 {fmt(sold)}개</div>}
            </div>
          </div>
        );
      })}
      {v === "cust" && CUSTOMERS.map((c) => {
        const seen = s.seenCustomers.includes(c.id);
        return (
          <div class="item" style={{ opacity: seen ? 1 : 0.4, alignItems: "flex-start" }}>
            <div class="info">
              <div class="name">{seen ? c.name : "???"}</div>
              {c.lines.map((l, i) => <div class="stat">{s.reviews.includes(`${c.id}:${i}`) ? `"${l}"` : "· · ·"}</div>)}
            </div>
          </div>
        );
      })}
      {v === "fail" && (
        s.research.fails.length ? s.research.fails.map((k) => {
          const [m, t] = k.split("+");
          return <div class="item"><div class="ico">🫠</div><div class="info"><div class="name">{METHODS.find((x) => x.id === m)?.name} + {TOPPINGS.find((x) => x.id === t)?.name}</div><div class="stat">{failText(m, t)}</div></div></div>;
        }) : <div class="list-empty">아직 실패한 적이 없다. 그건 아직 시도를 안 했다는 뜻이다.</div>
      )}
    </>
  );
}

function AchView() {
  const s = ui.s;
  return (
    <>
      {ACHIEVEMENTS.map((a) => {
        const got = s.achievements.includes(a.id);
        if (a.hidden && !got) return <div class="item" style={{ opacity: 0.35 }}><div class="ico">🔒</div><div class="info"><div class="name">숨겨진 업적</div></div></div>;
        return (
          <div class="item" style={{ opacity: got ? 1 : 0.45 }}>
            <div class="ico">{got ? "🏆" : "▫️"}</div>
            <div class="info"><div class="name">{a.name}</div><div class="stat">{a.desc}</div></div>
          </div>
        );
      })}
    </>
  );
}

function SettingsView() {
  const s = ui.s;
  const [txt, setTxt] = useState("");
  return (
    <>
      <div class="item">
        <div class="info"><div class="name">진동</div><div class="stat">탭과 구매할 때 짧게</div></div>
        <button class="btn ghost small" onClick={() => { s.settings.vibrate = !s.settings.vibrate; bump(); }}>{s.settings.vibrate ? "켬" : "끔"}</button>
      </div>
      <div class="item">
        <div class="info"><div class="name">지금 저장</div><div class="stat">10초마다 자동 저장된다</div></div>
        <button class="btn ghost small" onClick={() => toast(save(s) ? "저장했다" : "저장할 수 없는 환경이다")}>저장</button>
      </div>
      <div class="section"><span>저장 코드</span></div>
      <textarea value={txt} onInput={(e) => setTxt((e.target as HTMLTextAreaElement).value)} placeholder="여기에 붙여 넣으면 불러온다" />
      <div class="grid2" style={{ marginTop: 6 }}>
        <button class="btn ghost" onClick={() => { const code = exportSave(s); setTxt(code); navigator.clipboard?.writeText(code).then(() => toast("복사했다"), () => {}); }}>내보내기</button>
        <button class="btn ghost" onClick={() => {
          const ns = importSave(txt);
          if (!ns) return toast("코드가 이상하다");
          Object.assign(s, ns);
          s.lastTick = Date.now();
          save(s);
          toast("불러왔다");
          setTab("shop");
        }}>불러오기</button>
      </div>
      <div class="section"><span>처음부터</span></div>
      <button class="btn red wide" onClick={() => { ui.modal = { kind: "confirm", text: "모든 진행이 사라진다. 정말 지울까?", ok: () => { ui.noSave = true; wipe(); location.reload(); } }; bump(); }}>데이터 삭제</button>
      <div class="desc" style={{ marginTop: 16 }}>이펙트 엔진: pixelfx (MIT, patch-gg). 폰트: Galmuri (OFL).</div>
    </>
  );
}
