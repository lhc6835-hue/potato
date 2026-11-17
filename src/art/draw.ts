// 코드로 그리는 픽셀 아트: 음식 아이콘, 주방 시설, 소품.
// 좌표는 월드 픽셀. (x, y)는 보통 바닥 기준 왼쪽 아래.

import { hex } from "../vendor/pixelfx/core/index.js";
import type { MenuDef, PrepKind, CookKind, FinishKind } from "../data/menus";

const cache = new Map<string, number>();
export const C = (h: string): number => {
  let v = cache.get(h);
  if (v === undefined) cache.set(h, (v = hex(h)));
  return v!;
};

// 공용 색
export const K = {
  steelD: "#5a6470", steel: "#8a96a2", steelL: "#c4ccd4", steelH: "#e8eef2",
  woodD: "#6a4430", wood: "#98663e", woodL: "#c08a56",
  ink: "#2a2228", white: "#f6f4ee", red: "#c8463a", redD: "#8a2a24", yellow: "#f0c040",
  counter: "#d8cfc2", counterD: "#a89a8a", counterL: "#ece6dc",
};

// ---------------------------------------------------------------- 음식

/** 메뉴 아이콘 7x6, (x, y)는 왼쪽 위 */
export function food(p: any, x: number, y: number, m: MenuDef) {
  const [d, c, l] = m.colors.map(C);
  switch (m.finish) {
    case "box": // 빨간 종이 상자 + 막대들
      p.px(x + 1, y, l); p.px(x + 3, y, c); p.px(x + 5, y, l);
      p.rect(x + 1, y + 1, 5, 1, c); p.px(x + 2, y + 1, l); p.px(x + 4, y + 1, l);
      p.rect(x, y + 2, 7, 4, C(K.red)); p.rect(x, y + 5, 7, 1, C(K.redD)); p.px(x + 3, y + 3, C(K.yellow));
      break;
    case "bowl":
      p.rect(x + 1, y + 1, 5, 2, c); p.px(x + 2, y + 1, l); p.px(x + 3, y, l); p.px(x + 4, y + 2, d);
      p.rect(x, y + 3, 7, 2, C(K.white)); p.rect(x + 1, y + 5, 5, 1, C("#c8c2b8"));
      break;
    case "cup":
      p.rect(x + 1, y + 1, 5, 1, l); p.rect(x + 1, y + 2, 5, 4, C("#e8e2d6")); p.rect(x + 1, y + 2, 1, 4, C(K.white));
      p.rect(x + 2, y + 3, 3, 1, C(K.red)); p.px(x + 6, y + 3, C("#c8c2b8"));
      break;
    case "wrap":
      p.rect(x + 1, y, 5, 3, c); p.px(x + 2, y, l); p.px(x + 4, y + 1, l); p.px(x + 3, y + 2, d);
      p.rect(x, y + 3, 7, 3, C("#e8d8b0")); p.px(x + 3, y + 4, C("#c8a868")); p.rect(x, y + 5, 7, 1, C("#c8b488"));
      break;
    default: // plate
      p.rect(x + 1, y + 2, 5, 2, c); p.px(x + 2, y + 2, l); p.px(x + 3, y + 1, l); p.px(x + 4, y + 3, d); p.px(x + 2, y + 1, c);
      p.rect(x, y + 4, 7, 1, C(K.white)); p.rect(x + 1, y + 5, 5, 1, C("#c8c2b8"));
  }
}

/** 감자 한 알 (5x4) */
export function potato(p: any, x: number, y: number, v = 0, cols: [string, string, string] = ["#8a6030", "#c8964e", "#ecc98a"]) {
  const [d, c, l] = cols.map(C);
  if (v % 2) {
    p.rect(x + 1, y, 3, 1, c); p.rect(x, y + 1, 5, 2, c); p.rect(x + 1, y + 3, 3, 1, d); p.px(x + 1, y + 1, l); p.px(x + 3, y + 2, d);
  } else {
    p.rect(x + 1, y, 2, 1, c); p.rect(x, y + 1, 4, 2, c); p.rect(x + 1, y + 3, 3, 1, d); p.px(x + 1, y + 1, l); p.px(x + 2, y + 2, d);
  }
}

// ---------------------------------------------------------------- 주방 카운터 공통

export const ST_W = 24;

/** 스테인리스 작업대 (폭 ST_W, 높이 11), (x, y)는 왼쪽 아래 바닥 */
export function counterBase(p: any, x: number, y: number, w = ST_W) {
  p.rect(x, y - 11, w, 2, C(K.steelH));
  p.rect(x, y - 9, w, 1, C(K.steelL));
  p.rect(x + 1, y - 8, w - 2, 7, C(K.steel));
  p.rect(x + 1, y - 8, 1, 7, C(K.steelL));
  p.rect(x + w - 2, y - 8, 1, 7, C(K.steelD));
  p.rect(x + 3, y - 6, w - 6, 1, C(K.steelD));
  p.rect(x + 1, y - 1, w - 2, 1, C(K.steelD));
}

// ---------------------------------------------------------------- 손질

export function prepStation(p: any, kind: PrepKind, x: number, y: number, t: number, busy: boolean, m: MenuDef) {
  counterBase(p, x, y);
  const top = y - 11;
  const [, c, l] = m.colors.map(C);
  const bob = busy ? Math.floor(t * 8) % 2 : 0;
  switch (kind) {
    case "wash": // 개수대 + 수도꼭지 + 물방울
      p.rect(x + 4, top - 1, 14, 2, C("#6a8aa8"));
      p.rect(x + 4, top - 1, 14, 1, C("#9ac0e0"));
      p.rect(x + 16, top - 7, 2, 6, C(K.steelD)); p.rect(x + 13, top - 7, 4, 1, C(K.steelD));
      if (busy) for (let i = 0; i < 2; i++) p.px(x + 13, top - 5 + ((Math.floor(t * 12) + i * 2) % 4), C("#bfe2ff"));
      potato(p, x + 6, top - 3 - bob, 0);
      break;
    case "peel": // 감자 + 껍질 조각
      p.rect(x + 3, top - 1, 18, 1, C(K.woodL));
      potato(p, x + 8, top - 4, 1, ["#c8a868", "#f0dca0", "#fff4cc"]);
      if (busy) { p.px(x + 14 + bob, top - 6, C("#9a6a3a")); p.px(x + 16, top - 4 - bob, C("#8a5a2a")); }
      break;
    case "cut":
    case "slice":
    case "spiral": // 도마 + 칼
      p.rect(x + 3, top - 2, 18, 2, C(K.woodL)); p.rect(x + 3, top - 1, 18, 1, C(K.wood));
      for (let i = 0; i < 3; i++) p.rect(x + 5 + i * 2, top - 3, 1, 1, kind === "spiral" ? C(K.yellow) : l);
      potato(p, x + 11, top - 6, 0);
      // 칼: 바쁘면 위아래로
      p.rect(x + 16, top - 6 - bob * 2, 1, 4, C(K.steelH)); p.rect(x + 16, top - 8 - bob * 2, 1, 2, C(K.woodD));
      break;
    case "mash": // 볼 + 매셔
      p.rect(x + 6, top - 4, 12, 4, C("#d8d2c8")); p.rect(x + 7, top - 5, 10, 1, C("#ece6dc")); p.rect(x + 8, top - 4, 8, 1, l);
      p.rect(x + 12, top - 11 + bob * 2, 1, 6, C(K.woodD)); p.rect(x + 10, top - 5 + bob * 2, 5, 1, C(K.steelL));
      break;
    case "grate": // 강판
      p.rect(x + 5, top - 2, 14, 2, C(K.woodL));
      p.rect(x + 12, top - 10, 5, 8, C(K.steelL)); for (let i = 0; i < 3; i++) p.px(x + 14, top - 8 + i * 2, C(K.steelD));
      potato(p, x + 6 + bob, top - 6, 1);
      p.rect(x + 7, top - 2, 4, 1, l);
      break;
    case "shape": // 반죽 성형
      p.rect(x + 3, top - 1, 18, 1, C("#e8dcc0"));
      for (let i = 0; i < 3; i++) p.rect(x + 5 + i * 5, top - 3, 3, 2, i === 2 && busy && bob ? l : c);
      break;
  }
}

// ---------------------------------------------------------------- 조리

/** 조리 기구. 이펙트 앵커 (x, y)를 돌려준다 */
export function cookStation(p: any, kind: CookKind, x: number, y: number, t: number, busy: boolean): { fx: "steam" | "oil" | "sizzle" | "oven" | "frost" | null; ax: number; ay: number } {
  const top = y - 11;
  switch (kind) {
    case "fry": {
      // 튀김기: 몸체 + 기름 + 바구니 손잡이
      p.rect(x, top - 1, ST_W, 12, C(K.steelD)); p.rect(x + 1, top, ST_W - 2, 10, C(K.steel)); p.rect(x + 1, top, 1, 10, C(K.steelL));
      p.rect(x + 3, top + 4, 18, 1, C(K.steelD)); p.rect(x + 9, top + 6, 6, 2, C("#2a2a30")); p.px(x + 10, top + 6, C(busy ? "#ff6a3a" : "#5a3a3a"));
      p.rect(x + 2, top - 2, 20, 1, C(K.steelH));
      p.rect(x + 18, top - 7, 1, 5, C(K.steelD)); p.rect(x + 17, top - 8, 3, 1, C(K.ink));
      return { fx: busy ? "oil" : null, ax: x + 11, ay: top - 1 };
    }
    case "steam":
    case "boil":
    case "pot": {
      counterBase(p, x, y);
      // 화구 + 냄비
      p.rect(x + 4, top - 1, 16, 1, C("#3a3a40"));
      if (busy) { p.px(x + 7, top - 1, C("#5a8aff")); p.px(x + 12, top - 1, C("#5a8aff")); p.px(x + 16, top - 1, C("#5a8aff")); p.light(x + 12, top - 1, C("#4a7aff"), 0.5); }
      const potC = kind === "steam" ? "#c8a878" : "#7a7e88";
      p.rect(x + 5, top - 8, 14, 7, C(potC)); p.rect(x + 5, top - 8, 14, 1, C(kind === "steam" ? "#e0c898" : "#aab0ba"));
      p.rect(x + 5, top - 8, 1, 7, C(kind === "steam" ? "#e0c898" : "#aab0ba"));
      if (kind === "steam") { p.rect(x + 5, top - 5, 14, 1, C("#a88a5a")); p.rect(x + 6, top - 10, 12, 2, C("#d8bc88")); p.rect(x + 11, top - 11, 2, 1, C("#a88a5a")); }
      else { p.rect(x + 4, top - 9, 16, 1, C("#5a5e68")); p.rect(x + 3, top - 6, 2, 1, C("#5a5e68")); p.rect(x + 19, top - 6, 2, 1, C("#5a5e68")); }
      return { fx: busy ? "steam" : null, ax: x + 12, ay: top - 10 };
    }
    case "pan": {
      counterBase(p, x, y);
      p.rect(x + 2, top - 2, 20, 2, C("#2e2e34")); p.rect(x + 2, top - 2, 20, 1, C("#4a4a52"));
      if (busy) { p.rect(x + 6, top - 3, 5, 1, C("#e0b050")); p.rect(x + 13, top - 3, 5, 1, C("#d8a040")); p.glow(x + 12, top - 2, 10, C("#ff9a3a"), 0.15); }
      return { fx: busy ? "sizzle" : null, ax: x + 12, ay: top - 3 };
    }
    case "oven": {
      p.rect(x, top - 10, ST_W, 21, C(K.steelD)); p.rect(x + 1, top - 9, ST_W - 2, 19, C(K.steel)); p.rect(x + 1, top - 9, 1, 19, C(K.steelL));
      p.rect(x + 3, top - 4, 18, 9, C("#2a2a30"));
      const glow = busy ? 0.5 + 0.2 * Math.sin(t * 4) : 0;
      p.rect(x + 4, top - 3, 16, 7, C(busy ? "#c8582a" : "#3a3a40"));
      if (busy) { p.rect(x + 4, top + 1, 16, 1, C("#ff9a4a")); p.light(x + 12, top, C("#ff7a3a"), glow); p.glow(x + 12, top, 14, C("#ff8a3a"), glow * 0.25); }
      p.rect(x + 4, top - 8, 3, 2, C(K.ink)); p.rect(x + 9, top - 8, 3, 2, C(K.ink)); p.px(x + 18, top - 7, C(busy ? "#ff4a2a" : "#4a2a2a"));
      p.rect(x + 3, top - 5, 18, 1, C(K.steelH));
      return { fx: null, ax: x + 12, ay: top - 10 };
    }
    case "freeze": {
      p.rect(x, top - 12, ST_W, 23, C("#c8d4e0")); p.rect(x + 1, top - 11, ST_W - 2, 21, C("#e4eef6")); p.rect(x + 1, top - 11, 1, 21, C(K.white));
      p.rect(x + 1, top - 1, ST_W - 2, 1, C("#a8b8c8")); p.rect(x + 19, top - 8, 1, 4, C(K.steelD)); p.rect(x + 19, top + 2, 1, 4, C(K.steelD));
      p.rect(x + 4, top - 9, 12, 6, C("#9ad0f0")); p.rect(x + 4, top - 9, 12, 1, C("#d0f0ff"));
      if (busy) p.light(x + 10, top - 6, C("#8ad0ff"), 0.4 + 0.1 * Math.sin(t * 3));
      return { fx: null, ax: x + 12, ay: top - 12 };
    }
  }
}

// ---------------------------------------------------------------- 마무리

export function finishStation(p: any, kind: FinishKind, x: number, y: number, t: number, busy: boolean, m: MenuDef) {
  counterBase(p, x, y);
  const top = y - 11;
  const bob = busy ? Math.floor(t * 6) % 2 : 0;
  switch (kind) {
    case "plate":
      p.rect(x + 4, top - 1, 7, 1, C(K.white)); p.rect(x + 13, top - 1, 7, 1, C(K.white));
      if (busy) food(p, x + 13, top - 7 + bob, m);
      p.rect(x + 3, top - 3, 1, 2, C(K.steelD));
      break;
    case "box":
      p.rect(x + 3, top - 4, 6, 4, C(K.red)); p.rect(x + 3, top - 4, 6, 1, C("#e86a5a"));
      p.rect(x + 4, top - 6, 6, 2, C("#d8483a")); // 쌓인 상자
      if (busy) food(p, x + 13, top - 6 + bob, m);
      break;
    case "cup":
      for (let i = 0; i < 3; i++) p.rect(x + 3 + i, top - 5 + i, 5, 1, C("#e8e2d6"));
      if (busy) food(p, x + 13, top - 6 + bob, m);
      break;
    case "bowl":
      p.rect(x + 3, top - 3, 7, 3, C(K.white)); p.rect(x + 4, top - 5, 5, 2, C("#e8e2d6"));
      if (busy) food(p, x + 13, top - 6 + bob, m);
      break;
    case "wrap":
      p.rect(x + 3, top - 2, 8, 2, C("#e8d8b0")); p.rect(x + 3, top - 2, 8, 1, C("#f4ead0"));
      if (busy) food(p, x + 13, top - 6 + bob, m);
      break;
  }
}

// ---------------------------------------------------------------- 소품

/** 테이블 (폭 18) */
export function table(p: any, x: number, y: number) {
  p.rect(x, y - 9, 18, 2, C(K.woodL)); p.rect(x, y - 7, 18, 1, C(K.woodD));
  p.rect(x + 8, y - 6, 2, 6, C(K.woodD)); p.rect(x + 5, y - 1, 8, 1, C(K.woodD));
}
export function stool(p: any, x: number, y: number) {
  p.rect(x, y - 5, 6, 1, C(K.red)); p.rect(x + 2, y - 4, 2, 4, C(K.steelD));
}

/** 나무 상자 (10x7) + 감자 */
export function crate(p: any, x: number, y: number, full: number, v: number) {
  p.rect(x, y - 7, 11, 7, C(K.wood)); p.rect(x, y - 7, 11, 1, C(K.woodL)); p.rect(x, y - 4, 11, 1, C(K.woodD)); p.rect(x, y - 1, 11, 1, C(K.woodD));
  p.rect(x, y - 7, 1, 7, C(K.woodD)); p.rect(x + 10, y - 7, 1, 7, C(K.woodD));
  if (full > 0.2) potato(p, x + 1, y - 10, v);
  if (full > 0.5) potato(p, x + 5, y - 10, v + 1);
  if (full > 0.8) potato(p, x + 3, y - 12, v);
}
