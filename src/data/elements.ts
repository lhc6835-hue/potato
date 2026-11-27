// 속성: 무기·샌드백·이펙트 색이 전부 여기서 나온다.
export type Elem = "none" | "fire" | "ice" | "volt" | "poison" | "holy" | "shadow" | "arcane";

export interface ElemDef {
  name: string;
  /** 이펙트 주 램프, 어두움 → 밝음 */
  ramp: string[];
  /** 불똥 색 (머리 → 꼬리) */
  sparks: string[];
  /** UI 강조색 */
  ui: string;
  /** 상태이상 이름 */
  status?: string;
}

export const ELEM: Record<Elem, ElemDef> = {
  none: {
    name: "무속성",
    ramp: ["#1d2a5c", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8d4f0", "#e8f1ff", "#ffffff"],
    sparks: ["#fff3a6", "#ffe26b", "#ff8a2a", "#f2561d"],
    ui: "#d8e4ff",
  },
  fire: {
    name: "화염",
    ramp: ["#4a1118", "#8c1d1c", "#cc3a1a", "#f2701f", "#ffae35", "#ffe27a", "#fff8d6"],
    sparks: ["#fff3a6", "#ffc23d", "#ff8a2a", "#c9281f"],
    ui: "#ff9a3c",
    status: "화상",
  },
  ice: {
    name: "냉기",
    ramp: ["#162c5c", "#1f4f94", "#2f7fcc", "#58b4ec", "#9bdcff", "#d8f4ff", "#ffffff"],
    sparks: ["#ffffff", "#d8f4ff", "#9bdcff", "#58b4ec"],
    ui: "#8fd8ff",
    status: "빙결",
  },
  volt: {
    name: "번개",
    ramp: ["#172a78", "#2550d0", "#3f8cff", "#7cc8ff", "#c8f0ff", "#fff8b0", "#ffffff"],
    sparks: ["#ffffff", "#fff08a", "#7cc8ff", "#3f8cff"],
    ui: "#fff06a",
    status: "감전",
  },
  poison: {
    name: "맹독",
    ramp: ["#173a14", "#265e18", "#3f8a1e", "#6cb82a", "#a8e04a", "#e0ff8a", "#f8ffd8"],
    sparks: ["#e0ff8a", "#a8e04a", "#6cb82a", "#265e18"],
    ui: "#a8e04a",
    status: "중독",
  },
  holy: {
    name: "신성",
    ramp: ["#5a3e10", "#9a6c18", "#d8a428", "#ffd84a", "#fff09a", "#fffbe6", "#ffffff"],
    sparks: ["#ffffff", "#fffbe6", "#ffd84a", "#d8a428"],
    ui: "#ffe27a",
    status: "심판",
  },
  shadow: {
    name: "암흑",
    ramp: ["#0f0a18", "#2c1a4a", "#4a2470", "#7a3aa8", "#b060e0", "#e0a8ff", "#fff0ff"],
    sparks: ["#f0c8ff", "#b060e0", "#7a3aa8", "#2c1a4a"],
    ui: "#c080ff",
    status: "저주",
  },
  arcane: {
    name: "비전",
    ramp: ["#2b1252", "#481c88", "#6b2cc0", "#9a48ec", "#c684ff", "#ecc8ff", "#ffffff"],
    sparks: ["#ffffff", "#ecc8ff", "#c684ff", "#9a48ec"],
    ui: "#d09cff",
  },
};
