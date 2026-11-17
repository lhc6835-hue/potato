import { render } from "preact";
import "./ui/style.css";
import fontUrl from "galmuri/dist/Galmuri11.woff2?url";
import fontBoldUrl from "galmuri/dist/Galmuri11-Bold.woff2?url";
import { App } from "./ui/App";
import { ui } from "./ui/store";
import { load, save } from "./sim/save";
import { newGame } from "./sim/state";
import * as G from "./sim/game";
import { Scene } from "./render/scene";

async function boot() {
  try {
    const f1 = new FontFace("Galmuri11", `url(${fontUrl})`);
    const f2 = new FontFace("Galmuri11", `url(${fontBoldUrl})`, { weight: "bold" });
    document.fonts.add(f1);
    document.fonts.add(f2);
    await Promise.race([Promise.all([f1.load(), f2.load()]), new Promise((r) => setTimeout(r, 1500))]);
  } catch {}

  const loaded = load();
  const s = loaded ?? newGame();
  ui.s = s;
  if (loaded) {
    const r = G.applyOffline(s);
    if (r && r.money > 0) ui.modal = { kind: "offline", away: r.away, money: r.money };
  }
  s.lastTick = Date.now();
  G.ensureCandidates(s);
  ui.scene = new Scene(s);
  save(s);
  // 개발/테스트용 핸들
  (window as any).__game = { ui, G };
  render(<App />, document.getElementById("app")!);
}

boot();
