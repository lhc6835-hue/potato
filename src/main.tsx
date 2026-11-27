// 진입점: 화면(canvas)과 UI를 붙이고, 게임 루프·자동 저장·오프라인 보상을 돌린다.
import { render } from "preact";
import "galmuri/dist/galmuri.css";
import "./ui/style.css";
import { App } from "./ui/App";
import { View } from "./engine/view";
import { G } from "./game/world";
import * as St from "./game/state";
import { S } from "./game/state";
import { audio, applyVolumes, unlockAudio, startMusic } from "./engine/audio";
import { claimable } from "./game/actions";

audio.sfx = S.opts.sfx;
audio.music = S.opts.music;

// 오프라인 보상: 동료 초당 피해 × 시간 × 효율 → 골드
let offline: { secs: number; gold: number } | null = null;
{
  const secs = Math.min((Date.now() - S.last) / 1000, St.offlineHours() * 3600);
  const dps = St.totalCrewDps();
  if (secs > 60 && dps > 0) {
    const gold = dps * secs * St.offlineEff() * (St.goldPerDmg() + 0.3) * St.goldMul();
    S.gold += gold;
    offline = { secs, gold };
  }
}

const view = new View(document.createElement("canvas"));
view.canvas.className = "scene";

function mount(el: HTMLDivElement) {
  el.prepend(view.canvas);
  const fit = () => view.fit(el.clientWidth, el.clientHeight);
  new ResizeObserver(fit).observe(el);
  fit();
  G.attach(view);
  // 입력: 주 포인터 하나만
  let active: number | null = null;
  const c = view.canvas;
  c.addEventListener("pointerdown", (e) => {
    unlockAudio(); applyVolumes(); startMusic();
    if (active !== null) return;
    active = e.pointerId;
    c.setPointerCapture(e.pointerId);
    const [x, y] = view.toLogical(e.clientX, e.clientY);
    G.pointer("down", x, y);
    e.preventDefault();
  });
  c.addEventListener("pointermove", (e) => {
    if (e.pointerId !== active) return;
    const evs = (e.getCoalescedEvents?.() ?? [e]) as PointerEvent[];
    for (const ev of evs) { const [x, y] = view.toLogical(ev.clientX, ev.clientY); G.pointer("move", x, y); }
  });
  const up = (e: PointerEvent) => {
    if (e.pointerId !== active) return;
    active = null;
    const [x, y] = view.toLogical(e.clientX, e.clientY);
    G.pointer("up", x, y);
  };
  c.addEventListener("pointerup", up);
  c.addEventListener("pointercancel", up);
  c.addEventListener("contextmenu", (e) => e.preventDefault());

  let last = performance.now();
  const loop = (t: number) => {
    const dt = (t - last) / 1000;
    last = t;
    G.update(dt);
    G.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

render(<App offline={offline} mount={mount} />, document.getElementById("app")!);

setInterval(() => St.save(), 10000);
document.addEventListener("visibilitychange", () => { if (document.hidden) St.save(); });
window.addEventListener("pagehide", () => St.save());
void claimable;
