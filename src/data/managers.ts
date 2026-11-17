// 매니저: 이름, 등급, 특성. 후보는 결정적으로 생성된다 (뽑기 확률 없음, 3명 중 고르기).

import type { Category } from "./menus";

export type Rarity = 0 | 1 | 2 | 3;
export const RARITY_NAME = ["일반", "숙련", "장인", "전설"];
export const RARITY_COLOR = ["#b8b0a4", "#7fc0e8", "#e8b84a", "#e87a5a"];

export type SlotKind = "line" | "lift" | "counter" | "porter";

export interface TraitDef {
  id: string;
  name: string;
  desc: string;
  /** 붙을 수 있는 자리 (없으면 어디든) */
  slot?: SlotKind;
  /** 라인 속도 배수 */
  speed?: number;
  /** 특정 카테고리 라인일 때만 speed 적용 */
  cat?: Category;
  /** 판매가 배수 (카운터) */
  price?: number;
  /** 운반량 배수 (덤웨이터) */
  carry?: number;
  /** 카운터 처리량 배수 */
  serve?: number;
  /** 점심/저녁 러시 때만 */
  rush?: number;
  /** 밤에는 */
  night?: number;
  /** 명성 회복 */
  fame?: number;
}

export const TRAITS: TraitDef[] = [
  { id: "steady", name: "성실함", desc: "효율 +10%", speed: 1.1, carry: 1.1, serve: 1.1 },
  { id: "knife", name: "칼질이 빠르다", desc: "주방 속도 +30%", slot: "line", speed: 1.3 },
  { id: "oil", name: "튀김 전문", desc: "튀김 주방 속도 +50%", slot: "line", speed: 1.5, cat: "fried" },
  { id: "masher", name: "으깸 전문", desc: "으깸 주방 속도 +60%", slot: "line", speed: 1.6, cat: "mashed" },
  { id: "soupy", name: "수프 전문", desc: "수프 주방 속도 +60%", slot: "line", speed: 1.6, cat: "soup" },
  { id: "baker", name: "오븐 전문", desc: "오븐 주방 속도 +60%", slot: "line", speed: 1.6, cat: "oven" },
  { id: "pan", name: "부침 전문", desc: "부침 주방 속도 +60%", slot: "line", speed: 1.6, cat: "pan" },
  { id: "sweet", name: "디저트 전문", desc: "디저트 주방 속도 +60%", slot: "line", speed: 1.6, cat: "dessert" },
  { id: "veteran", name: "경력직", desc: "효율 +40%, 판매가 -5%", speed: 1.4, carry: 1.4, serve: 1.4, price: 0.95 },
  { id: "morning", name: "아침형", desc: "러시 때 +50%, 밤에는 -30%", rush: 1.5, night: 0.7 },
  { id: "night", name: "야간형", desc: "밤에 +60%", night: 1.6 },
  { id: "strong", name: "힘이 세다", desc: "운반량 +40% (창고·덤웨이터)", carry: 1.4 },
  { id: "packer", name: "정리를 잘한다", desc: "덤웨이터 운반량 +70%", slot: "lift", carry: 1.7 },
  { id: "runner", name: "계단을 잘 탄다", desc: "창고 운반량 +70%", slot: "porter", carry: 1.7 },
  { id: "kind", name: "친절함", desc: "카운터 처리량 +30%", slot: "counter", serve: 1.3 },
  { id: "salesman", name: "말을 잘한다", desc: "판매가 +12%", slot: "counter", price: 1.12 },
  { id: "polite", name: "예의 바르다", desc: "별점이 빨리 오른다", slot: "counter", fame: 1.6 },
  { id: "fast", name: "손이 빠르다", desc: "효율 +25%", speed: 1.25, carry: 1.25, serve: 1.25 },
  { id: "careful", name: "꼼꼼함", desc: "효율 +15%", speed: 1.15, carry: 1.15, serve: 1.15 },
  { id: "tireless", name: "체력이 좋다", desc: "효율 +35%", speed: 1.35, carry: 1.35, serve: 1.35 },
];
export const TRAIT: Record<string, TraitDef> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

const FAMILY = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "유", "홍"];
const GIVEN = ["감수", "튀김", "알찬", "보슬", "포근", "단단", "말랑", "누리", "한결", "도담", "바삭", "고소", "든든", "슬기", "노릇", "포실", "초롱", "새봄", "우직", "담백",
  "정직", "성실", "무던", "덤덤", "차분", "묵묵", "가람", "다솜", "해솔", "나래"];

export interface ManagerData {
  id: number;
  name: string;
  rarity: Rarity;
  /** 기본 효율 배수 */
  power: number;
  traits: string[];
  /** 외형 시드 (스프라이트 색 조합) */
  look: number;
}

function hash(n: number) {
  let x = (n * 2654435761 + 1013904223) >>> 0;
  x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0; x ^= x >>> 16;
  return x >>> 0;
}

/** 헤드헌팅 후보: seed와 레벨(명성 단계)로 결정. */
export function makeCandidate(seed: number, tier: number): ManagerData {
  const h = hash(seed);
  const roll = (h % 1000) / 1000;
  // tier가 오를수록 좋은 등급 확률 증가
  const t = Math.min(tier, 10);
  const rarity: Rarity = roll < 0.02 + t * 0.012 ? 3 : roll < 0.12 + t * 0.03 ? 2 : roll < 0.4 + t * 0.03 ? 1 : 0;
  const nTraits = rarity >= 2 ? 2 : 1;
  const traits: string[] = [];
  for (let i = 0; traits.length < nTraits && i < 10; i++) {
    const tr = TRAITS[hash(h + i * 31) % TRAITS.length].id;
    if (!traits.includes(tr)) traits.push(tr);
  }
  const name = FAMILY[(h >>> 5) % FAMILY.length] + GIVEN[(h >>> 11) % GIVEN.length];
  const power = [1.5, 2, 3, 5][rarity] * (1 + ((h >>> 20) % 20) / 100);
  return { id: seed, name, rarity, power, traits, look: h };
}

export function traitsOf(m: ManagerData) {
  return m.traits.map((t) => TRAIT[t]).filter(Boolean);
}
