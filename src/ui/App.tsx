// 앱 본체: 시뮬레이션 루프, 저장, 오프라인 수익, 이벤트 알림, HUD/탭/대화/모달.

import { useEffect } from "preact/hooks";
import { ui, useUi, bump, toast, openSheet, setTab, closeSheet, type Tab } from "./store";
import { GameView } from "./GameView";
import { Sheets, advance, startChapterIntro } from "./Sheets";
import { Panels } from "./Panels";
import { Portrait, Bar } from "./common";
import { SPEAKER_NAME, featureOn, LAST_CHAPTER, FEATURE_CHAPTER } from "../data/story";
import { EVENT } from "../data/events";
import { MENU } from "../data/menus";
import * as E from "../sim/econ";
import * as G from "../sim/game";
import { bus } from "../sim/bus";
import { save } from "../sim/save";
import { sfx, unlockAudio, setSfxEnabled } from "../sfx";
import { fmt, won, duration, cnt } from "../util/format";


export function App() {
  useUi();

  // 시뮬레이션 루프 + 저장
  useEffect(() => {
    const s = ui.s;
    let uiT = 0;
    const id = setInterval(() => {
      const now = Date.now();
      let dt = (now - s.lastTick) / 1000;
      s.lastTick = now;
      if (dt > 15) {
        // 탭이 잠들어 있었다
        s.lastTick = now - dt * 1000;
        const r = G.applyOffline(s, now);
        s.lastTick = now;
        if (r && r.money > 0) {
          ui.modal = { kind: "offline", away: r.away, money: r.money };
          bump();
        }
        return;
      }
      while (dt > 0) {
        const step = Math.min(0.1, dt);
        G.tick(s, step);
        dt -= step;
      }
      uiT += 1;
      if (uiT % 2 === 0) bump();
    }, 100);
    const saver = setInterval(() => !ui.noSave && save(s), 10000);
    const hide = () => {
      if (document.visibilityState === "hidden" && !ui.noSave) save(s);
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", () => !ui.noSave && save(s));
    return () => {
      clearInterval(id);
      clearInterval(saver);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);

  // 알림
  useEffect(() => {
    setSfxEnabled(() => ui.s.settings.sound);
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    const offs = [
      () => window.removeEventListener("pointerdown", unlock),
      bus.on("sfx", (n) => sfx(n)),
      bus.on("toast", (t) => toast(t)),
      bus.on("upgrade", (d) => d.milestone && d.branch === G.activeBranch(ui.s).id && sfx("milestone")),
      bus.on("build", () => sfx("build")),
      bus.on("floor", () => sfx("build")),
      bus.on("hire", () => sfx("hire")),
      bus.on("goal", () => sfx("goal")),
      bus.on("achievement", () => sfx("achieve")),
      bus.on("chapter", () => sfx("chapter")),
      bus.on("discover", () => sfx("achieve")),
      bus.on("orderDone", () => sfx("goal")),
      bus.on("orderFail", () => sfx("bad")),
      bus.on("branch", () => sfx("build")),
      bus.on("event", (e) => sfx(EVENT[e.id].good ? "good" : "bad")),
      bus.on("achievement", (a) => toast(`🏆 업적: ${a.name}`, true)),
      bus.on("goal", (g) => {
        toast(`✅ ${g.text}`);
        if (G.chapterDone(ui.s)) toast("챕터 목표 완료! 위의 목표 카드를 눌러 다음 챕터로", true);
      }),
      bus.on("menu", (id) => ui.s.chapter > 1 && toast(`새 메뉴 해금: ${MENU[id].name}`, true)),
      bus.on("event", (e) => {
        const d = EVENT[e.id];
        toast(`${d.good ? "📣" : "⚠️"} ${d.name}: ${d.report}`, d.good);
      }),
      bus.on("order", (o) => toast(`📦 특별 주문: ${MENU[o.menu].name} ${fmt(o.need)}개`, true)),
      bus.on("orderDone", (o) => toast(`📦 주문 완료! +${won(o.reward)}`, true)),
      bus.on("orderFail", () => toast("📦 주문 시간 초과.")),
      bus.on("rivalDefeated", () => toast("고구마 그룹이 이 동네에서 철수했다.", true)),
      bus.on("hire", () => featureOn(ui.s, "managers") && ui.s.managers.length === 1 && toast("매니저를 라인에 배치하면 자동으로 조리한다. 라인 이름표를 눌러 보자.")),
    ];
    return () => offs.forEach((f) => f());
  }, []);

  // 첫 실행: 챕터 1 소개
  useEffect(() => {
    setTimeout(() => startChapterIntro(), 400);
  }, []);

  return (
    <div class="game">
      <GameView />
      <Hud />
      <SideCards />
      <Panels />
      <Sheets />
      <Tabs />
      <Toasts />
      <ChapterCard />
      <Dialog />
      <Modal />
    </div>
  );
}

// ---------------------------------------------------------------- HUD

function Hud() {
  const s = ui.s;
  const b = G.activeBranch(s);
  const h = E.hour(s.clock);
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10;
  const rush = E.isRush(h);
  const income = E.idleIncome(s);
  const ev = s.events.filter((e) => !e.branch || e.branch === b.id);
  return (
    <div class="hud">
      <div class="hud-row">
        <div class="money mono">{fmt(s.money)}<small>원</small></div>
        <div class="spacer" />
        <span class="chip">{E.isNight(h) ? "🌙" : "☀️"} {E.day(s.clock)}일 {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}</span>
        {rush && <span class="chip rush">🔥 {E.isLunch(h) ? "점심" : "저녁"} 러시</span>}
      </div>
      <div class="hud-row" style={{ marginTop: 3 }}>
        <span class="chip">📈 {fmt(income)}/초</span>
        {s.branches.length > 1 && <span class="chip">🏪 {s.branches.length}</span>}
        {featureOn(s, "research") && <span class="chip">💡 {fmt(s.research.ideas)}</span>}
        {s.prestige.golden > 0 && <span class="chip">✨ {fmt(s.prestige.golden)}</span>}
        {featureOn(s, "rival") && !s.rival.defeated && <span class="chip" style={{ color: "#c8a0e8" }}>🍠 {s.rival.share.toFixed(0)}%</span>}
      </div>
      {ev.length > 0 && (
        <div class="hud-row" style={{ marginTop: 4, flexWrap: "wrap" }}>
          {ev.map((e) => <span class={`chip ev ${EVENT[e.id].good ? "" : "bad"}`}>{EVENT[e.id].name} {Math.ceil(e.left)}초</span>)}
        </div>
      )}
      <GoalCard />
    </div>
  );
}

function GoalCard() {
  const s = ui.s;
  if (s.chapter > LAST_CHAPTER) {
    return (
      <div class="goal" onClick={() => openSheet({ kind: "goals" })}>
        <div class="t"><span>엔딩 이후</span><span>신시장 {s.bestMarket}곳</span></div>
        <div class="g"><span>지도 끝의 신시장을 개척하자</span></div>
      </div>
    );
  }
  const c = G.chapterDef(s);
  const done = G.chapterDone(s);
  const g = c.goals.find((x) => !s.goals[x.id]);
  const [a, t] = g ? g.prog(s) : [1, 1];
  const n = c.goals.filter((x) => s.goals[x.id]).length;
  return (
    <div class={`goal ${done ? "done" : ""}`} onClick={() => (done ? advance() : openSheet({ kind: "goals" }))}>
      <div class="t"><span>챕터 {c.n}. {c.title}</span><span>{n}/{c.goals.length}</span></div>
      {done ? (
        <div class="g"><span class="acc">다음 챕터로 →</span></div>
      ) : (
        <>
          <div class="g"><span>{g!.text}</span><span class="muted mono">{cnt(Math.min(a, t))}/{cnt(t)}</span></div>
          <Bar v={a / t} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 오른쪽 카드

function SideCards() {
  const s = ui.s;
  const o = s.order;
  const fixable = s.events.filter((e) => EVENT[e.id].fixable);
  if (!o && !fixable.length) return null;
  return (
    <div class="side-cards">
      {o && (
        <div class="card">
          <b>📦 특별 주문</b>
          {MENU[o.menu].name} {cnt(o.got)}/{cnt(o.need)}개
          <Bar v={o.got / o.need} green />
          <div class="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span class="muted">{Math.ceil(o.left)}초 · {fmt(o.reward)}원</span>
            <button class="btn ghost small" onClick={() => { G.declineOrder(s); bump(); }}>거절</button>
          </div>
        </div>
      )}
      {fixable.map((e) => (
        <div class="card" style={{ borderColor: "var(--bad)" }}>
          <b>⚠️ {EVENT[e.id].name}</b>
          {EVENT[e.id].desc}
          <div class="row">
            <button class="btn red small" style={{ width: "100%" }} onClick={() => { G.fixEvent(s, e.id); ui.scene.smoke(0); bump(); }}>연타해서 해결 ({Math.ceil(e.left)}초)</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- 탭바

function Tabs() {
  const s = ui.s;
  const tabs: [Tab, string, string, boolean][] = [
    ["shop", "🏪", "가게", true],
    ["staff", "👔", "직원", featureOn(s, "managers")],
    ["lab", "🧪", "연구소", featureOn(s, "research")],
    ["map", "🗺", "지도", featureOn(s, "branches")],
    ["more", "☰", "더보기", true],
  ];
  const canHire = featureOn(s, "managers") && s.money >= E.hireCost(s) && !s.prestige.rules.includes("strike");
  return (
    <div class="tabs">
      {tabs.map(([id, ic, name, on]) => (
        <button
          class={`tab ${ui.tab === id ? "on" : ""} ${on ? "" : "locked"}`}
          onClick={() => {
            if (!on) return toast(`챕터 ${id === "lab" ? FEATURE_CHAPTER.research : id === "map" ? FEATURE_CHAPTER.branches : FEATURE_CHAPTER.managers}에서 열린다`);
            closeSheet();
            setTab(ui.tab === id && id !== "shop" ? "shop" : id);
          }}
        >
          <span class="ic">{ic}</span>
          {name}
          {id === "staff" && canHire && <span class="badge" />}
          {id === "lab" && on && s.research.ideas >= 10 + s.research.tries * 4 && <span class="badge" />}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- 토스트, 챕터 카드, 대화, 모달

function Toasts() {
  return (
    <div class="toasts">
      {ui.toasts.map((t) => <div key={t.id} class={`toast ${t.gold ? "gold" : ""}`}>{t.text}</div>)}
    </div>
  );
}

function ChapterCard() {
  const c = ui.chapterCard;
  if (!c) return null;
  return (
    <div class="chapter-card">
      <div>
        <div class="num">CHAPTER {c.n}</div>
        <div class="ttl">{c.title}</div>
      </div>
    </div>
  );
}

function finishDialog() {
  ui.s.seen[ui.dialogKey] = true;
  ui.dialog = [];
  const after = (ui as any).afterDialog;
  (ui as any).afterDialog = null;
  bump();
  if (after) after();
}

function Dialog() {
  if (!ui.dialog.length) return null;
  const [who, text] = ui.dialog[0];
  const next = () => {
    sfx("next");
    ui.dialog = ui.dialog.slice(1);
    if (!ui.dialog.length) finishDialog();
    else bump();
  };
  return (
    <>
      <div class="dialog" onClick={next}>
        <div class={`dlg-box ${who === "narr" ? "narr" : ""}`}>
          {who !== "narr" && <div class="por"><Portrait who={who} /></div>}
          <div style={{ flex: 1 }}>
            {who !== "narr" && <div class="spk">{SPEAKER_NAME[who]}</div>}
            <div class="txt">{text}</div>
          </div>
          <span class="next">▼</span>
        </div>
      </div>
      <button class="btn ghost small dlg-skip" onClick={finishDialog}>건너뛰기</button>
    </>
  );
}

function Modal() {
  const m = ui.modal;
  if (!m) return null;
  const close = () => {
    ui.modal = null;
    bump();
  };
  if (m.kind === "offline")
    return (
      <div class="modal" onClick={close}>
        <div class="modal-box">
          <h3>자리를 비운 동안</h3>
          <div class="desc">{duration(m.away)} 동안 매니저들이 가게를 지켰다.</div>
          <div class="big">+{won(m.money)}</div>
          <div class="desc muted">매니저가 있는 라인만 돌아간다. 최대 {duration(G.offlineSeconds(ui.s))}.</div>
          <button class="btn wide">좋다</button>
        </div>
      </div>
    );
  if (m.kind === "confirm")
    return (
      <div class="modal">
        <div class="modal-box">
          <h3>확인</h3>
          <div class="desc">{m.text}</div>
          <div class="grid2" style={{ marginTop: 12 }}>
            <button class="btn ghost" onClick={close}>아니</button>
            <button class="btn red" onClick={() => { close(); m.ok(); }}>그래</button>
          </div>
        </div>
      </div>
    );
  if (m.kind === "ending")
    return (
      <div class="modal" onClick={close}>
        <div class="modal-box">
          <h3>감자 주식회사</h3>
          <div class="big">— 끝 —</div>
          <div class="desc">플레이 시간 {duration(ui.s.played)}<br />누적 매출 {won(ui.s.earnedAll)}<br />분점 {ui.s.branches.length}개 · 매니저 {ui.s.managers.length}명</div>
          <div class="desc acc">지도에 신시장이 열렸다. 리부트, 신시장, 도감으로 계속 플레이할 수 있다.</div>
          <button class="btn wide">계속하기</button>
        </div>
      </div>
    );
  return null;
}
