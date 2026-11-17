// 저장: localStorage (실패해도 게임은 돈다), 내보내기/불러오기 문자열.

import { newGame, type GameState } from "./state";

const KEY = "potato-inc-save-v1";

/** 예전 저장에 없는 필드를 새 기본값으로 채운다 */
function migrate(raw: any): GameState {
  const base = newGame() as any;
  const fill = (dst: any, src: any) => {
    for (const k of Object.keys(src)) {
      if (dst[k] === undefined) dst[k] = src[k];
      else if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k]) && typeof dst[k] === "object") fill(dst[k], src[k]);
    }
  };
  fill(raw, base);
  return raw as GameState;
}

export function load(): GameState | null {
  try {
    const t = localStorage.getItem(KEY);
    if (!t) return null;
    const raw = JSON.parse(t);
    // v1 세이브는 게임 구조가 달라서 이어 할 수 없다 (처음부터 시작)
    if (!raw || raw.v !== 2) return null;
    return migrate(raw);
  } catch {
    return null;
  }
}

export function save(s: GameState) {
  s.lastSave = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(s, (k, v) => (k.startsWith("_") ? undefined : v)));
    return true;
  } catch {
    return false;
  }
}

export function wipe() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function exportSave(s: GameState) {
  const json = JSON.stringify(s, (k, v) => (k.startsWith("_") ? undefined : v));
  return btoa(unescape(encodeURIComponent(json)));
}

export function importSave(text: string): GameState | null {
  try {
    return migrate(JSON.parse(decodeURIComponent(escape(atob(text.trim())))));
  } catch {
    return null;
  }
}
