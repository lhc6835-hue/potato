// 감자 품종 (농장에서 해금). 활성 품종 하나가 전 분점에 적용된다.

import type { Category } from "./menus";

export interface VarietyDef {
  id: string;
  name: string;
  desc: string;
  /** 농장 레벨 요구 */
  farm: number;
  /** 해금 비용 배수 (농장 비용 기준) */
  cost: number;
  bonus: { cats?: Category[]; mult?: number; potatoes?: number; traffic?: number; all?: number };
  colors: [string, string, string];
}

export const VARIETIES: VarietyDef[] = [
  { id: "sumi", name: "수미", desc: "가장 흔한 감자.", farm: 0, cost: 0, bonus: {}, colors: ["#8a6030", "#c8964e", "#ecc98a"] },
  { id: "daejima", name: "대지마", desc: "크다. 감자를 덜 쓴다.", farm: 1, cost: 1, bonus: { potatoes: 0.75 }, colors: ["#7a5428", "#b8884a", "#e0bc84"] },
  { id: "red", name: "홍감자", desc: "껍질이 붉은 감자.", farm: 2, cost: 3, bonus: { cats: ["braised", "salad"], mult: 1.3 }, colors: ["#6e2420", "#b04a3a", "#e8b08a"] },
  { id: "russet", name: "러셋", desc: "튀김에 잘 맞는 감자.", farm: 3, cost: 8, bonus: { cats: ["fried"], mult: 1.3 }, colors: ["#5a3a1e", "#9a6a3a", "#d8b07a"] },
  { id: "gold", name: "골드", desc: "속이 노랗고 부드럽다.", farm: 4, cost: 20, bonus: { cats: ["mashed", "soup"], mult: 1.35 }, colors: ["#9a7020", "#e0b040", "#fff0a0"] },
  { id: "purple", name: "자주감자", desc: "보라색 감자.", farm: 5, cost: 50, bonus: { cats: ["dessert"], mult: 1.4 }, colors: ["#3a1a4a", "#6a3a8a", "#b08ad0"] },
  { id: "fingerling", name: "핑거링", desc: "길쭉한 감자.", farm: 6, cost: 120, bonus: { cats: ["oven", "pan"], mult: 1.35 }, colors: ["#7a5a30", "#c09a5a", "#ead6a0"] },
  { id: "baby", name: "알감자", desc: "작은 감자.", farm: 7, cost: 300, bonus: { cats: ["braised", "basic"], mult: 1.5 }, colors: ["#8a6a3a", "#caa060", "#f0d8a0"] },
  { id: "blue", name: "블루", desc: "파란 감자. 손님이 신기해한다.", farm: 8, cost: 800, bonus: { traffic: 1.15 }, colors: ["#1a2a5a", "#3a5aa0", "#8ab0e8"] },
  { id: "golden", name: "황금감자", desc: "아주 귀한 감자.", farm: 10, cost: 5000, bonus: { all: 1.5 }, colors: ["#a07010", "#f0c030", "#fffbd0"] },
];
export const VARIETY: Record<string, VarietyDef> = Object.fromEntries(VARIETIES.map((v) => [v.id, v]));
