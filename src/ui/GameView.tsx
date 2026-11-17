// 게임 화면: 캔버스, 드래그/탭 입력, 월드 좌표 오버레이 (층 라벨, 말풍선, 떠오르는 숫자).

import { useEffect, useRef } from "preact/hooks";
import { ui, useUi, openSheet, bump, toast } from "./store";
import { layout, FH, HALL_H, BASE_H } from "../render/scene";
import { MENU } from "../data/menus";
import * as E from "../sim/econ";
import { tapLine, callLift } from "../sim/branch";
import { featureOn } from "../data/story";
import { MAX_FLOORS } from "../sim/econ";
import { maxFloors } from "../sim/game";
import { fmt, cnt } from "../util/format";

/** 화면 크기 → 논리 해상도와 배율. 기기 픽셀에 정수배로 맞춘다. */
function fit(cssW: number, cssH: number) {
  const dpr = window.devicePixelRatio || 1;
  const dev = cssW * dpr;
  const k = Math.max(1, Math.floor(dev / 192));
  const W = Math.floor(dev / k), H = Math.ceil((cssH * dpr) / k);
  return { W, H, k, dpr, cs: k / dpr };
}

export function GameView() {
  useUi();
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const dims = useRef(fit(390, 700));

  // 크기 맞추기
  useEffect(() => {
    const el = host.current!;
    const apply = () => {
      const r = el.getBoundingClientRect();
      const d = fit(r.width, r.height);
      dims.current = d;
      const cv = canvas.current!;
      cv.width = d.W;
      cv.height = d.H;
      cv.style.width = `${(d.W * d.k) / d.dpr}px`;
      cv.style.height = `${(d.H * d.k) / d.dpr}px`;
      overlay.current!.style.width = cv.style.width;
      overlay.current!.style.marginLeft = `${-(d.W * d.cs) / 2}px`;
      ui.scene.resize(d.W, d.H);
      ui.scene.focusHall(true);
      bump();
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 렌더 루프 (장면만. 시뮬레이션은 App에서)
  useEffect(() => {
    let raf = 0, last = performance.now();
    const ctx = canvas.current!.getContext("2d")!;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const sc = ui.scene;
      // 관성 스크롤
      if (!drag.current.down && Math.abs(vel.current) > 0.5) {
        sc.camY = sc.clampCam(sc.camY + vel.current * dt);
        vel.current *= Math.pow(0.04, dt);
      }
      sc.update(dt);
      sc.render(ctx);
      if (world.current) world.current.style.transform = `translate3d(0, ${-sc.camY * dims.current.cs}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 입력
  const drag = useRef({ down: false, moved: false, x: 0, y: 0, lastY: 0, lastT: 0, id: -1 });
  const vel = useRef(0);

  const onDown = (e: PointerEvent) => {
    const d = drag.current;
    d.down = true;
    d.moved = false;
    d.x = e.clientX;
    d.y = d.lastY = e.clientY;
    d.lastT = performance.now();
    d.id = e.pointerId;
    vel.current = 0;
    ui.scene.camTarget = null;
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d.down || e.pointerId !== d.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 7) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    if (d.moved) {
      const cs = dims.current.cs, now = performance.now();
      const dy = (e.clientY - d.lastY) / cs;
      ui.scene.camY = ui.scene.clampCam(ui.scene.camY - dy);
      const dtm = Math.max(1, now - d.lastT);
      vel.current = vel.current * 0.6 + (-dy / (dtm / 1000)) * 0.4;
      d.lastY = e.clientY;
      d.lastT = now;
    }
  };
  const onUp = (e: PointerEvent) => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    if (performance.now() - d.lastT > 80) vel.current = 0;
    if (d.moved) return;
    const r = canvas.current!.getBoundingClientRect();
    const cs = dims.current.cs;
    tap((e.clientX - r.left) / cs, (e.clientY - r.top) / cs);
  };
  const onWheel = (e: WheelEvent) => {
    ui.scene.camTarget = null;
    ui.scene.camY = ui.scene.clampCam(ui.scene.camY + e.deltaY / dims.current.cs / 2);
  };

  const tap = (lx: number, ly: number) => {
    const s = ui.s, sc = ui.scene, b = sc.branch();
    const h = sc.hit(lx, ly);
    if (!h) return;
    if (h.kind === "line") {
      const l = b.lines[h.i];
      if (tapLine(s, b, l)) sc.tapFx(h.i);
      else if (b.storage < 1) toast("감자가 없다. 창고를 확인하자.");
      if (s.settings.vibrate) navigator.vibrate?.(8);
      bump();
    } else if (h.kind === "empty") openSheet({ kind: "build", i: h.i });
    else if (h.kind === "hall") openSheet({ kind: "hall" });
    else if (h.kind === "lift") {
      callLift(b);
      openSheet({ kind: "lift" });
    } else if (h.kind === "storage") openSheet({ kind: "storage" });
    else if (h.kind === "roof") openSheet({ kind: "roof" });
  };

  return (
    <div class="view" ref={host} onPointerDown={onDown as any} onPointerMove={onMove as any} onPointerUp={onUp as any} onPointerCancel={onUp as any} onWheel={onWheel as any}>
      <canvas ref={canvas} />
      <div class="overlay" ref={overlay}>
        <div ref={world} style={{ position: "absolute", left: 0, top: 0, width: "100%" }}>
          <WorldOverlay cs={dims.current.cs} W={dims.current.W} />
        </div>
      </div>
    </div>
  );
}

function WorldOverlay({ cs, W }: { cs: number; W: number }) {
  const s = ui.s, sc = ui.scene;
  if (!sc) return null;
  const b = sc.branch();
  const L = layout(W, b);
  const px = (v: number) => `${v * cs}px`;
  const stop = (e: Event) => e.stopPropagation();
  const items: any[] = [];

  b.lines.forEach((l, i) => {
    const m = MENU[l.menu];
    const top = L.floorTop(i);
    const minLv = Math.min(...l.lv);
    const cost = E.stationCost(b, l, E.bottleneck(l));
    const can = s.money >= cost;
    items.push(
      <div
        key={`f${i}`}
        class={`floor-tag ${can ? "can" : ""}`}
        style={{ left: px(L.ix0 + 2), top: px(top + 2) }}
        onPointerDown={stop}
        onClick={(e) => {
          e.stopPropagation();
          openSheet({ kind: "line", i });
        }}
      >
        {l.manager !== null ? "👔" : "🧑‍🍳"} {m.name} <span class="lv">Lv{minLv}</span>
        {can && <span class="dot" />}
      </div>,
    );
    if (l.manager === null && (!l.cooking || l.auto))
      items.push(
        <div key={`h${i}`} class="hint" style={{ left: px(L.ix0 + 48), top: px(top + 19), animation: l.auto ? "none" : undefined, opacity: l.auto ? 0.75 : 1 }}>
          {l.auto ? "알바생 조리 중 · 눌러서 가속" : "눌러서 조리"}
        </div>,
      );
  });

  for (let i = b.lines.length; i < L.floors; i++) {
    const top = L.floorTop(i);
    items.push(
      <div key={`e${i}`} class="floor-tag can" style={{ left: px(L.ix0 + 34), top: px(top + 14) }} onPointerDown={stop} onClick={(e) => { e.stopPropagation(); openSheet({ kind: "build", i }); }}>
        ＋ 새 주방 라인 짓기
      </div>,
    );
  }

  if (featureOn(s, "floors") && b.maxLines < Math.min(MAX_FLOORS, maxFloors(s))) {
    const cost = E.floorCost(b);
    items.push(
      <div key="addfloor" class={`floor-tag ${s.money >= cost ? "can" : ""}`} style={{ left: px(L.bx + 4), top: px(L.roofTop + 4) }} onPointerDown={stop} onClick={(e) => { e.stopPropagation(); openSheet({ kind: "roof" }); }}>
        🏗 증축 <span class="lv">{fmt(cost)}</span>
      </div>,
    );
  }

  items.push(
    <div key="hall" class="floor-tag" style={{ left: px(L.ix0 + 2), top: px(-HALL_H + 2) }} onPointerDown={stop} onClick={(e) => { e.stopPropagation(); openSheet({ kind: "hall" }); }}>
      {b.counter.manager !== null ? "👔" : "🧾"} 홀 <span class="lv">Lv{b.counter.lv}</span> <span style={{ color: "#ffd27a" }}>★{b.rating.toFixed(1)}</span>
    </div>,
    <div key="lift" class="floor-tag" style={{ left: px(L.sx0 - 6), top: px(-HALL_H - 12) }} onPointerDown={stop} onClick={(e) => { e.stopPropagation(); openSheet({ kind: "lift" }); }}>
      🛗 <span class="lv">Lv{b.lift.lv}</span>
    </div>,
    <div key="sto" class={`floor-tag ${b.storage < 1 ? "warn" : ""}`} style={{ left: px(L.ix0 + 2), top: px(4) }} onPointerDown={stop} onClick={(e) => { e.stopPropagation(); openSheet({ kind: "storage" }); }}>
      🥔 창고 <span class="lv">Lv{b.supply.lv}</span> <span class="muted">{cnt(b.storage)}/{cnt(E.storageCap(b))}</span>
    </div>,
  );

  for (const bb of sc.bubbles)
    items.push(
      <div key={`b${bb.until}`} class="bubble" style={{ left: px(bb.x), top: px(bb.y) }}>
        <span class="who">{bb.who}</span>
        {bb.text}
      </div>,
    );
  for (const f of sc.floaters)
    items.push(
      <div key={`fl${f.born}${f.text}`} class={`floater ${f.kind}`} style={{ left: px(f.x), top: px(f.y) }}>
        {f.text}
      </div>,
    );

  return <>{items}</>;
}

export { FH, BASE_H };
