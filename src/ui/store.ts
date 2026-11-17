// UI 상태: 게임 상태 s, 장면, 열린 시트/탭, 대화 큐, 토스트. 아주 단순한 구독 방식.

import { useEffect, useState } from "preact/hooks";
import type { GameState } from "../sim/state";
import type { Scene, Hit } from "../render/scene";
import type { Line } from "../data/story";

export type Tab = "shop" | "staff" | "lab" | "map" | "more";
export type Sheet =
  | { kind: "line"; i: number }
  | { kind: "build"; i: number }
  | { kind: "swap"; i: number }
  | { kind: "hall" }
  | { kind: "lift" }
  | { kind: "storage" }
  | { kind: "roof" }
  | { kind: "goals" }
  | { kind: "assign"; slot: "line" | "lift" | "counter"; line: number }
  | null;

export interface Toast { id: number; text: string; gold?: boolean }

export const ui = {
  s: null as unknown as GameState,
  scene: null as unknown as Scene,
  tab: "shop" as Tab,
  sheet: null as Sheet,
  dialog: [] as Line[],
  dialogKey: "",
  chapterCard: null as null | { n: number; title: string; until: number },
  toasts: [] as Toast[],
  modal: null as null | { kind: "offline"; away: number; money: number } | { kind: "reboot" } | { kind: "ending" } | { kind: "confirm"; text: string; ok: () => void },
  version: 0,
  noSave: false,
};

const subs = new Set<() => void>();
let toastId = 0;

export function bump() {
  ui.version++;
  for (const f of subs) f();
}

/** 컴포넌트를 UI 변화(그리고 주기적 틱)에 맞춰 다시 그린다 */
export function useUi() {
  const [, set] = useState(0);
  useEffect(() => {
    const f = () => set((v) => v + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  return ui;
}

export function toast(text: string, gold = false) {
  const t = { id: ++toastId, text, gold };
  ui.toasts = [...ui.toasts.slice(-3), t];
  bump();
  setTimeout(() => {
    ui.toasts = ui.toasts.filter((x) => x !== t);
    bump();
  }, 3300);
}

export function openSheet(sh: Sheet) {
  ui.sheet = sh;
  bump();
}
export function closeSheet() {
  ui.sheet = null;
  bump();
}
export function setTab(t: Tab) {
  ui.tab = t;
  ui.sheet = null;
  bump();
}

export function playDialog(key: string, lines: Line[]) {
  if (ui.s.seen[key]) return false;
  ui.dialog = [...lines];
  ui.dialogKey = key;
  bump();
  return true;
}

export type { Hit };
