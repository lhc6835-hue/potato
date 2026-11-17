// 공용 UI 조각: 픽셀 아이콘, 초상화, 업그레이드 버튼, 시트 틀.

import { useEffect, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { createFrame, composite, painterFor } from "../vendor/pixelfx/core/index.js";
import { food, potato } from "../art/draw";
import { MENU } from "../data/menus";
import { PORTRAITS, personRows, personPal, staffLook } from "../art/people";
import { ui, closeSheet, bump } from "./store";
import { fmt } from "../util/format";
import { sfx } from "../sfx";

function PixelCanvas({ w, h, draw, size }: { w: number; h: number; draw: (p: any) => void; size?: number; key?: any }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const f = createFrame(w, h);
    const p = painterFor(f);
    p.place(0, 0);
    draw(p);
    const img = new ImageData(w, h);
    composite(f, img.data, null);
    ref.current!.getContext("2d")!.putImageData(img, 0, 0);
  });
  return <canvas ref={ref} width={w} height={h} style={size ? { width: size, height: (size * h) / w } : undefined} />;
}

export const FoodIcon = ({ id, size = 28 }: { id: string; size?: number }) => (
  <PixelCanvas w={9} h={8} size={size} draw={(p) => food(p, 1, 1, MENU[id])} />
);

export const PotatoIcon = ({ cols, size = 28 }: { cols?: [string, string, string]; size?: number }) => (
  <PixelCanvas w={7} h={6} size={size} draw={(p) => potato(p, 1, 1, 1, cols)} />
);

export function Portrait({ who, size = 56 }: { who: string; size?: number }) {
  const d = PORTRAITS[who];
  if (!d) return null;
  return <PixelCanvas w={16} h={16} size={size} draw={(p) => p.sprite(d.rows, d.pal, 0, 0)} />;
}

export function ManagerFace({ look, size = 28 }: { look: number; size?: number }) {
  const lk = staffLook(look);
  const rows = personRows(lk.style, "stand", { tie: true }).slice(0, 10);
  return <PixelCanvas w={10} h={10} size={size} draw={(p) => p.sprite(rows, personPal(lk.look), 1, 0)} />;
}

export function Sheet({ title, sub, children, full }: { title: ComponentChildren; sub?: ComponentChildren; children: ComponentChildren; full?: boolean }) {
  return (
    <>
      <div class="scrim" onClick={closeSheet} />
      <div class={`sheet ${full ? "full" : ""}`}>
        {!full && <div class="handle" />}
        <div class="sheet-head">
          <div style={{ flex: 1 }}>
            <h2>{title}</h2>
            {sub && <div class="sub">{sub}</div>}
          </div>
          <button class="close" onClick={closeSheet}>✕</button>
        </div>
        <div class="sheet-body">{children}</div>
      </div>
    </>
  );
}

/** 구매 버튼: 비용, 안 되면 비활성 */
export function BuyBtn({ cost, onBuy, label = "업그레이드", n, cls = "", currency = "원" }: { cost: number; onBuy: () => any; label?: string; n?: number; cls?: string; currency?: string }) {
  const can = (currency === "원" ? ui.s.money : currency === "황금감자" ? ui.s.prestige.golden : ui.s.research.ideas) >= cost;
  return (
    <button
      class={`btn ${cls}`}
      disabled={!can || !isFinite(cost)}
      onClick={(e) => {
        e.stopPropagation();
        const r = onBuy();
        if (r !== false && r !== null) {
          if (ui.s.settings.vibrate) navigator.vibrate?.(10);
          sfx("upgrade", 0.6);
        } else sfx("error");
        bump();
      }}
    >
      {label}
      {n && n > 1 ? ` ×${n}` : ""}
      <small>{isFinite(cost) ? `${fmt(cost)}${currency === "원" ? "" : " " + currency}` : "최대"}</small>
    </button>
  );
}

export function BuyMode() {
  const s = ui.s;
  const modes: [1 | 10 | 0, string][] = [[1, "×1"], [10, "×10"], [0, "최대"]];
  return (
    <div class="seg" style={{ width: 150 }}>
      {modes.map(([m, l]) => (
        <button class={s.settings.buyMode === m ? "on" : ""} onClick={() => { s.settings.buyMode = m; bump(); }}>{l}</button>
      ))}
    </div>
  );
}

export function Bar({ v, green }: { v: number; green?: boolean }) {
  return (
    <div class={`bar ${green ? "green" : ""}`}>
      <i style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%` }} />
    </div>
  );
}
