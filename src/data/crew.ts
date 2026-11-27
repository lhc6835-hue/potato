// 동료(자동 타격), 시설, 영혼 각인(환생 특성), 업적.
import type { Elem } from "./elements";

export interface CrewDef {
  id: string;
  name: string;
  job: string;
  elem: Elem;
  /** 1레벨 초당 피해 */
  dps: number;
  cost: number;
  req: number;
  /** 공격 간격 (초) */
  every: number;
  kind: "melee" | "ranged" | "magic";
  look: { cloth: string[]; hair: string; skin: string; hat: string; weapon: string };
  desc: string;
}

export const CREW: CrewDef[] = [
  { id: "squire", name: "레오", job: "견습 기사", elem: "none", dps: 1.5, cost: 50, req: 2, every: 1.1, kind: "melee", look: { cloth: ["#1a2440", "#2e4a80", "#4a74b8", "#86aee0"], hair: "#c88a3a", skin: "#f0b88a", hat: "helm", weapon: "sword" }, desc: "기사를 꿈꾸는 소년. 성실함이 무기다." },
  { id: "archer", name: "실바", job: "엘프 궁수", elem: "none", dps: 8, cost: 1200, req: 12, every: 1.4, kind: "ranged", look: { cloth: ["#0e2a14", "#1e4a24", "#3a7a3a", "#6ab060"], hair: "#f0e0a0", skin: "#f4d0b0", hat: "hood", weapon: "bow" }, desc: "백 걸음 밖에서 사과를 맞히는 명사수." },
  { id: "dwarf", name: "브론", job: "드워프 전사", elem: "none", dps: 45, cost: 25000, req: 30, every: 1.6, kind: "melee", look: { cloth: ["#2a1408", "#5a2e12", "#8a4a1e", "#b8743a"], hair: "#d06a2a", skin: "#e8a878", hat: "horns", weapon: "axe" }, desc: "수염을 땋는 데만 한 시간이 걸린다." },
  { id: "mage", name: "루나", job: "화염 술사", elem: "fire", dps: 280, cost: 6e5, req: 55, every: 1.8, kind: "magic", look: { cloth: ["#3a0a14", "#6a1424", "#a8243a", "#e04a5a"], hair: "#ff8a4a", skin: "#f8c8a0", hat: "witch", weapon: "staff" }, desc: "불장난이 취미였던 천재 마법사." },
  { id: "monk", name: "진", job: "수도승", elem: "none", dps: 2000, cost: 1.5e7, req: 85, every: 0.45, kind: "melee", look: { cloth: ["#4a2a06", "#8a5a10", "#d0901a", "#f8c040"], hair: "#2a1a10", skin: "#e8b080", hat: "bald", weapon: "fist" }, desc: "하루에 만 번 주먹을 지른다." },
  { id: "ninja", name: "카게", job: "그림자 닌자", elem: "shadow", dps: 15000, cost: 4e8, req: 120, every: 0.9, kind: "ranged", look: { cloth: ["#0a0a12", "#16162a", "#262640", "#3e3e60"], hair: "#101018", skin: "#e8c0a0", hat: "mask", weapon: "star" }, desc: "아무도 그가 오는 것을 보지 못했다." },
  { id: "paladin", name: "세라", job: "성기사", elem: "holy", dps: 130000, cost: 1.2e10, req: 170, every: 1.5, kind: "melee", look: { cloth: ["#3a3a4a", "#8a8aa0", "#d0d0e0", "#ffffff"], hair: "#ffe08a", skin: "#f8d0b0", hat: "halo", weapon: "hammer" }, desc: "빛의 이름으로 샌드백을 심판한다." },
  { id: "warlock", name: "모르", job: "흑마법사", elem: "shadow", dps: 1.2e6, cost: 4e11, req: 230, every: 2, kind: "magic", look: { cloth: ["#14081e", "#2a1040", "#4a1e6a", "#7a3aa8"], hair: "#c8c8d8", skin: "#c8b0c8", hat: "cowl", weapon: "orb" }, desc: "금지된 마법서를 너무 많이 읽었다." },
];

export interface FacilityDef { id: string; name: string; desc: string; cost: number; grow: number; max: number; per: number; unit: string }
export const FACILITIES: FacilityDef[] = [
  { id: "vault", name: "황금 금고", desc: "골드 획득량", cost: 200, grow: 1.6, max: 200, per: 0.15, unit: "%" },
  { id: "forge", name: "전설의 대장간", desc: "모든 무기 피해", cost: 500, grow: 1.65, max: 200, per: 0.12, unit: "%" },
  { id: "drill", name: "훈련 교관실", desc: "동료 초당 피해", cost: 800, grow: 1.6, max: 200, per: 0.15, unit: "%" },
  { id: "zen", name: "명상의 방", desc: "치명타 확률", cost: 1500, grow: 2.2, max: 25, per: 0.01, unit: "%p" },
  { id: "drum", name: "전투의 북", desc: "치명타 피해", cost: 3000, grow: 1.9, max: 100, per: 0.15, unit: "%" },
  { id: "altar", name: "광폭의 제단", desc: "피버 게이지 충전 · 지속시간", cost: 5000, grow: 2, max: 40, per: 0.08, unit: "%" },
  { id: "storage", name: "보물 창고", desc: "오프라인 보상 시간 +1시간 · 효율", cost: 8000, grow: 2.4, max: 22, per: 1, unit: "시간" },
  { id: "spring", name: "행운의 샘", desc: "황금 샌드백 · 보물 상자 등장률", cost: 20000, grow: 2.3, max: 30, per: 0.05, unit: "%" },
];

export interface TalentDef { id: string; name: string; desc: string; cost: number; grow: number; max: number; per: number }
export const TALENTS: TalentDef[] = [
  { id: "might", name: "영혼의 힘", desc: "모든 피해 +30%", cost: 1, grow: 1.35, max: 100, per: 0.3 },
  { id: "midas", name: "황금 손", desc: "골드 획득 +25%", cost: 1, grow: 1.35, max: 100, per: 0.25 },
  { id: "crew", name: "동료의 맹세", desc: "동료 피해 +40%", cost: 2, grow: 1.35, max: 100, per: 0.4 },
  { id: "phantom", name: "유령 손", desc: "초당 1회 자동 타격 (장착 무기 위력의 50%)", cost: 3, grow: 1.6, max: 10, per: 1 },
  { id: "chrono", name: "시간 왜곡", desc: "보스 제한시간 +3초", cost: 3, grow: 1.7, max: 10, per: 3 },
  { id: "legacy", name: "계승", desc: "환생 후 시작 스테이지 +10", cost: 5, grow: 1.8, max: 20, per: 10 },
  { id: "fury", name: "치명 각성", desc: "치명타 피해 +40%", cost: 2, grow: 1.4, max: 50, per: 0.4 },
  { id: "frenzy", name: "피버 영속", desc: "피버 지속 +2초", cost: 4, grow: 1.7, max: 10, per: 2 },
  { id: "dream", name: "꿈속 수련", desc: "오프라인 효율 +15%", cost: 2, grow: 1.5, max: 20, per: 0.15 },
  { id: "luck", name: "행운의 별", desc: "보석 획득 +20%", cost: 4, grow: 1.6, max: 20, per: 0.2 },
];

export interface AchDef { id: string; name: string; desc: string; stat: string; goal: number; gems: number }
const tiers = (id: string, name: string, stat: string, unit: string, goals: number[], gems: number[]): AchDef[] =>
  goals.map((g, i) => ({ id: `${id}${i}`, name: `${name} ${["I", "II", "III", "IV", "V", "VI", "VII"][i]}`, desc: unit.replace("#", g.toLocaleString("ko-KR")), stat, goal: g, gems: gems[i] }));

export const ACHIEVEMENTS: AchDef[] = [
  ...tiers("hit", "샌드백 두들기기", "hits", "#번 때리기", [100, 1000, 10000, 100000, 1000000], [5, 10, 20, 40, 80]),
  ...tiers("brk", "파괴의 손", "breaks", "샌드백 #개 부수기", [10, 100, 1000, 5000, 20000], [5, 10, 25, 50, 100]),
  ...tiers("stg", "더 깊은 곳으로", "maxStage", "스테이지 # 도달", [25, 50, 100, 200, 300, 400], [5, 10, 20, 40, 60, 100]),
  ...tiers("arm", "무기 수집가", "owned", "무기 #종 보유", [3, 10, 20, 35, 50, 61], [5, 10, 20, 40, 80, 200]),
  ...tiers("crt", "급소 찌르기", "crits", "치명타 #번", [50, 500, 5000, 50000], [5, 10, 25, 50]),
  ...tiers("fev", "광전사", "fevers", "피버 #번 발동", [1, 10, 50, 200], [5, 10, 25, 50]),
  ...tiers("bos", "보스 사냥꾼", "bosses", "보스 #마리 처치", [1, 10, 40, 100], [10, 20, 40, 80]),
  ...tiers("asc", "윤회의 끝", "ascends", "환생 #번", [1, 3, 10, 25], [20, 40, 80, 150]),
  ...tiers("gob", "고블린 사냥", "goblins", "보물 고블린 #마리 잡기", [1, 10, 50], [5, 15, 40]),
  ...tiers("prf", "완벽주의자", "perfects", "퍼펙트 판정 #번", [10, 100, 1000, 10000], [5, 10, 25, 50]),
];
